/**
 * MultiChatbot - Animations & Visual Motion Controller
 * Handles interactive particle canvas, 3D AI Orb state transitions, and ambient lighting.
 */

class MotionSystem {
  constructor() {
    this.canvas = document.getElementById('landing-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animationFrameId = null;
    this.isRunning = false;
    this.mouse = { x: -1000, y: -1000, radius: 140 };

    this.orbElement = document.getElementById('central-orb');
    this.miniOrbElement = document.getElementById('header-mini-orb');
    this.orbStatusLabel = document.getElementById('orb-status-text');

    this.currentOrbState = 'idle';

    this.init();
  }

  init() {
    if (this.canvas && this.ctx) {
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
      window.addEventListener('mousemove', (e) => this.onMouseMove(e));
      this.createParticles();
      this.startCanvas();
    }
    this.setOrbState('idle');
  }

  resizeCanvas() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  onMouseMove(e) {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  }

  createParticles() {
    const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 12000), 90);
    this.particles = [];

    // Colors: Moonlight Silver variations (#E6E8EB, #B8BDC5, #D3D7DD) and Signal Red (#F04452)
    const colors = [
      'rgba(230, 232, 235, 0.45)',
      'rgba(184, 189, 197, 0.35)',
      'rgba(211, 215, 221, 0.3)',
      'rgba(240, 68, 82, 0.55)', // Signal Red accent
    ];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        isRed: Math.random() < 0.2,
      });
    }
  }

  startCanvas() {
    if (this.isRunning) return;
    this.isRunning = true;
    const render = () => {
      this.renderCanvas();
      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(render);
      }
    };
    render();
  }

  stopCanvas() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  renderCanvas() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Update and draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges softly
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      // Cursor gentle repulsion/parallax
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.mouse.radius && dist > 0) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        p.x -= (dx / dist) * force * 1.5;
        p.y -= (dy / dist) * force * 1.5;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.fill();

      // Connect nearby particles with faint geometric lines
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const lineDx = p.x - p2.x;
        const lineDy = p.y - p2.y;
        const lineDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

        if (lineDist < 105) {
          const alpha = (1 - lineDist / 105) * 0.16;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = (p.isRed || p2.isRed)
            ? `rgba(240, 68, 82, ${alpha * 1.2})`
            : `rgba(230, 232, 235, ${alpha})`;
          this.ctx.lineWidth = 0.65;
          this.ctx.stroke();
        }
      }
    }
  }

  /**
   * Set AI Orb interaction state.
   * States: 'idle', 'listening', 'thinking', 'responding', 'error'
   */
  setOrbState(state) {
    const validStates = ['idle', 'listening', 'thinking', 'responding', 'error'];
    const newState = validStates.includes(state) ? state : 'idle';
    this.currentOrbState = newState;

    const stateClasses = validStates.map((s) => `state-${s}`);

    // Update Central Landing Orb if present
    if (this.orbElement) {
      this.orbElement.classList.remove(...stateClasses);
      this.orbElement.classList.add(`state-${newState}`);
    }

    // Update Header Mini Orb if present
    if (this.miniOrbElement) {
      this.miniOrbElement.classList.remove(...stateClasses);
      this.miniOrbElement.classList.add(`state-${newState}`);
    }

    // Update Topbar status label
    if (this.orbStatusLabel) {
      const labelMap = {
        idle: 'AI Friend: Ready',
        listening: 'AI Friend: Listening...',
        thinking: 'AI Friend: Thinking...',
        responding: 'AI Friend: Speaking...',
        error: 'AI Friend: Alert',
      };
      this.orbStatusLabel.textContent = labelMap[newState] || 'AI Friend: Ready';
    }
  }
}

// Global instance attached to window
window.motionSystem = new MotionSystem();
