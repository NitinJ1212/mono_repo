require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const app = express();

// ─── Single CORS config (remove the duplicate) ───────────────────────────────
const corsOptions = {
    origin: 'http://localhost:5174',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
};
app.use(cors(corsOptions));

// ─── CRITICAL: Handle OPTIONS preflight BEFORE proxy middleware ───────────────
// Without this, the proxy swallows preflight requests and the browser sees a CORS error
// app.options('/(.*)', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    next();
});

app.use('/api/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': '',
    },
    on: {
        proxyReq: fixRequestBody,
    }
}));

// app.use('/api/client-sso', createProxyMiddleware({
//     target: process.env.AUTH_SSO_SERVICE,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/api/client-sso': '',
//     },
//     on: {
//         proxyReq: fixRequestBody,
//     }
// }));

app.use('/api/auth-sso', createProxyMiddleware({
    target: process.env.AUTH_SSO_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth-sso': '',
    },
    on: {
        proxyReq: fixRequestBody,
    }
}));

app.listen(process.env.PORT, () => {
    console.log(`Gateway running on ${process.env.PORT}`);
});