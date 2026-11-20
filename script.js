// ==================== 1. ROLLABLE RETRO FLIP CLOCK (DD / MM / YY) ====================
const clockLimits = {
  dd: { min: 1, max: 31, val: 1 },
  mm: { min: 1, max: 12, val: 1 },
  yy: { min: 0, max: 26, val: 0 }
};

function formatTwo(num) {
  return String(num).padStart(2, '0');
}

function updateFlap(unit, delta) {
  if (!delta) return;
  const item = clockLimits[unit];
  const range = item.max - item.min + 1;
  item.val = (((item.val - item.min + delta) % range) + range) % range + item.min;

  const formatted = formatTwo(item.val);
  const topEl = document.getElementById(`${unit}-top`);
  const botEl = document.getElementById(`${unit}-bot`);
  if (topEl) topEl.textContent = formatted;
  if (botEl) botEl.textContent = formatted;

  const card = document.querySelector(`#unit-${unit} .flap-card`);
  if (card) {
    card.classList.remove('flipping');
    void card.offsetWidth;
    card.classList.add('flipping');
  }
}

document.querySelectorAll('.flap-unit').forEach((el) => {
  const unit = el.dataset.unit;
  el.removeAttribute('title');

  let isDragging = false;
  let startY = 0;
  let lastY = 0;
  let movedDistance = 0;
  let velocity = 0;
  let inertiaFrame = null;

  const stopInertia = () => {
    if (inertiaFrame) {
      cancelAnimationFrame(inertiaFrame);
      inertiaFrame = null;
    }
  };

  const onPointerDown = (clientY) => {
    stopInertia();
    isDragging = true;
    startY = clientY;
    lastY = clientY;
    movedDistance = 0;
    velocity = 0;
    el.style.cursor = 'grabbing';
  };

  const onPointerMove = (clientY) => {
    if (!isDragging) return;
    const dy = lastY - clientY;
    movedDistance += Math.abs(dy);
    velocity = dy;

    const stepPx = 18;
    const steps = Math.trunc((startY - clientY) / stepPx);
    if (steps !== 0) {
      updateFlap(unit, steps);
      startY -= steps * stepPx;
    }
    lastY = clientY;
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    el.style.cursor = 'grab';

    if (movedDistance < 6) {
      updateFlap(unit, 1);
      return;
    }

    let momentum = velocity * 0.45;
    const coast = () => {
      if (Math.abs(momentum) < 2) return;
      const step = Math.trunc(momentum / 8);
      if (step !== 0) {
        updateFlap(unit, step);
      }
      momentum *= 0.88;
      inertiaFrame = requestAnimationFrame(coast);
    };
    inertiaFrame = requestAnimationFrame(coast);
  };

  el.style.cursor = 'grab';
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onPointerDown(e.clientY);
  });
  window.addEventListener('mousemove', (e) => onPointerMove(e.clientY));
  window.addEventListener('mouseup', onPointerUp);

  el.addEventListener('touchstart', (e) => {
    onPointerDown(e.touches[0].clientY);
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    e.preventDefault();
    onPointerMove(e.touches[0].clientY);
  }, { passive: false });
  el.addEventListener('touchend', onPointerUp);

  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    stopInertia();
    const magnitude = Math.max(1, Math.min(6, Math.round(Math.abs(e.deltaY) / 35)));
    const dir = e.deltaY > 0 ? 1 : -1;
    updateFlap(unit, dir * magnitude);
  }, { passive: false });
});

document.querySelectorAll('.knob-btn, .mini-step').forEach((btn) => {
  const unit = btn.dataset.unit;
  const dir = Number(btn.dataset.dir);
  let holdTimeout = null;
  let holdInterval = null;

  const startHold = (e) => {
    e.preventDefault();
    updateFlap(unit, dir);
    holdTimeout = setTimeout(() => {
      holdInterval = setInterval(() => {
        updateFlap(unit, dir);
      }, 130);
    }, 260);
  };

  const stopHold = () => {
    clearTimeout(holdTimeout);
    clearInterval(holdInterval);
  };

  btn.addEventListener('mousedown', startHold);
  btn.addEventListener('touchstart', startHold, { passive: false });
  btn.addEventListener('mouseup', stopHold);
  btn.addEventListener('mouseleave', stopHold);
  btn.addEventListener('touchend', stopHold);
});

