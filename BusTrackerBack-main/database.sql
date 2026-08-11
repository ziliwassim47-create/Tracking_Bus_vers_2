-- ============================================================
-- BusTracker School — Schéma complet de la base de données
-- ============================================================

-- Table des bus
CREATE TABLE IF NOT EXISTS bus (
    id INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL UNIQUE,
    capacite INT DEFAULT 30,
    statut ENUM('actif','inactif','en_trajet') DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des assistantes
CREATE TABLE IF NOT EXISTS assistantes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    tlf VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    id_bus INT,
    statut ENUM('actif','inactif') DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_bus) REFERENCES bus(id) ON DELETE SET NULL
);

-- Table des parents
CREATE TABLE IF NOT EXISTS parents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    tlf VARCHAR(20),
    email VARCHAR(255) UNIQUE,
    adresse TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des enfants (élèves)
CREATE TABLE IF NOT EXISTS users (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    NOM VARCHAR(255) NOT NULL,
    VILLE TEXT,           -- JSON: {"latitude": number, "longitude": number}
    TLF VARCHAR(20),
    ID_BUS INT,
    presence TINYINT(1) DEFAULT 0,
    CLASSE VARCHAR(50),
    NIVEAU VARCHAR(50),
    id_parent INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ID_BUS) REFERENCES bus(id) ON DELETE SET NULL,
    FOREIGN KEY (id_parent) REFERENCES parents(id) ON DELETE SET NULL
);

-- Table des admins / administrateurs
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    tlf VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des comptes (authentification)
CREATE TABLE IF NOT EXISTS comptes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','assistante','parent') NOT NULL,
    ref_id INT NOT NULL,           -- ID dans la table correspondante
    actif TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des trajets
CREATE TABLE IF NOT EXISTS trajets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_bus INT,
    id_assistante INT,
    date_debut DATETIME,
    date_fin DATETIME,
    lat_debut DOUBLE,
    lng_debut DOUBLE,
    statut ENUM('en_cours','termine','annule') DEFAULT 'en_cours',
    nb_eleves_presents INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_bus) REFERENCES bus(id) ON DELETE SET NULL,
    FOREIGN KEY (id_assistante) REFERENCES assistantes(id) ON DELETE SET NULL
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('alerte','incident','arrivee','depart','probleme','info') NOT NULL,
    message TEXT NOT NULL,
    role_destinataire ENUM('admin','assistante','parent','all') DEFAULT 'all',
    id_destinataire INT,           -- NULL = tous les utilisateurs du rôle
    lu TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table des problèmes / réclamations déclarés par les assistantes ou parents
CREATE TABLE IF NOT EXISTS problemes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_declarant INT NOT NULL,
    role_declarant ENUM('assistante','parent') NOT NULL,
    categorie ENUM('retard','comportement','vehicule','securite','autre') DEFAULT 'autre',
    description TEXT NOT NULL,
    statut ENUM('nouveau','en_traitement','resolu') DEFAULT 'nouveau',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Données de test
-- ============================================================

INSERT IGNORE INTO bus (id, matricule, capacite, statut) VALUES
(1, 'BUS-001-TN', 30, 'actif'),
(2, 'BUS-002-TN', 25, 'actif'),
(3, 'BUS-003-TN', 28, 'inactif');

INSERT IGNORE INTO assistantes (id, nom, tlf, email, id_bus) VALUES
(1, 'Fatma Ben Ali', '20111111', 'fatma@educanet.tn', 1),
(2, 'Nadia Trabelsi', '20222222', 'nadia@educanet.tn', 2),
(3, 'Sonia Chaabane', '20333333', 'sonia@educanet.tn', 3);

INSERT IGNORE INTO parents (id, nom, tlf, email) VALUES
(1, 'Mohamed Ben Salah', '20444444', 'parent1@gmail.com'),
(2, 'Rania Karray', '20555555', 'parent2@gmail.com'),
(3, 'Khaled Bouzid', '20666666', 'parent3@gmail.com');

