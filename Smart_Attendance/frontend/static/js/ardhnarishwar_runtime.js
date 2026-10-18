/**
 * ══════════════════════════════════════════════════════════════════════════════
 * ARDHNARISHWAR GLOBAL SAAS ATTENDANCE PLATFORM
 * RUNTIME SYNCHRONIZER & 3D INTERACTIVE VISUAL ENGINE
 * ══════════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  // ── 1. Web Audio API Futuristic Sound Synthesizer ───────────────────────────
  let audioCtx = null;
  let isMuted = localStorage.getItem('ardh_sound_muted') === 'true';

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playTone(freq, type, duration, gainVal = 0.08) {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  const SoundFX = {
    click: () => playTone(800, 'sine', 0.08, 0.05),
    refresh: () => {
      if (isMuted) return;
      playTone(523.25, 'sine', 0.12, 0.06); // C5
      setTimeout(() => playTone(659.25, 'sine', 0.14, 0.06), 80); // E5
      setTimeout(() => playTone(783.99, 'sine', 0.22, 0.08), 160); // G5
    },
    success: () => {
      if (isMuted) return;
      playTone(440, 'triangle', 0.1, 0.07);
      setTimeout(() => playTone(880, 'sine', 0.25, 0.09), 100);
    },
    error: () => {
      if (isMuted) return;
      playTone(220, 'sawtooth', 0.2, 0.08);
      setTimeout(() => playTone(180, 'sawtooth', 0.25, 0.08), 120);
    },
    toggleMute: () => {
      isMuted = !isMuted;
      localStorage.setItem('ardh_sound_muted', isMuted);
      document.querySelectorAll('.btn-sound-fx').forEach(btn => {
        btn.classList.toggle('muted', isMuted);
        btn.innerHTML = isMuted ? '<span>🔇</span> <span>Muted</span>' : '<span>🔊</span> <span>Sound On</span>';
      });
      return isMuted;
    }
  };

  // ── 2. Master Runtime Live Synchronizer Engine ──────────────────────────────
  const syncTasks = new Map();
  let autoRefreshTimer = null;
  let autoRefreshIntervalSec = parseInt(localStorage.getItem('ardh_auto_refresh') || '15', 10);
  let isAutoRefreshActive = localStorage.getItem('ardh_auto_refresh_active') !== 'false';
  let lastSyncTimestamp = Date.now();

  const RuntimeEngine = {
    registerTask: (id, callback) => {
      if (typeof callback === 'function') {
        syncTasks.set(id, callback);
      }
    },

    unregisterTask: (id) => {
      syncTasks.delete(id);
    },

    triggerGlobalSync: async (customFeedback = true) => {
      const startTime = performance.now();
      const refreshBtns = document.querySelectorAll('.btn-runtime-refresh, .portal-refresh-btn, .refresh-trigger');
      refreshBtns.forEach(b => {
        b.classList.add('syncing');
        const icon = b.querySelector('.refresh-icon, span:first-child');
        if (icon) icon.style.animation = 'spinSmooth 0.65s linear infinite';
      });

      if (customFeedback) SoundFX.refresh();

      const promises = [];
      syncTasks.forEach((fn, id) => {
        try {
          const res = fn();
          if (res && typeof res.then === 'function') {
            promises.push(res.catch(err => console.warn(`Sync task failed: ${id}`, err)));
          }
        } catch (e) {
          console.warn(`Sync task error: ${id}`, e);
        }
      });

      try {
        await Promise.allSettled(promises);
      } finally {
        const duration = Math.round(performance.now() - startTime);
        lastSyncTimestamp = Date.now();

        setTimeout(() => {
          refreshBtns.forEach(b => {
            b.classList.remove('syncing');
            const icon = b.querySelector('.refresh-icon, span:first-child');
            if (icon) icon.style.animation = '';
          });
        }, 300);

        RuntimeEngine.updateLastSyncLabels();

        if (customFeedback) {
          RuntimeEngine.showToast(`⚡ Runtime data synchronized in ${duration}ms`, 'success');
        }
      }
    },

    updateLastSyncLabels: () => {
      const now = Date.now();
      const diffSec = Math.floor((now - lastSyncTimestamp) / 1000);
      let text = 'Just now';
      if (diffSec >= 60) {
        text = `${Math.floor(diffSec / 60)}m ago`;
      } else if (diffSec > 5) {
        text = `${diffSec}s ago`;
      }

      document.querySelectorAll('.runtime-last-sync').forEach(el => {
        el.textContent = `Synced: ${text}`;
      });
    },

    startAutoRefresh: () => {
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      if (!isAutoRefreshActive || autoRefreshIntervalSec <= 0) return;

      autoRefreshTimer = setInterval(() => {
        RuntimeEngine.triggerGlobalSync(false);
      }, autoRefreshIntervalSec * 1000);
    },

    toggleAutoRefresh: () => {
      isAutoRefreshActive = !isAutoRefreshActive;
      localStorage.setItem('ardh_auto_refresh_active', isAutoRefreshActive);
      document.querySelectorAll('.auto-refresh-toggle').forEach(el => {
        el.classList.toggle('active', isAutoRefreshActive);
        el.innerHTML = isAutoRefreshActive
          ? `<span>⚡ Auto-Sync: <b>ON (${autoRefreshIntervalSec}s)</b></span>`
          : `<span>⏸️ Auto-Sync: <b>PAUSED</b></span>`;
      });

      if (isAutoRefreshActive) {
        RuntimeEngine.startAutoRefresh();
        RuntimeEngine.showToast(`Auto-sync activated (${autoRefreshIntervalSec}s intervals)`, 'success');
      } else {
        if (autoRefreshTimer) clearInterval(autoRefreshTimer);
        RuntimeEngine.showToast('Auto-sync paused', 'info');
      }
    },

    showToast: (msg, type = 'success') => {
      let container = document.getElementById('runtime-toast-portal');
      if (!container) {
        container = document.createElement('div');
        container.id = 'runtime-toast-portal';
        container.className = 'runtime-toast-portal';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `runtime-toast-item ${type}`;
      const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
      toast.innerHTML = `<span style="font-size:16px;">${icon}</span> <span>${msg}</span>`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 350);
      }, 3500);
    }
  };

  // Periodically update the "Synced: X ago" label
  setInterval(() => {
    RuntimeEngine.updateLastSyncLabels();
  }, 4000);

  // ── 3. 3D Tilt & Parallax Physics Engine ─────────────────────────────────────
  function setup3DCardTilt() {
    const cards = document.querySelectorAll('.card-3d, .ardh-feature-card, .ardh-portal-card, .ardh-hero-medallion, .tilt-3d');

    cards.forEach(card => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -12;
        const rotateY = ((x - centerX) / centerX) * 12;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.025, 1.025, 1.025)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });
    });
  }

  // ── 4. 3D Cosmic Particle Background (Canvas) ───────────────────────────────
  function init3DParticleCanvas() {
    const canvas = document.getElementById('ardh-3d-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const particleCount = Math.min(Math.floor(width / 25), 65);

    const colors = [
      'rgba(168, 85, 247, 0.45)', // Purple
      'rgba(6, 182, 212, 0.45)',  // Teal
      'rgba(245, 158, 11, 0.35)', // Gold
      'rgba(124, 58, 237, 0.3)'   // Deep Purple
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 800 + 200,
        radius: Math.random() * 2.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.5
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function render() {
      ctx.clearRect(0, 0, width, height);

      const targetOffsetX = (mouseX - width / 2) * 0.05;
      const targetOffsetY = (mouseY - height / 2) * 0.05;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const fov = 400;
        const scale = fov / (fov + p.z);
        const screenX = (p.x - width / 2 + targetOffsetX) * scale + width / 2;
        const screenY = (p.y - height / 2 + targetOffsetY) * scale + height / 2;

        ctx.beginPath();
        ctx.arc(screenX, screenY, p.radius * scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Draw subtle connector web
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            const scale2 = fov / (fov + p2.z);
            const screenX2 = (p2.x - width / 2 + targetOffsetX) * scale2 + width / 2;
            const screenY2 = (p2.y - height / 2 + targetOffsetY) * scale2 + height / 2;
            ctx.lineTo(screenX2, screenY2);
            ctx.strokeStyle = `rgba(168, 85, 247, ${0.12 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(render);
    }

    render();
  }

  // ── 5. Instant Table Search & CSV Export Helpers ────────────────────────────
  function setupTableSearch(inputEl, tableBodyEl) {
    if (!inputEl || !tableBodyEl) return;
    inputEl.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const rows = tableBodyEl.querySelectorAll('tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  function exportTableToCSV(tableEl, filename = 'attendance_report.csv') {
    if (!tableEl) return;
    const rows = Array.from(tableEl.querySelectorAll('tr'));
    const csvContent = rows.map(r => {
      const cols = Array.from(r.querySelectorAll('th, td'));
      return cols.map(c => `"${c.innerText.replace(/"/g, '""').trim()}"`).join(',');
    }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    RuntimeEngine.showToast(`Exported ${filename}`, 'success');
  }

  // ── 6. Global DOM Hook & Initialization ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    setup3DCardTilt();
    init3DParticleCanvas();

    // Auto-bind sound button state
    document.querySelectorAll('.btn-sound-fx').forEach(btn => {
      btn.classList.toggle('muted', isMuted);
      btn.innerHTML = isMuted ? '<span>🔇</span> <span>Muted</span>' : '<span>🔊</span> <span>Sound On</span>';
      btn.addEventListener('click', () => SoundFX.toggleMute());
    });

    // Auto-bind refresh buttons
    document.querySelectorAll('.btn-runtime-refresh').forEach(btn => {
      btn.addEventListener('click', () => RuntimeEngine.triggerGlobalSync(true));
    });

    // Auto-bind auto-refresh toggle
    document.querySelectorAll('.auto-refresh-toggle').forEach(btn => {
      btn.classList.toggle('active', isAutoRefreshActive);
      btn.innerHTML = isAutoRefreshActive
        ? `<span>⚡ Auto-Sync: <b>ON (${autoRefreshIntervalSec}s)</b></span>`
        : `<span>⏸️ Auto-Sync: <b>PAUSED</b></span>`;
      btn.addEventListener('click', () => RuntimeEngine.toggleAutoRefresh());
    });

    RuntimeEngine.startAutoRefresh();
  });

  // Expose Global Public API
  window.ArdhnarishwarRuntime = {
    SoundFX,
    registerTask: RuntimeEngine.registerTask,
    unregisterTask: RuntimeEngine.unregisterTask,
    triggerGlobalSync: RuntimeEngine.triggerGlobalSync,
    toggleAutoRefresh: RuntimeEngine.toggleAutoRefresh,
    showToast: RuntimeEngine.showToast,
    setupTableSearch,
    exportTableToCSV,
    setup3DCardTilt
  };
})();
