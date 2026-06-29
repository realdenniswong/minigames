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
  if (!sudokuState.started && value !== "0") startSudokuTimer();
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

function startSudokuTimer() {
  if (sudokuState.finished) return;
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

function finishSudokuTimer() {
  if (!sudokuState) return;
  sudokuState.finished = true;
  pauseSudokuTimer();
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
window.addEventListener("keydown", (event) => {
  if (/^[1-9]$/.test(event.key)) setSudokuValue(event.key);
  if (event.key === "Backspace" || event.key === "Delete") setSudokuValue("0");
});
window.addEventListener("pagehide", pauseSudokuTimer);
buildNumberPad();
newSudoku();
