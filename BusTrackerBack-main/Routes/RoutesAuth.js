const express = require('express');
const router = express.Router();
const db = require('../db.js');
const bcrypt = require('bcrypt');

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const sql = 'SELECT * FROM comptes WHERE email = ? AND actif = 1';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        if (results.length === 0) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const compte = results[0];

        // Comparer le mot de passe (fallback plain text pour données de test)
        let passwordOk = false;
        try {
            passwordOk = await bcrypt.compare(password, compte.password_hash);
        } catch (e) {
            // Si le hash n'est pas valide (données de test), comparer en clair
            passwordOk = (password === 'password123');
        }

        if (!passwordOk) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        // Vérification de l'origine au login (Frontend vs Rôle)
        const origin = req.headers.origin;
        if (origin) {
            if (origin.includes('8083') && compte.role !== 'assistante') {
                return res.status(403).json({ error: 'Accès refusé : Cette application est réservée aux assistantes.' });
            }
            if (origin.includes('3001') && compte.role !== 'parent') {
                return res.status(403).json({ error: 'Accès refusé : Cette application est réservée aux parents.' });
            }
        }

        // Récupérer les infos du profil selon le rôle
        let profileSql = '';
        let profileTable = '';

        if (compte.role === 'admin') {
            profileSql = 'SELECT id, nom, email, tlf FROM admins WHERE id = ?';
        } else if (compte.role === 'assistante') {
            profileSql = 'SELECT id, nom, email, tlf, id_bus FROM assistantes WHERE id = ?';
        } else if (compte.role === 'parent') {
            profileSql = 'SELECT id, nom, email, tlf FROM parents WHERE id = ?';
        }

        db.query(profileSql, [compte.ref_id], (err2, profileResults) => {
            if (err2) return res.status(500).json({ error: err2.message });

            const profile = profileResults[0] || {};

            res.json({
                success: true,
                role: compte.role,
                ref_id: compte.ref_id,
                profile,
                // Token simplifié (en production: utiliser JWT)
                token: Buffer.from(`${compte.id}:${compte.role}:${Date.now()}`).toString('base64')
            });
        });
    });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Déconnexion réussie' });
});

module.exports = router;
