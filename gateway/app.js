require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.url);
    next();
});

// app.use('/api/auth', createProxyMiddleware({
//     target: process.env.AUTH_SERVICE,
//     changeOrigin: true,
//     pathRewrite: {
//         '^/api/auth': '',
//     }
// }));
app.use('/api/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': '',
    },
    on: {
        proxyReq: fixRequestBody,  // 👈 This fixes the body forwarding
    }
}));
app.use('/api/auth-sso', createProxyMiddleware({
    target: process.env.AUTH_SSO_SERVICE,
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth-sso': '',
    },
    on: {
        proxyReq: fixRequestBody,  // 👈 This fixes the body forwarding
    }
}));

app.listen(process.env.PORT, () => {
    console.log(`Gateway running on ${process.env.PORT}`);
});