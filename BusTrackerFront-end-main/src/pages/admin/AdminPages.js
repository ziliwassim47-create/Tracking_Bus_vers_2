import React, { useState, useEffect } from 'react';
import { apiFetch, avatarColor, initials } from '../../utils';
import { CrudTable, ConfirmDialog, useToast } from '../../components/Shared';

function Modal({ title, fields, data, onSave, onClose, extraData = {} }) {
  const [form, setForm] = useState(data || {});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              {f.type === 'select' ? (
                <select
                  className="form-control"
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                >
                  <option value="">— Choisir —</option>
                  {(f.options || extraData[f.optionsKey] || []).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className="form-control"
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              ) : (
                <input
                  className="form-control"
                  type={f.type || 'text'}
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                />
              )}
            </div>
          ))}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUS
// ══════════════════════════════════════════════════════════════════════════════
export function GestionBus() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    apiFetch('/admin/bus').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (form.id) {
        await apiFetch(`/admin/bus/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
        addToast('Bus mis à jour');
      } else {
        await apiFetch('/admin/bus', { method: 'POST', body: JSON.stringify(form) });
        addToast('Bus créé');
      }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleDelete(row) {
    try {
      await apiFetch(`/admin/bus/${row.id}`, { method: 'DELETE' });
      addToast('Bus supprimé'); setConfirm(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  const BUS_FIELDS = [
    { key: 'matricule', label: '🔢 Matricule', placeholder: 'BUS-001-TN' },
    { key: 'capacite', label: '👦 Capacité', type: 'number', placeholder: '30' },
    { key: 'statut', label: '📊 Statut', type: 'select', options: [
      { value: 'actif', label: '✅ Actif' },
      { value: 'inactif', label: '⛔ Inactif' },
      { value: 'en_trajet', label: '🔄 En trajet' },
    ]},
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🚌 Gestion des Bus</h1>
          <p className="page-subtitle">Gérez la flotte de bus scolaires</p>
        </div>
      </div>

      <CrudTable
        title="Liste des bus"
        columns={[
          { key: 'id', label: '#' },
          { key: 'matricule', label: 'Matricule', render: v => <strong>{v}</strong> },
          { key: 'capacite', label: 'Capacité', render: v => `${v} places` },
          { key: 'statut', label: 'Statut', render: v => (
            v === 'actif'     ? <span className="badge badge-success">✅ Actif</span> :
            v === 'en_trajet' ? <span className="badge badge-warning">🔄 En trajet</span> :
                                <span className="badge badge-neutral">⛔ Inactif</span>
          )},
        ]}
        data={data} loading={loading}
        onAdd={() => setModal({ type: 'add', data: { statut: 'actif', capacite: 30 } })}
        onEdit={row => setModal({ type: 'edit', data: row })}
        onDelete={row => setConfirm(row)}
        searchKey="matricule"
      />

      {modal && (
        <Modal
          title={modal.type === 'add' ? '➕ Nouveau Bus' : '✏️ Modifier Bus'}
          fields={BUS_FIELDS}
          data={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          message={`Supprimer le bus "${confirm.matricule}" ?`}
          onConfirm={() => handleDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSISTANTES
// ══════════════════════════════════════════════════════════════════════════════
export function GestionAssistantes() {
  const [data, setData] = useState([]);
  const [bus, setBus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch('/admin/assistantes'), apiFetch('/admin/bus')])
      .then(([a, b]) => { setData(a); setBus(b); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const busOptions = bus.map(b => ({ value: b.id, label: `${b.matricule}` }));

  async function handleSave(form) {
    try {
      if (form.id) {
        await apiFetch(`/admin/assistantes/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
        addToast('Assistante mise à jour');
      } else {
        await apiFetch('/admin/assistantes', { method: 'POST', body: JSON.stringify(form) });
        addToast('Assistante créée');
      }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleDelete(row) {
    try {
      await apiFetch(`/admin/assistantes/${row.id}`, { method: 'DELETE' });
      addToast('Assistante supprimée'); setConfirm(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  const FIELDS = [
    { key: 'nom', label: '👤 Nom complet', placeholder: 'Fatma Ben Ali' },
    { key: 'tlf', label: '📱 Téléphone', placeholder: '20111111' },
    { key: 'email', label: '📧 Email', type: 'email', placeholder: 'fatma@educanet.tn' },
    { key: 'id_bus', label: '🚌 Bus assigné', type: 'select', options: busOptions },
    { key: 'statut', label: '📊 Statut', type: 'select', options: [
      { value: 'actif', label: '✅ Actif' },
      { value: 'inactif', label: '⛔ Inactif' },
    ]},
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">👩‍💼 Assistantes</h1>
          <p className="page-subtitle">Gestion des assistantes et de leurs affectations</p>
        </div>
      </div>
      <CrudTable
        title="Liste des assistantes"
        columns={[
          { key: 'nom', label: 'Nom', render: (v, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar avatar-sm" style={{ background: avatarColor(v) }}>{initials(v)}</div>
              <span>{v}</span>
            </div>
          )},
          { key: 'tlf', label: 'Téléphone' },
          { key: 'email', label: 'Email' },
          { key: 'bus_matricule', label: 'Bus', render: v => v ? <span className="badge badge-info">🚌 {v}</span> : '—' },
          { key: 'statut', label: 'Statut', render: v => v === 'actif' ? <span className="badge badge-success">✅ Actif</span> : <span className="badge badge-neutral">⛔ Inactif</span> },
        ]}
        data={data} loading={loading}
        onAdd={() => setModal({ type: 'add', data: { statut: 'actif' } })}
        onEdit={row => setModal({ type: 'edit', data: row })}
        onDelete={row => setConfirm(row)}
        searchKey="nom"
      />
      {modal && <Modal title={modal.type === 'add' ? '➕ Nouvelle Assistante' : '✏️ Modifier Assistante'} fields={FIELDS} data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog message={`Supprimer "${confirm.nom}" ?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PARENTS
// ══════════════════════════════════════════════════════════════════════════════
export function GestionParents() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    apiFetch('/admin/parents').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (form.id) {
        await apiFetch(`/admin/parents/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
        addToast('Parent mis à jour');
      } else {
        await apiFetch('/admin/parents', { method: 'POST', body: JSON.stringify(form) });
        addToast('Parent créé');
      }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleDelete(row) {
    try {
      await apiFetch(`/admin/parents/${row.id}`, { method: 'DELETE' });
      addToast('Parent supprimé'); setConfirm(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  const FIELDS = [
    { key: 'nom', label: '👤 Nom complet', placeholder: 'Mohamed Ben Ali' },
    { key: 'tlf', label: '📱 Téléphone', placeholder: '20444444' },
    { key: 'email', label: '📧 Email', type: 'email', placeholder: 'parent@gmail.com' },
    { key: 'adresse', label: '📍 Adresse', placeholder: 'Rue 123, Tunis' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">👨‍👩‍👦 Parents</h1><p className="page-subtitle">Gestion des comptes parents</p></div>
      </div>
      <CrudTable
        title="Liste des parents"
        columns={[
          { key: 'nom', label: 'Nom', render: (v) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar avatar-sm" style={{ background: avatarColor(v) }}>{initials(v)}</div>
              <span>{v}</span>
            </div>
          )},
          { key: 'tlf', label: 'Téléphone' },
          { key: 'email', label: 'Email' },
          { key: 'nb_enfants', label: 'Enfants', render: v => <span className="badge badge-violet">👦 {v || 0}</span> },
        ]}
        data={data} loading={loading}
        onAdd={() => setModal({ type: 'add', data: {} })}
        onEdit={row => setModal({ type: 'edit', data: row })}
        onDelete={row => setConfirm(row)}
        searchKey="nom"
      />
      {modal && <Modal title={modal.type === 'add' ? '➕ Nouveau Parent' : '✏️ Modifier Parent'} fields={FIELDS} data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog message={`Supprimer "${confirm.nom}" ?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ENFANTS
// ══════════════════════════════════════════════════════════════════════════════
export function GestionEnfants() {
  const [data, setData] = useState([]);
  const [bus, setBus] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([apiFetch('/admin/enfants'), apiFetch('/admin/bus'), apiFetch('/admin/parents')])
      .then(([e, b, p]) => { setData(e); setBus(b); setParents(p); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (form.ID) {
        await apiFetch(`/admin/enfants/${form.ID}`, { method: 'PUT', body: JSON.stringify(form) });
        addToast('Enfant mis à jour');
      } else {
        await apiFetch('/admin/enfants', { method: 'POST', body: JSON.stringify(form) });
        addToast('Enfant créé');
      }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleDelete(row) {
    try {
      await apiFetch(`/admin/enfants/${row.ID}`, { method: 'DELETE' });
      addToast('Enfant supprimé'); setConfirm(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  const FIELDS = [
    { key: 'NOM', label: '👦 Nom de l\'enfant', placeholder: 'Ahmed Ben Ali' },
    { key: 'CLASSE', label: '📚 Classe', placeholder: 'Papillon' },
    { key: 'NIVEAU', label: '🎓 Niveau', placeholder: '2eme' },
    { key: 'TLF', label: '📱 Téléphone parent', placeholder: '20111222' },
    { key: 'ID_BUS', label: '🚌 Bus assigné', type: 'select', options: bus.map(b => ({ value: b.id, label: b.matricule })) },
    { key: 'id_parent', label: '👨‍👩‍👦 Parent', type: 'select', options: parents.map(p => ({ value: p.id, label: p.nom })) },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">👦 Enfants (Élèves)</h1><p className="page-subtitle">Gestion des élèves inscrits</p></div>
      </div>
      <CrudTable
        title="Liste des élèves"
        columns={[
          { key: 'NOM', label: 'Nom' },
          { key: 'CLASSE', label: 'Classe', render: v => v ? <span className="badge badge-violet">{v}</span> : '—' },
          { key: 'NIVEAU', label: 'Niveau' },
          { key: 'bus_matricule', label: 'Bus', render: v => v ? <span className="badge badge-info">🚌 {v}</span> : <span className="badge badge-neutral">Non affecté</span> },
          { key: 'parent_nom', label: 'Parent', render: v => v || '—' },
          { key: 'presence', label: 'Présence', render: v => v ? <span className="badge badge-success">✅ Présent</span> : <span className="badge badge-neutral">Absent</span> },
        ]}
        data={data} loading={loading}
        onAdd={() => setModal({ type: 'add', data: {} })}
        onEdit={row => setModal({ type: 'edit', data: row })}
        onDelete={row => setConfirm(row)}
        searchKey="NOM"
      />
      {modal && <Modal title={modal.type === 'add' ? '➕ Nouvel Élève' : '✏️ Modifier Élève'} fields={FIELDS} data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog message={`Supprimer "${confirm.NOM}" ?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMINS
// ══════════════════════════════════════════════════════════════════════════════
export function GestionAdmins() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    apiFetch('/admin/admins').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    try {
      if (form.id) {
        await apiFetch(`/admin/admins/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
        addToast('Admin mis à jour');
      } else {
        await apiFetch('/admin/admins', { method: 'POST', body: JSON.stringify(form) });
        addToast('Admin créé');
      }
      setModal(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  async function handleDelete(row) {
    try {
      await apiFetch(`/admin/admins/${row.id}`, { method: 'DELETE' });
      addToast('Admin supprimé'); setConfirm(null); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  const FIELDS = [
    { key: 'nom', label: '👤 Nom', placeholder: 'Directeur Educanet' },
    { key: 'email', label: '📧 Email', type: 'email', placeholder: 'admin@educanet.tn' },
    { key: 'tlf', label: '📱 Téléphone', placeholder: '20000001' },
  ];

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">🛡️ Administrateurs</h1><p className="page-subtitle">Comptes avec accès complet</p></div>
      </div>
      <CrudTable
        title="Liste des administrateurs"
        columns={[
          { key: 'nom', label: 'Nom', render: v => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,var(--violet-500),var(--violet-600))' }}>{initials(v)}</div>
              <span>{v}</span>
            </div>
          )},
          { key: 'email', label: 'Email' },
          { key: 'tlf', label: 'Téléphone' },
        ]}
        data={data} loading={loading}
        onAdd={() => setModal({ type: 'add', data: {} })}
        onEdit={row => setModal({ type: 'edit', data: row })}
        onDelete={row => setConfirm(row)}
        searchKey="nom"
      />
      {modal && <Modal title={modal.type === 'add' ? '➕ Nouvel Admin' : '✏️ Modifier Admin'} fields={FIELDS} data={modal.data} onSave={handleSave} onClose={() => setModal(null)} />}
      {confirm && <ConfirmDialog message={`Supprimer "${confirm.nom}" ?`} onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRAJETS (read-only admin view)
// ══════════════════════════════════════════════════════════════════════════════
export function GestionTrajets() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/admin/trajets').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">🗺️ Trajets</h1><p className="page-subtitle">Historique de tous les trajets effectués</p></div>
      </div>
      <CrudTable
        title="Historique des trajets"
        columns={[
          { key: 'id', label: '#' },
          { key: 'bus_matricule', label: 'Bus', render: v => v ? <span className="badge badge-info">🚌 {v}</span> : '—' },
          { key: 'assistante_nom', label: 'Assistante' },
          { key: 'date_debut', label: 'Départ', render: v => v ? new Date(v).toLocaleString('fr-TN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—' },
          { key: 'date_fin', label: 'Fin', render: v => v ? new Date(v).toLocaleString('fr-TN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—' },
          { key: 'nb_eleves_presents', label: 'Élèves', render: v => <strong>{v}</strong> },
          { key: 'statut', label: 'Statut', render: v => (
            v === 'en_cours' ? <span className="badge badge-warning">🔄 En cours</span> :
            v === 'termine'  ? <span className="badge badge-success">✅ Terminé</span> :
                               <span className="badge badge-danger">❌ Annulé</span>
          )},
        ]}
        data={data} loading={loading}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS (admin)
// ══════════════════════════════════════════════════════════════════════════════
export function AdminNotifications() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const ICONS = {
    alerte: '⚠️', incident: '🚨', arrivee: '✅', depart: '🚌', probleme: '🔧', info: 'ℹ️',
  };
  const COLORS = {
    alerte: '#fffbeb', incident: '#fee2e2', arrivee: '#dcfce7', depart: '#f0fdfa', probleme: '#ede9fe', info: '#f0f9ff',
  };

  const load = () => {
    setLoading(true);
    apiFetch('/admin/notifications').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function markRead(id) {
    try {
      await apiFetch(`/admin/notifications/${id}/lu`, { method: 'PUT' });
      setData(prev => prev.map(n => n.id === id ? { ...n, lu: 1 } : n));
    } catch (e) { addToast(e.message, 'error'); }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">{data.filter(n => !n.lu).length} non lues</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Actualiser</button>
      </div>
      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : data.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🔔</div><div className="empty-title">Aucune notification</div></div>
      ) : (
        <div>
          {data.map(n => (
            <div
              key={n.id}
              className={`notif-item ${!n.lu ? 'unread' : ''}`}
              onClick={() => !n.lu && markRead(n.id)}
            >
              <div className="notif-icon" style={{ background: COLORS[n.type] || '#f8fafc' }}>
                {ICONS[n.type] || 'ℹ️'}
              </div>
              <div style={{ flex: 1 }}>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{new Date(n.created_at).toLocaleString('fr-TN')}</div>
              </div>
              {!n.lu && <div className="notif-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROBLÈMES (admin)
// ══════════════════════════════════════════════════════════════════════════════
export function AdminProblemes() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const load = () => {
    setLoading(true);
    apiFetch('/admin/problemes').then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function updateStatut(id, statut) {
    try {
      await apiFetch(`/admin/problemes/${id}/statut`, { method: 'PUT', body: JSON.stringify({ statut }) });
      addToast('Statut mis à jour'); load();
    } catch (e) { addToast(e.message, 'error'); }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div><h1 className="page-title">⚠️ Problèmes Signalés</h1><p className="page-subtitle">Incidents déclarés par les assistantes</p></div>
        <button className="btn btn-ghost btn-sm" onClick={load}>🔄 Actualiser</button>
      </div>
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : data.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">✅</div><div className="empty-title">Aucun problème signalé</div></div>
          ) : (
            <table className="data-table">
              <thead><tr><th>#</th><th>Catégorie</th><th>Description</th><th>Déclaré par</th><th>Date</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>
                {data.map(p => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td><span className="badge badge-warning">{p.categorie}</span></td>
                    <td style={{ maxWidth: 280 }}><p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{p.description}</p></td>
                    <td>{p.role_declarant}</td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>{new Date(p.created_at).toLocaleString('fr-TN')}</td>
                    <td>
                      {p.statut === 'nouveau' && <span className="badge badge-danger">🆕 Nouveau</span>}
                      {p.statut === 'en_traitement' && <span className="badge badge-warning">🔄 En traitement</span>}
                      {p.statut === 'resolu' && <span className="badge badge-success">✅ Résolu</span>}
                    </td>
                    <td>
                      <select
                        className="form-control" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}
                        value={p.statut}
                        onChange={e => updateStatut(p.id, e.target.value)}
                      >
                        <option value="nouveau">Nouveau</option>
                        <option value="en_traitement">En traitement</option>
                        <option value="resolu">Résolu</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
