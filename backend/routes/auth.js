const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { PASSWORD_REGEX, EMAIL_REGEX } = require('./utils');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    if (!userId || !password) {
      return res.status(400).json({ error: 'userId and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM `User` WHERE userId = ?', [userId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];

    if (Number(user.accessLevel) < 0) {
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await pool.query('UPDATE `User` SET loginFail = loginFail + 1 WHERE userId = ?', [userId]);
      const [[{ loginFail }]] = await pool.query('SELECT loginFail FROM `User` WHERE userId = ?', [userId]);
      if (loginFail > 5) {
        await pool.query('UPDATE `User` SET accessLevel = -10000 WHERE userId = ?', [userId]);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset loginFail on success
    await pool.query('UPDATE `User` SET loginFail = 0 WHERE userId = ?', [userId]);

    const token = jwt.sign(
      {
        userId: user.userId,
        accessLevel: user.accessLevel,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { userId, email, password, firstName, lastName } = req.body || {};
    if (!userId || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!PASSWORD_REGEX.test(password)) {
      return res.status(400).json({ error: 'Password does not meet complexity requirements' });
    }

    const saltRounds = 12;
    const hashed = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'INSERT INTO `User` (userId, email, password, accessLevel, firstName, lastName, loginFail, createdAt, updatedAt) VALUES (?, ?, ?, 10001, ?, ?, 0, NOW(), NOW())',
      [userId, email, hashed, firstName, lastName]
    );

    res.status(201).json({ message: 'Registered. Please verify email via /api/auth/verify?userId=...' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'User or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /auth/verify
router.get('/verify', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });
    await pool.query('UPDATE `User` SET accessLevel = 10000, updatedAt = NOW() WHERE userId = ?', [userId]);
    res.json({ message: 'Account verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /auth/status
router.get('/status', authenticateToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

module.exports = router;
