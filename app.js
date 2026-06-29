const panels = {
  mines: document.getElementById("mines-panel"),
  sudoku: document.getElementById("sudoku-panel"),
  flappy: document.getElementById("flappy-panel"),
};

const gameNames = {
  mines: "Minesweeper",
  sudoku: "Sudoku",
  flappy: "Flappy Bird Style",
};

const gameMenu = document.getElementById("gameMenu");
const gameStage = document.getElementById("gameStage");
const stageTitle = document.getElementById("stageTitle");
const fullscreenButton = document.getElementById("fullscreenGame");
let activeGame = null;

function openGame(game) {
  pauseActiveGame();
  activeGame = game;
  gameMenu.hidden = true;
  gameStage.hidden = false;
  stageTitle.textContent = gameNames[game];
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("active", key === game);
  });
  resumeActiveGame();
}

function showGameMenu() {
  pauseActiveGame();
  activeGame = null;
  Object.values(panels).forEach((panel) => panel.classList.remove("active"));
  gameStage.hidden = true;
  gameMenu.hidden = false;
  exitFullscreenMode();
}

function pauseActiveGame() {
  pauseMineTimer();
  pauseSudokuTimer();
  pauseFlappy();
}

function resumeActiveGame() {
  if (activeGame === "mines") resumeMineTimer();
  if (activeGame === "sudoku") resumeSudokuTimer();
  if (activeGame === "flappy") drawFlappy();
}

function toggleFullscreenMode() {
  const nextState = !document.body.classList.contains("fullscreen-mode");
  document.body.classList.toggle("fullscreen-mode", nextState);
  fullscreenButton.textContent = nextState ? "Exit Fullscreen" : "Fullscreen";
  if (nextState && gameStage.requestFullscreen) {
    gameStage.requestFullscreen().catch(() => {});
  } else if (!nextState && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  if (activeGame === "flappy") requestAnimationFrame(drawFlappy);
}

function exitFullscreenMode() {
  document.body.classList.remove("fullscreen-mode");
  fullscreenButton.textContent = "Fullscreen";
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.querySelectorAll("[data-open-game]").forEach((button) => {
  button.addEventListener("click", () => openGame(button.dataset.openGame));
});
document.getElementById("backToMenu").addEventListener("click", showGameMenu);
fullscreenButton.addEventListener("click", toggleFullscreenMode);
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove("fullscreen-mode");
    fullscreenButton.textContent = "Fullscreen";
  }
});

const minePresets = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 22 },
  hard: { rows: 16, cols: 16, mines: 45 },
};

const mineBoardEl = document.getElementById("mineBoard");
const mineDifficulty = document.getElementById("mineDifficulty");
const mineCountEl = document.getElementById("mineCount");
const flagCountEl = document.getElementById("flagCount");
const mineTimerEl = document.getElementById("mineTimer");
const mineMessage = document.getElementById("mineMessage");
let mineMode = "reveal";
let mineState;

function newMineGame() {
  pauseMineTimer();
  const preset = minePresets[mineDifficulty.value];
  mineState = {
    ...preset,
    generated: false,
    finished: false,
    flags: 0,
    revealed: 0,
    seconds: 0,
    timer: null,
    cells: Array.from({ length: preset.rows * preset.cols }, (_, index) => ({
      index,
      mine: false,
      revealed: false,
      flagged: false,
      count: 0,
    })),
  };
  mineCountEl.textContent = preset.mines;
  flagCountEl.textContent = "0";
  mineTimerEl.textContent = "0";
  mineMessage.textContent = "Pick a tile. First move is safe.";
  renderMineBoard();
}

function renderMineBoard() {
  mineBoardEl.innerHTML = "";
  mineBoardEl.style.setProperty("--mine-cols", mineState.cols);
  mineBoardEl.style.setProperty("--mine-rows", mineState.rows);
  mineBoardEl.style.setProperty("--mine-board-min", `${mineState.cols * 34 + (mineState.cols - 1) * 3}px`);
  mineBoardEl.style.gridTemplateColumns = `repeat(${mineState.cols}, 1fr)`;
  mineBoardEl.style.gridTemplateRows = `repeat(${mineState.rows}, 1fr)`;
  mineState.cells.forEach((cell) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mine-cell";
    button.dataset.index = cell.index;
    if (cell.revealed) {
      button.classList.add("revealed");
      if (cell.mine) {
        button.textContent = "*";
        button.classList.add("mine-hit");
      } else if (cell.count) {
        button.textContent = cell.count;
        button.classList.add(`number-${cell.count}`);
      }
    } else if (cell.flagged) {
      button.textContent = "!";
      button.classList.add("flagged");
    }
    button.addEventListener("click", () => handleMineClick(cell.index));
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      toggleMineFlag(cell.index);
    });
    mineBoardEl.appendChild(button);
  });
}

