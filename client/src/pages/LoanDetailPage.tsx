import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { getLoan, type LoanDetail } from '../api';
import { PaymentFormModal } from './PaymentFormModal';
import './BorrowersPage.css';
import './BorrowerDetailPage.css';
import './LoanDetailPage.css';

const EPSILON = 1e-6;
const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

function installmentState(installment: LoanDetail['installments'][number], now: Date): 'paid' | 'late' | 'upcoming' {
  if (installment.paid >= installment.amount - EPSILON) return 'paid';
  if (new Date(installment.dueDate) < now) return 'late';
  return 'upcoming';
}

const stateLabels: Record<string, string> = {
  paid: 'שולם',
  late: 'באיחור',
  upcoming: 'עתידי',
};

export function LoanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  function refresh() {
    getLoan(Number(id)).then(setLoan);
  }

  useEffect(refresh, [id]);

  if (!loan) {
    return <p>טוען...</p>;
  }

  const now = new Date();
  const paidSoFar = loan.amount - loan.remaining;
  const sortedPayments = [...loan.payments].sort(
    (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
  );

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/loans')}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        חזרה לרשימת הלוואות
      </button>

      <div className="borrower-header">
        <div>
          <h1>
            הלוואה ל<Link to={`/borrowers/${loan.borrower.id}`}>{loan.borrower.firstName} {loan.borrower.lastName}</Link>
          </h1>
        </div>
        <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
          רשום תשלום
        </button>
      </div>

      <div className={`stats-row ${loan.isLate ? 'stats-late' : ''}`}>
        <div className="stat-box">
          <span className="stat-label">סכום ההלוואה</span>
          <span className="stat-value">{currency.format(loan.amount)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">שולם עד כה</span>
          <span className="stat-value">{currency.format(paidSoFar)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">נותר</span>
          <span className="stat-value">{currency.format(loan.remaining)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">תשלום הבא</span>
          <span className="stat-value">{loan.nextDueDate ? dateFormat.format(new Date(loan.nextDueDate)) : '—'}</span>
        </div>
      </div>

      {loan.isLate && <p className="late-banner">יש איחור בתשלומים של הלוואה זו</p>}

      <h2 className="section-title">לוח תשלומים</h2>
      <table className="borrowers-table">
        <thead>
          <tr>
            <th>מספר</th>
            <th>תאריך פירעון</th>
            <th>סכום</th>
            <th>שולם</th>
            <th>מצב</th>
          </tr>
        </thead>
        <tbody>
          {loan.installments.map((installment) => {
            const state = installmentState(installment, now);
            return (
              <tr key={installment.id} className={`installment-row installment-${state}`}>
                <td>{installment.number}</td>
                <td>{dateFormat.format(new Date(installment.dueDate))}</td>
                <td>{currency.format(installment.amount)}</td>
                <td>{currency.format(installment.paid)}</td>
                <td>
                  <span className={`status-badge status-${state}`}>{stateLabels[state]}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="section-title">היסטוריית תשלומים</h2>
      {sortedPayments.length === 0 && <p className="empty-state">עוד לא נרשמו תשלומים להלוואה זו.</p>}
      {sortedPayments.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>שולם</th>
              <th>הוקצה</th>
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((payment) => {
              const allocated = payment.allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
              const unallocated = payment.amount - allocated;
              return (
                <tr key={payment.id}>
                  <td>{dateFormat.format(new Date(payment.paymentDate))}</td>
                  <td>{currency.format(payment.amount)}</td>
                  <td>
                    {currency.format(allocated)}
                    {unallocated > EPSILON && (
                      <span className="unallocated-badge">{currency.format(unallocated)} לא הוקצו</span>
                    )}
                  </td>
                  <td>{payment.notes ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showPaymentModal && (
        <PaymentFormModal
          loanId={loan.id}
          remaining={loan.remaining}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            refresh();
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}
