const modeButtons = document.querySelectorAll("[data-mode]");
const modePickerArea = document.querySelector(".mode-picker-area");
const modePickerButton = document.getElementById("modePickerButton");
const modePickerCurrent = document.getElementById("modePickerCurrent");
const modePicker = document.getElementById("modePicker");
const closeModePickerButton = document.getElementById("closeModePicker");
const mathOptions = document.getElementById("mathOptions");
const mathDifficultySelect = document.getElementById("mathDifficulty");
const reactionOptions = document.getElementById("reactionOptions");
const reactionDifficultySelect = document.getElementById("reactionDifficulty");
const startBrainButton = document.getElementById("startBrain");
const resetBrainButton = document.getElementById("resetBrain");
const scoreLabel = document.getElementById("scoreLabel");
const roundLabel = document.getElementById("roundLabel");
const timeLabel = document.getElementById("timeLabel");
const brainScoreEl = document.getElementById("brainScore");
const brainBestEl = document.getElementById("brainBest");
const brainRoundEl = document.getElementById("brainRound");
const brainTimeEl = document.getElementById("brainTime");
const brainMessage = document.getElementById("brainMessage");
const promptCard = document.querySelector(".prompt-card");
const promptKicker = document.getElementById("promptKicker");
const brainPrompt = document.getElementById("brainPrompt");
const brainControls = document.getElementById("brainControls");
const fixedMode = document.body.dataset.fixedMode;

const modeTitles = {
  math: "Math Sprint",
  color: "Word Color",
  reaction: "Cowboy Duel",
  simon: "Simon Said",
};
const difficultyTitles = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const colorChoices = [
  { name: "Red", value: "#d95e4f" },
  { name: "Blue", value: "#4f8cc9" },
  { name: "Green", value: "#1c8f78" },
  { name: "Gold", value: "#d39a21" },
  { name: "Purple", value: "#6757c8" },
];
const simonNames = ["Green", "Blue", "Gold", "Purple"];
const reactionDifficultySettings = {
  easy: { min: 700, max: 1050 },
  medium: { min: 470, max: 760 },
  hard: { min: 300, max: 520 },
};

let currentMode = modeTitles[fixedMode] ? fixedMode : "math";
let state = {};
let reactionTimer = 0;
let sequenceTimer = 0;
let brainAudio;

const savedMathDifficulty = localStorage.getItem("offlineMiniGames.brain.math.difficulty");
if (mathDifficultySelect && difficultyTitles[savedMathDifficulty]) mathDifficultySelect.value = savedMathDifficulty;
const savedReactionDifficulty = localStorage.getItem("offlineMiniGames.brain.reaction.difficulty");
if (reactionDifficultySelect && difficultyTitles[savedReactionDifficulty]) reactionDifficultySelect.value = savedReactionDifficulty;

function getBest(mode) {
  return Number(localStorage.getItem(`offlineMiniGames.brain.${mode}.best`) || 0);
}

function setBest(mode, value) {
  localStorage.setItem(`offlineMiniGames.brain.${mode}.best`, String(value));
}

function currentBestKey() {
  if (currentMode === "math") return `math.${mathDifficultySelect?.value || "easy"}`;
  if (currentMode === "reaction") return `reaction.${reactionDifficultySelect?.value || "easy"}`;
  return currentMode;
}

function clearTimers() {
  clearTimeout(reactionTimer);
  clearTimeout(sequenceTimer);
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function setMode(mode) {
  currentMode = mode;
  clearTimers();
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
    button.setAttribute("aria-selected", String(button.dataset.mode === mode));
  });
  if (modePickerCurrent) modePickerCurrent.textContent = modeTitles[mode];
  closeModePicker();
  resetBrain();
}

function openModePicker() {
  if (!modePicker || !modePickerButton) return;
  modePicker.hidden = false;
  modePickerButton.setAttribute("aria-expanded", "true");
}

