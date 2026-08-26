import { useEffect, useRef, useState } from 'react';
import { createBorrower, updateBorrower, type Borrower, type NewBorrower } from '../api';
import './BorrowerFormModal.css';

interface Props {
  borrower?: Borrower;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

const ICON_PATHS = {
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  phone:
    'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1L6.6 10.8Z',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 0 8 7 8-7',
  pin: 'M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  note: 'M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v6h6M8 13h8M8 17h5',
} as const;

function FieldIcon({ name }: { name: keyof typeof ICON_PATHS }) {
  return (
    <svg className="field-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={ICON_PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BorrowerFormModal({ borrower, onClose, onSaved }: Props) {
  const isEdit = Boolean(borrower);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [firstName, setFirstName] = useState(borrower?.firstName ?? '');
  const [lastName, setLastName] = useState(borrower?.lastName ?? '');
  const [phone, setPhone] = useState(borrower?.phone ?? '');
  const [email, setEmail] = useState(borrower?.email ?? '');
  const [address, setAddress] = useState(borrower?.address ?? '');
  const [notes, setNotes] = useState(borrower?.notes ?? '');

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const initials = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}` || '?';

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'אנא מלא/י שם פרטי';
    if (!lastName.trim()) next.lastName = 'אנא מלא/י שם משפחה';
    if (!phone.trim()) next.phone = 'אנא מלא/י טלפון';
    return next;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const data: NewBorrower = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    setSubmitError(null);
    try {
      if (borrower) {
        await updateBorrower(borrower.id, data);
      } else {
        await createBorrower(data);
      }
      onSaved();
    } catch {
      setSubmitError('שמירת הלווה נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="borrower-modal" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-avatar">{initials}</div>
        <h2>{isEdit ? 'עריכת לווה' : 'הוספת לווה'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <label>
            שם פרטי
            <div className="input-wrap">
              <FieldIcon name="user" />
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                aria-invalid={Boolean(errors.firstName)}
              />
            </div>
            {errors.firstName && <span className="field-error">{errors.firstName}</span>}
          </label>
          <label>
            שם משפחה
            <div className="input-wrap">
              <FieldIcon name="user" />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                aria-invalid={Boolean(errors.lastName)}
              />
            </div>
            {errors.lastName && <span className="field-error">{errors.lastName}</span>}
          </label>
        </div>

        <label>
          טלפון
          <div className="input-wrap">
            <FieldIcon name="phone" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              aria-invalid={Boolean(errors.phone)}
            />
          </div>
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </label>
        <label>
          אימייל
          <div className="input-wrap">
            <FieldIcon name="mail" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </div>
        </label>
        <label>
          כתובת
          <div className="input-wrap">
            <FieldIcon name="pin" />
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </label>
        <label>
          הערות
          <div className="input-wrap">
            <FieldIcon name="note" />
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
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
