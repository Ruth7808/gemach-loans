import { useEffect, useRef, useState } from 'react';
import { createLoan, checkLoanRisk, type LoanRiskCheck } from '../api';
import { useLoanTermsForm } from './useLoanTermsForm';
import { LoanTermsFields } from './LoanTermsFields';
import { RiskWarning } from './RiskWarning';
import './LoanFormModal.css';

interface Props {
  borrowerId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function LoanFormModal({ borrowerId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [checkingRisk, setCheckingRisk] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [riskWarning, setRiskWarning] = useState<LoanRiskCheck | null>(null);
  const [notes, setNotes] = useState('');

  const form = useLoanTermsForm();

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function submitLoan() {
    setSaving(true);
    setSubmitError(null);
    try {
      await createLoan({
        borrowerId,
        amount: form.amountNum,
        numInstallments: form.numInstallmentsNum,
        givenDate: form.givenDate,
        installmentDueDates: form.dueDates,
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

    if (Object.keys(form.validate()).length > 0) return;

    setCheckingRisk(true);
    setSubmitError(null);
    try {
      const risk = await checkLoanRisk(form.amountNum);
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
        <LoanTermsFields form={form} />

        <label>
          הערות
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {submitError && <p className="form-error">{submitError}</p>}

        {riskWarning && <RiskWarning risk={riskWarning} />}

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