function closeModePicker() {
  if (!modePicker || !modePickerButton) return;
  modePicker.hidden = true;
  modePickerButton.setAttribute("aria-expanded", "false");
}

function toggleModePicker() {
  if (!modePicker) return;
  if (modePicker.hidden) {
    openModePicker();
  } else {
    closeModePicker();
  }
}

function resetBrain() {
  clearTimers();
  state = { running: false, score: 0, round: 0 };
  setDuelScene("idle");
  if (mathOptions) mathOptions.hidden = currentMode !== "math";
  if (reactionOptions) reactionOptions.hidden = currentMode !== "reaction";
  if (currentMode === "math") {
    promptKicker.textContent = `${modeTitles[currentMode]} - ${difficultyTitles[mathDifficultySelect.value]}`;
  } else if (currentMode === "reaction") {
    promptKicker.textContent = `${modeTitles[currentMode]} - ${difficultyTitles[reactionDifficultySelect.value]}`;
  } else {
    promptKicker.textContent = modeTitles[currentMode];
  }
  brainPrompt.textContent = "Ready?";
  brainPrompt.style.color = "";
  brainMessage.textContent =
    currentMode === "math" || currentMode === "reaction" ? "Choose difficulty, then press Start." : "Press Start to begin.";
  startBrainButton.textContent = "Start";
  scoreLabel.textContent = "Score";
  roundLabel.textContent = "Round";
  timeLabel.textContent = statFourLabel();
  brainScoreEl.textContent = "0";
  brainBestEl.textContent = formatBest(currentMode, getBest(currentBestKey()));
  brainRoundEl.textContent = currentMode === "reaction" ? "0/5" : "0/10";
  brainTimeEl.textContent = timeStatText();
  renderIdleControls();
}

function startBrain() {
  unlockBrainAudio();
  clearTimers();
  if (currentMode === "math") startMath();
  if (currentMode === "color") startColor();
  if (currentMode === "reaction") startReaction();
  if (currentMode === "simon") startSimon();
}

function formatBest(mode, value) {
  if (!value) return "-";
  return value;
}

function updateStats(roundTotal = 10) {
  brainScoreEl.textContent = state.score;
  brainBestEl.textContent = formatBest(currentMode, getBest(currentBestKey()));
  brainRoundEl.textContent = `${state.round}/${roundTotal}`;
  brainTimeEl.textContent = timeStatText();
}

function saveHighScore() {
  const bestKey = currentBestKey();
  const best = getBest(bestKey);
  if (state.score > best) setBest(bestKey, state.score);
}

function saveLowScore() {
  const bestKey = currentBestKey();
  const best = getBest(bestKey);
  if (!best || state.last < best) setBest(bestKey, state.last);
}

function finishGame(message, roundTotal = 10) {
  state.running = false;
  state.accepting = false;
  state.showing = false;
  stopBrainTimer();
  saveHighScore();
  startBrainButton.textContent = "Start";
  brainMessage.textContent = usesTotalTimer(currentMode) ? `${message} Time: ${elapsedText()}.` : message;
  updateStats(roundTotal);
}

function startBrainTimer() {
  stopBrainTimer();
  state.startedAt = performance.now();
  state.elapsedMs = 0;
  brainTimeEl.textContent = "0.0s";
  state.timer = setInterval(() => {
    state.elapsedMs = performance.now() - state.startedAt;
    brainTimeEl.textContent = elapsedText();
  }, 100);
}

function stopBrainTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
  if (state.startedAt) state.elapsedMs = performance.now() - state.startedAt;
}

function elapsedText() {
  const elapsed = state.elapsedMs || 0;
  return `${(elapsed / 1000).toFixed(1)}s`;
}

function timeStatText() {
  if (currentMode === "reaction") {
    return state.last ? `${state.last}ms` : "-";
  }
  if (usesTotalTimer(currentMode)) return elapsedText();
  if (currentMode === "simon" && state.sequence?.length) return state.sequence.length;
  return "-";
}

