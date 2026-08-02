'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { openDatabase, verifyPassword, hashPassword } = require('./database');

const PORT = Number(process.env.PORT || 9000);
const ROOT = path.join(__dirname, 'www');
const db = openDatabase();
const sessions = new Map();
const refreshTokens = new Map();
const ACCESS_TOKEN_TTL_MS = positiveDuration(process.env.ACCESS_TOKEN_TTL_MS, 15 * 60 * 1000);
const SESSION_TTL_MS = positiveDuration(process.env.SESSION_TTL_MS, 8 * 60 * 60 * 1000);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function json(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Corps JSON invalide'));
      }
    });
    req.on('error', reject);
  });
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, normalized);
  return filePath.startsWith(ROOT) ? filePath : null;
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash: _, ...safe } = user;
  return safe;
}

function positiveDuration(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function bearerToken(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

const UTILISATEUR_API_COLUMNS = `
  id, identifiant, typeCompte AS role, prenom AS first_name, nom AS last_name,
  email, telephone AS phone, motDePasse AS password_hash, urlAvatar AS avatar_url,
  actif AS active, creeLe AS created_at, modifieLe AS updated_at
`;

function findActiveUserById(id) {
  return db.prepare(`SELECT ${UTILISATEUR_API_COLUMNS} FROM Utilisateur WHERE id = ? AND actif = 1`).get(id) || null;
}

function revokeSession(session) {
  if (!session) return;
  sessions.delete(session.accessTokenHash);
  refreshTokens.delete(session.refreshTokenHash);
}

function pruneExpiredSessions(now = Date.now()) {
  for (const session of refreshTokens.values()) {
    if (session.sessionExpiresAt <= now) revokeSession(session);
  }
}

function issueSession(userId, sessionExpiresAt = Date.now() + SESSION_TTL_MS) {
  const now = Date.now();
  pruneExpiredSessions(now);
  const accessToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const session = {
    userId,
    accessTokenHash: tokenHash(accessToken),
    refreshTokenHash: tokenHash(refreshToken),
    accessExpiresAt: Math.min(now + ACCESS_TOKEN_TTL_MS, sessionExpiresAt),
    sessionExpiresAt
  };
  sessions.set(session.accessTokenHash, session);
  refreshTokens.set(session.refreshTokenHash, session);
  return {
    token: accessToken,
    refresh_token: refreshToken,
    expires_at: new Date(session.accessExpiresAt).toISOString(),
    session_expires_at: new Date(session.sessionExpiresAt).toISOString()
  };
}

function authenticate(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const session = sessions.get(tokenHash(token));
  if (!session) return null;
  const now = Date.now();
  if (session.accessExpiresAt <= now || session.sessionExpiresAt <= now) {
    sessions.delete(session.accessTokenHash);
    if (session.sessionExpiresAt <= now) refreshTokens.delete(session.refreshTokenHash);
    return null;
  }
  const user = findActiveUserById(session.userId);
  if (!user) {
    revokeSession(session);
    return null;
  }
  return { user, session };
}

function requireRole(res, user, roles) {
  if (!user) {
    json(res, 401, { error: 'Authentification requise' });
    return false;
  }
  if (roles && !roles.includes(user.role)) {
    json(res, 403, { error: 'Action non autorisée pour ce rôle' });
    return false;
  }
  return true;
}

function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}

function canOperateTrip(user, trip) {
  return user.role === 'ADMIN' || trip.driver_id === user.id || trip.assistant_id === user.id;
}

function findTripById(id) {
  return db.prepare(`SELECT id, idTrajet AS route_id, idBus AS bus_id,
    idChauffeur AS driver_id, idAssistante AS assistant_id, sens AS direction,
    statut AS status, departPrevuLe AS scheduled_start_at, departReelLe AS actual_start_at,
    finReelleLe AS actual_end_at, retardMinutes AS delay_minutes
    FROM ExecutionTrajet WHERE id = ?`).get(id) || null;
}

function notifyRouteParents(routeId, tripId, type, title, message) {
  const parents = all(`
    SELECT DISTINCT e.idParent AS parent_id FROM TrajetEnfant te
    JOIN Enfant e ON e.id = te.idEnfant
    WHERE te.idTrajet = ? AND te.actif = 1 AND e.actif = 1
  `, routeId);
  const statement = db.prepare(`
    INSERT INTO Notification(idUtilisateur, idExecutionTrajet, type, titre, message)
    VALUES (?, ?, ?, ?, ?)
  `);
  parents.forEach(parent => statement.run(parent.parent_id, tripId, type, title, message));
}

function buildBootstrap(user) {
  const isAdmin = user.role === 'ADMIN';
  const staffFilter = user.role === 'DRIVER'
    ? 'WHERE a.idChauffeur = ?'
    : user.role === 'ASSISTANT' ? 'WHERE a.idAssistante = ?' : '';
  const staffParams = staffFilter ? [user.id] : [];

  const enfantColumns = `
    e.id, e.idParent AS parent_id, e.prenom AS first_name, e.nom AS last_name,
    e.dateNaissance AS birth_date, e.classe AS school_class, e.adresseDomicile AS home_address,
    e.latitudeDomicile AS home_lat, e.longitudeDomicile AS home_lng,
    e.rayonAlerteM AS alert_radius_m, e.idEtablissement AS establishment_id,
    e.actif AS active, e.creeLe AS created_at, e.modifieLe AS updated_at,
    u.prenom || ' ' || u.nom AS parent_name
  `;
  const students = user.role === 'PARENT'
    ? all(`SELECT ${enfantColumns} FROM Enfant e JOIN Utilisateur u ON u.id = e.idParent
           WHERE e.idParent = ? ORDER BY e.prenom`, user.id)
    : all(`SELECT ${enfantColumns} FROM Enfant e JOIN Utilisateur u ON u.id = e.idParent ORDER BY e.prenom`);

  const assignments = all(`
    SELECT a.id, a.idTrajet AS route_id, a.idBus AS bus_id, a.idChauffeur AS driver_id,
      a.idAssistante AS assistant_id, a.debutLe AS starts_on, a.finLe AS ends_on,
      a.actif AS active, a.creeLe AS created_at,
      r.nomTrajet AS route_name, r.code AS route_code, b.matricule AS registration, b.libelle AS bus_label,
      d.prenom || ' ' || d.nom AS driver_name,
      COALESCE(ast.prenom || ' ' || ast.nom, 'Non affectée') AS assistant_name
    FROM Affectation a
    JOIN Trajet r ON r.id = a.idTrajet
    JOIN Bus b ON b.id = a.idBus
    JOIN Utilisateur d ON d.id = a.idChauffeur
    LEFT JOIN Utilisateur ast ON ast.id = a.idAssistante
    ${staffFilter}
    ORDER BY a.actif DESC, r.code
  `, ...staffParams);

  let tripWhere = '';
  let tripParams = [];
  if (user.role === 'PARENT') {
    tripWhere = `WHERE t.idTrajet IN (
      SELECT DISTINCT te.idTrajet FROM TrajetEnfant te
      JOIN Enfant e ON e.id = te.idEnfant WHERE e.idParent = ?
    )`;
    tripParams = [user.id];
  } else if (user.role === 'DRIVER') {
    tripWhere = 'WHERE t.idChauffeur = ?';
    tripParams = [user.id];
  } else if (user.role === 'ASSISTANT') {
    tripWhere = 'WHERE t.idAssistante = ?';
    tripParams = [user.id];
  }

  const trips = all(`
    SELECT t.id, t.idTrajet AS route_id, t.idBus AS bus_id, t.idChauffeur AS driver_id,
      t.idAssistante AS assistant_id, t.sens AS direction, t.statut AS status,
      t.departPrevuLe AS scheduled_start_at, t.departReelLe AS actual_start_at,
      t.finReelleLe AS actual_end_at, t.retardMinutes AS delay_minutes,
      t.creeLe AS created_at, t.modifieLe AS updated_at,
      r.nomTrajet AS route_name, r.code AS route_code, r.origine AS origin, r.destination,
      b.matricule AS registration, b.libelle AS bus_label,
      d.prenom || ' ' || d.nom AS driver_name,
      COALESCE(ast.prenom || ' ' || ast.nom, 'Non affectée') AS assistant_name
    FROM ExecutionTrajet t
    JOIN Trajet r ON r.id = t.idTrajet
    JOIN Bus b ON b.id = t.idBus
    JOIN Utilisateur d ON d.id = t.idChauffeur
    LEFT JOIN Utilisateur ast ON ast.id = t.idAssistante
    ${tripWhere}
    ORDER BY datetime(t.departPrevuLe) DESC
    LIMIT 60
  `, ...tripParams);

  const currentTrip = trips.find(trip => trip.status === 'IN_PROGRESS')
    || trips.find(trip => trip.status === 'PLANNED')
    || trips[0]
    || null;

  const tripStops = currentTrip ? all(`
    SELECT ae.idExecutionTrajet AS trip_id, ae.idArret AS stop_id, ae.prevuLe AS planned_at,
      ae.arriveLe AS arrived_at, ae.statut AS status, a.nom AS name, a.adresse AS address,
      a.latitude, a.longitude, a.ordreArret AS stop_order, a.estimationTemps AS planned_offset_min
    FROM ArretExecution ae JOIN Arret a ON a.id = ae.idArret
    WHERE ae.idExecutionTrajet = ? ORDER BY a.ordreArret
  `, currentTrip.id) : [];

  const latestPosition = currentTrip ? db.prepare(`
    SELECT id, idBus AS bus_id, idExecutionTrajet AS trip_id, latitude, longitude,
      vitesseKmh AS speed_kmh, direction AS heading, precisionM AS accuracy_m,
      enregistreLe AS recorded_at
    FROM PositionGPS WHERE idBus = ? ORDER BY datetime(enregistreLe) DESC LIMIT 1
  `).get(currentTrip.bus_id) || null : null;

  const notifications = isAdmin
    ? all(`SELECT n.id, n.idUtilisateur AS user_id, n.idExecutionTrajet AS trip_id, n.type,
             n.titre AS title, n.message, n.luLe AS read_at, n.creeLe AS created_at,
             u.prenom || ' ' || u.nom AS user_name
           FROM Notification n JOIN Utilisateur u ON u.id = n.idUtilisateur
           ORDER BY datetime(n.creeLe) DESC LIMIT 60`)
    : all(`SELECT id, idUtilisateur AS user_id, idExecutionTrajet AS trip_id, type,
             titre AS title, message, luLe AS read_at, creeLe AS created_at
           FROM Notification WHERE idUtilisateur = ? ORDER BY datetime(creeLe) DESC LIMIT 60`, user.id);

  const incidents = isAdmin
    ? all(`SELECT i.id, i.signalePar AS reporter_id, i.idExecutionTrajet AS trip_id,
             i.type AS category, i.description, i.retardMinutes AS delay_minutes,
             i.statut AS status, i.resolution, i.creeLe AS created_at, i.resoluLe AS resolved_at,
             u.prenom || ' ' || u.nom AS reporter_name, r.nomTrajet AS route_name
           FROM Incident i JOIN Utilisateur u ON u.id = i.signalePar
           LEFT JOIN ExecutionTrajet t ON t.id = i.idExecutionTrajet LEFT JOIN Trajet r ON r.id = t.idTrajet
           ORDER BY datetime(i.creeLe) DESC`)
    : all(`SELECT i.id, i.signalePar AS reporter_id, i.idExecutionTrajet AS trip_id,
             i.type AS category, i.description, i.retardMinutes AS delay_minutes,
             i.statut AS status, i.resolution, i.creeLe AS created_at, i.resoluLe AS resolved_at,
             u.prenom || ' ' || u.nom AS reporter_name, r.nomTrajet AS route_name
           FROM Incident i JOIN Utilisateur u ON u.id = i.signalePar
           LEFT JOIN ExecutionTrajet t ON t.id = i.idExecutionTrajet LEFT JOIN Trajet r ON r.id = t.idTrajet
           WHERE i.signalePar = ? ORDER BY datetime(i.creeLe) DESC`, user.id);

  const studentEvents = currentTrip ? all(`
    SELECT p.id, p.idExecutionTrajet AS trip_id, p.idEnfant AS student_id,
      p.statut AS event_type, p.enregistrePar AS recorded_by, p.enregistreLe AS recorded_at,
      e.prenom AS first_name, e.nom AS last_name FROM PresenceEnfant p
    JOIN Enfant e ON e.id = p.idEnfant
    WHERE p.idExecutionTrajet = ? AND p.id IN (
      SELECT MAX(id) FROM PresenceEnfant WHERE idExecutionTrajet = ? GROUP BY idEnfant
    ) ORDER BY e.prenom
  `, currentTrip.id, currentTrip.id) : [];

  return {
    user: publicUser(user),
    students,
    buses: all(`SELECT id, matricule AS registration, libelle AS label, capacite AS capacity,
      statut AS status, identifiantGPS AS gps_device_uid, derniereMaintenanceLe AS last_maintenance_at,
      creeLe AS created_at, modifieLe AS updated_at FROM Bus ORDER BY libelle`),
    routes: all(`SELECT id, code, nomTrajet AS name, origine AS origin, destination,
      heureMatin AS morning_time, heureApresMidi AS afternoon_time, tempsTotalEstime AS estimated_total_time,
      actif AS active, creeLe AS created_at, modifieLe AS updated_at FROM Trajet ORDER BY code`),
    stops: all(`SELECT id, idTrajet AS route_id, nom AS name, adresse AS address, latitude, longitude,
      ordreArret AS stop_order, estimationTemps AS planned_offset_min FROM Arret ORDER BY idTrajet, ordreArret`),
    routeStudents: all(`SELECT idTrajet AS route_id, idEnfant AS student_id, idArret AS stop_id,
      actif AS active, affecteLe AS assigned_at FROM TrajetEnfant WHERE actif = 1`),
    assignments,
    trips,
    currentTrip,
    tripStops,
    studentEvents,
    latestPosition,
    notifications,
    incidents,
    users: isAdmin ? all(`SELECT id, identifiant, typeCompte AS role, prenom AS first_name,
                          nom AS last_name, email, telephone AS phone, actif AS active, creeLe AS created_at
                          FROM Utilisateur ORDER BY typeCompte, prenom`) : [],
    registrationRequests: isAdmin ? all(`SELECT id, typeCompteDemande AS requested_role,
      prenom AS first_name, nom AS last_name, email, telephone AS phone, statut AS status,
      examinePar AS reviewed_by, creeLe AS created_at, examineLe AS reviewed_at
      FROM DemandeInscription ORDER BY datetime(creeLe) DESC`) : []
  };
}

const entityConfig = {
  users: {
    roles: ['ADMIN'],
    table: 'Utilisateur',
    fields: ['identifier', 'role', 'first_name', 'last_name', 'email', 'phone', 'active'],
    columns: { identifier: 'identifiant', role: 'typeCompte', first_name: 'prenom', last_name: 'nom', email: 'email', phone: 'telephone', active: 'actif', password_hash: 'motDePasse' },
    required: ['role', 'first_name', 'last_name', 'email'],
    transform: data => ({
      ...data,
      identifier: data.identifier || db.prepare('SELECT COALESCE(MAX(identifiant), 1000) + 1 AS value FROM Utilisateur').get().value,
      password_hash: hashPassword(data.password || 'demo1234')
    })
  },
  students: {
    roles: ['ADMIN'],
    table: 'Enfant',
    fields: ['parent_id', 'first_name', 'last_name', 'birth_date', 'school_class', 'home_address', 'home_lat', 'home_lng', 'alert_radius_m', 'active'],
    columns: { parent_id: 'idParent', first_name: 'prenom', last_name: 'nom', birth_date: 'dateNaissance', school_class: 'classe', home_address: 'adresseDomicile', home_lat: 'latitudeDomicile', home_lng: 'longitudeDomicile', alert_radius_m: 'rayonAlerteM', active: 'actif' },
    required: ['parent_id', 'first_name', 'last_name', 'home_address', 'home_lat', 'home_lng']
  },
  buses: {
    roles: ['ADMIN'],
    table: 'Bus',
    fields: ['registration', 'label', 'capacity', 'status', 'gps_device_uid', 'last_maintenance_at'],
    columns: { registration: 'matricule', label: 'libelle', capacity: 'capacite', status: 'statut', gps_device_uid: 'identifiantGPS', last_maintenance_at: 'derniereMaintenanceLe' },
    required: ['registration', 'label', 'capacity']
  },
  routes: {
    roles: ['ADMIN'],
    table: 'Trajet',
    fields: ['code', 'name', 'origin', 'destination', 'morning_time', 'afternoon_time', 'active'],
    columns: { code: 'code', name: 'nomTrajet', origin: 'origine', destination: 'destination', morning_time: 'heureMatin', afternoon_time: 'heureApresMidi', active: 'actif' },
    required: ['code', 'name', 'origin', 'destination', 'morning_time', 'afternoon_time']
  },
  stops: {
    roles: ['ADMIN'],
    table: 'Arret',
    fields: ['route_id', 'name', 'address', 'latitude', 'longitude', 'stop_order', 'planned_offset_min'],
    columns: { route_id: 'idTrajet', name: 'nom', address: 'adresse', latitude: 'latitude', longitude: 'longitude', stop_order: 'ordreArret', planned_offset_min: 'estimationTemps' },
    required: ['route_id', 'name', 'address', 'latitude', 'longitude', 'stop_order']
  },
  assignments: {
    roles: ['ADMIN'],
    table: 'Affectation',
    fields: ['route_id', 'bus_id', 'driver_id', 'assistant_id', 'starts_on', 'ends_on', 'active'],
    columns: { route_id: 'idTrajet', bus_id: 'idBus', driver_id: 'idChauffeur', assistant_id: 'idAssistante', starts_on: 'debutLe', ends_on: 'finLe', active: 'actif' },
    required: ['route_id', 'bus_id', 'driver_id', 'starts_on']
  }
};

function apiSelect(config) {
  return ['id', ...config.fields.map(field => `${config.columns[field]} AS ${field}`)].join(', ');
}

function roleTable(role) {
  return { ADMIN: 'Administrateur', PARENT: 'Parent', DRIVER: 'Chauffeur', ASSISTANT: 'Assistante' }[role];
}

function validateFields(data, required) {
  return required.filter(field => data[field] === undefined || data[field] === null || data[field] === '');
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return json(res, 200, { status: 'ok', database: 'sqlite', time: new Date().toISOString() });
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await readBody(req);
    const user = db.prepare(`SELECT ${UTILISATEUR_API_COLUMNS}
      FROM Utilisateur WHERE email = ? COLLATE NOCASE AND actif = 1`).get(String(body.email || '').trim());
    if (!user || !verifyPassword(String(body.password || ''), user.password_hash)) {
      return json(res, 401, { error: 'Email ou mot de passe incorrect' });
    }
    return json(res, 200, { ...issueSession(user.id), user: publicUser(user) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/refresh') {
    const body = await readBody(req);
    const refreshToken = String(body.refresh_token || '');
    const session = refreshToken ? refreshTokens.get(tokenHash(refreshToken)) : null;
    if (!session || session.sessionExpiresAt <= Date.now()) {
      if (session) revokeSession(session);
      return json(res, 401, { error: 'Session expirée', code: 'SESSION_EXPIRED' });
    }
    const user = findActiveUserById(session.userId);
    if (!user) {
      revokeSession(session);
      return json(res, 401, { error: 'Session expirée', code: 'SESSION_EXPIRED' });
    }
    const sessionExpiresAt = session.sessionExpiresAt;
    revokeSession(session);
    return json(res, 200, { ...issueSession(user.id, sessionExpiresAt), user: publicUser(user) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/forgot-password') {
    const body = await readBody(req);
    const exists = db.prepare('SELECT 1 FROM Utilisateur WHERE email = ? COLLATE NOCASE').get(String(body.email || '').trim());
    return json(res, 200, { message: exists
      ? 'Les instructions de réinitialisation ont été préparées.'
      : 'Si cette adresse existe, elle recevra les instructions.' });
  }

  if (req.method === 'POST' && pathname === '/api/auth/register') {
    const body = await readBody(req);
    const allowedRoles = ['PARENT', 'DRIVER', 'ASSISTANT'];
    const required = ['requested_role', 'first_name', 'last_name', 'email'];
    const missing = validateFields(body, required);
    if (missing.length || !allowedRoles.includes(body.requested_role)) {
      return json(res, 422, { error: 'Les informations d’inscription sont incomplètes' });
    }
    const existing = db.prepare(`
      SELECT 1 FROM Utilisateur WHERE email = ? COLLATE NOCASE
      UNION SELECT 1 FROM DemandeInscription WHERE email = ? COLLATE NOCASE AND statut = 'PENDING'
    `).get(body.email, body.email);
    if (existing) return json(res, 409, { error: 'Cette adresse est déjà utilisée ou en attente de validation' });
    const result = db.prepare(`
      INSERT INTO DemandeInscription(typeCompteDemande, prenom, nom, email, telephone)
      VALUES (?, ?, ?, ?, ?)
    `).run(body.requested_role, body.first_name, body.last_name, String(body.email).trim(), body.phone || null);
    return json(res, 201, {
      id: Number(result.lastInsertRowid),
      message: 'Votre demande a été transmise à l’administration.'
    });
  }

  const auth = authenticate(req);
  const user = auth && auth.user;
  if (!requireRole(res, user)) return;

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    revokeSession(auth.session);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    return json(res, 200, buildBootstrap(user));
  }

  const notificationMatch = pathname.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (req.method === 'PATCH' && notificationMatch) {
    const notification = db.prepare('SELECT id, idUtilisateur AS user_id FROM Notification WHERE id = ?').get(notificationMatch[1]);
    if (!notification || (user.role !== 'ADMIN' && notification.user_id !== user.id)) {
      return json(res, 404, { error: 'Notification introuvable' });
    }
    db.prepare('UPDATE Notification SET luLe = COALESCE(luLe, CURRENT_TIMESTAMP) WHERE id = ?').run(notification.id);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/incidents') {
    const body = await readBody(req);
    const categories = ['DELAY', 'BEHAVIOUR', 'VEHICLE', 'ROUTE', 'SAFETY', 'OTHER'];
    if (!categories.includes(body.category) || !String(body.description || '').trim()) {
      return json(res, 422, { error: 'Catégorie et description requises' });
    }
    const result = db.prepare(`
      INSERT INTO Incident(signalePar, idExecutionTrajet, type, description)
      VALUES (?, ?, ?, ?)
    `).run(user.id, body.trip_id || null, body.category, String(body.description).trim());
    const admins = all("SELECT id FROM Utilisateur WHERE typeCompte = 'ADMIN' AND actif = 1");
    const notifyAdmin = db.prepare(`
      INSERT INTO Notification(idUtilisateur, idExecutionTrajet, type, titre, message)
      VALUES (?, ?, 'INCIDENT', 'Nouveau signalement', ?)
    `);
    admins.forEach(admin => notifyAdmin.run(admin.id, body.trip_id || null, String(body.description).trim()));
    return json(res, 201, { id: Number(result.lastInsertRowid) });
  }

  const incidentStatusMatch = pathname.match(/^\/api\/incidents\/(\d+)$/);
  if (req.method === 'PATCH' && incidentStatusMatch) {
    if (!requireRole(res, user, ['ADMIN'])) return;
    const body = await readBody(req);
    const allowed = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!allowed.includes(body.status)) return json(res, 422, { error: 'Statut invalide' });
    db.prepare(`
      UPDATE Incident SET statut = ?, resolution = ?,
        resoluLe = CASE WHEN ? IN ('RESOLVED', 'REJECTED') THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `).run(body.status, body.resolution || null, body.status, incidentStatusMatch[1]);
    return json(res, 200, { ok: true });
  }

  const tripActionMatch = pathname.match(/^\/api\/trips\/(\d+)\/(start|end)$/);
  if (req.method === 'POST' && tripActionMatch) {
    const trip = findTripById(tripActionMatch[1]);
    if (!trip) return json(res, 404, { error: 'Trajet introuvable' });
    if (!canOperateTrip(user, trip)) return json(res, 403, { error: 'Trajet non affecté à cet utilisateur' });
    const action = tripActionMatch[2];
    if (action === 'start') {
      db.prepare("UPDATE ExecutionTrajet SET statut = 'IN_PROGRESS', departReelLe = CURRENT_TIMESTAMP, modifieLe = CURRENT_TIMESTAMP WHERE id = ?").run(trip.id);
      notifyRouteParents(trip.route_id, trip.id, 'TRIP_STARTED', 'Trajet démarré', 'Le bus vient de démarrer son trajet.');
    } else {
      db.prepare("UPDATE ExecutionTrajet SET statut = 'COMPLETED', finReelleLe = CURRENT_TIMESTAMP, modifieLe = CURRENT_TIMESTAMP WHERE id = ?").run(trip.id);
      notifyRouteParents(trip.route_id, trip.id, 'TRIP_ENDED', 'Trajet terminé', 'Le trajet du bus est maintenant terminé.');
    }
    return json(res, 200, { ok: true, status: action === 'start' ? 'IN_PROGRESS' : 'COMPLETED' });
  }

  if (req.method === 'POST' && pathname === '/api/gps') {
    if (!requireRole(res, user, ['ADMIN', 'DRIVER', 'ASSISTANT'])) return;
    const body = await readBody(req);
    const trip = findTripById(body.trip_id);
    if (!trip) return json(res, 404, { error: 'Trajet introuvable' });
    if (!canOperateTrip(user, trip)) {
      return json(res, 403, { error: 'Trajet non affecté à cet utilisateur' });
    }
    db.prepare(`
      INSERT INTO PositionGPS(idBus, idExecutionTrajet, latitude, longitude, vitesseKmh, direction, precisionM)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(trip.bus_id, trip.id, body.latitude, body.longitude, body.speed_kmh || 0, body.heading || 0, body.accuracy_m || null);
    return json(res, 201, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/student-events') {
    if (!requireRole(res, user, ['ADMIN', 'DRIVER', 'ASSISTANT'])) return;
    const body = await readBody(req);
    const eventTypes = ['WAITING', 'BOARDED', 'ABSENT', 'DROPPED_OFF'];
    if (!eventTypes.includes(body.event_type)) return json(res, 422, { error: 'État élève invalide' });
    const trip = findTripById(body.trip_id);
    if (!trip) return json(res, 404, { error: 'Trajet introuvable' });
    if (!canOperateTrip(user, trip)) {
      return json(res, 403, { error: 'Trajet non affecté à cet utilisateur' });
    }
    const student = db.prepare(`
      SELECT e.id, e.idParent AS parent_id, e.prenom AS first_name, e.nom AS last_name
      FROM Enfant e JOIN TrajetEnfant te ON te.idEnfant = e.id
      WHERE e.id = ? AND e.actif = 1 AND te.idTrajet = ? AND te.actif = 1
    `).get(body.student_id, trip.route_id);
    if (!student) return json(res, 404, { error: 'Élève non affecté à ce trajet' });
    const result = db.prepare(`
      INSERT INTO PresenceEnfant(idExecutionTrajet, idEnfant, statut, enregistrePar, heureMontee, heureDescente)
      VALUES (?, ?, ?, ?, CASE WHEN ? = 'BOARDED' THEN CURRENT_TIMESTAMP END,
        CASE WHEN ? = 'DROPPED_OFF' THEN CURRENT_TIMESTAMP END)
    `).run(body.trip_id, body.student_id, body.event_type, user.id, body.event_type, body.event_type);
    const eventMessages = {
      BOARDED: `${student.first_name} est monté(e) dans le bus.`,
      ABSENT: `${student.first_name} a été signalé(e) absent(e).`,
      DROPPED_OFF: `${student.first_name} a été déposé(e) à son arrêt.`,
      WAITING: `${student.first_name} est en attente à son arrêt.`
    };
    db.prepare(`
      INSERT INTO Notification(idUtilisateur, idExecutionTrajet, type, titre, message)
      VALUES (?, ?, 'INFO', 'Mise à jour élève', ?)
    `).run(student.parent_id, body.trip_id, eventMessages[body.event_type]);
    return json(res, 201, { id: Number(result.lastInsertRowid) });
  }

  const registrationMatch = pathname.match(/^\/api\/registration-requests\/(\d+)$/);
  if (req.method === 'PATCH' && registrationMatch) {
    if (!requireRole(res, user, ['ADMIN'])) return;
    const body = await readBody(req);
    if (!['APPROVED', 'REJECTED'].includes(body.status)) {
      return json(res, 422, { error: 'Décision d’inscription invalide' });
    }
    const request = db.prepare(`SELECT id, typeCompteDemande AS requested_role, prenom AS first_name,
      nom AS last_name, email, telephone AS phone FROM DemandeInscription
      WHERE id = ? AND statut = 'PENDING'`).get(registrationMatch[1]);
    if (!request) return json(res, 404, { error: 'Demande d’inscription introuvable' });
    db.exec('BEGIN');
    try {
      db.prepare(`
        UPDATE DemandeInscription SET statut = ?, examinePar = ?, examineLe = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(body.status, user.id, request.id);
      if (body.status === 'APPROVED') {
        const identifier = db.prepare('SELECT COALESCE(MAX(identifiant), 1000) + 1 AS value FROM Utilisateur').get().value;
        const created = db.prepare(`
          INSERT INTO Utilisateur(identifiant, typeCompte, prenom, nom, email, telephone, motDePasse)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(identifier, request.requested_role, request.first_name, request.last_name,
          request.email, request.phone, hashPassword('demo1234'));
        db.prepare(`INSERT INTO ${roleTable(request.requested_role)}(id) VALUES (?)`).run(Number(created.lastInsertRowid));
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return json(res, 200, { ok: true, temporaryPassword: body.status === 'APPROVED' ? 'demo1234' : null });
  }

  const entityMatch = pathname.match(/^\/api\/(users|students|buses|routes|stops|assignments)(?:\/(\d+))?$/);
  if (entityMatch) {
    const [, entity, rawId] = entityMatch;
    const config = entityConfig[entity];
    if (!requireRole(res, user, config.roles)) return;

    if (req.method === 'GET') {
      const rows = rawId
        ? [db.prepare(`SELECT ${apiSelect(config)} FROM ${config.table} WHERE id = ?`).get(rawId)].filter(Boolean)
        : all(`SELECT ${apiSelect(config)} FROM ${config.table} ORDER BY id DESC`);
      return json(res, 200, rawId ? rows[0] || null : rows.map(publicUser));
    }

    if (req.method === 'POST') {
      let body = await readBody(req);
      if (config.transform) body = config.transform(body);
      const missing = validateFields(body, config.required);
      if (missing.length) return json(res, 422, { error: `Champs requis: ${missing.join(', ')}` });
      const fields = [...config.fields];
      if (entity === 'users') fields.push('password_hash');
      const used = fields.filter(field => body[field] !== undefined);
      const placeholders = used.map(() => '?').join(', ');
      const result = db.prepare(`INSERT INTO ${config.table}(${used.map(field => config.columns[field]).join(', ')}) VALUES (${placeholders})`)
        .run(...used.map(field => body[field]));
      if (entity === 'users') {
        db.prepare(`INSERT INTO ${roleTable(body.role)}(id) VALUES (?)`).run(Number(result.lastInsertRowid));
      }
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    }

    if (req.method === 'PATCH' && rawId) {
      const body = await readBody(req);
      const used = config.fields.filter(field => body[field] !== undefined);
      if (!used.length) return json(res, 422, { error: 'Aucun champ à modifier' });
      const updatedAt = ['users', 'students', 'buses', 'routes'].includes(entity) ? ', modifieLe = CURRENT_TIMESTAMP' : '';
      db.prepare(`UPDATE ${config.table} SET ${used.map(field => `${config.columns[field]} = ?`).join(', ')}${updatedAt} WHERE id = ?`)
        .run(...used.map(field => body[field]), rawId);
      return json(res, 200, { ok: true });
    }

    if (req.method === 'DELETE' && rawId) {
      if (config.fields.includes('active')) {
        const updatedAt = ['users', 'students', 'routes'].includes(entity) ? ', modifieLe = CURRENT_TIMESTAMP' : '';
        db.prepare(`UPDATE ${config.table} SET ${config.columns.active} = 0${updatedAt} WHERE id = ?`).run(rawId);
      } else {
        db.prepare(`DELETE FROM ${config.table} WHERE id = ?`).run(rawId);
      }
      return json(res, 200, { ok: true });
    }
  }

  return json(res, 404, { error: 'Route API introuvable' });
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  let filePath = safePath(pathname);
  if (!filePath) {
    res.writeHead(403);
    return res.end('Accès refusé');
  }

  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(error.code === 'ENOENT' ? 'Page introuvable' : 'Erreur serveur');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
      });
      res.end(data);
    });
  });
}

const server = http.createServer(async (req, res) => {
  let url;
  try {
    url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  } catch {
    res.writeHead(400);
    return res.end('Requête invalide');
  }

  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
    return json(res, 500, {
      error: process.env.NODE_ENV === 'production' ? 'Erreur interne' : error.message
    });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tracking Bus disponible sur http://localhost:${PORT}`);
  console.log(`API et SQLite actifs. Arrêter le serveur : Ctrl + C`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
