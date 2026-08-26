import { useEffect, useRef, useState } from 'react';
import { createPayment } from '../api';
import { today } from '../dateUtils';
import './PaymentFormModal.css';

interface Props {
  loanId: number;
  remaining: number;
  onClose: () => void;
  onSaved: () => void;
}

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function PaymentFormModal({ loanId, remaining, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const amountNum = Number(amount);
  const overpays = amount !== '' && amountNum > remaining;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!(amountNum > 0)) {
      setAmountError('אנא הזן/י סכום גדול מאפס');
      return;
    }
    setAmountError(null);

    setSaving(true);
    setSubmitError(null);
    try {
      await createPayment({
        loanId,
        amount: amountNum,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch {
      setSubmitError('רישום התשלום נכשל. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="payment-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>רישום תשלום</h2>
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
          {overpays && (
            <span className="overpay-warning">
              הסכום גבוה מהיתרה הנותרת ({currency.format(remaining)}) ב-{currency.format(amountNum - remaining)} —
              הסכום העודף לא יוקצה לאף תשלום.
            </span>
          )}
        </label>

        <label>
          תאריך תשלום
          <input value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} type="date" required />
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
