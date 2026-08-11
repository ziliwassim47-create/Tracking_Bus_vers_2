const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ══════════════════════════════════════════════════════════════════════════════
// BUS — CRUD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/bus', (req, res) => {
    db.query('SELECT * FROM bus ORDER BY id', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/bus/:id', (req, res) => {
    db.query('SELECT * FROM bus WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Bus non trouvé' });
        res.json(results[0]);
    });
});

router.post('/bus', (req, res) => {
    const { matricule, capacite, statut } = req.body;
    if (!matricule) return res.status(400).json({ error: 'Matricule requis' });
    db.query(
        'INSERT INTO bus (matricule, capacite, statut) VALUES (?, ?, ?)',
        [matricule, capacite || 30, statut || 'actif'],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Bus créé', id: result.insertId });
        }
    );
});

router.put('/bus/:id', (req, res) => {
    const { matricule, capacite, statut } = req.body;
    db.query(
        'UPDATE bus SET matricule=?, capacite=?, statut=? WHERE id=?',
        [matricule, capacite, statut, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Bus non trouvé' });
            res.json({ message: 'Bus mis à jour' });
        }
    );
});

router.delete('/bus/:id', (req, res) => {
    db.query('DELETE FROM bus WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Bus non trouvé' });
        res.json({ message: 'Bus supprimé' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// ASSISTANTES — CRUD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/assistantes', (req, res) => {
    const sql = `
        SELECT a.*, b.matricule as bus_matricule 
        FROM assistantes a 
        LEFT JOIN bus b ON a.id_bus = b.id 
        ORDER BY a.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/assistantes/:id', (req, res) => {
    db.query('SELECT * FROM assistantes WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Assistante non trouvée' });
        res.json(results[0]);
    });
});

router.post('/assistantes', (req, res) => {
    const { nom, tlf, email, id_bus } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis' });
    db.query(
        'INSERT INTO assistantes (nom, tlf, email, id_bus) VALUES (?, ?, ?, ?)',
        [nom, tlf || null, email || null, id_bus || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Assistante créée', id: result.insertId });
        }
    );
});

router.put('/assistantes/:id', (req, res) => {
    const { nom, tlf, email, id_bus, statut } = req.body;
    db.query(
        'UPDATE assistantes SET nom=?, tlf=?, email=?, id_bus=?, statut=? WHERE id=?',
        [nom, tlf, email, id_bus || null, statut || 'actif', req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Assistante non trouvée' });
            res.json({ message: 'Assistante mise à jour' });
        }
    );
});

router.delete('/assistantes/:id', (req, res) => {
    db.query('DELETE FROM assistantes WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Assistante non trouvée' });
        res.json({ message: 'Assistante supprimée' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// PARENTS — CRUD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/parents', (req, res) => {
    const sql = `
        SELECT p.*, COUNT(u.ID) as nb_enfants 
        FROM parents p 
        LEFT JOIN users u ON u.id_parent = p.id 
        GROUP BY p.id 
        ORDER BY p.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/parents/:id', (req, res) => {
    db.query('SELECT * FROM parents WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Parent non trouvé' });
        res.json(results[0]);
    });
});

