const canvas = document.getElementById("inoutCanvas");
const ctx = canvas.getContext("2d");
const playArea = document.querySelector(".play-area");
const scoreEl = document.getElementById("inoutScore");
const bestEl = document.getElementById("inoutBest");
const roundEl = document.getElementById("inoutRound");
const livesEl = document.getElementById("inoutLives");
const answerStateEl = document.getElementById("inoutAnswerState");
const answerPanel = document.getElementById("answerPanel");
const answerEntry = document.getElementById("answerEntry");
const submitAnswerButton = document.getElementById("submitAnswer");
const messageEl = document.getElementById("inoutMessage");
const screenCountEl = document.getElementById("screenCount");
const answerButtons = [
  ...document.querySelectorAll("[data-answer-key]"),
  submitAnswerButton,
];

const maxLives = 3;
const levelsPerTier = 5;
const easyLevelSettings = {
  startMin: 2,
  startMax: 4,
  wavesMin: 2,
  wavesMax: 3,
  groupMax: 2,
  waveGap: 930,
  speedMin: 0.95,
  speedMax: 1.18,
  repeatChance: 0.12,
  inChance: 0.56,
  comboChance: 0,
};
const difficultyTiers = [
  easyLevelSettings,
  {
    startMin: 2,
    startMax: 5,
    wavesMin: 3,
    wavesMax: 4,
    groupMax: 2,
    waveGap: 840,
    speedMin: 1.02,
    speedMax: 1.28,
    repeatChance: 0.2,
    inChance: 0.55,
    comboChance: 0.1,
  },
  {
    startMin: 3,
    startMax: 6,
    wavesMin: 4,
    wavesMax: 5,
    groupMax: 3,
    waveGap: 760,
    speedMin: 1.1,
    speedMax: 1.42,
    repeatChance: 0.28,
    inChance: 0.54,
    comboChance: 0.18,
  },
  {
    startMin: 3,
    startMax: 7,
    wavesMin: 5,
    wavesMax: 6,
    groupMax: 3,
    waveGap: 690,
    speedMin: 1.18,
    speedMax: 1.56,
    repeatChance: 0.34,
    inChance: 0.53,
    comboChance: 0.28,
  },
];

const colors = ["#ff8a7a", "#7db7ff", "#4fd3b7", "#f3c85c", "#a99bff", "#ffb16f"];
const gameMode = "classic";
const groupLaneGap = 58;
const doorLaneXGap = 18;
const doorLaneYGap = 12;
let state;
let animationFrame = 0;
let sequenceTimer = 0;
let countdownTimer = 0;
let audioContext;

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function getLevelSettings(level) {
  const tier = Math.floor((level - 1) / levelsPerTier);
  const preset = difficultyTiers[tier];
  if (preset) return preset;

  const extraTier = tier - difficultyTiers.length + 1;
  return {
    startMin: 4,
    startMax: 8,
    wavesMin: Math.min(8, 5 + extraTier),
    wavesMax: Math.min(10, 7 + extraTier),
    groupMax: Math.min(5, 3 + Math.floor(extraTier / 2)),
    waveGap: Math.max(540, 650 - extraTier * 32),
    speedMin: Math.min(1.55, 1.24 + extraTier * 0.06),
    speedMax: Math.min(1.95, 1.62 + extraTier * 0.07),
    repeatChance: Math.min(0.5, 0.36 + extraTier * 0.03),
    inChance: 0.52,
    comboChance: Math.min(0.52, 0.32 + extraTier * 0.04),
  };
}

function bestKey(mode = gameMode) {
  return `offlineMiniGames.inout.best.${mode}`;
}

function readBest(mode = gameMode) {
  return Math.max(
    Number(localStorage.getItem(bestKey(mode)) || 0),
    Number(localStorage.getItem(`offlineMiniGames.inout.best.${mode}.easy`) || 0)
  );
}

