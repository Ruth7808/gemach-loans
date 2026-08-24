import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";

type Tx = Prisma.TransactionClient;

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

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

/** מקצה תשלום ל-installments של הלוואה לפי FIFO (הישן ביותר קודם), ומעדכן סטטוס הלוואה בסיום. */
async function allocateFifo(tx: Tx, paymentId: number, loanId: number, amount: number) {
  let remaining = roundCents(amount);
  const installments = await tx.installment.findMany({
    where: { loanId },
    orderBy: { number: "asc" },
  });

  for (const installment of installments) {
    if (remaining <= EPSILON) break;
    const owed = roundCents(installment.amount - installment.paid);
    if (owed <= EPSILON) continue;

    const alloc = roundCents(Math.min(remaining, owed));
    await tx.allocation.create({
      data: { paymentId, installmentId: installment.id, allocatedAmount: alloc },
    });

    const newPaid = roundCents(installment.paid + alloc);
    await tx.installment.update({
      where: { id: installment.id },
      data: {
        paid: newPaid,
        status: newPaid >= installment.amount - EPSILON ? "paid" : "pending",
      },
    });

    remaining = roundCents(remaining - alloc);
  }

  await refreshLoanStatus(tx, loanId);
}

/** מבטל את כל ה-allocations של תשלום נתון, מחזיר את ה-installments למצב שלפני ההקצאה. */
async function cancelAllocations(tx: Tx, paymentId: number) {
  const allocations = await tx.allocation.findMany({ where: { paymentId } });

  for (const allocation of allocations) {
    const installment = await tx.installment.findUnique({ where: { id: allocation.installmentId } });
    if (!installment) continue;

    const newPaid = roundCents(installment.paid - allocation.allocatedAmount);
    await tx.installment.update({
      where: { id: installment.id },
      data: {
        paid: newPaid,
        status: newPaid >= installment.amount - EPSILON ? "paid" : "pending",
      },
    });
  }

  await tx.allocation.deleteMany({ where: { paymentId } });
}

/** קובע מחדש את סטטוס ההלוואה לפי מצב ה-installments שלה כרגע (closed אם כולן paid, אחרת active). */
async function refreshLoanStatus(tx: Tx, loanId: number) {
  const installments = await tx.installment.findMany({ where: { loanId } });
  const allPaid = installments.every((i) => i.status === "paid");
  await tx.loan.update({ where: { id: loanId }, data: { status: allPaid ? "closed" : "active" } });
}

export async function list(req: Request, res: Response) {
  const { loanId } = req.query;
  const where = loanId !== undefined ? { loanId: parseId(String(loanId)) } : {};
  const payments = await prisma.payment.findMany({ where, orderBy: { paymentDate: "desc" } });
  res.json(payments);
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { allocations: true },
  });
  if (!payment) {
    throw new HttpError(404, "תשלום לא נמצא");
  }
  res.json(payment);
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};

  const loanId = requireInt(body.loanId, "loanId");
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום התשלום חייב להיות גדול מאפס");
  }
  const paymentDate = parseDate(body.paymentDate, "paymentDate");
  const notes = optionalString(body.notes, "notes");

  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) {
    throw new HttpError(404, "הלוואה לא נמצאה");
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: { loanId, borrowerId: loan.borrowerId, paymentDate, amount: roundCents(amount), notes },
    });
    await allocateFifo(tx, created.id, loanId, amount);
    return tx.payment.findUniqueOrThrow({
      where: { id: created.id },
      include: { allocations: true },
    });
  });

  res.status(201).json(payment);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "תשלום לא נמצא");
  }

  const amount = body.amount !== undefined ? Number(body.amount) : existing.amount;
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום התשלום חייב להיות גדול מאפס");
  }
  const paymentDate = body.paymentDate !== undefined ? parseDate(body.paymentDate, "paymentDate") : existing.paymentDate;
  const notes = body.notes !== undefined ? optionalString(body.notes, "notes") : existing.notes;

  const payment = await prisma.$transaction(async (tx) => {
    await cancelAllocations(tx, id);
    await tx.payment.update({
      where: { id },
      data: { amount: roundCents(amount), paymentDate, notes },
    });
    await allocateFifo(tx, id, existing.loanId, amount);
    return tx.payment.findUniqueOrThrow({
      where: { id },
      include: { allocations: true },
    });
  });

  res.json(payment);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "תשלום לא נמצא");
  }

  await prisma.$transaction(async (tx) => {
    await cancelAllocations(tx, id);
    await tx.payment.delete({ where: { id } });
    await refreshLoanStatus(tx, existing.loanId);
  });

  res.json({ success: true });
}
