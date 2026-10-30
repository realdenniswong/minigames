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

const SUDOKU_SAVE_KEY = "offlineMiniGames.sudoku.save.v1";
const SUDOKU_HISTORY_LIMIT = 100;

const sudokuBoardEl = document.getElementById("sudokuBoard");
const numberPad = document.getElementById("numberPad");
const sudokuDifficulty = document.getElementById("sudokuDifficulty");
const sudokuMessage = document.getElementById("sudokuMessage");
const sudokuTimerEl = document.getElementById("sudokuTimer");
const noteSudokuButton = document.getElementById("noteSudoku");
const loadSudokuButton = document.getElementById("loadSudoku");
const undoSudokuButton = document.getElementById("undoSudoku");
const redoSudokuButton = document.getElementById("redoSudoku");
let sudokuState;

function readSudokuSave() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUDOKU_SAVE_KEY));
    if (isValidSudokuSave(saved)) return saved;
    localStorage.removeItem(SUDOKU_SAVE_KEY);
  } catch (error) {
    try {
      localStorage.removeItem(SUDOKU_SAVE_KEY);
    } catch (storageError) {
      // Storage may be unavailable in privacy-restricted browsers.
    }
  }
  return null;
}

function isValidSudokuSave(saved) {
  const isGrid = (value, pattern) => typeof value === "string" && pattern.test(value);
  return Boolean(
    saved &&
      saved.version === 1 &&
      Object.prototype.hasOwnProperty.call(sudokuPuzzleBank, saved.difficulty) &&
      isGrid(saved.puzzle, /^[0-9]{81}$/) &&
      isGrid(saved.solution, /^[1-9]{81}$/) &&
      isValidSudokuSnapshot(saved, saved.puzzle) &&
      Number.isInteger(saved.seconds) &&
      saved.seconds >= 0 &&
      saved.started === true &&
      saved.finished === false
  );
}

function isValidSudokuSnapshot(snapshot, puzzle) {
  return Boolean(
    snapshot &&
      Array.isArray(snapshot.values) &&
      snapshot.values.length === 81 &&
      snapshot.values.every((value) => typeof value === "string" && /^[0-9]$/.test(value)) &&
      snapshot.values.every((value, index) => puzzle[index] === "0" || value === puzzle[index]) &&
      Array.isArray(snapshot.notes) &&
      snapshot.notes.length === 81 &&
      snapshot.notes.every(
        (notes) =>
          Array.isArray(notes) &&
          notes.every((value) => typeof value === "string" && /^[1-9]$/.test(value))
      ) &&
      (snapshot.selected === null ||
        (Number.isInteger(snapshot.selected) && snapshot.selected >= 0 && snapshot.selected < 81)) &&
      typeof snapshot.noteMode === "boolean"
  );
}

function readSudokuHistory(history, puzzle) {
  if (
    !Array.isArray(history) ||
    history.length > SUDOKU_HISTORY_LIMIT ||
    !history.every((snapshot) => isValidSudokuSnapshot(snapshot, puzzle))
  ) {
    return [];
  }
  return history;
}

function saveSudokuState() {
  if (!sudokuState?.started) return;
  if (sudokuState.finished) {
    clearSudokuSave();
    return;
  }
  const saved = {
    version: 1,
    difficulty: sudokuDifficulty.value,
    puzzle: sudokuState.puzzle,
    solution: sudokuState.solution,
    values: sudokuState.values,
    notes: sudokuState.notes.map((notes) => [...notes]),
    selected: sudokuState.selected,
    noteMode: sudokuState.noteMode,
    undoStack: sudokuState.undoStack,
    redoStack: sudokuState.redoStack,
    seconds: sudokuState.seconds,
    started: true,
    finished: false,
  };
  try {
    localStorage.setItem(SUDOKU_SAVE_KEY, JSON.stringify(saved));
    loadSudokuButton.disabled = false;
  } catch (error) {
    // The game remains playable when local storage is unavailable.
  }
}

function clearSudokuSave() {
  try {
    localStorage.removeItem(SUDOKU_SAVE_KEY);
  } catch (error) {
    // The game remains playable when local storage is unavailable.
  }
  loadSudokuButton.disabled = true;
}

function updateSudokuLoadButton() {
  loadSudokuButton.disabled = !readSudokuSave();
}

