// src/utils/crypto.js
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;

// ─── Random tokens ────────────────────────────
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateCode() {
  return crypto.randomBytes(32).toString('base64url');
}

// ─── Hashing ──────────────────────────────────
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ─── PKCE ─────────────────────────────────────
// Verify: SHA256(code_verifier) == code_challenge (base64url)
function verifyCodeChallenge(codeVerifier, codeChallenge) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return hash === codeChallenge;
}

module.exports = {
  generateToken,
  generateCode,
  hashToken,
  hashPassword,
  verifyPassword,
  verifyCodeChallenge,
};