function resetGame() {
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
  clearTimeout(countdownTimer);
  state = {
    running: false,
    answering: false,
    finished: false,
    mode: gameMode,
    score: 0,
    round: 0,
    lives: maxLives,
    best: readBest(),
    input: "",
    people: [],
    waves: [],
    currentInside: 0,
    target: 0,
    startedInside: 0,
    results: [],
    lastTime: 0,
    doorOpenUntil: 0,
  };
  scoreEl.textContent = "0";
  bestEl.textContent = state.best;
  roundEl.textContent = "0";
  livesEl.textContent = String(maxLives);
  answerStateEl.textContent = "-";
  hideAnswerPanel();
  setMessage("Tap the game screen to start.");
  setScreenCount("Tap to Start");
  window.MiniGameShare?.setResult("");
  drawScene();
}

function startGame() {
  unlockAudio();
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
  clearTimeout(countdownTimer);
  state = {
    ...state,
    running: true,
    answering: false,
    finished: false,
    mode: gameMode,
    score: 0,
    round: 0,
    lives: maxLives,
    best: readBest(),
    input: "",
    results: [],
  };
  scoreEl.textContent = "0";
  bestEl.textContent = state.best;
  livesEl.textContent = String(state.lives);
  setMessage("Watch closely.");
  window.MiniGameShare?.setResult("");
  nextRound();
}

function nextRound() {
  clearTimeout(sequenceTimer);
  clearTimeout(countdownTimer);
  state.round += 1;
  state.answering = false;
  state.input = "";
  answerStateEl.textContent = "-";
  hideAnswerPanel();
  roundEl.textContent = String(state.round);
  createRound();
  setMessage("Add and subtract every wave.");
  setScreenCount(`Starting: ${state.startedInside}`);
  runCountdown();
  drawScene();
}

function createRound() {
  const settings = getLevelSettings(state.round);
  const waveCount = randomInt(settings.wavesMin, settings.wavesMax);
  let inside = state.round === 1 ? randomInt(settings.startMin, settings.startMax) : state.currentInside;
  state.startedInside = inside;
  state.currentInside = inside;
  state.target = inside;
  state.people = [];
  state.waves = [];
  state.lastTimeStart = 0;
  state.doorOpenUntil = 0;

  let time = 750;
  let lastDirection = "";
  for (let index = 0; index < waveCount; index += 1) {
    const moves = createWaveMoves(inside, lastDirection, settings);
    inside += moves.reduce((total, move) => {
      return total + (move.direction === "in" ? move.count : -move.count);
    }, 0);
    state.waves.push({ moves, time, launched: false });
    lastDirection = moves[moves.length - 1].direction;
    time += settings.waveGap + randomInt(-130, 170);
  }

  state.sequenceEnd = time + 1300;
}

function createWaveMoves(inside, lastDirection, settings) {
  const canExit = inside > 0;

  if (canExit && settings.groupMax >= 2 && Math.random() < settings.comboChance) {
    const totalCount = randomInt(2, settings.groupMax);
    const outCount = randomInt(1, Math.min(totalCount - 1, inside));
    const inCount = totalCount - outCount;
    const moves = [
      { direction: "out", count: outCount },
      { direction: "in", count: inCount },
    ];
    return Math.random() < 0.5 ? moves : moves.reverse();
  }

  const repeatDirection = canExit && lastDirection && Math.random() < settings.repeatChance;
  const direction =
    repeatDirection ? lastDirection : !canExit || Math.random() < settings.inChance ? "in" : "out";
  const maxGroup = direction === "out" ? Math.min(settings.groupMax, inside) : settings.groupMax;
  return [{ direction, count: randomInt(1, maxGroup) }];
}

function runCountdown() {
  const startText = `Starting: ${state.startedInside}`;
  const steps = [
    startText,
    `${startText}\n3`,
    `${startText}\n3...2`,
    `${startText}\n3...2...1`,
  ];
  let index = 0;
  const showStep = () => {
    setScreenCount(steps[index]);
    index += 1;
    if (index < steps.length) {
      countdownTimer = setTimeout(showStep, index === 1 ? 1250 : 720);
      return;
    }
    countdownTimer = setTimeout(() => {
      setScreenCount("");
      startAnimation();
    }, 720);
  };
  showStep();
}