function loadSudoku() {
  const saved = readSudokuSave();
  if (!saved) {
    updateSudokuLoadButton();
    sudokuMessage.textContent = "There is no saved puzzle to load yet.";
    return;
  }
  pauseSudokuTimer();
  sudokuDifficulty.value = saved.difficulty;
  sudokuState = {
    puzzle: saved.puzzle,
    solution: saved.solution,
    values: [...saved.values],
    notes: saved.notes.map((notes) => new Set(notes)),
    selected: saved.selected,
    noteMode: saved.noteMode,
    undoStack: readSudokuHistory(saved.undoStack, saved.puzzle),
    redoStack: readSudokuHistory(saved.redoStack, saved.puzzle),
    seconds: saved.seconds,
    started: true,
    finished: false,
    timer: null,
  };
  sudokuTimerEl.textContent = sudokuState.seconds;
  noteSudokuButton.classList.toggle("active", sudokuState.noteMode);
  noteSudokuButton.setAttribute("aria-pressed", String(sudokuState.noteMode));
  sudokuMessage.textContent = "Progress loaded. Continue where you left off.";
  renderSudoku();
  startSudokuTimer();
}

function newSudoku(startNow = false) {
  pauseSudokuTimer();
  const puzzle = startNow
    ? sudokuPuzzleBank[sudokuDifficulty.value][
        Math.floor(Math.random() * sudokuPuzzleBank[sudokuDifficulty.value].length)
      ]
    : {
        puzzle: "0".repeat(81),
        solution: "0".repeat(81),
      };
  sudokuState = {
    puzzle: puzzle.puzzle,
    solution: puzzle.solution,
    values: puzzle.puzzle.split(""),
    notes: Array.from({ length: 81 }, () => new Set()),
    selected: null,
    noteMode: false,
    undoStack: [],
    redoStack: [],
    seconds: 0,
    started: false,
    finished: false,
    timer: null,
  };
  sudokuTimerEl.textContent = "0";
  noteSudokuButton.classList.remove("active");
  noteSudokuButton.setAttribute("aria-pressed", "false");
  sudokuMessage.textContent = startNow
    ? "Timer started. Select a blank cell, then choose a number."
    : "Press Start to generate a puzzle.";
  renderSudoku();
  if (startNow) startSudokuTimer();
}

function renderSudoku() {
  sudokuBoardEl.innerHTML = "";
  sudokuState.values.forEach((value, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sudoku-cell";
    if (value === "0") {
      renderSudokuNotes(button, index);
    } else {
      button.textContent = value;
    }
    if (sudokuState.puzzle[index] !== "0") button.classList.add("given");
    if (sudokuState.selected === index) {
      button.classList.add("selected");
    } else if (isSudokuAxisMatch(index)) {
      button.classList.add("axis");
    }
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
      saveSudokuState();
    });
    sudokuBoardEl.appendChild(button);
  });
  updateSudokuNumberPad();
  undoSudokuButton.disabled = !sudokuState.undoStack.length;
  redoSudokuButton.disabled = !sudokuState.redoStack.length;
}

function isSudokuAxisMatch(index) {
  if (sudokuState.selected === null) return false;
  const selectedRow = Math.floor(sudokuState.selected / 9);
  const selectedCol = sudokuState.selected % 9;
  const row = Math.floor(index / 9);
  const col = index % 9;
  return row === selectedRow || col === selectedCol;
}

function renderSudokuNotes(cell, index) {
  const notes = sudokuState.notes[index];
  if (!notes.size) return;
  const noteGrid = document.createElement("span");
  noteGrid.className = "sudoku-notes";
  for (let value = 1; value <= 9; value += 1) {
    const note = document.createElement("span");
    note.textContent = notes.has(String(value)) ? String(value) : "";
    noteGrid.appendChild(note);
  }
  cell.appendChild(noteGrid);
}

