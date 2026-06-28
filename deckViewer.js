"use strict";

(function(){
  let els = null;
  let activeTab = "all";

  const SORT_OPTIONS = [
    { id: "order", label: "최신순" },
    { id: "name", label: "이름순" },
    { id: "cost", label: "코스트순" },
  ];

  const SORT_DIRECTIONS = [
    { id: "desc", label: "내림차순" },
    { id: "asc", label: "오름차순" },
  ];

  const sortState = {
    all: { type: "order", direction: "desc" },
    hand: { type: "order", direction: "desc" },
    discard: { type: "order", direction: "desc" },
  };

  const TYPE_FILTERS = [
    { id: "all", label: "모든 타입" },
    { id: "attack", label: "정화(공격)" },
    { id: "defense", label: "결계(방어)" },
    { id: "skill", label: "스킬(강화)" },
  ];

  const ATTRIBUTE_FILTERS = [
    { id: "all", label: "모든 속성" },
    { id: "spirit", label: "성불" },
    { id: "hope", label: "희망" },
    { id: "memory", label: "추억" },
  ];

  const filterState = {
    all: { type: "all", attribute: "all" },
    hand: { type: "all", attribute: "all" },
    discard: { type: "all", attribute: "all" },
  };

  const searchState = {
    all: "",
    hand: "",
    discard: "",
  };

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
        '<div class="deck-viewer-controls">' +
        '<label class="deck-viewer-search">검색 <input class="deck-viewer-search-input" type="search" placeholder="카드 이름"></label>' +
        '<div class="deck-viewer-sort" aria-label="카드 정렬">' +
          '<label>정렬 <select class="deck-viewer-sort-type">' + SORT_OPTIONS.map(optionHtml).join("") + '</select></label>' +
          '<label>방향 <select class="deck-viewer-sort-direction">' + SORT_DIRECTIONS.map(optionHtml).join("") + '</select></label>' +
        '</div>' +
        '<div class="deck-viewer-filter" aria-label="카드 필터">' +
          '<label>타입 <select class="deck-viewer-filter-type">' + TYPE_FILTERS.map(optionHtml).join("") + '</select></label>' +
          '<label>속성 <select class="deck-viewer-filter-attribute">' + ATTRIBUTE_FILTERS.map(optionHtml).join("") + '</select></label>' +
        '</div>' +
        '</div>' +
        '<div class="deck-viewer-grid"></div>' +
        '<div class="card-detail-backdrop" aria-hidden="true">' +
          '<div class="card-detail-panel" role="dialog" aria-modal="true" aria-labelledby="cardDetailTitle">' +
            '<button type="button" class="card-detail-close" aria-label="닫기">×</button>' +
            '<div class="card-detail-body"></div>' +
          '</div>' +
        '</div>' +
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
    overlay.querySelector(".deck-viewer-sort-type").addEventListener("change", event => {
      sortState[activeTab].type = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-sort-direction").addEventListener("change", event => {
      sortState[activeTab].direction = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-filter-type").addEventListener("change", event => {
      filterState[activeTab].type = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-filter-attribute").addEventListener("change", event => {
      filterState[activeTab].attribute = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-search-input").addEventListener("input", event => {
      searchState[activeTab] = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-grid").addEventListener("click", event => {
      const cardEl = event.target.closest(".deck-viewer-card");
      if(!cardEl) return;
      openCardDetail(cardEl.dataset.cardKey, Number(cardEl.dataset.cardCount || 1));
    });
    overlay.querySelector(".card-detail-backdrop").addEventListener("click", event => {
      if(event.target === event.currentTarget) closeCardDetail();
    });
    overlay.querySelector(".card-detail-close").addEventListener("click", closeCardDetail);
    document.addEventListener("keydown", event => {
      if(event.key !== "Escape" || !overlay.classList.contains("show")) return;
      if(overlay.querySelector(".card-detail-backdrop.show")){
        closeCardDetail();
        return;
      }
      closeDeckViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      tabs: Array.from(overlay.querySelectorAll(".deck-viewer-tab")),
      summary: overlay.querySelector(".deck-viewer-summary"),
      sortType: overlay.querySelector(".deck-viewer-sort-type"),
      sortDirection: overlay.querySelector(".deck-viewer-sort-direction"),
      filterType: overlay.querySelector(".deck-viewer-filter-type"),
      filterAttribute: overlay.querySelector(".deck-viewer-filter-attribute"),
      search: overlay.querySelector(".deck-viewer-search-input"),
      grid: overlay.querySelector(".deck-viewer-grid"),
      detailBackdrop: overlay.querySelector(".card-detail-backdrop"),
      detailBody: overlay.querySelector(".card-detail-body"),
      detailClose: overlay.querySelector(".card-detail-close"),
      close: overlay.querySelector(".deck-viewer-close"),
    };
  }

  function ensureDeckViewerScrollStyles(){
    if(document.querySelector("#deckViewerScrollStyles")) return;

    const style = document.createElement("style");
    style.id = "deckViewerScrollStyles";
    style.textContent =
      ".deck-viewer-panel{min-height:0;}" +
      ".deck-viewer-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:center;column-gap:1cqw;row-gap:.7cqh;padding:0 0 1cqh;}" +
      ".deck-viewer-sort,.deck-viewer-filter{display:flex;gap:.8cqw;min-width:0;}" +
      ".deck-viewer-filter{grid-column:1;grid-row:1 / span 2;justify-content:flex-start;}" +
      ".deck-viewer-search{grid-column:2;grid-row:1;justify-self:end;}" +
      ".deck-viewer-sort{grid-column:2;grid-row:2;justify-content:flex-end;}" +
      ".deck-viewer-sort label,.deck-viewer-filter label,.deck-viewer-search{display:flex;align-items:center;gap:.4cqw;color:var(--c-ink-soft);font-size:1.55cqh;font-weight:800;}" +
      ".deck-viewer-sort select,.deck-viewer-filter select,.deck-viewer-search input{height:3.6cqh;border:0.2cqh solid var(--c-panel-line);border-radius:.8cqh;background:rgba(255,255,255,.86);color:var(--c-ink);font-size:1.55cqh;font-weight:800;padding:0 .7cqw;}" +
      ".deck-viewer-search input{width:15cqw;}" +
      ".deck-viewer-grid{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}" +
      ".deck-viewer-card{font:inherit;color:var(--c-ink);cursor:pointer;text-align:inherit;transition:transform .14s ease,box-shadow .14s ease;}" +
      ".deck-viewer-card:hover,.deck-viewer-card:focus-visible{transform:translateY(-.6cqh);box-shadow:0 .9cqh 1.8cqh rgba(40,70,120,.28);outline:none;}" +
      ".card-detail-backdrop{position:absolute;inset:0;z-index:2;display:none;place-items:center;background:rgba(35,55,85,.34);border-radius:var(--r);backdrop-filter:blur(2px);}" +
      ".card-detail-backdrop.show{display:grid;}" +
      ".card-detail-panel{position:relative;width:min(54cqw,72cqh);max-height:68cqh;overflow:auto;background:linear-gradient(180deg,#fffdf6,#eef8ff);border:.35cqh solid var(--c-gold);border-radius:1.4cqh;box-shadow:0 1.6cqh 3.2cqh rgba(20,35,60,.3);padding:2.4cqh 2.2cqw;}" +
      ".card-detail-close{position:absolute;top:1cqh;right:1cqh;width:4cqh;height:4cqh;border-radius:50%;border:.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:2.8cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".card-detail-top{display:grid;grid-template-columns:13cqh minmax(0,1fr);gap:1.6cqw;align-items:center;padding-right:3.4cqh;}" +
      ".card-detail-art{height:13cqh;border-radius:1.2cqh;display:grid;place-items:center;font-size:7.5cqh;background:linear-gradient(160deg,#fff7d7,#dff3ff);border:.2cqh solid #d6e6f5;}" +
      ".card-detail-title h3{font-size:3.2cqh;line-height:1.1;margin-bottom:.8cqh;}" +
      ".card-detail-badges{display:flex;flex-wrap:wrap;gap:.6cqh;}" +
      ".card-detail-badge{min-height:3cqh;display:inline-flex;align-items:center;border-radius:1.5cqh;padding:.2cqh .9cqw;background:rgba(255,255,255,.82);border:.15cqh solid var(--c-panel-line);font-size:1.55cqh;font-weight:900;color:var(--c-ink-soft);}" +
      ".card-detail-badge.type-attack{color:#a82e2e;border-color:#f0b9b0;background:#fff1ef;}" +
      ".card-detail-badge.type-defense{color:#1f5fa5;border-color:#a9cdf0;background:#eef7ff;}" +
      ".card-detail-badge.type-skill{color:#2c7b55;border-color:#a9e0c2;background:#effbf4;}" +
      ".card-detail-desc{margin-top:1.8cqh;padding:1.4cqh 1.2cqw;border-radius:1cqh;background:rgba(255,255,255,.68);border:.15cqh solid var(--c-panel-line);font-size:1.9cqh;font-weight:800;line-height:1.45;white-space:pre-line;text-align:center;}" +
      ".card-detail-info{display:grid;grid-template-columns:1fr 1fr;gap:1cqh;margin-top:1.2cqh;}" +
      ".card-detail-info section{border-radius:1cqh;background:rgba(255,255,255,.62);border:.15cqh solid var(--c-panel-line);padding:1.1cqh 1cqw;}" +
      ".card-detail-info h4{font-size:1.65cqh;margin-bottom:.5cqh;color:var(--c-ink-soft);}" +
      ".card-detail-info p{font-size:1.65cqh;line-height:1.45;color:var(--c-ink);font-weight:700;}" +
      "@media (max-width:700px){.card-detail-panel{width:72cqw;}.card-detail-info{grid-template-columns:1fr;}.card-detail-top{grid-template-columns:10cqh minmax(0,1fr);}.card-detail-art{height:10cqh;font-size:6cqh;}}";
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
    closeCardDetail();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  function openCardDetail(key, count){
    const card = getCard(key);
    if(!els || !card) return;

    els.detailBody.innerHTML = cardDetailHtml(card, count);
    els.detailBackdrop.classList.add("show");
    els.detailBackdrop.setAttribute("aria-hidden", "false");
    els.detailClose.focus();
  }

  function closeCardDetail(){
    if(!els || !els.detailBackdrop) return;
    els.detailBackdrop.classList.remove("show");
    els.detailBackdrop.setAttribute("aria-hidden", "true");
  }

  function renderDeckViewer(){
    const tab = TABS.find(item => item.id === activeTab) || TABS[0];
    const cards = tab.getCards();
    const entries = sortEntries(filterEntries(buildCardEntries(cards), tab.id), tab.id);
    const visibleCount = entries.reduce((total, entry) => total + entry.count, 0);

    els.tabs.forEach(button => {
      const selected = button.dataset.tab === tab.id;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    els.sortType.value = sortState[tab.id].type;
    els.sortDirection.value = sortState[tab.id].direction;
    els.filterType.value = filterState[tab.id].type;
    els.filterAttribute.value = filterState[tab.id].attribute;
    els.search.value = searchState[tab.id];
    els.summary.textContent = tab.label + " " + visibleCount + "장 / " + entries.length + "종류";
    els.grid.innerHTML = entries.length
      ? entries.map(deckCardHtml).join("")
      : '<div class="deck-viewer-empty">표시할 카드가 없습니다.</div>';
    if(entries.length === 0){
      const empty = els.grid.querySelector(".deck-viewer-empty");
      if(empty) empty.textContent = EMPTY_TEXT[tab.id] || "해당하는 카드가 없습니다.";
      if(empty && cards.length > 0) empty.textContent = "조건에 맞는 카드가 없습니다.";
    }
  }

  function tabButtonHtml(tab){
    return '<button type="button" class="deck-viewer-tab" role="tab" aria-selected="false" data-tab="' +
      escapeAttr(tab.id) + '">' + escapeHtml(tab.label) + '</button>';
  }

  function optionHtml(option){
    return '<option value="' + escapeAttr(option.id) + '">' + escapeHtml(option.label) + '</option>';
  }

  function buildCardEntries(cards){
    const entriesByKey = {};
    cards.forEach((key, index) => {
      const card = getCard(key);
      if(!card) return;
      if(!entriesByKey[key]){
        entriesByKey[key] = { key, count: 0, card, order: index };
      }
      entriesByKey[key].count += 1;
      entriesByKey[key].order = index;
    });
    return Object.keys(entriesByKey).map(key => entriesByKey[key]);
  }

  function filterEntries(entries, tabId){
    const state = filterState[tabId] || filterState.all;
    const query = searchState[tabId].trim().toLowerCase();
    return entries.filter(entry => {
      const typeMatches = state.type === "all" || getCardFilterType(entry.card) === state.type;
      const attributeMatches = state.attribute === "all" || getCardFilterAttribute(entry.card) === state.attribute;
      const nameMatches = !query || String(entry.card.name).toLowerCase().includes(query);
      return typeMatches && attributeMatches && nameMatches;
    });
  }

  function getCardFilterType(card){
    const type = card.cardType || card.type || card.kind;
    if(type === "attack" || type === "purify" || type === "정화" || type === "공격") return "attack";
    if(type === "defense" || type === "barrier" || type === "결계" || type === "방어") return "defense";
    if(type === "skill" || type === "boost" || type === "스킬" || type === "강화") return "skill";
    return "";
  }

  function getCardFilterAttribute(card){
    const attribute = card.attribute || card.attr || card.element || card.property;
    if(attribute === "spirit" || attribute === "성불") return "spirit";
    if(attribute === "hope" || attribute === "희망") return "hope";
    if(attribute === "memory" || attribute === "추억") return "memory";
    return "";
  }

  function sortEntries(entries, tabId){
    const state = sortState[tabId] || sortState.all;
    const direction = state.direction === "asc" ? 1 : -1;

    return [...entries].sort((a, b) => {
      const compared = compareEntries(a, b, state.type);
      if(compared !== 0) return compared * direction;
      return a.order - b.order;
    });
  }

  function compareEntries(a, b, type){
    if(type === "name"){
      return a.card.name.localeCompare(b.card.name, "ko");
    }
    if(type === "cost"){
      return a.card.cost - b.card.cost;
    }
    return a.order - b.order;
  }

  function countCards(deck){
    return deck.reduce((counts, key) => {
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function deckCardHtml(entry){
    const card = entry.card;
    return '<button type="button" class="deck-viewer-card cost-' + escapeAttr(card.type) + '" data-card-key="' + escapeAttr(entry.key) + '" data-card-count="' + entry.count + '">' +
      '<div class="deck-viewer-count">x' + entry.count + '</div>' +
      '<div class="cost">' + card.cost + '</div>' +
      '<div class="cname">' + escapeHtml(card.name) + '</div>' +
      '<div class="art">' + escapeHtml(card.emoji) + '</div>' +
      '<div class="type ' + escapeAttr(card.type) + '">' + escapeHtml(getTypeLabel(card.type)) + '</div>' +
      '<div class="desc">' + escapeHtml(card.desc) + '</div>' +
    '</button>';
  }

  function cardDetailHtml(card, count){
    const typeId = getCardFilterType(card) || card.type;
    const attrId = getCardFilterAttribute(card);
    return '<div class="card-detail-top">' +
        '<div class="card-detail-art">' + escapeHtml(card.emoji) + '</div>' +
        '<div class="card-detail-title">' +
          '<h3 id="cardDetailTitle">' + escapeHtml(card.name) + '</h3>' +
          '<div class="card-detail-badges">' +
            '<span class="card-detail-badge">정신력 ' + escapeHtml(card.cost) + '</span>' +
            '<span class="card-detail-badge type-' + escapeAttr(typeId) + '">' + escapeHtml(getFriendlyTypeLabel(card)) + '</span>' +
            '<span class="card-detail-badge">' + escapeHtml(getFriendlyAttributeLabel(card)) + '</span>' +
            '<span class="card-detail-badge">보유 x' + escapeHtml(count) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="card-detail-desc">' + escapeHtml(card.desc) + '</div>' +
      '<div class="card-detail-info">' +
        '<section><h4>카드 종류</h4><p>' + escapeHtml(getTypeDescription(card)) + '</p></section>' +
        '<section><h4>카드 속성</h4><p>' + escapeHtml(getAttributeDescription(attrId)) + '</p></section>' +
      '</div>';
  }

  function getFriendlyTypeLabel(card){
    const type = getCardFilterType(card);
    if(type === "attack") return "정화";
    if(type === "defense") return "결계";
    if(type === "skill") return "스킬";
    return getTypeLabel(card.type);
  }

  function getTypeDescription(card){
    const type = getCardFilterType(card);
    if(type === "attack") return "몬스터의 미련 게이지를 줄여 마음을 가볍게 하는 카드입니다.";
    if(type === "defense") return "플레이어에게 마음의 결계를 부여해 스트레스 공격을 먼저 막아줍니다.";
    if(type === "skill") return "직접 정화하지 않고 회복, 카드 뽑기, 상태 변화 같은 다양한 도움을 줍니다.";
    return "전투 흐름에 특별한 효과를 더하는 카드입니다.";
  }

  function getFriendlyAttributeLabel(card){
    const attr = getCardFilterAttribute(card);
    if(attr === "hope") return "희망";
    if(attr === "memory") return "추억";
    if(attr === "spirit") return "성불";
    return card.attribute || card.attr || card.element || card.property || "속성 없음";
  }

  function getAttributeDescription(attribute){
    if(attribute === "hope") return "상대의 절망을 위로하고 마음을 안정시키는 따뜻한 속성입니다.";
    if(attribute === "memory") return "잊혀진 기억을 되돌려 인간성을 회복시키는 다정한 속성입니다.";
    if(attribute === "spirit") return "남아있는 미련을 정화하여 편안히 승천시키는 맑은 속성입니다.";
    return "아직 자세한 설명이 정해지지 않은 속성입니다.";
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
