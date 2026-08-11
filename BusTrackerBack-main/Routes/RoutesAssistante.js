const express = require('express');
const router = express.Router();
const db = require('../db.js');

// ══════════════════════════════════════════════════════════════════════════════
// PRÉSENCE — Liste des élèves du bus + mise à jour
// ══════════════════════════════════════════════════════════════════════════════

// GET élèves du bus d'une assistante
router.get('/bus/:busId/eleves', (req, res) => {
    const busId = parseInt(req.params.busId, 10);
    if (isNaN(busId)) return res.status(400).json({ error: 'busId invalide' });

    const sql = 'SELECT * FROM users WHERE ID_BUS = ? ORDER BY CLASSE, NIVEAU, NOM';
    db.query(sql, [busId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT mise à jour des présences
router.put('/presences', (req, res) => {
    const students = req.body; // [{id, present: true/false}]
    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: 'Liste d\'élèves requise' });
    }

    const sql =
        'UPDATE users SET presence = CASE ID ' +
        students.map(s => `WHEN ${parseInt(s.id)} THEN ${s.present ? 1 : 0}`).join(' ') +
        ' END WHERE ID IN (' + students.map(s => parseInt(s.id)).join(',') + ')';

    db.query(sql, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Présences mises à jour', affected: result.affectedRows });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// TRAJET — Démarrer / Terminer
// ══════════════════════════════════════════════════════════════════════════════

// POST démarrer un trajet
router.post('/trajet/start', (req, res) => {
    const { id_assistante, id_bus, latitude, longitude } = req.body;
    if (!id_assistante || !id_bus) {
        return res.status(400).json({ error: 'id_assistante et id_bus requis' });
    }

    // Compter les présents
    db.query('SELECT COUNT(*) as total FROM users WHERE ID_BUS = ? AND presence = 1', [id_bus], (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        const nbPresents = countResult[0].total;

        const sql = `
            INSERT INTO trajets (id_bus, id_assistante, date_debut, lat_debut, lng_debut, statut, nb_eleves_presents)
            VALUES (?, ?, NOW(), ?, ?, 'en_cours', ?)`;
        db.query(sql, [id_bus, id_assistante, latitude || null, longitude || null, nbPresents], (err2, result) => {
            if (err2) return res.status(500).json({ error: err2.message });
            
            // Mettre le bus en statut en_trajet
            db.query("UPDATE bus SET statut='en_trajet' WHERE id=?", [id_bus]);
            
            res.status(201).json({
                message: 'Trajet démarré',
                trajet_id: result.insertId,
                nb_eleves: nbPresents
            });
        });
    });
});

// PUT terminer un trajet
router.put('/trajet/:id/stop', (req, res) => {
    const { id_bus } = req.body;
    db.query(
        "UPDATE trajets SET date_fin=NOW(), statut='termine' WHERE id=?",
        [req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) return res.status(404).json({ message: 'Trajet non trouvé' });
            
            // Remettre le bus en statut actif
            if (id_bus) db.query("UPDATE bus SET statut='actif' WHERE id=?", [id_bus]);
            
            // Remettre toutes les présences à 0 (nouveau trajet)
            if (id_bus) db.query("UPDATE users SET presence=0 WHERE ID_BUS=?", [id_bus]);

            res.json({ message: 'Trajet terminé' });
        }
    );
});

// GET trajet en cours d'un bus
router.get('/trajet/en_cours/:busId', (req, res) => {
    const sql = `
        SELECT t.*, a.nom as assistante_nom, b.matricule as bus_matricule
        FROM trajets t
        LEFT JOIN assistantes a ON t.id_assistante = a.id
        LEFT JOIN bus b ON t.id_bus = b.id
        WHERE t.id_bus = ? AND t.statut = 'en_cours'
        ORDER BY t.created_at DESC LIMIT 1`;
    db.query(sql, [req.params.busId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0] || null);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS de l'assistante
// ══════════════════════════════════════════════════════════════════════════════

// GET notifications pour une assistante
router.get('/notifications/:assistanteId', (req, res) => {
    const sql = `
        SELECT * FROM notifications 
        WHERE role_destinataire IN ('assistante','all') 
          AND (id_destinataire = ? OR id_destinataire IS NULL)
        ORDER BY created_at DESC LIMIT 30`;
    db.query(sql, [req.params.assistanteId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// PUT marquer une notification comme lue
router.put('/notifications/:id/lu', (req, res) => {
    db.query('UPDATE notifications SET lu=1 WHERE id=?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notification lue' });
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROBLÈMES déclarés par l'assistante
// ══════════════════════════════════════════════════════════════════════════════

// POST déclarer un problème
router.post('/probleme', (req, res) => {
    const { id_declarant, categorie, description } = req.body;
    if (!id_declarant || !description) {
        return res.status(400).json({ error: 'id_declarant et description requis' });
    }

    db.query(
        'INSERT INTO problemes (id_declarant, role_declarant, categorie, description) VALUES (?, ?, ?, ?)',
        [id_declarant, 'assistante', categorie || 'autre', description],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            // Créer une notification pour l'admin
            db.query(
                "INSERT INTO notifications (type, message, role_destinataire) VALUES ('probleme', ?, 'admin')",
                [`Problème signalé : ${description.substring(0, 100)}`]
            );

            res.status(201).json({ message: 'Problème déclaré', id: result.insertId });
        }
    );
});

// GET historique des problèmes d'une assistante
router.get('/problemes/:assistanteId', (req, res) => {
    db.query(
        'SELECT * FROM problemes WHERE id_declarant = ? AND role_declarant = "assistante" ORDER BY created_at DESC',
        [req.params.assistanteId],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// ══════════════════════════════════════════════════════════════════════════════
// HISTORIQUE des trajets de l'assistante
// ══════════════════════════════════════════════════════════════════════════════

router.get('/historique/:assistanteId', (req, res) => {
    const sql = `
        SELECT t.*, b.matricule as bus_matricule,
               TIMESTAMPDIFF(MINUTE, t.date_debut, t.date_fin) as duree_minutes
        FROM trajets t
        LEFT JOIN bus b ON t.id_bus = b.id
        WHERE t.id_assistante = ?
        ORDER BY t.created_at DESC
        LIMIT 30`;
    db.query(sql, [req.params.assistanteId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ══════════════════════════════════════════════════════════════════════════════
// PROFIL assistante
// ══════════════════════════════════════════════════════════════════════════════

router.get('/profil/:id', (req, res) => {
    const sql = `
        SELECT a.*, b.matricule as bus_matricule, b.capacite
        FROM assistantes a
        LEFT JOIN bus b ON a.id_bus = b.id
        WHERE a.id = ?`;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ message: 'Assistante non trouvée' });
        res.json(results[0]);
    });
});

module.exports = router;
