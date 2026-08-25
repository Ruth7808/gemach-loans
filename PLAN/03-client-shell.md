# שלב 0 (לקוח) — השלד

## מטרה
לבנות את התשתית שכל מסך עתידי יישען עליה: RTL/עברית, ניווט קבוע, ראוטינג, ושכבת API יחידה. בסוף השלב: אפליקציה ריקה עם סרגל ניווט שעובד, מנווטת בין 3 דפים ריקים (דשבורד / לווים / הלוואות), והדף מציג שהחיבור לשרת חי (health check).

## הקיר הראשון: לקוח (5173) מול שרת (3001)
הפתרון: **Vite dev proxy**, לא CORS. ב-`vite.config.ts` מגדירים `server.proxy["/api"] -> http://localhost:3001`. כך קריאות מהלקוח הולכות ל-`/api/...` (יחסי, אותו origin), Vite מעביר אותן לשרת מאחורי הקלעים — אין צורך לגעת בשרת בכלל, ואין בעיית CORS כי מבחינת הדפדפן זו אותה כתובת. שכבת ה-API בלקוח תמיד תפנה ל-`/api/...` יחסי, לא ל-`http://localhost:3001/...` מוחלט.

## שינויים

### קבצים חדשים
- `client/src/api.ts` — מודול API יחיד. פונקציה `apiFetch(path, options)` שעוטפת `fetch('/api' + path, ...)`, זורקת שגיאה קריאה אם התשובה לא ok, ומחזירה JSON מפוענח. שאר האפליקציה לא קוראת ל-`fetch` ישירות — הכל דרך הפונקציה הזו. כולל פונקציה `checkHealth()` שקוראת ל-`GET /api/health` (קיים כבר בשרת).
- `client/src/layout/AppLayout.tsx` — המעטפת: `<div dir="rtl">` עם סרגל ניווט קבוע בצד ימין (`Nav`) ואזור תוכן (`<Outlet />` מ-react-router).
- `client/src/layout/Nav.tsx` — סרגל ניווט: 3 קישורים (דשבורד / לווים / הלוואות) עם `NavLink` שמדגיש את הדף הפעיל.
- `client/src/pages/DashboardPage.tsx` — דף ריק עם כותרת "דשבורד" בלבד. בנוסף: קורא ל-`checkHealth()` ב-`useEffect` ומציג "מחובר לשרת" / "אין חיבור לשרת" — רק כדי לוודא בעין שה-proxy עובד; לא תוכן אמיתי.
- `client/src/pages/BorrowersPage.tsx` — דף ריק, כותרת "לווים" בלבד.
- `client/src/pages/LoansPage.tsx` — דף ריק, כותרת "הלוואות" בלבד.

### קבצים שישתנו
- `client/vite.config.ts` — הוספת `server.proxy` כמתואר למעלה.
- `client/index.html` — `<html dir="rtl" lang="he">`.
- `client/src/main.tsx` — עטיפת `<App />` ב-`<BrowserRouter>`.
- `client/src/App.tsx` — יוחלף כליל: הגדרת `<Routes>` עם `AppLayout` כ-route אב ו-3 ה-routes (`/`, `/borrowers`, `/loans`) כילדים. מסירים את כל התוכן הדמו של Vite (לוגו, מונה קליקים).
- `client/src/App.css`, `client/src/index.css` — ניקוי מהעיצוב הדמו של Vite; ללא עיצוב חדש (זה לא בהיקף השלב).

### חבילות להתקין
- `react-router` (או `react-router-dom` — נבדוק גרסה עדכנית; זה מה שנותן `BrowserRouter`, `Routes`, `Route`, `NavLink`, `Outlet`)

## מחוץ להיקף (לשלב הזה)
- עיצוב ויזואלי כלשהו (צבעים, פונטים, ריווחים) — רק RTL פונקציונלי
- תוכן אמיתי בתוך הדפים — כרגע רק כותרת ריקה
- Endpoints חדשים בשרת — לא נוגעים בשרת בכלל, רק צורכים את מה שקיים (`/api/health`)
- טיפול שגיאות מתקדם / loading states / retry
- ניהול state גלובלי (Context/Redux/וכו') — לא נדרש עדיין

## בדיקה (כשיהיה מומש)
1. `npm run dev` בשרת, `npm run dev` בלקוח.
2. פתיחת `http://localhost:5173/` — דף עברי RTL, סרגל ניווט מימין.
3. הדשבורד מציג "מחובר לשרת" (מוכיח שה-proxy עובד בלי CORS errors בקונסול).
4. קליק על "לווים" ו"הלוואות" בסרגל — מנווט לדף המתאים בלי רענון דף מלא, ה-URL משתנה, הקישור הפעיל מודגש בסרגל.

## instructions

1. try to be simple as possible
2. ask me questions, never assume
3. grill me
