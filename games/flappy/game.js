const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");
const flappyScoreEl = document.getElementById("flappyScore");
const flappyBestEl = document.getElementById("flappyBest");
const flappyMessage = document.getElementById("flappyMessage");
let flappyState;
let flappyFrame;

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
  flappyMessage.textContent = "Press Start, then tap the game to flap.";
  drawFlappy();
}

function startFlappy() {
  if (flappyState.over) resetFlappy();
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
  flappyState.bird.vy = -7.2;
}

function handleFlappyTap(event) {
  event.preventDefault();
  if (event.pointerId !== undefined && canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }
  if (flappyState.running) flap();
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
  state.bird.vy += 0.38;
  state.bird.y += state.bird.vy;

  if (state.tick % 92 === 0) {
    const gap = 150;
    const top = 80 + Math.random() * 230;
    state.pipes.push({ x: canvas.width, top, bottom: top + gap, scored: false });
  }

  state.pipes.forEach((pipe) => {
    pipe.x -= 2.7;
    if (!pipe.scored && pipe.x + 58 < state.bird.x) {
      pipe.scored = true;
      state.score += 1;
      flappyScoreEl.textContent = state.score;
    }
  });
  state.pipes = state.pipes.filter((pipe) => pipe.x > -70);

  if (state.bird.y - state.bird.radius < 0 || state.bird.y + state.bird.radius > canvas.height - 54) {
    endFlappy();
  }

  state.pipes.forEach((pipe) => {
    const inPipeX =
      state.bird.x + state.bird.radius > pipe.x &&
      state.bird.x - state.bird.radius < pipe.x + 58;
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
  flappyMessage.textContent = "Game over. Press Start to fly again.";
}

function pauseFlappy() {
  if (!flappyState) return;
  cancelAnimationFrame(flappyFrame);
  if (flappyState.running) {
    flappyState.running = false;
    flappyState.paused = true;
    flappyMessage.textContent = "Paused. Press Start to continue.";
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
    ctx.fillRect(pipe.x, 0, 58, pipe.top);
    ctx.fillRect(pipe.x, pipe.bottom, 58, canvas.height - pipe.bottom - 54);
    ctx.fillStyle = "#126653";
    ctx.fillRect(pipe.x - 5, pipe.top - 16, 68, 16);
    ctx.fillRect(pipe.x - 5, pipe.bottom, 68, 16);
  });

  ctx.fillStyle = "#5aa05a";
  ctx.fillRect(0, canvas.height - 54, canvas.width, 54);
  ctx.fillStyle = "#3f783f";
  for (let x = 0; x < canvas.width; x += 24) {
    ctx.fillRect(x, canvas.height - 54, 14, 8);
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

document.getElementById("startFlappy").addEventListener("click", startFlappy);
document.getElementById("resetFlappy").addEventListener("click", resetFlappy);
canvas.addEventListener("pointerdown", handleFlappyTap);
canvas.addEventListener("pointermove", stopFlappyPageGesture);
canvas.addEventListener("touchstart", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("touchmove", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("touchend", stopFlappyPageGesture, { passive: false });
canvas.addEventListener("contextmenu", stopFlappyPageGesture);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flap();
  }
});
window.addEventListener("pagehide", pauseFlappy);
resetFlappy();