function setSudokuValue(value) {
  if (!sudokuState.started) {
    sudokuMessage.textContent = "Press Start before placing numbers.";
    return;
  }
  const selected = sudokuState.selected;
  if (selected === null) {
    sudokuMessage.textContent = "Choose a blank cell first.";
    return;
  }
  if (sudokuState.puzzle[selected] !== "0") {
    sudokuMessage.textContent = "That number is part of the puzzle.";
    return;
  }
  if (value !== "0" && isSudokuNumberComplete(value)) {
    sudokuMessage.textContent = `${value} is already in every 3×3 box. Erase one to use it again.`;
    return;
  }
  if (sudokuState.noteMode && value !== "0") {
    toggleSudokuNote(value);
    return;
  }
  const previous = captureSudokuSnapshot();
  sudokuState.values[selected] = value;
  sudokuState.notes[selected].clear();
  if (value !== "0") removeSudokuPeerNotes(selected, value);
  recordSudokuEdit(previous);
  renderSudoku();
  if (updateSudokuCompletion()) {
    sudokuMessage.textContent = "Solved. That grid is singing.";
  } else if (value !== "0" && value !== sudokuState.solution[selected]) {
    sudokuMessage.textContent = "That one does not fit here.";
  } else {
    sudokuMessage.textContent = "Good placement.";
  }
  saveSudokuState();
}

function removeSudokuPeerNotes(index, value) {
  const row = Math.floor(index / 9);
  const col = index % 9;
  sudokuState.notes.forEach((notes, peerIndex) => {
    const peerRow = Math.floor(peerIndex / 9);
    const peerCol = peerIndex % 9;
    const sameBox =
      Math.floor(peerRow / 3) === Math.floor(row / 3) &&
      Math.floor(peerCol / 3) === Math.floor(col / 3);
    if (peerRow === row || peerCol === col || sameBox) notes.delete(value);
  });
}

function toggleSudokuNote(value) {
  if (!sudokuState.started) {
    sudokuMessage.textContent = "Press Start before adding notes.";
    return;
  }
  const selected = sudokuState.selected;
  if (sudokuState.values[selected] !== "0") {
    sudokuMessage.textContent = "Erase the cell before adding notes.";
    return;
  }
  const notes = sudokuState.notes[selected];
  const previous = captureSudokuSnapshot();
  if (notes.has(value)) {
    notes.delete(value);
    sudokuMessage.textContent = `Removed ${value} from notes.`;
  } else {
    notes.add(value);
    sudokuMessage.textContent = `Added ${value} to notes.`;
  }
  recordSudokuEdit(previous);
  renderSudoku();
  saveSudokuState();
}

function toggleSudokuNoteMode() {
  sudokuState.noteMode = !sudokuState.noteMode;
  noteSudokuButton.classList.toggle("active", sudokuState.noteMode);
  noteSudokuButton.setAttribute("aria-pressed", String(sudokuState.noteMode));
  sudokuMessage.textContent = sudokuState.noteMode
    ? "Notes on. Add possible numbers inside a cell."
    : "Notes off. Numbers will fill the cell.";
  saveSudokuState();
}

function eraseSudokuCell() {
  if (!sudokuState.started) {
    sudokuMessage.textContent = "Press Start before editing the puzzle.";
    return;
  }
  const selected = sudokuState.selected;
  if (selected === null) {
    sudokuMessage.textContent = "Choose a blank cell first.";
    return;
  }
  if (sudokuState.puzzle[selected] !== "0") {
    sudokuMessage.textContent = "That number is part of the puzzle.";
    return;
  }
  const previous = captureSudokuSnapshot();
  sudokuState.values[selected] = "0";
  sudokuState.notes[selected].clear();
  recordSudokuEdit(previous);
  updateSudokuCompletion();
  sudokuMessage.textContent = "Cell cleared.";
  renderSudoku();
  saveSudokuState();
}

function captureSudokuSnapshot() {
  return {
    values: [...sudokuState.values],
    notes: sudokuState.notes.map((notes) => [...notes]),
    selected: sudokuState.selected,
    noteMode: sudokuState.noteMode,
  };
}

function recordSudokuEdit(previous) {
  const changed =
    previous.values.some((value, index) => value !== sudokuState.values[index]) ||
    previous.notes.some((notes, index) =>
      notes.length !== sudokuState.notes[index].size ||
      notes.some((value) => !sudokuState.notes[index].has(value))
    );
  if (!changed) return;
  sudokuState.undoStack.push(previous);
  if (sudokuState.undoStack.length > SUDOKU_HISTORY_LIMIT) sudokuState.undoStack.shift();
  sudokuState.redoStack = [];
}

