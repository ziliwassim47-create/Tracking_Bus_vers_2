'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'tracking-bus.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sql');

const TABLE_RENAMES = {
  schema_migrations: 'MigrationSchema',
  users: 'Utilisateur',
  students: 'Enfant',
  buses: 'Bus',
  routes: 'Trajet',
  stops: 'Arret',
  route_students: 'TrajetEnfant',
  assignments: 'Affectation',
  trips: 'ExecutionTrajet',
  trip_stops: 'ArretExecution',
  student_trip_events: 'PresenceEnfant',
  gps_positions: 'PositionGPS',
  notifications: 'Notification',
  incidents: 'Incident',
  registration_requests: 'DemandeInscription'
};

const COLUMN_RENAMES = {
  MigrationSchema: { applied_at: 'dateApplication' },
  Utilisateur: {
    password_hash: 'motDePasse', role: 'typeCompte', first_name: 'prenom', last_name: 'nom',
    phone: 'telephone', avatar_url: 'urlAvatar', active: 'actif', created_at: 'creeLe', updated_at: 'modifieLe'
  },
  Enfant: {
    parent_id: 'idParent', first_name: 'prenom', last_name: 'nom', birth_date: 'dateNaissance',
    school_class: 'classe', home_address: 'adresseDomicile', home_lat: 'latitudeDomicile',
    home_lng: 'longitudeDomicile', alert_radius_m: 'rayonAlerteM', active: 'actif',
    created_at: 'creeLe', updated_at: 'modifieLe'
  },
  Bus: {
    registration: 'matricule', label: 'libelle', capacity: 'capacite', status: 'statut',
    gps_device_uid: 'identifiantGPS', last_maintenance_at: 'derniereMaintenanceLe',
    created_at: 'creeLe', updated_at: 'modifieLe'
  },
  Trajet: {
    name: 'nomTrajet', origin: 'origine', morning_time: 'heureMatin', afternoon_time: 'heureApresMidi',
    active: 'actif', created_at: 'creeLe', updated_at: 'modifieLe'
  },
  Arret: {
    route_id: 'idTrajet', name: 'nom', address: 'adresse', stop_order: 'ordreArret', planned_offset_min: 'estimationTemps'
  },
  TrajetEnfant: {
    route_id: 'idTrajet', student_id: 'idEnfant', stop_id: 'idArret', active: 'actif', assigned_at: 'affecteLe'
  },
  Affectation: {
    route_id: 'idTrajet', bus_id: 'idBus', driver_id: 'idChauffeur', assistant_id: 'idAssistante',
    starts_on: 'debutLe', ends_on: 'finLe', active: 'actif', created_at: 'creeLe'
  },
  ExecutionTrajet: {
    route_id: 'idTrajet', bus_id: 'idBus', driver_id: 'idChauffeur', assistant_id: 'idAssistante',
    direction: 'sens', status: 'statut', scheduled_start_at: 'departPrevuLe', actual_start_at: 'departReelLe',
    actual_end_at: 'finReelleLe', delay_minutes: 'retardMinutes', created_at: 'creeLe', updated_at: 'modifieLe'
  },
  ArretExecution: {
    trip_id: 'idExecutionTrajet', stop_id: 'idArret', planned_at: 'prevuLe', arrived_at: 'arriveLe', status: 'statut'
  },
  PresenceEnfant: {
    trip_id: 'idExecutionTrajet', student_id: 'idEnfant', event_type: 'statut',
    recorded_by: 'enregistrePar', recorded_at: 'enregistreLe'
  },
  PositionGPS: {
    bus_id: 'idBus', trip_id: 'idExecutionTrajet', speed_kmh: 'vitesseKmh', heading: 'direction',
    accuracy_m: 'precisionM', recorded_at: 'enregistreLe'
  },
  Notification: {
    user_id: 'idUtilisateur', trip_id: 'idExecutionTrajet', title: 'titre', read_at: 'luLe', created_at: 'creeLe'
  },
  Incident: {
    reporter_id: 'signalePar', trip_id: 'idExecutionTrajet', category: 'type', status: 'statut',
    created_at: 'creeLe', resolved_at: 'resoluLe'
  },
  DemandeInscription: {
    requested_role: 'typeCompteDemande', first_name: 'prenom', last_name: 'nom', phone: 'telephone',
    status: 'statut', reviewed_by: 'examinePar', created_at: 'creeLe', reviewed_at: 'examineLe'
  }
};

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, expected] = String(storedHash || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function tableExists(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? COLLATE NOCASE").get(name));
}

function columnExists(db, table, column) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().some(item => item.name.toLowerCase() === column.toLowerCase());
}

