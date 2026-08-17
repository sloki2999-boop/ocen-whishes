import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  Send, 
  Trash2, 
  MessageSquare, 
  HelpCircle,
  Volume2, 
  VolumeX,
  PlusCircle,
  X,
  RotateCcw,
  Sparkles
} from 'lucide-react';

const API_BASE = 'https://ocen-whishes-love-8f3e.vercel.app/api';

const ADJECTIVES = ["Glowing", "Silent", "Nebula", "Ethereal", "Whispering", "Sunken", "Cosmic", "Golden", "Mystic", "Drifting", "Prismatic", "Gentle"];
const MARINE_NOUNS = ["Seaglass", "Coral", "Anemone", "Seahorse", "Dolphin", "Manta", "Jellyfish", "Nautilus", "Current", "Pearl", "Lagoon", "Shell"];

const COLORS = ["#00ffff", "#ff007f", "#d946ef", "#fbbf24", "#a3e635", "#ffffff"];

function App() {
  const [wishes, setWishes] = useState([]);
  const [selectedWish, setSelectedWish] = useState(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [userIdentity, setUserIdentity] = useState('');

  // Form states
  const [messageText, setMessageText] = useState('');
  const [wishColor, setWishColor] = useState(COLORS[0]); // Neon hex colors
  const [replyText, setReplyText] = useState('');
  
  // Drawing states
  const [strokes, setStrokes] = useState([]); // Array of stroke arrays [[[x,y], [x,y]], ...]
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingCanvasRef = useRef(null);

  const soundNodesRef = useRef(null);

  // Initialize identity
  useEffect(() => {
    let stored = localStorage.getItem('ocean_wisher_identity');
    if (!stored) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = MARINE_NOUNS[Math.floor(Math.random() * MARINE_NOUNS.length)];
      stored = `${adj} ${noun}`;
      localStorage.setItem('ocean_wisher_identity', stored);
    }
    setUserIdentity(stored);
    fetchWishes();
  }, []);

  // Web Audio Ocean Wave Synthesizer
  useEffect(() => {
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Looping noise buffer
        const bufferSize = audioCtx.sampleRate * 4;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 1;
        filter.frequency.value = 300;

        const gain = audioCtx.createGain();
        gain.gain.value = 0.05;

        // Wave cycle LFO
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08;

        const lfoDepthFilter = audioCtx.createGain();
        lfoDepthFilter.gain.value = 150;

        const lfoDepthGain = audioCtx.createGain();
        lfoDepthGain.gain.value = 0.03;

        lfo.connect(lfoDepthFilter);
        lfoDepthFilter.connect(filter.frequency);

        lfo.connect(lfoDepthGain);
        lfoDepthGain.connect(gain.gain);

        noiseSource.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        noiseSource.start(0);
        lfo.start(0);

        soundNodesRef.current = { audioCtx, noiseSource, lfo };
      } catch (err) {
        console.warn("Wave synthesizer startup failed:", err);
      }
    } else {
      if (soundNodesRef.current) {
        try {
          soundNodesRef.current.noiseSource.stop();
          soundNodesRef.current.lfo.stop();
          soundNodesRef.current.audioCtx.close();
        } catch (e) {}
        soundNodesRef.current = null;
      }
    }
    return () => {
      if (soundNodesRef.current) {
        try {
          soundNodesRef.current.noiseSource.stop();
          soundNodesRef.current.lfo.stop();
          soundNodesRef.current.audioCtx.close();
        } catch (e) {}
      }
    };
  }, [soundEnabled]);

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (type === 'splash') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      } else if (type === 'uncork') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      }
    } catch (e) {}
  };

  const canvasRef = useRef(null);
  const wishesRef = useRef([]);

  // Fetch wishes from backend
  const fetchWishes = async () => {
    try {
      const res = await fetch(`${API_BASE}/bottles`);
      if (!res.ok) throw new Error("Backend response error");
      const data = await res.json();
      
      // Save data cache
      localStorage.setItem('wishes_cache', JSON.stringify(data));
      setWishes(data);
      updateWishesList(data);
    } catch (err) {
      console.warn("Could not connect to live API server. Falling back to local storage wish database.");
      const cached = localStorage.getItem('wishes_cache');
      const local = localStorage.getItem('local_wishes');
      
      const cachedWishes = cached ? JSON.parse(cached) : [];
      const localWishes = local ? JSON.parse(local) : [];
      const combined = [...localWishes, ...cachedWishes];
      
      // De-duplicate items
      const unique = Array.from(new Map(combined.map(item => [item._id, item])).values());
      setWishes(unique);
      updateWishesList(unique);
    } finally {
      setLoading(false);
    }
  };

  const updateWishesList = (data) => {
    wishesRef.current = data.map(w => {
      const existing = wishesRef.current.find(ew => ew._id === w._id);
      return {
        ...w,
        x: existing ? existing.x : (w.x / 100) * window.innerWidth,
        y: existing ? existing.y : (w.y / 100) * window.innerHeight,
        angle: existing ? existing.angle : w.angle || Math.random() * Math.PI * 2,
        rotationSpeed: existing ? existing.rotationSpeed : w.rotationSpeed || (Math.random() * 0.004 - 0.002),
        pulse: existing ? existing.pulse : Math.random() * Math.PI,
        bubbles: existing ? existing.bubbles : []
      };
    });
  };

  // Canvas Top-Down Ocean Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Ambient floating particles (phytoplankton / bubbles)
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 1,
      speedY: -(Math.random() * 0.4 + 0.2),
      speedX: (Math.random() * 0.2 - 0.1),
      alpha: Math.random() * 0.5 + 0.2
    }));

    const render = () => {
      // 1. Draw Deep Water Gradient Background
      const waterGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      waterGrad.addColorStop(0, '#020617');
      waterGrad.addColorStop(0.5, '#07152e');
      waterGrad.addColorStop(1, '#020d22');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Gentle Water Ripple Grid (Top View Waves)
      const now = Date.now();
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

      // 3. Draw Ambient Phytoplankton Particles
      particles.forEach(p => {
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

      // 4. Update and Draw Floating Vector Shapes
      wishesRef.current.forEach(wish => {
        // Apply physics drift (flow to the right/upwards)
        wish.x += wish.speed * 0.3;
        wish.y += Math.sin(now * 0.0005 + wish.pulse) * 0.05; // gentle bobbing
        wish.angle += wish.rotationSpeed; // rotation

        if (wish.x > canvas.width + 60) {
          wish.x = -60;
          wish.y = Math.random() * canvas.height;
        }

        // Draw drawing paths
        ctx.save();
        ctx.translate(wish.x, wish.y);
        ctx.rotate(wish.angle);
        ctx.scale(0.55, 0.55); // Larger floating drawings (approx 110px)
        ctx.translate(-100, -100); // Center around origin

        // PASS 1: Thick Outer Bloom Glow
        ctx.strokeStyle = wish.color;
        ctx.shadowColor = wish.color;
        ctx.shadowBlur = 24;
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.35;

        wish.drawingPoints.forEach(stroke => {
          if (stroke.length < 2) return;
          ctx.beginPath();
          ctx.moveTo(stroke[0][0], stroke[0][1]);
          for (let i = 1; i < stroke.length; i++) {
            ctx.lineTo(stroke[i][0], stroke[i][1]);
          }
          ctx.stroke();
        });

        // PASS 2: Sharp Bright White Core (Starlight effect)
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = wish.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1.0;

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

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [wishes]);

  // Click on main canvas to open a floating vector shape
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const clicked = wishesRef.current.find(wish => {
      const dist = Math.sqrt((clickX - wish.x) ** 2 + (clickY - wish.y) ** 2);
      return dist < 35; // 35px click bounds
    });

    if (clicked) {
      playSound('uncork');
      setSelectedWish(clicked);
    }
  };

  // Drawing Pad Event Handlers
  const startDrawing = (e) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStrokes(prev => [...prev, [[x, y]]]);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStrokes(prev => {
      const next = [...prev];
      const active = next[next.length - 1];
      active.push([x, y]);
      return next;
    });
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    setIsDrawing(true);
    setStrokes(prev => [...prev, [[x, y]]]);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setStrokes(prev => {
      const next = [...prev];
      const active = next[next.length - 1];
      active.push([x, y]);
      return next;
    });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Redraw the sketchpad preview
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = wishColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    });
  }, [strokes, wishColor]);

  // Clear sketchpad
  const clearDrawing = () => {
    setStrokes([]);
  };

  // Seal & Cast Wish
  const handleLaunchWish = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    if (strokes.length === 0) {
      alert("Please draw an imaginable shape for your wish before throwing it!");
      return;
    }

    const payload = {
      message: messageText,
      anonymousName: userIdentity,
      drawingPoints: strokes,
      color: wishColor
    };

    try {
      const res = await fetch(`${API_BASE}/bottles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        playSound('splash');
        setMessageText('');
        setStrokes([]);
        setShowWriteModal(false);
        await fetchWishes();
        return;
      }
      throw new Error("Server rejected or protected API request");
    } catch (err) {
      console.warn("API server cast failed. Storing wish locally to LocalStorage client fallback:", err);
      
      const local = localStorage.getItem('local_wishes');
      const localWishes = local ? JSON.parse(local) : [];
      
      const newLocalWish = {
        _id: 'local_' + Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
        replies: [],
        x: Math.random() * 80 + 10,
        y: Math.random() * 50 + 25,
        speed: Math.random() * 0.1 + 0.05,
        angle: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() * 0.004) - 0.002,
        ...payload
      };

      localWishes.unshift(newLocalWish);
      localStorage.setItem('local_wishes', JSON.stringify(localWishes));

      playSound('splash');
      setMessageText('');
      setStrokes([]);
      setShowWriteModal(false);
      await fetchWishes();
    }
  };

  // Reply to Wish Scroll
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedWish) return;

    try {
      const res = await fetch(`${API_BASE}/bottles/${selectedWish._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });

      if (res.ok) {
        setReplyText('');
        const updated = await res.json();
        setSelectedWish(updated);
        await fetchWishes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sink Wish
  const handleSinkWish = async (id) => {
    if (!confirm('Are you sure you want to sink this wish to the deep dark sea floor?')) return;

    try {
      const res = await fetch(`${API_BASE}/bottles/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSelectedWish(null);
        await fetchWishes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ocean-app">
      {/* Top-Down Rippling Canvas */}
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="ocean-canvas"
      />

      {/* Interface HUD overlay */}
      <div className="ui-overlay">
        <header className="ocean-header">
          <div className="brand flex items-center gap-2">
            <Compass className="brand-logo animate-spin-slow" />
            <div>
              <h1>Ocean Wisher</h1>
              <p className="sub font-mono">Drifting anonymous wishes</p>
            </div>
          </div>

          <div className="audio-and-filters">
            {/* Identity display */}
            <div className="user-profile flex items-center gap-2">
              <Sparkles size={14} className="text-cyan-400" />
              <span>You are: <strong className="text-cyan-200">{userIdentity}</strong></span>
            </div>

            {/* Audio toggle */}
            <button 
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playSound('splash');
              }} 
              className="btn-round-ui"
              title={soundEnabled ? 'Disable Sounds' : 'Enable Sounds'}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </header>

        {/* Info */}
        <div className="ocean-info-toast">
          <HelpCircle size={14} />
          <span>Click any floating glowing drawing to view the wish scroll.</span>
        </div>

        {/* Launch Trigger */}
        <button 
          onClick={() => setShowWriteModal(true)} 
          className="btn-launch-bottle flex items-center gap-2"
        >
          <PlusCircle size={20} />
          <span>Cast a Wish into the Sea</span>
        </button>
      </div>

      {/* Write Wish Modal */}
      {showWriteModal && (
        <div className="backdrop fade-in">
          <div className="paper-modal scroll-parchment flex flex-col md:flex-row gap-6 max-w-3xl">
            <button onClick={() => setShowWriteModal(false)} className="close-btn">
              <X size={20} />
            </button>
            
            <form onSubmit={handleLaunchWish} className="parchment-form w-full flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Form Text */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h2>Make a Wish</h2>
                  <p className="form-sub text-left">Write your dream. It will drift anonymously alongside your custom hand-drawn vector shape.</p>
                  
                  <textarea 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Write your wish onto this scroll... (anonymously)"
                    maxLength={350}
                    required
                  />
                </div>

                <div className="form-settings mt-auto">
                  <label className="text-xs uppercase font-bold text-amber-900 block mb-2">Select Glow Color</label>
                  <div className="color-palette flex gap-2 mb-4">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setWishColor(c)}
                        style={{ backgroundColor: c, border: wishColor === c ? '2px solid #5c4033' : 'none' }}
                        className="color-dot"
                      />
                    ))}
                  </div>
                  <button type="submit" className="btn-cast w-full flex items-center justify-center gap-2">
                    <Send size={16} /> Throw into Ocean
                  </button>
                </div>
              </div>

              {/* Right Column: Sketchpad Canvas */}
              <div className="flex flex-col items-center justify-center border-l border-amber-900/10 pl-6">
                <label className="text-xs uppercase font-bold text-amber-900 mb-2">Draw your Imaginable Shape</label>
                
                <canvas
                  ref={drawingCanvasRef}
                  width="200"
                  height="200"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={stopDrawing}
                  className="sketchpad"
                />

                <button 
                  type="button"
                  onClick={clearDrawing} 
                  className="btn-clear flex items-center gap-1 mt-2 text-xs uppercase font-bold"
                >
                  <RotateCcw size={12} /> Clear Canvas
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Read Wish Modal */}
      {selectedWish && (
        <div className="backdrop fade-in">
          <div className="paper-modal scroll-parchment read-mode">
            <button onClick={() => setSelectedWish(null)} className="close-btn">
              <X size={20} />
            </button>

            <div className="parchment-content">
              <div className="bottle-meta flex items-center justify-between border-b border-amber-900/10 pb-2 mb-3">
                <span className="anonymous-author font-semibold">
                  By: ~ {selectedWish.anonymousName}
                </span>
                <span className="date-tag">
                  {new Date(selectedWish.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Message text */}
              <div className="bottle-scroll-text">
                <p className="main-message">"{selectedWish.message}"</p>
              </div>

              {/* Replies History */}
              <div className="replies-section">
                <h3>Scroll Reply History ({selectedWish.replies?.length || 0})</h3>
                
                <div className="replies-list">
                  {selectedWish.replies?.length === 0 ? (
                    <p className="empty-replies">This scroll is empty. Leave a response to float with it...</p>
                  ) : (
                    selectedWish.replies.map((reply, index) => (
                      <div key={index} className="reply-item">
                        <MessageSquare size={14} className="text-muted" />
                        <p>{reply}</p>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendReply} className="reply-form flex items-center gap-2">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a message onto this scroll..."
                    maxLength={150}
                    required
                  />
                  <button type="submit" className="btn-reply">
                    <Send size={14} />
                  </button>
                </form>
              </div>

              {/* Actions Footer */}
              <div className="scroll-footer flex justify-between items-center mt-6 pt-3 border-t border-amber-900/10">
                <button 
                  onClick={() => handleSinkWish(selectedWish._id)} 
                  className="btn-sink flex items-center gap-1"
                  title="Sink Bottle"
                >
                  <Trash2 size={14} /> Sink Wish
                </button>

                <button 
                  onClick={() => {
                    playSound('splash');
                    setSelectedWish(null);
                  }} 
                  className="btn-toss"
                >
                  Toss back in ocean
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
