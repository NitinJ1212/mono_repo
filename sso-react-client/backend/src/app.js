// src/app.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express      = require('express');
const session      = require('express-session');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const cors         = require('cors');
const routes       = require('./routes');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));
app.set('trust proxy', 1);

// Allow React frontend to call backend
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5174',
  credentials: true,   // IMPORTANT: allows cookies to be sent cross-origin
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret:            process.env.SESSION_SECRET || 'dev-secret',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/', routes);

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'internal_server_error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running   → http://localhost:${PORT}`);
  console.log(`   SSO Server        → ${process.env.SSO_SERVER}`);
  console.log(`   Frontend URL      → ${process.env.FRONTEND_URL}`);
  console.log(`   OAuth Callback    → ${process.env.REDIRECT_URI}\n`);
});