INSERT IGNORE INTO admins (id, nom, email, tlf) VALUES
(1, 'Directeur Educanet', 'admin@educanet.tn', '20000001');

-- Mot de passe pour tous les comptes de test: "password123"
-- Hash bcrypt de "password123": $2b$10$YourHashHere (sera remplacé par le vrai hash)
INSERT IGNORE INTO comptes (email, password_hash, role, ref_id) VALUES
('admin@educanet.tn',    '$2b$10$rOAZZi3KCqQW1EwKOuBf8.HNcYwF.4S.V3FkfFRNLa8DaY4kFgpde', 'admin',      1),
('fatma@educanet.tn',    '$2b$10$rOAZZi3KCqQW1EwKOuBf8.HNcYwF.4S.V3FkfFRNLa8DaY4kFgpde', 'assistante',  1),
('nadia@educanet.tn',    '$2b$10$rOAZZi3KCqQW1EwKOuBf8.HNcYwF.4S.V3FkfFRNLa8DaY4kFgpde', 'assistante',  2),
('parent1@gmail.com',    '$2b$10$rOAZZi3KCqQW1EwKOuBf8.HNcYwF.4S.V3FkfFRNLa8DaY4kFgpde', 'parent',      1),
('parent2@gmail.com',    '$2b$10$rOAZZi3KCqQW1EwKOuBf8.HNcYwF.4S.V3FkfFRNLa8DaY4kFgpde', 'parent',      2);

INSERT IGNORE INTO users (ID, NOM, VILLE, TLF, ID_BUS, presence, CLASSE, NIVEAU, id_parent) VALUES
(3, 'Ahmed Ben Salah',   '{"latitude": 36.81, "longitude": 10.17}', '20111222', 1, 1, 'Papillon', '2eme', 1),
(4, 'Yassine Trabelsi',  '{"latitude": 36.82, "longitude": 10.18}', '22334455', 1, 0, 'Papillon', '2eme', 1),
(5, 'Mariam Karray',     '{"latitude": 36.79, "longitude": 10.20}', '99887766', 2, 1, 'Rose',     '5eme', 2),
(6, 'Ines Chaabane',     '{"latitude": 36.78, "longitude": 10.22}', '55443322', 2, 0, 'Rose',     '5eme', 2),
(7, 'Ali Bouzid',        '{"latitude": 36.75, "longitude": 10.25}', '44556677', 3, 1, 'Tulipe',   '9eme', 3),
(8, 'Sami Hachicha',     '{"latitude": 36.74, "longitude": 10.26}', '66778899', 3, 0, 'Tulipe',   '9eme', 3);

INSERT IGNORE INTO notifications (type, message, role_destinataire, id_destinataire, lu) VALUES
('depart',   'Le bus BUS-001-TN a démarré son trajet à 07h30', 'parent', 1, 0),
('arrivee',  'Ahmed Ben Salah est monté dans le bus', 'parent', 1, 1),
('alerte',   'Retard de 10 minutes sur le trajet du bus BUS-002-TN', 'all', NULL, 0),
('incident', 'Problème signalé par Fatma Ben Ali : panne légère résolue', 'admin', 1, 0);

INSERT IGNORE INTO trajets (id_bus, id_assistante, date_debut, date_fin, lat_debut, lng_debut, statut, nb_eleves_presents) VALUES
(1, 1, '2026-08-07 07:25:00', '2026-08-07 08:10:00', 36.8065, 10.1815, 'termine', 4),
(1, 1, '2026-08-08 07:30:00', '2026-08-08 08:15:00', 36.8065, 10.1815, 'termine', 3),
(2, 2, '2026-08-07 07:20:00', '2026-08-07 08:05:00', 36.8065, 10.1815, 'termine', 2),
(1, 1, '2026-08-09 07:28:00', NULL, 36.8065, 10.1815, 'en_cours', 4);
