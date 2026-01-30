// routes/floodRoute.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Adjust this to point to the same ML data/ folder you copy uploads into
const mlDataDir = path.join(__dirname, '..', '..', 'ML', 'ml-api', 'data');

router.get('/latest-image', (req, res) => {
  try {
    if (!fs.existsSync(mlDataDir)) {
      return res.status(404).json({ error: 'no_images', message: 'No images folder' });
    }

    const files = fs
      .readdirSync(mlDataDir)
      .filter((f) => f.toLowerCase().match(/\.(jpg|jpeg|png)$/));

    if (files.length === 0) {
      return res.status(404).json({ error: 'no_images', message: 'No map images found' });
    }

    const filesWithTime = files.map((f) => {
      const full = path.join(mlDataDir, f);
      return { name: f, mtime: fs.statSync(full).mtimeMs };
    });

    filesWithTime.sort((a, b) => b.mtime - a.mtime);
    const latest = filesWithTime[0].name;

    // Serve via a static URL under /data
    const imageUrl = `/data/${latest}`;

    return res.json({ imageUrl });
  } catch (err) {
    console.error('latest-image error:', err);
    return res.status(500).json({ error: 'internal', message: 'Failed to get latest image' });
  }
});

module.exports = router;