function usesTotalTimer(mode) {
  return mode === "math" || mode === "color";
}

function statFourLabel() {
  if (currentMode === "reaction") return "Shot";
  if (currentMode === "simon") return "Level";
  return "Time";
}

function renderIdleControls() {
  if (currentMode === "simon") {
    renderSimonGrid(false);
  } else if (currentMode === "reaction") {
    renderReactionButton("Press Start for duel", "", true);
  } else if (currentMode === "math") {
    renderMathAnswerControls(true);
  } else {
    brainControls.innerHTML = `<div class="answer-grid"></div>`;
  }
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function startMath() {
  const difficulty = mathDifficultySelect.value;
  state = { running: true, score: 0, round: 0, total: 10, input: "", difficulty };
  localStorage.setItem("offlineMiniGames.brain.math.difficulty", difficulty);
  promptKicker.textContent = `${modeTitles.math} - ${difficultyTitles[difficulty]}`;
  startBrainTimer();
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Enter the answer, then press Submit.";
  nextMathQuestion();
}

function nextMathQuestion() {
  if (state.round >= state.total) {
    finishGame(`Finished. Score: ${state.score}/${state.total}.`);
    return;
  }
  state.round += 1;
  state.input = "";
  state.accepting = true;
  state.problem = makeMathProblem(state.difficulty);
  brainPrompt.textContent = state.problem.prompt;
  renderMathAnswerControls(false);
  updateStats();
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeMathProblem(difficulty) {
  const operators = difficulty === "hard" ? ["+", "-", "*", "/", "pow2", "pow3", "sqrt"] : ["+", "-", "*", "/"];
  const operator = operators[randomInt(0, operators.length - 1)];
  if (difficulty === "easy") return makeEasyMathProblem(operator);
  if (difficulty === "medium") return makeMediumMathProblem(operator);
  return makeHardMathProblem(operator);
}

function makeEasyMathProblem(operator) {
  if (operator === "+") {
    const left = randomInt(1, 9);
    const right = randomInt(1, 9);
    return { prompt: `${left} + ${right}`, answer: left + right };
  }
  if (operator === "-") {
    const left = randomInt(1, 9);
    const right = randomInt(1, left);
    return { prompt: `${left} - ${right}`, answer: left - right };
  }
  if (operator === "*") {
    const left = randomInt(1, 9);
    const right = randomInt(1, 9);
    return { prompt: `${left} * ${right}`, answer: left * right };
  }
  const divisor = randomInt(2, 9);
  const answer = randomInt(1, Math.max(1, Math.floor(9 / divisor)));
  return { prompt: `${divisor * answer} / ${divisor}`, answer };
}

function makeMediumMathProblem(operator) {
  if (operator === "+") {
    const left = randomInt(10, 99);
    const right = randomInt(10, 99);
    return { prompt: `${left} + ${right}`, answer: left + right };
  }
  if (operator === "-") {
    const left = randomInt(10, 99);
    const right = randomInt(10, left);
    return { prompt: `${left} - ${right}`, answer: left - right };
  }
  if (operator === "*") {
    const left = randomInt(10, 99);
    const right = randomInt(2, 9);
    return { prompt: `${left} * ${right}`, answer: left * right };
  }
  let divisor = randomInt(10, 99);
  let answer = randomInt(2, 9);
  while (divisor * answer > 99) {
    divisor = randomInt(10, 99);
    answer = randomInt(2, 9);
  }
  return { prompt: `${divisor * answer} / ${divisor}`, answer };
}

function makeHardMathProblem(operator) {
  if (operator === "+") {
    const left = randomInt(100, 999);
    const right = randomInt(100, 999);
    return { prompt: `${left} + ${right}`, answer: left + right };
  }
  if (operator === "-") {
    const left = randomInt(100, 999);
    const right = randomInt(100, left);
    return { prompt: `${left} - ${right}`, answer: left - right };
  }
  if (operator === "*") {
    if (Math.random() < 0.5) {
      const left = randomInt(10, 99);
      const right = randomInt(10, 99);
      return { prompt: `${left} * ${right}`, answer: left * right };
    }
    const left = randomInt(100, 999);
    const right = randomInt(2, 9);
    return { prompt: `${left} * ${right}`, answer: left * right };
  }
  if (operator === "/") {
    const divisor = randomInt(10, 99);
    const answer = randomInt(Math.ceil(100 / divisor), Math.floor(999 / divisor));
    return { prompt: `${divisor * answer} / ${divisor}`, answer };
  }
  if (operator === "pow2") {
    const base = randomInt(2, 20);
    return { prompt: `${base}^2`, answer: base * base };
  }
  if (operator === "pow3") {
    const base = randomInt(2, 9);
    return { prompt: `${base}^3`, answer: base * base * base };
  }
  const base = randomInt(2, 20);
  return { prompt: `sqrt(${base * base})`, answer: base };
}

function renderMathAnswerControls(disabled) {
  brainControls.innerHTML = `
    <div class="math-answer">
      <div class="math-entry empty" id="mathEntry">Answer</div>
      <div class="math-numpad" aria-label="Math answer keypad">
        <button type="button" data-math-key="7">7</button>
        <button type="button" data-math-key="8">8</button>
        <button type="button" data-math-key="9">9</button>
        <button type="button" data-math-key="4">4</button>
        <button type="button" data-math-key="5">5</button>
        <button type="button" data-math-key="6">6</button>
        <button type="button" data-math-key="1">1</button>
        <button type="button" data-math-key="2">2</button>
        <button type="button" data-math-key="3">3</button>
        <button class="math-clear" type="button" data-math-key="clear">Clear</button>
        <button type="button" data-math-key="0">0</button>
        <button class="math-backspace" type="button" data-math-key="backspace">Back</button>
        <button class="math-submit" type="button" data-math-key="submit">Submit</button>
      </div>
    </div>
  `;
  brainControls.querySelectorAll("[data-math-key]").forEach((button) => {
    button.disabled = disabled;
    button.addEventListener("click", () => handleMathKey(button.dataset.mathKey));
  });
  updateMathEntry();
}

function updateMathEntry() {
  const entry = document.getElementById("mathEntry");
  if (!entry) return;
  entry.textContent = state.input || "Answer";
  entry.classList.toggle("empty", !state.input);
}

function handleMathKey(key) {
  if (!state.running || !state.accepting || currentMode !== "math") return;
  if (/^\d$/.test(key)) {
    if (state.input.length >= 8) return;
    state.input = state.input === "0" ? key : `${state.input}${key}`;
    updateMathEntry();
    return;
  }
  if (key === "backspace") {
    state.input = state.input.slice(0, -1);
    updateMathEntry();
    return;
  }
  if (key === "clear") {
    state.input = "";
    updateMathEntry();
    return;
  }
  if (key === "submit") submitMathAnswer();
}

function handleMathKeyboard(event) {
  if (!state.running || currentMode !== "math") return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    handleMathKey(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    handleMathKey("backspace");
  } else if (event.key === "Enter") {
    event.preventDefault();
    handleMathKey("submit");
  } else if (event.key === "Escape") {
    handleMathKey("clear");
  }
}

function submitMathAnswer() {
  if (!state.input) {
    brainMessage.textContent = "Type an answer first.";
    return;
  }
  state.accepting = false;
  const buttons = brainControls.querySelectorAll("[data-math-key]");
  buttons.forEach((button) => {
    button.disabled = true;
  });
  const submitted = Number(state.input);
  const correct = submitted === state.problem.answer;
  if (correct) state.score += 1;
  brainMessage.textContent = correct ? "Correct." : `Answer: ${state.problem.answer}.`;
  updateStats();
  setTimeout(nextMathQuestion, 520);
}

function startColor() {
  state = { running: true, score: 0, round: 0, total: 10 };
  startBrainTimer();
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Pick the ink color, not the word.";
  nextColorQuestion();
}

function nextColorQuestion() {
  if (state.round >= state.total) {
    finishGame(`Finished. Score: ${state.score}/${state.total}.`);
    return;
  }
  state.round += 1;
  const word = colorChoices[Math.floor(Math.random() * colorChoices.length)];
  let ink = colorChoices[Math.floor(Math.random() * colorChoices.length)];
  if (Math.random() < 0.72) {
    while (ink.name === word.name) ink = colorChoices[Math.floor(Math.random() * colorChoices.length)];
  }
  brainPrompt.textContent = word.name;
  brainPrompt.style.color = ink.value;
  renderAnswerButtons(colorChoices.map((color) => color.name), ink.name, () => {
    brainPrompt.style.color = "";
    nextColorQuestion();
  });
  updateStats();
}

function renderAnswerButtons(choices, answer, nextQuestion) {
  brainControls.innerHTML = `<div class="answer-grid"></div>`;
  const grid = brainControls.querySelector(".answer-grid");
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.textContent = choice;
    button.addEventListener("click", () => {
      grid.querySelectorAll("button").forEach((answerButton) => {
        answerButton.disabled = true;
      });
      const correct = String(choice) === String(answer);
      if (correct) state.score += 1;
      button.classList.add(correct ? "correct" : "wrong");
      brainMessage.textContent = correct ? "Correct." : `Answer: ${answer}.`;
      updateStats();
      setTimeout(nextQuestion, 360);
    });
    grid.appendChild(button);
  });
}

