import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";
import { normalizePhone } from "../lib/phone";
import { createLoanWithInstallments } from "../lib/loanCreation";

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

function requireInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new HttpError(400, `שדה לא תקין: ${field}`);
  }
  return n;
}

function optionalInt(value: unknown, field: string): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return requireInt(value, field);
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

/** מוסיפה לכל בקשה דגל אם קיימת בקשה *אחרת* בסטטוס "ממתינה" עם אותו טלפון מנורמל. */
async function withDuplicatePhoneFlag<T extends { id: number; phoneAsEntered: string }>(requests: T[]) {
  const pendingRequests = await prisma.loanRequest.findMany({
    where: { status: "pending" },
    select: { id: true, phoneAsEntered: true },
  });
  const pendingIds = new Set(pendingRequests.map((r) => r.id));
  const countByPhone = new Map<string, number>();
  for (const r of pendingRequests) {
    const key = normalizePhone(r.phoneAsEntered);
    countByPhone.set(key, (countByPhone.get(key) ?? 0) + 1);
  }

  return requests.map((r) => {
    const key = normalizePhone(r.phoneAsEntered);
    const totalPending = countByPhone.get(key) ?? 0;
    const otherPending = totalPending - (pendingIds.has(r.id) ? 1 : 0);
    return { ...r, duplicatePhone: otherPending > 0 };
  });
}

async function findSuggestedBorrower(phoneAsEntered: string) {
  const key = normalizePhone(phoneAsEntered);
  const borrowers = await prisma.borrower.findMany();
  return borrowers.find((b) => normalizePhone(b.phone) === key) ?? null;
}

export async function list(req: Request, res: Response) {
  const { status } = req.query;
  const where = typeof status === "string" && status !== "" ? { status } : {};
  const requests = await prisma.loanRequest.findMany({
    where,
    include: { borrower: true },
    orderBy: { requestDate: "desc" },
  });
  res.json(await withDuplicatePhoneFlag(requests));
}

export async function getById(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const request = await prisma.loanRequest.findUnique({
    where: { id },
    include: { borrower: true, loan: true },
  });
  if (!request) {
    throw new HttpError(404, "בקשת הלוואה לא נמצאה");
  }

  const [withDuplicate] = await withDuplicatePhoneFlag([request]);
  const suggestedBorrower = request.borrowerId ? null : await findSuggestedBorrower(request.phoneAsEntered);
  res.json({ ...withDuplicate, suggestedBorrower });
}

export async function create(req: Request, res: Response) {
  const body = req.body ?? {};

  const nameAsEntered = requireNonEmptyString(body.name, "name");
  const phoneAsEntered = requireNonEmptyString(body.phone, "phone");
  const amount = Number(body.amount);
  if (!(amount > 0)) {
    throw new HttpError(400, "סכום הבקשה חייב להיות גדול מאפס");
  }
  const numInstallments = optionalInt(body.numInstallments, "numInstallments");
  const notes = optionalString(body.notes, "notes");

  const request = await prisma.loanRequest.create({
    data: {
      source: "manual",
      nameAsEntered,
      phoneAsEntered,
      amount,
      numInstallments: numInstallments ?? null,
      notes,
    },
    include: { borrower: true },
  });
  const [withDuplicate] = await withDuplicatePhoneFlag([request]);
  res.status(201).json(withDuplicate);
}

export async function update(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.loanRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת הלוואה לא נמצאה");
  }
  if (existing.status !== "pending") {
    throw new HttpError(409, "ניתן לערוך רק בקשה שעדיין ממתינה");
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.nameAsEntered = requireNonEmptyString(body.name, "name");
  if (body.phone !== undefined) data.phoneAsEntered = requireNonEmptyString(body.phone, "phone");
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0)) {
      throw new HttpError(400, "סכום הבקשה חייב להיות גדול מאפס");
    }
    data.amount = amount;
  }
  if (body.numInstallments !== undefined) data.numInstallments = optionalInt(body.numInstallments, "numInstallments");
  if (body.notes !== undefined) data.notes = optionalString(body.notes, "notes");
  if (body.borrowerId !== undefined) {
    if (body.borrowerId === null) {
      data.borrowerId = null;
    } else {
      const borrowerId = requireInt(body.borrowerId, "borrowerId");
      const borrower = await prisma.borrower.findUnique({ where: { id: borrowerId } });
      if (!borrower) {
        throw new HttpError(400, "לווה לא נמצא");
      }
      data.borrowerId = borrowerId;
    }
  }

  const request = await prisma.loanRequest.update({ where: { id }, data, include: { borrower: true } });
  const [withDuplicate] = await withDuplicatePhoneFlag([request]);
  res.json(withDuplicate);
}

export async function reject(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};
  const note = optionalString(body.note, "note");

  const existing = await prisma.loanRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת הלוואה לא נמצאה");
  }
  if (existing.status !== "pending") {
    throw new HttpError(409, "ניתן לדחות רק בקשה שעדיין ממתינה");
  }

  const request = await prisma.loanRequest.update({
    where: { id },
    data: {
      status: "rejected",
      notes: note ? [existing.notes, note].filter(Boolean).join("\n") : existing.notes,
    },
    include: { borrower: true },
  });
  res.json(request);
}

export async function convertToLoan(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const existing = await prisma.loanRequest.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "בקשת הלוואה לא נמצאה");
  }
  if (existing.status !== "pending") {
    throw new HttpError(409, "ניתן להמיר להלוואה רק בקשה שעדיין ממתינה");
  }
  if (!existing.borrowerId) {
    throw new HttpError(400, "יש לשייך לווה לפני יצירת הלוואה");
  }

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
  const borrowerId = existing.borrowerId;

  const request = await prisma.$transaction(async (tx) => {
    const loan = await createLoanWithInstallments(tx, {
      borrowerId,
      amount,
      numInstallments,
      givenDate,
      installmentDueDates: dueDates,
      notes,
    });
    return tx.loanRequest.update({
      where: { id },
      data: { status: "converted", loanId: loan.id },
      include: { borrower: true, loan: { include: { installments: { orderBy: { number: "asc" } } } } },
    });
  });

  res.json(request);
}
