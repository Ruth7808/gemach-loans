import type { WithdrawalRequestWithDepositor } from '../api';

interface Props {
  requests: WithdrawalRequestWithDepositor[];
  showDepositor: boolean;
  onPay: (request: WithdrawalRequestWithDepositor) => void;
  onCancel: (request: WithdrawalRequestWithDepositor) => void;
}

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

function statusLabel(r: WithdrawalRequestWithDepositor): { text: string; className: string } {
  if (r.status === 'cancelled') return { text: 'בוטלה', className: 'status-closed' };
  if (r.status === 'paid') return { text: 'שולמה', className: 'status-active' };
  if (r.isAtRisk) return { text: 'בסיכון', className: 'status-risk' };
  if (r.isReady) return { text: 'מוכנה לתשלום', className: 'status-active' };
  if (r.status === 'partially_paid') return { text: 'שולמה חלקית', className: 'status-upcoming' };
  return { text: 'פתוחה', className: 'status-upcoming' };
}

export function WithdrawalRequestsTable({ requests, showDepositor, onPay, onCancel }: Props) {
  if (requests.length === 0) {
    return <p className="empty-state">אין בקשות משיכה להצגה.</p>;
  }

  return (
    <table className="borrowers-table">
      <thead>
        <tr>
          {showDepositor && <th>מפקיד</th>}
          <th>סכום</th>
          <th>נותר</th>
          <th>תאריך יעד</th>
          <th>סטטוס</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {requests.map((r) => {
          const status = statusLabel(r);
          const canAct = r.status === 'open' || r.status === 'partially_paid';
          return (
            <tr key={r.id}>
              {showDepositor && (
                <td>{r.depositor.firstName} {r.depositor.lastName}</td>
              )}
              <td>{currency.format(r.amount)}</td>
              <td className="amount">{currency.format(r.remaining)}</td>
              <td>{dateFormat.format(new Date(r.targetDate))}</td>
              <td>
                <span className={`status-badge ${status.className}`}>{status.text}</span>
                {r.isAtRisk && <span className="shortfall-note">חוסר: {currency.format(r.shortfall)}</span>}
              </td>
              <td>
                {canAct && (
                  <div className="row-actions">
                    <button className="edit-link" onClick={() => onPay(r)}>
                      תשלום
                    </button>
                    <button className="edit-link edit-link-danger" onClick={() => onCancel(r)}>
                      ביטול
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
