// src/utils/generateKeys.js
// Run ONCE: node src/utils/generateKeys.js
const { generateKeyPairSync } = require('crypto');
const fs   = require('fs');
const path = require('path');

const keysDir = path.resolve('./keys');
if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding:  { type: 'spki',  format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(path.join(keysDir, 'private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'public.pem'),  publicKey);

console.log('✅ RSA key pair generated in ./keys/');
console.log('   private.pem — keep SECRET, never commit');
console.log('   public.pem  — safe to expose via JWKS');
