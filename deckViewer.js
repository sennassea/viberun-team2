"use strict";

(function(){
  let els = null;
  let activeTab = "all";

  const EMPTY_TEXT = {
    all: "보유 중인 카드가 없습니다.",
    hand: "손에 든 카드가 없습니다.",
    discard: "버린 카드가 없습니다.",
  };

  const TABS = [
    { id: "all", label: "전체 카드", getCards: () => getDeck() },
    { id: "hand", label: "손에 든 카드", getCards: () => getHand() },
    { id: "discard", label: "버린 카드", getCards: () => getDiscard() },
  ];

  function initDeckViewer(){
    const triggers = [
      { el: document.querySelector("#deckViewerButton"), tab: "all" },
      { el: document.querySelector("#deckPile"), tab: "hand" },
      { el: document.querySelector("#discardPile"), tab: "discard" },
    ].filter(trigger => trigger.el);

    if(triggers.length === 0) return;

    els = createDeckViewer();
    triggers.forEach(bindOpenTrigger);
  }

  function bindOpenTrigger(trigger){
    trigger.el.addEventListener("click", () => openDeckViewer(trigger.tab));
    trigger.el.setAttribute("role", "button");
    trigger.el.setAttribute("tabindex", "0");
    trigger.el.addEventListener("keydown", event => {
      if(event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openDeckViewer(trigger.tab);
    });
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
    ensureDeckViewerScrollStyles();

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

  function ensureDeckViewerScrollStyles(){
    if(document.querySelector("#deckViewerScrollStyles")) return;

    const style = document.createElement("style");
    style.id = "deckViewerScrollStyles";
    style.textContent =
      ".deck-viewer-panel{min-height:0;}" +
      ".deck-viewer-grid{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}";
    document.head.appendChild(style);
  }

  function openDeckViewer(tabId){
    if(!els) return;
    if(tabId) activeTab = tabId;
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
    if(entries.length === 0){
      const empty = els.grid.querySelector(".deck-viewer-empty");
      if(empty) empty.textContent = EMPTY_TEXT[tab.id] || "해당하는 카드가 없습니다.";
    }
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
