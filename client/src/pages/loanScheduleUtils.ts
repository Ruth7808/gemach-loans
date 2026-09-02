import { toLocalISODate } from '../dateUtils';

/** מוסיף חודשים לתאריך, עם "הצמדה" ליום האחרון בחודש היעד אם הוא קצר מדי (למשל 31 בינואר → 28/29 בפברואר). */
export function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

/** בונה N תאריכי תשלום חודשיים החל מתאריך התשלום הראשון. */
export function generateSchedule(firstDueDate: string, count: number): string[] {
  if (!firstDueDate || !(count >= 1)) return [];
  const start = new Date(`${firstDueDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  return Array.from({ length: count }, (_, i) => toLocalISODate(addMonthsClamped(start, i)));
}
