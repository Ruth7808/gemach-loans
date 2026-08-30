import { useEffect, useMemo, useState } from 'react';
import {
  listWithdrawalRequests,
  cancelWithdrawalRequest,
  type WithdrawalRequestWithDepositor,
} from '../api';
import { WithdrawalRequestsTable } from './WithdrawalRequestsTable';
import { WithdrawalPayModal } from './WithdrawalPayModal';
import { WithdrawalIcon } from '../icons';
import './BorrowersPage.css';
import './LoansPage.css';

type Tab = 'all' | 'open' | 'risk' | 'paid' | 'cancelled';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'open', label: 'פתוחות' },
  { key: 'risk', label: 'בסיכון' },
  { key: 'paid', label: 'שולמו' },
  { key: 'cancelled', label: 'בוטלו' },
];

function matchesTab(r: WithdrawalRequestWithDepositor, tab: Tab): boolean {
  const isOpenStatus = r.status === 'open' || r.status === 'partially_paid';
  if (tab === 'all') return true;
  if (tab === 'open') return isOpenStatus && !r.isAtRisk;
  if (tab === 'risk') return isOpenStatus && r.isAtRisk;
  if (tab === 'paid') return r.status === 'paid';
  return r.status === 'cancelled';
}

export function WithdrawalRequestsPage() {
  const [requests, setRequests] = useState<WithdrawalRequestWithDepositor[] | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [payingRequest, setPayingRequest] = useState<WithdrawalRequestWithDepositor | null>(null);

  function refresh() {
    listWithdrawalRequests().then(setRequests);
  }

  useEffect(refresh, []);

  const counts = useMemo(() => {
    if (!requests) return { all: 0, open: 0, risk: 0, paid: 0, cancelled: 0 };
    return {
      all: requests.length,
      open: requests.filter((r) => matchesTab(r, 'open')).length,
      risk: requests.filter((r) => matchesTab(r, 'risk')).length,
      paid: requests.filter((r) => matchesTab(r, 'paid')).length,
      cancelled: requests.filter((r) => matchesTab(r, 'cancelled')).length,
    };
  }, [requests]);

  const shown = useMemo(() => {
    if (!requests) return [];
    return [...requests.filter((r) => matchesTab(r, tab))].sort(
      (a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime(),
    );
  }, [requests, tab]);

  async function handleCancel(request: WithdrawalRequestWithDepositor) {
    await cancelWithdrawalRequest(request.id);
    refresh();
  }

  return (
    <div className="page page-withdrawal-requests">
      <h1 className="page-title-with-icon">
        <span className="page-header-icon"><WithdrawalIcon size={26} /></span>
        בקשות משיכה
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

      {requests === null && <p>טוען...</p>}

      {requests !== null && (
        <WithdrawalRequestsTable
          requests={shown}
          showDepositor
          onPay={setPayingRequest}
          onCancel={handleCancel}
        />
      )}

      {payingRequest && (
        <WithdrawalPayModal
          requestId={payingRequest.id}
          remaining={payingRequest.remaining}
          onClose={() => setPayingRequest(null)}
          onSaved={() => {
            refresh();
            setPayingRequest(null);
          }}
        />
      )}
    </div>
  );
}
