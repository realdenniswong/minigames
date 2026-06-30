const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");
const flappyScoreEl = document.getElementById("flappyScore");
const flappyBestEl = document.getElementById("flappyBest");
const flappyMessage = document.getElementById("flappyMessage");
let flappyState;
let flappyFrame;
let flappyAudio;

const groundHeight = 54;
const pipeWidth = 62;
const pipeSpeed = 3.25;
const pipeInterval = 84;
const pipeGap = 124;
const gravity = 0.46;
const flapPower = -7.8;

function resetFlappy() {
  cancelAnimationFrame(flappyFrame);
  flappyState = {
    running: false,
    over: false,
    paused: false,
    score: 0,
    best: Number(localStorage.getItem("offlineMiniGames.flappyBest") || 0),
    bird: { x: 92, y: 240, vy: 0, radius: 15 },
    pipes: [],
    tick: 0,
  };
  flappyScoreEl.textContent = "0";
  flappyBestEl.textContent = flappyState.best;
  flappyMessage.textContent = "Tap the game or press Space to start.";
  drawFlappy();
}

function startFlappy() {
  if (flappyState.over) {
    flappyMessage.textContent = "Game over. Press Reset to fly again.";
    return;
  }
  if (!flappyState.running) {
    flappyState.running = true;
    flappyState.paused = false;
    flappyMessage.textContent = "Tap, click, or press Space to flap.";
    loopFlappy();
  }
  flap();
}

function flap() {
  if (!flappyState.running) return;
  flappyState.bird.vy = flapPower;
  playFlapSound();
}

function playFlapSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  flappyAudio ??= new AudioContext();
  if (flappyAudio.state === "suspended") flappyAudio.resume();
  const now = flappyAudio.currentTime;
  const oscillator = flappyAudio.createOscillator();
  const gain = flappyAudio.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(460, now);
  oscillator.frequency.exponentialRampToValueAtTime(640, now + 0.055);
  gain.gain.setValueAtTime(0.055, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  oscillator.connect(gain);
  gain.connect(flappyAudio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.09);
}

function handleFlappyTap(event) {
  event.preventDefault();
  if (event.pointerId !== undefined && canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }
  startFlappy();
}

function stopFlappyPageGesture(event) {
  if (flappyState?.running) event.preventDefault();
}

function loopFlappy() {
  updateFlappy();
  drawFlappy();
  if (flappyState.running) flappyFrame = requestAnimationFrame(loopFlappy);
}

function updateFlappy() {
  const state = flappyState;
  state.tick += 1;
  state.bird.vy += gravity;
  state.bird.y += state.bird.vy;

  if (state.tick % pipeInterval === 0) {
    const minTop = 72;
    const maxTop = canvas.height - groundHeight - pipeGap - 78;
    const top = minTop + Math.random() * (maxTop - minTop);
    state.pipes.push({ x: canvas.width, top, bottom: top + pipeGap, scored: false });
  }

  state.pipes.forEach((pipe) => {
    pipe.x -= pipeSpeed;
    if (!pipe.scored && pipe.x + pipeWidth < state.bird.x) {
      pipe.scored = true;
      state.score += 1;
      flappyScoreEl.textContent = state.score;
    }
  });
  state.pipes = state.pipes.filter((pipe) => pipe.x > -70);

  if (
    state.bird.y - state.bird.radius < 0 ||
    state.bird.y + state.bird.radius > canvas.height - groundHeight
  ) {
    endFlappy();
  }

  state.pipes.forEach((pipe) => {
    const inPipeX =
      state.bird.x + state.bird.radius > pipe.x &&
      state.bird.x - state.bird.radius < pipe.x + pipeWidth;
    const inPipeY =
      state.bird.y - state.bird.radius < pipe.top ||
      state.bird.y + state.bird.radius > pipe.bottom;
    if (inPipeX && inPipeY) endFlappy();
  });
}

function endFlappy() {
  if (flappyState.over) return;
  flappyState.running = false;
  flappyState.over = true;
  flappyState.best = Math.max(flappyState.best, flappyState.score);
  localStorage.setItem("offlineMiniGames.flappyBest", String(flappyState.best));
  flappyBestEl.textContent = flappyState.best;
  flappyMessage.textContent = "Game over. Press Reset to fly again.";
}

function pauseFlappy() {
  if (!flappyState) return;
  cancelAnimationFrame(flappyFrame);
  if (flappyState.running) {
    flappyState.running = false;
    flappyState.paused = true;
    flappyMessage.textContent = "Paused. Tap the game to continue.";
  }
}

function drawFlappy() {
  if (!flappyState) return;
  const { bird, pipes } = flappyState;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#83c8e3");
  sky.addColorStop(1, "#d9f0ea");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  drawCloud(74, 86, 30);
  drawCloud(324, 132, 24);

  pipes.forEach((pipe) => {
    ctx.fillStyle = "#1c8f78";
    ctx.fillRect(pipe.x, 0, pipeWidth, pipe.top);
    ctx.fillRect(pipe.x, pipe.bottom, pipeWidth, canvas.height - pipe.bottom - groundHeight);
    ctx.fillStyle = "#126653";
    ctx.fillRect(pipe.x - 5, pipe.top - 16, pipeWidth + 10, 16);
    ctx.fillRect(pipe.x - 5, pipe.bottom, pipeWidth + 10, 16);
  });

  ctx.fillStyle = "#5aa05a";
  ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
  ctx.fillStyle = "#3f783f";
  for (let x = 0; x < canvas.width; x += 24) {
    ctx.fillRect(x, canvas.height - groundHeight, 14, 8);
  }

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(Math.max(-0.45, Math.min(0.75, bird.vy / 12)));
  ctx.fillStyle = "#f2c94c";
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#252a34";
  ctx.beginPath();
  ctx.arc(8, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d95e4f";
  ctx.beginPath();
  ctx.moveTo(15, 0);
  ctx.lineTo(28, 5);
  ctx.lineTo(15, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size, Math.PI, 0);
  ctx.arc(x + size, y - 10, size * 0.85, Math.PI, 0);
  ctx.arc(x + size * 1.9, y, size, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
}

function bindImmediateButton(id, action) {
  const button = document.getElementById(id);
  let lastTouchAt = 0;
  button.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    lastTouchAt = Date.now();
    event.preventDefault();
    action();
  });
  button.addEventListener("click", () => {
    if (Date.now() - lastTouchAt < 700) return;
    action();
  });
}

bindImmediateButton("resetFlappy", resetFlappy);
canvas.addEventListener("pointerdown", handleFlappyTap);
canvas.addEventListener("pointermove", stopFlappyPageGesture);
canvas.addEventListener("touchstart", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("touchmove", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("touchend", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("contextmenu", stopFlappyPageGesture);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    startFlappy();
  }
});
window.addEventListener("pagehide", pauseFlappy);
resetFlappy();
