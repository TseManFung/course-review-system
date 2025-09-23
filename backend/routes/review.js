const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { buildPagination } = require('./utils');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const [rows] = await pool.query(
      `SELECT r.*, rc.comment FROM Review r LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId
       WHERE r.status = 'C' ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM Review WHERE status = 'C'");
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

router.patch('/:reviewId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const [r] = await pool.query('UPDATE Review SET status = "D" WHERE reviewId = ?', [reviewId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete review' }); }
});

module.exports = router;
