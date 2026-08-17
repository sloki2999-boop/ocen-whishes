import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  Folder, 
  Plus, 
  Trash2, 
  Bell, 
  Check, 
  Filter, 
  Grid, 
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

const API_BASE = 'https://1a1d6f507f27b2.lhr.life/api';

function App() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, kanban, teams, notifications
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('offline');

  // Form states for creating new task
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  // Form states for creating new project
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjTeam, setNewProjTeam] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch notifications whenever current user changes
  useEffect(() => {
    if (currentUser) {
      fetchNotifications(currentUser._id);
    }
  }, [currentUser]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Check server status
      const statusRes = await fetch(`${API_BASE}/status`).catch(() => null);
      if (statusRes && statusRes.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
        setLoading(false);
        return;
      }

      // Fetch users
      const usersRes = await fetch(`${API_BASE}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);
      
      // Default to first user
      if (usersData.length > 0 && !currentUser) {
        setCurrentUser(usersData[0]);
      }

      // Fetch teams, projects, tasks
      const teamsRes = await fetch(`${API_BASE}/teams`);
      const teamsData = await teamsRes.json();
      setTeams(teamsData);

      const projectsRes = await fetch(`${API_BASE}/projects`);
      const projectsData = await projectsRes.json();
      setProjects(projectsData);

      const tasksRes = await fetch(`${API_BASE}/tasks`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

    } catch (err) {
      console.error('Error fetching data:', err);
      setServerStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/notifications?userId=${userId}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskProject || !newTaskDueDate) return;

    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTaskTitle,
          description: newTaskDesc,
          project: newTaskProject,
          assignee: newTaskAssignee || null,
          priority: newTaskPriority,
          dueDate: newTaskDueDate
        })
      });

      if (res.ok) {
        // Reset form
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskProject('');
        setNewTaskAssignee('');
        setNewTaskPriority('Medium');
        setNewTaskDueDate('');
        setShowTaskModal(false);
        
        // Refresh
        await fetchTasks();
        if (currentUser) fetchNotifications(currentUser._id);
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjName || !newProjTeam) return;

    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjName,
          description: newProjDesc,
          team: newProjTeam
        })
      });

      if (res.ok) {
        setNewProjName('');
        setNewProjDesc('');
        setNewProjTeam('');
        setShowProjectModal(false);
        
        // Refresh projects
        const projRes = await fetch(`${API_BASE}/projects`);
        const projData = await projRes.json();
        setProjects(projData);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const handleMarkNotificationRead = async (notifId) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${notifId}/read`, {
        method: 'PUT'
      });
      if (res.ok) {
        if (currentUser) fetchNotifications(currentUser._id);
      }
    } catch (err) {
      console.error('Error updating notification:', err);
    }
  };

  const triggerSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      if (res.ok) {
        alert('Database re-seeded successfully!');
        await fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Helper stats
  const getTasksStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < today);
    const dueToday = tasks.filter(t => {
      const d = new Date(t.dueDate);
      return t.status !== 'Done' && 
             d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    });

    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'Done').length,
      pending: tasks.filter(t => t.status !== 'Done').length,
      overdue: overdue.length,
      dueToday: dueToday.length
    };
  };

  const stats = getTasksStats();
  const unreadNotifs = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading your workspaces...</p>
      </div>
    );
  }

  if (serverStatus === 'offline') {
    return (
      <div className="app-offline">
        <AlertTriangle size={48} className="text-warning" />
        <h2>Connection Lost</h2>
        <p>Could not connect to the Backend API server on {API_BASE}.</p>
        <p className="subtext">Make sure the Express backend server is running and MongoDB is active.</p>
        <button onClick={fetchInitialData} className="btn btn-primary flex items-center gap-2 mt-4">
          <RefreshCw size={16} /> Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Layers className="brand-icon" />
          <span>Apex Tasks</span>
          <span className="platform-pill mern">MERN</span>
        </div>

        {/* Current User Selector */}
        <div className="user-profile-selector">
          <label>Viewing As:</label>
          <div className="select-wrapper">
            <select 
              value={currentUser ? currentUser._id : ''} 
              onChange={(e) => {
                const u = users.find(usr => usr._id === e.target.value);
                setCurrentUser(u);
              }}
            >
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>
          {currentUser && (
            <div className="active-user-details">
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="avatar" />
              <div>
                <p className="name">{currentUser.name}</p>
                <p className="role">{currentUser.role}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Grid size={18} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveTab('kanban')}
          >
            <Layers size={18} />
            <span>Kanban Board</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Users size={18} />
            <span>Teams</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            <div className="relative">
              <Bell size={18} />
              {unreadNotifs > 0 && <span className="badge">{unreadNotifs}</span>}
            </div>
            <span>Notifications</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={triggerSeed} className="btn-seed flex items-center gap-1">
            <RefreshCw size={14} /> Re-seed Data
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="header-info">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} View</h1>
            <p className="subtext">Manage deadlines, projects and task boards</p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowProjectModal(true)} className="btn btn-secondary flex items-center gap-1">
              <Folder size={16} /> New Project
            </button>
            <button onClick={() => setShowTaskModal(true)} className="btn btn-primary flex items-center gap-1">
              <Plus size={16} /> New Task
            </button>
          </div>
        </header>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="view-content fade-in">
            {/* Stats Bar */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="icon-wrapper blue">
                  <Layers size={20} />
                </div>
                <div className="stat-info">
                  <p className="label">Total Tasks</p>
                  <h3>{stats.total}</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="icon-wrapper green">
                  <CheckCircle size={20} />
                </div>
                <div className="stat-info">
                  <p className="label">Completed</p>
                  <h3>{stats.completed} <span className="percent">({stats.total ? Math.round((stats.completed/stats.total)*100) : 0}%)</span></h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="icon-wrapper orange">
                  <Clock size={20} />
                </div>
                <div className="stat-info">
                  <p className="label">Due Today</p>
                  <h3 className={stats.dueToday > 0 ? 'text-warn' : ''}>{stats.dueToday}</h3>
                </div>
              </div>
              <div className="stat-card">
                <div className="icon-wrapper red">
                  <AlertTriangle size={20} />
                </div>
                <div className="stat-info">
                  <p className="label">Overdue</p>
                  <h3 className={stats.overdue > 0 ? 'text-danger' : ''}>{stats.overdue}</h3>
                </div>
              </div>
            </div>

            {/* Dashboard Sections */}
            <div className="dashboard-grid">
              {/* Projects List */}
              <div className="card projects-section">
                <h2>Active Projects</h2>
                <div className="project-list">
                  {projects.map(proj => {
                    const projTasks = tasks.filter(t => t.project?._id === proj._id);
                    const compTasks = projTasks.filter(t => t.status === 'Done');
                    const progress = projTasks.length ? Math.round((compTasks.length / projTasks.length) * 100) : 0;
                    
                    return (
                      <div key={proj._id} className="project-item">
                        <div className="project-header">
                          <div>
                            <h4>{proj.name}</h4>
                            <p>{proj.description || 'No description'}</p>
                          </div>
                          <span className="team-badge">{proj.team?.name}</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-labels">
                            <span>Progress</span>
                            <span>{progress}% ({compTasks.length}/{projTasks.length} tasks)</span>
                          </div>
                          <div className="progress-track">
                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Deadlines Widget */}
              <div className="card deadlines-section">
                <h2>Upcoming Deadlines</h2>
                <div className="deadline-list">
                  {tasks
                    .filter(t => t.status !== 'Done')
                    .slice(0, 5)
                    .map(t => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const due = new Date(t.dueDate);
                      const isOverdue = due < today;
                      
                      return (
                        <div key={t._id} className={`deadline-item ${isOverdue ? 'overdue' : ''}`}>
                          <Calendar size={16} className="calendar-icon" />
                          <div className="deadline-info">
                            <h5>{t.title}</h5>
                            <p className="proj">{t.project?.name}</p>
                          </div>
                          <div className="deadline-meta">
                            <span className={`priority-badge ${t.priority.toLowerCase()}`}>{t.priority}</span>
                            <span className="due-date">
                              {due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board View */}
        {activeTab === 'kanban' && (
          <div className="view-content fade-in">
            <div className="kanban-grid">
              {['To Do', 'In Progress', 'Review', 'Done'].map(colStatus => {
                const colTasks = tasks.filter(t => t.status === colStatus);
                return (
                  <div key={colStatus} className="kanban-col">
                    <div className="col-header">
                      <h3>{colStatus}</h3>
                      <span className="count">{colTasks.length}</span>
                    </div>
                    
                    <div className="col-cards">
                      {colTasks.map(t => (
                        <div key={t._id} className={`task-card border-prio-${t.priority.toLowerCase()}`}>
                          <div className="card-top">
                            <span className="project-tag">{t.project?.name}</span>
                            <div className="card-actions">
                              <button onClick={() => handleDeleteTask(t._id)} className="btn-delete">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <h4>{t.title}</h4>
                          <p className="desc">{t.description}</p>

                          <div className="card-bottom">
                            <div className="assignee">
                              {t.assignee ? (
                                <>
                                  <img src={t.assignee.avatarUrl} alt={t.assignee.name} className="avatar-sm" />
                                  <span>{t.assignee.name}</span>
                                </>
                              ) : (
                                <span className="unassigned">Unassigned</span>
                              )}
                            </div>
                            <div className="due">
                              <Clock size={12} />
                              <span className={new Date(t.dueDate) < new Date() && t.status !== 'Done' ? 'text-danger' : ''}>
                                {new Date(t.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                              </span>
                            </div>
                          </div>

                          <div className="card-status-movers">
                            {colStatus !== 'To Do' && (
                              <button 
                                onClick={() => handleUpdateTaskStatus(t._id, colStatus === 'In Progress' ? 'To Do' : colStatus === 'Review' ? 'In Progress' : 'Review')} 
                                className="btn-move"
                              >
                                &larr;
                              </button>
                            )}
                            {colStatus !== 'Done' && (
                              <button 
                                onClick={() => handleUpdateTaskStatus(t._id, colStatus === 'To Do' ? 'In Progress' : colStatus === 'In Progress' ? 'Review' : 'Done')} 
                                className="btn-move ml-auto"
                              >
                                &rarr;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Teams View */}
        {activeTab === 'teams' && (
          <div className="view-content fade-in">
            <div className="teams-list">
              {teams.map(team => (
                <div key={team._id} className="card team-card-item">
                  <div className="team-card-header">
                    <h2>{team.name} Team</h2>
                    <p>{team.description}</p>
                  </div>
                  
                  <div className="team-members-section">
                    <h3>Members ({team.members?.length || 0})</h3>
                    <div className="members-grid">
                      {team.members?.map(member => (
                        <div key={member._id} className="member-row">
                          <img src={member.avatarUrl} alt={member.name} className="avatar-med" />
                          <div className="member-details">
                            <h4>{member.name}</h4>
                            <p>{member.role}</p>
                            <p className="email">{member.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications View */}
        {activeTab === 'notifications' && (
          <div className="view-content fade-in">
            <div className="card notifications-card">
              <div className="notif-header">
                <h2>Notifications</h2>
                <span className="notif-count">{unreadNotifs} unread</span>
              </div>

              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <p className="empty-state">No notifications yet.</p>
                ) : (
                  notifications.map(notif => (
                    <div key={notif._id} className={`notification-row ${notif.read ? 'read' : 'unread'}`}>
                      <div className="notif-content">
                        <div className="notif-dot"></div>
                        <div className="notif-message">
                          <p>{notif.message}</p>
                          <span className="time">{new Date(notif.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      {!notif.read && (
                        <button 
                          onClick={() => handleMarkNotificationRead(notif._id)} 
                          className="btn-mark-read flex items-center gap-1"
                        >
                          <Check size={14} /> Mark Read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button onClick={() => setShowTaskModal(false)} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handleCreateTask} className="modal-form">
              <div className="form-group">
                <label>Task Title *</label>
                <input 
                  type="text" 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)} 
                  placeholder="e.g. Implement Auth Guards"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newTaskDesc} 
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Provide details about the task"
                />
              </div>
              <div className="form-group">
                <label>Project *</label>
                <select value={newTaskProject} onChange={(e) => setNewTaskProject(e.target.value)} required>
                  <option value="">Select Project</option>
                  {projects.map(p => (
                    <option key={p._id} value={p._id}>{p.name} ({p.team?.name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Assignee</label>
                <select value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)}>
                  <option value="">Select Assignee (Optional)</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date *</label>
                  <input 
                    type="date" 
                    value={newTaskDueDate} 
                    onChange={(e) => setNewTaskDueDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Creation Modal */}
      {showProjectModal && (
        <div className="modal-backdrop">
          <div className="modal card">
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button onClick={() => setShowProjectModal(false)} className="btn-close">&times;</button>
            </div>
            <form onSubmit={handleCreateProject} className="modal-form">
              <div className="form-group">
                <label>Project Name *</label>
                <input 
                  type="text" 
                  value={newProjName} 
                  onChange={(e) => setNewProjName(e.target.value)} 
                  placeholder="e.g. Website Launch"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newProjDesc} 
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Provide description"
                />
              </div>
              <div className="form-group">
                <label>Team *</label>
                <select value={newProjTeam} onChange={(e) => setNewProjTeam(e.target.value)} required>
                  <option value="">Select Team</option>
                  {teams.map(t => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowProjectModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
