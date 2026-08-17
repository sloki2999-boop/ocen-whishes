const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, 'db.json');

// Predefined vector drawings for seeding
const starShape = [
  [
    [100, 20], [124, 70], [178, 78], [139, 116], [150, 170], 
    [100, 145], [50, 170], [61, 116], [22, 78], [76, 70], [100, 20]
  ]
];

const heartShape = [
  [
    [100, 50], [80, 30], [50, 30], [30, 50], [30, 80], 
    [100, 150], [170, 80], [170, 50], [150, 30], [120, 30], [100, 50]
  ]
];

const boatShape = [
  // Hull
  [[50, 130], [150, 130], [130, 160], [70, 160], [50, 130]],
  // Mast and Sail
  [[100, 130], [100, 40], [140, 85], [100, 100]]
];

const initialData = {
  bottles: [
    {
      _id: "bt_1",
      message: "I wish I could fly among the nebulas and swim in the deep. This universe is beautiful.",
      anonymousName: "Ethereal Seaglass",
      drawingPoints: starShape,
      color: "#3b82f6", // sapphire blue glow
      x: 15,
      y: 35,
      speed: 0.08,
      angle: 0.1,
      rotationSpeed: 0.005,
      replies: ["Me too. Stargazing makes me feel so small but connected.", "Keep looking up!"],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_2",
      message: "I hope whoever finds this drawing feels loved today. You are not alone.",
      anonymousName: "Solar Driftwood",
      drawingPoints: heartShape,
      color: "#ec4899", // rose pink glow
      x: 35,
      y: 55,
      speed: 0.12,
      angle: -0.2,
      rotationSpeed: -0.008,
      replies: ["Thank you stranger. Warm hugs.", "Sending love from the coast."],
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_3",
      message: "May your sails catch a gentle wind. Drifting along, chasing dreams.",
      anonymousName: "Nebula Wave",
      drawingPoints: boatShape,
      color: "#f59e0b", // amber gold glow
      x: 65,
      y: 40,
      speed: 0.06,
      angle: 0.05,
      rotationSpeed: 0.003,
      replies: [],
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ]
};

// Initialize file only if it does not exist
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  } catch (err) {
    console.error("Failed to initialize mock database:", err);
  }
}

function readData() {
  try {
    const raw = fs.readFileSync(DB_FILE);
    return JSON.parse(raw);
  } catch (err) {
    return initialData;
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write to mock database:", err);
  }
}

const mockDb = {
  reset: () => {
    writeData(initialData);
    return initialData.bottles;
  },

  getBottles: () => {
    return readData().bottles;
  },

  createBottle: (bottleData) => {
    const data = readData();
    const newBottle = {
      _id: 'bt_' + Math.random().toString(36).substr(2, 9),
      replies: [],
      x: Math.random() * 80 + 10,
      y: Math.random() * 50 + 25,
      speed: Math.random() * 0.1 + 0.05,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 0.01) - 0.005,
      createdAt: new Date().toISOString(),
      ...bottleData
    };
    data.bottles.push(newBottle);
    writeData(data);
    return newBottle;
  },

  addReply: (id, replyText) => {
    const data = readData();
    const idx = data.bottles.findIndex(b => b._id === id);
    if (idx === -1) return null;

    data.bottles[idx].replies.push(replyText);
    writeData(data);
    return data.bottles[idx];
  },

  deleteBottle: (id) => {
    const data = readData();
    const idx = data.bottles.findIndex(b => b._id === id);
    if (idx === -1) return false;

    data.bottles.splice(idx, 1);
    writeData(data);
    return true;
  }
};

module.exports = mockDb;
