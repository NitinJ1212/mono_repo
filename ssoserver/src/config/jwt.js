// src/config/jwt.js
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const jwt  = require('jsonwebtoken');
const jose = require('node-jose');

let privateKey, publicKey, keyStore, jwks;

// ─── Load or generate RSA key pair ───────────
async function loadKeys() {
  const privPath = path.resolve(process.env.JWT_PRIVATE_KEY_PATH || './keys/private.pem');
  const pubPath  = path.resolve(process.env.JWT_PUBLIC_KEY_PATH  || './keys/public.pem');

  if (!fs.existsSync(privPath)) {
    throw new Error(`Private key not found at ${privPath}. Run: node src/utils/generateKeys.js`);
  }

  privateKey = fs.readFileSync(privPath, 'utf8');
  publicKey  = fs.readFileSync(pubPath,  'utf8');

  // Build JWKS keystore for public endpoint
  keyStore = jose.JWK.createKeyStore();
  const key = await keyStore.add(publicKey, 'pem', {
    kid: process.env.JWT_KEY_ID || 'sso-key-1',
    use: 'sig',
    alg: 'RS256',
  });

  jwks = { keys: [key.toJSON()] };  // public key only
  console.log('✅ JWT keys loaded');
}

// ─── Sign Access Token ────────────────────────
function signAccessToken(payload) {
  return jwt.sign(payload, privateKey, {
    algorithm : 'RS256',
    expiresIn : parseInt(process.env.ACCESS_TOKEN_TTL) || 900,
    issuer    : process.env.SSO_ISSUER || 'http://localhost:3000',
    keyid     : process.env.JWT_KEY_ID || 'sso-key-1',
  });
}

// ─── Sign ID Token (OIDC) ─────────────────────
function signIdToken(payload) {
  return jwt.sign(payload, privateKey, {
    algorithm : 'RS256',
    expiresIn : 3600,
    issuer    : process.env.SSO_ISSUER || 'http://localhost:3000',
    keyid     : process.env.JWT_KEY_ID || 'sso-key-1',
  });
}

// ─── Verify any JWT ───────────────────────────
function verifyToken(token) {
  return jwt.verify(token, publicKey, {
    algorithms : ['RS256'],
    issuer     : process.env.SSO_ISSUER || 'http://localhost:3000',
  });
}

function getJwks()       { return jwks; }
function getPublicKey()  { return publicKey; }
function getPrivateKey() { return privateKey; }

module.exports = { loadKeys, signAccessToken, signIdToken, verifyToken, getJwks, getPublicKey };
