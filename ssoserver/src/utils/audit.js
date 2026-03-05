// src/utils/audit.js
const { query } = require('../db');

async function auditLog({ userId, clientId, eventType, req, metadata = {} }) {
  try {
    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const ua = req?.headers?.['user-agent'] || null;

    await query(
      `INSERT INTO audit_logs (user_id, client_id, event_type, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, clientId || null, eventType, ip, ua, JSON.stringify(metadata)]
    );
  } catch (err) {
    // Never throw from audit — just log
    console.error('Audit log error:', err.message);
  }
}

module.exports = { auditLog };
