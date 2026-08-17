const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'db.json');

// Initial seed data for fallback mode
const initialData = {
  users: [
    {
      _id: "usr_alice",
      name: "Alice Smith (Fallback)",
      email: "alice@company.com",
      role: "Product Manager",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
    },
    {
      _id: "usr_bob",
      name: "Bob Jones (Fallback)",
      email: "bob@company.com",
      role: "Lead Developer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
    },
    {
      _id: "usr_charlie",
      name: "Charlie Brown (Fallback)",
      email: "charlie@company.com",
      role: "UI/UX Designer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie"
    },
    {
      _id: "usr_diana",
      name: "Diana Prince (Fallback)",
      email: "diana@company.com",
      role: "QA Engineer",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana"
    }
  ],
  teams: [
    {
      _id: "team_eng",
      name: "Engineering",
      description: "Core software development & QA team.",
      members: ["usr_alice", "usr_bob", "usr_diana"]
    },
    {
      _id: "team_design",
      name: "Creative & Design",
      description: "UI/UX Design, branding, and marketing creative assets.",
      members: ["usr_alice", "usr_charlie"]
    }
  ],
  projects: [
    {
      _id: "proj_mobile",
      name: "Mobile App Redesign",
      description: "Revamping the core mobile app UI/UX and migrating to React Native.",
      team: "team_eng",
      status: "Active"
    },
    {
      _id: "proj_api",
      name: "Core API Refactor",
      description: "Optimizing API endpoints and database queries for scalability.",
      team: "team_eng",
      status: "Active"
    },
    {
      _id: "proj_brand",
      name: "Brand Style Guide",
      description: "Creating a unified design system and style guide for all products.",
      team: "team_design",
      status: "Active"
    }
  ],
  tasks: [
    {
      _id: "task_1",
      title: "Design Figma Wireframes",
      description: "Create high-fidelity wireframes for the user dashboard and profile views.",
      project: "proj_mobile",
      assignee: "usr_charlie",
      status: "Done",
      priority: "High",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "task_2",
      title: "Implement React Navigation",
      description: "Set up fluid navigation transitions and deep linking support.",
      project: "proj_mobile",
      assignee: "usr_bob",
      status: "In Progress",
      priority: "High",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "task_3",
      title: "Write UI Integration Tests",
      description: "Verify navigation and user interactions with component tests.",
      project: "proj_mobile",
      assignee: "usr_diana",
      status: "To Do",
      priority: "Medium",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "task_4",
      title: "Optimize Query Performance",
      description: "Identify slow database operations and introduce Redis caching.",
      project: "proj_api",
      assignee: "usr_bob",
      status: "In Progress",
      priority: "High",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      _id: "task_5",
      title: "API Security Audit",
      description: "Verify OAuth authentication flow and inspect for vulnerabilities.",
      project: "proj_api",
      assignee: "usr_diana",
      status: "Review",
      priority: "High",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // Overdue!
    }
  ],
  notifications: [
    {
      _id: "notif_1",
      recipient: "usr_diana",
      message: "The task \"API Security Audit\" is past its deadline!",
      type: "deadline",
      read: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: "notif_2",
      recipient: "usr_bob",
      message: "You have been assigned to \"Optimize Query Performance\".",
      type: "assignment",
      read: false,
      createdAt: new Date().toISOString()
    }
  ]
};

