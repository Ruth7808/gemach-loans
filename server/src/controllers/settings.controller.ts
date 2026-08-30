import { Request, Response } from "express";
import { prisma } from "../lib/prismaClient";
import { HttpError } from "../middleware/errorHandler";

const OPENING_BALANCE_KEY = "openingBalance";

export async function getOpeningBalance(_req: Request, res: Response) {
  const setting = await prisma.setting.findUnique({ where: { key: OPENING_BALANCE_KEY } });
  res.json({ value: setting ? Number(setting.value) : 0 });
}

export async function updateOpeningBalance(req: Request, res: Response) {
  const body = req.body ?? {};
  const value = Number(body.value);
  if (!Number.isFinite(value)) {
    throw new HttpError(400, "ערך לא תקין");
  }

  await prisma.setting.upsert({
    where: { key: OPENING_BALANCE_KEY },
    create: { key: OPENING_BALANCE_KEY, value: String(value) },
    update: { value: String(value) },
  });

  res.json({ value });
}
