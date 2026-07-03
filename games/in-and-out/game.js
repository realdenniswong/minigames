const canvas = document.getElementById("inoutCanvas");
const ctx = canvas.getContext("2d");
const difficultySelect = document.getElementById("inoutDifficulty");
const startButton = document.getElementById("startInout");
const scoreEl = document.getElementById("inoutScore");
const bestEl = document.getElementById("inoutBest");
const roundEl = document.getElementById("inoutRound");
const answerStateEl = document.getElementById("inoutAnswerState");
const answerPanel = document.getElementById("answerPanel");
const answerEntry = document.getElementById("answerEntry");
const submitAnswerButton = document.getElementById("submitAnswer");
const messageEl = document.getElementById("inoutMessage");

const totalRounds = 10;
const difficultySettings = {
  easy: { startMin: 1, startMax: 5, wavesMin: 4, wavesMax: 6, groupMax: 2, waveGap: 780, speedMin: 1.1, speedMax: 1.45 },
  medium: { startMin: 2, startMax: 8, wavesMin: 6, wavesMax: 8, groupMax: 3, waveGap: 540, speedMin: 1.15, speedMax: 1.9 },
  hard: { startMin: 3, startMax: 12, wavesMin: 8, wavesMax: 11, groupMax: 5, waveGap: 360, speedMin: 1.25, speedMax: 2.45 },
};

const colors = ["#d95e4f", "#4f8cc9", "#1c8f78", "#d39a21", "#6757c8", "#e28445"];
let state;
let animationFrame = 0;
let sequenceTimer = 0;
let audioContext;

const savedDifficulty = localStorage.getItem("offlineMiniGames.inout.difficulty");
if (difficultySettings[savedDifficulty]) difficultySelect.value = savedDifficulty;

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min);
}

