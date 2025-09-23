const express = require('express');
const pool = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /encouragement/random
router.get('/random', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT encouragementId, content FROM Encouragement WHERE status = 'C' ORDER BY RAND() LIMIT 1"
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No encouragement available' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch encouragement' });
  }
});

// POST /encouragement
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { content } = req.body || {};
    if (!content || content.length > 248)
      return res.status(400).json({ error: 'content required (<=248 chars)' });
    await pool.query(
      'INSERT INTO Encouragement (encouragementId, content, status) VALUES (?, ?, "C")',
      [Date.now(), content]
    );
    res.status(201).json({ message: 'Encouragement created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create encouragement' });
  }
});

// PATCH /encouragement/:encouragementId
router.patch('/:encouragementId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { encouragementId } = req.params;
    const { content, status } = req.body || {};
    if (content && content.length > 248) return res.status(400).json({ error: 'content too long' });
    const [r] = await pool.query(
      'UPDATE Encouragement SET content = COALESCE(?, content), status = COALESCE(?, status) WHERE encouragementId = ?',
      [content ?? null, status ?? null, encouragementId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Encouragement not found' });
    res.json({ message: 'Encouragement updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update encouragement' });
  }
});

// PATCH /encouragement/:encouragementId/delete
router.patch('/:encouragementId/delete', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { encouragementId } = req.params;
    const [r] = await pool.query('UPDATE Encouragement SET status = "D" WHERE encouragementId = ?', [encouragementId]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Encouragement not found' });
    res.json({ message: 'Encouragement deleted (logical)' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete encouragement' });
  }
});

module.exports = router;
