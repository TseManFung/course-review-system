const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { courseId, semesterId } = req.body || {};
    if (!courseId || !semesterId) return res.status(400).json({ error: 'courseId and semesterId required' });
    await pool.query(
      'INSERT INTO CourseOffering (courseId, semesterId) VALUES (?, ?) ON DUPLICATE KEY UPDATE semesterId = VALUES(semesterId)',
      [courseId, semesterId]
    );
    res.status(201).json({ message: 'Course offering created' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create course offering' }); }
});

module.exports = router;
