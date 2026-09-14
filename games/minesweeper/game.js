const minePresets = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 22 },
  hard: { rows: 16, cols: 16, mines: 45 },
};

const MINE_SAVE_KEY = "offlineMiniGames.minesweeper.save.v1";

const mineBoardEl = document.getElementById("mineBoard");
const mineBoardWrapEl = mineBoardEl.parentElement;
const mineDifficulty = document.getElementById("mineDifficulty");
const mineCountEl = document.getElementById("mineCount");
const flagCountEl = document.getElementById("flagCount");
const mineTimerEl = document.getElementById("mineTimer");
const mineMessage = document.getElementById("mineMessage");
const loadMineGameButton = document.getElementById("loadMineGame");
let mineMode = "reveal";
let mineState;

function readMineSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(MINE_SAVE_KEY));
    if (isValidMineSave(saved)) return saved;
    localStorage.removeItem(MINE_SAVE_KEY);
  } catch (error) {
    try {
      localStorage.removeItem(MINE_SAVE_KEY);
    } catch (storageError) {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }
  return null;
}

function isValidMineSave(saved) {
  if (
    !saved ||
    saved.version !== 1 ||
    !Object.prototype.hasOwnProperty.call(minePresets, saved.difficulty) ||
    !["reveal", "flag"].includes(saved.mode) ||
    saved.generated !== Boolean(saved.generated) ||
    saved.started !== true ||
    saved.finished !== false ||
    !Number.isInteger(saved.seconds) ||
    saved.seconds < 0 ||
    !Array.isArray(saved.cells)
  ) {
    return false;
  }
  const preset = minePresets[saved.difficulty];
  if (
    saved.rows !== preset.rows ||
    saved.cols !== preset.cols ||
    saved.mines !== preset.mines ||
    saved.cells.length !== preset.rows * preset.cols
  ) {
    return false;
  }
  const validCells = saved.cells.every(
    (cell, index) =>
      cell &&
      cell.index === index &&
      typeof cell.mine === "boolean" &&
      typeof cell.revealed === "boolean" &&
      typeof cell.flagged === "boolean" &&
      Number.isInteger(cell.count) &&
      cell.count >= 0 &&
      cell.count <= 8 &&
      !(cell.revealed && cell.flagged) &&
      !(cell.revealed && cell.mine)
  );
  if (!validCells) return false;
  const mineTotal = saved.cells.filter((cell) => cell.mine).length;
  const flagTotal = saved.cells.filter((cell) => cell.flagged).length;
  const revealedTotal = saved.cells.filter((cell) => cell.revealed).length;
  return (
    mineTotal === (saved.generated ? preset.mines : 0) &&
    saved.flags === flagTotal &&
    saved.revealed === revealedTotal
  );
}

function saveMineState() {
  if (!mineState?.started) return;
  if (mineState.finished) {
    clearMineSave();
    return;
  }
  const saved = {
    version: 1,
    difficulty: mineDifficulty.value,
    mode: mineMode,
    rows: mineState.rows,
    cols: mineState.cols,
    mines: mineState.mines,
    generated: mineState.generated,
    started: true,
    finished: false,
    flags: mineState.flags,
    revealed: mineState.revealed,
    seconds: mineState.seconds,
    cells: mineState.cells.map((cell) => ({ ...cell })),
  };
  try {
    localStorage.setItem(MINE_SAVE_KEY, JSON.stringify(saved));
    loadMineGameButton.disabled = false;
  } catch (error) {
    // The game remains playable when local storage is unavailable.
  }
}

function clearMineSave() {
  try {
    localStorage.removeItem(MINE_SAVE_KEY);
  } catch (error) {
    // The game remains playable when local storage is unavailable.
  }
  loadMineGameButton.disabled = true;
}

function updateMineLoadButton() {
  loadMineGameButton.disabled = !readMineSave();
}

