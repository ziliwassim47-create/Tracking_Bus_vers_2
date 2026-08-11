const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const app = express();
const server = http.createServer(app);

// Configuration CORS restrictive
const allowedOrigins = ['http://localhost:8083', 'http://localhost:3001', 'http://localhost:3000', 'http://localhost:5173'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Accès bloqué par la politique CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── Request logging middleware ───────────────────────────────────────────────
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n📥 [${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const userRoutes       = require('./Routes/RoutesUsers');
const authRoutes       = require('./Routes/RoutesAuth');
const adminRoutes      = require('./Routes/RoutesAdmin');
const assistanteRoutes = require('./Routes/RoutesAssistante');

app.use('/api',           userRoutes);
app.use('/api/auth',      authRoutes);
app.use('/api/admin',     adminRoutes);

// Protection CORS spécifique pour les routes assistante
app.use('/api/assistante', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && !origin.includes('8083')) {
    return res.status(403).json({ error: 'Accès bloqué : Route strictement réservée à l\'application assistante' });
  }
  next();
}, assistanteRoutes);

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = socketIo(server, {
  cors: { origin: "*" }
});

app.get("/", (req, res) => {
  res.send("🚌 BusTracker Server — Fonctionnel !");
});

// Simple connectivity test
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is reachable",
    timestamp: new Date().toISOString(),
    server: "BusTrackerBackend",
    port: 4321
  });
});

// Test database
app.get("/test-db", (req, res) => {
  const db = require('./db.js');
  db.query('SELECT 1 as test', (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message, code: err.code });
    res.json({ success: true, message: 'Database connected', timestamp: new Date().toISOString() });
  });
});

// ─── Socket.IO events ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("✅ Client connecté :", socket.id);

  socket.on("busLocationUpdate", (data) => {
    console.log("📩 busLocationUpdate :", data);
    io.emit("busLocationUpdate", data);
  });

  socket.on("busId", (data) => {
    console.log("🔑 busId :", data);
    io.emit("busId", data);
  });

  socket.on("busLocationStart", (data) => {
    console.log("🚌 busLocationStart :", data);
    io.emit("busLocationStart", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client déconnecté :", socket.id);
  });
});

server.listen(4321, '0.0.0.0', () => {
  console.log("🚀 Serveur en écoute sur http://0.0.0.0:4321");
  console.log("📋 Routes disponibles:");
  console.log("   POST /api/auth/login");
  console.log("   GET  /api/admin/stats");
  console.log("   GET  /api/admin/bus");
  console.log("   GET  /api/admin/assistantes");
  console.log("   GET  /api/admin/parents");
  console.log("   GET  /api/admin/enfants");
  console.log("   GET  /api/assistante/bus/:id/eleves");
  console.log("   POST /api/assistante/trajet/start");
  console.log("   POST /api/assistante/probleme");
  console.log("\n📋 Ready to receive requests...\n");
});
