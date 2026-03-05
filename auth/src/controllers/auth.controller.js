const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = require("../utils/token.utils");
const { getPool } = require('../config/postgresdb');

exports.register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ email, password });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    next(err);
  }
};
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const pool = getPool();

    // Use parameterized query to prevent SQL injection
    const result = await pool.query(`SELECT * FROM users WHERE user_email = $1`, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }
    // const verifyValid = await pool.query(`SELECT * FROM users WHERE state = $1`, [state]);
    const user = result.rows[0];

    // Compare hashed password
    // const isMatch = await bcrypt.compare(password, user.user_password); // assume password is stored hashed
    // if (!isMatch) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Invalid password",
    //   });
    // }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user);
    // const refreshToken = generateRefreshToken(user);

    // Optional: store refreshToken in DB
    const tokenGenerateTime = new Date().toISOString();
    await pool.query(`update public.auth_service_users SET token='${accessToken}', token_generate_time='${tokenGenerateTime}',   updated_at=NOW()`)
    await pool.query(`select * from public.auth_service_users WHERE token='${accessToken}'`)

    // Set refresh token as HttpOnly cookie
    res.cookie("refreshToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Send response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      url: `${user.redirect_uri}?code=${accessToken}&state=${state}`
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login",
      errors: err.message,
    });
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token)
      return res.status(403).json({ message: "Forbidden" });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.sendStatus(204);

  const user = await User.findOne({ refreshToken: token }).select("+refreshToken");
  if (user) {
    user.refreshToken = null;
    await user.save();
  }

  res.clearCookie("refreshToken");
  res.sendStatus(204);
};

