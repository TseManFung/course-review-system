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

// GET /review/check?courseId=&semesterId=  - check if current user already reviewed this offering
router.get('/check', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { courseId, semesterId } = req.query;
    if (!courseId || !semesterId) return res.status(400).json({ error: 'courseId and semesterId required' });
    const [[row]] = await pool.query(
      'SELECT 1 AS ok FROM Review WHERE userId = ? AND courseId = ? AND semesterId = ? LIMIT 1',
      [userId, courseId, semesterId]
    );
    res.json({ exists: !!row });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check review' }); }
});

// POST /review - create a review (auto create CourseOffering if needed)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating, comment } = req.body || {};
    if (!courseId || !semesterId) return res.status(400).json({ error: 'courseId and semesterId required' });
    const isIntInRange = (v) => Number.isInteger(v) && v >= 0 && v <= 10;
    if (![contentRating, teachingRating, gradingRating, workloadRating].every(isIntInRange)) {
      return res.status(400).json({ error: 'Ratings must be integers between 0 and 10' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // ensure offering exists
      await conn.query(
        'INSERT INTO CourseOffering (courseId, semesterId) VALUES (?, ?) ON DUPLICATE KEY UPDATE semesterId = VALUES(semesterId)',
        [courseId, semesterId]
      );

      // ensure not already reviewed
      const [[dup]] = await conn.query(
        'SELECT reviewId FROM Review WHERE userId = ? AND courseId = ? AND semesterId = ? LIMIT 1',
        [userId, courseId, semesterId]
      );
      if (dup) {
        await conn.rollback();
        return res.status(409).json({ error: 'You have already reviewed this offering' });
      }

      const reviewId = Date.now();
      await conn.query(
        `INSERT INTO Review (reviewId, userId, courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'C')`,
        [reviewId, userId, courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating]
      );
      await conn.query(
        'INSERT INTO ReviewComment (reviewId, comment) VALUES (?, ?)',
        [reviewId, (typeof comment === 'string' && comment.trim() !== '') ? comment.trim() : null]
      );

      await conn.commit();
      res.status(201).json({ message: 'Review created', reviewId });
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create review' }); }
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
