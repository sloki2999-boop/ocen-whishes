const mongoose = require('mongoose');
const User = require('./models/user');
const Team = require('./models/team');
const Project = require('./models/project');
const Task = require('./models/task');
const Notification = require('./models/notification');

async function seedDB() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Team.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});
    await Notification.deleteMany({});

    console.log('Cleared existing database entries.');

    // 1. Create Users
    const users = await User.create([
      {
        name: 'Alice Smith',
        email: 'alice@company.com',
        role: 'Product Manager',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice'
      },
      {
        name: 'Bob Jones',
        email: 'bob@company.com',
        role: 'Lead Developer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob'
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@company.com',
        role: 'UI/UX Designer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie'
      },
      {
        name: 'Diana Prince',
        email: 'diana@company.com',
        role: 'QA Engineer',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Diana'
      }
    ]);

    const [alice, bob, charlie, diana] = users;
    console.log(`Created ${users.length} users.`);

    // 2. Create Teams
    const engineeringTeam = await Team.create({
      name: 'Engineering',
      description: 'Core software development & QA team.',
      members: [alice._id, bob._id, diana._id]
    });

    const creativeTeam = await Team.create({
      name: 'Creative & Design',
      description: 'UI/UX Design, branding, and marketing creative assets.',
      members: [alice._id, charlie._id]
    });

    console.log('Created Teams:', engineeringTeam.name, ',', creativeTeam.name);

    // 3. Create Projects
    const mobileAppProj = await Project.create({
      name: 'Mobile App Redesign',
      description: 'Revamping the core mobile app UI/UX and migrating to React Native.',
      team: engineeringTeam._id,
      status: 'Active'
    });

    const apiRefactorProj = await Project.create({
      name: 'Core API Refactor',
      description: 'Optimizing API endpoints and database queries for scalability.',
      team: engineeringTeam._id,
      status: 'Active'
    });

    const brandStyleProj = await Project.create({
      name: 'Brand Style Guide',
      description: 'Creating a unified design system and style guide for all products.',
      team: creativeTeam._id,
      status: 'Active'
    });

    console.log('Created Projects:', mobileAppProj.name, ',', apiRefactorProj.name, ',', brandStyleProj.name);

    // 4. Create Tasks
    const now = new Date();
    
    // Past dates
    const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(now.getDate() - 5);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const oneDayAgo = new Date(now); oneDayAgo.setDate(now.getDate() - 1);
    
    // Future dates
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const inTwoDays = new Date(now); inTwoDays.setDate(now.getDate() + 2);
    const inFiveDays = new Date(now); inFiveDays.setDate(now.getDate() + 5);
    const inTenDays = new Date(now); inTenDays.setDate(now.getDate() + 10);

    const tasks = await Task.create([
      // Mobile App Redesign tasks
      {
        title: 'Design Figma Wireframes',
        description: 'Create high-fidelity wireframes for the user dashboard and profile views.',
        project: mobileAppProj._id,
        assignee: charlie._id,
        status: 'Done',
        priority: 'High',
        dueDate: fiveDaysAgo
      },
      {
        title: 'Implement React Navigation',
        description: 'Set up fluid navigation transitions and deep linking support.',
        project: mobileAppProj._id,
        assignee: bob._id,
        status: 'In Progress',
        priority: 'High',
        dueDate: inTwoDays
      },
      {
        title: 'Write UI Integration Tests',
        description: 'Verify navigation and user interactions with component tests.',
        project: mobileAppProj._id,
        assignee: diana._id,
        status: 'To Do',
        priority: 'Medium',
        dueDate: inFiveDays
      },
      {
        title: 'App Store Submission Prep',
        description: 'Draft release notes, generate promotional screenshots, and update certificates.',
        project: mobileAppProj._id,
        assignee: alice._id,
        status: 'To Do',
        priority: 'Medium',
        dueDate: inTenDays
      },
      
      // Core API Refactor tasks
      {
        title: 'Database Schema Migration',
        description: 'Migrate legacy relations to modern collections, ensuring index optimization.',
        project: apiRefactorProj._id,
        assignee: bob._id,
        status: 'Done',
        priority: 'High',
        dueDate: twoDaysAgo
      },
      {
        title: 'Optimize Query Performance',
        description: 'Identify slow database operations and introduce Redis caching.',
        project: apiRefactorProj._id,
        assignee: bob._id,
        status: 'In Progress',
        priority: 'High',
        dueDate: tomorrow
      },
      {
        title: 'API Security Audit',
        description: 'Verify OAuth authentication flow and inspect for potential SQL/NoSQL injection vulnerabilities.',
        project: apiRefactorProj._id,
        assignee: diana._id,
        status: 'Review',
        priority: 'High',
        dueDate: oneDayAgo // Overdue!
      },

      // Brand Style Guide tasks
      {
        title: 'Typography & Color Palette Selection',
        description: 'Define typography hierarchy and primary/secondary HSL colors.',
        project: brandStyleProj._id,
        assignee: charlie._id,
        status: 'Done',
        priority: 'Medium',
        dueDate: fiveDaysAgo
      },
      {
        title: 'Draft Logo Variations',
        description: 'Design dark theme and light theme variations for the brand logo.',
        project: brandStyleProj._id,
        assignee: charlie._id,
        status: 'In Progress',
        priority: 'High',
        dueDate: tomorrow
      }
    ]);

    console.log(`Created ${tasks.length} tasks.`);

    // 5. Create Notifications
    await Notification.create([
      {
        recipient: diana._id,
        message: 'The task "API Security Audit" is past its deadline!',
        type: 'deadline',
        read: false
      },
      {
        recipient: bob._id,
        message: 'You have been assigned to "Optimize Query Performance".',
        type: 'assignment',
        read: false
      },
      {
        recipient: bob._id,
        message: 'Deadline approaching: "Optimize Query Performance" is due tomorrow.',
        type: 'deadline',
        read: false
      },
      {
        recipient: charlie._id,
        message: 'Task "Design Figma Wireframes" was marked as complete.',
        type: 'system',
        read: true
      }
    ]);

    console.log('Seeded notifications.');
    console.log('Database seeding successfully completed.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Support running directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager';
  mongoose.connect(MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB for seeding...');
      await seedDB();
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB after seeding.');
      process.exit(0);
    })
    .catch(err => {
      console.error('Seeding database failed:', err);
      process.exit(1);
    });
}

module.exports = seedDB;
