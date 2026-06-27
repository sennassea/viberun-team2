"use strict";

(function(){
  let els = null;
  let getDeck = () => [];
  let getCard = () => null;
  let getTypeLabel = type => type;

  function initDeckViewer(options){
    const button = document.querySelector(options.buttonSelector);
    if(!button) return;

    getDeck = options.getDeck || getDeck;
    getCard = options.getCard || getCard;
    getTypeLabel = options.getTypeLabel || getTypeLabel;

    els = createDeckViewer();
    button.addEventListener("click", openDeckViewer);
  }

  function createDeckViewer(){
    const overlay = document.createElement("div");
    overlay.id = "deckViewerOverlay";
    overlay.className = "deck-viewer";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="deck-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="deckViewerTitle">' +
        '<div class="deck-viewer-head">' +
          '<h2 id="deckViewerTitle">보유 카드</h2>' +
          '<button type="button" class="deck-viewer-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="deck-viewer-summary"></div>' +
        '<div class="deck-viewer-grid"></div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeDeckViewer();
    });

    overlay.querySelector(".deck-viewer-close").addEventListener("click", closeDeckViewer);
    document.addEventListener("keydown", event => {
      if(event.key === "Escape" && overlay.classList.contains("show")) closeDeckViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      summary: overlay.querySelector(".deck-viewer-summary"),
      grid: overlay.querySelector(".deck-viewer-grid"),
      close: overlay.querySelector(".deck-viewer-close"),
    };
  }

  function openDeckViewer(){
    if(!els) return;
    renderDeckViewer();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function closeDeckViewer(){
    if(!els) return;
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  function renderDeckViewer(){
    const deck = getDeck();
    const counts = countCards(deck);
    const entries = Object.keys(counts)
      .map(key => ({ key, count: counts[key], card: getCard(key) }))
      .filter(entry => entry.card);

    els.summary.textContent = "총 " + deck.length + "장 / " + entries.length + "종류";
    els.grid.innerHTML = entries.map(deckCardHtml).join("");
  }

  function countCards(deck){
    return deck.reduce((counts, key) => {
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function deckCardHtml(entry){
    const card = entry.card;
    return '<div class="deck-viewer-card cost-' + escapeAttr(card.type) + '">' +
      '<div class="deck-viewer-count">x' + entry.count + '</div>' +
      '<div class="cost">' + card.cost + '</div>' +
      '<div class="cname">' + escapeHtml(card.name) + '</div>' +
      '<div class="art">' + escapeHtml(card.emoji) + '</div>' +
      '<div class="type ' + escapeAttr(card.type) + '">' + escapeHtml(getTypeLabel(card.type)) + '</div>' +
      '<div class="desc">' + escapeHtml(card.desc) + '</div>' +
    '</div>';
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/\s+/g, "-");
  }

  window.initDeckViewer = initDeckViewer;
})();
