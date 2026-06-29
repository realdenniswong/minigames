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
    title: "Flappy Bird Style",
    meta: "Tap timing challenge",
    icon: "F",
    url: "games/flappy/index.html",
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
