import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getBorrower, type BorrowerDetail } from '../api';
import { BorrowerFormModal } from './BorrowerFormModal';
import { LoanFormModal } from './LoanFormModal';
import './BorrowersPage.css';
import './BorrowerDetailPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

export function BorrowerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [borrower, setBorrower] = useState<BorrowerDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);

  function refresh() {
    getBorrower(Number(id)).then(setBorrower);
  }

  useEffect(refresh, [id]);

  if (!borrower) {
    return <p>טוען...</p>;
  }

  const sortedLoans = [...borrower.loans].sort((a) => (a.status === 'active' ? -1 : 1));

  return (
    <div>
      <button className="back-link" onClick={() => navigate('/borrowers')}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        חזרה לרשימת לווים
      </button>

      <div className="borrower-header">
        <div>
          <h1>{borrower.firstName} {borrower.lastName}</h1>
          <p className="borrower-contact">
            <a href={`tel:${borrower.phone}`}>{borrower.phone}</a>
            {borrower.email && <span> · {borrower.email}</span>}
            {borrower.address && <span> · {borrower.address}</span>}
          </p>
          {borrower.notes && <p className="borrower-notes">{borrower.notes}</p>}
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowEditModal(true)}>
            עריכה
          </button>
          <button className="btn-primary" onClick={() => setShowAddLoanModal(true)}>
            הוסף הלוואה
          </button>
        </div>
      </div>

      <div className={`balance-tile ${borrower.isLate ? 'balance-late' : ''}`}>
        <span className="balance-label">יתרה כוללת</span>
        <span className="balance-amount">{currency.format(borrower.totalOwed)}</span>
        {borrower.isLate && <span className="balance-flag">יש איחור בתשלומים</span>}
      </div>

      <h2 className="section-title">הלוואות</h2>

      {sortedLoans.length === 0 && <p className="empty-state">אין עדיין הלוואות ללווה זה.</p>}

      {sortedLoans.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>סכום</th>
              <th>ניתנה בתאריך</th>
              <th>נותר</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {sortedLoans.map((loan) => (
              <tr key={loan.id} onClick={() => navigate(`/loans/${loan.id}`)}>
                <td>{currency.format(loan.amount)}</td>
                <td>{dateFormat.format(new Date(loan.givenDate))}</td>
                <td className="amount">{currency.format(loan.remaining)}</td>
                <td>
                  <span className={`status-badge ${loan.status === 'active' ? 'status-active' : 'status-closed'}`}>
                    {loan.status === 'active' ? 'פעילה' : 'סגורה'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showEditModal && (
        <BorrowerFormModal
          borrower={borrower}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            refresh();
            setShowEditModal(false);
          }}
        />
      )}

      {showAddLoanModal && (
        <LoanFormModal
          borrowerId={borrower.id}
          onClose={() => setShowAddLoanModal(false)}
          onSaved={() => {
            refresh();
            setShowAddLoanModal(false);
          }}
        />
      )}
    </div>
  );
}