function handleMineClick(index) {
  if (mineState.finished) return;
  if (mineMode === "flag") {
    toggleMineFlag(index);
    return;
  }
  const cell = mineState.cells[index];
  if (cell.flagged || cell.revealed) return;
  if (!mineState.generated) {
    generateMines(index);
    startMineTimer();
  }
  revealMineCell(index);
  renderMineBoard();
  checkMineWin();
}

function toggleMineFlag(index) {
  if (mineState.finished) return;
  const cell = mineState.cells[index];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  mineState.flags += cell.flagged ? 1 : -1;
  flagCountEl.textContent = mineState.flags;
  renderMineBoard();
}

function generateMines(firstIndex) {
  const protectedCells = new Set([firstIndex, ...mineNeighbors(firstIndex)]);
  const candidates = mineState.cells
    .map((cell) => cell.index)
    .filter((index) => !protectedCells.has(index));
  shuffle(candidates);
  candidates.slice(0, mineState.mines).forEach((index) => {
    mineState.cells[index].mine = true;
  });
  mineState.cells.forEach((cell) => {
    cell.count = mineNeighbors(cell.index).filter((idx) => mineState.cells[idx].mine).length;
  });
  mineState.generated = true;
}

function mineNeighbors(index) {
  const row = Math.floor(index / mineState.cols);
  const col = index % mineState.cols;
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (
        nextRow >= 0 &&
        nextRow < mineState.rows &&
        nextCol >= 0 &&
        nextCol < mineState.cols
      ) {
        neighbors.push(nextRow * mineState.cols + nextCol);
      }
    }
  }
  return neighbors;
}

function revealMineCell(index) {
  const cell = mineState.cells[index];
  if (cell.revealed || cell.flagged) return;
  cell.revealed = true;
  mineState.revealed += 1;
  if (cell.mine) {
    finishMineGame(false);
    return;
  }
  if (cell.count === 0) {
    mineNeighbors(index).forEach(revealMineCell);
  }
}

function checkMineWin() {
  const safeCells = mineState.rows * mineState.cols - mineState.mines;
  if (!mineState.finished && mineState.revealed === safeCells) {
    finishMineGame(true);
  }
}

function finishMineGame(won) {
  mineState.finished = true;
  pauseMineTimer();
  if (!won) {
    mineState.cells.forEach((cell) => {
      if (cell.mine) cell.revealed = true;
    });
  }
  mineMessage.textContent = won
    ? `Cleared in ${mineState.seconds} seconds. Nicely done.`
    : "Boom. Start a new game and take revenge.";
  renderMineBoard();
}

function startMineTimer() {
  if (activeGame !== "mines") return;
  pauseMineTimer();
  mineState.timer = setInterval(() => {
    mineState.seconds += 1;
    mineTimerEl.textContent = mineState.seconds;
  }, 1000);
}

function pauseMineTimer() {
  if (mineState?.timer) {
    clearInterval(mineState.timer);
    mineState.timer = null;
  }
}

function resumeMineTimer() {
  if (mineState?.generated && !mineState.finished && !mineState.timer) {
    startMineTimer();
  }
}

document.getElementById("newMineGame").addEventListener("click", newMineGame);
mineDifficulty.addEventListener("change", newMineGame);
document.querySelectorAll("[data-mine-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    mineMode = button.dataset.mineMode;
    document.querySelectorAll("[data-mine-mode]").forEach((modeButton) => {
      modeButton.classList.toggle("active", modeButton === button);
    });
  });
});

const sudokuPuzzleBank = {
  easy: [
    {
      puzzle: "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
      solution: "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
    },
  ],
  medium: [
    {
      puzzle: "000260701680070090190004500820100040004602900050003028009300074040050036703018000",
      solution: "435269781682571493197834562826195347374682915951743628519326874248957136763418259",
    },
    {
      puzzle: "200080300060070084030500209000105408000000000402706000301007040720040060004010003",
      solution: "245981376169273584837564219976125438513498627482736951391657842728349165654812793",
    },
  ],
  hard: [
    {
      puzzle: "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
      solution: "462831957795426183381795426173984265659312748248567319926178534834259671517643892",
    },
  ],
};

const sudokuBoardEl = document.getElementById("sudokuBoard");
const numberPad = document.getElementById("numberPad");
const sudokuDifficulty = document.getElementById("sudokuDifficulty");
const sudokuMessage = document.getElementById("sudokuMessage");
const sudokuTimerEl = document.getElementById("sudokuTimer");
let sudokuState;

