# Dennis Mini Games

An HTML5 mini-game library that runs as static files. No server is required for local play, and it can also be hosted on GitHub Pages.

## Games

- Minesweeper with easy, medium, and hard board sizes, plus autosave and progress loading
- Sudoku with timer, notes mode, automatic removal of matching notes in the same row, column, and 3×3 box, completed numbers grayed out on the number pad, undo/redo, highlighting, autosave, and progress loading
- Flappy Bird with touch-friendly controls
- Snake with touch controls and generated maps
- Math Sprint with difficulty levels and numpad answers
- Word Color focus drill
- Cowboy Duel with difficulty levels and randomized countdown timing
- In & Out house-counting memory game with moving groups
- Simon Said memory sequence drill

## How To Play

Open `index.html` to launch the game library, then choose a game.

In Sudoku, Undo and Redo restore number changes, note changes, and erased cells, including any notes automatically removed by a placement. Use the buttons or Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z (or Ctrl/Cmd+Y) to redo. The last 100 edits are kept with your saved puzzle; starting a new puzzle clears its history.

On GitHub Pages, open the site URL and choose a game from the library. The library automatically downloads every game for offline play, including games you haven't opened yet.

## Offline Play on Android and iPhone

1. Open the published HTTPS website while connected to the internet.
2. Leave the library open until the status says **Ready offline**. If the download fails, reconnect and tap **Retry download**.
3. Add the library to your home screen:
   - **Android:** In Chrome, open the three-dot menu and select **Add to Home screen** or **Install app**.
   - **iPhone:** In Safari, tap **Share**, then **Add to Home Screen**.
4. Open the home-screen icon while still online and wait for **Ready offline** there too. This ensures the installed app has its own offline download if the browser keeps its storage separate.
5. You can now disconnect and launch any game, return to the library, and reload pages without internet.

Offline play also works in a regular browser tab after the download finishes; installation is optional. A direct link to any game starts downloading the full library too.

Downloads are saved in this browser on this device. Clearing website data or browser storage cleanup can remove them; reopen the app online to download again. Scores and puzzle saves continue to use local device storage.

Offline downloads require HTTPS (as provided by GitHub Pages) or localhost for development. Opening the folder's `index.html` directly on a computer still works without a server or internet.

Updates download automatically when you visit online. Close all tabs and home-screen windows for the game, then reopen it to use an update; an update won't interrupt a game in progress.

If the iPhone home-screen version opens game pages with Safari buttons, delete the old home-screen icon and add it again from Safari after the latest site update loads.

## Project Structure

The project is organized like a small game portal:

- `index.html`, `styles.css`, `app.js`: the library screen
- `offline.js`, `service-worker.js`: automatic full-library offline download and status
- `manifest.webmanifest`, `icon.svg`, `icons/`: Android and iPhone home-screen app metadata and icons
- `games/shared/shell.css`: shared game-page shell styles
- `games/minesweeper/`: Minesweeper game bundle
- `games/sudoku/`: Sudoku game bundle
- `games/flappy/`: Flappy Bird game bundle
- `games/snake/`: Snake game bundle
- `games/math-sprint/`, `games/word-color/`, `games/cowboy-duel/`, `games/simon-said/`: standalone brain game pages
- `games/in-and-out/`: house-counting memory game bundle
- `games/brain/`: shared brain-game engine and legacy combined page

Most game bundles contain their own:

- `index.html`
- `styles.css`
- `game.js`

The standalone brain game pages reuse the shared styles and script from `games/brain/` so the four games stay consistent without copying the same code four times.

To add another game, create a new folder under `games/` and add it to the game list in `app.js`. Include `../../offline.js` on its page and add its HTML, CSS, scripts, and any other assets to `APP_FILES` in `service-worker.js`.

Whenever a cached file changes, bump `CACHE_VERSION` in `service-worker.js` before publishing. Each release downloads a complete new cache before replacing the previous version. Cache names include the app's scope so cleanup doesn't affect other sites on the same GitHub Pages origin.

To verify a release, open it online until **Ready offline** appears, switch the browser to offline (or enable airplane mode), then reload the library and open every game. Test both the site root and a nested hosting path such as `/minigames/`, including links with version queries.
