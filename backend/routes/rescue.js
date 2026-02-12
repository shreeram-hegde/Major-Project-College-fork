// routes/rescue.js
const express = require('express');
const RescueRequest = require('../models/RescueRequest');
const router = express.Router();

// Public: POST /api/rescue/request
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

// Auth: GET /api/rescue/requests (rescuer sees pending)
router.get('/requests', async (req, res) => {
  // TODO: filter by rescuer team/region
  const requests = await RescueRequest.find({ 
    status: 'pending' 
  }).sort({ createdAt: -1 }).limit(20);
  res.json(requests);
});

// Auth: POST /api/rescue/assign/:id
router.post('/assign/:id', async (req, res) => {
  const { rescuerLocation } = req.body; // rescuer's current position
  const request = await RescueRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: 'assigned',
      rescuerGoal: rescuerLocation,
    },
    { new: true }
  );
  res.json({ message: 'Request assigned', request });
});

// Auth: POST /api/rescue/path
router.post('/path', async (req, res) => {
  const { rescuerLocation, victimLocation } = req.body;
  
  // forward to your existing ML pipeline
  const mlRes = await axios.post('http://localhost:5000/api/path', {
    start: rescuerLocation,  // rescuer → victim
    goal: victimLocation,
  });
  
  res.json({
    ...mlRes.data,
    victimDetails: req.body.victimDetails, // pass through
  });
});

module.exports = router;
