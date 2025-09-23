const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { PASSWORD_REGEX, EMAIL_REGEX, buildPagination } = require('./utils');

const router = express.Router();

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const [rows] = await pool.query(
      'SELECT userId, email, firstName, lastName, accessLevel, loginFail, createdAt, updatedAt FROM `User` WHERE userId = ?',
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.patch('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ error: 'Password does not meet complexity requirements' });
    }

    const { userId } = req.user;
    const [[user]] = await pool.query('SELECT password FROM `User` WHERE userId = ?', [userId]);
    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) {
      await pool.query('UPDATE `User` SET loginFail = loginFail + 1 WHERE userId = ?', [userId]);
      return res.status(401).json({ error: 'Old password incorrect' });
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE `User` SET password = ?, updatedAt = NOW() WHERE userId = ?', [hashed, userId]);
    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

router.patch('/delete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    await pool.query('UPDATE `User` SET accessLevel = -10000, updatedAt = NOW() WHERE userId = ?', [userId]);
    res.json({ message: 'Account deleted (logical)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const search = (req.query.search || '').trim();
    const like = `%${search}%`;
    const where = search
      ? 'WHERE accessLevel >= 0 AND (userId LIKE ? OR email LIKE ? OR firstName LIKE ? OR lastName LIKE ? )'
      : 'WHERE accessLevel >= 0';
    const params = search ? [like, like, like, like] : [];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`User\` ${where}`, params);
    const [rows] = await pool.query(
      `SELECT userId, email, firstName, lastName, accessLevel, loginFail, createdAt, updatedAt
       FROM \`User\` ${where} ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ total, rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/:userId/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { block, restoreLevel } = req.body || {};
    if (typeof block !== 'boolean') return res.status(400).json({ error: 'block boolean required' });
    let targetLevel = -10000;
    if (!block) {
      const lvl = Number(restoreLevel);
      targetLevel = Number.isFinite(lvl) ? lvl : 10000;
    }
    await pool.query('UPDATE `User` SET accessLevel = ?, updatedAt = NOW() WHERE userId = ?', [targetLevel, userId]);
    res.json({ message: block ? 'User blocked' : 'User unblocked', accessLevel: targetLevel });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

router.get('/:userId/details', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const [[user]] = await pool.query(
      'SELECT userId, email, firstName, lastName, accessLevel, loginFail, createdAt, updatedAt FROM `User` WHERE userId = ?',
      [userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [reviews] = await pool.query(
      `SELECT r.*, rc.comment
       FROM Review r
       LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId
       WHERE r.userId = ?`,
      [userId]
    );
    res.json({ user, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

module.exports = router;
