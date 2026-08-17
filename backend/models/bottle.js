const mongoose = require('mongoose');

const bottleSchema = new mongoose.Schema({
  message: { type: String, required: true },
  bottleType: { type: String, required: true }, // sapphire, emerald, amber, rose
  stoneType: { type: String, default: 'none' }, // amethyst, aquamarine, citrine, none
  replies: [{ type: String }], // reply scroll chain
  x: { type: Number, required: true }, // float position X
  y: { type: Number, required: true }, // float position Y
  speed: { type: Number, required: true } // float speed
}, { timestamps: true });

module.exports = mongoose.model('Bottle', bottleSchema);
