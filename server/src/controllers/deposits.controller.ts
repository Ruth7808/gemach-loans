import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";
import { roundCents } from "../lib/loanMath";

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

export async function list(req: Request, res: Response) {
  const { depositorId } = req.query;
  const where = depositorId !== undefined ? { depositorId: parseId(String(depositorId)) } : {};
  const deposits = await prisma.deposit.findMany({ where, orderBy: { date: "desc" } });
  res.json(deposits);
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};

  const depositorId = requireInt(body.depositorId, "depositorId");
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום ההפקדה חייב להיות גדול מאפס");
  }
  const date = parseDate(body.date, "date");
  const notes = optionalString(body.notes, "notes");

  const depositor = await prisma.depositor.findUnique({ where: { id: depositorId } });
  if (!depositor) {
    throw new HttpError(400, "מפקיד לא נמצא");
  }

  const deposit = await prisma.deposit.create({
    data: { depositorId, amount: roundCents(amount), date, notes },
  });
  res.status(201).json(deposit);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.deposit.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הפקדה לא נמצאה");
  }

  const data: Record<string, unknown> = {};
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) {
      throw new HttpError(400, "סכום ההפקדה חייב להיות גדול מאפס");
    }
    data.amount = roundCents(amount);
  }
  if (body.date !== undefined) data.date = parseDate(body.date, "date");
  if (body.notes !== undefined) data.notes = optionalString(body.notes, "notes");

  const deposit = await prisma.deposit.update({ where: { id }, data });
  res.json(deposit);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.deposit.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הפקדה לא נמצאה");
  }

  await prisma.deposit.delete({ where: { id } });
  res.json({ success: true });
}
