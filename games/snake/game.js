const canvas = document.getElementById("snakeCanvas");
const ctx = canvas.getContext("2d");
const snakeScoreEl = document.getElementById("snakeScore");
const snakeBestEl = document.getElementById("snakeBest");
const snakeSeedEl = document.getElementById("snakeSeed");
const snakeMessage = document.getElementById("snakeMessage");

const cols = 50;
const rows = 25;
const tickMs = 80;
const cellWidth = canvas.width / cols;
const cellHeight = canvas.height / rows;
const directions = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
};

let snakeState;
let snakeFrame = 0;
let lastTickAt = 0;
let snakeAudio;

function createRandomSeed() {
  return Math.floor(Math.random() * 1_000_000) + 1;
}

function createRng(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function cellKey(cell) {
  return `${cell.row},${cell.col}`;
}

function resetSnake(seed = createRandomSeed()) {
  cancelAnimationFrame(snakeFrame);
  const best = Number(localStorage.getItem("offlineMiniGames.snakeBest") || 0);
  const start = { row: Math.floor(rows / 2), col: Math.floor(cols / 2) };
  const rng = createRng(seed);
  const snake = [start, { row: start.row, col: start.col - 1 }];
  const walls = generateMap(rng, start);
  snakeState = {
    running: false,
    over: false,
    seed,
    rng,
    score: 0,
    best,
    snake,
    walls,
    food: generateRandomPosition(rng, snake, walls),
    direction: directions.right,
    directionQueue: [],
  };
  snakeScoreEl.textContent = "0";
  snakeBestEl.textContent = best;
  snakeSeedEl.textContent = seed;
  snakeMessage.textContent = "Tap an arrow or press an arrow key to start.";
  drawSnake();
}

function generateMap(rng, start) {
  const walls = new Set();
  const protectedCells = new Set();
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -3; col <= 3; col += 1) {
      protectedCells.add(cellKey({ row: start.row + row, col: start.col + col }));
    }
  }

  for (let shape = 0; shape < 12; shape += 1) {
    const row = randomInt(rng, 2, rows - 3);
    const col = randomInt(rng, 2, cols - 3);
    const horizontal = rng() < 0.5;
    const length = randomInt(rng, 2, 6);
    for (let step = 0; step < length; step += 1) {
      const cell = {
        row: row + (horizontal ? 0 : step),
        col: col + (horizontal ? step : 0),
      };
      const key = cellKey(cell);
      if (
        cell.row >= 1 &&
        cell.row < rows - 1 &&
        cell.col >= 1 &&
        cell.col < cols - 1 &&
        !protectedCells.has(key)
      ) {
        walls.add(key);
      }
    }
  }
  return walls;
}

function generateRandomPosition(rng, snake, walls) {
  const occupied = new Set(snake.map(cellKey));
  while (true) {
    const cell = {
      row: randomInt(rng, 1, rows - 2),
      col: randomInt(rng, 1, cols - 2),
    };
    const key = cellKey(cell);
    if (!occupied.has(key) && !walls.has(key)) return cell;
  }
}

function startSnake() {
  if (snakeState.over) {
    resetSnake(snakeState.seed);
  }
  if (snakeState.running) return;
  snakeState.running = true;
  snakeState.over = false;
  snakeMessage.textContent = "Eat the food and dodge the walls.";
  lastTickAt = performance.now();
  loopSnake(lastTickAt);
}

function pauseSnake() {
  if (!snakeState?.running) return;
  snakeState.running = false;
  snakeMessage.textContent = "Paused.";
  cancelAnimationFrame(snakeFrame);
}

function loopSnake(now) {
  if (!snakeState.running) return;
  if (now - lastTickAt >= tickMs) {
    updateSnake();
    drawSnake();
    lastTickAt += tickMs;
    if (now - lastTickAt > tickMs) lastTickAt = now;
  }
  snakeFrame = requestAnimationFrame(loopSnake);
}

function updateSnake() {
  const state = snakeState;
  const nextDirection = state.directionQueue.shift();
  if (nextDirection) state.direction = nextDirection;
  const head = state.snake[0];
  const nextHead = {
    row: head.row + state.direction.row,
    col: head.col + state.direction.col,
  };
  state.snake.unshift(nextHead);

  const ate = nextHead.row === state.food.row && nextHead.col === state.food.col;
  if (ate) {
    state.score += 1;
    snakeScoreEl.textContent = state.score;
    playEatSound();
    state.food = generateRandomPosition(state.rng, state.snake, state.walls);
  } else {
    state.snake.pop();
  }

  const hitBorder =
    nextHead.row <= 0 || nextHead.row >= rows - 1 || nextHead.col <= 0 || nextHead.col >= cols - 1;
  const hitWall = state.walls.has(cellKey(nextHead));
  const hitSelf = state.snake.slice(1).some((segment) => segment.row === nextHead.row && segment.col === nextHead.col);
  if (hitBorder || hitWall || hitSelf) endSnake();
}

function endSnake() {
  const state = snakeState;
  state.running = false;
  state.over = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem("offlineMiniGames.snakeBest", String(state.best));
  snakeBestEl.textContent = state.best;
  snakeMessage.textContent = `Game over. Final score: ${state.score}.`;
  cancelAnimationFrame(snakeFrame);
  drawSnake();
}