function undoSudoku() {
  stepSudokuHistory(sudokuState.undoStack, sudokuState.redoStack, "Move undone.");
}

function redoSudoku() {
  stepSudokuHistory(sudokuState.redoStack, sudokuState.undoStack, "Move redone.");
}

function stepSudokuHistory(source, destination, message) {
  if (!sudokuState.started || !source.length) return;
  const snapshot = source.pop();
  const current = captureSudokuSnapshot();
  current.selected = snapshot.selected;
  current.noteMode = snapshot.noteMode;
  destination.push(current);
  sudokuState.values = [...snapshot.values];
  sudokuState.notes = snapshot.notes.map((notes) => new Set(notes));
  sudokuState.selected = snapshot.selected;
  sudokuState.noteMode = snapshot.noteMode;
  noteSudokuButton.classList.toggle("active", sudokuState.noteMode);
  noteSudokuButton.setAttribute("aria-pressed", String(sudokuState.noteMode));
  const solved = updateSudokuCompletion();
  sudokuMessage.textContent = solved ? `${message} Puzzle solved.` : message;
  renderSudoku();
  saveSudokuState();
}

function updateSudokuCompletion() {
  const solved = sudokuState.values.join("") === sudokuState.solution;
  if (solved) {
    finishSudokuTimer();
  } else if (sudokuState.finished) {
    sudokuState.finished = false;
    startSudokuTimer();
  }
  return solved;
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

function isSudokuNumberComplete(value) {
  const boxes = new Set();
  sudokuState.values.forEach((cellValue, index) => {
    if (cellValue !== value) return;
    const boxRow = Math.floor(index / 27);
    const boxCol = Math.floor((index % 9) / 3);
    boxes.add(boxRow * 3 + boxCol);
  });
  return boxes.size === 9;
}

function updateSudokuNumberPad() {
  for (const button of numberPad.children) {
    const value = button.textContent;
    button.disabled = isSudokuNumberComplete(value);
    button.title = button.disabled
      ? `${value} is in every 3×3 box. Erase one to use it again.`
      : "";
  }
}

function startSudokuTimer() {
  if (sudokuState.finished) return;
  sudokuState.started = true;
  pauseSudokuTimer();
  sudokuState.timer = setInterval(() => {
    sudokuState.seconds += 1;
    sudokuTimerEl.textContent = sudokuState.seconds;
    if (sudokuState.seconds % 5 === 0) saveSudokuState();
  }, 1000);
  saveSudokuState();
}

function pauseSudokuTimer() {
  if (sudokuState?.timer) {
    clearInterval(sudokuState.timer);
    sudokuState.timer = null;
  }
}

function finishSudokuTimer() {
  if (!sudokuState) return;
  sudokuState.finished = true;
  pauseSudokuTimer();
  clearSudokuSave();
}

document.getElementById("newSudoku").addEventListener("click", () => newSudoku(true));
loadSudokuButton.addEventListener("click", loadSudoku);
sudokuDifficulty.addEventListener("change", () => newSudoku(false));
noteSudokuButton.addEventListener("click", toggleSudokuNoteMode);
document.getElementById("eraseSudoku").addEventListener("click", eraseSudokuCell);
undoSudokuButton.addEventListener("click", undoSudoku);
redoSudokuButton.addEventListener("click", redoSudoku);
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey || event.metaKey) {
    if (event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redoSudoku();
      else undoSudoku();
    } else if (event.key.toLowerCase() === "y") {
      event.preventDefault();
      redoSudoku();
    }
    return;
  }
  if (event.altKey) return;
  if (/^[1-9]$/.test(event.key)) setSudokuValue(event.key);
  if (event.key === "Backspace" || event.key === "Delete") eraseSudokuCell();
  if (event.key.toLowerCase() === "n") toggleSudokuNoteMode();
});
window.addEventListener("pagehide", () => {
  saveSudokuState();
  pauseSudokuTimer();
});
window.addEventListener("pageshow", () => {
  if (sudokuState.started && !sudokuState.finished && !sudokuState.timer) startSudokuTimer();
});
buildNumberPad();
newSudoku();
updateSudokuLoadButton();
if (!loadSudokuButton.disabled) {
  sudokuMessage.textContent = "Saved progress is available. Press Load to continue.";
}