function startAnimation() {
  state.lastTime = performance.now();
  loop(state.lastTime);
}

function loop(time) {
  const delta = Math.min(34, time - state.lastTime);
  state.lastTime = time;
  updateRound(delta);
  drawScene();
  if (state.running && !state.answering) {
    animationFrame = requestAnimationFrame(loop);
  }
}

function updateRound(delta) {
  if (!state.lastTimeStart) state.lastTimeStart = performance.now();
  const roundElapsed = performance.now() - state.lastTimeStart;
  state.waves.forEach((wave) => {
    if (!wave.launched && roundElapsed >= wave.time) launchWave(wave);
  });
  state.people.forEach((person) => updatePerson(person, delta));
  state.people = state.people.filter((person) => person.mode !== "gone");
  if (roundElapsed >= state.sequenceEnd && state.people.length === 0) {
    askAnswer();
  }
}

function launchWave(wave) {
  wave.launched = true;
  const moves = wave.moves || [{ direction: wave.direction, count: wave.count }];
  if (moves.some((move) => move.direction === "out")) {
    state.doorOpenUntil = performance.now() + 680;
  }
  moves.forEach((move) => launchMove(move));
}

function launchMove(move) {
  const count = move.direction === "out" ? Math.min(move.count, state.currentInside) : move.count;
  if (count <= 0) return;
  const settings = getLevelSettings(state.round);
  const waveSpeed = randomFloat(settings.speedMin, settings.speedMax);
  playMoveSound(move.direction, count);
  state.currentInside += move.direction === "in" ? count : -count;
  for (let index = 0; index < count; index += 1) {
    if (move.direction === "out") {
      state.people.push(createMovingPersonOut(index, count, waveSpeed));
    } else {
      state.people.push(createMovingPersonIn(index, count, waveSpeed));
    }
  }
}

