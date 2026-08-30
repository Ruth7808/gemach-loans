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

// TODO: משיכה חריגה בלי בקשת משיכה מוקדמת (withdrawalRequestId null) — לא ממומש בכוונה.
// כרגע כל Withdrawal נוצר רק דרך POST /api/withdrawal-requests/:id/pay, כדי לשמור על
// התהליך התקין (בקשה → תקופת התראה → תשלום). לצפייה בלבד כאן.
export async function list(req: Request, res: Response) {
  const { depositorId, withdrawalRequestId } = req.query;
  const where: Record<string, number> = {};
  if (depositorId !== undefined) where.depositorId = parseId(String(depositorId));
  if (withdrawalRequestId !== undefined) where.withdrawalRequestId = parseId(String(withdrawalRequestId));

  const withdrawals = await prisma.withdrawal.findMany({ where, orderBy: { date: "desc" } });
  res.json(withdrawals);
}
