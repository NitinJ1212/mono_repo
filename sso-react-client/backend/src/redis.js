// src/redis.js
const Redis = require('ioredis');

const redis = new Redis({
  host:          process.env.REDIS_HOST || 'localhost',
  port:          parseInt(process.env.REDIS_PORT) || 6379,
  password:      process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

redis.on('error',   (err) => console.error('Redis error:', err));
redis.on('connect', ()    => console.log('✅ Redis connected'));

module.exports = redis;


// const Redis = require('ioredis');

// const redis = new Redis({
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT) || 6379,
//   password: process.env.REDIS_PASSWORD || undefined,
//   retryStrategy: (times) => Math.min(times * 50, 2000),
//   connectTimeout: 10000,
// });

// redis.on('connect', () => console.log('✅ Redis connected'));
// redis.on('error', (err) => console.error('Redis error:', err));
// // redis.on('close', () => console.warn('⚠️ Redis connection closed'));
// // redis.on('reconnecting', () => console.log('🔄 Reconnecting to Redis...'));

// process.on('SIGINT', async () => {
//   await redis.quit();
//   process.exit(0);
// });

// module.exports = redis;