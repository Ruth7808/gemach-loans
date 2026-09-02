import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export interface CreateLoanParams {
  borrowerId: number;
  amount: number;
  numInstallments: number;
  givenDate: Date;
  installmentDueDates: Date[];
  notes?: string | null;
}

/**
 * יוצר הלוואה + לוח תשלומים בטרנזקציה אחת. נקודה יחידה — משמש גם את יצירת
 * הלוואה הרגילה (POST /loans) וגם את המרת בקשת הלוואה, כדי לא לשכפל לוגיקה.
 */
export async function createLoanWithInstallments(tx: Tx, params: CreateLoanParams) {
  const { borrowerId, amount, numInstallments, givenDate, installmentDueDates, notes } = params;
  const installmentAmount = Math.ceil((amount / numInstallments) * 100) / 100;

  const created = await tx.loan.create({
    data: { borrowerId, amount, givenDate, numInstallments, notes },
  });
  await tx.installment.createMany({
    data: installmentDueDates.map((dueDate, i) => ({
      loanId: created.id,
      number: i + 1,
      dueDate,
      amount: installmentAmount,
    })),
  });
  return tx.loan.findUniqueOrThrow({
    where: { id: created.id },
    include: { installments: { orderBy: { number: "asc" } } },
  });
}
