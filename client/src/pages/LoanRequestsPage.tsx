import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listLoanRequests, type LoanRequest } from '../api';
import { LoanRequestFormModal } from './LoanRequestFormModal';
import { LoanRequestIcon } from '../icons';
import './BorrowersPage.css';
import './LoansPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });
const dateFormat = new Intl.DateTimeFormat('he-IL');

type Tab = 'all' | 'pending' | 'rejected' | 'converted';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'pending', label: 'ממתינות' },
  { key: 'rejected', label: 'נדחו' },
  { key: 'converted', label: 'הפכו להלוואה' },
];

function matchesTab(r: LoanRequest, tab: Tab): boolean {
  if (tab === 'all') return true;
  return r.status === tab;
}

function statusLabel(r: LoanRequest): { text: string; className: string } {
  if (r.status === 'converted') return { text: 'הפכה להלוואה', className: 'status-active' };
  if (r.status === 'rejected') return { text: 'נדחתה', className: 'status-closed' };
  return { text: 'ממתינה', className: 'status-upcoming' };
}

function sourceLabel(source: string): string {
  return source === 'fillout' ? 'Fillout' : 'ידני';
}

export function LoanRequestsPage() {
  const [requests, setRequests] = useState<LoanRequest[] | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();

  function refresh() {
    listLoanRequests().then(setRequests);
  }

  useEffect(refresh, []);

  const counts = useMemo(() => {
    if (!requests) return { all: 0, pending: 0, rejected: 0, converted: 0 };
    return {
      all: requests.length,
      pending: requests.filter((r) => matchesTab(r, 'pending')).length,
      rejected: requests.filter((r) => matchesTab(r, 'rejected')).length,
      converted: requests.filter((r) => matchesTab(r, 'converted')).length,
    };
  }, [requests]);

  const shown = useMemo(() => {
    if (!requests) return [];
    return [...requests.filter((r) => matchesTab(r, tab))].sort(
      (a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime(),
    );
  }, [requests, tab]);

  return (
    <div className="page page-loan-requests">
      <div className="page-header">
        <h1 className="page-title-with-icon">
          <span className="page-header-icon"><LoanRequestIcon size={26} /></span>
          בקשות הלוואה
        </h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          בקשה חדשה
        </button>
      </div>

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

      {requests === null && <p>טוען...</p>}

      {requests !== null && shown.length === 0 && <p className="empty-state">אין בקשות הלוואה בקטגוריה הזו.</p>}

      {shown.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>סכום מבוקש</th>
              <th>תאריך הגשה</th>
              <th>מקור</th>
              <th>סטטוס</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const status = statusLabel(r);
              return (
                <tr key={r.id} onClick={() => navigate(`/loan-requests/${r.id}`)}>
                  <td>{r.nameAsEntered}</td>
                  <td>{r.phoneAsEntered}</td>
                  <td>{currency.format(r.amount)}</td>
                  <td>{dateFormat.format(new Date(r.requestDate))}</td>
                  <td>{sourceLabel(r.source)}</td>
                  <td>
                    <span className={`status-badge ${status.className}`}>{status.text}</span>
                    {r.duplicatePhone && <span className="shortfall-note">בקשה נוספת פתוחה מאותו טלפון</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showAddModal && (
        <LoanRequestFormModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            refresh();
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}
