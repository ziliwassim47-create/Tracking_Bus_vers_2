import React, { useCallback, useEffect, useState } from 'react';

const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000/api').replace(/\/$/, '');
const TOKEN_KEY = 'busTrackerAdminToken';
const SESSION_EVENT = 'bus-tracker-admin-session';
const EMPTY_DATA = { users: [], students: [], buses: [], routes: [], stops: [], routeStudents: [], assignments: [] };
let refreshPromise = null;

const ENTITIES = {
  routes: {
    title: 'Trajets', singular: 'trajet', endpoint: 'routes',
    columns: [['code', 'Code'], ['name', 'Nom'], ['origin', 'Départ'], ['destination', 'Destination'], ['morning_time', 'Matin'], ['afternoon_time', 'Après-midi']],
    fields: [
      ['code', 'Code', 'text'], ['name', 'Nom du trajet', 'text'], ['origin', 'Point de départ', 'text'],
      ['destination', 'Destination', 'text'], ['morning_time', 'Heure matin', 'time'], ['afternoon_time', 'Heure après-midi', 'time']
    ]
  },
  stops: {
    title: 'Arrêts', singular: 'arrêt', endpoint: 'stops',
    columns: [['route_id', 'Trajet'], ['stop_order', 'Ordre'], ['name', 'Nom'], ['address', 'Adresse'], ['planned_offset_min', 'Minutes']],
    fields: [
      ['route_id', 'Trajet', 'route'], ['stop_order', 'Ordre', 'number'], ['name', 'Nom de l’arrêt', 'text'],
      ['address', 'Adresse', 'text'], ['latitude', 'Latitude', 'number'], ['longitude', 'Longitude', 'number'],
      ['planned_offset_min', 'Temps depuis le départ (min)', 'number']
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
  routeStudents: {
    title: 'Enfants par bus et trajet', singular: 'affectation enfant', endpoint: 'route-students',
    columns: [['route_id', 'Trajet'], ['bus_id', 'Bus'], ['student_id', 'Enfant'], ['stop_id', 'Arrêt']],
    fields: [['route_id', 'Trajet', 'route'], ['bus_id', 'Bus affecté au trajet', 'routeBus'], ['student_id', 'Enfant', 'student'], ['stop_id', 'Arrêt de prise en charge', 'stop']],
    removePath: row => `/route-students/${row.route_id}/${row.student_id}`
  },
  assignments: {
    title: 'Affectations', singular: 'affectation', endpoint: 'assignments',
    columns: [['route_id', 'Trajet'], ['bus_id', 'Bus'], ['children', 'Enfants et arrêts'], ['driver_id', 'Chauffeur'], ['assistant_id', 'Assistante'], ['starts_on', 'Début'], ['ends_on', 'Fin']],
    fields: [['route_id', 'Trajet', 'route'], ['bus_id', 'Bus', 'bus'], ['route_children', 'Enfants affectés à ce bus et ce trajet', 'routeChildren'], ['driver_id', 'Chauffeur', 'driver'], ['assistant_id', 'Assistante', 'assistant'], ['starts_on', 'Date de début', 'date'], ['ends_on', 'Date de fin', 'date']]
  }
};

function readStoredSession() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
}

function publishSession(session) {
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

function storeSession(session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  publishSession(session);
}

function expireSession() {
  localStorage.removeItem(TOKEN_KEY);
  publishSession(null);
}

async function restoreStoredSession() {
  const current = readStoredSession();
  if (!current?.token) return null;
  const sessionExpiry = Date.parse(current.session_expires_at || '');
  if (Number.isFinite(sessionExpiry) && sessionExpiry <= Date.now()) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  try {
    const response = await fetch(`${API_URL}/health`);
    const health = await response.json().catch(() => ({}));
    if (!response.ok || !current.server_instance_id || current.server_instance_id !== health.instance_id) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return current;
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
}

function apiError(payload, status) {
  const error = new Error(payload.error || payload.message || `Erreur HTTP ${status}`);
  error.status = status;
  error.code = payload.code;
  return error;
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const current = readStoredSession();
      const sessionExpiry = Date.parse(current?.session_expires_at || '');
      if (!current?.refresh_token || (Number.isFinite(sessionExpiry) && sessionExpiry <= Date.now())) {
        expireSession();
        throw apiError({ error: 'Session expirée', code: 'SESSION_EXPIRED' }, 401);
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: current.refresh_token })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        expireSession();
        throw apiError(payload, response.status);
      }

      const renewed = { ...current, ...payload };
      storeSession(renewed);
      return renewed;
    })().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function currentAccessToken(token) {
  const current = readStoredSession();
  if (current?.token && current.token !== token) return current.token;
  const accessExpiry = Date.parse(current?.expires_at || '');
  if (Number.isFinite(accessExpiry) && accessExpiry - Date.now() <= 30_000) {
    return (await refreshSession()).token;
  }
  return token;
}

