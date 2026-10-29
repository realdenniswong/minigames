// Bump this version whenever a game or other cached file changes.
const CACHE_VERSION = "v1";
const CACHE_PREFIX = `dennis-mini-games:${self.registration.scope}:`;
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const APP_FILES = [
  "index.html",
  "styles.css",
  "app.js",
  "offline.js",
  "manifest.webmanifest",
  "icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "games/shared/shell.css",
  "games/shared/share.js",
  "games/minesweeper/index.html",
  "games/minesweeper/styles.css",
  "games/minesweeper/game.js",
  "games/sudoku/index.html",
  "games/sudoku/styles.css",
  "games/sudoku/game.js",
  "games/flappy/index.html",
  "games/flappy/styles.css",
  "games/flappy/game.js",
  "games/snake/index.html",
  "games/snake/styles.css",
  "games/snake/game.js",
  "games/brain/index.html",
  "games/brain/styles.css",
  "games/brain/game.js",
  "games/math-sprint/index.html",
  "games/word-color/index.html",
  "games/cowboy-duel/index.html",
  "games/in-and-out/index.html",
  "games/in-and-out/styles.css",
  "games/in-and-out/game.js",
  "games/simon-said/index.html",
];
const APP_URLS = APP_FILES.map((file) => new URL(file, self.registration.scope).href);
const APP_URL_SET = new Set(APP_URLS);
let download;

function downloadApp() {
  if (!download) {
    download = caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_URLS.map((url) => new Request(url, { cache: "reload" }))))
      .finally(() => { download = null; });
  }
  return download;
}

self.addEventListener("install", (event) => {
  // Installation succeeds only when the entire library is saved. Updates wait
  // until existing game tabs close, so a download never interrupts a game.
  event.waitUntil(downloadApp());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // The HTML pages use version queries, and phone shortcuts may use directory
  // URLs. Both should resolve to the same fully downloaded files.
  url.search = "";
  url.hash = "";
  if (url.pathname.endsWith("/")) url.pathname += "index.html";
  if (!APP_URL_SET.has(url.href)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(url.href)) || fetch(event.request);
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PREPARE_OFFLINE" || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const savedUrls = new Set((await cache.keys()).map((request) => request.url));
      // Re-download if the browser has removed any of the saved files.
      if (!APP_URLS.every((url) => savedUrls.has(url))) await downloadApp();
      event.ports[0].postMessage({ ready: true });
    } catch {
      event.ports[0].postMessage({ ready: false });
    }
  })());
});
