import { prisma } from "./prismaClient";
import { roundCents } from "./loanMath";

const OPENING_BALANCE_KEY = "openingBalance";
const EPSILON = 1e-6;

export function todayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** כסף פנוי נוכחי — יתרת פתיחה + Σתשלומים + Σהפקדות − Σקרן שהולוותה − Σמשיכות ששולמו בפועל. */
export async function getAvailableFunds(): Promise<number> {
  const [openingBalanceSetting, paymentsTotal, depositsTotal, loansTotal, withdrawalsTotal] = await Promise.all([
    prisma.setting.findUnique({ where: { key: OPENING_BALANCE_KEY } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.deposit.aggregate({ _sum: { amount: true } }),
    prisma.loan.aggregate({ _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ _sum: { amount: true } }),
  ]);

  const openingBalance = openingBalanceSetting ? Number(openingBalanceSetting.value) : 0;
  return roundCents(
    openingBalance +
      (paymentsTotal._sum.amount ?? 0) +
      (depositsTotal._sum.amount ?? 0) -
      (loansTotal._sum.amount ?? 0) -
      (withdrawalsTotal._sum.amount ?? 0),
  );
}

export interface WithdrawalRiskResult {
  requestId: number;
  isAtRisk: boolean;
  shortfall: number;
}

/**
 * מדמה תזרים מזומנים כרונולוגי: לכל בקשת משיכה פתוחה, לפי סדר תאריך יעד, מוסיפה ליתרת הריצה
 * רק installments חדשים (לא ששולמו במלואם, לא כאלה שכבר באיחור) שתאריך הפירעון שלהם הגיע עד
 * תאריך היעד של הבקשה, ואז מפחיתה את מה שנותר לשלם על הבקשה. ברגע שהיתרה יורדת מתחת לאפס,
 * הבקשה ("בסיכון") וכל הבקשות אחריה בתור מסומנות בסיכון גם הן — גם אם היתרה מתאוששת בהמשך.
 */
export async function calculateWithdrawalRisk(hypotheticalAvailableMoney?: number): Promise<WithdrawalRiskResult[]> {
  const [openRequests, upcomingInstallments] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["open", "partially_paid"] } },
      orderBy: [{ targetDate: "asc" }, { id: "asc" }],
    }),
    prisma.installment.findMany({
      where: { status: "pending", dueDate: { gte: todayStart() } },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  let runningBalance = hypotheticalAvailableMoney ?? (await getAvailableFunds());
  let installmentIndex = 0;
  let alreadyAtRisk = false;
  const results: WithdrawalRiskResult[] = [];

  for (const request of openRequests) {
    while (
      installmentIndex < upcomingInstallments.length &&
      upcomingInstallments[installmentIndex].dueDate <= request.targetDate
    ) {
      const installment = upcomingInstallments[installmentIndex];
      runningBalance = roundCents(runningBalance + (installment.amount - installment.paid));
      installmentIndex++;
    }

    const owed = roundCents(request.amount - request.paidSoFar);
    runningBalance = roundCents(runningBalance - owed);

    if (runningBalance < -EPSILON) {
      alreadyAtRisk = true;
    }

    results.push({
      requestId: request.id,
      isAtRisk: alreadyAtRisk,
      shortfall: alreadyAtRisk ? roundCents(Math.max(0, -runningBalance)) : 0,
    });
  }

  return results;
}

interface WithdrawalRequestLike {
  id: number;
  targetDate: Date;
  amount: number;
  paidSoFar: number;
}

/** מוסיפה לכל בקשת משיכה את השדות המחושבים (נותר, מוכנה לתשלום, בסיכון, חוסר) — נקודה יחידה לחישוב הזה. */
export async function withWithdrawalRiskFields<T extends WithdrawalRequestLike>(requests: T[]) {
  const risk = await calculateWithdrawalRisk();
  const riskByRequestId = new Map(risk.map((r) => [r.requestId, r]));
  const now = todayStart();

  return requests.map((r) => {
    const riskResult = riskByRequestId.get(r.id);
    return {
      ...r,
      remaining: roundCents(r.amount - r.paidSoFar),
      isReady: r.targetDate <= now,
      isAtRisk: riskResult?.isAtRisk ?? false,
      shortfall: riskResult?.shortfall ?? 0,
    };
  });
}
