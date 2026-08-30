import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";
import { roundCents } from "../lib/loanMath";
import { withWithdrawalRiskFields } from "../lib/withdrawalRisk";

function parseId(raw: string | string[]): number {
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isInteger(id)) {
    throw new HttpError(400, "מזהה לא תקין");
  }
  return id;
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new HttpError(400, `שדה חובה חסר: ${field}`);
  }
  return value;
}

function optionalString(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, `שדה לא תקין: ${field}`);
  }
  return value;
}

export async function list(_req: Request, res: Response) {
  const depositors = await prisma.depositor.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { deposits: true },
  });

  const result = depositors.map(({ deposits, ...depositor }) => ({
    ...depositor,
    totalDeposits: roundCents(deposits.reduce((sum, d) => sum + d.amount, 0)),
  }));

  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const depositor = await prisma.depositor.findUnique({
    where: { id },
    include: {
      deposits: { orderBy: { date: "desc" } },
      withdrawalRequests: { orderBy: { targetDate: "asc" } },
    },
  });
  if (!depositor) {
    throw new HttpError(404, "מפקיד לא נמצא");
  }

  const { deposits, withdrawalRequests, ...rest } = depositor;
  const totalDeposits = roundCents(deposits.reduce((sum, d) => sum + d.amount, 0));
  res.json({
    ...rest,
    deposits,
    totalDeposits,
    withdrawalRequests: await withWithdrawalRiskFields(withdrawalRequests),
  });
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};
  const firstName = requireNonEmptyString(body.firstName, "firstName");
  const lastName = requireNonEmptyString(body.lastName, "lastName");
  const phone = requireNonEmptyString(body.phone, "phone");
  const email = optionalString(body.email, "email");
  const address = optionalString(body.address, "address");
  const notes = optionalString(body.notes, "notes");

  const depositor = await prisma.depositor.create({
    data: { firstName, lastName, phone, email, address, notes },
  });
  res.status(201).json(depositor);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.depositor.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "מפקיד לא נמצא");
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = requireNonEmptyString(body.firstName, "firstName");
  if (body.lastName !== undefined) data.lastName = requireNonEmptyString(body.lastName, "lastName");
  if (body.phone !== undefined) data.phone = requireNonEmptyString(body.phone, "phone");
  if (body.email !== undefined) data.email = optionalString(body.email, "email");
  if (body.address !== undefined) data.address = optionalString(body.address, "address");
  if (body.notes !== undefined) data.notes = optionalString(body.notes, "notes");

  const depositor = await prisma.depositor.update({ where: { id }, data });
  res.json(depositor);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.depositor.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "מפקיד לא נמצא");
  }

  const [depositCount, withdrawalRequestCount] = await Promise.all([
    prisma.deposit.count({ where: { depositorId: id } }),
    prisma.withdrawalRequest.count({ where: { depositorId: id } }),
  ]);
  if (depositCount > 0) {
    throw new HttpError(409, "לא ניתן למחוק מפקיד שיש לו הפקדות משויכות");
  }
  if (withdrawalRequestCount > 0) {
    throw new HttpError(409, "לא ניתן למחוק מפקיד שיש לו בקשות משיכה משויכות");
  }

  await prisma.depositor.delete({ where: { id } });
  res.json({ success: true });
}