// ==================== 2. WEB AUDIO BIRTHDAY & KING #18 ANTHEM ====================
let audioCtx = null;
let anthemPlaying = false;
let anthemTimer = null;
let noteIndex = 0;

const anthemNotes = [
  { freq: 392.0, dur: 0.28 }, { freq: 392.0, dur: 0.28 }, { freq: 440.0, dur: 0.55 },
  { freq: 392.0, dur: 0.55 }, { freq: 523.25, dur: 0.55 }, { freq: 493.88, dur: 0.9 },
  { freq: 392.0, dur: 0.28 }, { freq: 392.0, dur: 0.28 }, { freq: 440.0, dur: 0.55 },
  { freq: 392.0, dur: 0.55 }, { freq: 587.33, dur: 0.55 }, { freq: 523.25, dur: 0.9 },
  { freq: 392.0, dur: 0.28 }, { freq: 392.0, dur: 0.28 }, { freq: 783.99, dur: 0.55 },
  { freq: 659.25, dur: 0.55 }, { freq: 523.25, dur: 0.55 }, { freq: 493.88, dur: 0.55 },
  { freq: 440.0, dur: 0.9 }, { freq: 698.46, dur: 0.28 }, { freq: 698.46, dur: 0.28 },
  { freq: 659.25, dur: 0.55 }, { freq: 523.25, dur: 0.55 }, { freq: 587.33, dur: 0.55 },
  { freq: 523.25, dur: 1.0 }
];

function playNextAnthemNote() {
  if (!anthemPlaying) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const note = anthemNotes[noteIndex % anthemNotes.length];
  noteIndex++;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.09, audioCtx.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + note.dur);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + note.dur + 0.02);

  anthemTimer = setTimeout(playNextAnthemNote, note.dur * 1000 + 65);
}

const anthemBtn = document.getElementById('anthem-btn');
const anthemLabel = document.getElementById('anthem-label');

function setAnthemState(shouldPlay) {
  anthemPlaying = shouldPlay;
  if (anthemBtn) anthemBtn.classList.toggle('playing', shouldPlay);
  if (anthemLabel) anthemLabel.textContent = shouldPlay ? 'Anthem: ON' : 'Anthem: OFF';
  clearTimeout(anthemTimer);
  if (shouldPlay) {
    playNextAnthemNote();
  }
}

if (anthemBtn) {
  anthemBtn.addEventListener('click', () => {
    setAnthemState(!anthemPlaying);
  });
}

// ==================== 3. CONFETTI ENGINE ====================
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
let particles = [];

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const colors = ['#ff5c8a', '#e11d48', '#ffd1dc', '#fbbf24', '#ffffff', '#f472b6'];

function launchConfetti(count = 110) {
  if (!canvas) return;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      angle: Math.random() * 360,
      spin: Math.random() * 6 - 3
    });
  }
}

function animateConfetti() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, index) => {
    p.y += p.speedY;
    p.x += p.speedX;
    p.angle += p.spin;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    ctx.restore();

    if (p.y > canvas.height + 20) {
      particles.splice(index, 1);
    }
  });
  requestAnimationFrame(animateConfetti);
}

animateConfetti();

const celebrateBtn = document.getElementById('celebrate-btn');
if (celebrateBtn) {
  celebrateBtn.addEventListener('click', () => launchConfetti(120));
}

// ==================== 4. BIRTHDAY BANNER & DOB UNLOCK (20 / 11 / 05) ====================
const unlockBtn = document.getElementById('unlock-btn');
const lockError = document.getElementById('lock-error');
const lockCard = document.querySelector('.lock-card');

const midnightBanner = document.getElementById('midnight-banner');
const midnightLabel = document.getElementById('midnight-label');
const midnightTimer = document.getElementById('midnight-timer');

if (midnightBanner && midnightLabel && midnightTimer) {
  midnightBanner.classList.add('celebrate-mode');
  midnightLabel.textContent = "HAPPY BIRTHDAY KUNAL! (20 NOV) 🎂🎉";
  midnightTimer.classList.add('hidden');
}

