const modeButtons = document.querySelectorAll("[data-mode]");
const modePickerArea = document.querySelector(".mode-picker-area");
const modePickerButton = document.getElementById("modePickerButton");
const modePickerCurrent = document.getElementById("modePickerCurrent");
const modePicker = document.getElementById("modePicker");
const closeModePickerButton = document.getElementById("closeModePicker");
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
const promptKicker = document.getElementById("promptKicker");
const brainPrompt = document.getElementById("brainPrompt");
const brainControls = document.getElementById("brainControls");

const modeTitles = {
  math: "Math Sprint",
  color: "Word Color",
  reaction: "Reaction Time",
  simon: "Simon Said",
};
const colorChoices = [
  { name: "Red", value: "#d95e4f" },
  { name: "Blue", value: "#4f8cc9" },
  { name: "Green", value: "#1c8f78" },
  { name: "Gold", value: "#d39a21" },
  { name: "Purple", value: "#6757c8" },
];
const simonNames = ["Green", "Blue", "Gold", "Purple"];

let currentMode = "math";
let state = {};
let reactionTimer = 0;
let sequenceTimer = 0;
let brainAudio;

function getBest(mode) {
  return Number(localStorage.getItem(`offlineMiniGames.brain.${mode}.best`) || 0);
}

function setBest(mode, value) {
  localStorage.setItem(`offlineMiniGames.brain.${mode}.best`, String(value));
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
  modePickerCurrent.textContent = modeTitles[mode];
  closeModePicker();
  resetBrain();
}

function openModePicker() {
  modePicker.hidden = false;
  modePickerButton.setAttribute("aria-expanded", "true");
}

function closeModePicker() {
  modePicker.hidden = true;
  modePickerButton.setAttribute("aria-expanded", "false");
}

function toggleModePicker() {
  if (modePicker.hidden) {
    openModePicker();
  } else {
    closeModePicker();
  }
}

function resetBrain() {
  clearTimers();
  state = { running: false, score: 0, round: 0 };
  promptKicker.textContent = modeTitles[currentMode];
  brainPrompt.textContent = "Ready?";
  brainPrompt.style.color = "";
  brainMessage.textContent = "Press Start to begin.";
  startBrainButton.textContent = "Start";
  scoreLabel.textContent = currentMode === "reaction" ? "Last" : "Score";
  roundLabel.textContent = currentMode === "reaction" ? "Tries" : "Round";
  timeLabel.textContent = statFourLabel();
  brainScoreEl.textContent = currentMode === "reaction" ? "-" : "0";
  brainBestEl.textContent = formatBest(currentMode, getBest(currentMode));
  brainRoundEl.textContent = currentMode === "reaction" ? "0/5" : "0/10";
  brainTimeEl.textContent = timeStatText();
  renderIdleControls();
}

function startBrain() {
  clearTimers();
  if (currentMode === "math") startMath();
  if (currentMode === "color") startColor();
  if (currentMode === "reaction") startReaction();
  if (currentMode === "simon") startSimon();
}

function formatBest(mode, value) {
  if (!value) return "-";
  return mode === "reaction" ? `${value}ms` : value;
}

function updateStats(roundTotal = 10) {
  brainScoreEl.textContent = currentMode === "reaction" && state.last ? `${state.last}ms` : state.score;
  brainBestEl.textContent = formatBest(currentMode, getBest(currentMode));
  brainRoundEl.textContent = `${state.round}/${roundTotal}`;
  brainTimeEl.textContent = timeStatText();
}

function saveHighScore() {
  const best = getBest(currentMode);
  if (state.score > best) setBest(currentMode, state.score);
}

function saveLowScore() {
  const best = getBest(currentMode);
  if (!best || state.last < best) setBest(currentMode, state.last);
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
    if (!state.times?.length) return "-";
    const average = Math.round(state.times.reduce((sum, time) => sum + time, 0) / state.times.length);
    return `${average}ms`;
  }
  if (usesTotalTimer(currentMode)) return elapsedText();
  if (currentMode === "simon" && state.sequence?.length) return state.sequence.length;
  return "-";
}

function usesTotalTimer(mode) {
  return mode === "math" || mode === "color";
}

