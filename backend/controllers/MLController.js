// controllers/MLController.js
const axios = require('axios');

exports.getFloodPath = async (req, res) => {
  try {
    const flaskResponse = await axios.post(
      'http://localhost:5000/api/path',
      req.body,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return res.json(flaskResponse.data);
  } catch (error) {
    console.error('ML service error (Node):', error.message);

    if (error.response) {
      console.error('Flask status:', error.response.status);
      console.error('Flask data:', error.response.data);
      return res
        .status(error.response.status)
        .json(error.response.data);
    }

    return res.status(500).json({ error: 'ML service error' });
  }
};
