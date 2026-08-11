import React, { useCallback, useEffect, useState } from 'react';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000/api').replace(/\/$/, '');
const TOKEN_KEY = 'busTrackerAdminToken';
const EMPTY_DATA = { users: [], students: [], buses: [], routes: [], assignments: [] };

const ENTITIES = {
  routes: {
    title: 'Trajets', singular: 'trajet', endpoint: 'routes',
    columns: [['code', 'Code'], ['name', 'Nom'], ['origin', 'Départ'], ['destination', 'Destination'], ['morning_time', 'Matin'], ['afternoon_time', 'Après-midi']],
    fields: [
      ['code', 'Code', 'text'], ['name', 'Nom du trajet', 'text'], ['origin', 'Point de départ', 'text'],
      ['destination', 'Destination', 'text'], ['morning_time', 'Heure matin', 'time'], ['afternoon_time', 'Heure après-midi', 'time']
    ]
  },
  buses: {
    title: 'Bus', singular: 'bus', endpoint: 'buses',
    columns: [['registration', 'Immatriculation'], ['label', 'Libellé'], ['capacity', 'Capacité'], ['status', 'Statut']],
    fields: [['registration', 'Immatriculation', 'text'], ['label', 'Libellé', 'text'], ['capacity', 'Capacité', 'number'], ['status', 'Statut', 'select', ['AVAILABLE', 'IN_SERVICE', 'MAINTENANCE', 'INACTIVE']]]
  },
  users: {
    title: 'Utilisateurs', singular: 'utilisateur', endpoint: 'users',
    columns: [['identifier', 'Identifiant'], ['first_name', 'Prénom'], ['last_name', 'Nom'], ['email', 'Email'], ['role', 'Rôle'], ['active', 'Actif']],
    fields: [
      ['first_name', 'Prénom', 'text'], ['last_name', 'Nom', 'text'], ['email', 'Email', 'email'], ['phone', 'Téléphone', 'text'],
      ['role', 'Rôle', 'select', ['ADMIN', 'PARENT', 'DRIVER', 'ASSISTANT']], ['password', 'Mot de passe initial', 'password']
    ]
  },
  students: {
    title: 'Enfants', singular: 'enfant', endpoint: 'students',
    columns: [['first_name', 'Prénom'], ['last_name', 'Nom'], ['parent_id', 'Parent'], ['school_class', 'Classe'], ['active', 'Actif']],
    fields: [['parent_id', 'Parent', 'parent'], ['first_name', 'Prénom', 'text'], ['last_name', 'Nom', 'text'], ['school_class', 'Classe', 'text'], ['home_address', 'Adresse', 'text'], ['home_lat', 'Latitude', 'number'], ['home_lng', 'Longitude', 'number']]
  },
  assignments: {
    title: 'Affectations', singular: 'affectation', endpoint: 'assignments',
    columns: [['route_id', 'Trajet'], ['bus_id', 'Bus'], ['driver_id', 'Chauffeur'], ['assistant_id', 'Assistante'], ['starts_on', 'Début'], ['ends_on', 'Fin']],
    fields: [['route_id', 'Trajet', 'route'], ['bus_id', 'Bus', 'bus'], ['driver_id', 'Chauffeur', 'driver'], ['assistant_id', 'Assistante', 'assistant'], ['starts_on', 'Date de début', 'date'], ['ends_on', 'Date de fin', 'date']]
  }
};

