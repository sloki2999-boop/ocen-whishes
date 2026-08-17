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
  Filter
} from 'lucide-react';

const API_BASE = 'https://task-management-mern-mean.vercel.app/api';

function App() {
  const [bottles, setBottles] = useState([]);
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Filters
  const [activeFilter, setActiveFilter] = useState('all'); // all, amethyst, aquamarine, citrine, none

  // Form states
  const [messageText, setMessageText] = useState('');
  const [bottleType, setBottleType] = useState('sapphire'); // sapphire, emerald, amber, rose
  const [stoneType, setStoneType] = useState('none'); // amethyst, aquamarine, citrine, none
  const [replyText, setReplyText] = useState('');

  // Audio Context (Mock sound synthesis since we cannot load local mp3s reliably)
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
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } else if (type === 'uncork') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'ambient') {
        // Soft white noise wave
        const bufferSize = audioCtx.sampleRate * 2;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 1);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 2);
        
        whiteNoise.start();
      }
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  const canvasRef = useRef(null);
  const bottlesRef = useRef([]);

  // Fetch bottles
  const fetchBottles = async () => {
    try {
      const res = await fetch(`${API_BASE}/bottles`);
      const data = await res.json();
      setBottles(data);
      
      // Update canvas bottles reference preserving visual states if possible
      bottlesRef.current = data.map(b => {
        const existing = bottlesRef.current.find(eb => eb._id === b._id);
        return {
          ...b,
          x: existing ? existing.x : (b.x / 100) * (canvasRef.current ? canvasRef.current.width : window.innerWidth),
          y: existing ? existing.y : (b.y / 100) * (canvasRef.current ? canvasRef.current.height : window.innerHeight),
          angle: existing ? existing.angle : Math.random() * Math.PI * 2,
          pulse: Math.random() * Math.PI,
          bubbles: existing ? existing.bubbles : []
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBottles();
    // Poll every 10 seconds to keep synced
    const interval = setInterval(fetchBottles, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync canvas bottles list when filter changes
  const filteredBottles = bottlesRef.current.filter(b => {
    if (activeFilter === 'all') return true;
    return b.stoneType === activeFilter;
  });

  // Canvas render loop
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

    // Star data
    const stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * (window.innerHeight * 0.4),
      size: Math.random() * 1.5 + 0.5,
      twinkle: Math.random() * Math.PI
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
      skyGrad.addColorStop(0, '#060a13');
      skyGrad.addColorStop(0.5, '#0b1325');
      skyGrad.addColorStop(1, '#16223f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Stars
      ctx.fillStyle = '#ffffff';
      stars.forEach(star => {
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
      const now = Date.now();
      bottlesRef.current.forEach(bottle => {
        // Check filter
        if (activeFilter !== 'all' && bottle.stoneType !== activeFilter) return;

        // Update coordinates (drift slowly to the right)
        bottle.x += bottle.speed;
        if (bottle.x > canvas.width + 40) {
          bottle.x = -40;
          bottle.y = Math.random() * (canvas.height * 0.5) + (canvas.height * 0.3);
        }

        // Float wave oscillation
        bottle.pulse += 0.015;
        const waveOffset = Math.sin(bottle.pulse) * 8;
        const currentY = bottle.y + waveOffset;

        // Generate tiny rising bubbles from the bottle
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
            bottle.bubbles.splice(idx, 1);
            return;
          }
          ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
          ctx.fill();
        });

        // Set bottle neon glows based on color type
        let glowColor = '#3b82f6'; // sapphire
        if (bottle.bottleType === 'emerald') glowColor = '#10b981';
        else if (bottle.bottleType === 'amber') glowColor = '#f59e0b';
        else if (bottle.bottleType === 'rose') glowColor = '#ec4899';

        ctx.shadowBlur = 15;
        ctx.shadowColor = glowColor;

        // Draw glowing stone attachment if present
        if (bottle.stoneType && bottle.stoneType !== 'none') {
          let stoneGlow = '#d946ef'; // amethyst
          if (bottle.stoneType === 'aquamarine') stoneGlow = '#06b6d4';
          else if (bottle.stoneType === 'citrine') stoneGlow = '#eab308';
          
          ctx.fillStyle = stoneGlow;
          ctx.shadowColor = stoneGlow;
          ctx.beginPath();
          ctx.arc(bottle.x, currentY + 12, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw Bottle Body
        ctx.fillStyle = glowColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        // Bottle silhouette
        ctx.beginPath();
        // Neck
        ctx.moveTo(bottle.x - 4, currentY - 15);
        ctx.lineTo(bottle.x + 4, currentY - 15);
        ctx.lineTo(bottle.x + 4, currentY - 8);
        // Shoulders
        ctx.bezierCurveTo(bottle.x + 10, currentY - 8, bottle.x + 12, currentY - 3, bottle.x + 12, currentY);
        // Body
        ctx.lineTo(bottle.x + 10, currentY + 15);
        // Base
        ctx.bezierCurveTo(bottle.x + 10, currentY + 22, bottle.x - 10, currentY + 22, bottle.x - 10, currentY + 15);
        // Left side
        ctx.lineTo(bottle.x - 12, currentY);
        ctx.bezierCurveTo(bottle.x - 12, currentY - 3, bottle.x - 10, currentY - 8, bottle.x - 4, currentY - 8);
        ctx.closePath();

        // Fill with slight semi-transparency
        ctx.fillStyle = `rgba(${parseInt(glowColor.substr(1,2),16)}, ${parseInt(glowColor.substr(3,2),16)}, ${parseInt(glowColor.substr(5,2),16)}, 0.15)`;
        ctx.fill();
        ctx.stroke();

        // Draw cork
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#a16207'; // Cork brown
        ctx.fillRect(bottle.x - 3, currentY - 18, 6, 4);
      });

      // 5. Draw Parallax Ocean Waves (Foreground overlay)
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

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activeFilter]);

  // Click on Canvas to catch bottle
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check hit boxes
    const clicked = bottlesRef.current.find(bottle => {
      // Filter check
      if (activeFilter !== 'all' && bottle.stoneType !== activeFilter) return false;

      const waveOffset = Math.sin(bottle.pulse) * 8;
      const bY = bottle.y + waveOffset;

      const dist = Math.sqrt((clickX - bottle.x) ** 2 + (clickY - bY) ** 2);
      return dist < 30; // 30px click radius
    });

    if (clicked) {
      playSound('uncork');
      setSelectedBottle(clicked);
    }
  };

  // Launch a bottle
  const handleLaunchBottle = async (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/bottles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          bottleType,
          stoneType
        })
      });

      if (res.ok) {
        playSound('splash');
        setMessageText('');
        setBottleType('sapphire');
        setStoneType('none');
        setShowWriteModal(false);
        await fetchBottles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit a reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedBottle) return;

    try {
      const res = await fetch(`${API_BASE}/bottles/${selectedBottle._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });

      if (res.ok) {
        setReplyText('');
        const updated = await res.json();
        
        // Update selected bottle in state
        setSelectedBottle(updated);
        
        // Refresh items in background
        await fetchBottles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sink bottle (delete)
  const handleSinkBottle = async (id) => {
    if (!confirm('Are you sure you want to sink this bottle to the deep dark sea forever?')) return;

    try {
      const res = await fetch(`${API_BASE}/bottles/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSelectedBottle(null);
        await fetchBottles();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="ocean-app">
      {/* Stars Canvas Background */}
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="ocean-canvas"
      />

      {/* Floating UI Elements */}
      <div className="ui-overlay">
        <header className="ocean-header">
          <div className="brand flex items-center gap-2">
            <Compass className="brand-logo animate-spin-slow" />
            <div>
              <h1>Ocean Wisher</h1>
              <p className="sub">Deep Ocean Message Bottles</p>
            </div>
          </div>

          <div className="audio-and-filters">
            {/* Soft music toggle */}
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

            {/* Filter buttons */}
            <div className="filter-bar">
              <button 
                onClick={() => setActiveFilter('all')} 
                className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              >
                All Currents
              </button>
              <button 
                onClick={() => setActiveFilter('amethyst')} 
                className={`filter-btn amethyst ${activeFilter === 'amethyst' ? 'active' : ''}`}
              >
                Amethyst
              </button>
              <button 
                onClick={() => setActiveFilter('aquamarine')} 
                className={`filter-btn aquamarine ${activeFilter === 'aquamarine' ? 'active' : ''}`}
              >
                Aquamarine
              </button>
              <button 
                onClick={() => setActiveFilter('citrine')} 
                className={`filter-btn citrine ${activeFilter === 'citrine' ? 'active' : ''}`}
              >
                Citrine
              </button>
            </div>
          </div>
        </header>

        {/* Instructions */}
        <div className="ocean-info-toast">
          <HelpCircle size={14} />
          <span>Click a drifting glowing bottle to pull it in and read its secret scroll.</span>
        </div>

        {/* Launch button */}
        <button 
          onClick={() => setShowWriteModal(true)} 
          className="btn-launch-bottle flex items-center gap-2"
        >
          <PlusCircle size={20} />
          <span>Cast a Bottle into the Sea</span>
        </button>
      </div>

      {/* Write Bottle Modal */}
      {showWriteModal && (
        <div className="backdrop fade-in">
          <div className="paper-modal scroll-parchment">
            <button onClick={() => setShowWriteModal(false)} className="close-btn">
              <X size={20} />
            </button>
            
            <form onSubmit={handleLaunchBottle} className="parchment-form">
              <h2>Write your Secret Message</h2>
              <p className="form-sub">Write a dream, a confession, or an anonymous note to the universe.</p>
              
              <textarea 
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your note here... (it will drift anonymously in the cosmic currents)"
                maxLength={400}
                required
              />

              <div className="form-settings">
                <div className="setting-group">
                  <label>Bottle Essence (Color)</label>
                  <div className="bottle-selectors">
                    {['sapphire', 'emerald', 'amber', 'rose'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setBottleType(type)}
                        className={`bottle-select-btn ${type} ${bottleType === type ? 'selected' : ''}`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="setting-group">
                  <label>Attach Glowing Stone (Energy)</label>
                  <select 
                    value={stoneType} 
                    onChange={(e) => setStoneType(e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="amethyst">Amethyst (Purple)</option>
                    <option value="aquamarine">Aquamarine (Blue)</option>
                    <option value="citrine">Citrine (Yellow)</option>
                  </select>
                </div>
              </div>

              <div className="form-actions text-center">
                <button type="submit" className="btn-cast flex items-center gap-2">
                  <Send size={16} /> Seal & Launch Bottle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read Bottle Modal */}
      {selectedBottle && (
        <div className="backdrop fade-in">
          <div className="paper-modal scroll-parchment read-mode">
            <button onClick={() => setSelectedBottle(null)} className="close-btn">
              <X size={20} />
            </button>

            <div className="parchment-content">
              <div className="bottle-meta">
                <span className={`glow-indicator ${selectedBottle.bottleType}`}>
                  {selectedBottle.bottleType} Essence
                </span>
                {selectedBottle.stoneType && selectedBottle.stoneType !== 'none' && (
                  <span className={`stone-indicator ${selectedBottle.stoneType}`}>
                    {selectedBottle.stoneType} stone attached
                  </span>
                )}
                <span className="date-tag">
                  Drifting since {new Date(selectedBottle.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Message */}
              <div className="bottle-scroll-text">
                <p className="main-message">"{selectedBottle.message}"</p>
              </div>

              {/* Replies Section */}
              <div className="replies-section">
                <h3>Scroll Reply History ({selectedBottle.replies?.length || 0})</h3>
                
                <div className="replies-list">
                  {selectedBottle.replies?.length === 0 ? (
                    <p className="empty-replies">No replies written on this scroll yet. Be the first...</p>
                  ) : (
                    selectedBottle.replies.map((reply, index) => (
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

              {/* Actions */}
              <div className="scroll-footer flex justify-between items-center mt-4">
                <button 
                  onClick={() => handleSinkBottle(selectedBottle._id)} 
                  className="btn-sink flex items-center gap-1"
                  title="Sink Bottle"
                >
                  <Trash2 size={14} /> Sink Bottle
                </button>

                <button 
                  onClick={() => {
                    playSound('splash');
                    setSelectedBottle(null);
                  }} 
                  className="btn-toss"
                >
                  Toss back into the sea
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
