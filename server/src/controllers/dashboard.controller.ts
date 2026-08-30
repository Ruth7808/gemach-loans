import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { roundCents } from "../lib/loanMath";
import { getAvailableFunds, calculateWithdrawalRisk } from "../lib/withdrawalRisk";

const EPSILON = 1e-6;

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(base: Date, offset: number): Date {
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + offset, 1));
}

function monthKeys(base: Date, offsets: number[]): string[] {
  return offsets.map((offset) => monthKey(monthStart(base, offset)));
}

const OPENING_BALANCE_KEY = "openingBalance";

export async function getDashboard(_req: Request, res: Response) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  const [
    openingBalanceSetting,
    availableFunds,
    depositsTotal,
    withdrawalsPaidTotal,
    dueTodayInstallments,
    recentPayments,
    upcomingInstallments,
    openWithdrawalRequests,
    riskResults,
  ] = await Promise.all([
    prisma.setting.findUnique({ where: { key: OPENING_BALANCE_KEY } }),
    getAvailableFunds(),
    prisma.deposit.aggregate({ _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ _sum: { amount: true } }),
    prisma.installment.findMany({
      where: { dueDate: { gte: todayStart, lt: tomorrowStart } },
      include: { loan: { include: { borrower: true } } },
    }),
    prisma.payment.findMany({
      where: { paymentDate: { gte: monthStart(now, -5) } },
    }),
    prisma.installment.findMany({
      where: { dueDate: { gte: monthStart(now, 0), lt: monthStart(now, 6) } },
    }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ["open", "partially_paid"] } },
      include: { depositor: true },
    }),
    calculateWithdrawalRisk(),
  ]);

  const openingBalance = openingBalanceSetting ? Number(openingBalanceSetting.value) : 0;
  const depositorsBalance = roundCents(
    (depositsTotal._sum.amount ?? 0) - (withdrawalsPaidTotal._sum.amount ?? 0),
  );

  const openWithdrawalTotal = roundCents(
    openWithdrawalRequests.reduce((sum, r) => sum + (r.amount - r.paidSoFar), 0),
  );

  const riskByRequestId = new Map(riskResults.map((r) => [r.requestId, r]));
  const atRiskWithdrawals = openWithdrawalRequests
    .map((r) => ({ request: r, risk: riskByRequestId.get(r.id) }))
    .filter((x) => x.risk?.isAtRisk)
    .map((x) => ({
      requestId: x.request.id,
      depositorId: x.request.depositorId,
      depositorName: `${x.request.depositor.firstName} ${x.request.depositor.lastName}`,
      targetDate: x.request.targetDate,
      shortfall: x.risk!.shortfall,
    }));

  const dueToday = dueTodayInstallments
    .filter((i) => i.paid < i.amount - EPSILON)
    .map((i) => ({
      installmentId: i.id,
      loanId: i.loanId,
      borrowerId: i.loan.borrowerId,
      borrowerName: `${i.loan.borrower.firstName} ${i.loan.borrower.lastName}`,
      amount: roundCents(i.amount - i.paid),
    }));

  const currentMonthKey = monthKey(now);

  const collectedByMonth = new Map<string, number>();
  for (const payment of recentPayments) {
    const key = monthKey(payment.paymentDate);
    collectedByMonth.set(key, (collectedByMonth.get(key) ?? 0) + payment.amount);
  }
  const monthlyCollected = monthKeys(now, [-5, -4, -3, -2, -1, 0]).map((key) => ({
    month: key,
    amount: roundCents(collectedByMonth.get(key) ?? 0),
    isCurrent: key === currentMonthKey,
  }));

  const forecastByMonth = new Map<string, number>();
  for (const installment of upcomingInstallments) {
    if (installment.paid >= installment.amount - EPSILON) continue;
    const key = monthKey(installment.dueDate);
    forecastByMonth.set(key, (forecastByMonth.get(key) ?? 0) + (installment.amount - installment.paid));
  }
  const monthlyForecast = monthKeys(now, [0, 1, 2, 3, 4, 5]).map((key) => ({
    month: key,
    amount: roundCents(forecastByMonth.get(key) ?? 0),
    isCurrent: key === currentMonthKey,
  }));

  res.json({
    openingBalance,
    availableFunds,
    expectedThisMonth: monthlyForecast[0]?.amount ?? 0,
    dueToday,
    monthlyCollected,
    monthlyForecast,
    depositorsBalance,
    openWithdrawalRequestsCount: openWithdrawalRequests.length,
    openWithdrawalRequestsTotal: openWithdrawalTotal,
    atRiskWithdrawals,
  });
}
