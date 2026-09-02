import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  getLoanRequest,
  updateLoanRequest,
  rejectLoanRequest,
  convertLoanRequestToLoan,
  checkLoanRisk,
  listBorrowers,
  type LoanRequestDetail,
  type LoanRequestBorrower,
  type Borrower,
  type LoanRiskCheck,
} from '../api';
import { BorrowerFormModal } from './BorrowerFormModal';
import { useLoanTermsForm } from './useLoanTermsForm';
import { LoanTermsFields } from './LoanTermsFields';
import { RiskWarning } from './RiskWarning';
import { ArrowIcon, LoanRequestIcon } from '../icons';
import './BorrowersPage.css';
import './BorrowerDetailPage.css';
import './LoanRequestReviewPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

function statusLabel(status: string): { text: string; className: string } {
  if (status === 'converted') return { text: 'הפכה להלוואה', className: 'status-active' };
  if (status === 'rejected') return { text: 'נדחתה', className: 'status-closed' };
  return { text: 'ממתינה', className: 'status-upcoming' };
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') };
}

export function LoanRequestReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<LoanRequestDetail | null>(null);
  const [showNewBorrowerModal, setShowNewBorrowerModal] = useState(false);
  const [search, setSearch] = useState('');
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [checkingRisk, setCheckingRisk] = useState(false);
  const [converting, setConverting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [riskWarning, setRiskWarning] = useState<LoanRiskCheck | null>(null);

  function refresh() {
    getLoanRequest(Number(id)).then(setRequest);
  }

  useEffect(refresh, [id]);

  const form = useLoanTermsForm();

  // הבקשה נטענת א-סינכרונית (state מתחיל כ-null) — צריך למלא את סכום/מספר התשלומים
  // המבוקשים לטופס ברגע שהיא מגיעה, כי useState הפנימי של הטופס כבר "ננעל" בטעינה הראשונה.
  useEffect(() => {
    if (!request) return;
    form.setAmount(String(request.amount));
    if (request.numInstallments) form.setNumInstallments(String(request.numInstallments));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  const matchingBorrowers = useMemo(() => {
    if (!borrowers) return [];
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return borrowers
      .filter((b) => `${b.firstName} ${b.lastName} ${b.phone}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [borrowers, search]);

  if (!request) {
    return <p>טוען...</p>;
  }

  const status = statusLabel(request.status);
  const isPending = request.status === 'pending';

  async function assignBorrower(borrowerId: number) {
    setAssigning(true);
    try {
      await updateLoanRequest(request!.id, { borrowerId });
      setSearch('');
      refresh();
    } finally {
      setAssigning(false);
    }
  }

  async function handleNewBorrowerSaved(borrower: LoanRequestBorrower) {
    setShowNewBorrowerModal(false);
    await assignBorrower(borrower.id);
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await rejectLoanRequest(request!.id, rejectNote.trim() || undefined);
      refresh();
    } finally {
      setRejecting(false);
    }
  }

  async function submitConvert() {
    setConverting(true);
    setSubmitError(null);
    try {
      await convertLoanRequestToLoan(request!.id, {
        amount: form.amountNum,
        numInstallments: form.numInstallmentsNum,
        givenDate: form.givenDate,
        installmentDueDates: form.dueDates,
      });
      refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'יצירת ההלוואה נכשלה. נסי שוב.');
      setConverting(false);
    }
  }

  async function handleConvertSubmit(event: React.FormEvent<HTMLFormElement>) {
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
      await submitConvert();
    } catch {
      setCheckingRisk(false);
      setSubmitError('בדיקת הסיכון נכשלה. נסי שוב.');
    }
  }

  return (
    <div className="page page-loan-requests">
      <button className="back-link" onClick={() => navigate('/loan-requests')}>
        <ArrowIcon size={18} />
        חזרה לרשימת בקשות הלוואה
      </button>

      <div className="borrower-header">
        <div>
          <p className="card-eyebrow">
            <LoanRequestIcon size={16} />
            בקשת הלוואה
          </p>
          <h1>{request.nameAsEntered}</h1>
          <p className="borrower-contact">
            <a href={`tel:${request.phoneAsEntered}`}>{request.phoneAsEntered}</a>
            <span> · הוגשה {dateFormat.format(new Date(request.requestDate))}</span>
          </p>
          {request.notes && <p className="borrower-notes">{request.notes}</p>}
        </div>
        <div className="header-actions">
          <span className={`status-badge ${status.className}`}>{status.text}</span>
        </div>
      </div>

      {request.duplicatePhone && (
        <p className="duplicate-warning">קיימת בקשה פתוחה נוספת ממספר הטלפון הזה.</p>
      )}

      <div className="balance-tile">
        <span className="balance-label">סכום מבוקש</span>
        <span className="balance-amount">{currency.format(request.amount)}</span>
        {request.numInstallments && (
          <span className="balance-flag">{request.numInstallments} תשלומים מבוקשים</span>
        )}
      </div>

      {request.status === 'converted' && request.loan && (
        <p className="empty-state">
          הבקשה הפכה להלוואה.{' '}
          <button className="edit-link" onClick={() => navigate(`/loans/${request.loan!.id}`)}>
            לצפייה בהלוואה
          </button>
        </p>
      )}

      {request.status === 'rejected' && <p className="empty-state">הבקשה נדחתה.</p>}

      {isPending && (
        <>
          <h2 className="section-title">שיוך ללווה</h2>

          {request.borrower ? (
            <div className="borrower-match-card borrower-match-confirmed">
              <span>
                משויכת ל: <strong>{request.borrower.firstName} {request.borrower.lastName}</strong> ({request.borrower.phone})
              </span>
              <button className="edit-link" onClick={() => navigate(`/borrowers/${request.borrower!.id}`)}>
                לכרטיס הלווה
              </button>
            </div>
          ) : request.suggestedBorrower ? (
            <div className="borrower-match-card">
              <span>
                נראה שזה <strong>{request.suggestedBorrower.firstName} {request.suggestedBorrower.lastName}</strong>, טלפון תואם ({request.suggestedBorrower.phone})
              </span>
              <button className="btn-secondary" onClick={() => assignBorrower(request.suggestedBorrower!.id)} disabled={assigning}>
                אשר שיוך
              </button>
            </div>
          ) : (
            <p className="empty-state">לא נמצאה התאמה אוטומטית ללווה קיים.</p>
          )}

          <div className="borrower-match-actions">
            <input
              className="search-box"
              type="search"
              placeholder="חיפוש לווה קיים לפי שם או טלפון..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!borrowers) listBorrowers().then(setBorrowers);
              }}
            />
            <button className="btn-secondary" onClick={() => setShowNewBorrowerModal(true)}>
              צור לווה חדש
            </button>
          </div>

          {matchingBorrowers.length > 0 && (
            <ul className="borrower-match-results">
              {matchingBorrowers.map((b) => (
                <li key={b.id}>
                  <span>{b.firstName} {b.lastName} — {b.phone}</span>
                  <button className="edit-link" onClick={() => assignBorrower(b.id)} disabled={assigning}>
                    בחר
                  </button>
                </li>
              ))}
            </ul>
          )}

          {request.borrowerId && (
            <>
              <h2 className="section-title">תנאי הלוואה סופיים</h2>
              <form onSubmit={handleConvertSubmit} className="convert-loan-form">
                <LoanTermsFields form={form} />

                {submitError && <p className="form-error">{submitError}</p>}

                {riskWarning && <RiskWarning risk={riskWarning} />}

                <div className="modal-actions">
                  {riskWarning ? (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => setRiskWarning(null)} disabled={converting}>
                        חזרה לעריכה
                      </button>
                      <button type="button" className="btn-primary" onClick={submitConvert} disabled={converting}>
                        {converting ? 'שומר...' : 'אשר ושמור בכל זאת'}
                      </button>
                    </>
                  ) : (
                    <button type="submit" className="btn-primary" disabled={checkingRisk || converting}>
                      {checkingRisk ? 'בודק...' : converting ? 'שומר...' : 'אשר וצור הלוואה'}
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          <h2 className="section-title">דחיית הבקשה</h2>
          <div className="reject-row">
            <input
              className="search-box"
              placeholder="סיבת דחייה (רשות)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <button className="btn-secondary edit-link-danger" onClick={handleReject} disabled={rejecting}>
              {rejecting ? 'דוחה...' : 'דחה בקשה'}
            </button>
          </div>
        </>
      )}

      {showNewBorrowerModal && (
        <BorrowerFormModal
          prefill={{ ...splitName(request.nameAsEntered), phone: request.phoneAsEntered }}
          onClose={() => setShowNewBorrowerModal(false)}
          onSaved={handleNewBorrowerSaved}
        />
      )}
    </div>
  );
}