function startReaction() {
  const difficulty = reactionDifficultySelect.value;
  state = {
    running: true,
    score: 0,
    round: 0,
    total: 5,
    waiting: false,
    ready: false,
    last: 0,
    difficulty,
  };
  localStorage.setItem("offlineMiniGames.brain.reaction.difficulty", difficulty);
  promptKicker.textContent = `${modeTitles.reaction} - ${difficultyTitles[difficulty]}`;
  scoreLabel.textContent = "Score";
  roundLabel.textContent = "Round";
  timeLabel.textContent = "Shot";
  brainTimeEl.textContent = "-";
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Wait for DRAW, then shoot before the computer.";
  nextReactionRound();
}

function nextReactionRound() {
  if (state.round >= state.total) {
    finishGame(`Duel over. Wins: ${state.score}/${state.total}.`, 5);
    return;
  }
  state.round += 1;
  state.waiting = true;
  state.ready = false;
  state.last = 0;
  state.countdownIndex = 0;
  brainPrompt.textContent = "Ready...";
  brainMessage.textContent = "Wait for 3, 2, 1, DRAW. Shoot only on DRAW.";
  setDuelScene("ready");
  renderReactionButton("Wait", "waiting", false);
  updateStats(5);
  reactionTimer = setTimeout(showReactionCountdown, countdownDelay());
}

