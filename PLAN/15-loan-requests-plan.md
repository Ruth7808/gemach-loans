# שלב — בקשות הלוואה (יצירה ידנית + בדיקה + המרה להלוואה)

## מטרה
שכבת קלט חדשה מעל יצירת הלוואה הקיימת: בקשה (LoanRequest) שמייצגת כוונה,
עוברת בדיקה ושיוך ללווה, ורק אז הופכת בפועל להלוואה. אותו עיקרון בדיוק כמו
WithdrawalRequest מול Withdrawal. בשלב הזה — יצירה ורק ידנית בתוך המערכת.
אינטגרציית Fillout, טופס ציבורי ומשיכה אוטומטית — לא בשלב הזה (שלב ב׳ עתידי).

## החלטות מהגרילינג
1. **ערכי סטטוס ומקור באנגלית ב-DB**, עקבי עם `WithdrawalRequest`
   (`pending`/`rejected`/`converted`, `manual`/`fillout`) — תרגום לעברית רק
   בתצוגה.
2. **מקור: רק `manual`/`fillout`** — `google_form` הוסר, לא רלוונטי לשום
   מקום אחר במסמך המקורי.
3. **מסך בדיקת בקשה = דף מלא** (לא מודל) — כי הוא מכיל כמה אזורים (פרטי
   בקשה, שיוך ללווה, טופס תנאי הלוואה עם לוח תשלומים לעריכה).
4. **צבע-זהות חמישי: טורקיז/ציאן** (`--accent-teal`) לניווט/עמודים של בקשות
   הלוואה — לא מתנגש עם ירוק/זהב/סגול/כחול הקיימים.

## 1. סכימת Prisma

```prisma
model LoanRequest {
  id               Int       @id @default(autoincrement())
  source           String    @default("manual") // manual | fillout
  externalId       String?
  borrowerId       Int?
  nameAsEntered    String
  phoneAsEntered   String
  amount           Float
  numInstallments  Int?
  notes            String?
  rawFormData      String?   // JSON כטקסט, ריק בשלב הזה
  status           String    @default("pending") // pending | rejected | converted
  loanId           Int?      @unique
  requestDate      DateTime  @default(now())
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  borrower         Borrower? @relation(fields: [borrowerId], references: [id])
  loan             Loan?     @relation(fields: [loanId], references: [id])
}
```
+ הוספת back-relation `loanRequests LoanRequest[]` על `Borrower` ו-`Loan`.
מיגרציה: `add_loan_requests`.

## 2. נרמול טלפון (חדש, משותף)

`server/src/lib/phone.ts` — `normalizePhone(phone: string): string`: מסיר כל
תו שאינו ספרה, וממיר קידומת `972` בהתחלה (עם/בלי `+` שכבר הוסר) לקידומת
מקומית `0`. ישמש גם להתאמת לווה (סעיף 3) וגם לאזהרת בקשה כפולה (סעיף 4).

## 3. שיוך ללווה — לפי טלפון מנורמל

ב-`GET /:id`: אם `borrowerId` ריק, השרת מחפש לווים שה-`normalizePhone` שלהם
זהה לזה של הבקשה, ומחזיר את ההתאמה הראשונה (אם יש) כ-`suggestedBorrower`
בתשובה. הלקוח מציג "נראה שזה [שם], טלפון תואם" עם כפתור אישור (קורא
ל-`PUT /:id` עם `borrowerId`). אם אין התאמה — כפתור "צור לווה חדש" פותח את
`BorrowerFormModal` הקיים, ממולא מראש משם/טלפון הבקשה; אחרי שמירה, הלקוח
קורא `PUT /:id` עם ה-`borrowerId` החדש. בנוסף — תיבת חיפוש/בחירה ידנית
פשוטה (כמו החיפוש בעמוד רשימת הלווים) לבחירת לווה אחר ידנית.

## 4. אזהרת בקשה כפולה

ב-`GET` (רשימה) וב-`GET /:id`: כל בקשה מקבלת `duplicatePhone: boolean` —
true אם קיימת בקשה **אחרת** בסטטוס `pending` עם אותו `normalizePhone`. לא
חוסם שום פעולה, רק תג/אזהרה בתצוגה.

## 5. API — `/api/loan-requests`

- **GET** `?status=` — רשימה + `duplicatePhone` לכל שורה.
- **GET /:id** — פרטים מלאים + `duplicatePhone` + `suggestedBorrower` (אם
  `borrowerId` ריק).
- **POST** — יצירה ידנית: `name`, `phone`, `amount`, `numInstallments?`,
  `notes?`. קובע `source: "manual"`, `status: "pending"`, `requestDate: now`.
- **PUT /:id** — עדכון שדות (כולל `borrowerId`). **רק אם `status === "pending"`**,
  אחרת 409.
- **POST /:id/reject** — `status → "rejected"`, מקבל `note?` (מתווסף ל-notes).
  **רק אם `status === "pending"`**.
- **POST /:id/convert-to-loan** — גוף: `amount`, `numInstallments`,
  `givenDate`, `installmentDueDates`, `notes?`.
  1. דורש `borrowerId` קיים על הבקשה (מהעדכון בסעיף 3) — אחרת 400 ברור.
  2. דורש `status === "pending"` — אחרת 409.
  3. **לא מריץ בדיקת סיכון בעצמו** — הלקוח כבר קרא ל-`POST /loans/check-risk`
     הקיים לפני קריאה לפעולה הזו (בדיוק כמו בטופס הוספת הלוואה הרגיל),
     ומציג אזהרה-עם-אישור שם. שום שכפול לוגיקה.
  4. בטרנזקציה אחת: יוצר Loan+Installments (קורא לפונקציה המשותפת החדשה,
     סעיף 6), מעדכן את הבקשה ל-`status: "converted"` + `loanId`.

