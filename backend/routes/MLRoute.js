// routes/MLRoute.js
const express = require('express');
const { getFloodPath } = require('../controllers/MLController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/flood/path
router.post('/path', protect, getFloodPath);

module.exports = router;
