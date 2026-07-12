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
  startMin: 4,
  startMax: 6,
  wavesMin: 4,
  wavesMax: 5,
  groupMax: 3,
  minInside: 2,
  waveGap: 1240,
  speedMin: 3.4,
  speedMax: 4.2,
  repeatChance: 0.08,
  inChance: 0.52,
  comboChance: 0,
};
const difficultyTiers = [
  easyLevelSettings,
  {
    startMin: 5,
    startMax: 7,
    wavesMin: 5,
    wavesMax: 6,
    groupMax: 5,
    minInside: 2,
    waveGap: 1120,
    speedMin: 3.8,
    speedMax: 4.7,
    repeatChance: 0.12,
    inChance: 0.51,
    comboChance: 0.1,
  },
  {
    startMin: 5,
    startMax: 8,
    wavesMin: 6,
    wavesMax: 7,
    groupMax: 10,
    minInside: 2,
    waveGap: 1000,
    speedMin: 4.3,
    speedMax: 5.2,
    repeatChance: 0.16,
    inChance: 0.5,
    comboChance: 0.2,
  },
  {
    startMin: 6,
    startMax: 9,
    wavesMin: 7,
    wavesMax: 8,
    groupMax: 10,
    minInside: 2,
    waveGap: 900,
    speedMin: 4.8,
    speedMax: 5.8,
    repeatChance: 0.2,
    inChance: 0.5,
    comboChance: 0.32,
  },
];

const gameMode = "classic";
const leftDoorwayX = 334;
const rightDoorwayX = 666;
const walkwayY = 438;
const doorwayCountDistance = 42;
const betweenWavesDelay = 720;
const groupStagger = 145;
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
    startMax: 10,
    wavesMin: Math.min(9, 7 + extraTier),
    wavesMax: Math.min(11, 8 + extraTier),
    groupMax: 15,
    minInside: 2,
    waveGap: Math.max(680, 840 - extraTier * 24),
    speedMin: Math.min(6.4, 5.2 + extraTier * 0.18),
    speedMax: Math.min(7.2, 6.2 + extraTier * 0.18),
    repeatChance: Math.min(0.32, 0.22 + extraTier * 0.025),
    inChance: 0.5,
    comboChance: Math.min(0.56, 0.36 + extraTier * 0.04),
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
    events: [],
    currentInside: 0,
    target: 0,
    startedInside: 0,
    results: [],
    lastTime: 0,
    doorOpenUntil: 0,
    activeEvent: null,
    nextEventAt: 0,
    roundCompleteAt: 0,
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
  setMessage(
    state.round === 1
      ? "Count each person who goes in or comes out."
      : "Continue counting from the previous total."
  );
  setScreenCount(
    state.round === 1 ? "Get ready" : "Keep counting from the last round"
  );
  runCountdown();
  drawScene();
}

function createRound() {
  const settings = getLevelSettings(state.round);
  const waveCount = randomInt(settings.wavesMin, settings.wavesMax);
  const startingCount =
    state.round === 1
      ? randomInt(settings.startMin, settings.startMax)
      : state.currentInside;
  let inside = startingCount;
  let target = startingCount;
  state.startedInside = startingCount;
  state.currentInside = state.round === 1 ? 0 : startingCount;
  state.target = startingCount;
  state.people = [];
  state.events = [];
  state.lastTimeStart = 0;
  state.doorOpenUntil = 0;
  state.activeEvent = null;
  state.nextEventAt = 0;
  state.roundCompleteAt = 0;

  if (state.round === 1) {
    state.events.push({
      moves: [{ direction: "in", count: startingCount }],
      pauseAfter: betweenWavesDelay,
    });
  }

  let lastDirection = "";
  for (let index = 0; index < waveCount; index += 1) {
    const moves = createWaveMoves(inside, lastDirection, settings);
    moves.forEach((move) => {
      inside += move.direction === "in" ? move.count : -move.count;
      target += move.direction === "in" ? move.count : -move.count;
    });
    state.events.push({ moves, pauseAfter: betweenWavesDelay });
    lastDirection = moves[moves.length - 1].direction;
  }

  state.target = target;
}

function createWaveMoves(inside, lastDirection, settings) {
  const maxOut = Math.max(0, inside - settings.minInside);
  const canExit = maxOut > 0;
  const simultaneousChance =
    state.round < 3 ? 0 : Math.min(0.6, 0.24 + (state.round - 3) * 0.045);

  if (
    canExit &&
    settings.groupMax >= 2 &&
    Math.random() < Math.max(settings.comboChance, simultaneousChance)
  ) {
    const totalCount = randomInt(2, settings.groupMax);
    const outCount = randomInt(1, Math.min(totalCount - 1, maxOut));
    const inCount = totalCount - outCount;
    const moves = [
      { direction: "out", count: outCount },
      { direction: "in", count: inCount },
    ];
    return Math.random() < 0.5 ? moves : moves.reverse();
  }

  let direction = !canExit || Math.random() < settings.inChance ? "in" : "out";
  if (lastDirection) {
    direction = canExit && Math.random() < settings.repeatChance ? lastDirection : oppositeDirection(lastDirection);
  }
  if (direction === "out" && !canExit) direction = "in";

  const maxGroup = direction === "out" ? Math.min(settings.groupMax, maxOut) : settings.groupMax;
  return [{ direction, count: randomInt(1, maxGroup) }];
}

