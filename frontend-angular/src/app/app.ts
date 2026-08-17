import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgFor, CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Wish {
  _id: string;
  message: string;
  anonymousName: string;
  drawingPoints: number[][][]; // [[[x,y], [x,y]], ...]
  color: string;
  x: number;
  y: number;
  speed: number;
  angle: number;
  rotationSpeed: number;
  replies: string[];
  createdAt: string;
  pulse?: number;
  bubbles?: any[];
}

const ADJECTIVES = ["Glowing", "Silent", "Nebula", "Ethereal", "Whispering", "Sunken", "Cosmic", "Golden", "Mystic", "Drifting", "Prismatic", "Gentle"];
const MARINE_NOUNS = ["Seaglass", "Coral", "Anemone", "Seahorse", "Dolphin", "Manta", "Jellyfish", "Nautilus", "Current", "Pearl", "Lagoon", "Shell"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#d946ef", "#06b6d4"];

@Component({
  selector: 'app-root',
  imports: [NgIf, NgFor, CommonModule, FormsModule, TitleCasePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  public apiBase = 'https://task-management-mern-mean.vercel.app/api';

  // Signals
  wishes = signal<Wish[]>([]);
  selectedWish = signal<Wish | null>(null);
  showWriteModal = signal<boolean>(false);
  loading = signal<boolean>(true);
  serverStatus = signal<string>('offline');
  soundEnabled = signal<boolean>(false);
  userIdentity = signal<string>('');

  // Form states
  messageText = '';
  wishColor = COLORS[0];
  replyText = '';
  colors = COLORS;

  // Drawing pad state
  private strokes: number[][][] = []; // [[[x,y],[x,y]], ...]
  private isDrawing = false;
  private sketchCanvas: HTMLCanvasElement | null = null;
  private sketchCtx: CanvasRenderingContext2D | null = null;

  // Animation states
  private animationId: number | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private particles: any[] = [];

  ngOnInit() {
    this.initIdentity();
    this.fetchInitialData();
    setInterval(() => this.fetchWishes(), 10000);
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  initIdentity() {
    let stored = localStorage.getItem('ocean_wisher_identity');
    if (!stored) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = MARINE_NOUNS[Math.floor(Math.random() * MARINE_NOUNS.length)];
      stored = `${adj} ${noun}`;
      localStorage.setItem('ocean_wisher_identity', stored);
    }
    this.userIdentity.set(stored);
  }

  fetchInitialData() {
    this.loading.set(true);
    this.http.get<{ status: string }>(`${this.apiBase}/status`).subscribe({
      next: () => {
        this.serverStatus.set('online');
        this.fetchWishes();
      },
      error: () => {
        this.serverStatus.set('offline');
        this.loading.set(false);
      }
    });
  }

  fetchWishes() {
    this.http.get<Wish[]>(`${this.apiBase}/bottles`).subscribe({
      next: (data) => {
        const updated = data.map(w => {
          const existing = this.wishes().find(ew => ew._id === w._id);
          return {
            ...w,
            x: existing ? existing.x : (w.x / 100) * window.innerWidth,
            y: existing ? existing.y : (w.y / 100) * window.innerHeight,
            angle: existing ? existing.angle : w.angle || Math.random() * Math.PI * 2,
            rotationSpeed: existing ? existing.rotationSpeed : w.rotationSpeed || (Math.random() * 0.006 - 0.003),
            pulse: existing ? existing.pulse : Math.random() * Math.PI,
            bubbles: existing ? existing.bubbles : []
          };
        });
        this.wishes.set(updated);
        this.loading.set(false);
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
    this.canvasElement.width = window.innerWidth;
    this.canvasElement.height = window.innerHeight;

    // Ambient floating particles
    this.particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.4 + 0.2),
      speedX: (Math.random() * 0.2 - 0.1),
      alpha: Math.random() * 0.5 + 0.2
    }));

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

    // 1. Water Gradient Background
    const waterGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    waterGrad.addColorStop(0, '#020617');
    waterGrad.addColorStop(0.5, '#07152e');
    waterGrad.addColorStop(1, '#020d22');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Ripple Grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.03)';
    ctx.lineWidth = 1;
    const rippleSize = 80;
    for (let x = 0; x < canvas.width; x += rippleSize) {
      ctx.beginPath();
      for (let y = 0; y < canvas.height; y += 10) {
        const shift = Math.sin(y * 0.01 + now * 0.001) * 8;
        ctx.lineTo(x + shift, y);
      }
      ctx.stroke();
    }

    // 3. Ambient Particles
    this.particles.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
      ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha * (0.3 + 0.3 * Math.sin(now * 0.001))})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw Floating Wishes
    this.wishes().forEach(wish => {
      wish.x += wish.speed * 0.3;
      if (!wish.pulse) wish.pulse = 0;
      wish.pulse += 0.015;
      wish.y += Math.sin(now * 0.0005 + wish.pulse) * 0.05;
      wish.angle += wish.rotationSpeed;

      if (wish.x > canvas.width + 60) {
        wish.x = -60;
        wish.y = Math.random() * canvas.height;
      }

      ctx.save();
      ctx.translate(wish.x, wish.y);
      ctx.rotate(wish.angle);
      ctx.scale(0.35, 0.35);
      ctx.translate(-100, -100);

      ctx.strokeStyle = wish.color;
      ctx.shadowColor = wish.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      wish.drawingPoints.forEach(stroke => {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i][0], stroke[i][1]);
        }
        ctx.stroke();
      });

      ctx.restore();
    });
  }

  handleCanvasClick(e: MouseEvent) {
    if (!this.canvasElement) return;
    const rect = this.canvasElement.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = this.wishes().find(wish => {
      const dist = Math.sqrt((clickX - wish.x) ** 2 + (clickY - wish.y) ** 2);
      return dist < 35;
    });

    if (clicked) {
      this.playSound('uncork');
      this.selectedWish.set(clicked);
    }
  }

  // Sketchpad trigger modal open hook
  openWriteModal() {
    this.showWriteModal.set(true);
    setTimeout(() => this.initSketchpad(), 100);
  }

  initSketchpad() {
    this.sketchCanvas = document.getElementById('sketchCanvas') as HTMLCanvasElement;
    if (!this.sketchCanvas) return;
    this.sketchCtx = this.sketchCanvas.getContext('2d');
    this.strokes = [];
    this.redrawSketchpad();
  }

  // Sketch Drawing Listeners
  startDrawing(e: MouseEvent) {
    if (!this.sketchCanvas) return;
    const rect = this.sketchCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.isDrawing = true;
    this.strokes.push([[x, y]]);
  }

  draw(e: MouseEvent) {
    if (!this.isDrawing || !this.sketchCanvas) return;
    const rect = this.sketchCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const active = this.strokes[this.strokes.length - 1];
    active.push([x, y]);
    this.redrawSketchpad();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearDrawing() {
    this.strokes = [];
    this.redrawSketchpad();
  }

  setWishColor(color: string) {
    this.wishColor = color;
    this.redrawSketchpad();
  }

  private redrawSketchpad() {
    const canvas = this.sketchCanvas;
    const ctx = this.sketchCtx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = this.wishColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    });
  }

  handleLaunchWish() {
    if (!this.messageText.trim()) return;
    if (this.strokes.length === 0) {
      alert("Please draw a shape for your wish before casting it!");
      return;
    }

    const payload = {
      message: this.messageText,
      anonymousName: this.userIdentity(),
      drawingPoints: this.strokes,
      color: this.wishColor
    };

    this.http.post<Wish>(`${this.apiBase}/bottles`, payload).subscribe(() => {
      this.playSound('splash');
      this.messageText = '';
      this.strokes = [];
      this.showWriteModal.set(false);
      this.fetchWishes();
    });
  }

  handleSendReply() {
    if (!this.replyText.trim() || !this.selectedWish()) return;
    const wishId = this.selectedWish()?._id;

    this.http.post<Wish>(`${this.apiBase}/bottles/${wishId}/reply`, { reply: this.replyText }).subscribe(updated => {
      this.replyText = '';
      this.selectedWish.set(updated);
      this.fetchWishes();
    });
  }

  handleSinkWish(id: string) {
    if (!confirm('Are you sure you want to sink this wish forever?')) return;
    this.http.delete(`${this.apiBase}/bottles/${id}`).subscribe(() => {
      this.selectedWish.set(null);
      this.fetchWishes();
    });
  }

  toggleSound() {
    this.soundEnabled.set(!this.soundEnabled());
    if (this.soundEnabled()) {
      this.playSound('splash');
    }
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
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'uncork') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch (e) {}
  }
}
