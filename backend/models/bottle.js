const mongoose = require('mongoose');

const bottleSchema = new mongoose.Schema({
  message: { type: String, required: true },
  anonymousName: { type: String, required: true },
  drawingPoints: { type: mongoose.Schema.Types.Mixed, required: true }, // Array of stroke arrays [[[x, y], [x, y]], ...]
  color: { type: String, required: true }, // glowing color hex/hsl
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  speed: { type: Number, required: true },
  angle: { type: Number, required: true },
  rotationSpeed: { type: Number, required: true },
  replies: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Bottle', bottleSchema);