function resetGame() {
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
  const difficulty = difficultySelect.value;
  state = {
    running: false,
    answering: false,
    finished: false,
    difficulty,
    score: 0,
    round: 0,
    best: Number(localStorage.getItem(`offlineMiniGames.inout.best.${difficulty}`) || 0),
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
  roundEl.textContent = `0/${totalRounds}`;
  answerStateEl.textContent = "-";
  startButton.textContent = "Start";
  hideAnswerPanel();
  setMessage("Press Start.");
  window.MiniGameShare?.setResult("");
  drawScene();
}

function startGame() {
  unlockAudio();
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
  const difficulty = difficultySelect.value;
  state = {
    ...state,
    running: true,
    answering: false,
    finished: false,
    difficulty,
    score: 0,
    round: 0,
    best: Number(localStorage.getItem(`offlineMiniGames.inout.best.${difficulty}`) || 0),
    input: "",
    results: [],
  };
  localStorage.setItem("offlineMiniGames.inout.difficulty", difficulty);
  scoreEl.textContent = "0";
  bestEl.textContent = state.best;
  startButton.textContent = "Restart";
  window.MiniGameShare?.setResult("");
  nextRound();
}

function nextRound() {
  clearTimeout(sequenceTimer);
  state.round += 1;
  if (state.round > totalRounds) {
    finishGame();
    return;
  }
  state.answering = false;
  state.input = "";
  answerStateEl.textContent = "-";
  hideAnswerPanel();
  roundEl.textContent = `${state.round}/${totalRounds}`;
  createRound();
  setMessage(`Starting: ${state.startedInside}`);
  sequenceTimer = setTimeout(() => {
    setMessage("Watch the door.");
    startAnimation();
  }, 650);
  drawScene();
}

function createRound() {
  const settings = difficultySettings[state.difficulty];
  const waveCount = randomInt(settings.wavesMin, settings.wavesMax);
  let inside = randomInt(settings.startMin, settings.startMax);
  state.startedInside = inside;
  state.currentInside = inside;
  state.target = inside;
  state.people = [];
  state.waves = [];
  state.lastTimeStart = 0;
  state.doorOpenUntil = 0;

  let time = 750;
  for (let index = 0; index < waveCount; index += 1) {
    const canExit = inside > 0;
    const direction = !canExit || Math.random() < 0.56 ? "in" : "out";
    const maxGroup = direction === "out" ? Math.min(settings.groupMax, inside) : settings.groupMax;
    const count = Math.max(1, randomInt(1, maxGroup));
    inside += direction === "in" ? count : -count;
    state.waves.push({ direction, count, time, launched: false });
    time += settings.waveGap + randomInt(-120, 180);
  }

  state.sequenceEnd = time + 1300;
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
  const count = wave.direction === "out" ? Math.min(wave.count, state.currentInside) : wave.count;
  if (count <= 0) return;
  state.doorOpenUntil = performance.now() + 680;
  playMoveSound(wave.direction);
  if (wave.direction === "out") state.currentInside -= count;
  for (let index = 0; index < count; index += 1) {
    if (wave.direction === "out") {
      state.people.push(createMovingPersonOut(index, count));
    } else {
      state.people.push(createMovingPersonIn(index, count));
    }
  }
}

function createMovingPersonIn(index, count) {
  const settings = difficultySettings[state.difficulty];
  const lane = index - (count - 1) / 2;
  const side = Math.random() < 0.5 ? -1 : 1;
  return {
    x: side < 0 ? -52 - randomInt(0, 80) : canvas.width + 52 + randomInt(0, 80),
    y: 424 + lane * 22 + randomInt(-6, 6),
    targetX: 461 + lane * 3,
    targetY: 374 + lane * 2,
    size: randomFloat(1.22, 1.38),
    speed: randomFloat(settings.speedMin, settings.speedMax),
    color: colors[randomInt(0, colors.length - 1)],
    mode: "entering",
    alpha: 1,
    bob: Math.random() * Math.PI * 2,
  };
}

function createMovingPersonOut(index, count) {
  const settings = difficultySettings[state.difficulty];
  const lane = index - (count - 1) / 2;
  const side = Math.random() < 0.5 ? -1 : 1;
  return {
    x: 461 + lane * 5,
    y: 374 + lane * 2,
    targetX: side < 0 ? -58 - randomInt(0, 70) : canvas.width + 58 + randomInt(0, 70),
    targetY: 424 + lane * 24 + randomInt(-6, 6),
    size: randomFloat(1.22, 1.38),
    speed: randomFloat(settings.speedMin, settings.speedMax),
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
    if (person.mode === "entering") state.currentInside += 1;
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
  setMessage("How many are inside?");
  drawScene();
}

function handleAnswerKey(key) {
  if (!state.answering) return;
  if (key === "clear") state.input = "";
  if (key === "backspace") state.input = state.input.slice(0, -1);
  if (/^\d$/.test(key) && state.input.length < 2) state.input += key;
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
    setMessage("Correct.", "good");
    playResultSound(true);
  } else {
    setMessage(`Wrong. It was ${state.target}.`, "bad");
    playResultSound(false);
  }
  answerStateEl.textContent = String(state.target);
  state.answering = false;
  hideAnswerPanel();
  sequenceTimer = setTimeout(nextRound, 900);
}

function finishGame() {
  state.running = false;
  state.finished = true;
  state.best = Math.max(state.best, state.score);
  localStorage.setItem(`offlineMiniGames.inout.best.${state.difficulty}`, String(state.best));
  bestEl.textContent = state.best;
  startButton.textContent = "Start";
  answerStateEl.textContent = "-";
  setMessage(`Finished. Score: ${state.score}/${totalRounds}.`, state.score >= 7 ? "good" : "");
  window.MiniGameShare?.setResult(
    `Score ${state.score}/${totalRounds} on ${difficultySelect.options[difficultySelect.selectedIndex].text}.`
  );
}

function showAnswerPanel() {
  answerPanel.hidden = false;
  state.input = "";
  renderInput();
}

function hideAnswerPanel() {
  answerPanel.hidden = true;
  state.input = "";
  renderInput();
}

function setMessage(text, tone = "") {
  messageEl.textContent = text;
  messageEl.classList.toggle("good", tone === "good");
  messageEl.classList.toggle("bad", tone === "bad");
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
  const nearDoor = state?.people?.some((person) => Math.hypot(person.x - 461, person.y - 374) < 115);
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
  ctx.fillStyle = person.color;
  ctx.beginPath();
  ctx.arc(0, -18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-7, -9, 14, 22);
  ctx.strokeStyle = "#20242c";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
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

function playMoveSound(direction) {
  const context = unlockAudio();
  if (!context) return;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(direction === "in" ? 460 : 360, now);
  oscillator.frequency.exponentialRampToValueAtTime(direction === "in" ? 620 : 260, now + 0.08);
  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.11);
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

startButton.addEventListener("click", startGame);
difficultySelect.addEventListener("change", resetGame);
document.querySelectorAll("[data-answer-key]").forEach((button) => {
  button.addEventListener("click", () => handleAnswerKey(button.dataset.answerKey));
});
submitAnswerButton.addEventListener("click", submitAnswer);
document.addEventListener("keydown", handleKeyboard);
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(animationFrame);
  clearTimeout(sequenceTimer);
});
resetGame();
