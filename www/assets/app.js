(function () {
  'use strict';

  const scriptUrl = document.currentScript && document.currentScript.src;
  const rootUrl = scriptUrl ? new URL('../', scriptUrl).href : '/';
  const apiBase = location.protocol === 'file:'
    ? (localStorage.getItem('trackingApiUrl') || 'http://localhost:9000/api')
    : '/api';
  const path = location.pathname.replace(/\\/g, '/').toLowerCase();
  const tokenKey = 'trackingBusToken';
  const refreshTokenKey = 'trackingBusRefreshToken';
  const tokenExpiresAtKey = 'trackingBusTokenExpiresAt';
  const sessionExpiresAtKey = 'trackingBusSessionExpiresAt';
  const cacheKey = 'trackingBusBootstrap';
  const selectedStudentKey = 'trackingBusSelectedStudent';
  let data = null;
  let toastTimer = null;
  let gpsWatchId = null;
  let lastGpsSentAt = 0;
  let refreshPromise = null;

  const roleRoutes = {
    PARENT: '/parent/accueil.html',
    DRIVER: '/assistante/accueil.html',
    ASSISTANT: '/assistante/accueil.html',
    ADMIN: '/administration/accueil.html'
  };

  const roleLabels = {
    PARENT: 'Parent',
    DRIVER: 'Chauffeur',
    ASSISTANT: 'Assistante',
    ADMIN: 'Administration'
  };

  const statusLabels = {
    AVAILABLE: 'Disponible',
    IN_SERVICE: 'En service',
    MAINTENANCE: 'Maintenance',
    INACTIVE: 'Inactif',
    PLANNED: 'Planifié',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    OPEN: 'Ouvert',
    IN_REVIEW: 'En cours',
    RESOLVED: 'Résolu',
    REJECTED: 'Rejeté',
    WAITING: 'En attente',
    BOARDED: 'À bord',
    ABSENT: 'Absent',
    DROPPED_OFF: 'Déposé',
    UPCOMING: 'À venir',
    APPROACHING: 'En approche',
    PASSED: 'Passé',
    SKIPPED: 'Ignoré'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name) {
    const iconUrl = `${rootUrl}assets/icons/${encodeURIComponent(String(name))}.png`;
    return `<span class="tb-png-icon" style="--tb-icon-image:url(&quot;${escapeHtml(iconUrl)}&quot;)" aria-hidden="true"></span>`;
  }

  function initials(item) {
    return `${String(item.first_name || '').charAt(0)}${String(item.last_name || '').charAt(0)}`.toUpperCase() || '?';
  }

  function formatDate(value, options) {
    if (!value) return 'Non renseigné';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(value);
    return new Intl.DateTimeFormat('fr-FR', options || {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatTime(value) {
    if (!value) return '--:--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 5);
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  function badge(status, label) {
    const styles = {
      IN_PROGRESS: 'success',
      COMPLETED: 'success',
      AVAILABLE: 'success',
      BOARDED: 'success',
      PASSED: 'success',
      RESOLVED: 'success',
      PLANNED: 'info',
      APPROACHING: 'info',
      WAITING: 'info',
      IN_REVIEW: 'info',
      MAINTENANCE: 'warning',
      DELAY: 'warning',
      ABSENT: 'warning',
      OPEN: 'warning',
      CANCELLED: 'danger',
      INACTIVE: 'danger',
      REJECTED: 'danger'
    };
    return `<span class="tb-badge ${styles[status] || ''}">${escapeHtml(label || statusLabels[status] || status)}</span>`;
  }

  function showToast(message) {
    const toast = document.querySelector('.tb-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function storeSession(result) {
    localStorage.setItem(tokenKey, result.token);
    localStorage.setItem(refreshTokenKey, result.refresh_token);
    localStorage.setItem(tokenExpiresAtKey, result.expires_at);
    localStorage.setItem(sessionExpiresAtKey, result.session_expires_at);
  }

  function clearSession() {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(refreshTokenKey);
    localStorage.removeItem(tokenExpiresAtKey);
    localStorage.removeItem(sessionExpiresAtKey);
    localStorage.removeItem(cacheKey);
  }

  async function refreshSession() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem(refreshTokenKey);
      if (!refreshToken) throw new Error('Session expirée');
      const response = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const payload = await response.json();
      if (!response.ok) {
        const error = new Error(payload.error || 'Session expirée');
        error.status = response.status;
        throw error;
      }
      storeSession(payload);
      return payload;
    })();
    try {
      return await refreshPromise;
    } catch (error) {
      clearSession();
      throw error;
    } finally {
      refreshPromise = null;
    }
  }

  async function api(endpoint, options, retry = true) {
    const isPublicAuth = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/refresh'].includes(endpoint);
    const expiresAt = Date.parse(localStorage.getItem(tokenExpiresAtKey) || '');
    if (!isPublicAuth && localStorage.getItem(refreshTokenKey)
      && Number.isFinite(expiresAt) && expiresAt <= Date.now() + 60_000) {
      await refreshSession();
    }
    const headers = { 'Content-Type': 'application/json', ...(options && options.headers) };
    const token = localStorage.getItem(tokenKey);
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${apiBase}${endpoint}`, { ...options, headers });
    const payload = response.status === 204 ? {} : await response.json();
    if (!response.ok) {
      if (response.status === 401 && retry && !isPublicAuth && localStorage.getItem(refreshTokenKey)) {
        await refreshSession();
        return api(endpoint, options, false);
      }
      const error = new Error(payload.error || 'Erreur de communication');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function isAuthPage() {
    return path.endsWith('/index.html')
      || path === '/'
      || path.includes('/auth/');
  }

  function currentArea() {
    if (path.includes('/administration/')) return 'ADMIN';
    if (path.includes('/assistante/')) return 'ASSISTANT';
    if (path.includes('/parent/')) return 'PARENT';
    return 'AUTH';
  }

  function header() {
    const unread = data.notifications.filter(item => !item.read_at).length;
    const area = currentArea();
    const profilePath = area === 'ADMIN' ? '/administration/profil.html'
      : area === 'ASSISTANT' ? '/assistante/profil.html'
        : '/parent/profil.html';
    const notificationPath = area === 'ADMIN' ? '/administration/reclamations.html'
      : area === 'ASSISTANT' ? '/assistante/notifications.html'
        : '/parent/notifications.html';
    return `
      <header class="tb-header">
        <div class="tb-header-row">
          <img class="tb-logo" src="${rootUrl}assets/educanet-logo.png" alt="EDUCANET Bus Tracking App">
          <div class="tb-header-actions">
            <a class="tb-icon-button ${unread ? 'has-badge' : ''}" href="${notificationPath}" aria-label="Notifications">${icon('bell')}</a>
            <a class="tb-icon-button" href="${profilePath}" aria-label="Profil">${icon('user')}</a>
            <button class="tb-icon-button" type="button" data-action="logout" aria-label="Déconnexion">${icon('log-out')}</button>
          </div>
        </div>
      </header>`;
  }

  function navItemsForRole() {
    const role = data.user.role;
    if (role === 'PARENT') {
      return [
        ['Accueil', 'house', '/parent/accueil.html', path.endsWith('/parent/accueil.html')],
        ['Trajet', 'route', '/parent/trajet-arrets.html', path.includes('trajet-arrets')],
        ['Informations', 'info', '/parent/informations-trajet.html', path.includes('informations-trajet')],
        ['Carte', 'map', '/parent/carte.html', path.endsWith('/parent/carte.html')],
        ['Historique', 'history', '/parent/historique.html', path.endsWith('/parent/historique.html')]
      ];
    }
    if (role === 'DRIVER' || role === 'ASSISTANT') {
      return [
        ['Accueil', 'house', '/assistante/accueil.html', path.endsWith('/assistante/accueil.html')],
        ['Trajet', 'route', '/assistante/trajet-arrets.html', path.includes('trajet-arrets') || path.includes('demarrer-trajet') || path.includes('recapitulatif')],
        ['Élèves', 'users', '/assistante/enfants.html', path.endsWith('/assistante/enfants.html')],
        ['Carte', 'map', '/assistante/carte.html', path.endsWith('/assistante/carte.html')],
        ['Historique', 'history', '/assistante/historique.html', path.endsWith('/assistante/historique.html')]
      ];
    }
    return [
      ['Accueil', 'house', '/administration/accueil.html', path.endsWith('/administration/accueil.html')],
      ['Dashboard', 'layout-dashboard', '/administration/dashboard.html', path.endsWith('/administration/dashboard.html')],
      ['Trajets', 'map', '/administration/carte.html', path.endsWith('/administration/carte.html')],
      ['Gérer', 'users-round', '/administration/liste-parents.html', path.includes('/liste-') || path.includes('/affecter-')],
      ['Ajouter', 'circle-plus', '/administration/ajouter-compte.html', path.includes('/ajouter-')]
    ];
  }

  function bottomNav() {
    const items = navItemsForRole();
    return `
      <nav class="tb-bottom-nav" style="--tb-nav-count:${items.length}" aria-label="Navigation principale">
        ${items.map(([label, glyph, href, active]) => `
          <a class="tb-nav-item ${active ? 'active' : ''}" href="${href}">
            ${icon(glyph)}<span>${escapeHtml(label)}</span>
          </a>`).join('')}
      </nav>`;
  }

  function shell(content, options) {
    const auth = options && options.auth;
    document.body.className = 'tb-modern';
    document.body.innerHTML = `
      <main class="app-stage">
        <section class="tb-app ${auth ? 'tb-app-auth' : ''}">
          ${auth ? '' : header()}
          <div class="tb-content ${auth ? 'tb-auth-page' : ''}">${content}</div>
          ${auth ? '' : bottomNav()}
          ${options && options.fab ? `<a class="tb-fab" href="${options.fab.href}" aria-label="${escapeHtml(options.fab.label)}">${icon(options.fab.icon || 'plus')}</a>` : ''}
        </section>
      </main>
      <div class="tb-toast" role="status" aria-live="polite"></div>`;
  }

  function splashPage() {
    shell(`
      <section class="tb-auth tb-splash">
        <img class="tb-auth-logo" src="${rootUrl}assets/educanet-logo.png" alt="EDUCANET Bus Tracking App">
        <h1 class="tb-title tb-title-large">Tracking Bus</h1>
        <p class="tb-auth-copy">Gardez le contrôle des trajets scolaires en temps réel.</p>
        <div class="tb-auth-spacer"></div>
        <a class="tb-button" href="${rootUrl}auth/connexion.html">Commencer</a>
      </section>`, { auth: true });
  }

  function loginPage() {
    shell(`
      <form class="tb-auth tb-login" id="tb-login-form">
        <img class="tb-auth-logo" src="${rootUrl}assets/educanet-logo.png" alt="EDUCANET">
        <h1 class="tb-title tb-title-large">Connexion</h1>
        <div class="tb-form">
          <div class="tb-field">
            <label for="login-email">Email</label>
            <input class="tb-input" id="login-email" name="email" type="email" autocomplete="email" placeholder="exemple@email.com" value="parent@demo.tn" required>
          </div>
          <div class="tb-field">
            <label for="login-password">Mot de passe</label>
            <input class="tb-input" id="login-password" name="password" type="password" autocomplete="current-password" value="demo1234" required>
          </div>
          <div style="text-align:right"><a class="tb-link-button" href="${rootUrl}auth/mot-de-passe-oublie.html">Mot de passe oublié ?</a></div>
          <button class="tb-button" type="submit">${icon('log-in')} Se connecter</button>
          <div style="text-align:center"><a class="tb-link-button" href="${rootUrl}auth/inscription.html">${icon('user-plus')} Demander un accès</a></div>
        </div>
        <div class="tb-demo" aria-label="Comptes de démonstration">
          <button type="button" data-demo-email="parent@demo.tn">Parent</button>
          <button type="button" data-demo-email="assistant@demo.tn">Assistante</button>
          <button type="button" data-demo-email="admin@demo.tn">Admin</button>
        </div>
        <div class="tb-login-footer">
          <strong>Redirection automatique</strong>
          <span>Le rôle est détecté après connexion.</span>
        </div>
      </form>`, { auth: true });
  }

  function registrationPage() {
    shell(`
      <form class="tb-auth" id="tb-registration-form">
        <div style="height:34px"></div>
        <h1 class="tb-title">Demande d’inscription</h1>
        <p class="tb-subtitle">L’administration vérifiera votre demande avant d’activer le compte.</p>
        <div class="tb-form">
          <div class="tb-field">
            <label for="registration-role">Profil</label>
            <select class="tb-select" id="registration-role" name="requested_role" required>
              <option value="PARENT">Parent</option>
              <option value="DRIVER">Chauffeur</option>
              <option value="ASSISTANT">Assistante</option>
            </select>
          </div>
          <div class="tb-form-row">
            ${field('first_name', 'Prénom', 'text')}
            ${field('last_name', 'Nom', 'text')}
          </div>
          ${field('email', 'Email', 'email')}
          ${field('phone', 'Téléphone', 'tel')}
          <button class="tb-button" type="submit">${icon('send')} Envoyer la demande</button>
          <a class="tb-button tb-button-secondary" href="${rootUrl}auth/connexion.html">${icon('arrow-left')} Retour</a>
        </div>
      </form>`, { auth: true });
  }

  function forgotPage() {
    shell(`
      <form class="tb-auth" id="tb-forgot-form">
        <div style="height:48px"></div>
        <h1 class="tb-title">Mot de passe oublié</h1>
        <p class="tb-subtitle">Recevez un lien sécurisé de réinitialisation.</p>
        <div class="tb-form" style="margin-top:100px">
          <div class="tb-field">
            <label for="forgot-email">Email</label>
            <input class="tb-input" id="forgot-email" name="email" type="email" placeholder="exemple@email.com" required>
          </div>
          <button class="tb-button" type="submit">${icon('send')} Envoyer le lien</button>
          <a class="tb-button tb-button-secondary" href="${rootUrl}auth/connexion.html">${icon('arrow-left')} Retour</a>
        </div>
      </form>`, { auth: true });
  }

  function selectedStudent() {
    const rawId = Number(localStorage.getItem(selectedStudentKey));
    return data.students.find(student => student.id === rawId) || data.students[0] || null;
  }

  function childSwitcher() {
    const selected = selectedStudent();
    if (!data.students.length) return '';
    return `
      <div class="tb-child-switcher" role="tablist" aria-label="Enfants">
        ${data.students.map(student => `
          <button class="tb-child ${selected && selected.id === student.id ? 'active' : ''}" type="button" data-student-id="${student.id}">
            <span class="tb-avatar">${initials(student)}</span>
            <span>${escapeHtml(student.first_name)}</span>
          </button>`).join('')}
      </div>`;
  }

  function currentTripSummary() {
    const trip = data.currentTrip;
    if (!trip) return '<div class="tb-empty">Aucun trajet n’est actuellement planifié.</div>';
    return `
      <div class="tb-card">
        <div class="tb-row">
          <span class="tb-action-icon">${icon('bus-front')}</span>
          <div class="tb-row-body">
            <strong class="tb-row-title">${escapeHtml(trip.route_name)} · ${escapeHtml(trip.registration)}</strong>
            <span class="tb-row-meta">${escapeHtml(trip.driver_name)} · Départ ${formatTime(trip.scheduled_start_at)}</span>
          </div>
          ${badge(trip.status)}
        </div>
      </div>`;
  }

  function parentHome() {
    const student = selectedStudent();
    const positionAge = data.latestPosition ? formatDate(data.latestPosition.recorded_at) : 'indisponible';
    shell(`
      <p class="tb-kicker">Bienvenue, ${escapeHtml(data.user.first_name)}</p>
      <div class="tb-user-summary">
        <span class="tb-avatar">${initials(data.user)}</span>
        <div><strong>${escapeHtml(data.user.first_name)} ${escapeHtml(data.user.last_name)}</strong><span>Dernière position du bus: ${positionAge}</span></div>
      </div>
      ${childSwitcher()}
      <h2 class="tb-section-title">${student ? `Suivi de ${escapeHtml(student.first_name)}` : 'Suivi du bus'}</h2>
      ${currentTripSummary()}
      <div class="tb-actions-grid">
        ${actionTile('/parent/trajet-arrets.html', 'route', 'Trajet en cours', true)}
        ${actionTile('/parent/informations-trajet.html', 'info', 'Informations')}
        ${actionTile('/parent/carte.html', 'map-pinned', 'Carte en direct')}
        ${actionTile('/parent/historique.html', 'history', 'Historique')}
        ${actionTile('/parent/notifications.html', 'bell', 'Notifications')}
        ${actionTile('/parent/reclamation.html', 'triangle-alert', 'Réclamation')}
      </div>`);
  }

  function actionTile(href, glyph, label, primary) {
    return `
      <a class="tb-action-tile ${primary ? 'tb-action-tile-primary' : ''}" href="${href}">
        <span class="tb-action-icon">${icon(glyph)}</span>
        <strong>${escapeHtml(label)}</strong>
      </a>`;
  }

  function timelinePage(title, subtitle) {
    const selected = selectedStudent();
    shell(`
      <h1 class="tb-title">${escapeHtml(title)}</h1>
      <p class="tb-subtitle">${escapeHtml(subtitle || (data.currentTrip ? `${data.currentTrip.route_name} · ${data.currentTrip.registration}` : 'Aucun trajet'))}</p>
      ${childSwitcher()}
      <div class="tb-timeline">
        ${data.tripStops.length ? data.tripStops.map(stop => `
          <div class="tb-stop ${String(stop.status).toLowerCase()}">
            <strong>${escapeHtml(stop.name)}</strong>
            <span>${escapeHtml(stop.address)} · ${statusLabels[stop.status] || stop.status}</span>
          </div>`).join('') : '<div class="tb-empty">Aucun arrêt disponible.</div>'}
      </div>
      ${selected ? `<div class="tb-card tb-card-flat"><strong class="tb-row-title">${escapeHtml(selected.home_address)}</strong><span class="tb-row-meta">Rayon d’alerte ${selected.alert_radius_m} m</span></div>` : ''}
    `);
  }

  function informationPage() {
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">Informations du trajet</h1>
      <p class="tb-subtitle">${trip ? `${escapeHtml(trip.route_name)} · ${trip.direction === 'MORNING' ? 'Matin' : 'Après-midi'}` : 'Aucun trajet'}</p>
      ${childSwitcher()}
      <div class="tb-list">
        ${infoRow('clock-3', 'Horaires', trip ? `Départ ${formatTime(trip.scheduled_start_at)} · Retard ${trip.delay_minutes} min` : 'Non planifié')}
        ${infoRow('bus-front', 'Bus', trip ? `${trip.bus_label} · ${trip.registration}` : 'Non affecté')}
        ${infoRow('user-round', 'Chauffeur', trip ? trip.driver_name : 'Non affecté')}
        ${infoRow('user-check', 'Assistante', trip ? trip.assistant_name : 'Non affectée')}
        ${infoRow('route', 'Itinéraire', trip ? `${trip.origin} → ${trip.destination}` : 'Non renseigné')}
      </div>`);
  }

  function infoRow(glyph, title, meta) {
    return `
      <div class="tb-card tb-row">
        <span class="tb-action-icon">${icon(glyph)}</span>
        <div class="tb-row-body"><strong class="tb-row-title">${escapeHtml(title)}</strong><span class="tb-row-meta">${escapeHtml(meta)}</span></div>
      </div>`;
  }

  function mapPage() {
    const position = data.latestPosition || { latitude: 36.8081, longitude: 10.1801, speed_kmh: 0 };
    const delta = 0.012;
    const bbox = [
      position.longitude - delta,
      position.latitude - delta,
      position.longitude + delta,
      position.latitude + delta
    ].join(',');
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${position.latitude}%2C${position.longitude}`;
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">Carte en direct</h1>
      <p class="tb-subtitle">${trip ? `${escapeHtml(trip.route_name)} · ${escapeHtml(trip.registration)}` : 'Position non affectée'}</p>
      ${data.user.role === 'PARENT' ? childSwitcher() : ''}
      <div class="tb-map" style="margin-top:15px">
        <iframe src="${mapUrl}" title="Position du bus sur OpenStreetMap" loading="lazy"></iframe>
        <span class="tb-map-overlay">${badge(trip ? trip.status : 'PLANNED', trip && trip.status === 'IN_PROGRESS' ? 'En approche' : undefined)}</span>
      </div>
      <div class="tb-map-sheet">
        <strong class="tb-row-title">${trip ? `${escapeHtml(trip.route_name)} · ${escapeHtml(trip.registration)}` : 'Bus scolaire'}</strong>
        <div class="tb-map-metrics">
          <div class="tb-map-metric"><span>Distance arrêt</span><strong>850 m</strong></div>
          <div class="tb-map-metric"><span>ETA</span><strong>7 min</strong></div>
          <div class="tb-map-metric"><span>Vitesse</span><strong>${Math.round(position.speed_kmh || 0)} km/h</strong></div>
        </div>
        <button class="tb-button" type="button" data-action="share">${icon('share-2')} Partager le suivi</button>
      </div>`);
  }

  function historyPage() {
    const completed = data.trips.filter(trip => trip.status === 'COMPLETED');
    shell(`
      <h1 class="tb-title">Historique</h1>
      <p class="tb-subtitle">Retrouvez les trajets effectués et leurs horaires.</p>
      ${data.user.role === 'PARENT' ? childSwitcher() : ''}
      <div class="tb-list">
        ${completed.length ? completed.map(trip => `
          <div class="tb-card">
            <div class="tb-row">
              <span class="tb-action-icon">${icon(trip.direction === 'MORNING' ? 'sunrise' : 'sunset')}</span>
              <div class="tb-row-body">
                <strong class="tb-row-title">${formatDate(trip.scheduled_start_at, { weekday: 'long', day: '2-digit', month: 'short' })} · ${trip.direction === 'MORNING' ? 'matin' : 'après-midi'}</strong>
                <span class="tb-row-meta">${formatTime(trip.actual_start_at)} → ${formatTime(trip.actual_end_at)} · ${trip.delay_minutes ? `+${trip.delay_minutes} min` : 'À l’heure'}</span>
              </div>
              ${badge(trip.delay_minutes ? 'DELAY' : 'COMPLETED', trip.delay_minutes ? `+${trip.delay_minutes} min` : 'À l’heure')}
            </div>
          </div>`).join('') : '<div class="tb-empty">Aucun trajet terminé.</div>'}
      </div>`);
  }

  function notificationsPage() {
    shell(`
      <h1 class="tb-title">Notifications</h1>
      <p class="tb-subtitle">${data.notifications.filter(item => !item.read_at).length} notification(s) non lue(s).</p>
      <div class="tb-list">
        ${data.notifications.length ? data.notifications.map(item => `
          <button class="tb-card tb-row" style="width:100%;text-align:left" type="button" data-notification-id="${item.id}">
            <span class="tb-action-icon">${icon(item.type === 'DELAY' ? 'clock-alert' : item.type === 'INCIDENT' ? 'triangle-alert' : 'bell-ring')}</span>
            <span class="tb-row-body">
              <strong class="tb-row-title">${escapeHtml(item.title)}</strong>
              <span class="tb-row-meta">${escapeHtml(item.message)}</span>
              <span class="tb-row-meta">${formatDate(item.created_at)}</span>
            </span>
            ${item.read_at ? '' : '<span class="tb-badge info">Nouveau</span>'}
          </button>`).join('') : '<div class="tb-empty">Aucune notification.</div>'}
      </div>`);
  }

  function profilePage() {
    shell(`
      <h1 class="tb-title">Mes informations</h1>
      <div class="tb-user-summary" style="margin-top:22px">
        <span class="tb-avatar">${initials(data.user)}</span>
        <div><strong>${escapeHtml(data.user.first_name)} ${escapeHtml(data.user.last_name)}</strong><span>${roleLabels[data.user.role]}</span></div>
      </div>
      <div class="tb-list">
        ${infoRow('mail', 'Email', data.user.email)}
        ${infoRow('phone', 'Téléphone', data.user.phone || 'Non renseigné')}
        ${data.user.role === 'PARENT' ? infoRow('users', 'Mes enfants', `${data.students.length} enfant(s) inscrit(s)`) : ''}
      </div>
      ${data.user.role === 'PARENT' ? `<h2 class="tb-section-title">Mes enfants</h2>${childSwitcher()}` : ''}
      <button class="tb-button tb-button-secondary" style="margin-top:24px" type="button" data-action="logout">${icon('log-out')} Se déconnecter</button>`);
  }

  function incidentFormPage(title) {
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">${escapeHtml(title)}</h1>
      <p class="tb-subtitle">Décrivez précisément le problème rencontré.</p>
      <form class="tb-form" id="tb-incident-form">
        <div class="tb-field">
          <label for="incident-category">Catégorie</label>
          <select class="tb-select" id="incident-category" name="category" required>
            <option value="DELAY">Retard</option>
            <option value="BEHAVIOUR">Comportement</option>
            <option value="VEHICLE">Véhicule</option>
            <option value="ROUTE">Itinéraire</option>
            <option value="SAFETY">Sécurité</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>
        <div class="tb-field">
          <label for="incident-description">Description</label>
          <textarea class="tb-textarea" id="incident-description" name="description" placeholder="Votre message..." required></textarea>
        </div>
        <input type="hidden" name="trip_id" value="${trip ? trip.id : ''}">
        <button class="tb-button" type="submit">${icon('send')} Envoyer</button>
      </form>`);
  }

  function assistantHome() {
    const trip = data.currentTrip;
    shell(`
      <p class="tb-kicker">Bienvenue, ${escapeHtml(data.user.first_name)}</p>
      <div class="tb-user-summary">
        <span class="tb-avatar">${initials(data.user)}</span>
        <div><strong>${escapeHtml(data.user.first_name)} ${escapeHtml(data.user.last_name)}</strong><span>${roleLabels[data.user.role]}</span></div>
      </div>
      ${currentTripSummary()}
      <div class="tb-actions-grid">
        ${actionTile(trip && trip.status === 'IN_PROGRESS' ? '/assistante/trajet-arrets.html' : '/assistante/demarrer-trajet.html', 'play', trip && trip.status === 'IN_PROGRESS' ? 'Trajet en cours' : 'Démarrer le trajet', true)}
        ${actionTile('/assistante/enfants.html', 'users', 'Liste des élèves')}
        ${actionTile('/assistante/carte.html', 'map-pinned', 'Carte GPS')}
        ${actionTile('/assistante/historique.html', 'history', 'Historique')}
        ${actionTile('/assistante/notifications.html', 'bell', 'Notifications')}
        ${actionTile('/assistante/signaler-probleme.html', 'triangle-alert', 'Signaler')}
      </div>`);
  }

  function startTripPage() {
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">Démarrer le trajet ?</h1>
      <p class="tb-subtitle">Vérifiez l’affectation avant de confirmer.</p>
      <div style="margin-top:24px">${currentTripSummary()}</div>
      <div class="tb-list">
        ${infoRow('map-pinned', 'Itinéraire', trip ? `${trip.origin} → ${trip.destination}` : 'Non renseigné')}
        ${infoRow('users', 'Élèves attendus', `${data.students.length} élève(s)`)}
      </div>
      <button class="tb-button" style="margin-top:24px" type="button" data-trip-action="start" data-trip-id="${trip ? trip.id : ''}" ${trip ? '' : 'disabled'}>${icon('play')} Démarrer le trajet</button>`);
  }

  function childrenPage() {
    const latestEvents = new Map(data.studentEvents.map(event => [event.student_id, event]));
    shell(`
      <h1 class="tb-title">Liste des élèves</h1>
      <p class="tb-subtitle">${data.currentTrip ? escapeHtml(data.currentTrip.route_name) : 'Trajet non planifié'} · ${data.students.length} élève(s)</p>
      <div class="tb-list">
        ${data.students.map(student => {
          const event = latestEvents.get(student.id);
          const status = event ? event.event_type : 'WAITING';
          return `
            <div class="tb-card">
              <div class="tb-row">
                <span class="tb-avatar tb-avatar-sm">${initials(student)}</span>
                <div class="tb-row-body">
                  <strong class="tb-row-title">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</strong>
                  <span class="tb-row-meta">${escapeHtml(student.school_class || '')} · ${escapeHtml(student.home_address)}</span>
                </div>
                ${badge(status)}
              </div>
              <div class="tb-row-actions">
                ${['BOARDED', 'ABSENT', 'DROPPED_OFF'].map(eventType => `
                  <button class="tb-button tb-button-small ${eventType === 'ABSENT' ? 'tb-button-secondary' : ''}" type="button"
                    data-student-event="${eventType}" data-student-id="${student.id}">${statusLabels[eventType]}</button>`).join('')}
              </div>
            </div>`;
        }).join('')}
      </div>`);
  }

  function tripOperationsPage() {
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">${trip ? escapeHtml(trip.route_name) : 'Trajet'}</h1>
      <p class="tb-subtitle">${trip ? `${escapeHtml(trip.registration)} · ${statusLabels[trip.status]}` : 'Aucun trajet'}</p>
      <div class="tb-timeline">
        ${data.tripStops.map(stop => `
          <div class="tb-stop ${String(stop.status).toLowerCase()}"><strong>${escapeHtml(stop.name)}</strong><span>${escapeHtml(stop.address)} · ${statusLabels[stop.status]}</span></div>`).join('')}
      </div>
      <a class="tb-button tb-button-secondary" href="/assistante/enfants.html">${icon('users')} Gérer les élèves</a>
      <button class="tb-button tb-button-danger" style="margin-top:10px" type="button" data-trip-action="end" data-trip-id="${trip ? trip.id : ''}" ${trip && trip.status === 'IN_PROGRESS' ? '' : 'disabled'}>${icon('square')} Terminer le trajet</button>`);
  }

  function recapPage() {
    const trip = data.currentTrip;
    shell(`
      <h1 class="tb-title">Récapitulatif du trajet</h1>
      <p class="tb-subtitle">${trip ? escapeHtml(trip.route_name) : 'Trajet terminé'}</p>
      <div class="tb-grid tb-grid-2" style="margin-top:20px">
        ${metric('clock', trip ? `${Math.max(0, Math.round((new Date(trip.actual_end_at || Date.now()) - new Date(trip.actual_start_at || Date.now())) / 60000))} min` : '0 min', 'Durée')}
        ${metric('users', data.students.length, 'Élèves')}
        ${metric('map-pin', data.tripStops.length, 'Arrêts')}
        ${metric('timer', trip ? `${trip.delay_minutes} min` : '0 min', 'Retard')}
      </div>
      <a class="tb-button" style="margin-top:24px" href="/assistante/accueil.html">${icon('house')} Retour à l’accueil</a>`);
  }

  function metric(glyph, value, label) {
    return `<div class="tb-card tb-metric"><span class="tb-metric-icon">${icon(glyph)}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
  }

  function adminHome() {
    shell(`
      <p class="tb-kicker">Bienvenue, ${escapeHtml(data.user.first_name)}</p>
      <h1 class="tb-title">Administration</h1>
      <p class="tb-subtitle">Gérez les trajets, les équipes et les inscriptions.</p>
      <div class="tb-actions-grid">
        ${actionTile('/administration/dashboard.html', 'layout-dashboard', 'Dashboard', true)}
        ${actionTile('/administration/carte.html', 'map-pinned', 'Trajets en direct')}
        ${actionTile('/administration/liste-parents.html', 'users-round', 'Gérer les comptes')}
        ${actionTile('/administration/liste-bus.html', 'bus-front', 'Gérer les bus')}
        ${actionTile('/administration/liste-lignes.html', 'route', 'Gérer les lignes')}
        ${actionTile('/administration/ajouter-compte.html', 'circle-plus', 'Ajouter')}
      </div>
      ${data.registrationRequests.length ? `
        <h2 class="tb-section-title">Inscriptions à vérifier</h2>
        <div class="tb-list">
          ${data.registrationRequests.filter(item => item.status === 'PENDING').map(item => `
            <div class="tb-card">
              <div class="tb-row">
                <span class="tb-action-icon">${icon('user-plus')}</span>
                <div class="tb-row-body">
                  <strong class="tb-row-title">${escapeHtml(item.first_name)} ${escapeHtml(item.last_name)}</strong>
                  <span class="tb-row-meta">${escapeHtml(item.email)} · ${roleLabels[item.requested_role]}</span>
                </div>
              </div>
              <div class="tb-row-actions">
                <button class="tb-button tb-button-small" type="button" data-registration-id="${item.id}" data-registration-status="APPROVED">Approuver</button>
                <button class="tb-button tb-button-small tb-button-secondary" type="button" data-registration-id="${item.id}" data-registration-status="REJECTED">Refuser</button>
              </div>
            </div>`).join('')}
        </div>` : ''}`);
  }

  function adminDashboard() {
    const activeBuses = data.buses.filter(bus => bus.status === 'IN_SERVICE').length;
    const openIncidents = data.incidents.filter(item => item.status === 'OPEN' || item.status === 'IN_REVIEW').length;
    shell(`
      <p class="tb-kicker">Vue d’ensemble</p>
      <h1 class="tb-title">Dashboard</h1>
      <div class="tb-grid tb-grid-2" style="margin-top:18px">
        ${metric('bus-front', activeBuses, 'Bus actifs')}
        ${metric('graduation-cap', data.students.length, 'Élèves')}
        ${metric('clock-alert', data.trips.filter(trip => trip.delay_minutes > 0).length, 'Retards')}
        ${metric('triangle-alert', openIncidents, 'Incidents')}
      </div>
      <h2 class="tb-section-title">Trajets récents</h2>
      <div class="tb-table">
        <div class="tb-table-row tb-table-head"><span>Type</span><span>Ligne</span><span>Bus</span><span>Statut</span></div>
        ${data.trips.slice(0, 5).map(trip => `
          <div class="tb-table-row"><span>${trip.direction === 'MORNING' ? 'Matin' : 'Après-midi'}</span><span>${escapeHtml(trip.route_name)}</span><span>${escapeHtml(trip.registration)}</span><span>${badge(trip.status)}</span></div>`).join('')}
      </div>`);
  }

  const manageConfigs = {
    'liste-parents.html': {
      title: 'Liste des parents',
      role: 'PARENT',
      add: '/administration/ajouter-parent.html',
      glyph: 'users',
      meta: item => item.email
    },
    'liste-chauffeurs.html': {
      title: 'Liste des chauffeurs',
      role: 'DRIVER',
      add: '/administration/ajouter-chauffeur.html',
      glyph: 'steering-wheel',
      meta: item => item.phone || item.email
    },
    'liste-assistantes.html': {
      title: 'Liste des assistantes',
      role: 'ASSISTANT',
      add: '/administration/ajouter-assistante.html',
      glyph: 'user-check',
      meta: item => item.phone || item.email
    },
    'liste-enfants.html': {
      title: 'Liste des enfants',
      collection: 'students',
      add: '/administration/affecter-enfants.html',
      glyph: 'graduation-cap',
      meta: item => `${item.school_class || 'Classe non renseignée'} · ${item.parent_name}`
    },
    'liste-bus.html': {
      title: 'Liste des bus',
      collection: 'buses',
      add: '/administration/ajouter-bus.html',
      glyph: 'bus-front',
      meta: item => `${item.registration} · ${item.capacity} places`
    },
    'liste-lignes.html': {
      title: 'Liste des lignes',
      collection: 'routes',
      add: '/administration/ajouter-ligne.html',
      glyph: 'route',
      meta: item => `${item.origin} → ${item.destination}`
    }
  };

  function matchingManageConfig() {
    return Object.entries(manageConfigs).find(([file]) => path.endsWith(file));
  }

  function manageListPage(file, config) {
    const items = config.role ? data.users.filter(user => user.role === config.role) : data[config.collection];
    shell(`
      <h1 class="tb-title">${escapeHtml(config.title)}</h1>
      <p class="tb-subtitle">${items.length} élément(s) enregistré(s).</p>
      <div class="tb-list">
        ${items.length ? items.map(item => `
          <div class="tb-card tb-row">
            <span class="tb-action-icon">${icon(config.glyph)}</span>
            <div class="tb-row-body">
              <strong class="tb-row-title">${escapeHtml(item.first_name ? `${item.first_name} ${item.last_name}` : item.name || item.label)}</strong>
              <span class="tb-row-meta">${escapeHtml(config.meta(item))}</span>
            </div>
            ${item.status ? badge(item.status) : item.active === 0 ? badge('INACTIVE') : badge('AVAILABLE', 'Actif')}
          </div>`).join('') : '<div class="tb-empty">Aucun élément enregistré.</div>'}
      </div>`, { fab: { href: config.add, label: 'Ajouter', icon: 'plus' } });
  }

  function accountTypePage() {
    shell(`
      <h1 class="tb-title">Ajouter un compte</h1>
      <p class="tb-subtitle">Sélectionnez le type de compte à créer.</p>
      <div class="tb-actions-grid">
        ${actionTile('/administration/ajouter-parent.html', 'users', 'Parent', true)}
        ${actionTile('/administration/ajouter-chauffeur.html', 'steering-wheel', 'Chauffeur')}
        ${actionTile('/administration/ajouter-assistante.html', 'user-check', 'Assistante')}
        ${actionTile('/administration/ajouter-admin.html', 'shield-check', 'Administration')}
      </div>`);
  }

  function userFormPage(role, title) {
    shell(`
      <h1 class="tb-title">${escapeHtml(title)}</h1>
      <form class="tb-form" data-entity-form="users">
        <input type="hidden" name="role" value="${role}">
        <div class="tb-form-row">
          ${field('first_name', 'Prénom', 'text')}
          ${field('last_name', 'Nom', 'text')}
        </div>
        ${field('email', 'Email', 'email')}
        ${field('phone', 'Téléphone', 'tel')}
        ${field('password', 'Mot de passe initial', 'password', 'demo1234')}
        <button class="tb-button" type="submit">${icon('user-plus')} Ajouter</button>
      </form>`);
  }

  function field(name, label, type, value) {
    return `<div class="tb-field"><label for="field-${name}">${escapeHtml(label)}</label><input class="tb-input" id="field-${name}" name="${name}" type="${type || 'text'}" value="${escapeHtml(value || '')}" required></div>`;
  }

  function busFormPage() {
    shell(`
      <h1 class="tb-title">Ajouter un bus</h1>
      <form class="tb-form" data-entity-form="buses">
        ${field('label', 'Nom du bus', 'text')}
        ${field('registration', 'Immatriculation', 'text')}
        ${field('capacity', 'Capacité', 'number', '30')}
        ${field('gps_device_uid', 'Identifiant GPS', 'text')}
        <input type="hidden" name="status" value="AVAILABLE">
        <button class="tb-button" type="submit">${icon('plus')} Ajouter le bus</button>
      </form>`);
  }

  function routeFormPage() {
    shell(`
      <h1 class="tb-title">Ajouter une ligne</h1>
      <form class="tb-form" data-entity-form="routes">
        <div class="tb-form-row">${field('code', 'Code', 'text')}${field('name', 'Nom', 'text')}</div>
        ${field('origin', 'Départ', 'text')}
        ${field('destination', 'Destination', 'text')}
        <div class="tb-form-row">${field('morning_time', 'Départ matin', 'time', '07:30')}${field('afternoon_time', 'Départ après-midi', 'time', '16:30')}</div>
        <button class="tb-button" type="submit">${icon('route')} Ajouter la ligne</button>
      </form>`);
  }

  function assignmentPage(kind) {
    const title = {
      assistant: 'Affecter les assistantes',
      driver: 'Affecter les chauffeurs',
      student: 'Affecter les enfants',
      route: 'Affecter les trajets'
    }[kind];
    if (kind === 'student') {
      shell(`
        <h1 class="tb-title">${title}</h1>
        <p class="tb-subtitle">Les inscriptions actives sont chargées depuis la base.</p>
        <div class="tb-list">${data.students.map(student => `
          <div class="tb-card tb-row"><span class="tb-avatar tb-avatar-sm">${initials(student)}</span><div class="tb-row-body"><strong class="tb-row-title">${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}</strong><span class="tb-row-meta">${escapeHtml(student.home_address)}</span></div>${badge('AVAILABLE', 'Inscrit')}</div>`).join('')}</div>`);
      return;
    }
    shell(`
      <h1 class="tb-title">${escapeHtml(title)}</h1>
      <p class="tb-subtitle">Affectations actives par ligne et par bus.</p>
      <div class="tb-list">
        ${data.assignments.map(item => `
          <div class="tb-card">
            <strong class="tb-row-title">${escapeHtml(item.route_name)}</strong>
            <span class="tb-row-meta">${escapeHtml(item.registration)} · ${escapeHtml(item.driver_name)}</span>
            <span class="tb-row-meta">${escapeHtml(item.assistant_name)}</span>
          </div>`).join('')}
      </div>`);
  }

  function claimsPage() {
    shell(`
      <h1 class="tb-title">Réclamations</h1>
      <p class="tb-subtitle">${data.incidents.filter(item => item.status === 'OPEN').length} demande(s) à traiter.</p>
      <div class="tb-list">
        ${data.incidents.length ? data.incidents.map(item => `
          <div class="tb-card">
            <div class="tb-row">
              <span class="tb-action-icon">${icon('triangle-alert')}</span>
              <div class="tb-row-body">
                <strong class="tb-row-title">${escapeHtml(item.reporter_name || 'Utilisateur')} · ${escapeHtml(item.category)}</strong>
                <span class="tb-row-meta">${escapeHtml(item.description)}</span>
                <span class="tb-row-meta">${formatDate(item.created_at)}</span>
              </div>
              ${badge(item.status)}
            </div>
            ${item.status !== 'RESOLVED' ? `<div class="tb-row-actions"><button class="tb-button tb-button-small" type="button" data-incident-id="${item.id}" data-incident-status="IN_REVIEW">Examiner</button><button class="tb-button tb-button-small tb-button-secondary" type="button" data-incident-id="${item.id}" data-incident-status="RESOLVED">Résoudre</button></div>` : ''}
          </div>`).join('') : '<div class="tb-empty">Aucune réclamation.</div>'}
      </div>`);
  }

  function adminMapPage() {
    mapPage();
  }

  function routeCurrentPage() {
    if (path.endsWith('/parent/accueil.html')) return parentHome();
    if (path.endsWith('/parent/trajet-arrets.html')) return timelinePage('Trajet', 'Suivi des arrêts en temps réel');
    if (path.endsWith('/parent/informations-trajet.html')) return informationPage();
    if (path.endsWith('/parent/carte.html')) return mapPage();
    if (path.endsWith('/parent/historique.html')) return historyPage();
    if (path.endsWith('/parent/notifications.html')) return notificationsPage();
    if (path.endsWith('/parent/profil.html')) return profilePage();
    if (path.endsWith('/parent/reclamation.html')) return incidentFormPage('Réclamation');

    if (path.endsWith('/assistante/accueil.html')) return assistantHome();
    if (path.endsWith('/assistante/demarrer-trajet.html')) return startTripPage();
    if (path.endsWith('/assistante/trajet-arrets.html')) return tripOperationsPage();
    if (path.endsWith('/assistante/recapitulatif-trajet.html')) return recapPage();
    if (path.endsWith('/assistante/enfants.html')) return childrenPage();
    if (path.endsWith('/assistante/carte.html')) return mapPage();
    if (path.endsWith('/assistante/historique.html')) return historyPage();
    if (path.endsWith('/assistante/notifications.html')) return notificationsPage();
    if (path.endsWith('/assistante/profil.html')) return profilePage();
    if (path.endsWith('/assistante/signaler-probleme.html')) return incidentFormPage('Signaler un problème');

    if (path.endsWith('/administration/accueil.html')) return adminHome();
    if (path.endsWith('/administration/dashboard.html')) return adminDashboard();
    if (path.endsWith('/administration/carte.html')) return adminMapPage();
    if (path.endsWith('/administration/profil.html')) return profilePage();
    if (path.endsWith('/administration/reclamations.html')) return claimsPage();
    if (path.endsWith('/administration/signaler-probleme.html')) return incidentFormPage('Signaler un problème');
    if (path.endsWith('/administration/ajouter-compte.html')) return accountTypePage();
    if (path.endsWith('/administration/ajouter-parent.html')) return userFormPage('PARENT', 'Ajouter un parent');
    if (path.endsWith('/administration/ajouter-chauffeur.html')) return userFormPage('DRIVER', 'Ajouter un chauffeur');
    if (path.endsWith('/administration/ajouter-assistante.html')) return userFormPage('ASSISTANT', 'Ajouter une assistante');
    if (path.endsWith('/administration/ajouter-admin.html')) return userFormPage('ADMIN', 'Ajouter un administrateur');
    if (path.endsWith('/administration/ajouter-bus.html')) return busFormPage();
    if (path.endsWith('/administration/ajouter-ligne.html')) return routeFormPage();
    if (path.endsWith('/administration/affecter-assistantes.html')) return assignmentPage('assistant');
    if (path.endsWith('/administration/affecter-chauffeurs.html')) return assignmentPage('driver');
    if (path.endsWith('/administration/affecter-enfants.html')) return assignmentPage('student');
    if (path.endsWith('/administration/affecter-trajet.html')) return assignmentPage('route');

    const manage = matchingManageConfig();
    if (manage) return manageListPage(manage[0], manage[1]);
    return data.user.role === 'ADMIN' ? adminHome() : data.user.role === 'PARENT' ? parentHome() : assistantHome();
  }

  async function reloadData(message) {
    data = await api('/bootstrap');
    localStorage.setItem(cacheKey, JSON.stringify(data));
    routeCurrentPage();
    if (message) showToast(message);
  }

  async function handleSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.id === 'tb-login-form') {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
        storeSession(result);
        location.href = roleRoutes[result.user.role] || '/parent/accueil.html';
      } catch (error) {
        showToast(error.message);
        button.disabled = false;
      }
      return;
    }

    if (form.id === 'tb-forgot-form') {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const result = await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) });
        showToast(result.message);
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    if (form.id === 'tb-registration-form') {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const result = await api('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
        form.reset();
        showToast(result.message);
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    if (form.id === 'tb-incident-form') {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.trip_id = payload.trip_id ? Number(payload.trip_id) : null;
        await api('/incidents', { method: 'POST', body: JSON.stringify(payload) });
        await reloadData('Signalement envoyé');
        form.reset();
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    if (form.dataset.entityForm) {
      event.preventDefault();
      try {
        const payload = Object.fromEntries(new FormData(form).entries());
        ['capacity', 'parent_id', 'home_lat', 'home_lng', 'alert_radius_m'].forEach(key => {
          if (payload[key] !== undefined && payload[key] !== '') payload[key] = Number(payload[key]);
        });
        await api(`/${form.dataset.entityForm}`, { method: 'POST', body: JSON.stringify(payload) });
        form.reset();
        showToast('Enregistrement ajouté');
      } catch (error) {
        showToast(error.message);
      }
    }
  }

  async function handleClick(event) {
    const demo = event.target.closest('[data-demo-email]');
    if (demo) {
      document.getElementById('login-email').value = demo.dataset.demoEmail;
      return;
    }

    const student = event.target.closest('[data-student-id]:not([data-student-event])');
    if (student) {
      localStorage.setItem(selectedStudentKey, student.dataset.studentId);
      routeCurrentPage();
      return;
    }

    const action = event.target.closest('[data-action]');
    if (action) {
      if (action.dataset.action === 'logout') {
        try { await api('/auth/logout', { method: 'POST' }); } catch (_) {}
        clearSession();
        location.href = `${rootUrl}auth/connexion.html`;
      }
      if (action.dataset.action === 'share') {
        try {
          if (navigator.share) await navigator.share({ title: 'Suivi du bus scolaire', url: location.href });
          else await navigator.clipboard.writeText(location.href);
          showToast('Lien de suivi partagé');
        } catch (_) {
          showToast('Partage annulé');
        }
      }
      return;
    }

    const notification = event.target.closest('[data-notification-id]');
    if (notification) {
      try {
        await api(`/notifications/${notification.dataset.notificationId}/read`, { method: 'PATCH' });
        await reloadData('Notification lue');
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const tripAction = event.target.closest('[data-trip-action]');
    if (tripAction) {
      try {
        const result = await api(`/trips/${tripAction.dataset.tripId}/${tripAction.dataset.tripAction}`, { method: 'POST' });
        await reloadData(result.status === 'IN_PROGRESS' ? 'Trajet démarré' : 'Trajet terminé');
        if (tripAction.dataset.tripAction === 'end') location.href = '/assistante/recapitulatif-trajet.html';
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const studentEvent = event.target.closest('[data-student-event]');
    if (studentEvent) {
      try {
        await api('/student-events', {
          method: 'POST',
          body: JSON.stringify({
            trip_id: data.currentTrip.id,
            student_id: Number(studentEvent.dataset.studentId),
            event_type: studentEvent.dataset.studentEvent
          })
        });
        await reloadData('État de l’élève mis à jour');
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const incidentAction = event.target.closest('[data-incident-id]');
    if (incidentAction) {
      try {
        await api(`/incidents/${incidentAction.dataset.incidentId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: incidentAction.dataset.incidentStatus })
        });
        await reloadData('Réclamation mise à jour');
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    const registrationAction = event.target.closest('[data-registration-id]');
    if (registrationAction) {
      try {
        await api(`/registration-requests/${registrationAction.dataset.registrationId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: registrationAction.dataset.registrationStatus })
        });
        await reloadData(registrationAction.dataset.registrationStatus === 'APPROVED'
          ? 'Compte créé avec le mot de passe temporaire demo1234'
          : 'Demande refusée');
      } catch (error) {
        showToast(error.message);
      }
    }
  }

  function startGpsTracking() {
    if (gpsWatchId !== null
      || !navigator.geolocation
      || !data.currentTrip
      || data.currentTrip.status !== 'IN_PROGRESS'
      || !['DRIVER', 'ASSISTANT'].includes(data.user.role)) return;
    gpsWatchId = navigator.geolocation.watchPosition(async position => {
      const now = Date.now();
      if (now - lastGpsSentAt < 10000) return;
      lastGpsSentAt = now;
      try {
        await api('/gps', {
          method: 'POST',
          body: JSON.stringify({
            trip_id: data.currentTrip.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : 0,
            heading: position.coords.heading || 0,
            accuracy_m: position.coords.accuracy
          })
        });
      } catch (_) {}
    }, () => {}, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  }

  async function init() {
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('click', handleClick);

    if (path.endsWith('/screens.html')) return;
    if ((path === '/' || path.endsWith('/index.html')) && document.getElementById('react-root')) return;
    if (path.endsWith('/auth/connexion.html')) return loginPage();
    if (path.endsWith('/auth/inscription.html')) return registrationPage();
    if (path.endsWith('/auth/mot-de-passe-oublie.html')) return forgotPage();
    if (isAuthPage()) return splashPage();

    const token = localStorage.getItem(tokenKey);
    if (!token) return loginPage();

    document.body.className = 'tb-modern';
    document.body.innerHTML = `<main class="app-stage"><section class="tb-app"><div class="tb-loading"><div><div class="tb-spinner"></div>Chargement des données...</div></div></section></main>`;

    try {
      data = await api('/bootstrap');
      localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        return loginPage();
      }
      try {
        data = JSON.parse(localStorage.getItem(cacheKey));
      } catch (_) {
        data = null;
      }
      if (!data) {
        return shell(`<div class="tb-error">Impossible de joindre l’API. Vérifiez que le serveur est démarré sur ${escapeHtml(apiBase)}.</div>`, { auth: true });
      }
    }

    const expectedArea = currentArea();
    const role = data.user.role;
    const allowed = expectedArea === 'ADMIN'
      ? role === 'ADMIN'
      : expectedArea === 'PARENT'
        ? role === 'PARENT'
        : expectedArea === 'ASSISTANT'
          ? role === 'DRIVER' || role === 'ASSISTANT'
          : true;
    if (!allowed) {
      location.href = roleRoutes[role];
      return;
    }
    routeCurrentPage();
    startGpsTracking();
  }

  init();
})();
