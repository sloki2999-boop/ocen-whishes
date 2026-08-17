const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Bottle = require('./models/bottle');
const mockDb = require('./mockDb'); // Fallback local database

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection with Auto-Seed and Fallback
let dbConnected = false;

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 3000 // Timeout fast
  })
    .then(async () => {
      console.log('Connected to MongoDB successfully.');
      dbConnected = true;
      
      // Seed database if empty
      const bottleCount = await Bottle.countDocuments();
      if (bottleCount === 0) {
        console.log('Database is empty. Seeding mock bottles...');
        const mockBottles = mockDb.getBottles();
        await Bottle.create(mockBottles.map(({ _id, ...rest }) => rest));
      }
    })
    .catch(err => {
      console.warn('⚠️ MongoDB connection failed. Falling back to local JSON database (mockDb.js).');
    });
} else {
  console.log('No MONGODB_URI provided. Running in fallback JSON database mode.');
}

// Status check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: dbConnected ? 'connected' : 'fallback-json',
    timestamp: new Date()
  });
});

// Seed endpoint
app.post('/api/seed', async (req, res) => {
  try {
    if (dbConnected) {
      await Bottle.deleteMany({});
      const mockBottles = mockDb.reset();
      await Bottle.create(mockBottles.map(({ _id, ...rest }) => rest));
    } else {
      mockDb.reset();
    }
    res.json({ success: true, message: 'Database successfully re-seeded!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/bottles
app.get('/api/bottles', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json(mockDb.getBottles());
    }
    const bottles = await Bottle.find({}).sort({ createdAt: -1 });
    res.json(bottles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bottles
app.post('/api/bottles', async (req, res) => {
  try {
    const { message, bottleType, stoneType } = req.body;
    if (!message || !bottleType) {
      return res.status(400).json({ error: 'Message and bottleType are required.' });
    }

    const payload = {
      message,
      bottleType,
      stoneType: stoneType || 'none',
      replies: [],
      x: Math.random() * 80 + 10,
      y: Math.random() * 50 + 25,
      speed: Math.random() * 0.1 + 0.05
    };

    if (!dbConnected) {
      return res.status(201).json(mockDb.createBottle(payload));
    }

    const bottle = await Bottle.create(payload);
    res.status(201).json(bottle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/bottles/:id/reply
app.post('/api/bottles/:id/reply', async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply) {
      return res.status(400).json({ error: 'Reply text is required.' });
    }

    if (!dbConnected) {
      const updated = mockDb.addReply(req.params.id, reply);
      if (!updated) return res.status(404).json({ error: 'Bottle not found.' });
      return res.json(updated);
    }

    const bottle = await Bottle.findById(req.params.id);
    if (!bottle) {
      return res.status(404).json({ error: 'Bottle not found.' });
    }

    bottle.replies.push(reply);
    await bottle.save();
    res.json(bottle);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/bottles/:id (Sink a bottle)
app.delete('/api/bottles/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      const success = mockDb.deleteBottle(req.params.id);
      if (!success) return res.status(404).json({ error: 'Bottle not found.' });
      return res.json({ success: true, message: 'Bottle sank to the deep ocean.' });
    }

    const deleted = await Bottle.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Bottle not found.' });
    }
    res.json({ success: true, message: 'Bottle sank to the deep ocean.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

module.exports = app;