function newSudoku() {
  pauseSudokuTimer();
  const list = sudokuPuzzleBank[sudokuDifficulty.value];
  const puzzle = list[Math.floor(Math.random() * list.length)];
  sudokuState = {
    puzzle: puzzle.puzzle,
    solution: puzzle.solution,
    values: puzzle.puzzle.split(""),
    selected: null,
    seconds: 0,
    started: false,
    finished: false,
    timer: null,
  };
  sudokuTimerEl.textContent = "0";
  sudokuMessage.textContent = "Select a blank cell, then choose a number.";
  renderSudoku();
}

function renderSudoku() {
  sudokuBoardEl.innerHTML = "";
  sudokuState.values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sudoku-cell";
    button.textContent = value === "0" ? "" : value;
    if (sudokuState.puzzle[index] !== "0") button.classList.add("given");
    if (sudokuState.selected === index) button.classList.add("selected");
    if (
      sudokuState.selected !== null &&
      value !== "0" &&
      value === sudokuState.values[sudokuState.selected]
    ) {
      button.classList.add("match");
    }
    if (value !== "0" && value !== sudokuState.solution[index]) button.classList.add("error");
    button.addEventListener("click", () => {
      sudokuState.selected = index;
      renderSudoku();
    });
    sudokuBoardEl.appendChild(button);
  });
}

function setSudokuValue(value) {
  const selected = sudokuState.selected;
  if (selected === null) {
    sudokuMessage.textContent = "Choose a blank cell first.";
    return;
  }
  if (sudokuState.puzzle[selected] !== "0") {
    sudokuMessage.textContent = "That number is part of the puzzle.";
    return;
  }
  if (!sudokuState.started && value !== "0") {
    startSudokuTimer();
  }
  sudokuState.values[selected] = value;
  renderSudoku();
  if (sudokuState.values.join("") === sudokuState.solution) {
    finishSudokuTimer();
    sudokuMessage.textContent = "Solved. That grid is singing.";
  } else if (value !== "0" && value !== sudokuState.solution[selected]) {
    sudokuMessage.textContent = "That one does not fit here.";
  } else {
    sudokuMessage.textContent = "Good placement.";
  }
}

function buildNumberPad() {
  numberPad.innerHTML = "";
  for (let value = 1; value <= 9; value += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = value;
    button.addEventListener("click", () => setSudokuValue(String(value)));
    numberPad.appendChild(button);
  }
}

function checkSudoku() {
  const filled = sudokuState.values.every((value) => value !== "0");
  const wrong = sudokuState.values.some(
    (value, index) => value !== "0" && value !== sudokuState.solution[index],
  );
  if (wrong) {
    sudokuMessage.textContent = "Some entries are not correct yet.";
  } else if (filled) {
    finishSudokuTimer();
    sudokuMessage.textContent = "Solved cleanly. Excellent.";
  } else {
    sudokuMessage.textContent = "Everything entered so far is valid.";
  }
  renderSudoku();
}

document.getElementById("newSudoku").addEventListener("click", newSudoku);
sudokuDifficulty.addEventListener("change", newSudoku);
document.getElementById("eraseSudoku").addEventListener("click", () => setSudokuValue("0"));
document.getElementById("checkSudoku").addEventListener("click", checkSudoku);
document.getElementById("solveSudoku").addEventListener("click", () => {
  sudokuState.values = sudokuState.solution.split("");
  finishSudokuTimer();
  sudokuMessage.textContent = "Solved puzzle shown.";
  renderSudoku();
});

function startSudokuTimer() {
  if (activeGame !== "sudoku" || sudokuState.finished) return;
  sudokuState.started = true;
  pauseSudokuTimer();
  sudokuState.timer = setInterval(() => {
    sudokuState.seconds += 1;
    sudokuTimerEl.textContent = sudokuState.seconds;
  }, 1000);
}

function pauseSudokuTimer() {
  if (sudokuState?.timer) {
    clearInterval(sudokuState.timer);
    sudokuState.timer = null;
  }
}

function resumeSudokuTimer() {
  if (sudokuState?.started && !sudokuState.finished && !sudokuState.timer) {
    startSudokuTimer();
  }
}

function finishSudokuTimer() {
  if (!sudokuState) return;
  sudokuState.finished = true;
  pauseSudokuTimer();
}

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
  flappyMessage.textContent = "Press Start, Space, or tap the game to flap.";
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
canvas.addEventListener("pointerdown", startFlappy);
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && activeGame) {
    showGameMenu();
  }
  if (event.code === "Space" && activeGame === "flappy") {
    event.preventDefault();
    startFlappy();
  }
  if (/^[1-9]$/.test(event.key) && activeGame === "sudoku") {
    setSudokuValue(event.key);
  }
  if ((event.key === "Backspace" || event.key === "Delete") && activeGame === "sudoku") {
    setSudokuValue("0");
  }
});

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

buildNumberPad();
newMineGame();
newSudoku();
resetFlappy();
