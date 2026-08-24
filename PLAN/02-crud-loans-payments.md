# משימה: CRUD הלוואות ותשלומים (Loans & Payments)

## מטרה
יצירת הלוואה עם generation אוטומטי של לוח תשלומים, ורישום תשלומים עם הקצאה
אוטומטית (FIFO) מהתשלום הישן ביותר לחדש.

## מבנה קבצים בשרת
ממשיך את המוסכמה מ-`01-crud-borrowers.md` — controller בלבד, בלי שכבת
services נפרדת.

```
server/src/
  controllers/loans.controller.ts     # CRUD הלוואות + generation לוח תשלומים
  routes/loans.routes.ts
  controllers/payments.controller.ts  # CRUD תשלומים + הקצאת FIFO + ביטול הקצאה
  routes/payments.routes.ts
```

לוגיקת FIFO/ביטול-הקצאה תחיה כפונקציות עזר פרטיות בתוך `payments.controller.ts`
עצמו (לא קובץ service נפרד) — נשארת שם כל עוד לא משוכפלת במקום נוסף.

## מודלים
מ-`server/prisma/schema.prisma`, ללא שינוי בסכימה:
Loan(id, borrowerId, amount, givenDate, numInstallments, status, notes,
createdAt), Installment(id, loanId, number, dueDate, amount, paid, status),
Payment(id, loanId, borrowerId, paymentDate, amount, notes, createdAt),
Allocation(id, paymentId, installmentId, allocatedAmount).

## Endpoints — הלוואות (Loan)

| Method | Path | תיאור | הצלחה | שגיאות |
|---|---|---|---|---|
| GET | /api/loans | רשימת כל ההלוואות (כולל borrower מקושר) | 200 | — |
| GET | /api/loans/:id | הלוואה בודדת + installments + payments | 200 | 404 |
| POST | /api/loans | יצירה + generation אוטומטי של installments | 201 | 400 |
| PUT | /api/loans/:id | עדכון `notes` בלבד (amount/numInstallments/installments לא ניתנים לעריכה אחרי יצירה) | 200 | 404, 400 |
| DELETE | /api/loans/:id | מחיקת הלוואה + ה-installments שלה (טרנזקציה) | 200 | 404, **409 אם יש תשלומים משויכים** |

**גוף בקשה ל-POST /api/loans:**
```json
{
  "borrowerId": 1,
  "amount": 3000,
  "givenDate": "2026-01-01",
  "numInstallments": 3,
  "installmentDueDates": ["2026-02-01", "2026-03-01", "2026-04-01"],
  "notes": "אופציונלי"
}
```

**ולידציה:** borrowerId קיים; amount > 0; numInstallments >= 1 (מספר שלם);
`installmentDueDates.length === numInstallments`, כל תאריך תקין. **לא** נאכפת
ולידציית סדר עולה על התאריכים — אחריות המזין.

**חישוב סכום כל installment:** `Math.ceil((amount / numInstallments) * 100) / 100`
לכל אחד מה-N (עיגול למעלה לאגורה, בלי לתקן את התשלום האחרון — סטייה קטנה
כלפי מעלה מהסכום הכולל מקובלת, הוחלט מפורשות).

יצירת ההלוואה + כל ה-installments מתבצעת בטרנזקציית Prisma אחת
(`prisma.$transaction`).

**מדיניות מחיקה:** בדיקת `prisma.payment.count({ where: { loanId } })` לפני
מחיקה; אם > 0 → 409. אחרת מוחקים את כל ה-installments של ההלוואה ואז את
ההלוואה עצמה, בטרנזקציה.

## Endpoints — תשלומים (Payment)

