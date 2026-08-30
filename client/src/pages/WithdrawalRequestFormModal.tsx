import { useEffect, useRef, useState } from 'react';
import { createWithdrawalRequest } from '../api';
import './WithdrawalRequestFormModal.css';

interface Props {
  depositorId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function WithdrawalRequestFormModal({ depositorId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountNum = Number(amount);
    if (!(amountNum > 0)) {
      setAmountError('אנא הזן/י סכום גדול מאפס');
      return;
    }
    setAmountError(null);

    setSaving(true);
    setSubmitError(null);
    try {
      await createWithdrawalRequest({
        depositorId,
        amount: amountNum,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'יצירת בקשת המשיכה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="withdrawal-request-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>בקשת משיכה חדשה</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <p className="modal-hint">תאריך היעד לתשלום ייקבע אוטומטית לפי תקופת ההתראה הנדרשת.</p>

        <label>
          סכום מבוקש
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            autoFocus
            aria-invalid={Boolean(amountError)}
          />
          {amountError && <span className="field-error">{amountError}</span>}
        </label>

        <label>
          הערות
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {submitError && <p className="form-error">{submitError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'שומר...' : 'שמירה'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
