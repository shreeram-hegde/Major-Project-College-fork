// routes/uploadRoute.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const router = express.Router();

// Store uploads under backend/uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `flood-${unique}${ext}`);
  },
});

const upload = multer({ storage });

// POST /api/upload/flood-image
router.post('/flood-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const filename = req.file.filename;      // e.g. flood-123.jpg
    const sourcePath = req.file.path;        // backend/uploads/...

    // Path where your Flask app expects images (adjust if your ML path differs)
    const mlDataDir = path.join(
      __dirname,
      '..',
      '..',
      'ML',
      'ml-api',
      'data'
    );

    if (!fs.existsSync(mlDataDir)) {
      fs.mkdirSync(mlDataDir, { recursive: true });
    }

    const destPath = path.join(mlDataDir, filename);

    // Copy uploaded image so Flask can read it from its data/ folder
    fs.copyFileSync(sourcePath, destPath);

    // Tell Flask to build the grid for this image
    const flaskRes = await axios.post('http://localhost:5000/api/prepare-grid', {
      imagePath: filename,
    });

    // If Flask explicitly says invalid_image, forward that to the client
    if (flaskRes.data && flaskRes.data.error === 'invalid_image') {
      return res.status(400).json({
        error: 'invalid_image',
        message:
          flaskRes.data.message ||
          "Invalid Image! Upload image of a geographical location's map",
      });
    }

    return res.json({
      message: 'Image uploaded and grid prepared',
      filename,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    if (err.response) {
      console.error('Flask status:', err.response.status);
      console.error('Flask data:', err.response.data);
      // If Flask responded with invalid_image, bubble it up
      if (err.response.data && err.response.data.error === 'invalid_image') {
        return res.status(400).json({
          error: 'invalid_image',
          message:
            err.response.data.message ||
            "Invalid Image! Upload image of a geographical location's map",
        });
      }
    }

    return res.status(500).json({ error: 'Upload/ML prepare failed' });
  }
});

module.exports = router;
