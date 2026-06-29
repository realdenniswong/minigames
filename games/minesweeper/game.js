const minePresets = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 22 },
  hard: { rows: 16, cols: 16, mines: 45 },
};

const mineBoardEl = document.getElementById("mineBoard");
const mineBoardWrapEl = mineBoardEl.parentElement;
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
}

function startMineTimer() {
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

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
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
window.addEventListener("pagehide", pauseMineTimer);
newMineGame();
