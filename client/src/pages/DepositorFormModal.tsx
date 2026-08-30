import { useEffect, useRef, useState } from 'react';
import { createDepositor, updateDepositor, type Depositor, type NewDepositor } from '../api';
import { FieldIcon } from '../icons';
import './DepositorFormModal.css';

interface Props {
  depositor?: Depositor;
  onClose: () => void;
  onSaved: () => void;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export function DepositorFormModal({ depositor, onClose, onSaved }: Props) {
  const isEdit = Boolean(depositor);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [firstName, setFirstName] = useState(depositor?.firstName ?? '');
  const [lastName, setLastName] = useState(depositor?.lastName ?? '');
  const [phone, setPhone] = useState(depositor?.phone ?? '');
  const [email, setEmail] = useState(depositor?.email ?? '');
  const [address, setAddress] = useState(depositor?.address ?? '');
  const [notes, setNotes] = useState(depositor?.notes ?? '');

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

    const data: NewDepositor = {
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
      if (depositor) {
        await updateDepositor(depositor.id, data);
      } else {
        await createDepositor(data);
      }
      onSaved();
    } catch {
      setSubmitError('שמירת המפקיד נכשלה. נסי שוב.');
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className="depositor-modal" onClose={onClose}>
      <div className="modal-header">
        <div className="modal-avatar">{initials}</div>
        <h2>{isEdit ? 'עריכת מפקיד' : 'הוספת מפקיד'}</h2>
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
