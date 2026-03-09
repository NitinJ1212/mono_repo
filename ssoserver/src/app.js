// src/app.js
// ⚠️ dotenv MUST be the very first thing — before any other require
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { loadKeys } = require('./config/jwt');
const { getPool, getRedis } = require('./db');
const routes = require('./routes');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Headers ─────────────────────────
app.use(helmet());
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:5174", // frontend
    "http://localhost:3000", // gateway (old)
    "http://localhost:5000", // gateway (actual port — match your gateway PORT env var)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
// ─── Body parsers ─────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Rate limit all routes ────────────────────
app.use(generalLimiter);

// ─── Health check ─────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── All routes ───────────────────────────────
app.use('/', routes);

// ─── 404 ──────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'not_found' }));

// ─── Global error handler ─────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal_server_error' });
});

// ─── Startup ──────────────────────────────────
async function start() {
  try {
    // Print loaded env for debugging (remove in production)
    console.log('DB config:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      pass: process.env.DB_PASSWORD ? '***set***' : '(empty)',
    });

    // Verify DB connection
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log('✅ PostgreSQL connected');

    // Verify Redis connection
    const redis = getRedis();
    await redis.ping();
    console.log('✅ Redis connected');

    // Load RSA keys
    await loadKeys();

    app.listen(PORT, () => {
      console.log(`\n🚀 SSO Server running on http://localhost:${PORT}`);
      console.log(`   Discovery: http://localhost:${PORT}/.well-known/openid-configuration`);
      console.log(`   JWKS:      http://localhost:${PORT}/.well-known/jwks.json\n`);
    });
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

start();

module.exports = app;