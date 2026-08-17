import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Bottle {
  _id: string;
  message: string;
  bottleType: string;
  stoneType: string;
  replies: string[];
  x: number;
  y: number;
  speed: number;
  createdAt: string;
  // Local animation variables
  angle?: number;
  pulse?: number;
  bubbles?: any[];
}

@Component({
  selector: 'app-root',
  imports: [NgIf, NgFor, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiBase = 'https://task-management-mern-mean.vercel.app/api';

  // Signals
  bottles = signal<Bottle[]>([]);
  selectedBottle = signal<Bottle | null>(null);
  showWriteModal = signal<boolean>(false);
  loading = signal<boolean>(true);
  serverStatus = signal<string>('offline');
  soundEnabled = signal<boolean>(false);
  activeFilter = signal<string>('all'); // all, amethyst, aquamarine, citrine

  // Form states
  messageText = '';
  bottleType = 'sapphire';
  stoneType = 'none';
  replyText = '';

  // Local loop variables
  private animationId: number | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private stars: any[] = [];

  // Computed properties
  filteredBottles = computed(() => {
    const list = this.bottles();
    const filter = this.activeFilter();
    if (filter === 'all') return list;
    return list.filter(b => b.stoneType === filter);
  });

  ngOnInit() {
    this.fetchInitialData();
    // Poll every 10 seconds
    setInterval(() => this.fetchBottles(), 10000);
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  fetchInitialData() {
    this.loading.set(true);
    this.http.get<{ status: string }>(`${this.apiBase}/status`).subscribe({
      next: () => {
        this.serverStatus.set('online');
        this.fetchBottles();
      },
      error: () => {
        this.serverStatus.set('offline');
        this.loading.set(false);
      }
    });
  }

  fetchBottles() {
    this.http.get<Bottle[]>(`${this.apiBase}/bottles`).subscribe({
      next: (data) => {
        // Map data while retaining current coordinates if they exist
        const updated = data.map(b => {
          const existing = this.bottles().find(eb => eb._id === b._id);
          return {
            ...b,
            x: existing ? existing.x : (b.x / 100) * window.innerWidth,
            y: existing ? existing.y : (b.y / 100) * window.innerHeight,
            angle: existing ? existing.angle : Math.random() * Math.PI * 2,
            pulse: existing ? existing.pulse : Math.random() * Math.PI,
            bubbles: existing ? existing.bubbles : []
          };
        });
        this.bottles.set(updated);
        this.loading.set(false);
        
        // Start animation once canvas loads
        setTimeout(() => this.initCanvas(), 100);
      },
      error: () => this.loading.set(false)
    });
  }

  initCanvas() {
    if (this.animationId) return;

    this.canvasElement = document.getElementById('oceanCanvas') as HTMLCanvasElement;
    if (!this.canvasElement) return;

    this.canvasCtx = this.canvasElement.getContext('2d');
    
    // Resize
    this.canvasElement.width = window.innerWidth;
    this.canvasElement.height = window.innerHeight;

    // Build Stars
    this.stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * (window.innerHeight * 0.4),
      size: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI
    }));

    // Start loop
    this.loop();
  }

  private loop() {
    this.animationId = requestAnimationFrame(() => this.loop());
    this.renderCanvas();
  }

  private renderCanvas() {
    const canvas = this.canvasElement;
    const ctx = this.canvasCtx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();

    // 1. Draw Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
    skyGrad.addColorStop(0, '#060a13');
    skyGrad.addColorStop(0.5, '#0b1325');
    skyGrad.addColorStop(1, '#16223f');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Stars
    this.stars.forEach(star => {
      star.twinkle += 0.02;
      const opacity = (Math.sin(star.twinkle) + 1) / 2 * 0.8 + 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 3. Draw Glowing Moon
    const moonX = canvas.width * 0.8;
    const moonY = canvas.height * 0.15;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 80);
    moonGlow.addColorStop(0, 'rgba(255, 253, 245, 0.4)');
    moonGlow.addColorStop(0.5, 'rgba(235, 245, 255, 0.1)');
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 80, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fffdf0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2);
    ctx.fill();

    // 4. Update and Draw Floating Bottles
    this.filteredBottles().forEach(bottle => {
      // Update coordinates
      bottle.x += bottle.speed;
      if (bottle.x > canvas.width + 40) {
        bottle.x = -40;
        bottle.y = Math.random() * (canvas.height * 0.5) + (canvas.height * 0.3);
      }

      // Wave oscillation
      if (!bottle.pulse) bottle.pulse = 0;
      bottle.pulse += 0.015;
      const waveOffset = Math.sin(bottle.pulse) * 8;
      const currentY = bottle.y + waveOffset;

      // Generate bubbles
      if (!bottle.bubbles) bottle.bubbles = [];
      if (Math.random() < 0.03) {
        bottle.bubbles.push({
          x: bottle.x + (Math.random() * 20 - 10),
          y: currentY,
          size: Math.random() * 2 + 1,
          speedY: Math.random() * 0.5 + 0.3,
          opacity: 1
        });
      }

      // Draw bubbles
      bottle.bubbles.forEach((bubble, idx) => {
        bubble.y -= bubble.speedY;
        bubble.opacity -= 0.005;
        if (bubble.opacity <= 0) {
          bottle.bubbles!.splice(idx, 1);
          return;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 0.4})`;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
        ctx.fill();
      });

      let glowColor = '#3b82f6';
      if (bottle.bottleType === 'emerald') glowColor = '#10b981';
      else if (bottle.bottleType === 'amber') glowColor = '#f59e0b';
      else if (bottle.bottleType === 'rose') glowColor = '#ec4899';

      ctx.shadowBlur = 15;
      ctx.shadowColor = glowColor;

      // Draw stone
      if (bottle.stoneType && bottle.stoneType !== 'none') {
        let stoneGlow = '#d946ef';
        if (bottle.stoneType === 'aquamarine') stoneGlow = '#06b6d4';
        else if (bottle.stoneType === 'citrine') stoneGlow = '#eab308';
        
        ctx.fillStyle = stoneGlow;
        ctx.shadowColor = stoneGlow;
        ctx.beginPath();
        ctx.arc(bottle.x, currentY + 12, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Bottle
      ctx.fillStyle = glowColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(bottle.x - 4, currentY - 15);
      ctx.lineTo(bottle.x + 4, currentY - 15);
      ctx.lineTo(bottle.x + 4, currentY - 8);
      ctx.bezierCurveTo(bottle.x + 10, currentY - 8, bottle.x + 12, currentY - 3, bottle.x + 12, currentY);
      ctx.lineTo(bottle.x + 10, currentY + 15);
      ctx.bezierCurveTo(bottle.x + 10, currentY + 22, bottle.x - 10, currentY + 22, bottle.x - 10, currentY + 15);
      ctx.lineTo(bottle.x - 12, currentY);
      ctx.bezierCurveTo(bottle.x - 12, currentY - 3, bottle.x - 10, currentY - 8, bottle.x - 4, currentY - 8);
      ctx.closePath();

      ctx.fillStyle = `rgba(${parseInt(glowColor.substr(1,2),16)}, ${parseInt(glowColor.substr(3,2),16)}, ${parseInt(glowColor.substr(5,2),16)}, 0.15)`;
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#a16207';
      ctx.fillRect(bottle.x - 3, currentY - 18, 6, 4);
    });

    // 5. Draw Waves overlay
    const waveGrad1 = ctx.createLinearGradient(0, canvas.height * 0.4, 0, canvas.height);
    waveGrad1.addColorStop(0, 'rgba(10, 24, 53, 0.4)');
    waveGrad1.addColorStop(1, 'rgba(5, 12, 28, 0.9)');

    ctx.fillStyle = waveGrad1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= canvas.width; i += 20) {
      const y = Math.sin(i * 0.003 + now * 0.0006) * 15 + canvas.height * 0.55;
      ctx.lineTo(i, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    const waveGrad2 = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
    waveGrad2.addColorStop(0, 'rgba(12, 34, 76, 0.5)');
    waveGrad2.addColorStop(1, 'rgba(4, 9, 21, 0.95)');

    ctx.fillStyle = waveGrad2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i <= canvas.width; i += 20) {
      const y = Math.cos(i * 0.004 - now * 0.0008) * 12 + canvas.height * 0.65;
      ctx.lineTo(i, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
  }

  handleCanvasClick(e: MouseEvent) {
    if (!this.canvasElement) return;
    const rect = this.canvasElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = this.filteredBottles().find(bottle => {
      const waveOffset = Math.sin(bottle.pulse || 0) * 8;
      const bY = bottle.y + waveOffset;
      const dist = Math.sqrt((clickX - bottle.x) ** 2 + (clickY - bY) ** 2);
      return dist < 30;
    });

    if (clicked) {
      this.playSound('uncork');
      this.selectedBottle.set(clicked);
    }
  }

  handleLaunchBottle() {
    if (!this.messageText.trim()) return;

    const payload = {
      message: this.messageText,
      bottleType: this.bottleType,
      stoneType: this.stoneType
    };

    this.http.post<Bottle>(`${this.apiBase}/bottles`, payload).subscribe(() => {
      this.playSound('splash');
      this.messageText = '';
      this.bottleType = 'sapphire';
      this.stoneType = 'none';
      this.showWriteModal.set(false);
      this.fetchBottles();
    });
  }

  handleSendReply() {
    if (!this.replyText.trim() || !this.selectedBottle()) return;
    const bottleId = this.selectedBottle()?._id;

    this.http.post<Bottle>(`${this.apiBase}/bottles/${bottleId}/reply`, { reply: this.replyText }).subscribe(updated => {
      this.replyText = '';
      this.selectedBottle.set(updated);
      this.fetchBottles();
    });
  }

  handleSinkBottle(id: string) {
    if (!confirm('Are you sure you want to sink this bottle forever?')) return;
    this.http.delete(`${this.apiBase}/bottles/${id}`).subscribe(() => {
      this.selectedBottle.set(null);
      this.fetchBottles();
    });
  }

  playSound(type: string) {
    if (!this.soundEnabled()) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'splash') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'uncork') {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {}
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    if (this.soundEnabled()) {
      this.playSound('splash');
    }
  }
}
