const axios = require('axios');

exports.getFloodPath = async (req, res) => {
  try {
    const { start, goal, goals, imagePath } = req.body;

    // Normalize: Ensure we are sending a 'goals' array to Flask
    let targetGoals = goals;
    if (!targetGoals && goal) {
      targetGoals = [goal]; 
    }

    const flaskResponse = await axios.post(
      'http://localhost:5000/api/path',
      {
        start,
        goals: targetGoals, // Send the array version
        imagePath
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    return res.json(flaskResponse.data);
  } catch (error) {
    console.error('ML service error (Node):', error.message);

    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }

    return res.status(500).json({ error: 'ML service error' });
  }
};