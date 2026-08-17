const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  status: { type: String, enum: ['Planning', 'Active', 'On Hold', 'Completed'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
