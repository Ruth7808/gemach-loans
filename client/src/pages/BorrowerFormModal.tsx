import { useEffect, useRef, useState } from 'react';
import { createBorrower } from '../api';
import './BorrowerFormModal.css';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function BorrowerFormModal({ onClose, onCreated }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') ?? '').trim();
    const lastName = String(form.get('lastName') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const address = String(form.get('address') ?? '').trim();
    const notes = String(form.get('notes') ?? '').trim();

    setSaving(true);
    setError(null);
    try {
      await createBorrower({
        firstName,
        lastName,
        phone,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch {
      setError('שמירת הלווה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="borrower-modal" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>הוספת לווה</h2>

        <label>
          שם פרטי
          <input name="firstName" required autoFocus />
        </label>
        <label>
          שם משפחה
          <input name="lastName" required />
        </label>
        <label>
          טלפון
          <input name="phone" required type="tel" />
        </label>
        <label>
          אימייל
          <input name="email" type="email" />
        </label>
        <label>
          כתובת
          <input name="address" />
        </label>
        <label>
          הערות
          <input name="notes" />
        </label>

        {error && <p className="form-error">{error}</p>}

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
