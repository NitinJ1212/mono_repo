require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    console.log("Gateway root hit");
    res.send("Gateway working");
});

app.use((req, res, next) => {
    console.log("Incoming request:", req.method, "-------------", req.url);
    next();
});

// 🔐 Route to Auth Service
app.use('/api/auth', createProxyMiddleware({
    target: process.env.AUTH_SERVICE,
    changeOrigin: true,
    // logLevel: 'debug',
    pathRewrite: {
        '^/api/auth': '',   // <-- IMPORTANT
    },
    // onProxyReq: (proxyReq, req, res) => {
    //     console.log("Forwarding to:", process.env.AUTH_SERVICE + req.url);
    // }
})
);

// 👤 Route to User Service
app.use('/api/users', createProxyMiddleware({
    target: process.env.USER_SERVICE,
    changeOrigin: true,
})
);

app.listen(process.env.PORT, () => {
    console.log(`API Gateway running on port ${process.env.PORT}`);
});