## 6. הימנעות משכפול יצירת הלוואה

מחלץ את גוף `loans.controller.ts#create` (יצירת Loan + Installments
בטרנזקציה) לפונקציה משותפת `server/src/lib/loanCreation.ts#createLoanWithInstallments(tx, params)`.
גם `POST /api/loans` הרגיל וגם `POST /loan-requests/:id/convert-to-loan`
קוראים לאותה פונקציה. שינוי מבני בלבד — אין שינוי התנהגות ל-`POST /api/loans`
הקיים.

## 7. מסכים

1. **רשימת בקשות הלוואה** (נתיב `/loan-requests`, ניווט ראשי, טורקיז) —
   טבלה, טאבים לפי סטטוס (הכל/ממתינות/נדחו/הפכו להלוואה), תג "בקשה כפולה"
   אם `duplicatePhone`. כפתור "בקשה חדשה" פותח מודל יצירה.
2. **מודל יצירת בקשה ידנית** (`LoanRequestFormModal`) — שדות: שם, טלפון,
   סכום, מספר תשלומים (רשות), הערות. זהים 1:1 למה שישמש בעתיד את טופס
   Fillout.
3. **דף בדיקת בקשה** (`/loan-requests/:id`, דף מלא) — פרטי הבקשה + אזהרת
   כפילות אם יש, אזור שיוך ללווה (סעיף 3), ואם יש `borrowerId` — טופס תנאי
   הלוואה סופיים עם לוח תשלומים לעריכה (**אותו רכיב חישוב לוח בדיוק** כמו
   ב-`LoanFormModal`, מחולץ ל-`client/src/pages/loanScheduleUtils.ts`
   כדי לא לשכפל), כפתורי "אשר וצור הלוואה" (זורם דרך `/loans/check-risk`
   ואז `convert-to-loan`, עם אזהרה-עם-אישור) ו"דחה בקשה".
4. **דשבורד** — שורת/פאנל "בקשות הלוואה ממתינות" (מספר + קישור לרשימה
   מסוננת) מתווסף ל"פעולות נדרשות".

## קבצים

**שרת (חדש):** `lib/phone.ts`, `lib/loanCreation.ts`,
`controllers/loanRequests.controller.ts`, `routes/loanRequests.routes.ts`.
**שרת (שינוי):** `schema.prisma`, `controllers/loans.controller.ts` (רפקטור
ל-`create` בלבד, ללא שינוי התנהגות), `controllers/dashboard.controller.ts`
(+`pendingLoanRequestsCount`), `index.ts` (רישום ראוטר).

**לקוח (חדש):** `pages/LoanRequestsPage.tsx`+`.css`,
`pages/LoanRequestFormModal.tsx`+`.css`, `pages/LoanRequestReviewPage.tsx`+`.css`,
`pages/loanScheduleUtils.ts`.
**לקוח (שינוי):** `api.ts` (טיפוסים+פונקציות חדשים), `App.tsx` (2 נתיבים),
`layout/Nav.tsx` (קישור חמישי), `icons.tsx` (אייקון חדש), `index.css`
(`--accent-teal`/`-bg`/`-hover`), `layout/AppLayout.css`, `pages/LoanFormModal.tsx`
(שימוש ב-`loanScheduleUtils` במקום קוד מקומי, ללא שינוי התנהגות),
`pages/DashboardPage.tsx`+`.css`.

## מחוץ להיקף (לשלב הזה)
אינטגרציית Fillout/Polling, טופס ציבורי חיצוני, ייבוא אוטומטי, `externalId`/
`rawFormData` בפועל (רק שדות ריקים מוכנים לעתיד).

## בדיקה
1. יצירת בקשה → מופיעה ברשימה כ"ממתינה".
2. שיוך ללווה קיים כשהטלפון מעוצב אחרת (למשל `050-1234567` מול `+972501234567`)
   — ההתאמה עדיין מזוהה.
3. יצירת לווה חדש מתוך בקשה — `borrowerId` מתעדכן, שם/טלפון ממולאים נכון.
4. שתי בקשות `pending` מאותו טלפון (מנורמל) — `duplicatePhone: true` בשתיהן,
   שום דבר לא נחסם.
5. המרה עם מספיק כסף — עובד חלק, `status → converted`, `loanId` מקושר,
   ההלוואה מופיעה בכרטיס הלווה עם לוח התשלומים הנכון.
6. המרה כשאין מספיק כסף / דוחפת בקשת משיכה לסיכון — אזהרה מוצגת (אותה
   רכיב אזהרה כמו בטופס הוספת הלוואה הרגיל), אפשר לאשר ולהמשיך.
7. דחיית בקשה — `status → rejected`, נעלמת מ"דורש טיפול" בדשבורד.
8. ניסיון `PUT`/`reject`/`convert-to-loan` על בקשה שכבר `converted`/`rejected`
   — נחסם עם שגיאה ברורה.
9. `POST /api/loans` הרגיל (מכרטיס לווה) עדיין עובד בדיוק כמו קודם אחרי
   הרפקטור לפונקציה משותפת.

## instructions

1. try to be simple as possible
2. ask me questions, never assume
3. grill me
