const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const {generateSnowflakeId, buildPagination } = require('./utils');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const search = (req.query.search || '').toString().trim();
    const like = `%${search}%`;
    const where = search
      ? "WHERE r.status = 'C' AND (r.userId LIKE ? OR r.courseId LIKE ? OR r.semesterId LIKE ? OR rc.comment LIKE ?)"
      : "WHERE r.status = 'C'";
    const params = search ? [like, like, like, like] : [];

    const [rows] = await pool.query(
      `SELECT r.*, rc.comment FROM Review r LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId
       ${where} ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM Review r LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId ${where}`,
      params
    );
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

// GET /review/my - list reviews of current user (non-admin), paginated
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { offset, limit } = buildPagination(req);
    const [rows] = await pool.query(
      `SELECT r.*, rc.comment FROM Review r
       LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId
       WHERE r.userId = ? AND r.status = 'C'
       ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM Review WHERE userId = ? AND status = 'C'`,
      [userId]
    );
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch my reviews' }); }
});

// POST /review - create a review (auto create CourseOffering if needed)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    const { courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating, comment, instructorIds } = req.body || {};
    if (!courseId || !semesterId) return res.status(400).json({ error: 'courseId and semesterId required' });
    const isIntInRange = (v) => Number.isInteger(v) && v >= 1 && v <= 10;
    if (![contentRating, teachingRating, gradingRating, workloadRating].every(isIntInRange)) {
      return res.status(400).json({ error: 'Ratings must be integers between 1 and 10' });
    }
    let instructors = Array.isArray(instructorIds) ? instructorIds.filter(id => id !== null && id !== undefined && id !== '') : [];

    // normalize to unique numeric or string ids
    instructors = [...new Set(instructors.map(v => String(v).trim()).filter(v => v !== ''))];

    // 預先驗證講師是否存在，減少外鍵錯誤 (1452)
    let existingInstructorIds = [];
    let invalidInstructorIds = [];
    if (instructors.length > 0) {
      try {
        const placeholders = instructors.map(() => '?').join(',');
        const [rows] = await pool.query(
          `SELECT instructorId FROM Instructor WHERE instructorId IN (${placeholders}) AND status = 'C'`,
          instructors
        );
        const foundSet = new Set(rows.map(r => String(r.instructorId)));
        existingInstructorIds = instructors.filter(id => foundSet.has(String(id)));
        invalidInstructorIds = instructors.filter(id => !foundSet.has(String(id)));
      } catch (e) {
        console.error('Failed to pre-validate instructors', e);
      }
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

      const reviewId = generateSnowflakeId();
      await conn.query(
        `INSERT INTO Review (reviewId, userId, courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'C')`,
        [reviewId, userId, courseId, semesterId, contentRating, teachingRating, gradingRating, workloadRating]
      );
      await conn.query(
        'INSERT INTO ReviewComment (reviewId, comment) VALUES (?, ?)',
        [reviewId, (typeof comment === 'string' && comment.trim() !== '') ? comment.trim() : null]
      );

      // Link only existing instructors to avoid foreign key violation
      if (existingInstructorIds.length > 0) {
        for (const ins of existingInstructorIds) {
          try {
            await conn.query(
              'INSERT IGNORE INTO CourseOfferingInstructor (courseId, semesterId, instructorId) VALUES (?, ?, ?)',
              [courseId, semesterId, ins]
            );
          } catch (e) { console.error('Failed to link instructor', ins, e); }
        }
      }

      await conn.commit();
      res.status(201).json({
        message: 'Review created',
        reviewId,
        linkedInstructors: existingInstructorIds.length,
        invalidInstructors: invalidInstructorIds,
      });
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
