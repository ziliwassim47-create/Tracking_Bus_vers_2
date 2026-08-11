// ─── Central API config ──────────────────────────────────────────────────────
// The Parent application uses the SQLite API in tracking-bus-h.
// Set REACT_APP_SERVER_URL for a deployed instance when needed.
export const SERVER_URL = (process.env.REACT_APP_SERVER_URL || 'http://localhost:9000')
export const API_BASE = `${SERVER_URL}/api`;
export const SOCKET_URL = SERVER_URL;

// ─── Auth helpers ─────────────────────────────────────────────────────────────
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('bustracker_session') || 'null');
  } catch { return null; }
}

export function setSession(data) {
  localStorage.setItem('bustracker_session', JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem('bustracker_session');
}

export function isAuthenticated() {
  return !!getSession();
}

// ─── Fetch wrapper ────────────────────────────────────────────────────────────
export async function apiFetch(path, options = {}) {
  const session = getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-TN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

export function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('fr-TN', {
    hour: '2-digit', minute: '2-digit'
  });
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'à l\'instant';
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return formatDate(dateStr);
}

// ─── Notification type icons ──────────────────────────────────────────────────
export const NOTIF_ICONS = {
  alerte:   { icon: '⚠️', bg: '#fffbeb', color: '#a16207' },
  incident: { icon: '🚨', bg: '#fee2e2', color: '#dc2626' },
  arrivee:  { icon: '✅', bg: '#dcfce7', color: '#15803d' },
  depart:   { icon: '🚌', bg: '#f0fdfa', color: '#0d9488' },
  probleme: { icon: '🔧', bg: '#ede9fe', color: '#7c3aed' },
  info:     { icon: 'ℹ️', bg: '#f0f9ff', color: '#0369a1' },
};

// ─── Avatar color picker ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'linear-gradient(135deg,#14b8a6,#0d9488)',
  'linear-gradient(135deg,#8b5cf6,#7c3aed)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#f43f5e,#e11d48)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#3b82f6,#2563eb)',
];

export function avatarColor(str = '') {
  let hash = 0;
  for (const ch of str) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash)];
}

export function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
