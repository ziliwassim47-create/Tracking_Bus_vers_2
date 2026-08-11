const express = require('express');
const router = express.Router();
const db = require('../db.js');

// Route pour créer un utilisateur
router.post('/register', (req, res) => {
    const { ID, NOM, VILLE ,TLF } = req.body;
    const sql = 'INSERT INTO users (ID, NOM, VILLE,TLF) VALUES (?, ?, ?,?)';
    db.query(sql, [ID, NOM, VILLE ,TLF], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Utilisateur créé !' });
    });
});
router.get('/users', (req, res) => {
    console.log('\n🔍 [GET /api/users] Request received');
    console.log('   Query params:', req.query);
    console.log('   Headers:', req.headers);
    
    const busId = parseInt(req.query.bus, 10);
    console.log(`   Parsed busId: ${busId} (isNaN: ${isNaN(busId)}, > 0: ${busId > 0})`);

    let sql = 'SELECT * FROM users';
    let params = [];

    if (!isNaN(busId) && busId > 0) {
        sql += ' WHERE ID_BUS = ?';
        params.push(busId);
        console.log(`   ✅ Filtering by bus ID: ${busId}`);
    } else {
        console.log(`   ℹ️  No bus filter, fetching all users`);
    }

    sql += ' ORDER BY CLASSE, NIVEAU, NOM';
    console.log(`   SQL: ${sql}`);
    console.log(`   Params: [${params.join(', ')}]`);

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ [GET /api/users] Database query error:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log(`✅ [GET /api/users] Returning ${results.length} users`);
        res.json(results);
    });
});

  // ROUTE GET Adresse AVEC PARAMÈTRE
  router.get("/userAdresse/:id", (req, res) => {
    const userId = req.params.id; 
    const sql = "SELECT VILLE FROM users WHERE ID = ?";

    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur lors de la requête :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        let adresse;
        try {
            adresse = JSON.parse(result[0].VILLE); 
        } catch (error) {
            adresse = result[0].VILLE; 
        }

        res.json({ id: userId, adresse });
    });
});

  // ROUTE GET BUS_ID AVEC PARAMÈTRE
  router.get("/user/:id", (req, res) => {
    const userId = req.params.id; 
    const sql = "SELECT * FROM users WHERE ID = ?";
     db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error("Erreur lors de la requête :", err);
            return res.status(500).json({ error: "Erreur serveur" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        let bus;
        let adresse;
        
        try {
            bus = JSON.parse(result[0].ID_BUS); 
            adresse = JSON.parse(result[0].VILLE); 

           
        } catch (error) {
            bus = result[0].ID_BUS; 
            adresse = result[0].VILLE; 

        }

        res.json({ id: userId, bus ,adresse});
    });
});


// Route PUT pour mettre à jour l'adresse (latitude, longitude) d'un utilisateur
router.put('/users/:id', (req, res) => {
    const userId = req.params.id;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude et Longitude sont requises" });
    }

    const newAddress = JSON.stringify({ latitude, longitude });
    const sql = 'UPDATE users SET VILLE = ? WHERE ID = ?';

    db.query(sql, [newAddress, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.status(200).json({ message: "Adresse mise à jour avec succès !", adresse: newAddress });
    });
});

// Route PUT pour mettre à jour la présence  d'un utilisateur dynamique
router.put("/updateAllPresences", (req, res) => {
    const students = req.body; 
    const sql = "UPDATE users SET presence = CASE id " +
      students.map(student => `WHEN ${student.id} THEN ${student.present ? 1 : 0}`).join(" ") +
      " END WHERE id IN (" + students.map(student => student.id).join(",") + ")";
  
    db.query(sql, (err, result) => {
      if (err) {
        console.error("Erreur lors de la mise à jour :", err);
        return res.status(500).json({ error: "Erreur serveur lors de la mise à jour." });
      }
      res.json({ message: "Présences mises à jour avec succès !" });
    });
  });
  
module.exports = router;
