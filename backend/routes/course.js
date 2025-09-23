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
    const where = search
      ? "WHERE c.status = 'C' AND (c.courseId LIKE ? OR c.name LIKE ?)"
      : "WHERE c.status = 'C'";
    const params = search ? [like, like] : [];

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM Course c ${where}`, params);
    const [rows] = await pool.query(
      `SELECT c.courseId, c.departmentId, c.name, c.credits, c.status, cd.description
       FROM Course c
       LEFT JOIN CourseDescription cd ON c.courseId = cd.courseId
       ${where}
       ORDER BY c.courseId ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({ total, rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch courses' }); }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, departmentId, name, credits, description } = req.body || {};
    if (!courseId || !departmentId || !name || typeof credits !== 'number') {
      return res.status(400).json({ error: 'courseId, departmentId, name, credits required' });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query('INSERT INTO Course (courseId, departmentId, name, credits, status) VALUES (?, ?, ?, ?, "C")', [courseId, departmentId, name, credits]);
      await conn.query('INSERT INTO CourseDescription (courseId, description) VALUES (?, ?)', [courseId, description || null]);
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    res.status(201).json({ message: 'Course created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create course' }); }
});

router.patch('/:courseId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { departmentId, name, credits, description, status } = req.body || {};
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r1] = await conn.query(
        'UPDATE Course SET departmentId = COALESCE(?, departmentId), name = COALESCE(?, name), credits = COALESCE(?, credits), status = COALESCE(?, status) WHERE courseId = ?',
        [departmentId ?? null, name ?? null, typeof credits === 'number' ? credits : null, status ?? null, courseId]
      );
      if (r1.affectedRows === 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
      await conn.query(
        'INSERT INTO CourseDescription (courseId, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE description = VALUES(description)',
        [courseId, typeof description === 'string' ? description : null]
      );
      await conn.commit();
    } catch (e) { await conn.rollback(); if (e.code === 'NOT_FOUND') return res.status(404).json({ error: 'Course not found' }); throw e; }
    finally { conn.release(); }
    res.json({ message: 'Course updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update course' }); }
});

router.patch('/:courseId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const [r] = await pool.query('UPDATE Course SET status = "D" WHERE courseId = ?', [courseId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete course' }); }
});

router.get('/:courseId/reviews', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { offset, limit } = buildPagination(req);
    const [list] = await pool.query(
      `SELECT r.reviewId, r.userId, r.courseId, r.semesterId, r.contentRating, r.teachingRating, r.gradingRating, r.workloadRating, r.createdAt, r.status,
              rc.comment
       FROM Review r LEFT JOIN ReviewComment rc ON r.reviewId = rc.reviewId
       WHERE r.courseId = ? AND r.status = 'C'
       ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`,
      [courseId, limit, offset]
    );
    const [[avg]] = await pool.query(
      `SELECT AVG(contentRating) AS contentRating, AVG(teachingRating) AS teachingRating,
              AVG(gradingRating) AS gradingRating, AVG(workloadRating) AS workloadRating,
              COUNT(*) AS count
       FROM Review WHERE courseId = ? AND status = 'C'`,
      [courseId]
    );
    res.json({ average: avg, reviews: list });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

module.exports = router;
