# Dennis Mini Games

Open `index.html` to launch the arcade library.

The project is now organized like an old Flash-game portal:

- `index.html`, `styles.css`, `app.js`: the arcade shell and game selector
- `games/minesweeper/`: Minesweeper bundle
- `games/sudoku/`: Sudoku bundle
- `games/flappy/`: Flappy Bird style bundle

Each game bundle contains its own:

- `index.html`
- `styles.css`
- `game.js`

That means a future game can be added by creating a new folder under `games/` and adding it to the game list in the root `app.js`.