function renderReactionButton(text, className, disabled) {
  brainControls.innerHTML = `<button class="reaction-button ${className}" type="button">${text}</button>`;
  const button = brainControls.querySelector("button");
  button.disabled = disabled;
  button.addEventListener("click", handleReactionTap);
}

function reactionComputerDelay() {
  const settings = reactionDifficultySettings[state.difficulty];
  return randomInt(settings.min, settings.max);
}

function countdownDelay() {
  return 750 + Math.random() * 500;
}

function showReactionCountdown() {
  if (!state.running || !state.waiting) return;
  const countdown = ["3", "2", "1"];
  if (state.countdownIndex >= countdown.length) {
    startReactionDraw();
    return;
  }
  brainPrompt.textContent = countdown[state.countdownIndex];
  brainMessage.textContent = "Still wait. Shoot only on DRAW.";
  setDuelScene("ready");
  playDuelSound("countdown");
  state.countdownIndex += 1;
  reactionTimer = setTimeout(showReactionCountdown, countdownDelay());
}

function startReactionDraw() {
  if (!state.running) return;
  state.waiting = false;
  state.ready = true;
  state.readyAt = performance.now();
  state.computerDelay = reactionComputerDelay();
  brainPrompt.textContent = "DRAW!";
  brainMessage.textContent = "Shoot now. The computer gets faster on harder difficulty.";
  setDuelScene("draw");
  playDuelSound("draw");
  renderReactionButton("Shoot", "ready", false);
  reactionTimer = setTimeout(handleComputerShot, state.computerDelay);
}

