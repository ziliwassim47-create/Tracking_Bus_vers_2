import React, { useState, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'success' && '✅ '}
            {t.type === 'error' && '❌ '}
            {t.type === 'warning' && '⚠️ '}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ─── Reusable CRUD Table ──────────────────────────────────────────────────────
export function CrudTable({ title, columns, data, loading, onAdd, onEdit, onDelete, searchKey, addLabel = '+ Ajouter' }) {
  const [search, setSearch] = useState('');

  const filtered = search
    ? data.filter(row => {
        const val = searchKey ? row[searchKey] : '';
        return val.toLowerCase().includes(search.toLowerCase());
      })
    : data;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {searchKey && (
            <div className="search-bar">
              <span className="search-icon">🔍</span>
              <input
                className="form-control"
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38 }}
              />
            </div>
          )}
          {onAdd && (
            <button className="btn btn-primary btn-sm" onClick={onAdd}>{addLabel}</button>
          )}
        </div>
      </div>

      <div className="table-wrapper">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <div className="empty-title">Aucune donnée</div>
            <div className="empty-desc">{search ? 'Aucun résultat trouvé' : 'Commencez par ajouter un élément'}</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(col => <th key={col.key}>{col.label}</th>)}
                {(onEdit || onDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id || row.ID || i}>
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {onEdit && (
                          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(row)}>✏️ Modifier</button>
                        )}
                        {onDelete && (
                          <button className="btn btn-danger btn-sm" onClick={() => onDelete(row)}>🗑️ Suppr.</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">⚠️ Confirmation</div>
          <button className="modal-close" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 15, color: 'var(--gray-700)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
          <button className="btn btn-danger" onClick={onConfirm}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}
