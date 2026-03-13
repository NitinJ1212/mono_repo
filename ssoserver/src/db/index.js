// src/db/index.js
// dotenv is loaded in app.js BEFORE this file is required.
// Using lazy initialization so Pool is only created after env vars are loaded.
const { Pool } = require('pg');
const Redis = require('ioredis');

let _pool = null;
let _redis = null;

function getPool() {
  if (_pool) return _pool;

  // pg requires password to always be a string — never undefined/null
  const password = process.env.DB_PASSWORD !== undefined
    ? String(process.env.DB_PASSWORD)
    : '';

  _pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'sso_db',
    user: process.env.DB_USER || 'postgres',
    password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  _pool.on('error', (err) => {
    console.error('Unexpected DB error:', err.message);
  });

  return _pool;
}

function getRedis() {
  if (_redis) return _redis;

  // Redis rejects empty-string password — pass undefined if not set
  const password = process.env.REDIS_PASSWORD
    ? String(process.env.REDIS_PASSWORD)
    : undefined;

  _redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });

  _redis.on('error', (err) => {
    console.error('Redis error:', err.message);
  });

  return _redis;
}

// Proxy objects — first property access triggers lazy initialization
const pool = new Proxy({}, { get: (_, prop) => getPool()[prop] });
const redis = new Proxy({}, { get: (_, prop) => getRedis()[prop] });

const query = (text, params) => getPool().query(text, params);
const getClient = () => getPool().connect();

module.exports = { pool, query, getClient, redis, getPool, getRedis };