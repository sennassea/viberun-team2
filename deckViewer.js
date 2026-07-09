"use strict";

(function(){
  const CODEX_KEY = "viberunCardCodex";
  let els = null;
  let activeTab = "all";
  let viewerMode = "deck";
  let codexSection = "cards";
  let detailEntries = [];
  let activeDetailIndex = -1;
  let showUpgradePreview = false;
  let pickMode = null;
  let selectedPickKey = null;
  let selectedPickUid = null;
  let selectedPickMultiIds = new Set();

  const SORT_OPTIONS = [
    { id: "order", label: "최신순" },
    { id: "name", label: "이름순" },
    { id: "cost", label: "코스트순" },
    { id: "rarity", label: "등급순" },
  ];

  const RARITY_ORDER = { starter: 0, common: 1, uncommon: 2, rare: 3, special: 4 };

  const SORT_DIRECTIONS = [
    { id: "desc", label: "내림차순" },
    { id: "asc", label: "오름차순" },
  ];

  const sortState = {
    all: { type: "order", direction: "desc" },
    hand: { type: "order", direction: "desc" },
    discard: { type: "order", direction: "desc" },
    exhaust: { type: "order", direction: "desc" },
    codexCards: { type: "order", direction: "desc" },
    codexRelics: { type: "order", direction: "desc" },
    codexPotions: { type: "order", direction: "desc" },
  };

  const TYPE_FILTERS = [
    { id: "all", label: "모든 타입" },
    { id: "attack", label: "정화(공격)" },
    { id: "defense", label: "결계(방어)" },
    { id: "skill", label: "의식(강화)" },
    { id: "status", label: "상태이상" },
  ];

  const DECK_FILTERS = [
    { id: "all", label: "모든 덱" },
    { id: "general", label: "범용" },
    { id: "barrier", label: "결계 덱" },
    { id: "memory", label: "회상 덱" },
    { id: "soul_mark", label: "성불 표식 덱" },
    { id: "hanpuri", label: "한풀이 덱" },
    { id: "gutpan", label: "굿판 덱" },
  ];

  const DECK_ID_MAP = {
    "결계": "barrier", "결계 덱": "barrier", "barrier": "barrier",
    "회상": "memory", "회상 덱": "memory", "memory": "memory",
    "성불 표식": "soul_mark", "성불 표식 덱": "soul_mark", "soul_mark": "soul_mark",
    "한풀이": "hanpuri", "한풀이 덱": "hanpuri", "hanpuri": "hanpuri",
    "굿판": "gutpan", "굿판 덱": "gutpan", "gutpan": "gutpan",
    "범용": "general", "범용 보조 덱": "general", "general": "general",
  };

  const filterState = {
    all: { type: "all", deck: "all" },
    hand: { type: "all", deck: "all" },
    discard: { type: "all", deck: "all" },
    exhaust: { type: "all", deck: "all" },
    codexCards: { type: "all", deck: "all" },
    codexRelics: { type: "all", deck: "all" },
    codexPotions: { type: "all", deck: "all" },
  };

  const searchState = {
    all: "",
    hand: "",
    discard: "",
    exhaust: "",
    codexCards: "",
    codexRelics: "",
    codexPotions: "",
  };

  const EMPTY_TEXT = {
    all: "보유 중인 주문이 없습니다.",
    hand: "뽑을 주문이 없습니다.",
    discard: "버린 주문이 없습니다.",
    exhaust: "소멸된 주문이 없습니다.",
  };

  const TABS = [
    { id: "all", label: "전체 주문", getCards: () => getDeck() },
    { id: "hand", label: "뽑을 주문", getCards: () => getHandPool() },
    { id: "discard", label: "버린 주문", getCards: () => getDiscard() },
    { id: "exhaust", label: "소멸된 주문", getCards: () => getExhaust() },
  ];

  const CODEX_SECTIONS = [
    { id: "cards", tabId: "codexCards", label: "주문", title: "주문 도감", icon: "🃏", image: "assets/ui_buttons/codex_cards.png", tabImage: "assets/ui_buttons/codex_tab_cards.png" },
    { id: "relics", tabId: "codexRelics", label: "법구", title: "법구 도감", icon: "🏺", image: "assets/ui_buttons/codex_relics.png", tabImage: "assets/ui_buttons/codex_tab_relics.png" },
    { id: "potions", tabId: "codexPotions", label: "약병", title: "약병 도감", icon: "🧪", image: "assets/ui_buttons/codex_potions.png", tabImage: "assets/ui_buttons/codex_tab_potions.png" },
  ];

  function initDeckViewer(){
    markEncounteredCards(getStarterDeckKeys());

    const triggers = [
      { el: document.querySelector("#deckViewerButton"), tab: "all" },
      { el: document.querySelector("#deckPile"), tab: "hand" },
      { el: document.querySelector("#discardPile"), tab: "discard" },
      { el: document.querySelector("#exhaustPile"), tab: "exhaust" },
    ].filter(trigger => trigger.el);
    const codexTrigger = document.querySelector(".start-codex-button");

    if(triggers.length === 0 && !codexTrigger) return;

    els = createDeckViewer();
    triggers.forEach(bindOpenTrigger);
    if(codexTrigger) bindCodexTrigger(codexTrigger);
    window.BOHYUN_MARK_CARDS_ENCOUNTERED = markEncounteredCards;
    window.DECK_VIEWER_CLOSE = closeDeckViewer;
    window.OPEN_DECK_VIEWER = openDeckViewer;
    window.OPEN_DECK_VIEWER_CARD_PICK = openDeckViewerCardPick;
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

  function bindCodexTrigger(trigger){
    trigger.addEventListener("click", openCodexHome);
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.addEventListener("keydown", event => {
      if(event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openCodexHome();
    });
  }

  function getDeck(){
    return typeof STARTER_DECK === "undefined" ? [] : [...STARTER_DECK];
  }

  function getHandPool(){
    if(typeof S === "undefined" || !S) return [];
    return [...(S.hand || []), ...(S.draw || [])];
  }

  function getDiscard(){
    return typeof S === "undefined" || !S ? [] : [...S.discard];
  }

  function getExhaust(){
    return typeof S === "undefined" || !S || !Array.isArray(S.exhaust) ? [] : [...S.exhaust];
  }

  function getCard(key){
    return typeof CARD_DB === "undefined" ? null : CARD_DB[key];
  }

  function getStarterDeckKeys(){
    return typeof BASE_STARTER_DECK === "undefined" ? getDeck() : [...new Set(BASE_STARTER_DECK)];
  }

  function getAllCardKeys(){
    return typeof CARD_DB === "undefined" ? [] : Object.keys(CARD_DB);
  }

  function getAllRelics(){
    return typeof RELIC_DB === "undefined" ? [] : [...RELIC_DB];
  }

  function getAllPotions(){
    return typeof POTION_DB === "undefined" ? [] : [...POTION_DB];
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
          '<h2 id="deckViewerTitle">보유 주문</h2>' +
          '<button type="button" class="deck-viewer-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="deck-viewer-pick-cost" hidden></div>' +
        '<div class="codex-section-tabs" role="tablist" aria-label="도감 종류 선택">' +
          CODEX_SECTIONS.map(codexTabButtonHtml).join("") +
        '</div>' +
        '<div class="codex-home-grid">' +
          CODEX_SECTIONS.map(codexHomeButtonHtml).join("") +
        '</div>' +
        '<div class="deck-viewer-tabs" role="tablist" aria-label="주문 더미 선택">' +
          TABS.map(tabButtonHtml).join("") +
        '</div>' +
        '<div class="deck-viewer-controls">' +
        '<div class="deck-viewer-summary"></div>' +
        '<label class="deck-viewer-search">검색 <input class="deck-viewer-search-input" type="search" placeholder="이름"></label>' +
        '<div class="deck-viewer-sort" aria-label="주문 정렬">' +
          '<label>정렬 <select class="deck-viewer-sort-type">' + SORT_OPTIONS.map(optionHtml).join("") + '</select></label>' +
          '<label>방향 <select class="deck-viewer-sort-direction">' + SORT_DIRECTIONS.map(optionHtml).join("") + '</select></label>' +
        '</div>' +
        '<div class="deck-viewer-filter" aria-label="주문 필터">' +
          '<label class="deck-viewer-filter-type-label">타입 <select class="deck-viewer-filter-type">' + TYPE_FILTERS.map(optionHtml).join("") + '</select></label>' +
          '<label>덱 <select class="deck-viewer-filter-deck">' + DECK_FILTERS.map(optionHtml).join("") + '</select></label>' +
        '</div>' +
        '</div>' +
        '<div class="deck-viewer-grid-wrap">' +
          '<div class="deck-viewer-grid"></div>' +
          '<div class="deck-viewer-grid-fade deck-viewer-grid-fade-top" aria-hidden="true"></div>' +
          '<div class="deck-viewer-grid-fade deck-viewer-grid-fade-bottom" aria-hidden="true"></div>' +
        '</div>' +
        '<div class="deck-viewer-pick-footer" hidden>' +
          '<div class="deck-viewer-pick-help">기본 카드 1장을 선택하세요.</div>' +
          '<button type="button" class="deck-viewer-pick-cancel" hidden>취소</button>' +
          '<button type="button" class="deck-viewer-pick-confirm" disabled>제거</button>' +
        '</div>' +
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
    overlay.querySelectorAll(".codex-section-tab").forEach(button => {
      button.addEventListener("click", () => openCodexSection(button.dataset.codexSection));
    });
    overlay.querySelectorAll(".codex-home-card").forEach(button => {
      button.addEventListener("click", () => openCodexSection(button.dataset.codexSection));
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
    overlay.querySelector(".deck-viewer-filter-deck").addEventListener("change", event => {
      filterState[activeTab].deck = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-search-input").addEventListener("input", event => {
      searchState[activeTab] = event.target.value;
      renderDeckViewer();
    });
    overlay.querySelector(".deck-viewer-pick-confirm").addEventListener("click", confirmPickCard);
    overlay.querySelector(".deck-viewer-pick-cancel").addEventListener("click", cancelPickCard);
    overlay.querySelector(".deck-viewer-grid").addEventListener("click", event => {
      const cardEl = event.target.closest(".deck-viewer-card");
      if(!cardEl) return;
      if(pickMode){
        handlePickCard(cardEl);
        return;
      }
      openCardDetail(cardEl.dataset.cardKey, cardEl.dataset.cardIndex);
    });
    overlay.querySelector(".card-detail-backdrop").addEventListener("click", event => {
      const subcardOpen = event.target.closest("[data-card-detail-subcard-open]");
      if(subcardOpen){
        event.stopPropagation();
        openCardDetailByKey(subcardOpen.dataset.cardDetailSubcardOpen);
        return;
      }
      const upgrade = event.target.closest("[data-card-detail-upgrade]");
      if(upgrade){
        event.stopPropagation();
        toggleUpgradePreview();
        return;
      }
      const nav = event.target.closest("[data-card-detail-nav]");
      if(nav){
        event.stopPropagation();
        moveCardDetail(nav.dataset.cardDetailNav === "next" ? 1 : -1);
        return;
      }
      if(event.target === event.currentTarget) closeCardDetail();
    });
    overlay.querySelector(".card-detail-close").addEventListener("click", closeCardDetail);
    document.addEventListener("keydown", event => {
      if(!overlay.classList.contains("show")) return;
      const detailOpen = overlay.querySelector(".card-detail-backdrop.show");
      if(detailOpen && event.key === "ArrowLeft"){
        event.preventDefault();
        moveCardDetail(-1);
        return;
      }
      if(detailOpen && event.key === "ArrowRight"){
        event.preventDefault();
        moveCardDetail(1);
        return;
      }
      if(event.key !== "Escape") return;
      if(detailOpen){
        closeCardDetail();
        return;
      }
      closeDeckViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      title: overlay.querySelector("#deckViewerTitle"),
      pickCost: overlay.querySelector(".deck-viewer-pick-cost"),
      codexTabsWrap: overlay.querySelector(".codex-section-tabs"),
      codexTabs: Array.from(overlay.querySelectorAll(".codex-section-tab")),
      codexHome: overlay.querySelector(".codex-home-grid"),
      tabsWrap: overlay.querySelector(".deck-viewer-tabs"),
      tabs: Array.from(overlay.querySelectorAll(".deck-viewer-tab")),
      summary: overlay.querySelector(".deck-viewer-summary"),
      controls: overlay.querySelector(".deck-viewer-controls"),
      filterWrap: overlay.querySelector(".deck-viewer-filter"),
      filterTypeWrap: overlay.querySelector(".deck-viewer-filter-type-label"),
      sortType: overlay.querySelector(".deck-viewer-sort-type"),
      sortDirection: overlay.querySelector(".deck-viewer-sort-direction"),
      filterType: overlay.querySelector(".deck-viewer-filter-type"),
      filterDeck: overlay.querySelector(".deck-viewer-filter-deck"),
      search: overlay.querySelector(".deck-viewer-search-input"),
      grid: overlay.querySelector(".deck-viewer-grid"),
      gridWrap: overlay.querySelector(".deck-viewer-grid-wrap"),
      pickFooter: overlay.querySelector(".deck-viewer-pick-footer"),
      pickHelp: overlay.querySelector(".deck-viewer-pick-help"),
      pickCancel: overlay.querySelector(".deck-viewer-pick-cancel"),
      pickConfirm: overlay.querySelector(".deck-viewer-pick-confirm"),
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
      ".deck-viewer-pick-cost{flex:none;font-size:1.55cqh;font-weight:900;color:#a97a1f;padding:.2cqh 0 .6cqh;}" +
      ".deck-viewer-pick-cost.insufficient{color:#a82e2e;}" +
      ".deck-viewer-controls{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto;align-items:center;column-gap:1cqw;row-gap:.7cqh;padding:0 0 1cqh;}" +
      ".deck-viewer-sort,.deck-viewer-filter{display:flex;gap:.8cqw;min-width:0;}" +
      ".deck-viewer-summary{grid-column:1;grid-row:1;}" +
      ".deck-viewer-filter{grid-column:1;grid-row:2;justify-content:flex-start;}" +
      ".deck-viewer-search{grid-column:2;grid-row:1;justify-self:end;}" +
      ".deck-viewer-sort{grid-column:2;grid-row:2;justify-content:flex-end;}" +
      ".deck-viewer-sort label,.deck-viewer-filter label,.deck-viewer-search{display:flex;align-items:center;gap:.4cqw;color:var(--c-ink-soft);font-size:1.55cqh;font-weight:800;}" +
      ".deck-viewer-sort select,.deck-viewer-filter select,.deck-viewer-search input{height:3.6cqh;border:0.2cqh solid var(--c-panel-line);border-radius:.8cqh;background:rgba(255,255,255,.86);color:var(--c-ink);font-size:1.55cqh;font-weight:800;padding:0 .7cqw;}" +
      ".deck-viewer-search input{width:15cqw;}" +
      ".deck-viewer-grid{min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:rgba(180,140,70,.65) rgba(70,45,20,.12);}" +
      ".deck-viewer-grid::-webkit-scrollbar{width:.9cqh;}" +
      ".deck-viewer-grid::-webkit-scrollbar-track{background:rgba(70,45,20,.12);border-radius:1cqh;}" +
      ".deck-viewer-grid::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#d9b467,#a9772f);border-radius:1cqh;border:.15cqh solid rgba(70,45,20,.18);}" +
      ".deck-viewer-grid::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#e6c583,#bd8638);}" +
      ".deck-viewer-grid .card-hit-layer,.deck-viewer-grid .item-hit-layer{touch-action:pan-y;}" +
      ".deck-viewer.detail-open .deck-viewer-grid-wrap{visibility:hidden;}" +
      ".deck-viewer-card{font:inherit;color:var(--c-ink);cursor:pointer;text-align:inherit;transition:transform .14s ease,box-shadow .14s ease;}" +
      ".deck-viewer-card:hover,.deck-viewer-card:focus-visible{transform:translateY(-.6cqh);box-shadow:0 .9cqh 1.8cqh rgba(40,70,120,.28);outline:none;}" +
      ".deck-viewer.pick-mode .deck-viewer-card.pick-disabled{filter:grayscale(.8) opacity(.45);cursor:not-allowed;}" +
      ".deck-viewer.pick-mode .deck-viewer-card.pick-disabled:hover,.deck-viewer.pick-mode .deck-viewer-card.pick-disabled:focus-visible{transform:none;box-shadow:0 .5cqh 1.1cqh rgba(40,70,120,.18);}" +
      ".deck-viewer.pick-mode .deck-viewer-card.pick-selected{box-shadow:0 0 0 .32cqh var(--c-gold),0 .9cqh 1.8cqh rgba(40,70,120,.28);}" +
      ".deck-viewer-pick-footer[hidden]{display:none!important;}" +
      ".deck-viewer-pick-footer{flex:none;display:flex;align-items:center;justify-content:flex-end;gap:1cqw;padding-top:1cqh;}" +
      ".deck-viewer-pick-help{flex:1;color:var(--c-ink-soft);font-size:1.55cqh;font-weight:800;}" +
      ".deck-viewer-pick-confirm{min-width:11cqw;height:4.6cqh;border-radius:1cqh;border:.22cqh solid var(--c-gold);background:linear-gradient(180deg,#fff8d9,#ffe59a);color:#7a5510;font:inherit;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".deck-viewer-pick-confirm:disabled{filter:grayscale(.6);opacity:.55;cursor:not-allowed;}" +
      ".deck-viewer-pick-cancel{min-width:8cqw;height:4.6cqh;border-radius:1cqh;border:.18cqh solid rgba(90,80,60,.4);background:rgba(255,255,255,.65);color:var(--c-ink);font:inherit;font-size:1.6cqh;font-weight:800;cursor:pointer;}" +
      ".deck-viewer-pick-cancel[hidden]{display:none!important;}" +
      ".deck-viewer-close,.card-detail-close{background:transparent url(\"assets/ui_buttons/close.png\") center/100% 100% no-repeat;border:0;border-radius:0;color:transparent;font-size:0;box-shadow:none;}" +
      ".deck-viewer:not(.codex-mode) .deck-viewer-panel{width:min(78cqw,104cqh);aspect-ratio:720/585;max-height:78cqh;box-sizing:border-box;background:transparent url(\"assets/ui_panels/codex_section_panel.png\") center/100% 100% no-repeat;border:0;border-radius:0;box-shadow:0 1.2cqh 2.4cqh rgba(0,0,0,.2);padding:2.5cqh 2.2cqw 2.8cqh;}" +
      ".deck-viewer.codex-mode{z-index:240;}" +
      ".deck-viewer.codex-mode:not(.codex-home-mode) .deck-viewer-panel{width:min(78cqw,104cqh);aspect-ratio:720/585;max-height:78cqh;box-sizing:border-box;background:transparent url(\"assets/ui_panels/codex_section_panel.png\") center/100% 100% no-repeat;border:0;border-radius:0;box-shadow:0 1.2cqh 2.4cqh rgba(0,0,0,.2);padding:2.5cqh 2.2cqw 2.8cqh;}" +
      ".deck-viewer.codex-home-mode .deck-viewer-panel{width:min(57cqw,82cqh);aspect-ratio:2.12;max-height:44cqh;background:transparent url(\"assets/ui_panels/codex_popup_frame.png\") center/100% 100% no-repeat;border:0;border-radius:0;box-shadow:0 1.4cqh 2.8cqh rgba(0,0,0,.22);padding:3.6cqh 3.6cqw 2cqh;}" +
      ".deck-viewer.codex-home-mode .deck-viewer-head{border-bottom:0;padding-bottom:.2cqh;transform:translateY(-1.1cqh);}" +
      ".deck-viewer.codex-mode .deck-viewer-head h2{color:#4a2f0a;font-weight:900;letter-spacing:.05cqh;text-shadow:0 .12cqh 0 rgba(255,255,255,.65),0 .05cqh .3cqh rgba(74,47,10,.35);}" +
      ".codex-section-tabs{display:none;gap:.6cqw;margin:0 0 1.1cqh;}" +
      ".codex-section-tab{flex:1;height:4.2cqh;padding:0 1.2cqw;border-radius:.9cqh;border:0.2cqh solid var(--c-panel-line);background:linear-gradient(180deg,#fff8ea,#f0e0bd);color:var(--c-ink);font-family:var(--font-title);font-size:2.01cqh;font-weight:800;cursor:pointer;box-shadow:0 .25cqh .5cqh rgba(120,90,40,.14);transition:background .15s, box-shadow .15s, transform .15s;}" +
      ".codex-section-tab:hover{background:linear-gradient(180deg,#fffcf3,#f6e8c9);}" +
      ".codex-section-tab.active{background:linear-gradient(180deg,#ffe6a8,#e7b54a);border-color:var(--c-gold-deep);color:#5b3a12;box-shadow:0 .35cqh .9cqh rgba(176,125,29,.4), inset 0 0 0 .12cqh #fff6df;transform:translateY(-.1cqh);}" +
      ".codex-home-grid{display:none;grid-template-columns:repeat(3,auto);justify-content:center;column-gap:3.2cqw;row-gap:0;min-height:28cqh;align-items:center;margin:auto 0;}" +
      ".codex-home-card{height:23.5cqh;width:18cqh;justify-self:center;display:flex;align-items:center;justify-content:center;border:0;background:transparent;box-shadow:none;padding:0;color:var(--c-ink);font:inherit;cursor:pointer;}" +
      ".codex-home-card:hover,.codex-home-card:focus-visible{transform:translateY(-.5cqh);filter:brightness(1.04) drop-shadow(0 1cqh 1.4cqh rgba(80,55,15,.22));outline:none;}" +
      ".codex-home-card-frame{position:relative;display:block;width:100%;height:100%;}" +
      ".codex-home-image{width:100%;height:100%;object-fit:fill;display:block;user-select:none;-webkit-user-drag:none;}" +
      ".codex-home-label{position:absolute;left:10%;right:10%;top:75.5%;height:8.5%;display:flex;align-items:center;justify-content:center;text-align:center;font-family:var(--font-title);font-size:1.7cqh;line-height:1;font-weight:800;color:#4a2f0a;text-shadow:0 .05cqh .12cqh rgba(120,80,20,.35);pointer-events:none;white-space:nowrap;overflow:hidden;}" +
      ".deck-viewer.codex-mode .deck-viewer-grid{gap:2.8cqh 1.8cqw;}" +
      ".deck-viewer-filter.disabled{opacity:.45;pointer-events:none;}" +
      ".codex-item-card .cost,.codex-item-card .type{display:none;}" +
      ".codex-item-card .art{height:16cqh;font-size:8cqh;background:linear-gradient(160deg,#fff7d7,#dff3ff);}" +
      ".codex-item-card .art img{width:80%;height:80%;object-fit:contain;display:block;}" +
      ".codex-item-card .art img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 .35cqh .55cqh rgba(80,55,24,.18));}" +
      ".deck-viewer-card.codex-item-frame-card,.card-detail-card.codex-item-frame-card{position:relative;aspect-ratio:2/3;padding:0;border:0;overflow:hidden;background:transparent;box-shadow:0 .5cqh 1.1cqh rgba(40,70,120,.18);}" +
      ".deck-viewer-card.codex-item-frame-card{min-height:25cqh;}" +
      ".card-detail-card.codex-item-frame-card{height:45cqh;}" +
      ".codex-item-frame-card .item-art-layer{position:absolute;inset:0;z-index:1;display:grid;place-items:center;overflow:hidden;pointer-events:none;font-size:8cqh;}" +
      ".card-detail-card.codex-item-frame-card .item-art-layer{font-size:11cqh;}" +
      ".codex-item-frame-card .item-art-layer img{width:62%;height:48%;object-fit:contain;display:block;filter:drop-shadow(0 .35cqh .55cqh rgba(80,55,24,.22));user-select:none;-webkit-user-drag:none;}" +
      ".codex-item-frame-card .item-frame-layer{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:fill;pointer-events:none;}" +
      ".codex-item-frame-card .item-text-layer{position:absolute;inset:0;z-index:2;pointer-events:none;font-weight:900;color:#10243f;}" +
      ".codex-item-frame-card .item-name-text{position:absolute;left:12%;right:12%;top:9%;height:10%;display:grid;place-items:center;text-align:center;font-size:1.35cqh;line-height:1.05;overflow:hidden;text-shadow:0 .08cqh 0 rgba(255,255,255,.75);}" +
      ".codex-item-frame-card .item-desc-text{position:absolute;left:9%;right:9%;top:77.8%;bottom:7.4%;display:block;text-align:center;font-size:1.02cqh;line-height:1.34;white-space:pre-line;overflow:hidden;color:#10243f;}" +
      ".card-detail-card.codex-item-frame-card .item-name-text{font-size:2.15cqh;}" +
      ".card-detail-card.codex-item-frame-card .item-desc-text{font-size:1.7cqh;}" +
      ".codex-item-frame-card .item-hit-layer{position:absolute;inset:0;z-index:4;background:transparent;cursor:inherit;}" +
      ".deck-viewer.codex-mode .deck-viewer-card .deck-viewer-count{display:none;}" +
      ".deck-viewer-card.codex-locked{aspect-ratio:2/3;min-height:25cqh;padding:0;border:0;background:transparent;box-shadow:0 .5cqh 1.1cqh rgba(40,70,120,.18);overflow:hidden;cursor:default;}" +
      ".deck-viewer-card.codex-locked:hover,.deck-viewer-card.codex-locked:focus-visible{transform:none;box-shadow:0 .5cqh 1.1cqh rgba(40,70,120,.18);}" +
      ".codex-locked-image{width:100%;height:100%;object-fit:fill;display:block;user-select:none;-webkit-user-drag:none;}" +
      ".card-detail-backdrop{position:absolute;inset:0;z-index:2;display:none;place-items:center;background:rgba(35,55,85,.34);border-radius:var(--r);backdrop-filter:blur(2px);}" +
      ".card-detail-backdrop.show{display:grid;}" +
      ".card-detail-panel{position:relative;width:min(72cqw,104cqh);max-height:70cqh;overflow:visible;background:transparent url(\"assets/ui_panels/codex_section_panel.png\") center/100% 100% no-repeat;border:0;border-radius:0;box-shadow:0 1.6cqh 3.2cqh rgba(20,35,60,.3);padding:3cqh 2.6cqw 2.8cqh;}" +
      ".card-detail-close{position:absolute;top:2.4cqh;right:1.7cqw;width:4cqh;height:4cqh;background:transparent url(\"assets/ui_buttons/close.png\") center/100% 100% no-repeat;border:0;border-radius:0;color:transparent;font-size:0;font-weight:900;line-height:1;cursor:pointer;box-shadow:none;}" +
      ".card-detail-spread{display:grid;grid-template-columns:minmax(18cqh,24cqw) minmax(0,1fr);gap:clamp(1.6cqw,2.6cqw,3.4cqw);align-items:stretch;}" +
      ".card-detail-front{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2cqh;min-height:46cqh;}" +
      ".card-detail-back{min-height:46cqh;margin-right:clamp(1.6cqw,2.8cqw,3.8cqw);border-radius:1.2cqh;background:linear-gradient(150deg,rgba(255,250,236,.85),rgba(243,228,196,.8));border:.22cqh solid rgba(176,125,29,.4);box-shadow:inset 0 0 0 .35cqh rgba(255,250,235,.4);padding:2cqh 1.6cqw 1.6cqh;display:flex;flex-direction:column;}" +
      ".card-detail-scroll{flex:1 1 auto;min-height:0;overflow-y:auto;padding-right:.4cqw;}" +
      ".card-detail-card{position:relative;width:min(21cqw,28cqh);height:45cqh;border-radius:1.4cqh;background:linear-gradient(180deg,#fbfcff,#eef4fb);border:.35cqh solid #cdddf0;box-shadow:0 .9cqh 1.8cqh rgba(40,70,120,.25);display:flex;flex-direction:column;align-items:center;padding:1cqh .9cqw;color:var(--c-ink);}" +
      ".card-detail-card.cost-attack{border-color:#f0b9b0;}.card-detail-card.cost-defense{border-color:#a9cdf0;}.card-detail-card.cost-skill{border-color:#a9e0c2;}" +
      ".card-detail-card.upgraded{border-color:var(--c-gold);box-shadow:0 0 0 .35cqh rgba(231,181,74,.24),0 1cqh 2cqh rgba(40,70,120,.28);background:linear-gradient(180deg,#fffdf2,#edf8ff);}" +
      ".card-detail-card .deck-viewer-count{position:absolute;top:.7cqh;right:.7cqw;min-width:3.7cqh;height:3.1cqh;display:grid;place-items:center;border-radius:1.55cqh;background:var(--c-gold);color:#fff;font-size:1.65cqh;font-weight:900;}" +
      ".card-detail-card .cost{position:absolute;top:-1cqh;left:-.9cqw;width:4.8cqh;height:4.8cqh;border-radius:50%;display:grid;place-items:center;font-size:2.45cqh;font-weight:900;color:#fff;background:radial-gradient(circle at 35% 30%,#bfe6ff,#3f8fe0 70%);border:.25cqh solid #eaf6ff;box-shadow:0 0 .8cqh rgba(80,170,255,.7);}" +
      ".card-detail-card .cname{font-size:2.35cqh;font-weight:900;margin-top:.3cqh;padding:0 2cqh;text-align:center;}" +
      ".card-detail-card .art{width:100%;height:16cqh;margin:1cqh 0;border-radius:1.2cqh;display:grid;place-items:center;font-size:9cqh;background:linear-gradient(160deg,#fff7d7,#dff3ff);border:.18cqh solid #d6e6f5;overflow:hidden;}" +
      ".card-detail-card .art img{width:100%;height:100%;object-fit:cover;display:block;}" +
      ".card-detail-card.codex-item-card .art img{object-fit:contain;filter:drop-shadow(0 .35cqh .55cqh rgba(80,55,24,.18));}" +
      ".card-detail-card .type{font-size:1.55cqh;font-weight:800;color:#fff;padding:.15cqh .9cqw;border-radius:.8cqh;margin-bottom:.8cqh;}" +
      ".card-detail-card .desc{font-size:1.7cqh;text-align:center;color:var(--c-ink);line-height:1.35;white-space:pre-line;}" +
      ".deck-viewer-card.card-frame-card,.card-detail-card.card-frame-card{aspect-ratio:2/3;padding:0;border:0;overflow:hidden;background:#f5efe4;}" +
      ".deck-viewer-card.card-frame-card{min-height:25cqh;}" +
      ".card-detail-card.card-frame-card{height:45cqh;}" +
      ".deck-viewer-card.card-frame-card .card-art-layer,.card-detail-card.card-frame-card .card-art-layer{position:absolute;inset:0;z-index:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(160deg,#eef6ff,#dcebfb);pointer-events:none;}" +
      ".deck-viewer-card.cost-status .card-art-layer,.card-detail-card.cost-status .card-art-layer{background:radial-gradient(circle at 50% 32%,#3a1c28,#160a10);}" +
      ".deck-viewer-card.card-frame-card .card-art-layer img,.card-detail-card.card-frame-card .card-art-layer img{width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;}" +
      ".deck-viewer-card.card-frame-card .card-frame-layer,.card-detail-card.card-frame-card .card-frame-layer{position:absolute;inset:0;z-index:2;width:100%;height:100%;object-fit:fill;pointer-events:none;}" +
      ".deck-viewer-card.card-frame-card .card-text-layer,.card-detail-card.card-frame-card .card-text-layer{position:absolute;inset:0;z-index:3;pointer-events:none;font-weight:900;color:#10243f;}" +
      ".deck-viewer-card.card-frame-card .card-cost-text{position:absolute;left:6.2%;top:2.4%;width:18.8%;height:13.9%;display:grid;place-items:center;color:#2b3848;font-size:2.25cqh;line-height:1;text-shadow:0 .08cqh 0 rgba(255,255,255,.95);}" +
      ".deck-viewer-card.card-frame-card .card-name-text{position:absolute;left:12%;right:8%;top:5.9%;height:10%;display:grid;place-items:center;text-align:center;font-size:1.35cqh;line-height:1.05;overflow:hidden;text-shadow:0 .08cqh 0 rgba(255,255,255,.75);}" +
      ".deck-viewer-card.card-frame-card .card-desc-text{position:absolute;left:8%;right:8%;top:77.8%;bottom:7.4%;display:block;text-align:center;font-size:1.02cqh;line-height:1.34;white-space:pre-line;overflow:hidden;}" +
      ".card-detail-card.card-frame-card .card-cost-text{position:absolute;left:6.2%;top:2.4%;width:18.8%;height:13.9%;display:grid;place-items:center;color:#2b3848;font-size:3.4cqh;line-height:1;text-shadow:0 .08cqh 0 rgba(255,255,255,.95);}" +
      ".card-detail-card.card-frame-card .card-name-text{position:absolute;left:12%;right:8%;top:5.9%;height:10%;display:grid;place-items:center;text-align:center;font-size:2.15cqh;line-height:1.05;overflow:hidden;text-shadow:0 .08cqh 0 rgba(255,255,255,.75);}" +
      ".card-detail-card.card-frame-card .card-desc-text{position:absolute;left:8%;right:8%;top:77.8%;bottom:7.4%;display:block;text-align:center;font-size:1.7cqh;line-height:1.34;white-space:pre-line;overflow:hidden;}" +
      ".deck-viewer-card.card-frame-card .card-hit-layer,.card-detail-card.card-frame-card .card-hit-layer{position:absolute;inset:0;z-index:4;background:transparent;cursor:inherit;}" +
      ".card-detail-upgrade-toggle{height:4.2cqh;min-width:13cqw;border-radius:2.1cqh;border:.22cqh solid var(--c-gold);background:linear-gradient(180deg,#fff8d9,#ffe59a);color:#7a5510;font-size:1.8cqh;font-weight:900;cursor:pointer;box-shadow:0 .5cqh 1cqh rgba(80,60,20,.16);}" +
      ".card-detail-upgrade-toggle:hover:not(:disabled),.card-detail-upgrade-toggle:focus-visible:not(:disabled){outline:none;transform:translateY(-.2cqh);box-shadow:0 .7cqh 1.3cqh rgba(80,60,20,.22);}" +
      ".card-detail-upgrade-toggle.active{background:linear-gradient(180deg,#eaf7ff,#cfe9ff);border-color:var(--c-blue);color:var(--c-blue-deep);}" +
      ".card-detail-upgrade-toggle:disabled{filter:grayscale(.6);opacity:.55;cursor:not-allowed;box-shadow:none;}" +
      ".card-detail-kicker{font-size:1.5cqh;font-weight:900;color:var(--c-ink-soft);margin-bottom:.4cqh;}" +
      ".card-detail-nav{position:absolute;top:50%;transform:translateY(-50%);width:6.2cqh;height:6.2cqh;border:0;border-radius:0;background:transparent url(\"assets/ui_panels/card_detail_nav_panel.png\") center/100% 100% no-repeat;color:transparent;font-size:0;font-weight:900;line-height:1;display:grid;place-items:center;cursor:pointer;box-shadow:none;}" +
      ".card-detail-nav::before{content:'';display:block;position:absolute;top:50%;left:50%;width:0;height:0;transform:translate(-.8cqh,-1.05cqh);filter:drop-shadow(0 .06cqh 0 rgba(255,255,255,.9)) drop-shadow(0 .12cqh .2cqh rgba(90,60,20,.24));}" +
      ".card-detail-prev::before{border-top:1.05cqh solid transparent;border-bottom:1.05cqh solid transparent;border-right:1.6cqh solid #8a641a;border-left:0;}" +
      ".card-detail-next::before{border-top:1.05cqh solid transparent;border-bottom:1.05cqh solid transparent;border-left:1.6cqh solid #8a641a;border-right:0;}" +
      ".card-detail-nav:hover,.card-detail-nav:focus-visible{filter:brightness(1.04) drop-shadow(0 .55cqh .8cqh rgba(90,65,25,.24));outline:none;}" +
      ".card-detail-prev{left:-6.6cqh;}.card-detail-next{right:-6.6cqh;}" +
      ".card-detail-top{display:grid;grid-template-columns:13cqh minmax(0,1fr);gap:1.6cqw;align-items:center;padding-right:3.4cqh;}" +
      ".card-detail-art{height:13cqh;border-radius:1.2cqh;display:grid;place-items:center;font-size:7.5cqh;background:linear-gradient(160deg,#fff7d7,#dff3ff);border:.2cqh solid #d6e6f5;}" +
      ".card-detail-title h3{font-size:3.2cqh;line-height:1.1;margin-bottom:.8cqh;}" +
      ".card-detail-badges{display:flex;flex-wrap:wrap;gap:.6cqh;}" +
      ".card-detail-badge{min-height:3cqh;display:inline-flex;align-items:center;border-radius:1.5cqh;padding:.2cqh .9cqw;background:rgba(255,250,235,.85);border:.15cqh solid rgba(176,125,29,.35);font-size:1.55cqh;font-weight:900;color:var(--c-ink-soft);}" +
      ".card-detail-badge.type-attack{color:#a82e2e;border-color:#f0b9b0;background:#fff1ef;}" +
      ".card-detail-badge.type-defense{color:#1f5fa5;border-color:#a9cdf0;background:#eef7ff;}" +
      ".card-detail-badge.type-skill{color:#2c7b55;border-color:#a9e0c2;background:#effbf4;}" +
      ".card-detail-badge.upgrade{color:#7a5510;border-color:var(--c-gold);background:#fff6cf;}" +
      ".card-detail-desc{margin-top:1.8cqh;padding:1.4cqh 1.2cqw;border-radius:1cqh;background:linear-gradient(180deg,rgba(255,251,240,.92),rgba(243,228,196,.85));border:.15cqh solid rgba(176,125,29,.35);box-shadow:inset 0 0 0 .1cqh rgba(255,255,255,.4);font-size:1.9cqh;font-weight:800;line-height:1.45;white-space:pre-line;text-align:center;}" +
      ".card-detail-info{display:grid;grid-template-columns:1fr;gap:1cqh;margin-top:1.2cqh;}" +
      ".card-detail-info section{border-radius:1cqh;background:linear-gradient(180deg,rgba(255,251,240,.85),rgba(243,228,196,.75));border:.15cqh solid rgba(176,125,29,.3);padding:1.1cqh 1cqw;}" +
      ".card-detail-info h4{font-size:1.65cqh;margin-bottom:.5cqh;color:var(--c-ink-soft);}" +
      ".card-detail-info p{font-size:1.65cqh;line-height:1.45;color:var(--c-ink);font-weight:700;}" +
      ".card-detail-subcard-wrap{flex:none;display:flex;flex-direction:row;align-items:center;justify-content:center;gap:1cqw;padding-top:1.3cqh;margin-top:1cqh;border-top:.12cqh dashed rgba(176,125,29,.4);}" +
      ".card-detail-subcard-label{flex:none;font-size:1.75cqh;font-weight:900;color:var(--c-ink);text-shadow:0 .06cqh 0 rgba(255,255,255,.55);line-height:1.35;text-align:right;}" +
      ".card-detail-card.card-detail-subcard{width:min(9.5cqw,13cqh);height:min(14.2cqw,19.5cqh);flex:none;cursor:pointer;box-shadow:0 .5cqh 1cqh rgba(40,70,120,.22);transition:transform .12s ease,box-shadow .12s ease;}" +
      ".card-detail-card.card-detail-subcard:hover,.card-detail-card.card-detail-subcard:focus-visible{transform:translateY(-.3cqh) scale(1.05);box-shadow:0 .9cqh 1.6cqh rgba(40,70,120,.34);outline:.18cqh solid var(--c-gold);outline-offset:.15cqh;}" +
      ".card-detail-card.card-frame-card.card-detail-subcard .card-cost-text{font-size:1.7cqh;}" +
      ".card-detail-card.card-frame-card.card-detail-subcard .card-name-text{font-size:1.05cqh;}" +
      ".card-detail-card.card-frame-card.card-detail-subcard .card-desc-text{font-size:.72cqh;line-height:1.22;}" +
      "@media (max-width:700px){.card-detail-subcard-label{font-size:2.1cqh;}.card-detail-card.card-detail-subcard{width:min(20cqw,15cqh);height:min(30cqw,22.5cqh);}.card-detail-card.card-frame-card.card-detail-subcard .card-cost-text{font-size:2.6cqh;}.card-detail-card.card-frame-card.card-detail-subcard .card-name-text{font-size:1.6cqh;}.card-detail-card.card-frame-card.card-detail-subcard .card-desc-text{font-size:1.25cqh;}}" +
      "@media (max-width:700px){.card-detail-panel{width:78cqw;max-height:72cqh;overflow:auto;}.card-detail-spread{grid-template-columns:1fr;}.card-detail-front{min-height:auto;}.card-detail-back{min-height:auto;}.card-detail-card{width:min(42cqw,28cqh);height:40cqh;}.card-detail-card .art{height:12cqh;font-size:7cqh;}.card-detail-upgrade-toggle{min-width:28cqw;}.card-detail-prev{left:.8cqh;}.card-detail-next{right:.8cqh;}.card-detail-nav{top:auto;bottom:1cqh;transform:none;width:4.4cqh;height:4.4cqh;}.card-detail-nav::before{font-size:3.3cqh;}.card-detail-info{grid-template-columns:1fr;}.card-detail-top{grid-template-columns:10cqh minmax(0,1fr);}.card-detail-art{height:10cqh;font-size:6cqh;}}";
    document.head.appendChild(style);
  }

  function openDeckViewer(tabId){
    if(!els) return;
    if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
    clearPickMode();
    viewerMode = "deck";
    if(tabId) activeTab = tabId;
    els.overlay.classList.remove("codex-mode");
    els.overlay.classList.remove("codex-home-mode");
    els.title.textContent = "보유 주문";
    els.tabsWrap.style.display = "";
    if(els.codexTabsWrap) els.codexTabsWrap.style.display = "none";
    if(els.codexHome) els.codexHome.style.display = "none";
    if(els.controls) els.controls.style.display = "";
    if(els.grid) els.grid.style.display = "";
    if(els.gridWrap) els.gridWrap.style.display = "";
    els.filterType.disabled = false;
    els.filterDeck.disabled = false;
    if(els.filterWrap) els.filterWrap.classList.remove("disabled");
    if(els.filterTypeWrap) els.filterTypeWrap.classList.remove("disabled");
    renderDeckViewer();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function openDeckViewerCardPick(options = {}){
    if(!els) return Promise.resolve(null);
    if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();

    const usingCandidates = Array.isArray(options.candidates);

    return new Promise(resolve => {
      viewerMode = "deck";
      activeTab = usingCandidates ? "candidates" : "all";
      selectedPickKey = null;
      selectedPickUid = null;
      selectedPickMultiIds = new Set();
      pickMode = {
        title: options.title || "카드 선택",
        confirmText: options.confirmText || "확인",
        disabledText: options.disabledText || "선택할 수 없는 카드입니다.",
        isSelectable: typeof options.isSelectable === "function" ? options.isSelectable : () => true,
        getConfirmDisabled: typeof options.getConfirmDisabled === "function" ? options.getConfirmDisabled : null,
        costText: options.costText || null,
        helpText: options.helpText || "기본 카드 1장을 선택하세요.",
        onConfirm: typeof options.onConfirm === "function" ? options.onConfirm : null,
        candidates: usingCandidates ? options.candidates : null,
        allowCancel: options.allowCancel !== undefined ? !!options.allowCancel : usingCandidates,
        multi: !!options.multi,
        resolve
      };

      els.overlay.classList.remove("codex-mode");
      els.overlay.classList.remove("codex-home-mode");
      els.overlay.classList.add("pick-mode");
      els.title.textContent = pickMode.title;
      els.tabsWrap.style.display = "none";
      if(els.codexTabsWrap) els.codexTabsWrap.style.display = "none";
      if(els.codexHome) els.codexHome.style.display = "none";
      if(els.controls) els.controls.style.display = usingCandidates ? "none" : "";
      if(els.grid) els.grid.style.display = "";
      if(els.gridWrap) els.gridWrap.style.display = "";
      if(els.pickFooter) els.pickFooter.hidden = false;
      if(els.pickHelp) els.pickHelp.textContent = pickMode.helpText;
      if(els.pickConfirm){
        els.pickConfirm.textContent = pickMode.confirmText;
        els.pickConfirm.disabled = pickMode.multi
          ? !!(pickMode.getConfirmDisabled && pickMode.getConfirmDisabled([]))
          : true;
      }
      if(els.pickCancel) els.pickCancel.hidden = !pickMode.allowCancel;
      if(els.pickCost){
        if(pickMode.costText || pickMode.costHtml){
          els.pickCost.hidden = false;
          if(pickMode.costHtml) els.pickCost.innerHTML = pickMode.costHtml;
          else els.pickCost.textContent = pickMode.costText;
          els.pickCost.classList.toggle("insufficient", !!(pickMode.getConfirmDisabled && pickMode.getConfirmDisabled(null)));
        } else {
          els.pickCost.hidden = true;
          els.pickCost.textContent = "";
          els.pickCost.classList.remove("insufficient");
        }
      }
      els.filterType.disabled = usingCandidates;
      els.filterDeck.disabled = usingCandidates;
      if(els.filterWrap) els.filterWrap.classList.toggle("disabled", usingCandidates);
      closeCardDetail();
      renderDeckViewer();
      els.overlay.classList.add("show");
      els.overlay.setAttribute("aria-hidden", "false");
      els.grid.focus();
    });
  }

  function openCodexHome(){
    if(!els) return;
    viewerMode = "codexHome";
    els.overlay.classList.add("codex-mode");
    els.overlay.classList.add("codex-home-mode");
    els.title.textContent = "도감";
    els.tabsWrap.style.display = "none";
    if(els.codexTabsWrap) els.codexTabsWrap.style.display = "none";
    if(els.codexHome) els.codexHome.style.display = "grid";
    if(els.controls) els.controls.style.display = "none";
    if(els.grid) els.grid.style.display = "none";
    if(els.gridWrap) els.gridWrap.style.display = "none";
    if(els.pickFooter) els.pickFooter.hidden = true;
    if(els.pickConfirm) els.pickConfirm.disabled = true;
    detailEntries = [];
    closeCardDetail();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function openCodexSection(sectionId){
    if(!els) return;
    const section = getCodexSection(sectionId) || CODEX_SECTIONS[0];
    viewerMode = "codex";
    codexSection = section.id;
    activeTab = section.tabId;
    els.overlay.classList.add("codex-mode");
    els.overlay.classList.remove("codex-home-mode");
    els.title.textContent = section.title;
    els.tabsWrap.style.display = "none";
    if(els.codexTabsWrap) els.codexTabsWrap.style.display = "flex";
    if(els.codexHome) els.codexHome.style.display = "none";
    if(els.controls) els.controls.style.display = "";
    if(els.grid) els.grid.style.display = "";
    if(els.gridWrap) els.gridWrap.style.display = "";
    if(els.pickFooter) els.pickFooter.hidden = true;
    if(els.pickConfirm) els.pickConfirm.disabled = true;
    renderDeckViewer();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function closeDeckViewer(){
    if(!els) return;
    if(pickMode){
      if(pickMode.allowCancel){
        cancelPickCard();
        return;
      }
      if(typeof toast === "function") toast("카드를 선택해야 은혜를 완료할 수 있습니다.");
      return;
    }
    closeCardDetail();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    els.overlay.classList.remove("codex-mode");
    els.overlay.classList.remove("codex-home-mode");
    viewerMode = "deck";
  }

  function clearPickMode(){
    pickMode = null;
    selectedPickKey = null;
    selectedPickUid = null;
    selectedPickMultiIds = new Set();
    if(!els) return;
    els.overlay.classList.remove("pick-mode");
    if(els.pickFooter) els.pickFooter.hidden = true;
    if(els.pickConfirm) els.pickConfirm.disabled = true;
    if(els.pickCancel) els.pickCancel.hidden = true;
    if(els.pickCost){
      els.pickCost.hidden = true;
      els.pickCost.textContent = "";
      els.pickCost.classList.remove("insufficient");
    }
  }

  function handlePickCard(cardEl){
    if(!pickMode || !cardEl) return;
    const key = cardEl.dataset.cardKey;
    const uid = cardEl.dataset.cardUid || null;
    const id = pickMode.candidates ? uid : key;
    if(!id || !pickMode.isSelectable(id)){
      if(typeof toast === "function") toast(pickMode.disabledText);
      return;
    }
    if(pickMode.multi){
      if(selectedPickMultiIds.has(id)) selectedPickMultiIds.delete(id);
      else selectedPickMultiIds.add(id);
      if(els.pickHelp){
        els.pickHelp.textContent = selectedPickMultiIds.size > 0
          ? selectedPickMultiIds.size + "장 선택됨"
          : pickMode.helpText;
      }
      const multiConfirmDisabled = !!(pickMode.getConfirmDisabled && pickMode.getConfirmDisabled(Array.from(selectedPickMultiIds)));
      if(els.pickConfirm) els.pickConfirm.disabled = multiConfirmDisabled;
      if(els.pickCost) els.pickCost.classList.toggle("insufficient", multiConfirmDisabled);
      renderDeckViewer();
      return;
    }
    selectedPickKey = key;
    selectedPickUid = uid;
    if(els.pickHelp){
      const card = getCard(key);
      els.pickHelp.textContent = (card && card.name ? card.name : key) + " 선택됨";
    }
    const confirmDisabled = !!(pickMode.getConfirmDisabled && pickMode.getConfirmDisabled(id));
    if(els.pickConfirm) els.pickConfirm.disabled = confirmDisabled;
    if(els.pickCost) els.pickCost.classList.toggle("insufficient", confirmDisabled);
    renderDeckViewer();
  }

  function cancelPickCard(){
    if(!pickMode) return;
    const mode = pickMode;
    clearPickMode();
    closeCardDetail();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    mode.resolve(mode.multi ? [] : null);
  }

  function confirmPickCard(){
    if(!pickMode) return;
    const mode = pickMode;
    if(mode.multi){
      const ids = Array.from(selectedPickMultiIds);
      try {
        if(mode.onConfirm) mode.onConfirm(ids);
      } catch(error) {
        console.warn("[DeckViewer] 카드 선택 처리 중 오류가 발생했습니다.", error);
      }
      clearPickMode();
      closeCardDetail();
      els.overlay.classList.remove("show");
      els.overlay.setAttribute("aria-hidden", "true");
      mode.resolve(ids);
      return;
    }
    const id = mode.candidates ? selectedPickUid : selectedPickKey;
    if(!id) return;
    try {
      if(mode.onConfirm) mode.onConfirm(id);
    } catch(error) {
      console.warn("[DeckViewer] 카드 선택 처리 중 오류가 발생했습니다.", error);
    }
    clearPickMode();
    closeCardDetail();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    mode.resolve(id);
  }

  function openCardDetail(key, indexHint){
    if(!els) return;
    const hinted = Number(indexHint);
    const index = Number.isInteger(hinted) && detailEntries[hinted] && detailEntries[hinted].key === key
      ? hinted
      : detailEntries.findIndex(entry => entry.key === key);
    if(index < 0) return;
    if(detailEntries[index].locked) return;

    activeDetailIndex = index;
    showUpgradePreview = false;
    renderCardDetail();
    els.overlay.classList.add("detail-open");
    els.detailBackdrop.classList.add("show");
    els.detailBackdrop.setAttribute("aria-hidden", "false");
    els.detailClose.focus();
  }

  /* 서브카드처럼 현재 목록(detailEntries)에 없을 수도 있는 카드를 같은 팝업에서
     열기 위한 진입점. 목록에 있으면 그대로 openCardDetail을 재사용하고,
     없으면 임시 항목을 덧붙여 동일한 렌더링 경로를 재사용한다. */
  function openCardDetailByKey(key){
    if(!els || !key) return;
    const existingIndex = detailEntries.findIndex(entry => entry.key === key && (!entry.kind || entry.kind === "card"));
    if(existingIndex >= 0){
      openCardDetail(key, existingIndex);
      return;
    }
    const card = getCard(key);
    if(!card) return;
    detailEntries = detailEntries.concat([{ key, count: 1, card, order: detailEntries.length, kind: "card" }]);
    openCardDetail(key, detailEntries.length - 1);
  }

  function closeCardDetail(){
    if(!els || !els.detailBackdrop) return;
    activeDetailIndex = -1;
    showUpgradePreview = false;
    els.overlay.classList.remove("detail-open");
    els.detailBackdrop.classList.remove("show");
    els.detailBackdrop.setAttribute("aria-hidden", "true");
  }

  function moveCardDetail(step){
    if(!els || !els.detailBackdrop.classList.contains("show") || detailEntries.length === 0) return;
    activeDetailIndex = (activeDetailIndex + step + detailEntries.length) % detailEntries.length;
    showUpgradePreview = false;
    renderCardDetail();
  }

  function toggleUpgradePreview(){
    if(activeDetailIndex < 0) return;
    showUpgradePreview = !showUpgradePreview;
    renderCardDetail();
  }

  function renderCardDetail(){
    const entry = detailEntries[activeDetailIndex];
    if(!entry) return;
    if(entry.kind && entry.kind !== "card"){
      els.detailBody.innerHTML = codexItemDetailHtml(entry, activeDetailIndex, detailEntries.length);
      return;
    }
    els.detailBody.innerHTML = cardDetailHtml(entry, activeDetailIndex, detailEntries.length, showUpgradePreview);
  }

  function renderDeckViewer(){
    if(viewerMode === "codex"){
      renderCodexViewer();
      return;
    }
    if(pickMode && pickMode.candidates){
      const entries = buildCandidateEntries(pickMode.candidates);
      detailEntries = entries;
      const visibleCount = entries.reduce((total, entry) => total + entry.count, 0);
      const speciesCount = new Set(entries.map(entry => entry.key)).size;
      els.tabs.forEach(button => {
        button.classList.remove("active");
        button.setAttribute("aria-selected", "false");
      });
      els.summary.textContent = pickMode.title + " " + visibleCount + "장 / " + speciesCount + "종류";
      els.grid.innerHTML = entries.length
        ? entries.map(deckCardHtml).join("")
        : '<div class="deck-viewer-empty">선택할 수 있는 주문이 없습니다.</div>';
      decoratePickCards();
      return;
    }
    const tab = TABS.find(item => item.id === activeTab) || TABS[0];
    const cards = tab.getCards();
    const entries = sortEntries(filterEntries(buildCardEntries(cards, tab.id), tab.id), tab.id);
    detailEntries = entries;
    const visibleCount = entries.reduce((total, entry) => total + entry.count, 0);
    const speciesCount = new Set(entries.map(entry => entry.key)).size;

    els.tabs.forEach(button => {
      const selected = button.dataset.tab === tab.id;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
    });
    els.sortType.value = sortState[tab.id].type;
    els.sortDirection.value = sortState[tab.id].direction;
    els.filterType.value = filterState[tab.id].type;
    els.filterDeck.value = filterState[tab.id].deck;
    els.search.value = searchState[tab.id];
    els.summary.textContent = tab.label + " " + visibleCount + "장 / " + speciesCount + "종류";
    els.grid.innerHTML = entries.length
      ? entries.map(deckCardHtml).join("")
      : '<div class="deck-viewer-empty">표시할 주문이 없습니다.</div>';
    decoratePickCards();
    if(entries.length === 0){
      const empty = els.grid.querySelector(".deck-viewer-empty");
      if(empty) empty.textContent = EMPTY_TEXT[tab.id] || "해당하는 주문이 없습니다.";
      if(empty && cards.length > 0) empty.textContent = "조건에 맞는 주문이 없습니다.";
    }
  }

  function decoratePickCards(){
    if(!pickMode || !els || !els.grid) return;
    els.grid.querySelectorAll(".deck-viewer-card[data-card-key]").forEach(cardEl => {
      const key = cardEl.dataset.cardKey;
      const uid = cardEl.dataset.cardUid || null;
      const id = pickMode.candidates ? uid : key;
      const selectable = !!(id && pickMode.isSelectable(id));
      const selected = pickMode.multi
        ? (selectable && selectedPickMultiIds.has(id))
        : (pickMode.candidates ? (selectable && uid === selectedPickUid) : (selectable && key === selectedPickKey));
      cardEl.classList.toggle("pick-disabled", !selectable);
      cardEl.classList.toggle("pick-selected", selected);
      cardEl.setAttribute("aria-disabled", selectable ? "false" : "true");
    });
  }

  function renderCodexViewer(){
    const section = getCodexSection(codexSection) || CODEX_SECTIONS[0];
    const tabId = section.tabId;
    const sourceItems = getCodexSourceItems(codexSection);
    const entries = sortEntries(filterEntries(buildEntries(sourceItems, tabId), tabId), tabId);
    const filterDisabled = codexSection !== "cards";
    detailEntries = entries;

    if(els.codexTabs){
      els.codexTabs.forEach(button => {
        const selected = button.dataset.codexSection === codexSection;
        button.classList.toggle("active", selected);
        button.setAttribute("aria-selected", selected ? "true" : "false");
      });
    }
    els.sortType.value = sortState[tabId].type;
    els.sortDirection.value = sortState[tabId].direction;
    els.filterType.value = "all";
    els.filterType.disabled = filterDisabled;
    if(els.filterTypeWrap) els.filterTypeWrap.classList.toggle("disabled", filterDisabled);
    if(!filterDisabled){
      els.filterType.value = filterState[tabId].type;
    }
    els.filterDeck.value = filterState[tabId].deck;
    els.search.value = searchState[tabId];
    els.summary.textContent = getCodexSummaryText(codexSection, entries, sourceItems.length);
    els.grid.innerHTML = entries.length
      ? entries.map(deckCardHtml).join("")
      : '<div class="deck-viewer-empty">' + escapeHtml(getCodexEmptyText(codexSection, sourceItems.length)) + '</div>';
  }

  function tabButtonHtml(tab){
    return '<button type="button" class="deck-viewer-tab" role="tab" aria-selected="false" data-tab="' +
      escapeAttr(tab.id) + '">' + escapeHtml(tab.label) + '</button>';
  }

  function codexTabButtonHtml(section){
    return '<button type="button" class="codex-section-tab" role="tab" aria-selected="false" data-codex-section="' +
      escapeAttr(section.id) + '">' +
        escapeHtml(section.label) +
      '</button>';
  }

  function codexHomeButtonHtml(section){
    return '<button type="button" class="codex-home-card" data-codex-section="' + escapeAttr(section.id) + '" aria-label="' + escapeAttr(section.title) + '">' +
      '<span class="codex-home-card-frame">' +
        '<img class="codex-home-image" src="' + escapeAttr(section.image) + '" alt="" aria-hidden="true">' +
        '<span class="codex-home-label">' + escapeHtml(section.label) + '</span>' +
      '</span>' +
    '</button>';
  }

  function getCodexSection(sectionId){
    return CODEX_SECTIONS.find(section => section.id === sectionId);
  }

  function optionHtml(option){
    return '<option value="' + escapeAttr(option.id) + '">' + escapeHtml(option.label) + '</option>';
  }

  function getCodexSourceItems(sectionId){
    if(sectionId === "relics") return getAllRelics();
    if(sectionId === "potions") return getAllPotions();
    return getAllCardKeys();
  }

  function buildEntries(items, tabId){
    if(tabId === "codexRelics") return buildItemEntries(items, "relic");
    if(tabId === "codexPotions") return buildItemEntries(items, "potion");
    return buildCardEntries(items, tabId);
  }

  function buildItemEntries(items, kind){
    return items.map((item, index) => {
      if(!item) return null;
      const key = item.id || item.key || kind + "-" + index;
      return { key, count: 1, item, order: index, kind };
    }).filter(Boolean);
  }

  function getCodexSummaryText(sectionId, entries, total){
    if(sectionId === "cards"){
      return "전체 주문 " + entries.filter(entry => !entry.locked).length + "장 발견 / " + total + "장";
    }
    if(sectionId === "relics") return "전체 법구 " + entries.length + "개 / " + total + "개";
    return "전체 약병 " + entries.length + "개 / " + total + "개";
  }

  function getCodexEmptyText(sectionId, total){
    if(total > 0) return "조건에 맞는 항목이 없습니다.";
    if(sectionId === "relics") return "등록된 법구가 없습니다.";
    if(sectionId === "potions") return "등록된 약병이 없습니다.";
    return "표시할 주문이 없습니다.";
  }

  function buildCandidateEntries(candidates){
    return candidates.map((candidate, index) => {
      const key = candidate && candidate.key;
      const card = key ? getCard(key) : null;
      if(!card) return null;
      return { key, count: 1, card, order: index, kind: "card", uid: (candidate && candidate.uid) || null };
    }).filter(Boolean);
  }

  function buildCardEntries(cards, tabId){
    if(tabId === "codexCards"){
      return cards.map((key, index) => {
        const card = getCard(key);
        if(!card) return null;
        return { key, count: 1, card, order: index, kind: "card", locked: false };
      }).filter(Boolean);
    }

    return cards.map((key, index) => {
      const card = getCard(key);
      if(!card) return null;
      return { key, count: 1, card, order: index, kind: "card" };
    }).filter(Boolean);
  }

  function filterEntries(entries, tabId){
    const state = filterState[tabId] || filterState.all;
    const query = searchState[tabId].trim().toLowerCase();
    return entries.filter(entry => {
      const deckMatches = state.deck === "all" || getCardFilterDeck(entry) === state.deck;
      if(entry.kind && entry.kind !== "card"){
        const itemText = (String(entry.item.name || "") + " " + String(entry.item.desc || "")).toLowerCase();
        return deckMatches && (!query || itemText.includes(query));
      }
      if(entry.locked){
        return !query && state.type === "all" && state.deck === "all";
      }
      const typeMatches = state.type === "all" || getCardFilterType(entry.card) === state.type;
      const nameMatches = !query || String(entry.card.name).toLowerCase().includes(query);
      return deckMatches && typeMatches && nameMatches;
    });
  }

  function getCardFilterType(card){
    const type = card.cardType || card.type || card.kind;
    if(type === "attack" || type === "purify" || type === "정화" || type === "공격") return "attack";
    if(type === "defense" || type === "barrier" || type === "결계" || type === "방어") return "defense";
    if(type === "skill" || type === "boost" || type === "스킬" || type === "강화") return "skill";
    if(type === "status" || type === "상태이상") return "status";
    return "";
  }

  function getCardFilterDeck(entry){
    const data = entry.card || entry.item || {};
    const raw = data.attr || data.deck || data.deckId;
    return DECK_ID_MAP[raw] || "general";
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
      if(tabId === "codexCards" && a.locked !== b.locked){
        return a.locked ? 1 : -1;
      }
      if(state.type === "rarity"){
        const aRank = getEntryRarityRank(a);
        const bRank = getEntryRarityRank(b);
        const aMissing = aRank === null;
        const bMissing = bRank === null;
        if(aMissing !== bMissing) return aMissing ? 1 : -1;
        if(!aMissing && aRank !== bRank) return (aRank - bRank) * direction;
        return a.order - b.order;
      }
      const compared = compareEntries(a, b, state.type);
      if(compared !== 0) return compared * direction;
      return a.order - b.order;
    });
  }

  function getEntryRarityRank(entry){
    const data = entry.card || entry.item || {};
    const rarity = typeof data.rarity === "string" ? data.rarity.toLowerCase() : "";
    return Object.prototype.hasOwnProperty.call(RARITY_ORDER, rarity) ? RARITY_ORDER[rarity] : null;
  }

  function compareEntries(a, b, type){
    const aData = a.card || a.item || {};
    const bData = b.card || b.item || {};
    if(type === "name"){
      return String(aData.name || "").localeCompare(String(bData.name || ""), "ko");
    }
    if(type === "cost"){
      const aCost = typeof aData.cost === "number" ? aData.cost : null;
      const bCost = typeof bData.cost === "number" ? bData.cost : null;
      if(aCost === null || bCost === null) return a.order - b.order;
      return aCost - bCost;
    }
    return a.order - b.order;
  }

  function countCards(deck){
    return deck.reduce((counts, key) => {
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function getEncounteredCardSet(){
    if(typeof localStorage === "undefined") return new Set(getStarterDeckKeys());
    try {
      const saved = JSON.parse(localStorage.getItem(CODEX_KEY) || "[]");
      const keys = Array.isArray(saved) ? saved : [];
      return new Set([...getStarterDeckKeys(), ...keys]);
    } catch(error) {
      localStorage.removeItem(CODEX_KEY);
      return new Set(getStarterDeckKeys());
    }
  }

  function markEncounteredCards(keys){
    if(!Array.isArray(keys) || keys.length === 0) return;
    if(typeof localStorage === "undefined") return;
    const encountered = getEncounteredCardSet();
    keys.forEach(key => {
      if(getCard(key)) encountered.add(key);
    });
    localStorage.setItem(CODEX_KEY, JSON.stringify([...encountered]));
  }

  function deckCardHtml(entry, index){
    if(entry.kind && entry.kind !== "card"){
      const item = entry.item || {};
      return '<button type="button" class="deck-viewer-card codex-item-card codex-item-frame-card item-frame-card" data-card-key="' + escapeAttr(entry.key) + '" data-card-index="' + index + '" data-card-count="1">' +
        '<div class="deck-viewer-count">x1</div>' +
        itemFaceHtml(item) +
      '</button>';
    }
    const card = entry.card;
    if(entry.locked){
      return '<button type="button" class="deck-viewer-card codex-locked cost-' + escapeAttr(card.type) + '" data-card-key="' + escapeAttr(entry.key) + '" data-card-index="' + index + '" aria-label="잠긴 주문">' +
        '<img class="codex-locked-image" src="assets/ui_buttons/codex_unknown_card.png" alt="" aria-hidden="true">' +
      '</button>';
    }
    return '<button type="button" class="deck-viewer-card card-frame-card cost-' + escapeAttr(card.type) + '" data-card-key="' + escapeAttr(entry.key) + '" data-card-index="' + index + '"' + (entry.uid ? ' data-card-uid="' + escapeAttr(entry.uid) + '"' : '') + ' data-card-count="' + entry.count + '">' +
      '<div class="deck-viewer-count">x' + entry.count + '</div>' +
      cardFaceHtml(card) +
    '</button>';
  }

  function codexItemDetailHtml(entry, index, total){
    const item = entry.item || {};
    const label = entry.kind === "relic" ? "법구 정보" : "약병 정보";
    return '<button type="button" class="card-detail-nav card-detail-prev" data-card-detail-nav="prev" aria-label="이전 항목">‹</button>' +
      '<div class="card-detail-spread">' +
        '<div class="card-detail-front">' +
          '<div class="card-detail-card codex-item-card codex-item-frame-card item-frame-card">' +
            itemFaceHtml(item) +
          '</div>' +
        '</div>' +
        '<div class="card-detail-back">' +
          '<div class="card-detail-title">' +
            '<div class="card-detail-kicker">' + escapeHtml(label) + ' ' + escapeHtml(index + 1) + ' / ' + escapeHtml(total) + '</div>' +
            '<h3 id="cardDetailTitle">' + escapeHtml(item.name || "") + '</h3>' +
          '</div>' +
          '<div class="card-detail-desc">' + colorizeRarityLabels(escapeHtml(item.desc || "")) + '</div>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="card-detail-nav card-detail-next" data-card-detail-nav="next" aria-label="다음 항목">›</button>';
  }

  /* fx 항목 중 t가 "createCard"로 시작하고 key가 있는 항목을 범용으로 찾는다.
     (tooltip.js의 서브카드 호버 미리보기와 동일한 탐지 패턴) */
  function getSubCardFx(card){
    if(!card || !Array.isArray(card.fx)) return null;
    return card.fx.find(f => f && typeof f.t === "string" && /^createCard/i.test(f.t) && f.key) || null;
  }

  function cardDetailSubCardHtml(card){
    const fxItem = getSubCardFx(card);
    const subCard = fxItem ? getCard(fxItem.key) : null;
    if(!subCard) return "";
    return '<div class="card-detail-subcard-wrap">' +
      '<span class="card-detail-subcard-label">사용 시 생성<br>: ' + escapeHtml(subCard.name || "") + '</span>' +
      '<button type="button" class="card-detail-subcard card-detail-card card-frame-card cost-' + escapeAttr(subCard.type) + '" data-card-detail-subcard-open="' + escapeAttr(fxItem.key) + '" aria-label="서브카드 ' + escapeAttr(subCard.name || "") + ' 상세정보 보기">' +
        cardFaceHtml(subCard) +
      '</button>' +
    '</div>';
  }

  function cardDetailHtml(entry, index, total, isUpgrade){
    const card = isUpgrade ? getUpgradePreviewCard(entry.card) : entry.card;
    const typeId = getCardFilterType(card) || card.type;
    const changeText = getUpgradeChangeText(entry.card, card);
    return '<button type="button" class="card-detail-nav card-detail-prev" data-card-detail-nav="prev" aria-label="이전 주문">‹</button>' +
      '<div class="card-detail-spread">' +
        '<div class="card-detail-front">' +
          detailCardFaceHtml(entry, card, isUpgrade) +
          '<button type="button" class="card-detail-upgrade-toggle' + (isUpgrade ? ' active' : '') + '" data-card-detail-upgrade="true" disabled>' +
            (isUpgrade ? '기본 보기' : '강화 확인') +
          '</button>' +
        '</div>' +
        '<div class="card-detail-back">' +
          '<div class="card-detail-scroll">' +
            '<div class="card-detail-title">' +
              '<div class="card-detail-kicker">' + (isUpgrade ? '강화 미리보기' : '주문 정보') + ' ' + escapeHtml(index + 1) + ' / ' + escapeHtml(total) + '</div>' +
              '<h3 id="cardDetailTitle">' + escapeHtml(card.name) + '</h3>' +
              '<div class="card-detail-badges">' +
                '<span class="card-detail-badge">정신력 ' + escapeHtml(card.cost) + '</span>' +
                '<span class="card-detail-badge type-' + escapeAttr(typeId) + '">' + escapeHtml(getFriendlyTypeLabel(card)) + '</span>' +
                '<span class="card-detail-badge">' + escapeHtml(getFriendlyAttributeLabel(card)) + '</span>' +
                '<span class="card-detail-badge">보유 x' + escapeHtml(entry.count) + '</span>' +
                (isUpgrade ? '<span class="card-detail-badge upgrade">강화</span>' : '') +
              '</div>' +
            '</div>' +
            '<div class="card-detail-desc">' + colorizeRarityLabels(escapeHtml(card.desc)) + '</div>' +
            '<div class="card-detail-info">' +
              (isUpgrade ? '<section><h4>강화 변화</h4><p>' + escapeHtml(changeText) + '</p></section>' : '') +
              '<section><h4>주문 종류</h4><p>' + escapeHtml(getTypeDescription(card)) + '</p></section>' +
            '</div>' +
          '</div>' +
          cardDetailSubCardHtml(card) +
        '</div>' +
      '</div>' +
      '<button type="button" class="card-detail-nav card-detail-next" data-card-detail-nav="next" aria-label="다음 주문">›</button>';
  }

  function detailCardFaceHtml(entry, displayCard, isUpgrade){
    const card = displayCard || entry.card;
    return '<div class="card-detail-card card-frame-card cost-' + escapeAttr(card.type) + (isUpgrade ? ' upgraded' : '') + '">' +
      '<div class="deck-viewer-count">x' + entry.count + '</div>' +
      cardFaceHtml(card) +
    '</div>';
  }

  function getUpgradePreviewCard(card){
    const upgradedFx = Array.isArray(card.fx) ? card.fx.map(upgradeEffect) : [];
    return {
      ...card,
      name: String(card.name) + "+",
      fx: upgradedFx,
      desc: buildPreviewDescription(upgradedFx, card),
    };
  }

  function upgradeEffect(effect){
    if(!effect || typeof effect.v !== "number") return { ...effect };
    const bonusByType = {
      damage: 3,
      bonusLowHpDamage: 3,
      damageAll: 2,
      block: 3,
      heal: 3,
      applyWeak: 1,
      applyWeakAll: 1,
      removeWeak: 1,
      draw: 1,
      energy: 1,
    };
    const bonus = bonusByType[effect.t] || 0;
    return { ...effect, v: effect.v + bonus };
  }

  function buildPreviewDescription(effects, sourceCard){
    const lines = effects.map(effectDescription).filter(Boolean);
    if(sourceCard.exhaust) lines.push("사용 후 소멸");
    return lines.length > 0 ? lines.join("\n") : sourceCard.desc;
  }

  function effectDescription(effect){
    if(!effect) return "";
    switch(effect.t){
      case "damage": return "정화 " + effect.v;
      case "bonusLowHpDamage": return "미련 절반 이하 추가 정화 " + effect.v;
      case "damageAll": return "모든 적에게 정화 " + effect.v;
      case "block": return "마음의 결계 " + effect.v;
      case "draw": return "주문 " + effect.v + "장 뽑기";
      case "heal": return "스트레스 " + effect.v + " 회복";
      case "energy": return "정신력 +" + effect.v;
      case "applyWeak": return "동요 " + effect.v + " 부여";
      case "applyWeakAll": return "모든 적에게 동요 " + effect.v;
      case "removeWeak": return "동요 " + effect.v + " 제거";
      case "removeRandomDebuff": return "무작위 디버프 " + effect.v + " 제거";
      default: return "";
    }
  }

  function getUpgradeChangeText(baseCard, upgradedCard){
    if(!Array.isArray(baseCard.fx) || !Array.isArray(upgradedCard.fx)) return "강화 후 주문 이름과 효과 설명이 미리보기로 표시됩니다.";
    const changes = upgradedCard.fx.map((effect, index) => {
      const before = baseCard.fx[index];
      if(!before || typeof before.v !== "number" || typeof effect.v !== "number" || before.v === effect.v) return "";
      return getEffectChangeLabel(effect.t) + " " + before.v + " → " + effect.v;
    }).filter(Boolean);
    return changes.length > 0 ? changes.join("\n") : "강화 후 주문 이름과 효과 설명이 미리보기로 표시됩니다.";
  }

  function getEffectChangeLabel(type){
    if(type === "damage" || type === "bonusLowHpDamage" || type === "damageAll") return "정화";
    if(type === "block") return "결계";
    if(type === "heal") return "회복";
    if(type === "draw") return "주문 뽑기";
    if(type === "energy") return "정신력";
    if(type === "applyWeak" || type === "applyWeakAll" || type === "removeWeak") return "동요";
    if(type === "removeRandomDebuff") return "디버프";
    return "효과";
  }

  function getFriendlyTypeLabel(card){
    const type = getCardFilterType(card);
    if(type === "attack") return "정화";
    if(type === "defense") return "결계";
    if(type === "skill") return "의식";
    return getTypeLabel(card.type);
  }

  function getTypeDescription(card){
    const type = getCardFilterType(card);
    if(type === "attack") return "몬스터의 미련 게이지를 줄여 마음을 가볍게 하는 주문입니다.";
    if(type === "defense") return "플레이어에게 마음의 결계를 부여해 스트레스 공격을 먼저 막아줍니다.";
    if(type === "skill") return "직접 정화하지 않고 회복, 주문 뽑기, 상태 변화 같은 다양한 도움을 줍니다.";
    return "전투 흐름에 특별한 효과를 더하는 주문입니다.";
  }

  function getFriendlyAttributeLabel(card){
    const attr = getCardFilterAttribute(card);
    if(attr === "hope") return "희망";
    if(attr === "memory") return "추억";
    if(attr === "spirit") return "성불";
    return card.attribute || card.attr || card.element || card.property || "속성 없음";
  }

  function escapeHtml(value){
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cardArtHtml(card){
    if(card && card.art){
      return '<img src="' + escapeAttr(card.art) + '" alt="' + escapeAttr(card.name || "") + '">';
    }
    return escapeHtml(card && card.emoji ? card.emoji : "?");
  }

  function itemIconHtml(icon){
    if(typeof icon === "string" && icon.indexOf("assets/") === 0){
      return '<img src="' + escapeAttr(icon) + '" alt="" aria-hidden="true">';
    }
    return escapeHtml(icon || "?");
  }

  function cardFramePath(card){
    if(card && card.type === "status"){
      return "assets/card_frames/card-frame-status.png";
    }
    const type = card && ["attack", "defense", "skill"].includes(card.type) ? card.type : "skill";
    const rarity = card && card.rarity ? card.rarity : "common";
    return "assets/card_frames/card-frame-" + type + "-" + rarity + ".png";
  }

  function itemFramePath(item){
    const rarity = String(item && item.rarity ? item.rarity : "common").toLowerCase();
    if(rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
    if(rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
    if(rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
    return "assets/ui_panels/relic_potion_frame_common.png";
  }

  function itemFaceHtml(item){
    const safeItem = item || {};
    return '<div class="item-art-layer">' + itemIconHtml(safeItem.iconImage || safeItem.emoji || "?") + '</div>' +
      '<img class="item-frame-layer" src="' + escapeAttr(itemFramePath(safeItem)) + '" alt="" aria-hidden="true" draggable="false">' +
      '<div class="item-text-layer">' +
        '<div class="item-name-text">' + escapeHtml(safeItem.name || "") + '</div>' +
      '</div>' +
      '<div class="item-hit-layer" aria-hidden="true"></div>';
  }

  function cardFaceHtml(card){
    const safeCard = card || {};
    return '<div class="card-art-layer">' + cardArtHtml(safeCard) + '</div>' +
      '<img class="card-frame-layer" src="' + escapeAttr(cardFramePath(safeCard)) + '" alt="" aria-hidden="true" draggable="false">' +
      '<div class="card-text-layer">' +
        '<div class="card-cost-text">' + escapeHtml(safeCard.cost ?? "") + '</div>' +
        '<div class="card-name-text">' + escapeHtml(safeCard.name || "") + '</div>' +
        '<div class="card-desc-text">' + colorizeRarityLabels(escapeHtml(safeCard.desc || "")) + '</div>' +
      '</div>' +
      '<div class="card-hit-layer" aria-hidden="true"></div>';
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/\s+/g, "-");
  }

  initDeckViewer();
})();
