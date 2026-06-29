const games = [
  {
    id: "minesweeper",
    title: "Minesweeper",
    meta: "Easy, medium, hard",
    icon: "M",
    url: "games/minesweeper/index.html",
  },
  {
    id: "sudoku",
    title: "Sudoku",
    meta: "Timed number puzzle",
    icon: "S",
    url: "games/sudoku/index.html",
  },
  {
    id: "flappy",
    title: "Flappy Bird Style",
    meta: "Tap timing challenge",
    icon: "F",
    url: "games/flappy/index.html",
  },
];

const gameMenu = document.getElementById("gameMenu");
const gameList = document.getElementById("gameList");
const gameStage = document.getElementById("gameStage");
const gameFrame = document.getElementById("gameFrame");
const stageTitle = document.getElementById("stageTitle");
const fullscreenButton = document.getElementById("fullscreenGame");
let fullscreenActive = false;

function sizeGameFrame() {
  if (gameStage.hidden || fullscreenActive) return;
  const frameTop = gameFrame.getBoundingClientRect().top;
  const bottomSpace = 16;
  const height = Math.max(360, window.innerHeight - frameTop - bottomSpace);
  gameFrame.style.height = `${height}px`;
}

function renderGameList() {
  gameList.innerHTML = "";
  games.forEach((game) => {
    const button = document.createElement("button");
    button.className = "game-card";
    button.type = "button";
    button.innerHTML = `
      <span class="game-card-icon" aria-hidden="true">${game.icon}</span>
      <span>
        <strong>${game.title}</strong>
        <small>${game.meta}</small>
      </span>
    `;
    button.addEventListener("click", () => openGame(game));
    gameList.appendChild(button);
  });
}

function openGame(game) {
  stageTitle.textContent = game.title;
  gameFrame.src = game.url;
  gameMenu.hidden = true;
  gameStage.hidden = false;
  requestAnimationFrame(sizeGameFrame);
}

function showGameMenu() {
  exitFullscreenMode();
  gameFrame.src = "about:blank";
  gameStage.hidden = true;
  gameMenu.hidden = false;
}

function toggleFullscreenMode() {
  const nextState = !document.body.classList.contains("fullscreen-mode");
  fullscreenActive = nextState;
  document.body.classList.toggle("fullscreen-mode", nextState);
  fullscreenButton.textContent = nextState ? "Exit Fullscreen" : "Fullscreen";
  gameFrame.style.height = nextState ? "100dvh" : "";
  if (!nextState) requestAnimationFrame(sizeGameFrame);
  sendFullscreenState();
  if (nextState && gameStage.requestFullscreen) {
    gameStage.requestFullscreen().catch(() => {});
  } else if (!nextState && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function exitFullscreenMode() {
  fullscreenActive = false;
  document.body.classList.remove("fullscreen-mode");
  fullscreenButton.textContent = "Fullscreen";
  gameFrame.style.height = "";
  requestAnimationFrame(sizeGameFrame);
  sendFullscreenState();
  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

document.getElementById("backToMenu").addEventListener("click", showGameMenu);
fullscreenButton.addEventListener("click", toggleFullscreenMode);
gameFrame.addEventListener("load", sendFullscreenState);
window.addEventListener("resize", sizeGameFrame);
window.addEventListener("orientationchange", () => setTimeout(sizeGameFrame, 250));
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    fullscreenActive = false;
    document.body.classList.remove("fullscreen-mode");
    fullscreenButton.textContent = "Fullscreen";
    sendFullscreenState();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && !gameStage.hidden) showGameMenu();
});

renderGameList();

function sendFullscreenState() {
  if (!gameFrame.contentWindow) return;
  gameFrame.contentWindow.postMessage({ type: "arcade-fullscreen", fullscreen: fullscreenActive }, "*");
}
