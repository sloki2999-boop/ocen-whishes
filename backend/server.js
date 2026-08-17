const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/user');
const Team = require('./models/team');
const Project = require('./models/project');
const Task = require('./models/task');
const Notification = require('./models/notification');
const seedDB = require('./seed');
const mockDb = require('./mockDb'); // Fallback local database

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection with Auto-Seed and Fallback
let dbConnected = false;
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 3000 // Timeout fast so fallback activates quickly
})
  .then(async () => {
    console.log('Connected to MongoDB successfully.');
    dbConnected = true;
    
    // Seed database if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database is empty. Seeding mock data...');
      await seedDB();
    }
  })
  .catch(err => {
    console.warn('⚠️ MongoDB connection failed. Falling back to local JSON database (mockDb.js).');
    console.warn('Reason:', err.message);
  });

// Status check endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    database: dbConnected ? 'connected' : 'fallback-json',
    timestamp: new Date()
  });
});

// Seed endpoint to manual trigger
app.post('/api/seed', async (req, res) => {
  try {
    if (dbConnected) {
      await seedDB();
    } else {
      mockDb.reset();
    }
    res.json({ success: true, message: 'Database successfully re-seeded!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json(mockDb.getUsers());
    }
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(201).json(mockDb.createUser(req.body));
    }
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Teams
app.get('/api/teams', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json(mockDb.getTeams());
    }
    const teams = await Team.find({}).populate('members');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(201).json(mockDb.createTeam(req.body));
    }
    const team = await Team.create(req.body);
    const populated = await Team.findById(team._id).populate('members');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Projects
app.get('/api/projects', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.json(mockDb.getProjects());
    }
    const projects = await Project.find({}).populate('team');
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(201).json(mockDb.createProject(req.body));
    }
    const project = await Project.create(req.body);
    const populated = await Project.findById(project._id).populate('team');
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const { projectId, assigneeId } = req.query;
    if (!dbConnected) {
      return res.json(mockDb.getTasks(projectId, assigneeId));
    }
    let query = {};
    if (projectId) query.project = projectId;
    if (assigneeId) query.assignee = assigneeId;

    const tasks = await Task.find(query)
      .populate('assignee')
      .populate({
        path: 'project',
        populate: { path: 'team' }
      })
      .sort({ dueDate: 1 }); // Sort by closest deadline
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    if (!dbConnected) {
      return res.status(201).json(mockDb.createTask(req.body));
    }
    const task = await Task.create(req.body);
    const populatedTask = await Task.findById(task._id)
      .populate('assignee')
      .populate('project');

    // Create Notification if assignee is specified
    if (task.assignee) {
      await Notification.create({
        recipient: task.assignee,
        message: `You have been assigned the task: "${task.title}". Due date: ${new Date(task.dueDate).toLocaleDateString()}`,
        type: 'assignment'
      });
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      const task = mockDb.updateTask(req.params.id, req.body);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      return res.json(task);
    }
    const oldTask = await Task.findById(req.params.id);
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignee')
      .populate({
        path: 'project',
        populate: { path: 'team' }
      });

    if (!updatedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Trigger notification if assignee changed
    if (req.body.assignee && String(oldTask.assignee) !== String(req.body.assignee)) {
      await Notification.create({
        recipient: req.body.assignee,
        message: `You have been assigned the task: "${updatedTask.title}".`,
        type: 'assignment'
      });
    }

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    if (!dbConnected) {
      const success = mockDb.deleteTask(req.params.id);
      if (!success) return res.status(404).json({ error: 'Task not found' });
      return res.json({ success: true, message: 'Task deleted successfully.' });
    }
    const deleted = await Task.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!dbConnected) {
      return res.json(mockDb.getNotifications(userId));
    }
    let query = {};
    if (userId) query.recipient = userId;

    const notifications = await Notification.find(query)
      .populate('recipient')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    if (!dbConnected) {
      const notif = mockDb.markNotificationRead(req.params.id);
      if (!notif) return res.status(404).json({ error: 'Notification not found' });
      return res.json(notif);
    }
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(notification);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
  });
}

module.exports = app;
