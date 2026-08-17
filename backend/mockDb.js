const fs = require('fs');
const path = require('path');

const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, 'db.json');

const initialData = {
  bottles: [
    {
      _id: "bt_1",
      message: "May you find the peace you are looking for. The ocean always listens.",
      bottleType: "sapphire",
      stoneType: "aquamarine",
      replies: ["Thank you. I needed to read this today.", "Sending love back across the sea."],
      x: 15,
      y: 35,
      speed: 0.08,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_2",
      message: "I launched this bottle from a cold beach. Even when it feels dark, the stars are still there.",
      bottleType: "amber",
      stoneType: "citrine",
      replies: ["The stars are beautiful tonight. Stay strong.", "I can see them too."],
      x: 35,
      y: 55,
      speed: 0.12,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_3",
      message: "I am still in love with the person who taught me how to stargaze. I hope you are happy, wherever you are.",
      bottleType: "rose",
      stoneType: "amethyst",
      replies: [],
      x: 55,
      y: 40,
      speed: 0.06,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_4",
      message: "I passed my coding exam today! Sending some happy energy into the currents. Keep going!",
      bottleType: "emerald",
      stoneType: "none",
      replies: ["Congratulations!", "This made me smile. Thanks for sharing the joy!"],
      x: 75,
      y: 65,
      speed: 0.15,
      createdAt: new Date().toISOString()
    },
    {
      _id: "bt_5",
      message: "To whoever reads this: You are made of stardust, and the ocean is in your blood. You belong here.",
      bottleType: "sapphire",
      stoneType: "none",
      replies: [],
      x: 25,
      y: 70,
      speed: 0.07,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_6",
      message: "I miss my grandfather. I write his name in the sand every time I visit the sea. He loved the waves.",
      bottleType: "amber",
      stoneType: "amethyst",
      replies: ["He is with you in every tide.", "What a beautiful memory."],
      x: 65,
      y: 30,
      speed: 0.09,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "bt_7",
      message: "A secret: I am secretly writing a novel, and no one in my life knows. I hope one day it sits on a shelf.",
      bottleType: "rose",
      stoneType: "none",
      replies: ["I would read it!", "Believe in your stories."],
      x: 45,
      y: 48,
      speed: 0.10,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
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
      x: Math.random() * 80 + 10, // 10% to 90%
      y: Math.random() * 50 + 25, // 25% to 75%
      speed: Math.random() * 0.1 + 0.05,
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