function endReactionRound(message, prompt, className) {
  state.ready = false;
  state.waiting = false;
  brainPrompt.textContent = prompt;
  brainMessage.textContent = message;
  renderReactionButton(prompt, className, true);
  updateStats(5);
  reactionTimer = setTimeout(nextReactionRound, 850);
}

function handleComputerShot() {
  if (!state.running || !state.ready) return;
  state.last = state.computerDelay;
  setDuelScene("computer-shot");
  endReactionRound(`Computer shot in ${state.computerDelay}ms.`, "Too slow", "lost");
}

function handleReactionTap() {
  if (!state.running) return;
  if (state.waiting) {
    playDuelSound("shot");
    clearTimeout(reactionTimer);
    state.last = 0;
    setDuelScene("player-shot");
    endReactionRound("Too early. Point goes to the computer.", "False start", "lost");
    return;
  }
  if (!state.ready) return;
  playDuelSound("shot");
  clearTimeout(reactionTimer);
  state.last = Math.max(1, Math.round(performance.now() - state.readyAt));
  state.score += 1;
  setDuelScene("player-shot");
  endReactionRound(`You shot in ${state.last}ms.`, "You win", "won");
}

function handleReactionKeyboard(event) {
  if (!state.running || currentMode !== "reaction") return;
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    handleReactionTap();
  }
}

function startSimon() {
  state = { running: true, score: 0, round: 1, sequence: [], inputIndex: 0, showing: false };
  timeLabel.textContent = "Level";
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Watch Simon, then repeat.";
  nextSimonRound();
}

function nextSimonRound() {
  state.inputIndex = 0;
  state.showing = true;
  state.sequence.push(Math.floor(Math.random() * 4));
  brainPrompt.textContent = `Level ${state.sequence.length}`;
  renderSimonGrid(false);
  updateStats(12);
  showSimonStep(0);
}

function renderSimonGrid(active) {
  brainControls.innerHTML = `<div class="simon-grid"></div>`;
  const grid = brainControls.querySelector(".simon-grid");
  simonNames.forEach((name, index) => {
    const button = document.createElement("button");
    button.className = "simon-pad";
    button.type = "button";
    button.dataset.pad = index;
    button.textContent = name;
    button.disabled = !active;
    button.addEventListener("click", () => handleSimonPad(index, button));
    grid.appendChild(button);
  });
}

function showSimonStep(index) {
  const pads = brainControls.querySelectorAll(".simon-pad");
  pads.forEach((pad) => pad.classList.remove("lit"));
  if (index >= state.sequence.length) {
    renderSimonGrid(true);
    state.showing = false;
    brainMessage.textContent = "Repeat the sequence.";
    return;
  }
  const active = pads[state.sequence[index]];
  if (active) active.classList.add("lit");
  playBrainTone(330 + state.sequence[index] * 90, 0.12);
  sequenceTimer = setTimeout(() => {
    if (active) active.classList.remove("lit");
    sequenceTimer = setTimeout(() => showSimonStep(index + 1), 170);
  }, 430);
}

