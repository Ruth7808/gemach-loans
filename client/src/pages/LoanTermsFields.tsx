import type { LoanTermsForm } from './useLoanTermsForm';
import './LoanTermsFields.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

/** שדות תנאי הלוואה (סכום, תאריך מתן, מספר תשלומים, לוח תשלומים לעריכה) — רכיב משותף. */
export function LoanTermsFields({ form }: { form: LoanTermsForm }) {
  return (
    <div className="loan-terms-fields">
      <div className="field-row">
        <label>
          סכום ההלוואה
          <input
            value={form.amount}
            onChange={(e) => form.setAmount(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            aria-invalid={Boolean(form.errors.amount)}
          />
          {form.errors.amount && <span className="field-error">{form.errors.amount}</span>}
        </label>
        <label>
          תאריך מתן ההלוואה
          <input
            value={form.givenDate}
            onChange={(e) => form.setGivenDate(e.target.value)}
            type="date"
            aria-invalid={Boolean(form.errors.givenDate)}
          />
          {form.errors.givenDate && <span className="field-error">{form.errors.givenDate}</span>}
        </label>
      </div>

      <div className="field-row">
        <label>
          מספר תשלומים
          <input
            value={form.numInstallments}
            onChange={(e) => form.setNumInstallments(e.target.value)}
            type="number"
            step="1"
            min="1"
            aria-invalid={Boolean(form.errors.numInstallments)}
          />
          {form.errors.numInstallments && <span className="field-error">{form.errors.numInstallments}</span>}
        </label>
        <label>
          תאריך תשלום ראשון
          <input
            value={form.firstDueDate}
            onChange={(e) => form.setFirstDueDate(e.target.value)}
            type="date"
            aria-invalid={Boolean(form.errors.firstDueDate)}
          />
          {form.errors.firstDueDate && <span className="field-error">{form.errors.firstDueDate}</span>}
        </label>
      </div>

      {form.dueDates.length > 0 && (
        <div className="schedule-box">
          <p className="schedule-title">לוח תשלומים</p>
          <div className="schedule-table">
            {form.dueDates.map((date, i) => (
              <div className="schedule-row" key={i}>
                <span className="schedule-number">{i + 1}</span>
                <input type="date" value={date} onChange={(e) => form.updateDueDate(i, e.target.value)} />
                <span className="schedule-amount">
                  {form.installmentPreview !== null ? currency.format(form.installmentPreview) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
