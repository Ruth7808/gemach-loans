/** מנרמל מספר טלפון להשוואה: מסיר כל תו שאינו ספרה, וממיר קידומת בינלאומית 972 לקידומת מקומית 0. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}
