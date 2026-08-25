import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";

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

const EPSILON = 1e-6;

export async function list(_req: Request, res: Response) {
  const borrowers = await prisma.borrower.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { loans: { include: { installments: true } } },
  });

  const now = new Date();
  const result = borrowers.map(({ loans, ...borrower }) => {
    const installments = loans.flatMap((loan) => loan.installments);
    const totalOwed = installments.reduce((sum, i) => sum + (i.amount - i.paid), 0);
    const isLate = installments.some((i) => i.dueDate < now && i.paid < i.amount - EPSILON);
    return { ...borrower, totalOwed: Math.round(totalOwed * 100) / 100, isLate };
  });

  res.json(result);
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const borrower = await prisma.borrower.findUnique({ where: { id } });
  if (!borrower) {
    throw new HttpError(404, "הלווה לא נמצא");
  }
  res.json(borrower);
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};
  const firstName = requireNonEmptyString(body.firstName, "firstName");
  const lastName = requireNonEmptyString(body.lastName, "lastName");
  const phone = requireNonEmptyString(body.phone, "phone");
  const email = optionalString(body.email, "email");
  const address = optionalString(body.address, "address");
  const notes = optionalString(body.notes, "notes");

  const borrower = await prisma.borrower.create({
    data: { firstName, lastName, phone, email, address, notes },
  });
  res.status(201).json(borrower);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.borrower.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הלווה לא נמצא");
  }

  const data: Record<string, unknown> = {};
  if (body.firstName !== undefined) data.firstName = requireNonEmptyString(body.firstName, "firstName");
  if (body.lastName !== undefined) data.lastName = requireNonEmptyString(body.lastName, "lastName");
  if (body.phone !== undefined) data.phone = requireNonEmptyString(body.phone, "phone");
  if (body.email !== undefined) data.email = optionalString(body.email, "email");
  if (body.address !== undefined) data.address = optionalString(body.address, "address");
  if (body.notes !== undefined) data.notes = optionalString(body.notes, "notes");

  const borrower = await prisma.borrower.update({ where: { id }, data });
  res.json(borrower);
}

export async function remove(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const existing = await prisma.borrower.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "הלווה לא נמצא");
  }

  const loanCount = await prisma.loan.count({ where: { borrowerId: id } });
  if (loanCount > 0) {
    throw new HttpError(409, "לא ניתן למחוק לווה שיש לו הלוואות משויכות");
  }

  await prisma.borrower.delete({ where: { id } });
  res.json({ success: true });
}