function oppositeDirection(direction) {
  return direction === "in" ? "out" : "in";
}

function runCountdown() {
  const reminder =
    state.round === 1 ? "Get ready" : "Keep counting from the last round";
  const steps = [reminder, "3", "2", "1"];
  let index = 0;
  const showStep = () => {
    setScreenCount(steps[index]);
    index += 1;
    if (index < steps.length) {
      countdownTimer = setTimeout(showStep, index === 1 ? 900 : 620);
      return;
    }
    countdownTimer = setTimeout(() => {
      setScreenCount("");
      startAnimation();
    }, 620);
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
  const now = performance.now();
  const hadPerson = state.people.length > 0;
  state.people.forEach((person) => updatePerson(person, delta));
  state.people = state.people.filter((person) => person.mode !== "gone");
  if (hadPerson && state.people.length === 0 && state.activeEvent) {
    state.nextEventAt = now + state.activeEvent.pauseAfter;
    state.activeEvent = null;
  }
  if (!state.people.length && !state.activeEvent && state.events.length && now >= state.nextEventAt) {
    launchNextEvent();
  }
  if (!state.events.length && !state.people.length && !state.activeEvent) {
    state.roundCompleteAt ||= now + 700;
  }
  if (state.roundCompleteAt && now >= state.roundCompleteAt) {
    askAnswer();
  }
}

function launchNextEvent() {
  const event = state.events.shift();
  if (!event) return;
  const settings = getLevelSettings(state.round);
  const roundSpeedBoost = 1 + Math.min(0.5, Math.max(0, state.round - 1) * 0.1);
  const speed = randomFloat(settings.speedMin, settings.speedMax) * 1.18 * roundSpeedBoost;
  state.activeEvent = event;
  event.moves.forEach((move) => {
    playMoveSound(move.direction, move.count);
    if (move.direction === "out") {
      state.currentInside -= move.count;
      state.doorOpenUntil = performance.now() + 520;
      for (let index = 0; index < move.count; index += 1) {
        state.people.push(createMovingPersonOut(speed, index));
      }
    } else {
      for (let index = 0; index < move.count; index += 1) {
        state.people.push(createMovingPersonIn(speed, index));
      }
    }
  });
}

function createMovingPersonIn(speed, index) {
  return {
    x: -62,
    y: walkwayY,
    targetX: leftDoorwayX,
    targetY: walkwayY,
    size: 1.7,
    speed,
    delay: index * groupStagger,
    mode: "entering",
    countedInside: false,
    alpha: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

function createMovingPersonOut(speed, index) {
  return {
    x: rightDoorwayX,
    y: walkwayY,
    targetX: canvas.width + 62,
    targetY: walkwayY,
    size: 1.7,
    speed,
    delay: index * groupStagger,
    mode: "leaving",
    alpha: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

function updatePerson(person, delta) {
  if (person.delay > 0) {
    person.delay -= delta;
    return;
  }
  const dx = person.targetX - person.x;
  const dy = person.targetY - person.y;
  const distance = Math.hypot(dx, dy);
  const step = person.speed * delta * 0.12;
  person.bob += delta * 0.015;
  if (person.mode === "entering" && !person.countedInside && distance <= doorwayCountDistance) {
    state.currentInside += 1;
    person.countedInside = true;
  }
  if (distance <= step) {
    person.x = person.targetX;
    person.y = person.targetY;
    if (person.mode === "entering" && !person.countedInside) state.currentInside += 1;
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
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  drawHouse();
  state?.people.forEach(drawPerson);
}

function drawHouse() {
  const leftDoorOpen = state?.people?.some(
    (person) => person.mode === "entering" && Math.abs(person.x - leftDoorwayX) < 68
  );
  const rightDoorOpen = state?.people?.some(
    (person) => person.mode === "leaving" && Math.abs(person.x - rightDoorwayX) < 68
  );

  ctx.fillStyle = "#000";
  ctx.fillRect(334, 270, 332, 234);
  ctx.beginPath();
  ctx.moveTo(300, 276);
  ctx.lineTo(500, 104);
  ctx.lineTo(704, 276);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(574, 126, 72, 110);
  ctx.fillRect(564, 116, 92, 18);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 6;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(315, 273);
  ctx.lineTo(500, 118);
  ctx.lineTo(689, 273);
  ctx.stroke();

  ctx.fillStyle = "#fff";
  if (leftDoorOpen) {
    ctx.fillRect(328, 378, 27, 126);
  }
  if (rightDoorOpen) {
    ctx.fillRect(645, 378, 27, 126);
  }

  ctx.fillStyle = "#fff";
  ctx.fillRect(526, 310, 66, 66);
  ctx.fillStyle = "#000";
  ctx.fillRect(555, 310, 8, 66);
  ctx.fillRect(526, 339, 66, 8);
}

function drawPerson(person) {
  const bob = Math.sin(person.bob) * 2;
  ctx.save();
  ctx.globalAlpha = person.alpha ?? 1;
  ctx.translate(person.x, person.y + bob);
  ctx.scale(person.size || 1, person.size || 1);
  ctx.lineCap = "round";
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(0, -22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10, -10, 20, 30);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-9, -6);
  ctx.lineTo(-14, 15);
  ctx.moveTo(9, -6);
  ctx.lineTo(14, 15);
  ctx.moveTo(-5, 18);
  ctx.lineTo(-7, 39);
  ctx.moveTo(5, 18);
  ctx.lineTo(7, 39);
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
