// models/RescueRequest.js
const mongoose = require('mongoose');

const rescueSchema = new mongoose.Schema({
  userLocation: {
    type: [Number], // [x, y]
    required: true,
  },
  rescuerGoal: {
    type: [Number], // set when rescuer accepts
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
    ref: 'Rescuer',
  },
  path: [[Number]], // computed path
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RescueRequest', rescueSchema);