function setDirection(nextDirection) {
  if (!snakeState) return;
  const queue = snakeState.directionQueue;
  const lastDirection = queue.length ? queue[queue.length - 1] : snakeState.direction;
  const isReverse =
    nextDirection.row + lastDirection.row === 0 && nextDirection.col + lastDirection.col === 0;
  const isDuplicate =
    nextDirection.row === lastDirection.row && nextDirection.col === lastDirection.col;
  if (!isReverse && !isDuplicate && queue.length < 3) queue.push(nextDirection);
}

function handleDirectionInput(nextDirection) {
  if (snakeState.over) resetSnake(snakeState.seed);
  setDirection(nextDirection);
  startSnake();
}

function playEatSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  snakeAudio ??= new AudioContext();
  if (snakeAudio.state === "suspended") snakeAudio.resume();
  const now = snakeAudio.currentTime;
  const oscillator = snakeAudio.createOscillator();
  const gain = snakeAudio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(360, now);
  oscillator.frequency.exponentialRampToValueAtTime(760, now + 0.08);
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  oscillator.connect(gain);
  gain.connect(snakeAudio.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function drawSnake() {
  if (!snakeState) return;
  drawBoard();
  drawWalls();
  drawFood();
  drawSnakeBody();
  if (snakeState.over) drawGameOver();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#dff2e9";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(32, 36, 44, 0.07)";
  ctx.lineWidth = 1;
  for (let col = 1; col < cols; col += 1) {
    ctx.beginPath();
    ctx.moveTo(col * cellWidth, 0);
    ctx.lineTo(col * cellWidth, canvas.height);
    ctx.stroke();
  }
  for (let row = 1; row < rows; row += 1) {
    ctx.beginPath();
    ctx.moveTo(0, row * cellHeight);
    ctx.lineTo(canvas.width, row * cellHeight);
    ctx.stroke();
  }

  ctx.fillStyle = "#252a34";
  for (let col = 0; col < cols; col += 1) {
    fillCell({ row: 0, col }, 0);
    fillCell({ row: rows - 1, col }, 0);
  }
  for (let row = 0; row < rows; row += 1) {
    fillCell({ row, col: 0 }, 0);
    fillCell({ row, col: cols - 1 }, 0);
  }
}

function drawWalls() {
  ctx.fillStyle = "#3f4a5a";
  snakeState.walls.forEach((key) => {
    const [row, col] = key.split(",").map(Number);
    fillCell({ row, col }, 3);
  });
}

function drawFood() {
  const { food } = snakeState;
  const x = food.col * cellWidth + cellWidth / 2;
  const y = food.row * cellHeight + cellHeight / 2;
  ctx.fillStyle = "#d95e4f";
  ctx.beginPath();
  ctx.arc(x, y, Math.min(cellWidth, cellHeight) * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(x - 3, y - 4, Math.min(cellWidth, cellHeight) * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawSnakeBody() {
  snakeState.snake.forEach((segment, index) => {
    ctx.fillStyle = index === 0 ? "#126653" : "#1c8f78";
    fillCell(segment, index === 0 ? 4 : 5);
  });

  const head = snakeState.snake[0];
  const centerX = head.col * cellWidth + cellWidth / 2;
  const centerY = head.row * cellHeight + cellHeight / 2;
  ctx.fillStyle = "#ffffff";
  const eyeOffsetX = snakeState.direction.col * 4;
  const eyeOffsetY = snakeState.direction.row * 4;
  ctx.beginPath();
  ctx.arc(centerX - 4 + eyeOffsetX, centerY - 4 + eyeOffsetY, 2.2, 0, Math.PI * 2);
  ctx.arc(centerX + 4 + eyeOffsetX, centerY - 4 + eyeOffsetY, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawGameOver() {
  ctx.fillStyle = "rgba(32, 36, 44, 0.58)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 44px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 18);
  ctx.font = "800 22px system-ui, sans-serif";
  ctx.fillText(`Score ${snakeState.score}`, canvas.width / 2, canvas.height / 2 + 28);
}

function fillCell(cell, inset) {
  ctx.fillRect(
    cell.col * cellWidth + inset,
    cell.row * cellHeight + inset,
    cellWidth - inset * 2,
    cellHeight - inset * 2,
  );
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

function preventGameGesture(event) {
  event.preventDefault();
}

bindImmediateButton("newSnake", () => resetSnake());
document.querySelectorAll("[data-direction]").forEach((button) => {
  const direction = directions[button.dataset.direction];
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handleDirectionInput(direction);
  });
  button.addEventListener("click", () => {
    handleDirectionInput(direction);
  });
});
canvas.addEventListener("pointerdown", (event) => {
  preventGameGesture(event);
  startSnake();
});
canvas.addEventListener("pointermove", preventGameGesture);
canvas.addEventListener("touchstart", preventGameGesture, { passive: false });
canvas.addEventListener("touchmove", preventGameGesture, { passive: false });
canvas.addEventListener("contextmenu", preventGameGesture);
window.addEventListener("keydown", (event) => {
  const keyDirections = {
    ArrowUp: directions.up,
    KeyW: directions.up,
    ArrowDown: directions.down,
    KeyS: directions.down,
    ArrowLeft: directions.left,
    KeyA: directions.left,
    ArrowRight: directions.right,
    KeyD: directions.right,
  };
  if (keyDirections[event.code]) {
    event.preventDefault();
    handleDirectionInput(keyDirections[event.code]);
  } else if (event.code === "Space") {
    event.preventDefault();
    startSnake();
  }
});
window.addEventListener("pagehide", pauseSnake);
resetSnake();
