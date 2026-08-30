import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listLoans, type Loan } from '../api';
import { LoanIcon } from '../icons';
import './BorrowersPage.css';
import './LoansPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

type Tab = 'all' | 'active' | 'late' | 'closed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'active', label: 'פעילות' },
  { key: 'late', label: 'באיחור' },
  { key: 'closed', label: 'נסגרו' },
];

function matchesTab(loan: Loan, tab: Tab): boolean {
  if (tab === 'all') return true;
  if (tab === 'closed') return loan.status === 'closed';
  if (tab === 'late') return loan.status === 'active' && loan.isLate;
  return loan.status === 'active' && !loan.isLate;
}

function loanStatusLabel(loan: Loan): { text: string; className: string } {
  if (loan.status === 'closed') return { text: 'סגורה', className: 'status-closed' };
  if (loan.isLate) return { text: 'באיחור', className: 'status-late' };
  return { text: 'פעילה', className: 'status-active' };
}

export function LoansPage() {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const navigate = useNavigate();

  useEffect(() => {
    listLoans().then(setLoans);
  }, []);

  const counts = useMemo(() => {
    if (!loans) return { all: 0, active: 0, late: 0, closed: 0 };
    return {
      all: loans.length,
      active: loans.filter((l) => matchesTab(l, 'active')).length,
      late: loans.filter((l) => matchesTab(l, 'late')).length,
      closed: loans.filter((l) => matchesTab(l, 'closed')).length,
    };
  }, [loans]);

  const shown = useMemo(() => {
    if (!loans) return [];
    const filtered = loans.filter((l) => matchesTab(l, tab));
    if (tab === 'closed') {
      return [...filtered].sort((a, b) => new Date(b.givenDate).getTime() - new Date(a.givenDate).getTime());
    }
    return [...filtered].sort((a, b) => {
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();
    });
  }, [loans, tab]);

  return (
    <div className="page page-loans">
      <h1 className="page-title-with-icon">
        <span className="page-header-icon"><LoanIcon size={26} /></span>
        הלוואות
      </h1>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {loans === null && <p>טוען...</p>}

      {loans !== null && shown.length === 0 && <p className="empty-state">אין הלוואות בקטגוריה הזו.</p>}

      {shown.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>לווה</th>
              <th>סכום</th>
              <th>נותר</th>
              <th>{tab === 'closed' ? 'ניתנה בתאריך' : 'תשלום הבא'}</th>
              {tab === 'all' && <th>סטטוס</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((loan) => {
              const status = loanStatusLabel(loan);
              return (
                <tr key={loan.id} onClick={() => navigate(`/loans/${loan.id}`)}>
                  <td>{loan.borrower.firstName} {loan.borrower.lastName}</td>
                  <td>{currency.format(loan.amount)}</td>
                  <td className="amount">{currency.format(loan.remaining)}</td>
                  <td>
                    {tab === 'closed'
                      ? dateFormat.format(new Date(loan.givenDate))
                      : loan.nextDueDate && dateFormat.format(new Date(loan.nextDueDate))}
                  </td>
                  {tab === 'all' && (
                    <td>
                      <span className={`status-badge ${status.className}`}>{status.text}</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
