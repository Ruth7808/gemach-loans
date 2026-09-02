import type { LoanRiskCheck } from '../api';
import './RiskWarning.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

/** אזהרת סיכון לפני יצירת הלוואה (כסף לא מספיק / דוחפת בקשת משיכה לסיכון) — לא חוסמת, רק מציגה. רכיב משותף. */
export function RiskWarning({ risk }: { risk: LoanRiskCheck }) {
  return (
    <div className="risk-warning">
      {risk.insufficientFunds && (
        <p className="risk-warning-severe">
          אין מספיק כסף פנוי להלוואה זו — חסר {currency.format(risk.shortfallAmount)}.
        </p>
      )}
      {risk.newlyAtRisk.length > 0 && (
        <div className="risk-warning-moderate">
          <p>הלוואה זו תדחוף את בקשות המשיכה הבאות לסיכון:</p>
          <ul>
            {risk.newlyAtRisk.map((r) => (
              <li key={r.requestId}>
                {r.depositorName} — תאריך יעד {dateFormat.format(new Date(r.targetDate))}, חוסר{' '}
                {currency.format(r.shortfall)}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="risk-warning-note">אפשר לאשר ולשמור בכל זאת — ההחלטה בידייך.</p>
    </div>
  );
}