function createMovingPersonIn(index, count, speed) {
  const lane = index - (count - 1) / 2;
  const side = -1;
  const groupOffset = lane * groupLaneGap;
  return {
    x: side < 0 ? -72 - Math.abs(groupOffset) : canvas.width + 72 + Math.abs(groupOffset),
    y: 424 + groupOffset,
    targetX: 461 + lane * doorLaneXGap,
    targetY: 374 + lane * doorLaneYGap,
    size: 1.72,
    speed,
    color: colors[randomInt(0, colors.length - 1)],
    mode: "entering",
    alpha: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

function createMovingPersonOut(index, count, speed) {
  const lane = index - (count - 1) / 2;
  const side = 1;
  const groupOffset = lane * groupLaneGap;
  return {
    x: 461 + lane * doorLaneXGap,
    y: 374 + lane * doorLaneYGap,
    targetX: side < 0 ? -72 - Math.abs(groupOffset) : canvas.width + 72 + Math.abs(groupOffset),
    targetY: 424 + groupOffset,
    size: 1.72,
    speed,
    color: colors[randomInt(0, colors.length - 1)],
    mode: "leaving",
    alpha: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

function updatePerson(person, delta) {
  const dx = person.targetX - person.x;
  const dy = person.targetY - person.y;
  const distance = Math.hypot(dx, dy);
  const step = person.speed * delta * 0.12;
  person.bob += delta * 0.015;
  if (distance <= step) {
    person.x = person.targetX;
    person.y = person.targetY;
    person.mode = "gone";
    return;
  }
  person.x += (dx / distance) * step;
  person.y += (dy / distance) * step;
}

function askAnswer() {
  state.answering = true;
  state.running = true;
  state.lastTimeStart = 0;
  state.target = state.currentInside;
  answerStateEl.textContent = "?";
  showAnswerPanel();
  setMessage("Enter the answer.");
  setScreenCount("How many inside?");
  drawScene();
}

function handleAnswerKey(key) {
  if (!state.answering) return;
  if (key === "clear") state.input = "";
  if (key === "backspace") state.input = state.input.slice(0, -1);
  if (/^\d$/.test(key) && state.input.length < 3) state.input += key;
  renderInput();
}

function renderInput() {
  answerEntry.textContent = state.input || "Answer";
  answerEntry.classList.toggle("filled", Boolean(state.input));
}

function submitAnswer() {
  if (!state.answering || !state.input) return;
  const value = Number(state.input);
  const correct = value === state.target;
  state.results.push({ round: state.round, value, target: state.target, correct });
  if (correct) {
    state.score += 1;
    scoreEl.textContent = state.score;
    if (state.score > state.best) {
      state.best = state.score;
      bestEl.textContent = state.best;
    }
    setMessage("Correct.", "good");
    setScreenCount("Correct", "good");
    playResultSound(true);
  } else {
    state.lives = Math.max(0, state.lives - 1);
    livesEl.textContent = String(state.lives);
    setMessage(`Wrong. It was ${state.target}. ${state.lives} lives left.`, "bad");
    setScreenCount(`It was ${state.target}\nLives ${state.lives}`, "bad");
    playResultSound(false);
  }
  answerStateEl.textContent = String(state.target);
  state.answering = false;
  hideAnswerPanel();
  if (state.lives <= 0) {
    sequenceTimer = setTimeout(finishGame, 1100);
    return;
  }
  sequenceTimer = setTimeout(nextRound, correct ? 820 : 1100);
}

function finishGame() {
  state.running = false;
  state.finished = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem(bestKey(), String(state.best));
  bestEl.textContent = state.best;
  livesEl.textContent = String(state.lives);
  answerStateEl.textContent = "-";
  setMessage("Game over. Tap screen to play again.", state.score >= 10 ? "good" : "");
  setScreenCount(`Score ${state.score}\nLevel ${state.round}`, state.score >= 10 ? "good" : "");
  window.MiniGameShare?.setResult(
    `Score ${state.score}, reached Level ${state.round} on In & Out.`
  );
}

function showAnswerPanel() {
  answerPanel.classList.remove("is-disabled");
  answerButtons.forEach((button) => {
    button.disabled = false;
  });
  state.input = "";
  renderInput();
}

function hideAnswerPanel() {
  answerPanel.classList.add("is-disabled");
  answerButtons.forEach((button) => {
    button.disabled = true;
  });
  state.input = "";
  renderInput();
}

function setMessage(text, tone = "") {
  messageEl.textContent = text;
  messageEl.classList.toggle("good", tone === "good");
  messageEl.classList.toggle("bad", tone === "bad");
}

function setScreenCount(text, tone = "") {
  screenCountEl.textContent = text;
  screenCountEl.classList.toggle("is-empty", !text);
  screenCountEl.classList.toggle("good", tone === "good");
  screenCountEl.classList.toggle("bad", tone === "bad");
}

function drawScene() {
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#a7dce9");
  sky.addColorStop(1, "#e7f5e4");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#7cbf73";
  ctx.fillRect(0, 412, width, height - 412);
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  drawCloud(150, 86, 34);
  drawCloud(760, 122, 28);
  drawPath();
  drawHouse();
  state?.people.forEach(drawPerson);
}

function drawCloud(x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.55, Math.PI, 0);
  ctx.arc(x + size * 0.52, y - size * 0.15, size * 0.7, Math.PI, 0);
  ctx.arc(x + size * 1.15, y, size * 0.55, Math.PI, 0);
  ctx.lineTo(x + size * 1.7, y + size * 0.42);
  ctx.lineTo(x - size * 0.55, y + size * 0.42);
  ctx.closePath();
  ctx.fill();
}

function drawHouse() {
  const nearDoor = state?.people?.some((person) => {
    const distance = Math.hypot(person.x - 461, person.y - 374);
    return person.mode === "leaving" || distance < 82;
  });
  const doorOpen = (state?.doorOpenUntil && performance.now() < state.doorOpenUntil) || nearDoor;
  ctx.fillStyle = "#f4c56f";
  ctx.fillRect(302, 218, 316, 194);
  ctx.fillStyle = "#9b4b35";
  ctx.beginPath();
  ctx.moveTo(270, 226);
  ctx.lineTo(460, 94);
  ctx.lineTo(650, 226);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#251713";
  ctx.fillRect(432, 304, 58, 108);
  if (doorOpen) {
    ctx.fillStyle = "#74422e";
    ctx.beginPath();
    ctx.moveTo(490, 308);
    ctx.lineTo(526, 320);
    ctx.lineTo(526, 412);
    ctx.lineTo(490, 412);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#653324";
    ctx.fillRect(432, 304, 58, 108);
  }
  ctx.fillStyle = "#2f5f89";
  ctx.fillRect(340, 258, 56, 46);
  ctx.fillRect(524, 258, 56, 46);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillRect(348, 266, 16, 30);
  ctx.fillRect(532, 266, 16, 30);
  if (!doorOpen) {
    ctx.fillStyle = "#f4df9c";
    ctx.beginPath();
    ctx.arc(478, 360, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPath() {
  ctx.fillStyle = "#d9b475";
  ctx.beginPath();
  ctx.moveTo(432, 412);
  ctx.lineTo(490, 412);
  ctx.lineTo(570, 560);
  ctx.lineTo(350, 560);
  ctx.closePath();
  ctx.fill();
}

function drawPerson(person) {
  const bob = Math.sin(person.bob) * 3;
  ctx.save();
  ctx.globalAlpha = person.alpha ?? 1;
  ctx.translate(person.x, person.y + bob);
  ctx.scale(person.size || 1, person.size || 1);
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(32, 36, 44, 0.82)";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.strokeRect(-8, -10, 16, 24);
  ctx.beginPath();
  ctx.arc(0, -18, 8.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = person.color;
  ctx.fillRect(-7, -9, 14, 22);
  ctx.beginPath();
  ctx.arc(0, -18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(32, 36, 44, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, 13);
  ctx.lineTo(-10, 27);
  ctx.moveTo(5, 13);
  ctx.lineTo(10, 27);
  ctx.stroke();
  ctx.restore();
}

function unlockAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playMoveSound(direction, count = 1) {
  const context = unlockAudio();
  if (!context) return;
  const now = context.currentTime;
  const tickGap = 0.16;

  for (let index = 0; index < count; index += 1) {
    const startAt = now + index * tickGap;
    if (direction === "in") {
      playTone(context, startAt, 880, 1260, 0.055, "sine", 0.033);
      playTone(context, startAt + 0.012, 1320, 1560, 0.045, "triangle", 0.018);
    } else {
      playTone(context, startAt, 190, 92, 0.085, "square", 0.03);
      playNoiseBurst(context, startAt, 0.045, 0.026);
    }
  }
}

function playTone(context, startAt, startFrequency, endFrequency, duration, type, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(startFrequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.01);
}

function playNoiseBurst(context, startAt, duration, volume) {
  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
  }
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(620, startAt);
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(startAt);
  source.stop(startAt + duration);
}

function playResultSound(correct) {
  const context = unlockAudio();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = correct ? "sine" : "sawtooth";
  oscillator.frequency.setValueAtTime(correct ? 720 : 180, now);
  oscillator.frequency.exponentialRampToValueAtTime(correct ? 980 : 120, now + 0.12);
  gain.gain.setValueAtTime(0.055, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.16);
}

function handleKeyboard(event) {
  if (!state?.answering) return;
  if (/^\d$/.test(event.key)) {
    event.preventDefault();
    handleAnswerKey(event.key);
  } else if (event.key === "Backspace") {
    event.preventDefault();
    handleAnswerKey("backspace");
  } else if (event.key === "Enter") {
    event.preventDefault();
    submitAnswer();
  }
}

playArea.addEventListener("click", () => {
  if (!state.running || state.finished) startGame();
});
document.querySelectorAll("[data-answer-key]").forEach((button) => {
  button.addEventListener("click", () => handleAnswerKey(button.dataset.answerKey));
});
submitAnswerButton.addEventListener("click", submitAnswer);
document.addEventListener("keydown", handleKeyboard);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
  clearTimeout(countdownTimer);
});
resetGame();
