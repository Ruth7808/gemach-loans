/** מפרמט תאריך ל-YYYY-MM-DD לפי הזמן המקומי, לא UTC (בניגוד ל-toISOString, שמזיז לפעמים יום אחורה/קדימה). */
export function toLocalISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function today(): string {
  return toLocalISODate(new Date());
}
