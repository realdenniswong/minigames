(function () {
  const status = document.getElementById("offlineStatus");
  const hint = document.getElementById("offlineHint");
  const retryButton = document.getElementById("offlineRetry");
  const workerUrl = new URL("service-worker.js", document.currentScript.src);
  const scope = new URL("./", workerUrl).href;
  let registration;
  let registering = false;
  let checking = false;
  let ready = false;

  function showStatus(label, message, state, retry = false) {
    if (status) {
      status.textContent = label;
      status.dataset.state = state;
    }
    if (hint) hint.textContent = message;
    if (retryButton) retryButton.hidden = !retry;
  }

  function showReady() {
    ready = true;
    showStatus(
      navigator.onLine ? "Ready offline" : "Playing offline",
      "All games are saved on this device. You can play without internet.",
      "ready"
    );
  }

  function showFailure() {
    if (ready) return;
    showStatus(
      "Download incomplete",
      navigator.onLine
        ? "Couldn't save all games. Retry while connected to the internet."
        : "Connect to the internet to finish downloading the games.",
      "error",
      true
    );
  }

  function checkDownload(worker) {
    if (checking) return;
    checking = true;
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => finish(false), 30000);

    function finish(success) {
      window.clearTimeout(timeout);
      channel.port1.close();
      checking = false;
      if (success) showReady();
      else showFailure();
    }

    channel.port1.onmessage = (event) => finish(event.data?.ready === true);
    try {
      worker.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2]);
    } catch {
      finish(false);
    }
  }

  function watchWorker(worker) {
    if (!worker) return;
    function checkState() {
      if (worker.state === "activated") checkDownload(worker);
      else if (worker.state === "redundant") showFailure();
    }
    worker.addEventListener("statechange", checkState);
    checkState();
  }

  async function prepareOffline() {
    if (registering) return;
    registering = true;
    if (!ready) {
      showStatus(
        "Saving games…",
        "Keep this page open until all games are ready for offline play.",
        "downloading"
      );
    }
    try {
      registration = await navigator.serviceWorker.register(workerUrl.href, {
        scope,
        updateViaCache: "none",
      });
      watchWorker(registration.active);
      watchWorker(registration.installing);
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
    } catch {
      showFailure();
    } finally {
      registering = false;
    }
  }

  if (location.protocol === "file:") {
    showStatus("Playing from files", "No internet needed. Keep the game folder together.", "ready");
    return;
  }
  if (!window.isSecureContext) {
    showStatus("Online play", "Open the HTTPS website to save games for offline play.", "unavailable");
    return;
  }
  if (!("serviceWorker" in navigator)) {
    showStatus("Online play", "This browser doesn't support downloading games for offline play.", "unavailable");
    return;
  }

  retryButton?.addEventListener("click", prepareOffline);
  window.addEventListener("online", () => {
    if (ready) showReady();
    else prepareOffline();
  });
  window.addEventListener("offline", () => {
    if (ready) showReady();
    else showFailure();
  });
  prepareOffline();
})();
