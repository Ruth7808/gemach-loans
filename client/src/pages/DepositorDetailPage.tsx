import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { getDepositor, cancelWithdrawalRequest, type DepositorDetail, type WithdrawalRequestWithDepositor } from '../api';
import { DepositorFormModal } from './DepositorFormModal';
import { DepositFormModal } from './DepositFormModal';
import { WithdrawalRequestFormModal } from './WithdrawalRequestFormModal';
import { WithdrawalPayModal } from './WithdrawalPayModal';
import { WithdrawalRequestsTable } from './WithdrawalRequestsTable';
import { ArrowIcon, DepositorIcon } from '../icons';
import './BorrowersPage.css';
import './BorrowerDetailPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

export function DepositorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [depositor, setDepositor] = useState<DepositorDetail | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddDepositModal, setShowAddDepositModal] = useState(false);
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [payingRequestId, setPayingRequestId] = useState<number | null>(null);

  function refresh() {
    getDepositor(Number(id)).then(setDepositor);
  }

  useEffect(refresh, [id]);

  if (!depositor) {
    return <p>טוען...</p>;
  }

  const requestsWithDepositor: WithdrawalRequestWithDepositor[] = depositor.withdrawalRequests.map((r) => ({
    ...r,
    depositor: { id: depositor.id, firstName: depositor.firstName, lastName: depositor.lastName },
  }));
  const payingRequest = requestsWithDepositor.find((r) => r.id === payingRequestId) ?? null;

  async function handleCancel(request: WithdrawalRequestWithDepositor) {
    await cancelWithdrawalRequest(request.id);
    refresh();
  }

  return (
    <div className="page page-depositors">
      <button className="back-link" onClick={() => navigate('/depositors')}>
        <ArrowIcon size={18} />
        חזרה לרשימת מפקידים
      </button>

      <div className="borrower-header">
        <div>
          <p className="card-eyebrow">
            <DepositorIcon size={16} />
            כרטיס מפקיד
          </p>
          <h1>{depositor.firstName} {depositor.lastName}</h1>
          <p className="borrower-contact">
            <a href={`tel:${depositor.phone}`}>{depositor.phone}</a>
            {depositor.email && <span> · {depositor.email}</span>}
            {depositor.address && <span> · {depositor.address}</span>}
          </p>
          {depositor.notes && <p className="borrower-notes">{depositor.notes}</p>}
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowEditModal(true)}>
            עריכה
          </button>
          <button className="btn-secondary" onClick={() => setShowAddRequestModal(true)}>
            בקשת משיכה חדשה
          </button>
          <button className="btn-primary" onClick={() => setShowAddDepositModal(true)}>
            רשום הפקדה
          </button>
        </div>
      </div>

      <div className="balance-tile">
        <span className="balance-label">סה״כ הפקדות</span>
        <span className="balance-amount">{currency.format(depositor.totalDeposits)}</span>
      </div>

      <h2 className="section-title">הפקדות</h2>

      {depositor.deposits.length === 0 && <p className="empty-state">אין עדיין הפקדות למפקיד זה.</p>}

      {depositor.deposits.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>תאריך</th>
              <th>סכום</th>
              <th>הערות</th>
            </tr>
          </thead>
          <tbody>
            {depositor.deposits.map((deposit) => (
              <tr key={deposit.id}>
                <td>{dateFormat.format(new Date(deposit.date))}</td>
                <td className="amount">{currency.format(deposit.amount)}</td>
                <td>{deposit.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="section-title">בקשות משיכה</h2>

      <WithdrawalRequestsTable
        requests={requestsWithDepositor}
        showDepositor={false}
        onPay={(r) => setPayingRequestId(r.id)}
        onCancel={handleCancel}
      />

      {showEditModal && (
        <DepositorFormModal
          depositor={depositor}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            refresh();
            setShowEditModal(false);
          }}
        />
      )}

      {showAddDepositModal && (
        <DepositFormModal
          depositorId={depositor.id}
          onClose={() => setShowAddDepositModal(false)}
          onSaved={() => {
            refresh();
            setShowAddDepositModal(false);
          }}
        />
      )}

      {showAddRequestModal && (
        <WithdrawalRequestFormModal
          depositorId={depositor.id}
          onClose={() => setShowAddRequestModal(false)}
          onSaved={() => {
            refresh();
            setShowAddRequestModal(false);
          }}
        />
      )}

      {payingRequest && (
        <WithdrawalPayModal
          requestId={payingRequest.id}
          remaining={payingRequest.remaining}
          onClose={() => setPayingRequestId(null)}
          onSaved={() => {
            refresh();
            setPayingRequestId(null);
          }}
        />
      )}
    </div>
  );
}
