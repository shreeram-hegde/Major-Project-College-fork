const express = require('express');
const axios = require('axios'); 
const RescueRequest = require('../models/RescueRequest');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// 1. Public: POST /api/rescue/request
router.post('/request', async (req, res) => {
  try {
    const request = new RescueRequest(req.body);
    await request.save();
    res.json({ 
      message: 'Rescue request submitted successfully!', 
      requestId: request._id 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 2. Protected: GET /api/rescue/requests 
router.get('/requests', protect, async (req, res) => {
  try {
    const requests = await RescueRequest.find({ 
      status: 'pending' 
    }).sort({ createdAt: -1 }).limit(50);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Protected: POST /api/rescue/path
// FIX: We now forward the mapFilename to Flask so it uses the correct grid
router.post('/path', protect, async (req, res) => {
  // 1. Get mapFilename from the frontend request
  const { rescuerLocation, victimLocation, mapFilename } = req.body;
  
  try {
    // 2. Send it to Flask using the same key ('imagePath') as uploadRoute.js
    const mlRes = await axios.post('http://localhost:5000/api/path', {
      start: rescuerLocation, 
      goal: victimLocation,
      imagePath: mapFilename, // <--- MATCHING YOUR UPLOAD LOGIC
    });
    
    res.json(mlRes.data);
  } catch (error) {
    console.error("ML Path Error:", error.message);
    if (error.response) {
        // Pass specific ML errors back to frontend
        return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: "Failed to compute rescue path" });
  }
});

// 4. Protected: DELETE /api/rescue/request/:id
router.delete('/request/:id', protect, async (req, res) => {
  try {
    const request = await RescueRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    await request.deleteOne();
    res.json({ message: 'Request resolved and removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;