function api(path, { token, ...options } = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  }).then(async response => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Erreur HTTP ${response.status}`);
    return payload;
  });
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@demo.tn');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (result.user?.role !== 'ADMIN') throw new Error('Ce portail est réservé aux administrateurs.');
      onLogin(result);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <div className="bus-mark">🚌</div><h1>BusTracker</h1><p>Portail d’administration</p>
    <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label>
    <label>Mot de passe<input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></label>
    {error && <p className="error">{error}</p>}
    <button disabled={loading}>{loading ? 'Connexion…' : 'Se connecter'}</button>
    <small>API SQLite : {API_URL}</small>
  </form></main>;
}

function Dashboard({ data }) {
  const counts = [
    ['Trajets', data.routes?.length || 0], ['Bus', data.buses?.length || 0], ['Parents', data.users?.filter(x => x.role === 'PARENT').length || 0],
    ['Enfants', data.students?.length || 0], ['Assistantes', data.users?.filter(x => x.role === 'ASSISTANT').length || 0], ['Affectations', data.assignments?.length || 0]
  ];
  return <><div className="page-heading"><div><h2>Vue d’ensemble</h2><p>État actuel de l’établissement et des trajets.</p></div></div>
    <div className="metrics">{counts.map(([label, value]) => <article className="metric" key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
    <section className="panel"><h3>Trajets enregistrés</h3><table><thead><tr><th>Code</th><th>Trajet</th><th>Départ</th><th>Destination</th><th>Heure</th></tr></thead><tbody>
      {(data.routes || []).map(route => <tr key={route.id}><td>{route.code}</td><td>{route.name}</td><td>{route.origin}</td><td>{route.destination}</td><td>{route.morning_time}</td></tr>)}
      {!data.routes?.length && <tr><td colSpan="5">Aucun trajet.</td></tr>}
    </tbody></table></section>
  </>;
}

function Field({ definition, form, setForm, lists }) {
  const [name, label, type, values] = definition;
  const value = form[name] ?? '';
  const selectOptions = type === 'parent' ? lists.users.filter(x => x.role === 'PARENT').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'route' ? lists.routes.map(x => [x.id, `${x.code} — ${x.name}`])
    : type === 'bus' ? lists.buses.map(x => [x.id, `${x.registration} — ${x.label}`])
    : type === 'driver' ? lists.users.filter(x => x.role === 'DRIVER').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'assistant' ? lists.users.filter(x => x.role === 'ASSISTANT').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : null;
  return <label>{label}
    {type === 'select' ? <select value={value} onChange={e => setForm({ ...form, [name]: e.target.value })}><option value="">Sélectionner</option>{values.map(option => <option key={option} value={option}>{option}</option>)}</select>
      : selectOptions ? <select value={value} onChange={e => setForm({ ...form, [name]: e.target.value })}><option value="">Sélectionner</option>{selectOptions.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
      : <input type={type} value={value} onChange={e => setForm({ ...form, [name]: e.target.value })} required={['first_name', 'last_name', 'email', 'registration', 'label', 'code', 'name', 'origin', 'destination', 'home_address', 'home_lat', 'home_lng', 'route_id', 'bus_id', 'driver_id'].includes(name)} />}
  </label>;
}

function EntityPanel({ entity, token, lists, refresh }) {
  const config = ENTITIES[entity];
  const [rows, setRows] = useState([]); const [form, setForm] = useState({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setRows(await api(`/${config.endpoint}`, { token })); } catch (err) { setError(err.message); } }, [config.endpoint, token]);
  useEffect(() => { load(); }, [load]);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      ['capacity', 'home_lat', 'home_lng', 'parent_id', 'route_id', 'bus_id', 'driver_id', 'assistant_id'].forEach(key => { if (body[key] !== undefined) body[key] = Number(body[key]); });
      await api(`/${config.endpoint}`, { token, method: 'POST', body: JSON.stringify(body) }); setForm({}); await Promise.all([load(), refresh()]);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Supprimer ${config.singular} sélectionné ?`)) return;
    try { await api(`/${config.endpoint}/${row.id}`, { token, method: 'DELETE' }); await Promise.all([load(), refresh()]); } catch (err) { setError(err.message); }
  }
  const display = (row, key) => {
    if (key === 'active') return row[key] ? 'Oui' : 'Non';
    const maps = { route_id: lists.routes, bus_id: lists.buses, driver_id: lists.users, assistant_id: lists.users, parent_id: lists.users };
    if (maps[key]) { const item = maps[key].find(x => Number(x.id) === Number(row[key])); return item ? (item.name || item.label || `${item.first_name} ${item.last_name}`) : row[key]; }
    return row[key] ?? '—';
  };
  return <><div className="page-heading"><div><h2>{config.title}</h2><p>Ajout, consultation et suppression des {config.title.toLowerCase()}.</p></div></div>
    <div className="admin-grid"><section className="panel"><h3>Liste</h3>{error && <p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th></th></tr></thead><tbody>
      {rows.map(row => <tr key={row.id}>{config.columns.map(([key]) => <td key={key}>{display(row, key)}</td>)}<td><button className="danger" onClick={() => remove(row)}>Supprimer</button></td></tr>)}
      {!rows.length && <tr><td colSpan={config.columns.length + 1}>Aucune donnée.</td></tr>}
    </tbody></table></div></section>
    <form className="panel form-panel" onSubmit={create}><h3>Ajouter un {config.singular}</h3>{config.fields.map(field => <Field key={field[0]} definition={field} form={form} setForm={setForm} lists={lists} />)}<button disabled={busy}>{busy ? 'Enregistrement…' : 'Ajouter'}</button></form></div>
  </>;
}

function AdminApp({ session, onLogout }) {
  const [tab, setTab] = useState('dashboard'); const [data, setData] = useState(EMPTY_DATA); const [error, setError] = useState('');
  const refresh = useCallback(async () => { try { setData(await api('/bootstrap', { token: session.token })); setError(''); } catch (err) { setError(err.message); } }, [session.token]);
  useEffect(() => { refresh(); }, [refresh]);
  const nav = [['dashboard', 'Vue d’ensemble'], ...Object.entries(ENTITIES).map(([key, value]) => [key, value.title])];
  return <div className="shell"><aside><div className="brand">🚌 <span>BusTracker</span></div><p className="role">Administration</p><nav>{nav.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</nav><div className="account"><strong>{session.user?.first_name} {session.user?.last_name}</strong><button onClick={onLogout}>Déconnexion</button></div></aside><main>{error && <p className="error">{error}</p>}{tab === 'dashboard' ? <Dashboard data={data} /> : <EntityPanel entity={tab} token={session.token} lists={data} refresh={refresh} />}</main></div>;
}

export default function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; } });
  const login = result => { localStorage.setItem(TOKEN_KEY, JSON.stringify(result)); setSession(result); };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setSession(null); };
  return session?.token ? <AdminApp session={session} onLogout={logout} /> : <Login onLogin={login} />;
}