router.get('/parents/:id/enfants', (req, res) => {
    db.query(
        'SELECT u.*, b.matricule as bus_matricule FROM users u LEFT JOIN bus b ON u.ID_BUS = b.id WHERE u.id_parent = ?',
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

router.post('/parents', (req, res) => {
    const { nom, tlf, email, adresse } = req.body;
    if (!nom) return res.status(400).json({ error: 'Nom requis' });
    db.query(
        'INSERT INTO parents (nom, tlf, email, adresse) VALUES (?, ?, ?, ?)',
        [nom, tlf || null, email || null, adresse || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Parent créé', id: result.insertId });
        }
    );
});

router.put('/parents/:id', (req, res) => {
    const { nom, tlf, email, adresse } = req.body;
    db.query(
        'UPDATE parents SET nom=?, tlf=?, email=?, adresse=? WHERE id=?',
        [nom, tlf, email, adresse, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Parent non trouvé' });
            res.json({ message: 'Parent mis à jour' });
        }
    );
});

router.delete('/parents/:id', (req, res) => {
    db.query('DELETE FROM parents WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Parent non trouvé' });
        res.json({ message: 'Parent supprimé' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// ENFANTS (users) — CRUD ADMIN
// ══════════════════════════════════════════════════════════════════════════════

router.get('/enfants', (req, res) => {
    const sql = `
        SELECT u.*, b.matricule as bus_matricule, p.nom as parent_nom
        FROM users u
        LEFT JOIN bus b ON u.ID_BUS = b.id
        LEFT JOIN parents p ON u.id_parent = p.id
        ORDER BY u.CLASSE, u.NIVEAU, u.NOM`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/enfants', (req, res) => {
    const { NOM, TLF, ID_BUS, CLASSE, NIVEAU, id_parent, latitude, longitude } = req.body;
    if (!NOM) return res.status(400).json({ error: 'Nom requis' });
    const VILLE = latitude && longitude ? JSON.stringify({ latitude, longitude }) : null;
    db.query(
        'INSERT INTO users (NOM, VILLE, TLF, ID_BUS, CLASSE, NIVEAU, id_parent) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [NOM, VILLE, TLF || null, ID_BUS || null, CLASSE || null, NIVEAU || null, id_parent || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Enfant créé', id: result.insertId });
        }
    );
});

router.put('/enfants/:id', (req, res) => {
    const { NOM, TLF, ID_BUS, CLASSE, NIVEAU, id_parent, latitude, longitude } = req.body;
    const VILLE = latitude && longitude ? JSON.stringify({ latitude, longitude }) : null;
    db.query(
        'UPDATE users SET NOM=?, VILLE=?, TLF=?, ID_BUS=?, CLASSE=?, NIVEAU=?, id_parent=? WHERE ID=?',
        [NOM, VILLE, TLF, ID_BUS || null, CLASSE, NIVEAU, id_parent || null, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Enfant non trouvé' });
            res.json({ message: 'Enfant mis à jour' });
        }
    );
});

router.delete('/enfants/:id', (req, res) => {
    db.query('DELETE FROM users WHERE ID=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Enfant non trouvé' });
        res.json({ message: 'Enfant supprimé' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMINS — CRUD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/admins', (req, res) => {
    db.query('SELECT * FROM admins ORDER BY id', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.post('/admins', (req, res) => {
    const { nom, email, tlf } = req.body;
    if (!nom || !email) return res.status(400).json({ error: 'Nom et email requis' });
    db.query(
        'INSERT INTO admins (nom, email, tlf) VALUES (?, ?, ?)',
        [nom, email, tlf || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ message: 'Admin créé', id: result.insertId });
        }
    );
});

router.put('/admins/:id', (req, res) => {
    const { nom, email, tlf } = req.body;
    db.query(
        'UPDATE admins SET nom=?, email=?, tlf=? WHERE id=?',
        [nom, email, tlf, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Admin non trouvé' });
            res.json({ message: 'Admin mis à jour' });
        }
    );
});

router.delete('/admins/:id', (req, res) => {
    db.query('DELETE FROM admins WHERE id=?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Admin non trouvé' });
        res.json({ message: 'Admin supprimé' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// TRAJETS — lecture + stats pour admin
// ══════════════════════════════════════════════════════════════════════════════

router.get('/trajets', (req, res) => {
    const sql = `
        SELECT t.*, b.matricule as bus_matricule, a.nom as assistante_nom
        FROM trajets t
        LEFT JOIN bus b ON t.id_bus = b.id
        LEFT JOIN assistantes a ON t.id_assistante = a.id
        ORDER BY t.created_at DESC`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS — lecture admin
// ══════════════════════════════════════════════════════════════════════════════

router.get('/notifications', (req, res) => {
    db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.put('/notifications/:id/lu', (req, res) => {
    db.query('UPDATE notifications SET lu=1 WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notification marquée comme lue' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROBLÈMES — lecture admin
// ══════════════════════════════════════════════════════════════════════════════

router.get('/problemes', (req, res) => {
    db.query('SELECT * FROM problemes ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.put('/problemes/:id/statut', (req, res) => {
    const { statut } = req.body;
    db.query('UPDATE problemes SET statut=? WHERE id=?', [statut, req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Statut mis à jour' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// STATS — Dashboard admin
// ══════════════════════════════════════════════════════════════════════════════

router.get('/stats', (req, res) => {
    const queries = [
        new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM users', (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
        new Promise((resolve, reject) => {
            db.query("SELECT COUNT(*) as total FROM bus WHERE statut != 'inactif'", (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
        new Promise((resolve, reject) => {
            db.query("SELECT COUNT(*) as total FROM trajets WHERE DATE(created_at) = CURDATE()", (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
        new Promise((resolve, reject) => {
            db.query("SELECT COUNT(*) as total FROM problemes WHERE statut = 'nouveau'", (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
        new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM parents', (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
        new Promise((resolve, reject) => {
            db.query('SELECT COUNT(*) as total FROM assistantes', (err, r) => err ? reject(err) : resolve(r[0].total));
        }),
    ];

    Promise.all(queries)
        .then(([totalEnfants, busActifs, trajetsJour, incidents, totalParents, totalAssistantes]) => {
            res.json({ totalEnfants, busActifs, trajetsJour, incidents, totalParents, totalAssistantes });
        })
        .catch(err => res.status(500).json({ error: err.message }));
});

// ══════════════════════════════════════════════════════════════════════════════
// AFFECTATION BUS
// ══════════════════════════════════════════════════════════════════════════════

router.put('/affecter-bus', (req, res) => {
    const { type, id, id_bus } = req.body; // type: 'enfant' | 'assistante'
    let sql = '';

    if (type === 'enfant') {
        sql = 'UPDATE users SET ID_BUS=? WHERE ID=?';
    } else if (type === 'assistante') {
        sql = 'UPDATE assistantes SET id_bus=? WHERE id=?';
    } else {
        return res.status(400).json({ error: 'Type invalide. Utilisez "enfant" ou "assistante"' });
    }

    db.query(sql, [id_bus || null, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Entité non trouvée' });
        res.json({ message: `Affectation au bus mise à jour` });
    });
});

module.exports = router;