function migrateEnglishSchema(db) {
  if (!tableExists(db, 'users') || tableExists(db, 'Utilisateur')) return;
  db.exec('BEGIN');
  try {
    for (const [source, destination] of Object.entries(TABLE_RENAMES)) {
      if (tableExists(db, source) && !tableExists(db, destination)) {
        db.exec(`ALTER TABLE "${source}" RENAME TO "${destination}"`);
      }
    }
    for (const [table, columns] of Object.entries(COLUMN_RENAMES)) {
      for (const [source, destination] of Object.entries(columns)) {
        if (columnExists(db, table, source) && !columnExists(db, table, destination)) {
          db.exec(`ALTER TABLE "${table}" RENAME COLUMN "${source}" TO "${destination}"`);
        }
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function addColumn(db, table, definition) {
  const column = definition.trim().split(/\s+/)[0];
  if (!columnExists(db, table, column)) db.exec(`ALTER TABLE "${table}" ADD COLUMN ${definition}`);
}

function completeFrenchSchema(db) {
  for (const [table, columns] of Object.entries(COLUMN_RENAMES)) {
    if (!tableExists(db, table)) continue;
    for (const [source, destination] of Object.entries(columns)) {
      if (columnExists(db, table, source) && !columnExists(db, table, destination)) {
        db.exec(`ALTER TABLE "${table}" RENAME COLUMN "${source}" TO "${destination}"`);
      }
    }
  }
  addColumn(db, 'Utilisateur', 'identifiant INTEGER');
  addColumn(db, 'Trajet', 'tempsTotalEstime REAL');
  addColumn(db, 'Enfant', 'idEtablissement INTEGER REFERENCES Etablissement(id) ON DELETE SET NULL');
  addColumn(db, 'PresenceEnfant', 'heureMontee TEXT');
  addColumn(db, 'PresenceEnfant', 'heureDescente TEXT');
  addColumn(db, 'Incident', 'retardMinutes INTEGER NOT NULL DEFAULT 0');
  db.exec(`
    UPDATE Utilisateur SET identifiant = id WHERE identifiant IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateur_identifiant ON Utilisateur(identifiant);
    INSERT OR IGNORE INTO Parent(id) SELECT id FROM Utilisateur WHERE typeCompte = 'PARENT';
    INSERT OR IGNORE INTO Administrateur(id) SELECT id FROM Utilisateur WHERE typeCompte = 'ADMIN';
    INSERT OR IGNORE INTO Chauffeur(id) SELECT id FROM Utilisateur WHERE typeCompte = 'DRIVER';
    INSERT OR IGNORE INTO Assistante(id) SELECT id FROM Utilisateur WHERE typeCompte = 'ASSISTANT';
  `);
}

function openDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  migrateEnglishSchema(db);
  db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  completeFrenchSchema(db);
  seedDatabase(db);
  return db;
}

function roleTable(role) {
  return { ADMIN: 'Administrateur', PARENT: 'Parent', DRIVER: 'Chauffeur', ASSISTANT: 'Assistante' }[role];
}

function insertUser(db, role, firstName, lastName, email, phone) {
  const nextIdentifier = db.prepare('SELECT COALESCE(MAX(identifiant), 1000) + 1 AS value FROM Utilisateur').get().value;
  const id = Number(db.prepare(`
    INSERT INTO Utilisateur(identifiant, typeCompte, prenom, nom, email, telephone, motDePasse)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nextIdentifier, role, firstName, lastName, email, phone, hashPassword('demo1234')).lastInsertRowid);
  db.prepare(`INSERT INTO ${roleTable(role)}(id) VALUES (?)`).run(id);
  return id;
}

function seedDatabase(db) {
  const count = db.prepare('SELECT COUNT(*) AS count FROM Utilisateur').get().count;
  if (count > 0) return;

  db.exec('BEGIN');
  try {
    const adminId = insertUser(db, 'ADMIN', 'Mahdi', 'Ben Salem', 'admin@demo.tn', '+216 20 100 100');
    const parentId = insertUser(db, 'PARENT', 'Ahmed', 'Ben Ali', 'parent@demo.tn', '+216 20 200 200');
    const driverId = insertUser(db, 'DRIVER', 'Ali', 'Mansour', 'chauffeur@demo.tn', '+216 20 300 300');
    const assistantId = insertUser(db, 'ASSISTANT', 'Sana', 'Trabelsi', 'assistant@demo.tn', '+216 20 400 400');
    insertUser(db, 'PARENT', 'Leila', 'Gharbi', 'leila@demo.tn', '+216 20 500 500');
    insertUser(db, 'DRIVER', 'Nabil', 'Jaziri', 'nabil@demo.tn', '+216 20 600 600');
    insertUser(db, 'ASSISTANT', 'Ines', 'Ayari', 'ines@demo.tn', '+216 20 700 700');

    // Additional parents for nouv students
    const parentBenSalah = insertUser(db, 'PARENT', 'Parent', 'Ben Salah', 'bensalah@demo.tn', '20111222');
    const parentTrabelsi = insertUser(db, 'PARENT', 'Parent', 'Trabelsi', 'trabelsi@demo.tn', '22334455');
    const parentKarray = insertUser(db, 'PARENT', 'Parent', 'Karray', 'karray@demo.tn', '99887766');
    const parentChaabane = insertUser(db, 'PARENT', 'Parent', 'Chaabane', 'chaabane@demo.tn', '55443322');
    const parentBouzid = insertUser(db, 'PARENT', 'Parent', 'Bouzid', 'bouzid@demo.tn', '44556677');
    const parentHachicha = insertUser(db, 'PARENT', 'Parent', 'Hachicha', 'hachicha@demo.tn', '66778899');

    const etablissementId = Number(db.prepare('INSERT INTO Etablissement(nom) VALUES (?)').run('École Educanet').lastInsertRowid);
    
    // Buses
    const busStmt = db.prepare('INSERT INTO Bus(id, matricule, libelle, capacite, statut, identifiantGPS) VALUES (?, ?, ?, ?, ?, ?)');
    const busAId = 1;
    busStmt.run(1, '123 TU 456', 'Bus 01', 32, 'IN_SERVICE', 'GPS-EDU-001');
    busStmt.run(2, '789 TU 111', 'Bus 02', 28, 'IN_SERVICE', 'GPS-EDU-002');
    busStmt.run(3, '555 TU 777', 'Bus 03', 36, 'AVAILABLE', 'GPS-EDU-003');
    busStmt.run(4, '205 TU 998', 'Bus 04', 30, 'MAINTENANCE', 'GPS-EDU-004');

    // Students from default setup plus NOUV students (IDs 3..8)
    const enfantStmtWithId = db.prepare(`
      INSERT INTO Enfant(id, idParent, prenom, nom, dateNaissance, classe, adresseDomicile,
        latitudeDomicile, longitudeDomicile, rayonAlerteM, idEtablissement)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    enfantStmtWithId.run(1, parentId, 'Youssef', 'Ben Ali', '2015-04-12', '6e A', 'Maison Youssef, Tunis', 36.8067, 10.1815, 500, etablissementId);
    enfantStmtWithId.run(2, parentId, 'Amine', 'Ben Ali', '2017-09-21', '4e B', 'Maison Youssef, Tunis', 36.8067, 10.1815, 500, etablissementId);
    enfantStmtWithId.run(9, parentId, 'Lina', 'Ben Ali', '2019-01-08', '2e A', 'Maison Youssef, Tunis', 36.8067, 10.1815, 500, etablissementId);

    // nouv dataset students (IDs 3, 4, 5, 6, 7, 8)
    enfantStmtWithId.run(3, parentBenSalah, 'Ahmed', 'Ben Salah', '2016-05-10', 'Papillon', '{"latitude": 36.81, "longitude": 10.17}', 36.81, 10.17, 500, etablissementId);
    enfantStmtWithId.run(4, parentTrabelsi, 'Yassine', 'Trabelsi', '2016-08-15', 'Papillon', '{"latitude": 36.82, "longitude": 10.18}', 36.82, 10.18, 500, etablissementId);
    enfantStmtWithId.run(5, parentKarray, 'Mariam', 'Karray', '2013-03-20', 'Rose', '{"latitude": 36.79, "longitude": 10.20}', 36.79, 10.20, 500, etablissementId);
    enfantStmtWithId.run(6, parentChaabane, 'Ines', 'Chaabane', '2013-11-12', 'Rose', '{"latitude": 36.78, "longitude": 10.22}', 36.78, 10.22, 500, etablissementId);
    enfantStmtWithId.run(7, parentBouzid, 'Ali', 'Bouzid', '2009-01-25', 'Tulipe', '{"latitude": 36.75, "longitude": 10.25}', 36.75, 10.25, 500, etablissementId);
    enfantStmtWithId.run(8, parentHachicha, 'Sami', 'Hachicha', '2009-07-04', 'Tulipe', '{"latitude": 36.74, "longitude": 10.26}', 36.74, 10.26, 500, etablissementId);

    // Routes (Trajet)
    const trajetStmt = db.prepare(`
      INSERT INTO Trajet(id, code, nomTrajet, origine, destination, heureMatin, heureApresMidi, tempsTotalEstime)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const routeAId = 1;
    trajetStmt.run(1, 'A', 'Ligne 1 - Papillon', 'Dépôt EDUCAnet', 'École Educanet', '07:30', '16:30', 30);
    trajetStmt.run(2, 'B', 'Ligne 2 - Rose', 'Dépôt Nord', 'École Educanet', '07:20', '16:20', 35);
    trajetStmt.run(3, 'C', 'Ligne 3 - Tulipe', 'Dépôt Sud', 'École Educanet', '07:40', '16:40', 25);

    // Stops (Arret)
    const arretStmt = db.prepare(`
      INSERT INTO Arret(idTrajet, nom, adresse, latitude, longitude, ordreArret, estimationTemps)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const routeAStopIds = [
      Number(arretStmt.run(1, 'Dépôt', 'Dépôt EDUCAnet', 36.8126, 10.1762, 0, 0).lastInsertRowid),
      Number(arretStmt.run(1, 'Pharmacie', 'Avenue de Paris', 36.8098, 10.1784, 1, 7).lastInsertRowid),
      Number(arretStmt.run(1, 'Arrêt Ahmed Ben Salah', 'Tunis 36.81/10.17', 36.8100, 10.1700, 2, 14).lastInsertRowid),
      Number(arretStmt.run(1, 'Jardin', 'Jardin du Belvédère', 36.8111, 10.1848, 3, 21).lastInsertRowid),
      Number(arretStmt.run(1, 'École Educanet', 'École Educanet', 36.8151, 10.1886, 4, 30).lastInsertRowid)
    ];

    const routeBStopIds = [
      Number(arretStmt.run(2, 'Dépôt Nord', 'Dépôt Nord', 36.8000, 10.1900, 0, 0).lastInsertRowid),
      Number(arretStmt.run(2, 'Arrêt Mariam Karray', 'Tunis 36.79/10.20', 36.7900, 10.2000, 1, 10).lastInsertRowid),
      Number(arretStmt.run(2, 'Arrêt Ines Chaabane', 'Tunis 36.78/10.22', 36.7800, 10.2200, 2, 20).lastInsertRowid),
      Number(arretStmt.run(2, 'École Educanet', 'École Educanet', 36.8151, 10.1886, 3, 35).lastInsertRowid)
    ];

    const routeCStopIds = [
      Number(arretStmt.run(3, 'Dépôt Sud', 'Dépôt Sud', 36.7600, 10.2400, 0, 0).lastInsertRowid),
      Number(arretStmt.run(3, 'Arrêt Ali Bouzid', 'Tunis 36.75/10.25', 36.7500, 10.2500, 1, 10).lastInsertRowid),
      Number(arretStmt.run(3, 'Arrêt Sami Hachicha', 'Tunis 36.74/10.26', 36.7400, 10.2600, 2, 20).lastInsertRowid),
      Number(arretStmt.run(3, 'École Educanet', 'École Educanet', 36.8151, 10.1886, 3, 25).lastInsertRowid)
    ];

    const trajetEnfantStmt = db.prepare('INSERT INTO TrajetEnfant(idTrajet, idEnfant, idArret) VALUES (?, ?, ?)');
    trajetEnfantStmt.run(1, 1, routeAStopIds[2]);
    trajetEnfantStmt.run(1, 2, routeAStopIds[2]);
    trajetEnfantStmt.run(1, 9, routeAStopIds[2]);
    trajetEnfantStmt.run(1, 3, routeAStopIds[2]);
    trajetEnfantStmt.run(1, 4, routeAStopIds[3]);
    trajetEnfantStmt.run(2, 5, routeBStopIds[1]);
    trajetEnfantStmt.run(2, 6, routeBStopIds[2]);
    trajetEnfantStmt.run(3, 7, routeCStopIds[1]);
    trajetEnfantStmt.run(3, 8, routeCStopIds[2]);

    db.prepare(`
      INSERT INTO Affectation(idTrajet, idBus, idChauffeur, idAssistante, debutLe)
      VALUES (?, ?, ?, ?, date('now', '-30 days'))
    `).run(routeAId, busAId, driverId, assistantId);

    const executionStmt = db.prepare(`
      INSERT INTO ExecutionTrajet(idTrajet, idBus, idChauffeur, idAssistante, sens, statut,
        departPrevuLe, departReelLe, retardMinutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const currentTripId = Number(executionStmt.run(
      routeAId, busAId, driverId, assistantId, 'MORNING', 'IN_PROGRESS',
      new Date(Date.now() - 35 * 60000).toISOString(), new Date(Date.now() - 31 * 60000).toISOString(), 4
    ).lastInsertRowid);

    const arretExecutionStmt = db.prepare('INSERT INTO ArretExecution(idExecutionTrajet, idArret, statut) VALUES (?, ?, ?)');
    routeAStopIds.forEach((stopId, index) => arretExecutionStmt.run(currentTripId, stopId, index < 2 ? 'PASSED' : index === 2 ? 'APPROACHING' : 'UPCOMING'));

    const presenceStmt = db.prepare('INSERT INTO PresenceEnfant(idExecutionTrajet, idEnfant, statut, enregistrePar) VALUES (?, ?, ?, ?)');
    presenceStmt.run(currentTripId, 3, 'BOARDED', assistantId);
    presenceStmt.run(currentTripId, 4, 'WAITING', assistantId);
    presenceStmt.run(currentTripId, 5, 'BOARDED', assistantId);
    presenceStmt.run(currentTripId, 6, 'WAITING', assistantId);
    presenceStmt.run(currentTripId, 7, 'BOARDED', assistantId);
    presenceStmt.run(currentTripId, 8, 'WAITING', assistantId);

    db.prepare(`
      INSERT INTO PositionGPS(idBus, idExecutionTrajet, latitude, longitude, vitesseKmh, direction, precisionM, enregistreLe)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-8 seconds'))
    `).run(busAId, currentTripId, 36.8081, 10.1801, 24, 115, 7);

    const notificationStmt = db.prepare(`
      INSERT INTO Notification(idUtilisateur, idExecutionTrajet, type, titre, message, creeLe)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    notificationStmt.run(parentId, currentTripId, 'APPROACH', 'Bus en approche', 'Le bus de Youssef / Ahmed arrive dans environ 7 minutes.', new Date(Date.now() - 5 * 60000).toISOString());
    notificationStmt.run(parentId, currentTripId, 'DELAY', 'Retard signalé', 'La Ligne A présente un retard estimé à 4 minutes.', new Date(Date.now() - 24 * 60000).toISOString());
    notificationStmt.run(assistantId, currentTripId, 'TRIP_STARTED', 'Trajet démarré', 'Le trajet du matin est maintenant en cours.', new Date(Date.now() - 31 * 60000).toISOString());
    notificationStmt.run(adminId, currentTripId, 'INCIDENT', 'Incident à vérifier', 'Un parent a signalé un retard sur la Ligne A.', new Date(Date.now() - 18 * 60000).toISOString());

    db.prepare(`
      INSERT INTO Incident(signalePar, idExecutionTrajet, type, description, statut)
      VALUES (?, ?, 'DELAY', 'Le bus est arrivé après l’horaire annoncé.', 'OPEN')
    `).run(parentId, currentTripId);

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

if (require.main === module) {
  if (process.argv.includes('--reset') && fs.existsSync(DB_PATH)) fs.rmSync(DB_PATH);
  const db = openDatabase();
  const summary = {
    database: DB_PATH,
    utilisateurs: db.prepare('SELECT COUNT(*) AS count FROM Utilisateur').get().count,
    enfants: db.prepare('SELECT COUNT(*) AS count FROM Enfant').get().count,
    executionsTrajets: db.prepare('SELECT COUNT(*) AS count FROM ExecutionTrajet').get().count
  };
  console.log(JSON.stringify(summary, null, 2));
  db.close();
}

module.exports = { DB_PATH, openDatabase, hashPassword, verifyPassword };
