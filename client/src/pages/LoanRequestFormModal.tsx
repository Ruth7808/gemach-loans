import { useEffect, useRef, useState } from 'react';
import { createLoanRequest } from '../api';
import { FieldIcon } from '../icons';
import './LoanRequestFormModal.css';

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  name?: string;
  phone?: string;
  amount?: string;
}

export function LoanRequestFormModal({ onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [numInstallments, setNumInstallments] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = 'אנא מלא/י שם';
    if (!phone.trim()) next.phone = 'אנא מלא/י טלפון';
    if (!(Number(amount) > 0)) next.amount = 'אנא הזן/י סכום גדול מאפס';
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setSubmitError(null);
    try {
      await createLoanRequest({
        name: name.trim(),
        phone: phone.trim(),
        amount: Number(amount),
        numInstallments: numInstallments.trim() ? Number(numInstallments) : undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'יצירת הבקשה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="loan-request-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>בקשת הלוואה חדשה</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          שם
          <div className="input-wrap">
            <FieldIcon name="user" />
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-invalid={Boolean(errors.name)} />
          </div>
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label>
          טלפון
          <div className="input-wrap">
            <FieldIcon name="phone" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" aria-invalid={Boolean(errors.phone)} />
          </div>
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>

        <div className="field-row">
          <label>
            סכום מבוקש
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              aria-invalid={Boolean(errors.amount)}
            />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </label>
          <label>
            מספר תשלומים מבוקש
            <input value={numInstallments} onChange={(e) => setNumInstallments(e.target.value)} type="number" step="1" min="1" />
          </label>
        </div>

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
