(function () {
  const shareButton = document.createElement("button");
  shareButton.type = "button";
  shareButton.className = "share-score-button";
  shareButton.textContent = "Share";
  let resultText = "";

  function visible(element) {
    return element && getComputedStyle(element).display !== "none";
  }

  function placeShareButton() {
    if (document.querySelector(".share-score-button")) return;
    const actions = document.querySelector(".screen-actions");
    const stats = document.querySelector(".stat-grid");
    const panel = document.querySelector(".side-panel");
    if (visible(actions)) {
      actions.appendChild(shareButton);
    } else if (stats) {
      stats.insertAdjacentElement("afterend", shareButton);
    } else if (panel) {
      panel.appendChild(shareButton);
    }
  }

  function getGameTitle() {
    return document.querySelector("h1")?.textContent.trim() || document.title || "Mini Games";
  }

  function getShareUrl() {
    const publicBaseUrl = "https://realdenniswong.github.io/minigames/";
    if (location.protocol !== "file:") return location.href;

    const marker = "/Dennis Minigames/";
    const decodedPath = decodeURIComponent(location.pathname);
    const markerIndex = decodedPath.indexOf(marker);
    if (markerIndex !== -1) {
      const relativePath = decodedPath.slice(markerIndex + marker.length);
      return `${publicBaseUrl}${encodeURI(relativePath)}`;
    }

    const gamesIndex = decodedPath.indexOf("/games/");
    if (gamesIndex !== -1) {
      const relativePath = decodedPath.slice(gamesIndex + 1);
      return `${publicBaseUrl}${encodeURI(relativePath)}`;
    }

    return publicBaseUrl;
  }

  function getScoreSummary() {
    if (resultText) return resultText;
    if (document.body.dataset.shareResult) return document.body.dataset.shareResult;

    const rows = [...document.querySelectorAll(".stat-grid > div")]
      .map((row) => {
        const label = row.querySelector("span")?.textContent.trim();
        const value = row.querySelector("strong")?.textContent.trim();
        return label && value ? `${label}: ${value}` : "";
      })
      .filter(Boolean);

    return rows.length ? rows.join(", ") : "Come play this game with me.";
  }

  function setResult(text) {
    resultText = text || "";
    if (resultText) {
      document.body.dataset.shareResult = resultText;
      shareButton.textContent = "Share result";
    } else {
      delete document.body.dataset.shareResult;
      shareButton.textContent = "Share";
    }
  }

  function setTemporaryLabel(text) {
    const original = resultText || document.body.dataset.shareResult ? "Share result" : "Share";
    shareButton.textContent = text;
    window.setTimeout(() => {
      shareButton.textContent = original;
    }, 1400);
  }

  async function copyShareText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setTemporaryLabel("Copied");
      return;
    }
    setTemporaryLabel("Copy failed");
  }

  async function shareScore() {
    const title = getGameTitle();
    const url = getShareUrl();
    const text = `I played ${title}: ${getScoreSummary()}`;
    const fullText = `${text}\n${url}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await copyShareText(fullText);
    } catch (error) {
      if (error?.name !== "AbortError") await copyShareText(fullText);
    }
  }

  document.addEventListener("DOMContentLoaded", placeShareButton);
  shareButton.addEventListener("click", shareScore);
  window.MiniGameShare = { setResult };
})();
