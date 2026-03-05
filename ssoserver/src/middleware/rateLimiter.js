// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const { redis } = require('../db');

// ─── Generic limiter factory ──────────────────
function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too_many_requests', message },
  });
}

// ─── Login: 5 attempts per 15 min per IP ─────
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Try again in 15 minutes.',
});

// ─── Token endpoint: 20 per minute ───────────
const tokenLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many token requests.',
});

// ─── Register: 3 per hour ─────────────────────
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: 'Too many registration attempts.',
});

// ─── General API ──────────────────────────────
const generalLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Rate limit exceeded.',
});

module.exports = { loginLimiter, tokenLimiter, registerLimiter, generalLimiter };
