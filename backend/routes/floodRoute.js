const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Point to the shared ML data folder
const mlDataDir = path.join(__dirname, '..', '..', 'ML', 'ml-api', 'data');

// GET /api/flood/images -> List all available map images
router.get('/images', (req, res) => {
  try {
    if (!fs.existsSync(mlDataDir)) {
      return res.json([]);
    }

    const files = fs
      .readdirSync(mlDataDir)
      .filter((f) => f.toLowerCase().match(/\.(jpg|jpeg|png)$/));

    // Return list of objects
    const imageList = files.map((f) => ({
      filename: f,
      url: `/data/${f}`
    }));

    return res.json(imageList);
  } catch (err) {
    console.error('List images error:', err);
    return res.status(500).json({ error: 'Failed to list images' });
  }
});

// GET /api/flood/latest-image (Kept for backward compatibility)
router.get('/latest-image', (req, res) => {
  try {
    if (!fs.existsSync(mlDataDir)) return res.json({});
    
    const files = fs
      .readdirSync(mlDataDir)
      .filter((f) => f.toLowerCase().match(/\.(jpg|jpeg|png)$/));

    if (files.length === 0) return res.json({});

    // Sort by modification time (newest first)
    const filesWithTime = files.map((f) => {
      const full = path.join(mlDataDir, f);
      return { name: f, mtime: fs.statSync(full).mtimeMs };
    });

    filesWithTime.sort((a, b) => b.mtime - a.mtime);
    
    return res.json({ 
        imageUrl: `/data/${filesWithTime[0].name}`,
        filename: filesWithTime[0].name
    });
  } catch (err) {
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;