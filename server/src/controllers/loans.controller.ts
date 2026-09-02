import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";
import { summarizeInstallments, roundCents } from "../lib/loanMath";
import { getAvailableFunds, calculateWithdrawalRisk } from "../lib/withdrawalRisk";
import { createLoanWithInstallments } from "../lib/loanCreation";

const EPSILON = 1e-6;

function parseId(raw: string | string[]): number {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id)) {
    throw new HttpError(400, "מזהה לא תקין");
  }
  return id;
}

function requireInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new HttpError(400, `שדה לא תקין: ${field}`);
  }
  return n;
}

function optionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, `שדה לא תקין: ${field}`);
  }
  return value;
}

function parseDate(value: unknown, field: string): Date {
  if (typeof value !== "string") {
    throw new HttpError(400, `שדה חובה חסר: ${field}`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `תאריך לא תקין: ${field}`);
  }
  return date;
}

export async function list(_req: Request, res: Response) {
  const loans = await prisma.loan.findMany({
    include: { borrower: true, installments: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const result = loans.map(({ installments, ...loan }) => ({
    ...loan,
    ...summarizeInstallments(installments, now),
  }));

  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      borrower: true,
      installments: { orderBy: { number: "asc" } },
      payments: { orderBy: { paymentDate: "asc" }, include: { allocations: true } },
    },
  });
  if (!loan) {
    throw new HttpError(404, "הלוואה לא נמצאה");
  }

  const { installments, ...rest } = loan;
  res.json({ ...rest, installments, ...summarizeInstallments(installments, new Date()) });
}

/** בדיקת סיכון לפני יצירת הלוואה חדשה — אזהרה בלבד, לא חוסמת. */
export async function checkRisk(req: Request, res: Response) {
  const body = req.body ?? {};
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום ההלוואה חייב להיות גדול מאפס");
  }

  const currentAvailableFunds = await getAvailableFunds();
  const hypotheticalAvailableFunds = roundCents(currentAvailableFunds - amount);

  const insufficientFunds = hypotheticalAvailableFunds < -EPSILON;
  const shortfallAmount = insufficientFunds ? roundCents(Math.max(0, -hypotheticalAvailableFunds)) : 0;

  const [riskBefore, riskAfter] = await Promise.all([
    calculateWithdrawalRisk(currentAvailableFunds),
    calculateWithdrawalRisk(hypotheticalAvailableFunds),
  ]);

  const wasAtRisk = new Set(riskBefore.filter((r) => r.isAtRisk).map((r) => r.requestId));
  const newlyAtRiskIds = riskAfter.filter((r) => r.isAtRisk && !wasAtRisk.has(r.requestId)).map((r) => r.requestId);

  const newlyAtRiskRequests =
    newlyAtRiskIds.length === 0
      ? []
      : await prisma.withdrawalRequest.findMany({
          where: { id: { in: newlyAtRiskIds } },
          include: { depositor: true },
        });

  const riskAfterByRequestId = new Map(riskAfter.map((r) => [r.requestId, r]));
  const newlyAtRisk = newlyAtRiskRequests.map((r) => ({
    requestId: r.id,
    depositorName: `${r.depositor.firstName} ${r.depositor.lastName}`,
    targetDate: r.targetDate,
    shortfall: riskAfterByRequestId.get(r.id)?.shortfall ?? 0,
  }));

  res.json({
    hypotheticalAvailableFunds,
    insufficientFunds,
    shortfallAmount,
    newlyAtRisk,
  });
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};

  const borrowerId = requireInt(body.borrowerId, "borrowerId");
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום ההלוואה חייב להיות גדול מאפס");
  }
  const numInstallments = requireInt(body.numInstallments, "numInstallments");
  if (numInstallments < 1) {
    throw new HttpError(400, "מספר התשלומים חייב להיות גדול או שווה ל-1");
  }
  const givenDate = parseDate(body.givenDate, "givenDate");

  const installmentDueDates = body.installmentDueDates;
  if (!Array.isArray(installmentDueDates) || installmentDueDates.length !== numInstallments) {
    throw new HttpError(400, "installmentDueDates חייב להכיל בדיוק numInstallments תאריכים");
  }
  const dueDates = installmentDueDates.map((d, i) => parseDate(d, `installmentDueDates[${i}]`));

  const notes = optionalString(body.notes, "notes");

  const borrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
  if (!borrower) {
    throw new HttpError(400, "לווה לא נמצא");
  }

  const loan = await prisma.$transaction((tx) =>
    createLoanWithInstallments(tx, { borrowerId, amount, numInstallments, givenDate, installmentDueDates: dueDates, notes }),
  );

  res.status(201).json(loan);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.loan.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הלוואה לא נמצאה");
  }

  const notes = optionalString(body.notes, "notes");
  const data: Record<string, unknown> = {};
  if (notes !== undefined) data.notes = notes;

  const loan = await prisma.loan.update({ where: { id }, data });
  res.json(loan);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.loan.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הלוואה לא נמצאה");
  }

  const paymentCount = await prisma.payment.count({ where: { loanId: id } });
  if (paymentCount > 0) {
    throw new HttpError(409, "לא ניתן למחוק הלוואה שיש לה תשלומים משויכים");
  }

  await prisma.$transaction([
    prisma.installment.deleteMany({ where: { loanId: id } }),
    prisma.loan.delete({ where: { id } }),
  ]);
  res.json({ success: true });
}