if (unlockBtn) {
  unlockBtn.disabled = false;
  unlockBtn.classList.remove('locked-state');
  unlockBtn.textContent = '🔓 Unlock Birthday Surprise';

  unlockBtn.addEventListener('click', () => {
    if (clockLimits.dd.val === 20 && clockLimits.mm.val === 11 && clockLimits.yy.val === 5) {
      if (lockError) lockError.textContent = '';
      const topBar = document.getElementById('top-bar');
      if (topBar) topBar.classList.remove('hidden');
      unlockedMaxScreen = 1;
      goToScreen(1);
      launchConfetti(140);
      setAnthemState(true);
    } else {
      if (lockError) lockError.textContent = 'abe chl be tujhe ye bhi nhi pata';
      if (lockCard) {
        lockCard.classList.remove('shake');
        void lockCard.offsetWidth;
        lockCard.classList.add('shake');
      }
    }
  });
}

// ==================== 5. INTERACTIVE "BLOW OUT THE CANDLES" BIRTHDAY CAKE ====================
const cakeWidget = document.getElementById('cake-widget');
const candles = document.querySelectorAll('.candle');
const cakeTitle = document.getElementById('cake-title');
const cakeSub = document.getElementById('cake-sub');
const relightBtn = document.getElementById('relight-btn');
let candlesBlown = false;

if (cakeWidget) {
  cakeWidget.addEventListener('click', (e) => {
    if (e.target === relightBtn) return;
    if (!candlesBlown) {
      candlesBlown = true;
      candles.forEach((c) => c.classList.add('blown'));
      if (cakeTitle) cakeTitle.textContent = '🎉 Wish Made! Happy Birthday Kunal!';
      if (cakeSub) cakeSub.textContent = 'May all your Upscale & life dreams come true bhai!';
      if (relightBtn) relightBtn.classList.remove('hidden');
      launchConfetti(130);
    }
  });
}

if (relightBtn) {
  relightBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    candlesBlown = false;
    candles.forEach((c) => c.classList.remove('blown'));
    if (cakeTitle) cakeTitle.textContent = '🕯️ Make a Wish & Tap The Cake!';
    if (cakeSub) cakeSub.textContent = 'Click the cake (or each candle) to blow them out';
    relightBtn.classList.add('hidden');
  });
}

// ==================== 6. 3D TILT & HOLOGRAPHIC GLARE ON CARDS ====================
document.querySelectorAll('.tilt-3d').forEach((card) => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02)`;
    card.style.setProperty('--glare-x', `${((x / rect.width) * 100).toFixed(1)}%`);
    card.style.setProperty('--glare-y', `${((y / rect.height) * 100).toFixed(1)}%`);
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = '';
  });
});

// ==================== 7. MULTI-SCREEN NAVIGATION ====================
let unlockedMaxScreen = 0;

function goToScreen(num) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`screen-${num}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.querySelectorAll('.step-dot').forEach((dot) => {
    const step = Number(dot.dataset.step);
    dot.classList.toggle('active', step === num);
    dot.classList.toggle('unlocked', step <= unlockedMaxScreen);
  });
}

document.querySelectorAll('.step-dot').forEach((dot) => {
  dot.addEventListener('click', () => {
    const step = Number(dot.dataset.step);
    if (step <= unlockedMaxScreen) {
      goToScreen(step);
    }
  });
});

// ==================== 8. QUIZ CHECKPOINTS BETWEEN SCREENS ====================
const wrongRoasts = [
  '😂 Arre bhai, khud ko hi nahi pehchanta kya? Dobara try kar!',
  '❌ Galat jawab! Lagta hai aaj bhi nahaya nahi hai, dimaag kaam nahi kar raha!',
  '🙈 Wrong! Sarkari School ka bacha bhi yeh sahi bata deta!'
];

