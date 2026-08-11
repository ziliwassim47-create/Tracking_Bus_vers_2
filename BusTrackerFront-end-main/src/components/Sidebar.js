import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { initials, avatarColor } from '../utils';

const ADMIN_LINKS = [
  { path: '/admin', icon: '📊', label: 'Tableau de bord' },
  { path: '/admin/trajets', icon: '🗺️', label: 'Trajets' },
  { path: '/admin/bus', icon: '🚌', label: 'Bus' },
  { path: '/admin/assistantes', icon: '👩‍💼', label: 'Assistantes' },
  { path: '/admin/parents', icon: '👨‍👩‍👦', label: 'Parents' },
  { path: '/admin/enfants', icon: '👦', label: 'Enfants' },
  { path: '/admin/admins', icon: '🛡️', label: 'Admins' },
  { path: '/admin/notifications', icon: '🔔', label: 'Notifications' },
  { path: '/admin/problemes', icon: '⚠️', label: 'Problèmes' },
];

const ASSISTANTE_LINKS = [
  { path: '/assistante', icon: '🏠', label: 'Accueil' },
  { path: '/assistante/presence', icon: '✅', label: 'Présence' },
  { path: '/assistante/trajet', icon: '🗺️', label: 'Mon Trajet' },
  { path: '/assistante/notifications', icon: '🔔', label: 'Notifications' },
  { path: '/assistante/historique', icon: '📋', label: 'Historique' },
];

export default function Sidebar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!session) return null;

  const isAdmin = session.role === 'admin';
  const links = isAdmin ? ADMIN_LINKS : ASSISTANTE_LINKS;
  const name = session.profile?.nom || session.role;
  const roleLabel = isAdmin ? 'Administrateur' : 'Assistante';
  const accentColor = isAdmin ? 'var(--violet-500)' : 'var(--teal-500)';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-title">
          <div className="logo-icon">🚌</div>
          BusTracker
        </div>
        <div className="sidebar-logo-subtitle">Système de Gestion</div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {links.map(link => {
          const isActive = location.pathname === link.path ||
            (link.path !== '/admin' && link.path !== '/assistante' && location.pathname.startsWith(link.path));
          return (
            <button
              key={link.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
            >
              <span className="icon">{link.icon}</span>
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div
            className="sidebar-user-avatar"
            style={{ background: avatarColor(name) }}
          >
            {initials(name)}
          </div>
          <div>
            <div className="sidebar-user-name">{name}</div>
            <div className="sidebar-user-role">{roleLabel}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );
}
