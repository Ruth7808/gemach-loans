import { useEffect, useRef, useState } from 'react';
import { createLoan, checkLoanRisk, type LoanRiskCheck } from '../api';
import { today, toLocalISODate } from '../dateUtils';
import './LoanFormModal.css';

interface Props {
  borrowerId: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  amount?: string;
  numInstallments?: string;
  givenDate?: string;
  firstDueDate?: string;
}

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, daysInTargetMonth));
  return target;
}

function generateSchedule(firstDueDate: string, count: number): string[] {
  if (!firstDueDate || !(count >= 1)) return [];
  const start = new Date(`${firstDueDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];
  return Array.from({ length: count }, (_, i) => toLocalISODate(addMonthsClamped(start, i)));
}

export function LoanFormModal({ borrowerId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [checkingRisk, setCheckingRisk] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [riskWarning, setRiskWarning] = useState<LoanRiskCheck | null>(null);

  const [amount, setAmount] = useState('');
  const [givenDate, setGivenDate] = useState(today());
  const [numInstallments, setNumInstallments] = useState('1');
  const [firstDueDate, setFirstDueDate] = useState('');
  const [dueDates, setDueDates] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    setDueDates(generateSchedule(firstDueDate, Number(numInstallments)));
  }, [firstDueDate, numInstallments]);

  const amountNum = Number(amount);
  const countNum = Number(numInstallments);
  const installmentPreview =
    amountNum > 0 && countNum >= 1 ? Math.ceil((amountNum / countNum) * 100) / 100 : null;

  function updateDueDate(index: number, value: string) {
    setDueDates((prev) => prev.map((d, i) => (i === index ? value : d)));
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!(amountNum > 0)) next.amount = 'אנא הזן/י סכום גדול מאפס';
    if (!Number.isInteger(countNum) || countNum < 1) next.numInstallments = 'אנא הזן/י מספר תשלומים תקין';
    if (!givenDate) next.givenDate = 'אנא בחר/י תאריך מתן ההלוואה';
    if (!firstDueDate) next.firstDueDate = 'אנא בחר/י תאריך תשלום ראשון';
    return next;
  }

  async function submitLoan() {
    setSaving(true);
    setSubmitError(null);
    try {
      await createLoan({
        borrowerId,
        amount: amountNum,
        numInstallments: countNum,
        givenDate,
        installmentDueDates: dueDates,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch {
      setSubmitError('יצירת ההלוואה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setCheckingRisk(true);
    setSubmitError(null);
    try {
      const risk = await checkLoanRisk(amountNum);
      setCheckingRisk(false);
      if (risk.insufficientFunds || risk.newlyAtRisk.length > 0) {
        setRiskWarning(risk);
        return;
      }
      await submitLoan();
    } catch {
      setCheckingRisk(false);
      setSubmitError('בדיקת הסיכון נכשלה. נסי שוב.');
    }
  }

  return (
    <dialog ref={dialogRef} className="loan-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>הוספת הלוואה</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <label>
            סכום ההלוואה
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              autoFocus
              aria-invalid={Boolean(errors.amount)}
            />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </label>
          <label>
            תאריך מתן ההלוואה
            <input
              value={givenDate}
              onChange={(e) => setGivenDate(e.target.value)}
              type="date"
              aria-invalid={Boolean(errors.givenDate)}
            />
            {errors.givenDate && <span className="field-error">{errors.givenDate}</span>}
          </label>
        </div>

        <div className="field-row">
          <label>
            מספר תשלומים
            <input
              value={numInstallments}
              onChange={(e) => setNumInstallments(e.target.value)}
              type="number"
              step="1"
              min="1"
              aria-invalid={Boolean(errors.numInstallments)}
            />
            {errors.numInstallments && <span className="field-error">{errors.numInstallments}</span>}
          </label>
          <label>
            תאריך תשלום ראשון
            <input
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              type="date"
              aria-invalid={Boolean(errors.firstDueDate)}
            />
            {errors.firstDueDate && <span className="field-error">{errors.firstDueDate}</span>}
          </label>
        </div>

        {dueDates.length > 0 && (
          <div className="schedule-box">
            <p className="schedule-title">לוח תשלומים</p>
            <div className="schedule-table">
              {dueDates.map((date, i) => (
                <div className="schedule-row" key={i}>
                  <span className="schedule-number">{i + 1}</span>
                  <input type="date" value={date} onChange={(e) => updateDueDate(i, e.target.value)} />
                  <span className="schedule-amount">{installmentPreview !== null ? currency.format(installmentPreview) : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label>
          הערות
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {submitError && <p className="form-error">{submitError}</p>}

        {riskWarning && (
          <div className="risk-warning">
            {riskWarning.insufficientFunds && (
              <p className="risk-warning-severe">
                אין מספיק כסף פנוי להלוואה זו — חסר {currency.format(riskWarning.shortfallAmount)}.
              </p>
            )}
            {riskWarning.newlyAtRisk.length > 0 && (
              <div className="risk-warning-moderate">
                <p>הלוואה זו תדחוף את בקשות המשיכה הבאות לסיכון:</p>
                <ul>
                  {riskWarning.newlyAtRisk.map((r) => (
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
        )}

        <div className="modal-actions">
          {riskWarning ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setRiskWarning(null)} disabled={saving}>
                חזרה לעריכה
              </button>
              <button type="button" className="btn-primary" onClick={submitLoan} disabled={saving}>
                {saving ? 'שומר...' : 'אשר ושמור בכל זאת'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={onClose} disabled={saving || checkingRisk}>
                ביטול
              </button>
              <button type="submit" className="btn-primary" disabled={saving || checkingRisk}>
                {checkingRisk ? 'בודק...' : saving ? 'שומר...' : 'שמירה'}
              </button>
            </>
          )}
        </div>
      </form>
    </dialog>
  );
}