| Method | Path | תיאור | הצלחה | שגיאות |
|---|---|---|---|---|
| GET | /api/payments | רשימת תשלומים; query אופציונלי `?loanId=` לסינון | 200 | — |
| GET | /api/payments/:id | תשלום בודד + allocations שלו | 200 | 404 |
| POST | /api/payments | רישום תשלום + הקצאת FIFO אוטומטית | 201 | 400, 404 (loanId לא קיים) |
| PUT | /api/payments/:id | עדכון amount/paymentDate/notes; מבטל הקצאות קיימות ומריץ FIFO מחדש עם הנתונים המעודכנים | 200 | 404, 400 |
| DELETE | /api/payments/:id | מחיקה + ביטול כל ה-allocations שלו | 200 | 404 |

**גוף בקשה ל-POST /api/payments:**
```json
{ "loanId": 5, "paymentDate": "2026-03-01", "amount": 1000, "notes": "אופציונלי" }
```

`borrowerId` נגזר אוטומטית מ-`loan.borrowerId` (לא מתקבל מהקלט). ולידציה:
loanId קיים; amount > 0; paymentDate תקין.

**אלגוריתם הקצאת FIFO** (משותף ל-create ול-update, אחרי ביטול הקצאות קיימות
בעדכון):
1. שולפים את כל ה-installments של ההלוואה שבהן `paid < amount`, ממוינות לפי
   `number` עולה (הישן ביותר קודם).
2. `remaining = payment.amount`.
3. לכל installment בתור: `alloc = min(remaining, installment.amount - installment.paid)`.
   אם `alloc > 0`: יוצרים רשומת `Allocation(paymentId, installmentId, alloc)`,
   `installment.paid += alloc`, מעדכנים `installment.status = "paid"` אם
   `paid >= amount` (אחרת נשאר `"pending"` — איחור נגזר דינמית, לא מאוחסן).
   `remaining -= alloc`.
4. עוצרים כש-`remaining === 0` או שאין עוד installments פתוחות. אם נשאר
   `remaining > 0` אחרי שכל ה-installments שולמו במלואן — הכסף **לא** מוקצה
   לשום installment (תשלום ביתר); הוא עדיין נספר בסך התשלומים לצורך נוסחת
   "כסף פנוי" ב-CLAUDE.md, גם בלי הקצאה. מתועד כהתנהגות מכוונת, לא נכשל.
5. אם כל ה-installments של ההלוואה הפכו ל-`"paid"` — מעדכנים `loan.status = "closed"`.

**ביטול הקצאות** (payment delete, ותחילת payment update): לכל Allocation של
אותו payment — `installment.paid -= allocatedAmount`, מעדכנים
`installment.status` חזרה ל-`"pending"` אם `paid < amount`, מוחקים את רשומת
ה-Allocation. אם ה-loan היה `"closed"` והפך להיות לא-משולם-במלואו — מחזירים
`loan.status = "active"`.

**מדיניות עדכון (PUT):** מבטלים את כל ה-allocations הקיימים של אותו תשלום
(כמו מחיקה), מעדכנים את שדות ה-Payment, ואז מריצים את אלגוריתם ה-FIFO מחדש
עם ה-amount המעודכן — כל זה בטרנזקציה אחת.

## מחוץ להיקף (למשימה הזו)
- סינון/pagination מתקדם ברשימות (מעבר ל-`?loanId=`)
- שינוי `amount`/`numInstallments`/תאריכים של הלוואה קיימת אחרי יצירה
  (ידרוש regeneration של הלוח — משימה נפרדת אם יידרש)
- מסכי UI (כרטיס הלוואה, רשימת הלוואות) — משימות עתידיות לפי CLAUDE.md

## בדיקה (כשתמומש בפועל, לא בשלב הזה)
בדיקה ידנית עם curl: יצירת הלוואה + וידוא installments נוצרו נכון; רישום
תשלום חלקי ווידוא הקצאה נכונה; תשלום שסוגר הלוואה (loan.status="closed");
מחיקת/עריכת תשלום ווידוא ביטול הקצאה; מחיקת הלוואה עם/בלי תשלומים (409/200).

## instructions

1. try to be simple as possible
2. ask me questions, never assume
3. grill me
4. do not implement, ur goal is to create a plan file in `docs/plan 01.md`