// Initialize file if not exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
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
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const mockDb = {
  reset: () => {
    writeData(initialData);
    return initialData;
  },

  // Users
  getUsers: () => {
    return readData().users;
  },
  createUser: (userData) => {
    const data = readData();
    const newUser = {
      _id: 'usr_' + Math.random().toString(36).substr(2, 9),
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.name}`,
      role: 'Member',
      ...userData
    };
    data.users.push(newUser);
    writeData(data);
    return newUser;
  },

  // Teams
  getTeams: () => {
    const data = readData();
    // Populate members
    return data.teams.map(t => ({
      ...t,
      members: t.members.map(mId => data.users.find(u => u._id === mId)).filter(Boolean)
    }));
  },
  createTeam: (teamData) => {
    const data = readData();
    const newTeam = {
      _id: 'team_' + Math.random().toString(36).substr(2, 9),
      members: [],
      ...teamData
    };
    data.teams.push(newTeam);
    writeData(data);
    // Populate and return
    return {
      ...newTeam,
      members: newTeam.members.map(mId => data.users.find(u => u._id === mId)).filter(Boolean)
    };
  },

  // Projects
  getProjects: () => {
    const data = readData();
    return data.projects.map(p => ({
      ...p,
      team: data.teams.find(t => t._id === p.team)
    }));
  },
  createProject: (projData) => {
    const data = readData();
    const newProj = {
      _id: 'proj_' + Math.random().toString(36).substr(2, 9),
      status: 'Active',
      ...projData
    };
    data.projects.push(newProj);
    writeData(data);
    return {
      ...newProj,
      team: data.teams.find(t => t._id === newProj.team)
    };
  },

  // Tasks
  getTasks: (projectId, assigneeId) => {
    const data = readData();
    let tasks = data.tasks;
    if (projectId) tasks = tasks.filter(t => t.project === projectId);
    if (assigneeId) tasks = tasks.filter(t => t.assignee === assigneeId);

    return tasks.map(t => {
      const proj = data.projects.find(p => p._id === t.project);
      const populatedProj = proj ? {
        ...proj,
        team: data.teams.find(tm => tm._id === proj.team)
      } : null;

      return {
        ...t,
        assignee: data.users.find(u => u._id === t.assignee),
        project: populatedProj
      };
    });
  },
  createTask: (taskData) => {
    const data = readData();
    const newTask = {
      _id: 'task_' + Math.random().toString(36).substr(2, 9),
      status: 'To Do',
      priority: 'Medium',
      createdAt: new Date().toISOString(),
      ...taskData
    };
    data.tasks.push(newTask);
    
    // Create notification if assigned
    if (newTask.assignee) {
      const newNotif = {
        _id: 'notif_' + Math.random().toString(36).substr(2, 9),
        recipient: newTask.assignee,
        message: `You have been assigned the task: "${newTask.title}". Due date: ${new Date(newTask.dueDate).toLocaleDateString()}`,
        type: 'assignment',
        read: false,
        createdAt: new Date().toISOString()
      };
      data.notifications.unshift(newNotif);
    }
    
    writeData(data);

    // Populate and return
    const proj = data.projects.find(p => p._id === newTask.project);
    const populatedProj = proj ? {
      ...proj,
      team: data.teams.find(tm => tm._id === proj.team)
    } : null;

    return {
      ...newTask,
      assignee: data.users.find(u => u._id === newTask.assignee),
      project: populatedProj
    };
  },
  updateTask: (id, updateData) => {
    const data = readData();
    const idx = data.tasks.findIndex(t => t._id === id);
    if (idx === -1) return null;

    const oldTask = data.tasks[idx];
    const updated = { ...oldTask, ...updateData };
    data.tasks[idx] = updated;

    // Create notification if assignee changed
    if (updateData.assignee && oldTask.assignee !== updateData.assignee) {
      const newNotif = {
        _id: 'notif_' + Math.random().toString(36).substr(2, 9),
        recipient: updateData.assignee,
        message: `You have been assigned the task: "${updated.title}".`,
        type: 'assignment',
        read: false,
        createdAt: new Date().toISOString()
      };
      data.notifications.unshift(newNotif);
    }

    writeData(data);

    // Populate and return
    const proj = data.projects.find(p => p._id === updated.project);
    const populatedProj = proj ? {
      ...proj,
      team: data.teams.find(tm => tm._id === proj.team)
    } : null;

    return {
      ...updated,
      assignee: data.users.find(u => u._id === updated.assignee),
      project: populatedProj
    };
  },
  deleteTask: (id) => {
    const data = readData();
    const idx = data.tasks.findIndex(t => t._id === id);
    if (idx === -1) return false;

    data.tasks.splice(idx, 1);
    writeData(data);
    return true;
  },

  // Notifications
  getNotifications: (userId) => {
    const data = readData();
    let notifs = data.notifications;
    if (userId) notifs = notifs.filter(n => n.recipient === userId);
    return notifs.map(n => ({
      ...n,
      recipient: data.users.find(u => u._id === n.recipient)
    }));
  },
  markNotificationRead: (id) => {
    const data = readData();
    const idx = data.notifications.findIndex(n => n._id === id);
    if (idx === -1) return null;

    data.notifications[idx].read = true;
    writeData(data);
    return {
      ...data.notifications[idx],
      recipient: data.users.find(u => u._id === data.notifications[idx].recipient)
    };
  }
};

module.exports = mockDb;
