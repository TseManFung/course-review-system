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

// IMPORTANT: place fixed sub-routes like /search and /check BEFORE any dynamic :courseId route
// GET /course/search?query=&page=&limit=&sort=
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { offset, limit } = buildPagination(req);
    const query = (req.query.query || '').trim();
    const sort = (req.query.sort || 'latest').toLowerCase();
    const like = `%${query}%`;

    const where = query
      ? `WHERE c.status = 'C' AND (
           c.courseId LIKE ? OR c.name LIKE ? OR EXISTS (
             SELECT 1 FROM CourseOfferingInstructor coi
             JOIN Instructor i ON coi.instructorId = i.instructorId
             WHERE coi.courseId = c.courseId AND i.status = 'C' AND (
               i.firstName LIKE ? OR i.lastName LIKE ? OR i.email LIKE ?
             )
           )
         )`
      : `WHERE c.status = 'C'`;

    let orderBy = 'ORDER BY latestReview DESC';
    if (sort === 'reviews') orderBy = 'ORDER BY reviewCount DESC';
    else if (sort === 'rating') orderBy = 'ORDER BY avgTotal DESC';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT c.courseId
         FROM Course c
         LEFT JOIN CourseDescription cd ON c.courseId = cd.courseId
         ${where}
         GROUP BY c.courseId
       ) t`,
      query ? [like, like, like, like, like] : []
    );

    const [rows] = await pool.query(
      `SELECT c.courseId, c.name, c.departmentId, cd.description,
        ROUND(IFNULL(AVG(r.contentRating), 0), 2) AS avgContentRating,
        ROUND(IFNULL(AVG(r.teachingRating), 0), 2) AS avgTeachingRating,
        ROUND(IFNULL(AVG(r.gradingRating), 0), 2) AS avgGradingRating,
        ROUND(IFNULL(AVG(r.workloadRating), 0), 2) AS avgWorkloadRating,
        ROUND((IFNULL(AVG(r.contentRating),0) + IFNULL(AVG(r.teachingRating),0) + IFNULL(AVG(r.gradingRating),0) + IFNULL(AVG(r.workloadRating),0)) / 4, 2) AS avgTotal,
        COUNT(r.reviewId) AS reviewCount,
        MAX(r.createdAt) AS latestReview
       FROM Course c
       LEFT JOIN CourseDescription cd ON c.courseId = cd.courseId
       LEFT JOIN Review r ON c.courseId = r.courseId AND r.status = 'C'
       ${where}
       GROUP BY c.courseId
       ${orderBy}
       LIMIT ? OFFSET ?`,
      query ? [like, like, like, like, like, limit, offset] : [limit, offset]
    );
    res.json({ rows, total, page: Math.floor(offset / limit) + 1, limit });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to search courses' }); }
});

// GET /course/check?courseId= - check existence
router.get('/check', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ error: 'courseId required' });
    const [[row]] = await pool.query('SELECT 1 AS ok FROM Course WHERE courseId = ? LIMIT 1', [courseId]);
    res.json({ exists: !!row });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to check course' }); }
});

// GET /course/:courseId - course details: base info, offerings, and review stats
router.get('/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const [[base]] = await pool.query(
      `SELECT c.courseId, c.departmentId, d.name AS departmentName, c.name, c.credits, c.status,
              cd.description
       FROM Course c
       JOIN Department d ON c.departmentId = d.departmentId
       LEFT JOIN CourseDescription cd ON c.courseId = cd.courseId
       WHERE c.courseId = ?`,
      [courseId]
    );
    if (!base) return res.status(404).json({ error: 'Course not found' });

    const [offerings] = await pool.query(
      `SELECT co.courseId, co.semesterId, s.name AS semesterName,
              coi.instructorId, i.firstName, i.lastName, i.email
       FROM CourseOffering co
       JOIN Semester s ON co.semesterId = s.semesterId
       LEFT JOIN CourseOfferingInstructor coi ON co.courseId = coi.courseId AND co.semesterId = coi.semesterId
       LEFT JOIN Instructor i ON coi.instructorId = i.instructorId
       WHERE co.courseId = ?
       ORDER BY s.semesterId DESC, i.lastName ASC, i.firstName ASC`,
      [courseId]
    );

    const [[stats]] = await pool.query(
      `SELECT ROUND(AVG(contentRating), 2) AS contentRating,
              ROUND(AVG(teachingRating), 2) AS teachingRating,
              ROUND(AVG(gradingRating), 2) AS gradingRating,
              ROUND(AVG(workloadRating), 2) AS workloadRating,
              COUNT(*) AS count
       FROM Review WHERE courseId = ? AND status = 'C'`,
      [courseId]
    );

    res.json({ course: base, offerings, stats });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch course details' }); }
});

// GET /course/:courseId/offerings - list offerings for a course
router.get('/:courseId/offerings', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const [rows] = await pool.query(
      `SELECT co.courseId, co.semesterId, s.name AS semesterName,
              coi.instructorId, i.firstName, i.lastName, i.email
       FROM CourseOffering co
       JOIN Semester s ON co.semesterId = s.semesterId
       LEFT JOIN CourseOfferingInstructor coi ON co.courseId = coi.courseId AND co.semesterId = coi.semesterId
       LEFT JOIN Instructor i ON coi.instructorId = i.instructorId
       WHERE co.courseId = ?
       ORDER BY s.semesterId DESC, i.lastName ASC, i.firstName ASC`,
      [courseId]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch offerings' }); }
});

// POST /course/:courseId/instructor - add instructor to a course offering (auto create offering)
router.post('/:courseId/instructor', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semesterId, instructorId } = req.body || {};
    if (!semesterId || !instructorId) {
      return res.status(400).json({ error: 'semesterId and instructorId required' });
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'INSERT INTO CourseOffering (courseId, semesterId) VALUES (?, ?) ON DUPLICATE KEY UPDATE semesterId = VALUES(semesterId)',
        [courseId, semesterId]
      );
      await conn.query(
        'INSERT IGNORE INTO CourseOfferingInstructor (courseId, semesterId, instructorId) VALUES (?, ?, ?)',
        [courseId, semesterId, instructorId]
      );
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
    res.status(201).json({ message: 'Instructor linked to offering' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to link instructor' }); }
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
