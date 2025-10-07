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
    const where = search ? 'WHERE departmentId LIKE ? OR name LIKE ?' : '';
    const params = search ? [like, like] : [];
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM Department ${where}`, params);
    const [rows] = await pool.query(
      `SELECT departmentId, name FROM Department ${where} ORDER BY departmentId ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch department' }); }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId, name } = req.body || {};
    if (!departmentId || !name) return res.status(400).json({ error: 'departmentId and name required' });
    await pool.query('INSERT INTO Department (departmentId, name) VALUES (?, ?)', [departmentId, name]);
    res.status(201).json({ message: 'Department created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create department' }); }
});

router.patch('/:departmentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await pool.query('UPDATE Department SET name = ? WHERE departmentId = ?', [name, departmentId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update department' }); }
});

router.patch('/:departmentId/delete', authenticateToken, requireAdmin, (req, res) => {
  res.status(501).json({ error: 'Logical delete not supported by current schema' });
});

module.exports = router;
