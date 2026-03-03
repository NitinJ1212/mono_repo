const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const clientVerify = require("./routes/clientVerify.routes");
const errorMiddleware = require("./middlewares/error.middleware");

const app = express();


app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

cors({
  origin: ["http://localhost:3000", "http://localhost:5000"],
  credentials: true,
})

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

app.use("/", authRoutes);
app.use("/verify", clientVerify);

app.use(errorMiddleware);

module.exports = app;