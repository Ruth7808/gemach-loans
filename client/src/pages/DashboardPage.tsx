import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getDashboard, listBorrowers, type DashboardData, type Borrower } from '../api';
import { MonthlyBarChart } from './MonthlyBarChart';
import { OpeningBalanceModal } from './OpeningBalanceModal';
import './BorrowersPage.css';
import './BorrowerDetailPage.css';
import './LoanDetailPage.css';
import './DashboardPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);

  function refresh() {
    getDashboard().then(setData);
    listBorrowers().then(setBorrowers);
  }

  useEffect(refresh, []);

  if (!data || !borrowers) {
    return <p>טוען...</p>;
  }

  const lateBorrowers = [...borrowers].filter((b) => b.isLate).sort((a, b) => b.totalOwed - a.totalOwed);
  const hasAlerts =
    lateBorrowers.length > 0 ||
    data.dueToday.length > 0 ||
    data.atRiskWithdrawals.length > 0 ||
    data.pendingLoanRequests.length > 0;
  const extraPanels = (data.atRiskWithdrawals.length > 0 ? 1 : 0) + (data.pendingLoanRequests.length > 0 ? 1 : 0);
  const alertsGridClass = extraPanels === 2 ? 'alerts-grid-4' : extraPanels === 1 ? 'alerts-grid-3' : '';

  return (
    <div className="page page-dashboard">
      <h1>דשבורד</h1>

      <div className="stats-row">
        <div className="stat-box">
          <div className="stat-box-header">
            <span className="stat-label">כסף פנוי</span>
            <button className="edit-link" onClick={() => setShowBalanceModal(true)}>
              עריכה
            </button>
          </div>
          <span className="stat-value">{currency.format(data.availableFunds)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">אמור לחזור החודש</span>
          <span className="stat-value">{currency.format(data.expectedThisMonth)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">לווים באיחור</span>
          <span className="stat-value">{lateBorrowers.length}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">תשלומים היום</span>
          <span className="stat-value">{data.dueToday.length}</span>
        </div>
      </div>

      <div className="stats-row stats-row-secondary">
        <div className="stat-box">
          <span className="stat-label">יתרת מפקידים</span>
          <span className="stat-value">{currency.format(data.depositorsBalance)}</span>
        </div>
        <div className="stat-box">
          <span className="stat-label">בקשות משיכה פתוחות</span>
          <span className="stat-value">
            {data.openWithdrawalRequestsCount} <span className="stat-value-sub">({currency.format(data.openWithdrawalRequestsTotal)})</span>
          </span>
        </div>
      </div>

      <div className="charts-row">
        <MonthlyBarChart title="גבייה חודשית — 6 חודשים אחרונים" points={data.monthlyCollected} variant="collected" />
        <MonthlyBarChart title="תחזית — 6 חודשים קרובים" points={data.monthlyForecast} variant="forecast" />
      </div>

      <h2 className="section-title">פעולות נדרשות</h2>

      {!hasAlerts && <p className="empty-state">אין פעולות דחופות כרגע.</p>}

      {hasAlerts && (
        <div className={`alerts-grid ${alertsGridClass}`}>
          <div className="alert-panel">
            <p className="alert-panel-title">לווים באיחור</p>
            {lateBorrowers.length === 0 && <p className="alert-empty">אין לווים באיחור.</p>}
            {lateBorrowers.map((b) => (
              <button key={b.id} className="alert-row" onClick={() => navigate(`/borrowers/${b.id}`)}>
                <span>{b.firstName} {b.lastName}</span>
                <span className="alert-amount">{currency.format(b.totalOwed)}</span>
              </button>
            ))}
          </div>

          <div className="alert-panel">
            <p className="alert-panel-title">תשלומים שמגיעים היום</p>
            {data.dueToday.length === 0 && <p className="alert-empty">אין תשלומים שמגיעים היום.</p>}
            {data.dueToday.map((item) => (
              <button key={item.installmentId} className="alert-row" onClick={() => navigate(`/loans/${item.loanId}`)}>
                <span>{item.borrowerName}</span>
                <span className="alert-amount">{currency.format(item.amount)}</span>
              </button>
            ))}
          </div>

          {data.atRiskWithdrawals.length > 0 && (
            <div className="alert-panel alert-panel-risk">
              <p className="alert-panel-title">בקשות משיכה בסיכון</p>
              {data.atRiskWithdrawals.map((item) => (
                <button
                  key={item.requestId}
                  className="alert-row alert-row-risk"
                  onClick={() => navigate(`/depositors/${item.depositorId}`)}
                >
                  <span>{item.depositorName}</span>
                  <span className="alert-amount alert-amount-risk">חוסר {currency.format(item.shortfall)}</span>
                </button>
              ))}
            </div>
          )}

          {data.pendingLoanRequests.length > 0 && (
            <div className="alert-panel">
              <p className="alert-panel-title">בקשות הלוואה ממתינות</p>
              {data.pendingLoanRequests.map((item) => (
                <button
                  key={item.requestId}
                  className="alert-row"
                  onClick={() => navigate(`/loan-requests/${item.requestId}`)}
                >
                  <span>{item.name}</span>
                  <span className="alert-amount">{currency.format(item.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showBalanceModal && (
        <OpeningBalanceModal
          currentValue={data.openingBalance}
          onClose={() => setShowBalanceModal(false)}
          onSaved={() => {
            refresh();
            setShowBalanceModal(false);
          }}
        />
      )}
    </div>
  );
}
