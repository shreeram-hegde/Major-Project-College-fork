// routes/MLRoute.js
const express = require('express');
const { getFloodPath } = require('../controllers/MLController');

const router = express.Router();

// POST /api/flood/path
router.post('/path', getFloodPath);

module.exports = router;
