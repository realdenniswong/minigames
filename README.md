# Dennis Mini Games

An HTML5 mini-game library that runs as static files. No server is required for local play, and it can also be hosted on GitHub Pages.

## Games

- Minesweeper with easy, medium, and hard board sizes
- Sudoku with timer, notes mode, row/column highlighting, and same-number highlighting
- Flappy Bird with touch-friendly controls
- Snake with touch controls and generated maps
- Math Sprint with difficulty levels and numpad answers
- Word Color focus drill
- Cowboy Duel with difficulty levels and randomized countdown timing
- Simon Said memory sequence drill

## How To Play

Open `index.html` to launch the game library, then choose a game.

On GitHub Pages, open the site URL and choose a game from the library. The app includes home-screen metadata so it can be added to an iPhone home screen and opened more like a standalone app.

If the iPhone home-screen version opens game pages with Safari buttons, delete the old home-screen icon and add it again from Safari after the latest site update loads.

## Project Structure

The project is organized like a small game portal:

- `index.html`, `styles.css`, `app.js`: the library screen
- `manifest.webmanifest`, `icon.svg`: home-screen app metadata
- `games/shared/shell.css`: shared game-page shell styles
- `games/minesweeper/`: Minesweeper game bundle
- `games/sudoku/`: Sudoku game bundle
- `games/flappy/`: Flappy Bird game bundle
- `games/snake/`: Snake game bundle
- `games/math-sprint/`, `games/word-color/`, `games/cowboy-duel/`, `games/simon-said/`: standalone brain game pages
- `games/brain/`: shared brain-game engine and legacy combined page

Most game bundles contain their own:

- `index.html`
- `styles.css`
- `game.js`

The standalone brain game pages reuse the shared styles and script from `games/brain/` so the four games stay consistent without copying the same code four times.

To add another game, create a new folder under `games/` and add it to the game list in `app.js`.