async function api(path, { token, retryAuth = true, ...options } = {}) {
  const requestToken = token && retryAuth ? await currentAccessToken(token) : token;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(requestToken ? { Authorization: `Bearer ${requestToken}` } : {}), ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && token && retryAuth) {
    const stored = readStoredSession();
    const renewed = stored?.token && stored.token !== requestToken ? stored : await refreshSession();
    return api(path, { token: renewed.token, retryAuth: false, ...options });
  }
  if (!response.ok) throw apiError(payload, response.status);
  return payload;
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
    ['Enfants', data.students?.length || 0], ['Arrêts', data.stops?.length || 0], ['Assistantes', data.users?.filter(x => x.role === 'ASSISTANT').length || 0], ['Affectations', data.assignments?.length || 0]
  ];
  return <><div className="page-heading"><div><h2>Vue d’ensemble</h2><p>État actuel de l’établissement et des trajets.</p></div></div>
    <div className="metrics">{counts.map(([label, value]) => <article className="metric" key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
    <section className="panel"><h3>Trajets enregistrés</h3><div className="table-wrap"><table><thead><tr><th>Code</th><th>Trajet</th><th>Départ</th><th>Destination</th><th>Heure</th></tr></thead><tbody>
      {(data.routes || []).map(route => <tr key={route.id}><td data-label="Code">{route.code}</td><td data-label="Trajet">{route.name}</td><td data-label="Départ">{route.origin}</td><td data-label="Destination">{route.destination}</td><td data-label="Heure">{route.morning_time}</td></tr>)}
      {!data.routes?.length && <tr className="empty-row" key="empty-routes"><td colSpan="5">Aucun trajet.</td></tr>}
    </tbody></table></div></section>
  </>;
}

function childrenForAssignment(lists, routeId, busId) {
  if (!routeId || !busId) return [];
  return lists.routeStudents.filter(link => Number(link.route_id) === Number(routeId)
    && Number(link.bus_id) === Number(busId)).map(link => ({
    student: lists.students.find(student => Number(student.id) === Number(link.student_id)),
    stop: lists.stops.find(stop => Number(stop.id) === Number(link.stop_id))
  })).filter(item => item.student);
}

function Field({ definition, form, setForm, lists }) {
  const [name, label, type, values] = definition;
  const value = form[name] ?? '';
  const selectOptions = type === 'parent' ? lists.users.filter(x => x.role === 'PARENT').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'route' ? lists.routes.map(x => [x.id, `${x.code} — ${x.name}`])
    : type === 'bus' ? lists.buses.map(x => [x.id, `${x.registration} — ${x.label}`])
    : type === 'driver' ? lists.users.filter(x => x.role === 'DRIVER').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'assistant' ? lists.users.filter(x => x.role === 'ASSISTANT').map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'student' ? lists.students.map(x => [x.id, `${x.first_name} ${x.last_name}`])
    : type === 'routeBus' ? lists.assignments.filter(x => x.active && Number(x.route_id) === Number(form.route_id)).map(x => {
      const bus = lists.buses.find(item => Number(item.id) === Number(x.bus_id));
      return [x.bus_id, bus ? `${bus.registration} — ${bus.label}` : `Bus ${x.bus_id}`];
    })
    : type === 'stop' ? lists.stops.filter(x => !form.route_id || Number(x.route_id) === Number(form.route_id)).map(x => [x.id, `${x.stop_order}. ${x.name}`])
    : null;
  if (type === 'routeChildren') {
    const assignedChildren = childrenForAssignment(lists, form.route_id, form.bus_id);
    return <label>{label}<div className="related-list">
      {(!form.route_id || !form.bus_id) && <span>Sélectionnez d’abord un trajet et un bus.</span>}
      {form.route_id && form.bus_id && !assignedChildren.length && <span>Aucun enfant affecté à ce bus sur ce trajet.</span>}
      {assignedChildren.map(({ student, stop }) => <span key={student.id}>• {student.first_name} {student.last_name}{stop ? ` — ${stop.name}` : ''}</span>)}
    </div></label>;
  }
  const updateValue = nextValue => setForm({
    ...form,
    ...(name === 'route_id' ? { bus_id: '', stop_id: '' } : {}),
    [name]: nextValue
  });
  return <label>{label}
    {type === 'select' ? <select value={value} onChange={e => updateValue(e.target.value)}><option value="">Sélectionner</option>{values.map(option => <option key={option} value={option}>{option}</option>)}</select>
      : selectOptions ? <select value={value} onChange={e => updateValue(e.target.value)}><option value="">Sélectionner</option>{selectOptions.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
      : <input type={type} value={value} onChange={e => setForm({ ...form, [name]: e.target.value })} required={['first_name', 'last_name', 'email', 'registration', 'label', 'code', 'name', 'origin', 'destination', 'home_address', 'home_lat', 'home_lng', 'route_id', 'bus_id', 'driver_id'].includes(name)} />}
  </label>;
}

function EntityPanel({ entity, token, lists, refresh, onUnauthorized }) {
  const config = ENTITIES[entity];
  const [rows, setRows] = useState([]); const [form, setForm] = useState({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const handleError = useCallback(err => {
    if (err.status === 401) onUnauthorized();
    else setError(err.message);
  }, [onUnauthorized]);
  const load = useCallback(async () => { try { setRows(await api(`/${config.endpoint}`, { token })); } catch (err) { handleError(err); } }, [config.endpoint, handleError, token]);
  useEffect(() => { load(); }, [load]);
  async function create(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ''));
      ['capacity', 'home_lat', 'home_lng', 'parent_id', 'route_id', 'bus_id', 'driver_id', 'assistant_id', 'student_id', 'stop_id', 'stop_order', 'latitude', 'longitude', 'planned_offset_min'].forEach(key => { if (body[key] !== undefined) body[key] = Number(body[key]); });
      await api(`/${config.endpoint}`, { token, method: 'POST', body: JSON.stringify(body) }); setForm({}); await Promise.all([load(), refresh()]);
    } catch (err) { handleError(err); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Supprimer ${config.singular} sélectionné ?`)) return;
    try { await api(config.removePath ? config.removePath(row) : `/${config.endpoint}/${row.id}`, { token, method: 'DELETE' }); await Promise.all([load(), refresh()]); } catch (err) { handleError(err); }
  }
  const display = (row, key) => {
    if (key === 'active') return row[key] ? 'Oui' : 'Non';
    if (key === 'children') {
      const assignedChildren = childrenForAssignment(lists, row.route_id, row.bus_id);
      return assignedChildren.length
        ? assignedChildren.map(({ student, stop }) => `${student.first_name} ${student.last_name}${stop ? ` (${stop.name})` : ''}`).join(', ')
        : 'Aucun enfant affecté';
    }
    const maps = { route_id: lists.routes, bus_id: lists.buses, driver_id: lists.users, assistant_id: lists.users, parent_id: lists.users, student_id: lists.students, stop_id: lists.stops };
    if (maps[key]) { const item = maps[key].find(x => Number(x.id) === Number(row[key])); return item ? (item.name || item.label || `${item.first_name} ${item.last_name}`) : row[key]; }
    return row[key] ?? '—';
  };
  return <><div className="page-heading"><div><h2>{config.title}</h2><p>Ajout, consultation et suppression des {config.title.toLowerCase()}.</p></div></div>
    <div className="admin-grid"><section className="panel"><h3>Liste</h3>{error && <p className="error">{error}</p>}<div className="table-wrap"><table><thead><tr>{config.columns.map(([, label]) => <th key={label}>{label}</th>)}<th></th></tr></thead><tbody>
      {rows.map((row, index) => <tr key={row.id ?? row.identifier ?? `${config.endpoint}-${index}`}>{config.columns.map(([key, label]) => <td key={key} data-label={label}>{display(row, key)}</td>)}<td className="table-actions" data-label="Actions"><button className="danger" onClick={() => remove(row)}>Supprimer</button></td></tr>)}
      {!rows.length && <tr className="empty-row" key={`empty-${config.endpoint}`}><td colSpan={config.columns.length + 1}>Aucune donnée.</td></tr>}
    </tbody></table></div></section>
    <form className="panel form-panel" onSubmit={create}><h3>Ajouter un {config.singular}</h3>{config.fields.map(field => <Field key={field[0]} definition={field} form={form} setForm={setForm} lists={lists} />)}<button disabled={busy}>{busy ? 'Enregistrement…' : 'Ajouter'}</button></form></div>
  </>;
}

function AdminApp({ session, onLogout }) {
  const [tab, setTab] = useState('dashboard'); const [data, setData] = useState(EMPTY_DATA); const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try { setData(await api('/bootstrap', { token: session.token })); setError(''); }
    catch (err) { if (err.status === 401) onLogout(); else setError(err.message); }
  }, [onLogout, session.token]);
  useEffect(() => { refresh(); }, [refresh]);
  const nav = [['dashboard', 'Vue d’ensemble'], ...Object.entries(ENTITIES).map(([key, value]) => [key, value.title])];
  return <div className="shell"><aside><div className="brand">🚌 <span>BusTracker</span></div><p className="role">Administration</p><nav aria-label="Sections d’administration">{nav.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}</button>)}</nav><div className="account"><strong>{session.user?.first_name} {session.user?.last_name}</strong><button onClick={onLogout}>Déconnexion</button></div></aside><main>{error && <p className="error">{error}</p>}{tab === 'dashboard' ? <Dashboard data={data} /> : <EntityPanel entity={tab} token={session.token} lists={data} refresh={refresh} onUnauthorized={onLogout} />}</main></div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    let mounted = true;
    const updateSession = event => setSession(event.detail);
    window.addEventListener(SESSION_EVENT, updateSession);
    void restoreStoredSession().then(restored => {
      if (mounted) setSession(restored);
    }).finally(() => {
      if (mounted) setCheckingSession(false);
    });
    return () => { mounted = false; window.removeEventListener(SESSION_EVENT, updateSession); };
  }, []);
  const login = useCallback(result => { storeSession(result); setSession(result); }, []);
  const logout = useCallback(() => { expireSession(); setSession(null); }, []);
  if (checkingSession) return <main className="login-page"><div className="login-card session-check">Vérification de la session…</div></main>;
  return session?.token ? <AdminApp session={session} onLogout={logout} /> : <Login onLogin={login} />;
}
