const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {generateSnowflakeId, EMAIL_REGEX, buildPagination } = require('./utils');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const search = (req.query.search || '').trim();
    const like = `%${search}%`;
    const where = search ? "WHERE status = 'C' AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?)" : "WHERE status = 'C'";
    const params = search ? [like, like, like] : [];
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM Instructor ${where}`, params);
    const [rows] = await pool.query(
      `SELECT instructorId, firstName, lastName, email, departmentId, status FROM Instructor ${where} ORDER BY instructorId ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch instructors' }); }
});

// POST /instructor - create instructor
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, departmentId } = req.body || {};
    if (!firstName || !lastName || !departmentId) {
      return res.status(400).json({ error: 'firstName, lastName, departmentId required' });
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  const instructorId = generateSnowflakeId();
    await pool.query(
      'INSERT INTO Instructor (instructorId, firstName, lastName, email, departmentId, status) VALUES (?, ?, ?, ?, ?, "C")',
  [instructorId, firstName, lastName, email || null, departmentId]
    );
    res.status(201).json({ message: 'Instructor created', instructorId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create instructor' }); }
});

// GET /instructor/search?query=...
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.query || '').trim();
    if (!q) return res.json([]);
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT instructorId, firstName, lastName, email, departmentId
       FROM Instructor
       WHERE status = 'C' AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ?) 
       ORDER BY lastName ASC, firstName ASC
       LIMIT 50`,
      [like, like, like]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to search instructor' }); }
});

// GET /instructor/check?email=
router.get('/check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'email required' });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const [[row]] = await pool.query('SELECT 1 AS ok FROM Instructor WHERE email = ? LIMIT 1', [email]);
    res.json({ exists: !!row });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check instructor' }); }
});

router.patch('/:instructorId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { firstName, lastName, email, departmentId, status } = req.body || {};
    if (email && !EMAIL_REGEX.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    const [r] = await pool.query(
      `UPDATE Instructor SET 
        firstName = COALESCE(?, firstName),
        lastName = COALESCE(?, lastName),
        email = ?,
        departmentId = COALESCE(?, departmentId),
        status = COALESCE(?, status)
       WHERE instructorId = ?`,
      [firstName ?? null, lastName ?? null, typeof email === 'string' ? email : null, departmentId ?? null, status ?? null, instructorId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Instructor not found' });
    res.json({ message: 'Instructor updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update instructor' }); }
});

router.patch('/:instructorId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { instructorId } = req.params;
    const [r] = await pool.query('UPDATE Instructor SET status = "D" WHERE instructorId = ?', [instructorId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Instructor not found' });
    res.json({ message: 'Instructor deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete instructor' }); }
});

module.exports = router;
