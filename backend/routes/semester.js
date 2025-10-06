const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { buildPagination } = require('./utils');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const search = (req.query.search || '').trim();
    const like = `%${search}%`;
    const where = search ? 'WHERE semesterId LIKE ? OR name LIKE ?' : '';
    const params = search ? [like, like] : [];
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM Semester ${where}`, params);
    const [rows] = await pool.query(
      `SELECT semesterId, name FROM Semester ${where} ORDER BY semesterId DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch semester' }); }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { semesterId, name } = req.body || {};
    if (!semesterId || !name) return res.status(400).json({ error: 'semesterId and name required' });
    await pool.query('INSERT INTO Semester (semesterId, name) VALUES (?, ?)', [semesterId, name]);
    res.status(201).json({ message: 'Semester created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create semester' }); }
});

router.patch('/:semesterId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { semesterId } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await pool.query('UPDATE Semester SET name = ? WHERE semesterId = ?', [name, semesterId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Semester not found' });
    res.json({ message: 'Semester updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update semester' }); }
});

router.patch('/:semesterId/delete', authenticateToken, requireAdmin, (req, res) => {
  res.status(501).json({ error: 'Logical delete not supported by current schema' });
});

module.exports = router;
