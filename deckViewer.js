"use strict";

(function(){
  let els = null;
  let activeTab = "all";

  const TABS = [
    { id: "all", label: "전체 카드", getCards: () => getDeck() },
    { id: "hand", label: "손에 든 카드", getCards: () => getHand() },
    { id: "discard", label: "버린 카드", getCards: () => getDiscard() },
  ];

  function initDeckViewer(){
    const button = document.querySelector("#deckViewerButton");
    if(!button) return;

    els = createDeckViewer();
    button.addEventListener("click", openDeckViewer);
  }

  function getDeck(){
    return typeof STARTER_DECK === "undefined" ? [] : [...STARTER_DECK];
  }

  function getHand(){
    return typeof S === "undefined" || !S ? [] : [...S.hand];
  }

  function getDiscard(){
    return typeof S === "undefined" || !S ? [] : [...S.discard];
  }

  function getCard(key){
    return typeof CARD_DB === "undefined" ? null : CARD_DB[key];
  }

  function getTypeLabel(type){
    return typeof typeLabel === "undefined" ? type : typeLabel(type);
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
        '<div class="deck-viewer-tabs" role="tablist" aria-label="카드 더미 선택">' +
          TABS.map(tabButtonHtml).join("") +
        '</div>' +
        '<div class="deck-viewer-summary"></div>' +
        '<div class="deck-viewer-grid"></div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeDeckViewer();
    });

    overlay.querySelector(".deck-viewer-close").addEventListener("click", closeDeckViewer);
    overlay.querySelectorAll(".deck-viewer-tab").forEach(button => {
      button.addEventListener("click", () => {
        activeTab = button.dataset.tab;
        renderDeckViewer();
      });
    });
    document.addEventListener("keydown", event => {
      if(event.key === "Escape" && overlay.classList.contains("show")) closeDeckViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      tabs: Array.from(overlay.querySelectorAll(".deck-viewer-tab")),
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
    const tab = TABS.find(item => item.id === activeTab) || TABS[0];
    const cards = tab.getCards();
    const counts = countCards(cards);
    const entries = Object.keys(counts)
      .map(key => ({ key, count: counts[key], card: getCard(key) }))
      .filter(entry => entry.card);

    els.tabs.forEach(button => {
      const selected = button.dataset.tab === tab.id;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    els.summary.textContent = tab.label + " " + cards.length + "장 / " + entries.length + "종류";
    els.grid.innerHTML = entries.length
      ? entries.map(deckCardHtml).join("")
      : '<div class="deck-viewer-empty">표시할 카드가 없습니다.</div>';
  }

  function tabButtonHtml(tab){
    return '<button type="button" class="deck-viewer-tab" role="tab" aria-selected="false" data-tab="' +
      escapeAttr(tab.id) + '">' + escapeHtml(tab.label) + '</button>';
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

  initDeckViewer();
})();
