const EPSILON = 1e-6;

export function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface InstallmentLike {
  amount: number;
  paid: number;
  dueDate: Date;
}

/** יתרה, איחור, ותאריך התשלום הבא שעוד לא שולם — נקודה יחידה לחישוב הזה, לפי installments של הלוואה בודדת. */
export function summarizeInstallments(installments: InstallmentLike[], now: Date) {
  const remaining = roundCents(installments.reduce((sum, i) => sum + (i.amount - i.paid), 0));
  const unpaid = installments.filter((i) => i.paid < i.amount - EPSILON);
  const isLate = unpaid.some((i) => i.dueDate < now);
  const nextDueDate = unpaid.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0]?.dueDate ?? null;

  return { remaining, isLate, nextDueDate };
}
