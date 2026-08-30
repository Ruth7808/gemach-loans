import { useEffect, useRef, useState } from 'react';
import { createDeposit } from '../api';
import { today } from '../dateUtils';
import './DepositFormModal.css';

interface Props {
  depositorId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function DepositFormModal({ depositorId, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
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
      await createDeposit({
        depositorId,
        amount: amountNum,
        date,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch {
      setSubmitError('רישום ההפקדה נכשל. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="deposit-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>רישום הפקדה</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          סכום
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
          תאריך הפקדה
          <input value={date} onChange={(e) => setDate(e.target.value)} type="date" required />
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
