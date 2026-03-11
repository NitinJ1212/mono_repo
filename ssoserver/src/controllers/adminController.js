// src/controllers/adminController.js
// Admin APIs to register/manage Service Provider clients
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { generateToken } = require('../utils/crypto');
const { auditLog } = require('../utils/audit');

// ─── CREATE CLIENT ────────────────────────────
// POST /admin/clients
async function createClient(req, res) {
  const { name, redirect_uris, allowed_scopes, grant_types } = req.validated;

  try {
    const clientId = `client_${generateToken(12)}`;
    const clientSecret = generateToken(32);
    console.log(clientSecret, "clientSecret=---------", clientId)
    const secretHash = await bcrypt.hash(clientSecret, 12);

    const result = await query(
      `INSERT INTO clients
         (client_id, client_secret_hash, name, redirect_uris, allowed_scopes, grant_types)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, client_id, name, redirect_uris, allowed_scopes, grant_types, created_at`,
      [
        clientId,
        secretHash,
        name,
        redirect_uris,
        allowed_scopes || ['openid', 'profile', 'email'],
        grant_types || ['authorization_code', 'refresh_token'],
      ]
    );

    const client = result.rows[0];
    await auditLog({ eventType: 'admin.client_created', req, metadata: { client_id: clientId } });

    return res.status(201).json({
      message: 'Client registered. Save the client_secret — it will NOT be shown again.',
      client: {
        ...client,
        client_secret: clientSecret,  // shown ONCE
      },
    });
  } catch (err) {
    console.error('Create client error:', err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── LIST CLIENTS ─────────────────────────────
// GET /admin/clients
async function listClients(req, res) {
  try {
    const result = await query(
      `SELECT id, client_id, name, redirect_uris, allowed_scopes, grant_types, is_active, created_at
       FROM clients ORDER BY created_at DESC`
    );
    return res.status(200).json({ clients: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── GET CLIENT ───────────────────────────────
// GET /admin/clients/:clientId
async function getClient(req, res) {
  try {
    const result = await query(
      `SELECT id, client_id, name, redirect_uris, allowed_scopes, grant_types, is_active, created_at
       FROM clients WHERE client_id = $1`,
      [req.params.clientId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'client_not_found' });
    return res.status(200).json({ client: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── UPDATE CLIENT ────────────────────────────
// PUT /admin/clients/:clientId
async function updateClient(req, res) {
  const { name, redirect_uris, allowed_scopes, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE clients
       SET name = COALESCE($1, name),
           redirect_uris  = COALESCE($2, redirect_uris),
           allowed_scopes = COALESCE($3, allowed_scopes),
           is_active = COALESCE($4, is_active)
       WHERE client_id = $5
       RETURNING id, client_id, name, redirect_uris, allowed_scopes, is_active`,
      [name, redirect_uris, allowed_scopes, is_active, req.params.clientId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'client_not_found' });
    await auditLog({ eventType: 'admin.client_updated', req, metadata: { client_id: req.params.clientId } });
    return res.status(200).json({ client: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── ROTATE CLIENT SECRET ─────────────────────
// POST /admin/clients/:clientId/rotate-secret
async function rotateSecret(req, res) {
  try {
    const newSecret = generateToken(32);
    const newHash = await bcrypt.hash(newSecret, 12);

    const result = await query(
      'UPDATE clients SET client_secret_hash = $1 WHERE client_id = $2 RETURNING client_id',
      [newHash, req.params.clientId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'client_not_found' });

    await auditLog({ eventType: 'admin.client_secret_rotated', req, metadata: { client_id: req.params.clientId } });

    return res.status(200).json({
      message: 'Secret rotated. Save this — it will NOT be shown again.',
      client_id: req.params.clientId,
      client_secret: newSecret,
    });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── DELETE CLIENT ────────────────────────────
// DELETE /admin/clients/:clientId
async function deleteClient(req, res) {
  try {
    const result = await query(
      'DELETE FROM clients WHERE client_id = $1 RETURNING client_id',
      [req.params.clientId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'client_not_found' });
    await auditLog({ eventType: 'admin.client_deleted', req, metadata: { client_id: req.params.clientId } });
    return res.status(200).json({ message: 'Client deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

// ─── LIST AUDIT LOGS ──────────────────────────
// GET /admin/audit-logs
async function auditLogs(req, res) {
  const { limit = 50, offset = 0, event_type, user_id } = req.query;
  try {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const vals = [];
    if (event_type) { vals.push(event_type); sql += ` AND event_type = $${vals.length}`; }
    if (user_id) { vals.push(user_id); sql += ` AND user_id = $${vals.length}`; }
    vals.push(parseInt(limit)); sql += ` ORDER BY created_at DESC LIMIT $${vals.length}`;
    vals.push(parseInt(offset)); sql += ` OFFSET $${vals.length}`;

    const result = await query(sql, vals);
    return res.status(200).json({ logs: result.rows });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
}

module.exports = {
  createClient, listClients, getClient,
  updateClient, rotateSecret, deleteClient,
  auditLogs,
};