document.querySelectorAll('.quiz-options').forEach((group) => {
  const correctIdx = Number(group.dataset.correct);
  const nextScreen = Number(group.dataset.next);
  const feedbackEl = group.parentElement.querySelector('.quiz-feedback');

  group.querySelectorAll('.quiz-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      const chosen = Number(btn.dataset.idx);
      group.querySelectorAll('.quiz-opt').forEach((b) => b.classList.remove('wrong'));

      if (chosen === correctIdx) {
        btn.classList.add('correct');
        if (feedbackEl) {
          feedbackEl.style.color = '#15803d';
          feedbackEl.textContent = '✅ Ekdum Sahi Jawab! Unlocking Next Page... 🎉';
        }
        launchConfetti(80);
        unlockedMaxScreen = Math.max(unlockedMaxScreen, nextScreen);

        setTimeout(() => {
          goToScreen(nextScreen);
        }, 900);
      } else {
        btn.classList.add('wrong');
        if (feedbackEl) {
          feedbackEl.style.color = '#e11d48';
          feedbackEl.textContent = wrongRoasts[Math.floor(Math.random() * wrongRoasts.length)];
        }
      }
    });
  });
});

// ==================== 9. INSIDE JOKES & LIGHTBOX ====================
const jokeToast = document.getElementById('joke-toast');
document.querySelectorAll('.joke-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    if (jokeToast) jokeToast.textContent = chip.getAttribute('data-msg');
    launchConfetti(45);
  });
});

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
document.querySelectorAll('.zoomable').forEach((img) => {
  img.addEventListener('click', () => {
    if (lightboxImg && lightbox) {
      lightboxImg.src = img.src;
      lightbox.classList.add('open');
    }
  });
});

// ==================== 10. SUNFLOWER PETALS & SCREEN 5 TRANSITION ====================
(function buildSunflower() {
  const svgNS = 'http://www.w3.org/2000/svg';
  const outerGroup = document.getElementById('sf-outer-petals');
  const innerGroup = document.getElementById('sf-inner-petals');
  const seedsGroup = document.getElementById('sf-seeds');
  if (!outerGroup || !innerGroup || !seedsGroup) return;

  for (let i = 0; i < 24; i++) {
    const angle = i * 15;
    const petal = document.createElementNS(svgNS, 'path');
    petal.setAttribute('d', 'M250 225 C228 155, 232 72, 250 32 C268 72, 272 155, 250 225 Z');
    petal.setAttribute('fill', 'url(#petalOuter)');
    petal.setAttribute('stroke', '#eab308');
    petal.setAttribute('stroke-width', '1.2');
    petal.setAttribute('transform', `rotate(${angle} 250 225)`);
    outerGroup.appendChild(petal);
  }

  for (let i = 0; i < 24; i++) {
    const angle = i * 15 + 7.5;
    const petal = document.createElementNS(svgNS, 'path');
    petal.setAttribute('d', 'M250 225 C231 165, 235 95, 250 56 C265 95, 269 165, 250 225 Z');
    petal.setAttribute('fill', 'url(#petalInner)');
    petal.setAttribute('stroke', '#d97706');
    petal.setAttribute('stroke-width', '1');
    petal.setAttribute('transform', `rotate(${angle} 250 225)`);
    innerGroup.appendChild(petal);
  }

  const goldenAngle = 137.508 * (Math.PI / 180);
  for (let n = 0; n < 130; n++) {
    const r = 6.2 * Math.sqrt(n);
    if (r > 74) break;
    const theta = n * goldenAngle;
    const cx = 250 + r * Math.cos(theta);
    const cy = 225 + r * Math.sin(theta);

    const dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('cx', cx.toFixed(1));
    dot.setAttribute('cy', cy.toFixed(1));
    dot.setAttribute('r', n % 3 === 0 ? '2.6' : '2.0');
    dot.setAttribute('fill', n % 2 === 0 ? '#fbbf24' : '#92400e');
    dot.setAttribute('opacity', '0.75');
    seedsGroup.appendChild(dot);
  }
})();

const toSunflowerBtn = document.getElementById('to-sunflower-btn');
if (toSunflowerBtn) {
  toSunflowerBtn.addEventListener('click', () => {
    unlockedMaxScreen = Math.max(unlockedMaxScreen, 5);
    goToScreen(5);
    launchConfetti(150);
  });
}