function handleSimonPad(index, button) {
  if (!state.running || state.showing) return;
  playBrainTone(330 + index * 90, 0.08);
  button.classList.add("lit");
  setTimeout(() => button.classList.remove("lit"), 140);
  if (index !== state.sequence[state.inputIndex]) {
    finishGame(`Sequence missed. Level reached: ${state.sequence.length}.`, 12);
    return;
  }
  state.inputIndex += 1;
  if (state.inputIndex === state.sequence.length) {
    state.score = state.sequence.length;
    state.round = state.sequence.length + 1;
    brainMessage.textContent = "Nice. Next level.";
    saveHighScore();
    updateStats(12);
    sequenceTimer = setTimeout(nextSimonRound, 650);
  }
}

function playBrainTone(frequency, duration) {
  const context = unlockBrainAudio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.06, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function setDuelScene(phase) {
  if (!promptCard) return;
  let scene = promptCard.querySelector(".duel-scene");
  if (currentMode !== "reaction") {
    if (scene) scene.remove();
    return;
  }
  if (!scene) {
    scene = document.createElement("div");
    scene.className = "duel-scene";
    scene.setAttribute("aria-hidden", "true");
    scene.innerHTML = `
      <div class="duel-ground"></div>
      <div class="duel-sun"></div>
      <div class="gunman">
        <span class="hat-brim"></span>
        <span class="hat-crown"></span>
        <span class="head"></span>
        <span class="body"></span>
        <span class="neckwear"></span>
        <span class="arm arm-left"></span>
        <span class="arm arm-right"></span>
        <span class="hand"></span>
        <span class="gun"></span>
        <span class="muzzle-flash"></span>
        <span class="leg leg-left"></span>
        <span class="leg leg-right"></span>
      </div>
      <div class="duel-shadow"></div>
    `;
    promptCard.insertBefore(scene, promptKicker);
  }
  scene.dataset.phase = phase;
}

function unlockBrainAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  brainAudio ??= new AudioContext();
  if (brainAudio.state === "suspended") brainAudio.resume();
  return brainAudio;
}

function playDuelSound(type) {
  const context = unlockBrainAudio();
  if (!context) return;
  if (type === "countdown") {
    playTone(context, 520, 0.055, "sine", 0.055);
  } else if (type === "draw") {
    playTone(context, 880, 0.08, "triangle", 0.065);
    setTimeout(() => playTone(context, 1320, 0.09, "triangle", 0.06), 90);
  } else if (type === "shot") {
    playTone(context, 120, 0.12, "square", 0.08);
    playNoiseBurst(context, 0.12);
  }
}

function playTone(context, frequency, duration, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function playNoiseBurst(context, duration) {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }
  const source = context.createBufferSource();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.12, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
  source.stop(context.currentTime + duration);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
if (modeButtons.length) {
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
    button.setAttribute("aria-selected", String(button.dataset.mode === currentMode));
  });
}
if (modePickerCurrent) modePickerCurrent.textContent = modeTitles[currentMode];
mathDifficultySelect?.addEventListener("change", () => {
  localStorage.setItem("offlineMiniGames.brain.math.difficulty", mathDifficultySelect.value);
  if (currentMode === "math") resetBrain();
});
reactionDifficultySelect?.addEventListener("change", () => {
  localStorage.setItem("offlineMiniGames.brain.reaction.difficulty", reactionDifficultySelect.value);
  if (currentMode === "reaction") resetBrain();
});
modePickerButton?.addEventListener("click", toggleModePicker);
closeModePickerButton?.addEventListener("click", closeModePicker);
document.addEventListener("click", (event) => {
  if (modePickerArea && !modePickerArea.contains(event.target)) closeModePicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModePicker();
});
document.addEventListener("keydown", handleMathKeyboard);
document.addEventListener("keydown", handleReactionKeyboard);
promptCard?.addEventListener("click", handleReactionTap);
startBrainButton.addEventListener("click", startBrain);
resetBrainButton.addEventListener("click", resetBrain);
window.addEventListener("pagehide", clearTimers);
resetBrain();
