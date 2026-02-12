const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware'); // Import protect

const router = express.Router();

// --- Storage Configuration ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original name if possible, or append timestamp to avoid overwrites
    // For simplicity in this logic, we'll prefix timestamp
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

    const filename = req.file.filename;
    const sourcePath = req.file.path;

    // Define ML Data Directory
    const mlDataDir = path.join(__dirname, '..', '..', 'ML', 'ml-api', 'data');

    if (!fs.existsSync(mlDataDir)) {
      fs.mkdirSync(mlDataDir, { recursive: true });
    }

    const destPath = path.join(mlDataDir, filename);

    // Copy to ML folder
    fs.copyFileSync(sourcePath, destPath);

    // Trigger Flask processing
    const flaskRes = await axios.post('http://localhost:5000/api/prepare-grid', {
      imagePath: filename,
    });

    if (flaskRes.data && flaskRes.data.error === 'invalid_image') {
       return res.status(400).json({ error: 'invalid_image', message: flaskRes.data.message });
    }

    return res.json({
      message: 'Image uploaded and grid prepared',
      filename,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    return res.status(500).json({ error: 'Upload/ML prepare failed' });
  }
});

// NEW: DELETE /api/upload/image/:filename
router.delete('/image/:filename', protect, (req, res) => {
    try {
        const filename = req.params.filename;
        const uploadDir = path.join(__dirname, '..', 'uploads');
        const mlDataDir = path.join(__dirname, '..', '..', 'ML', 'ml-api', 'data');

        const filePathUpload = path.join(uploadDir, filename);
        const filePathML = path.join(mlDataDir, filename);

        // Remove from both locations
        if (fs.existsSync(filePathUpload)) fs.unlinkSync(filePathUpload);
        if (fs.existsSync(filePathML)) fs.unlinkSync(filePathML);

        res.json({ message: "Map deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "Failed to delete image" });
    }
});

module.exports = router;