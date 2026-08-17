import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
}

interface Team {
  _id: string;
  name: string;
  description: string;
  members: User[];
}

interface Project {
  _id: string;
  name: string;
  description: string;
  team: Team;
  status: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  project: Project;
  assignee: User;
  status: 'To Do' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
}

interface Notification {
  _id: string;
  recipient: User;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-root',
  imports: [NgIf, NgFor, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private http = inject(HttpClient);
  private apiBase = 'http://localhost:5000/api';

  // Signals for reactivity
  users = signal<User[]>([]);
  currentUser = signal<User | null>(null);
  teams = signal<Team[]>([]);
  projects = signal<Project[]>([]);
  tasks = signal<Task[]>([]);
  notifications = signal<Notification[]>([]);
  activeTab = signal<string>('dashboard');
  loading = signal<boolean>(true);
  serverStatus = signal<string>('offline');

  // Form states
  showTaskModal = signal<boolean>(false);
  newTaskTitle = '';
  newTaskDesc = '';
  newTaskProject = '';
  newTaskAssignee = '';
  newTaskPriority: 'Low' | 'Medium' | 'High' = 'Medium';
  newTaskDueDate = '';

  showProjectModal = signal<boolean>(false);
  newProjName = '';
  newProjDesc = '';
  newProjTeam = '';

  // Stats computed from signals
  stats = computed(() => {
    const allTasks = this.tasks();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = allTasks.filter(t => t.status !== 'Done' && new Date(t.dueDate) < today);
    const dueToday = allTasks.filter(t => {
      const d = new Date(t.dueDate);
      return t.status !== 'Done' && 
             d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    });

    const total = allTasks.length;
    const completed = allTasks.filter(t => t.status === 'Done').length;
    const pending = total - completed;

    return {
      total,
      completed,
      pending,
      overdue: overdue.length,
      dueToday: dueToday.length,
      percent: total ? Math.round((completed / total) * 100) : 0
    };
  });

  unreadNotificationsCount = computed(() => {
    return this.notifications().filter(n => !n.read).length;
  });

  ngOnInit() {
    this.fetchInitialData();
  }

  fetchInitialData() {
    this.loading.set(true);
    this.http.get<{ status: string; database: string }>(`${this.apiBase}/status`).subscribe({
      next: (statusRes) => {
        this.serverStatus.set('online');
        
        // Fetch Users
        this.http.get<User[]>(`${this.apiBase}/users`).subscribe(usersData => {
          this.users.set(usersData);
          if (usersData.length > 0 && !this.currentUser()) {
            this.currentUser.set(usersData[0]);
            this.fetchNotifications(usersData[0]._id);
          }
        });

        // Fetch Teams
        this.http.get<Team[]>(`${this.apiBase}/teams`).subscribe(data => this.teams.set(data));

        // Fetch Projects
        this.http.get<Project[]>(`${this.apiBase}/projects`).subscribe(data => this.projects.set(data));

        // Fetch Tasks
        this.fetchTasks();
      },
      error: () => {
        this.serverStatus.set('offline');
        this.loading.set(false);
      }
    });
  }

  fetchNotifications(userId: string) {
    this.http.get<Notification[]>(`${this.apiBase}/notifications?userId=${userId}`).subscribe({
      next: (data) => {
        this.notifications.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  fetchTasks() {
    this.http.get<Task[]>(`${this.apiBase}/tasks`).subscribe(data => this.tasks.set(data));
  }

  onUserChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const user = this.users().find(u => u._id === select.value) || null;
    this.currentUser.set(user);
    if (user) {
      this.fetchNotifications(user._id);
    }
  }

  handleCreateTask() {
    if (!this.newTaskTitle || !this.newTaskProject || !this.newTaskDueDate) return;

    const payload = {
      title: this.newTaskTitle,
      description: this.newTaskDesc,
      project: this.newTaskProject,
      assignee: this.newTaskAssignee || null,
      priority: this.newTaskPriority,
      dueDate: this.newTaskDueDate
    };

    this.http.post<Task>(`${this.apiBase}/tasks`, payload).subscribe(() => {
      // Reset
      this.newTaskTitle = '';
      this.newTaskDesc = '';
      this.newTaskProject = '';
      this.newTaskAssignee = '';
      this.newTaskPriority = 'Medium';
      this.newTaskDueDate = '';
      this.showTaskModal.set(false);

      // Refresh
      this.fetchTasks();
      const current = this.currentUser();
      if (current) this.fetchNotifications(current._id);
    });
  }

  handleCreateProject() {
    if (!this.newProjName || !this.newProjTeam) return;

    const payload = {
      name: this.newProjName,
      description: this.newProjDesc,
      team: this.newProjTeam
    };

    this.http.post<Project>(`${this.apiBase}/projects`, payload).subscribe(() => {
      this.newProjName = '';
      this.newProjDesc = '';
      this.newProjTeam = '';
      this.showProjectModal.set(false);

      // Refresh Projects
      this.http.get<Project[]>(`${this.apiBase}/projects`).subscribe(data => this.projects.set(data));
    });
  }

  handleUpdateTaskStatus(taskId: string, newStatus: string) {
    this.http.put<Task>(`${this.apiBase}/tasks/${taskId}`, { status: newStatus }).subscribe(() => {
      this.fetchTasks();
    });
  }

  handleDeleteTask(taskId: string) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    this.http.delete(`${this.apiBase}/tasks/${taskId}`).subscribe(() => {
      this.fetchTasks();
    });
  }

  handleMarkNotificationRead(notifId: string) {
    this.http.put<Notification>(`${this.apiBase}/notifications/${notifId}/read`, {}).subscribe(() => {
      const current = this.currentUser();
      if (current) this.fetchNotifications(current._id);
    });
  }

  triggerSeed() {
    this.loading.set(true);
    this.http.post(`${this.apiBase}/seed`, {}).subscribe(() => {
      alert('Database re-seeded successfully!');
      this.fetchInitialData();
    });
  }

  // Filter tasks helper for Kanban Columns
  getTasksByStatus(status: string): Task[] {
    return this.tasks().filter(t => t.status === status);
  }

  getTasksFilterByProject(projId: string): Task[] {
    return this.tasks().filter(t => t.project?._id === projId);
  }

  getCompletedTasksCountByProject(projId: string): number {
    return this.tasks().filter(t => t.project?._id === projId && t.status === 'Done').length;
  }

  getProjectProgress(projId: string): number {
    const total = this.getTasksFilterByProject(projId).length;
    const completed = this.getCompletedTasksCountByProject(projId);
    return total ? Math.round((completed / total) * 100) : 0;
  }

  getPendingUpcomingTasks(): Task[] {
    return this.tasks().filter(t => t.status !== 'Done').slice(0, 5);
  }

  isTaskOverdue(dueDateStr: string): boolean {
    const today = new Date();
    today.setHours(0,0,0,0);
    return new Date(dueDateStr) < today;
  }
}
