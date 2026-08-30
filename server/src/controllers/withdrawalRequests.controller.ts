import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";
import { roundCents } from "../lib/loanMath";
import { withWithdrawalRiskFields } from "../lib/withdrawalRisk";

type Tx = Prisma.TransactionClient;

const EPSILON = 1e-6;
const NOTICE_DAYS_KEY = "withdrawal_notice_days";
const DEFAULT_NOTICE_DAYS = 30;
const OPEN_STATUSES = ["open", "partially_paid"];

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

function todayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

async function getNoticeDays(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: NOTICE_DAYS_KEY } });
  return setting ? Number(setting.value) : DEFAULT_NOTICE_DAYS;
}

/** יתרה פנויה של מפקיד ספציפי לבקשת משיכה חדשה: Σהפקדות − Σמשיכות ששולמו − Σסכומי בקשות פתוחות אחרות (לא כולל excludeRequestId). */
async function getDepositorAvailableForWithdrawal(depositorId: number, excludeRequestId?: number): Promise<number> {
  const [depositsTotal, withdrawalsTotal, otherOpenRequests] = await Promise.all([
    prisma.deposit.aggregate({ where: { depositorId }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { depositorId }, _sum: { amount: true } }),
    prisma.withdrawalRequest.findMany({
      where: {
        depositorId,
        status: { in: OPEN_STATUSES },
        ...(excludeRequestId !== undefined ? { id: { not: excludeRequestId } } : {}),
      },
    }),
  ]);

  const otherOpenTotal = otherOpenRequests.reduce((sum, r) => sum + (r.amount - r.paidSoFar), 0);

  return roundCents(
    (depositsTotal._sum.amount ?? 0) - (withdrawalsTotal._sum.amount ?? 0) - otherOpenTotal,
  );
}

export async function list(req: Request, res: Response) {
  const { depositorId } = req.query;
  const where = depositorId !== undefined ? { depositorId: parseId(String(depositorId)) } : {};
  const requests = await prisma.withdrawalRequest.findMany({
    where,
    include: { depositor: true },
    orderBy: { targetDate: "asc" },
  });
  res.json(await withWithdrawalRiskFields(requests));
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const request = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: { depositor: true, withdrawals: { orderBy: { date: "desc" } } },
  });
  if (!request) {
    throw new HttpError(404, "בקשת משיכה לא נמצאה");
  }
  const [withComputed] = await withWithdrawalRiskFields([request]);
  res.json(withComputed);
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};

  const depositorId = requireInt(body.depositorId, "depositorId");
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום הבקשה חייב להיות גדול מאפס");
  }
  const notes = optionalString(body.notes, "notes");

  const depositor = await prisma.depositor.findUnique({ where: { id: depositorId } });
  if (!depositor) {
    throw new HttpError(400, "מפקיד לא נמצא");
  }

  const available = await getDepositorAvailableForWithdrawal(depositorId);
  if (amount > available + EPSILON) {
    throw new HttpError(400, `הסכום המבוקש גבוה מהיתרה הפנויה של המפקיד (${available.toFixed(2)} ₪)`);
  }

  const noticeDays = await getNoticeDays();
  const requestDate = todayStart();
  const targetDate = addDays(requestDate, noticeDays);

  const request = await prisma.withdrawalRequest.create({
    data: { depositorId, amount: roundCents(amount), requestDate, targetDate, notes },
    include: { depositor: true },
  });
  const [withComputed] = await withWithdrawalRiskFields([request]);
  res.status(201).json(withComputed);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת משיכה לא נמצאה");
  }
  if (existing.status !== "open") {
    throw new HttpError(409, "ניתן לערוך רק בקשת משיכה שעדיין בסטטוס פתוחה");
  }

  const data: Record<string, unknown> = {};
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) {
      throw new HttpError(400, "סכום הבקשה חייב להיות גדול מאפס");
    }
    const available = await getDepositorAvailableForWithdrawal(existing.depositorId, id);
    if (amount > available + EPSILON) {
      throw new HttpError(400, `הסכום המבוקש גבוה מהיתרה הפנויה של המפקיד (${available.toFixed(2)} ₪)`);
    }
    data.amount = roundCents(amount);
  }
  if (body.notes !== undefined) data.notes = optionalString(body.notes, "notes");

  const request = await prisma.withdrawalRequest.update({
    where: { id },
    data,
    include: { depositor: true },
  });
  const [withComputed] = await withWithdrawalRiskFields([request]);
  res.json(withComputed);
}

export async function cancel(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת משיכה לא נמצאה");
  }
  if (!OPEN_STATUSES.includes(existing.status)) {
    throw new HttpError(409, "לא ניתן לבטל בקשת משיכה שכבר שולמה או בוטלה");
  }

  const request = await prisma.withdrawalRequest.update({
    where: { id },
    data: { status: "cancelled" },
    include: { depositor: true },
  });
  const [withComputed] = await withWithdrawalRiskFields([request]);
  res.json(withComputed);
}

export async function pay(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום התשלום חייב להיות גדול מאפס");
  }
  const date = parseDate(body.date, "date");
  const notes = optionalString(body.notes, "notes");

  const existing = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת משיכה לא נמצאה");
  }
  if (!OPEN_STATUSES.includes(existing.status)) {
    throw new HttpError(409, "לא ניתן לשלם על בקשת משיכה שכבר שולמה או בוטלה");
  }

  const remaining = roundCents(existing.amount - existing.paidSoFar);
  if (amount > remaining + EPSILON) {
    throw new HttpError(400, `הסכום גבוה מהיתרה שנותרה לבקשה זו (${remaining.toFixed(2)} ₪)`);
  }

  const request = await prisma.$transaction(async (tx: Tx) => {
    await tx.withdrawal.create({
      data: { withdrawalRequestId: id, depositorId: existing.depositorId, amount: roundCents(amount), date, notes },
    });

    const newPaidSoFar = roundCents(existing.paidSoFar + amount);
    return tx.withdrawalRequest.update({
      where: { id },
      data: {
        paidSoFar: newPaidSoFar,
        status: newPaidSoFar >= existing.amount - EPSILON ? "paid" : "partially_paid",
      },
      include: { depositor: true, withdrawals: { orderBy: { date: "desc" } } },
    });
  });

  const [withComputed] = await withWithdrawalRiskFields([request]);
  res.json(withComputed);
}
