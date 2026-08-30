import { useEffect, useRef, useState } from 'react';
import { updateOpeningBalance } from '../api';
import './OpeningBalanceModal.css';

interface Props {
  currentValue: number;
  onClose: () => void;
  onSaved: () => void;
}

export function OpeningBalanceModal({ currentValue, onClose, onSaved }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(String(currentValue));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const num = Number(value);
    if (!Number.isFinite(num)) {
      setError('אנא הזן/י סכום תקין');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateOpeningBalance(num);
      onSaved();
    } catch {
      setError('העדכון נכשל. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="balance-modal" onClose={onClose}>
      <div className="modal-header">
        <h2>עריכת יתרת פתיחה</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <p className="balance-warning">
          שינוי יתרת הפתיחה משפיע על חישוב "כסף פנוי" בכל המערכת. ודאי שהסכום נכון לפני שמירה.
        </p>

        <label>
          יתרת פתיחה
          <input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="0.01" autoFocus />
        </label>
        {error && <span className="field-error">{error}</span>}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            ביטול
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'מעדכן...' : 'עדכן יתרת פתיחה'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