function statFourLabel() {
  if (currentMode === "reaction") return "Avg";
  if (currentMode === "simon") return "Level";
  return "Time";
}

function renderIdleControls() {
  if (currentMode === "simon") {
    renderSimonGrid(false);
  } else if (currentMode === "reaction") {
    brainControls.innerHTML = `<button class="reaction-button" type="button">Start when ready</button>`;
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
  state = { running: true, score: 0, round: 0, total: 10 };
  startBrainTimer();
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Choose the correct answer.";
  nextMathQuestion();
}

function nextMathQuestion() {
  if (state.round >= state.total) {
    finishGame(`Finished. Score: ${state.score}/${state.total}.`);
    return;
  }
  state.round += 1;
  const left = Math.floor(Math.random() * 18) + 4;
  const right = Math.floor(Math.random() * 18) + 4;
  const useMinus = Math.random() < 0.35;
  const bigger = Math.max(left, right);
  const smaller = Math.min(left, right);
  const answer = useMinus ? bigger - smaller : left + right;
  const prompt = useMinus ? `${bigger} - ${smaller}` : `${left} + ${right}`;
  const choices = new Set([answer]);
  while (choices.size < 4) choices.add(answer + Math.floor(Math.random() * 13) - 6 || answer + 3);
  brainPrompt.textContent = prompt;
  renderAnswerButtons(shuffle([...choices]), answer, nextMathQuestion);
  updateStats();
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
  state = { running: true, score: 0, round: 0, total: 5, waiting: false, ready: false, last: 0, times: [] };
  scoreLabel.textContent = "Last";
  roundLabel.textContent = "Tries";
  timeLabel.textContent = "Avg";
  brainTimeEl.textContent = "-";
  startBrainButton.textContent = "Restart";
  brainMessage.textContent = "Wait for green, then tap.";
  nextReactionRound();
}

function nextReactionRound() {
  if (state.round >= state.total) {
    startBrainButton.textContent = "Start";
    brainMessage.textContent = `Done. Average: ${timeStatText()}. Lower is better.`;
    state.running = false;
    updateStats(5);
    return;
  }
  state.round += 1;
  state.waiting = true;
  state.ready = false;
  brainPrompt.textContent = "Wait...";
  brainControls.innerHTML = `<button class="reaction-button waiting" type="button">Wait</button>`;
  brainControls.querySelector("button").addEventListener("click", handleReactionTap);
  updateStats(5);
  reactionTimer = setTimeout(() => {
    state.waiting = false;
    state.ready = true;
    state.readyAt = performance.now();
    brainPrompt.textContent = "Tap!";
    const button = brainControls.querySelector("button");
    button.textContent = "Tap";
    button.classList.remove("waiting");
    button.classList.add("ready");
  }, 900 + Math.random() * 1900);
}

function handleReactionTap() {
  if (!state.running) return;
  if (state.waiting) {
    clearTimeout(reactionTimer);
    brainMessage.textContent = "Too early. Try that round again.";
    state.round -= 1;
    nextReactionRound();
    return;
  }
  if (!state.ready) return;
  state.last = Math.max(1, Math.round(performance.now() - state.readyAt));
  state.times.push(state.last);
  state.score = state.last;
  saveLowScore();
  brainMessage.textContent = `${state.last}ms.`;
  state.ready = false;
  updateStats(5);
  reactionTimer = setTimeout(nextReactionRound, 650);
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
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  brainAudio ??= new AudioContext();
  if (brainAudio.state === "suspended") brainAudio.resume();
  const oscillator = brainAudio.createOscillator();
  const gain = brainAudio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.06, brainAudio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, brainAudio.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(brainAudio.destination);
  oscillator.start();
  oscillator.stop(brainAudio.currentTime + duration);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});
modePickerButton.addEventListener("click", toggleModePicker);
closeModePickerButton.addEventListener("click", closeModePicker);
document.addEventListener("click", (event) => {
  if (!modePickerArea.contains(event.target)) closeModePicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModePicker();
});
startBrainButton.addEventListener("click", startBrain);
resetBrainButton.addEventListener("click", resetBrain);
window.addEventListener("pagehide", clearTimers);
resetBrain();