function loadMineGame() {
  const saved = readMineSave();
  if (!saved) {
    updateMineLoadButton();
    mineMessage.textContent = "There is no saved game to load yet.";
    return;
  }
  pauseMineTimer();
  mineDifficulty.value = saved.difficulty;
  mineMode = saved.mode;
  mineState = {
    rows: saved.rows,
    cols: saved.cols,
    mines: saved.mines,
    generated: saved.generated,
    started: true,
    finished: false,
    flags: saved.flags,
    revealed: saved.revealed,
    seconds: saved.seconds,
    timer: null,
    cells: saved.cells.map((cell) => ({ ...cell })),
  };
  mineCountEl.textContent = mineState.mines;
  flagCountEl.textContent = mineState.flags;
  mineTimerEl.textContent = mineState.seconds;
  document.querySelectorAll("[data-mine-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.mineMode === mineMode);
  });
  mineMessage.textContent = mineState.generated
    ? "Progress loaded. Continue where you left off."
    : "Progress loaded. Pick a tile. First move is safe.";
  renderMineBoard();
  startMineTimer();
}

function newMineGame(startNow = false) {
  pauseMineTimer();
  const preset = minePresets[mineDifficulty.value];
  mineState = {
    ...preset,
    generated: false,
    started: false,
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
  mineMessage.textContent = startNow
    ? "Timer started. Pick a tile. First move is safe."
    : "Press Start to begin the timer.";
  renderMineBoard();
  if (startNow) startMineTimer();
}

function renderMineBoard() {
  mineBoardEl.innerHTML = "";
  const cellSize = 34;
  const gapSize = 3;
  const boardWidth = mineState.cols * cellSize + (mineState.cols - 1) * gapSize;
  const boardHeight = mineState.rows * cellSize + (mineState.rows - 1) * gapSize;
  mineBoardWrapEl.style.setProperty("--mine-board-width", `${boardWidth}px`);
  mineBoardWrapEl.style.setProperty("--mine-board-height", `${boardHeight}px`);
  mineBoardEl.style.setProperty("--mine-board-width", `${boardWidth}px`);
  mineBoardEl.style.setProperty("--mine-board-height", `${boardHeight}px`);
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
  if (!mineState.started) {
    mineMessage.textContent = "Press Start before revealing tiles.";
    return;
  }
  if (mineMode === "flag") {
    toggleMineFlag(index);
    return;
  }
  const cell = mineState.cells[index];
  if (cell.flagged || cell.revealed) return;
  if (!mineState.generated) {
    generateMines(index);
  }
  revealMineCell(index);
  renderMineBoard();
  checkMineWin();
  saveMineState();
}

function toggleMineFlag(index) {
  if (mineState.finished) return;
  if (!mineState.started) {
    mineMessage.textContent = "Press Start before placing flags.";
    return;
  }
  const cell = mineState.cells[index];
  if (cell.revealed) return;
  cell.flagged = !cell.flagged;
  mineState.flags += cell.flagged ? 1 : -1;
  flagCountEl.textContent = mineState.flags;
  renderMineBoard();
  saveMineState();
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
      if (nextRow >= 0 && nextRow < mineState.rows && nextCol >= 0 && nextCol < mineState.cols) {
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
  if (cell.count === 0) mineNeighbors(index).forEach(revealMineCell);
}

function checkMineWin() {
  const safeCells = mineState.rows * mineState.cols - mineState.mines;
  if (!mineState.finished && mineState.revealed === safeCells) finishMineGame(true);
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
  clearMineSave();
}

function startMineTimer() {
  if (mineState.finished) return;
  mineState.started = true;
  pauseMineTimer();
  mineState.timer = setInterval(() => {
    mineState.seconds += 1;
    mineTimerEl.textContent = mineState.seconds;
    if (mineState.seconds % 5 === 0) saveMineState();
  }, 1000);
  saveMineState();
}

function pauseMineTimer() {
  if (mineState?.timer) {
    clearInterval(mineState.timer);
    mineState.timer = null;
  }
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

document.getElementById("newMineGame").addEventListener("click", () => newMineGame(true));
loadMineGameButton.addEventListener("click", loadMineGame);
mineDifficulty.addEventListener("change", () => newMineGame(false));
document.querySelectorAll("[data-mine-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    mineMode = button.dataset.mineMode;
    document.querySelectorAll("[data-mine-mode]").forEach((modeButton) => {
      modeButton.classList.toggle("active", modeButton === button);
    });
    saveMineState();
  });
});
window.addEventListener("pagehide", () => {
  saveMineState();
  pauseMineTimer();
});
window.addEventListener("pageshow", () => {
  if (mineState.started && !mineState.finished && !mineState.timer) startMineTimer();
});
newMineGame();
updateMineLoadButton();
if (!loadMineGameButton.disabled) {
  mineMessage.textContent = "Saved progress is available. Press Load to continue.";
}
