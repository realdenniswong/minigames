const games = [
  {
    title: "Minesweeper",
    meta: "Easy, medium, hard",
    icon: "M",
    url: "games/minesweeper/index.html",
  },
  {
    title: "Sudoku",
    meta: "Timed number puzzle",
    icon: "S",
    url: "games/sudoku/index.html",
  },
  {
    title: "Flappy Bird",
    meta: "Tap timing challenge",
    icon: "F",
    url: "games/flappy/index.html",
  },
  {
    title: "Math Sprint",
    meta: "Timed numpad arithmetic",
    icon: "Ma",
    url: "games/math-sprint/index.html",
  },
  {
    title: "Word Color",
    meta: "Pick the ink color",
    icon: "W",
    url: "games/word-color/index.html",
  },
  {
    title: "Cowboy Duel",
    meta: "Draw faster than the computer",
    icon: "C",
    url: "games/cowboy-duel/index.html",
  },
  {
    title: "Simon Said",
    meta: "Repeat the memory chain",
    icon: "Si",
    url: "games/simon-said/index.html",
  },
  {
    title: "Snake",
    meta: "Classic maze chase",
    icon: "Sn",
    url: "games/snake/index.html",
  },
];

const gameList = document.getElementById("gameList");

function renderGameList() {
  gameList.innerHTML = "";
  games.forEach((game) => {
    const link = document.createElement("a");
    link.className = "game-card";
    link.href = game.url;
    link.innerHTML = `
      <span class="game-card-icon" aria-hidden="true">${game.icon}</span>
      <span>
        <strong>${game.title}</strong>
        <small>${game.meta}</small>
      </span>
    `;
    gameList.appendChild(link);
  });
}

renderGameList();
