import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { listDepositors, type Depositor } from '../api';
import { DepositorFormModal } from './DepositorFormModal';
import { DepositorIcon } from '../icons';
import './BorrowersPage.css';

const currency = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' });

export function DepositorsPage() {
  const [depositors, setDepositors] = useState<Depositor[] | null>(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDepositor, setEditingDepositor] = useState<Depositor | null>(null);
  const navigate = useNavigate();

  function refresh() {
    listDepositors().then(setDepositors);
  }

  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!depositors) return [];
    const query = search.trim().toLowerCase();
    if (!query) return depositors;
    return depositors.filter((d) => `${d.firstName} ${d.lastName} ${d.phone}`.toLowerCase().includes(query));
  }, [depositors, search]);

  function handleSaved() {
    refresh();
    setShowAddModal(false);
    setEditingDepositor(null);
  }

  return (
    <div className="page page-depositors">
      <div className="page-header">
        <h1>
          <span className="page-header-icon"><DepositorIcon size={26} /></span>
          מפקידים
        </h1>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          הוסף מפקיד
        </button>
      </div>

      {depositors && depositors.length > 0 && <p className="summary-line">{depositors.length} מפקידים</p>}

      <input
        className="search-box"
        type="search"
        placeholder="חיפוש לפי שם או טלפון..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {depositors === null && <p>טוען...</p>}

      {depositors !== null && depositors.length === 0 && (
        <p className="empty-state">אין עדיין מפקידים. אפשר להתחיל בלחיצה על "הוסף מפקיד".</p>
      )}

      {depositors !== null && depositors.length > 0 && filtered.length === 0 && (
        <p className="empty-state">לא נמצאו מפקידים התואמים לחיפוש.</p>
      )}

      {filtered.length > 0 && (
        <table className="borrowers-table">
          <thead>
            <tr>
              <th>שם</th>
              <th>טלפון</th>
              <th>סה״כ הפקדות</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} onClick={() => navigate(`/depositors/${d.id}`)}>
                <td>{d.firstName} {d.lastName}</td>
                <td>
                  <a href={`tel:${d.phone}`} onClick={(e) => e.stopPropagation()}>
                    {d.phone}
                  </a>
                </td>
                <td className="amount">{currency.format(d.totalDeposits)}</td>
                <td>
                  <button
                    className="edit-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDepositor(d);
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

      {showAddModal && <DepositorFormModal onClose={() => setShowAddModal(false)} onSaved={handleSaved} />}
      {editingDepositor && (
        <DepositorFormModal
          depositor={editingDepositor}
          onClose={() => setEditingDepositor(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
