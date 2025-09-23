const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const userRoutes = require('./user');
const departmentRoutes = require('./department');
const semesterRoutes = require('./semester');
const courseRoutes = require('./course');
const instructorRoutes = require('./instructor');
const reviewRoutes = require('./review');
const encouragementRoutes = require('./encouragement');

router.get('/test', (req, res) => res.json({ status: 'OK' }));

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/department', departmentRoutes);
router.use('/semester', semesterRoutes);
router.use('/course', courseRoutes);
router.use('/instructor', instructorRoutes);
router.use('/review', reviewRoutes);
router.use('/encouragement', encouragementRoutes);

module.exports = router;