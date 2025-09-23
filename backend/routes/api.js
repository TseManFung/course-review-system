const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Utilities
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const toInt = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? d : n;
};

const buildPagination = (req) => {
  const page = Math.max(1, toInt(req.query.page, 1));
  const limit = Math.min(100, Math.max(1, toInt(req.query.limit, 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

router.get('/test', (req, res) => {
  res.json({ status: 'OK' });
});

// ===================== Auth & User =====================
// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
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
        email: user.email
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

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
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

    // NOTE: Email verification sending not implemented. Provide a mock verify endpoint.
    res.status(201).json({ message: 'Registered. Please verify email via /api/auth/verify?userId=...' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'User or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/verify
router.get('/auth/verify', async (req, res) => {
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

// GET /api/auth/status
router.get('/auth/status', authenticateToken, (req, res) => {
  res.json({ authenticated: true, user: req.user });
});

// GET /api/user/profile
router.get('/user/profile', authenticateToken, async (req, res) => {
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

// PATCH /api/user/password
router.patch('/user/password', authenticateToken, async (req, res) => {
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

// PATCH /api/user/delete (logical delete -> set accessLevel negative)
router.patch('/user/delete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.user;
    await pool.query('UPDATE `User` SET accessLevel = -10000, updatedAt = NOW() WHERE userId = ?', [userId]);
    res.json({ message: 'Account deleted (logical)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Admin: GET /api/user
router.get('/user', authenticateToken, requireAdmin, async (req, res) => {
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

// Admin: PATCH /api/user/:userId/block
router.patch('/user/:userId/block', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { block, restoreLevel } = req.body || {};
    if (typeof block !== 'boolean') return res.status(400).json({ error: 'block boolean required' });
    let targetLevel = -10000;
    if (!block) {
      // restore original if provided, otherwise default to student (10000)
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

// Admin: GET /api/user/:userId/details
router.get('/user/:userId/details', authenticateToken, requireAdmin, async (req, res) => {
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

// ===================== Department =====================
router.get('/department', authenticateToken, requireAdmin, async (req, res) => {
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

router.post('/department', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId, name } = req.body || {};
    if (!departmentId || !name) return res.status(400).json({ error: 'departmentId and name required' });
    await pool.query('INSERT INTO Department (departmentId, name) VALUES (?, ?)', [departmentId, name]);
    res.status(201).json({ message: 'Department created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create department' }); }
});

router.patch('/department/:departmentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await pool.query('UPDATE Department SET name = ? WHERE departmentId = ?', [name, departmentId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update department' }); }
});

router.patch('/department/:departmentId/delete', authenticateToken, requireAdmin, (req, res) => {
  // Schema has no status field for Department; logical delete unsupported at DB level
  res.status(501).json({ error: 'Logical delete not supported by current schema' });
});

// ===================== Semester =====================
router.get('/semester', authenticateToken, requireAdmin, async (req, res) => {
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

router.post('/semester', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { semesterId, name } = req.body || {};
    if (!semesterId || !name) return res.status(400).json({ error: 'semesterId and name required' });
    await pool.query('INSERT INTO Semester (semesterId, name) VALUES (?, ?)', [semesterId, name]);
    res.status(201).json({ message: 'Semester created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create semester' }); }
});

router.patch('/semester/:semesterId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { semesterId } = req.params;
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const [result] = await pool.query('UPDATE Semester SET name = ? WHERE semesterId = ?', [name, semesterId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Semester not found' });
    res.json({ message: 'Semester updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update semester' }); }
});

router.patch('/semester/:semesterId/delete', authenticateToken, requireAdmin, (req, res) => {
  // Schema has no status field for Semester; logical delete unsupported at DB level
  res.status(501).json({ error: 'Logical delete not supported by current schema' });
});

// ===================== Course =====================
router.get('/course', authenticateToken, async (req, res) => {
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

router.post('/course', authenticateToken, requireAdmin, async (req, res) => {
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

router.patch('/course/:courseId', authenticateToken, requireAdmin, async (req, res) => {
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

router.patch('/course/:courseId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const [r] = await pool.query('UPDATE Course SET status = "D" WHERE courseId = ?', [courseId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ message: 'Course deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete course' }); }
});

// GET /api/course/:courseId/reviews
router.get('/course/:courseId/reviews', authenticateToken, async (req, res) => {
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

// ===================== Instructor =====================
router.get('/instructor', authenticateToken, requireAdmin, async (req, res) => {
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

router.patch('/instructor/:instructorId', authenticateToken, requireAdmin, async (req, res) => {
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

router.patch('/instructor/:instructorId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { instructorId } = req.params;
    const [r] = await pool.query('UPDATE Instructor SET status = "D" WHERE instructorId = ?', [instructorId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Instructor not found' });
    res.json({ message: 'Instructor deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete instructor' }); }
});

// ===================== Review =====================
router.get('/review', authenticateToken, requireAdmin, async (req, res) => {
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

router.patch('/review/:reviewId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const [r] = await pool.query('UPDATE Review SET status = "D" WHERE reviewId = ?', [reviewId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete review' }); }
});

// ===================== Encouragement =====================
router.get('/encouragement/random', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT encouragementId, content FROM Encouragement WHERE status = 'C' ORDER BY RAND() LIMIT 1");
    if (rows.length === 0) return res.status(404).json({ error: 'No encouragement available' });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch encouragement' }); }
});

router.post('/encouragement', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content || content.length > 248) return res.status(400).json({ error: 'content required (<=248 chars)' });
    await pool.query('INSERT INTO Encouragement (encouragementId, content, status) VALUES (?, ?, "C")', [Date.now(), content]);
    res.status(201).json({ message: 'Encouragement created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create encouragement' }); }
});

router.patch('/encouragement/:encouragementId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { encouragementId } = req.params;
    const { content, status } = req.body || {};
    if (content && content.length > 248) return res.status(400).json({ error: 'content too long' });
    const [r] = await pool.query('UPDATE Encouragement SET content = COALESCE(?, content), status = COALESCE(?, status) WHERE encouragementId = ?', [content ?? null, status ?? null, encouragementId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Encouragement not found' });
    res.json({ message: 'Encouragement updated' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update encouragement' }); }
});

router.patch('/encouragement/:encouragementId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { encouragementId } = req.params;
    const [r] = await pool.query('UPDATE Encouragement SET status = "D" WHERE encouragementId = ?', [encouragementId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Encouragement not found' });
    res.json({ message: 'Encouragement deleted (logical)' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete encouragement' }); }
});

module.exports = router;