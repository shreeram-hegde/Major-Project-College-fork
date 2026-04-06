const mongoose = require('mongoose');

const rescueSchema = new mongoose.Schema({
  userLocation: {
    type: [Number], // [x, y]
    required: true,
  },
  mapFilename: {
    type: String,
    required: true,
  },
  // Updated to allow multiple goals if needed
  rescuerGoal: {
    type: mongoose.Schema.Types.Mixed, // Can be [x,y] or [[x,y], [x,y]]
  },
  details: {
    name: String,
    peopleCount: Number,
    injuries: String,
    status: String,
    notes: String,
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'completed', 'cancelled'],
    default: 'pending',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Updated to handle multiple paths (3D array: Array of Paths, where each path is Array of Coords)
  path: {
    type: mongoose.Schema.Types.Mixed, 
  },
  createdAt: { type: Date, default: Date.now },
});

rescueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

module.exports = mongoose.model('RescueRequest', rescueSchema);