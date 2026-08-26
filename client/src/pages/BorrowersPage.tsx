import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listBorrowers, type Borrower } from '../api';
import { BorrowerFormModal } from './BorrowerFormModal';
import './BorrowersPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function BorrowersPage() {
  const [borrowers, setBorrowers] = useState<Borrower[] | null>(null);
  const [search, setSearch] = useState('');
  const [sortLateFirst, setSortLateFirst] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const navigate = useNavigate();

  function refresh() {
    listBorrowers().then(setBorrowers);
  }

  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!borrowers) return [];
    const query = search.trim().toLowerCase();
    const matches = query
      ? borrowers.filter((b) => `${b.firstName} ${b.lastName} ${b.phone}`.toLowerCase().includes(query))
      : borrowers;

    if (!sortLateFirst) return matches;
    return [...matches].sort((a, b) => Number(b.isLate) - Number(a.isLate));
  }, [borrowers, search, sortLateFirst]);

  const lateCount = borrowers?.filter((b) => b.isLate).length ?? 0;

  function handleSaved() {
    refresh();
    setShowAddModal(false);
    setEditingBorrower(null);
  }

  return (
    <div>
      <div className="page-header">
        <h1>לווים</h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          הוסף לווה
        </button>
      </div>

      {borrowers && borrowers.length > 0 && (
        <p className="summary-line">
          {borrowers.length} לווים
          {lateCount > 0 && <span className="late-text">, {lateCount} באיחור</span>}
        </p>
      )}

      <input
        className="search-box"
        type="search"
        placeholder="חיפוש לפי שם או טלפון..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {borrowers === null && <p>טוען...</p>}

      {borrowers !== null && borrowers.length === 0 && <p className="empty-state">אין עדיין לווים. אפשר להתחיל בלחיצה על "הוסף לווה".</p>}

      {borrowers !== null && borrowers.length > 0 && filtered.length === 0 && (
        <p className="empty-state">לא נמצאו לווים התואמים לחיפוש.</p>
      )}

      {filtered.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>חוב כולל</th>
              <th>
                <button className="sort-header" onClick={() => setSortLateFirst((v) => !v)}>
                  סטטוס
                </button>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className={b.isLate ? 'row-late' : undefined} onClick={() => navigate(`/borrowers/${b.id}`)}>
                <td>{b.firstName} {b.lastName}</td>
                <td>
                  <a href={`tel:${b.phone}`} onClick={(e) => e.stopPropagation()}>
                    {b.phone}
                  </a>
                </td>
                <td className="amount">{currency.format(b.totalOwed)}</td>
                <td>
                  <span className={`status-badge ${b.isLate ? 'status-late' : 'status-ok'}`}>
                    {b.isLate ? 'באיחור' : 'לא באיחור'}
                  </span>
                </td>
                <td>
                  <button
                    className="edit-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBorrower(b);
                    }}
                  >
                    עריכה
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAddModal && <BorrowerFormModal onClose={() => setShowAddModal(false)} onSaved={handleSaved} />}
      {editingBorrower && (
        <BorrowerFormModal
          borrower={editingBorrower}
          onClose={() => setEditingBorrower(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
