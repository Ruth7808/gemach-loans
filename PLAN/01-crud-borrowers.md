# משימה: CRUD לווים (Borrowers)

## מטרה
API בסיסי לניהול לווים: יצירה, קריאה (רשימה + בודד), עדכון, מחיקה.

## מבנה קבצים בשרת
בלי שכבת `services` נפרדת — ה-controller קורא ישירות ל-Prisma. ההיקף הנוכחי
(CRUD פשוט) לא מצדיק שכבה נוספת. אם לוגיקה עסקית מורכבת (למשל הקצאת FIFO
בתשלומים) תגדל ותתחיל לחזור על עצמה, נשקול להוציא אותה לשכבת service בנקודה
הזו — לא לפני.

```
server/src/
  index.ts                       # app, mount routers, error handler, listen
  lib/prismaClient.ts            # instance יחיד ומשותף של PrismaClient
  routes/borrowers.routes.ts     # מגדיר Router, ממפה method+path ל-controller
  controllers/borrowers.controller.ts  # req/res + ולידציה + שאילתות Prisma
  middleware/errorHandler.ts     # תפיסת שגיאות מרכזית, JSON אחיד
```

**עיקרון החלוקה למודלים:** כל מודל עם CRUD ישיר מקבל זוג routes/controller
משלו. מודלים שמנוהלים כתוצר-לוואי של פעולה אחרת — Installment (נוצר אוטומטית
ביצירת הלוואה) ו-Allocation (נוצר אוטומטית ברישום תשלום) — לא מקבלים זוג נפרד;
הלוגיקה שלהם תחיה בתוך `controllers/loans.controller.ts` ו-
`controllers/payments.controller.ts` בהתאמה, במשימות הבאות.

## Endpoints

מבוסס על מודל `Borrower` ב-`server/prisma/schema.prisma`
(id, firstName, lastName, phone, email?, address?, notes?, createdAt).

| Method | Path | תיאור | סטטוס הצלחה | שגיאות |
|---|---|---|---|---|
| GET | /api/borrowers | רשימת כל הלווים | 200 | — |
| GET | /api/borrowers/:id | לווה בודד | 200 | 404 אם לא נמצא |
| POST | /api/borrowers | יצירה. חובה: firstName, lastName, phone. אופציונלי: email, address, notes | 201 | 400 אם חסר שדה חובה/ריק |
| PUT | /api/borrowers/:id | עדכון לווה קיים (כל השדות חוץ מ-id/createdAt) | 200 | 404 אם לא נמצא, 400 קלט לא תקין |
| DELETE | /api/borrowers/:id | מחיקה | 200 | 404 אם לא נמצא, 409 אם יש לו הלוואות משויכות |

**ולידציה:** בדיקות ידניות פשוטות (if/else) ב-controller — בלי ספריית ולידציה
חיצונית, בהתאם להיקף הקטן ולעיקרון "מחוץ להיקף" ב-CLAUDE.md.

**מדיניות מחיקה:** לפני מחיקה, ה-controller בודק
(`prisma.loan.count({ where: { borrowerId } })`) אם קיימות הלוואות ללווה. אם
כן — מחזיר 409 עם הודעה ברורה. זה מונע איבוד היסטוריה בטעות.

## מחוץ להיקף (למשימה הזו)
- אימות/הרשאות (משתמש יחיד, לא צריך)
- pagination/סינון/חיפוש ברשימה
- קשר ללוח תשלומים/הלוואות (יטופל במשימות הבאות)

## בדיקה
בדיקה ידנית עם curl לכל endpoint: יצירה, קריאה, עדכון, מחיקה, ומקרי קצה
(שדה חובה חסר, id לא קיים, מחיקת לווה עם הלוואות).
