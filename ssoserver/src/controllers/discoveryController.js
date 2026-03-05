// src/controllers/discoveryController.js
const { getJwks } = require('../config/jwt');

// GET /.well-known/openid-configuration
function openidConfiguration(req, res) {
  const issuer = process.env.SSO_ISSUER || 'http://localhost:3000';

  return res.status(200).json({
    issuer,
    authorization_endpoint:              `${issuer}/oauth/authorize`,
    token_endpoint:                       `${issuer}/oauth/token`,
    userinfo_endpoint:                    `${issuer}/oauth/userinfo`,
    revocation_endpoint:                  `${issuer}/oauth/revoke`,
    introspection_endpoint:               `${issuer}/oauth/introspect`,
    jwks_uri:                             `${issuer}/.well-known/jwks.json`,
    response_types_supported:            ['code'],
    grant_types_supported:               ['authorization_code', 'refresh_token'],
    subject_types_supported:             ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported:                    ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_post'],
    claims_supported:                    ['sub', 'iss', 'email', 'email_verified', 'name'],
    code_challenge_methods_supported:    ['S256'],
  });
}

// GET /.well-known/jwks.json
function jwks(req, res) {
  return res.status(200).json(getJwks());
}

module.exports = { openidConfiguration, jwks };
