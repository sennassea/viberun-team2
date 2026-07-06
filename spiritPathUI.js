"use strict";

/* =========================================================================
   Spirit Path UI (신령의 길)
   - 선택값은 sessionStorage / window 전역값에 저장되며, spiritPathFilter.js를
     통해 카드/약병/법구 출현 풀 필터링에 사용됩니다.
   - 확장덱(한풀이/굿판)의 가격, 잠금 여부는 bmStoreData.js / bmStoreService.js에
     이미 구현된 BM 정보를 그대로 가져와 표시합니다.
   ========================================================================= */
(function(){
  const DEFAULT_SELECTED = ["barrier", "memory", "soul_mark"];
  const REQUIRED_SELECTION_COUNT = 3;

  /* deckId <-> cardData.js attr 표기 매핑입니다. 카드 썸네일 미리보기에만 사용합니다. */
  const DECKS = [
    {
      id: "barrier",
      name: "결계",
      subtitle: "막고, 모아서, 되돌린다",
      tags: ["방어", "반격"],
      cardAttr: "결계 덱",
      deckPackId: null
    },
    {
      id: "memory",
      name: "회상",
      subtitle: "쌓고, 오래 괴롭힌다",
      tags: ["지속 정화", "장기전"],
      cardAttr: "회상 덱",
      deckPackId: null
    },
    {
      id: "soul_mark",
      name: "성불 표식",
      subtitle: "모았다가 한 번에 터뜨린다",
      tags: ["축적", "폭발"],
      cardAttr: "성불 표식 덱",
      deckPackId: null
    },
    {
      id: "hanpuri",
      name: "한풀이",
      subtitle: "참았다가 더 크게 푼다",
      tags: ["성장", "회수"],
      cardAttr: "한풀이 덱",
      deckPackId: "hanpuri"
    },
    {
      id: "gutpan",
      name: "굿판",
      subtitle: "만들고, 연속으로 몰아친다",
      tags: ["생성", "연속 사용"],
      cardAttr: "굿판 덱",
      deckPackId: "gutpan"
    }
  ];

  let rootEl = null;
  let selectedDeckIds = DEFAULT_SELECTED.slice();
  let ownedDeckPackIds = [];
  let deckPackProductsById = {};
  let walletMoonShards = 0;
  let onCompleteCallback = null;

  function showToastMessage(message){
    if(typeof toast === "function"){
      toast(message);
      return;
    }
    console.log("[SpiritPathUI]", message);
  }

  function getDeckPackProduct(deckPackId){
    return deckPackProductsById[deckPackId] || null;
  }

  function isDeckLocked(deck){
    if(!deck.deckPackId) return false;
    return ownedDeckPackIds.indexOf(deck.deckPackId) === -1;
  }

  function getCardPreviewList(deck){
    if(typeof CARD_DB !== "object" || !CARD_DB) return [];
    return Object.keys(CARD_DB)
      .map(key => CARD_DB[key])
      .filter(card => card && card.attr === deck.cardAttr)
      .slice(0, 4);
  }

  function ensureRoot(){
    if(rootEl) return rootEl;
    rootEl = document.createElement("div");
    rootEl.className = "spirit-path-modal";
    rootEl.hidden = true;
    /* 로그인/월영당/선물함 모달과 동일하게 #game 안에 붙여야 z-index 비교가
       같은 스태킹 컨텍스트 안에서 이뤄집니다(#stageWrap이 position:fixed라
       그 밖에 붙이면 z-index 값과 무관하게 항상 위/아래로 분리됩니다). */
    (document.querySelector("#game") || document.body).appendChild(rootEl);
    return rootEl;
  }

  function formatMoonShards(amount){
    return Math.max(0, Math.floor(Number(amount) || 0)).toLocaleString("ko-KR");
  }

  function renderDeckCard(deck){
    const locked = isDeckLocked(deck);
    const selected = selectedDeckIds.indexOf(deck.id) !== -1;
    const product = deck.deckPackId ? getDeckPackProduct(deck.deckPackId) : null;
    const previewCards = getCardPreviewList(deck);

    const badgeText = locked ? "미구매" : (selected ? "선택됨" : "선택");

    const previewHtml = previewCards.length
      ? '<span class="spirit-path-card-preview">' +
          previewCards.map(card =>
            '<span class="spirit-path-preview-item" title="' + card.name + '">' +
              '<span class="spirit-path-preview-emoji">' + (card.emoji || "🌸") + '</span>' +
            '</span>'
          ).join("") +
        '</span>'
      : "";

    const tagsHtml = '<span class="spirit-path-card-tags">' +
      deck.tags.map(tag => '<em>' + tag + '</em>').join("") +
      '</span>';

    const purchaseHtml = locked
      ? '<button type="button" class="spirit-path-purchase-btn" data-deck-pack-id="' + deck.deckPackId + '">' +
          '🌙 ' + formatMoonShards(product ? product.price : 0) + ' 달빛 조각 구매' +
        '</button>'
      : "";

    return (
      '<div role="button" tabindex="0" class="spirit-path-card' +
        (selected ? ' is-selected' : '') +
        (locked ? ' is-locked' : '') +
      '" data-deck-id="' + deck.id + '"' + (locked ? ' data-locked="true"' : '') + '>' +
        '<span class="spirit-path-card-badge">' + badgeText + '</span>' +
        (locked ? '<span class="spirit-path-lock" aria-hidden="true">🔒</span>' : '') +
        '<strong class="spirit-path-card-title">' + deck.name + '</strong>' +
        '<span class="spirit-path-card-subtitle">' + deck.subtitle + '</span>' +
        previewHtml +
        (locked ? tagsHtml + purchaseHtml : tagsHtml) +
      '</div>'
    );
  }

  function render(){
    const root = ensureRoot();
    const cardsHtml = DECKS.map(renderDeckCard).join("");
    const canStart = selectedDeckIds.length === REQUIRED_SELECTION_COUNT;

    root.innerHTML =
      '<div class="spirit-path-backdrop"></div>' +
      '<section class="spirit-path-panel" role="dialog" aria-modal="true" aria-label="신령의 길">' +
        '<h1 class="spirit-path-title">신령의 길</h1>' +
        '<p class="spirit-path-desc">당신을 인도할 길을 선택하세요.<br>당신이 선택한 길에 따라 이번 정화 여정 운명이 정해집니다</p>' +
        '<div class="spirit-path-count">' + selectedDeckIds.length + '/' + REQUIRED_SELECTION_COUNT + ' 선택 완료</div>' +
        '<div class="spirit-path-card-list">' + cardsHtml + '</div>' +
        '<p class="spirit-path-note">※ 범용 주문, 약병, 법구는 항상 이번 여정에 포함됩니다.</p>' +
        '<div class="spirit-path-actions">' +
          '<button type="button" class="spirit-path-back">뒤로가기</button>' +
          '<span class="spirit-path-wallet">🌙 보유 달빛 조각 <strong>' + formatMoonShards(walletMoonShards) + '</strong></span>' +
          '<button type="button" class="spirit-path-start"' + (canStart ? "" : " disabled") + '>의식 시작</button>' +
        '</div>' +
      '</section>';

    root.querySelector(".spirit-path-backdrop").addEventListener("click", close);
    root.querySelector(".spirit-path-back").addEventListener("click", close);
    root.querySelector(".spirit-path-start").addEventListener("click", complete);

    root.querySelectorAll(".spirit-path-card").forEach(cardEl => {
      cardEl.addEventListener("click", event => {
        if(event.target.closest(".spirit-path-purchase-btn")) return;
        toggleDeck(cardEl.dataset.deckId);
      });
      cardEl.addEventListener("keydown", event => {
        if(event.key !== "Enter" && event.key !== " ") return;
        if(event.target.closest(".spirit-path-purchase-btn")) return;
        event.preventDefault();
        toggleDeck(cardEl.dataset.deckId);
      });
    });

    root.querySelectorAll(".spirit-path-purchase-btn").forEach(btnEl => {
      btnEl.addEventListener("click", event => {
        event.stopPropagation();
        openDeckPackPurchase(btnEl.dataset.deckPackId);
      });
    });
  }

  function toggleDeck(deckId){
    const deck = DECKS.find(item => item.id === deckId);
    if(!deck) return;

    if(isDeckLocked(deck)){
      showToastMessage("구매하지 않은 확장덱입니다.");
      return;
    }

    if(selectedDeckIds.indexOf(deckId) !== -1){
      selectedDeckIds = selectedDeckIds.filter(id => id !== deckId);
      render();
      return;
    }

    if(selectedDeckIds.length >= REQUIRED_SELECTION_COUNT){
      showToastMessage("이번 여정에 선택할 수 있는 길은 " + REQUIRED_SELECTION_COUNT + "개까지입니다.");
      return;
    }

    selectedDeckIds.push(deckId);
    render();
  }

  function openDeckPackPurchase(deckPackId){
    if(window.VIBERUN_BM_STORE_UI && typeof window.VIBERUN_BM_STORE_UI.open === "function"){
      window.VIBERUN_BM_STORE_UI.open("order_pack");
      return;
    }
    showToastMessage("상점을 불러올 수 없습니다.");
  }

  function loadDeckPackProducts(){
    const data = window.VIBERUN_BM_STORE_DATA;
    if(!data || typeof data.getDeckPackProducts !== "function"){
      deckPackProductsById = {};
      return;
    }
    deckPackProductsById = data.getDeckPackProducts().reduce((map, product) => {
      if(product && product.deckPackId) map[product.deckPackId] = product;
      return map;
    }, {});
  }

  function fetchOwnedDeckPacks(){
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if(!service || typeof service.fetchDeckPackUnlocks !== "function"){
      ownedDeckPackIds = [];
      return Promise.resolve();
    }

    return Promise.resolve(service.fetchDeckPackUnlocks()).then(result => {
      ownedDeckPackIds = (result && result.ok && result.deckPackUnlocks &&
        Array.isArray(result.deckPackUnlocks.ownedDeckPackIds))
        ? result.deckPackUnlocks.ownedDeckPackIds.slice()
        : [];
    }).catch(error => {
      console.warn("[SpiritPathUI] 확장덱 소유권 조회 실패", error);
      ownedDeckPackIds = [];
    });
  }

  function fetchWalletBalance(){
    const walletService = window.VIBERUN_WALLET;
    if(!walletService) return Promise.resolve();

    const cached = typeof walletService.getCachedWallet === "function"
      ? walletService.getCachedWallet()
      : null;
    if(cached) walletMoonShards = cached.moonShards || 0;

    if(typeof walletService.fetchWallet !== "function") return Promise.resolve();

    return Promise.resolve(walletService.fetchWallet()).then(result => {
      if(result && result.ok && result.wallet){
        walletMoonShards = result.wallet.moonShards || 0;
      }
    }).catch(error => {
      console.warn("[SpiritPathUI] wallet 조회 실패", error);
    });
  }

  function refreshOwnedAndRender(){
    if(!rootEl || rootEl.hidden) return;
    Promise.all([fetchOwnedDeckPacks(), fetchWalletBalance()]).then(render);
  }

  function open(options){
    onCompleteCallback = options && typeof options.onComplete === "function"
      ? options.onComplete
      : null;

    selectedDeckIds = DEFAULT_SELECTED.slice();
    loadDeckPackProducts();

    ensureRoot();
    rootEl.hidden = false;
    rootEl.style.display = "";
    render();

    Promise.all([fetchOwnedDeckPacks(), fetchWalletBalance()]).then(render);
  }

  function close(){
    if(!rootEl) return;
    rootEl.hidden = true;
    rootEl.style.display = "none";
    onCompleteCallback = null;
  }

  function complete(){
    if(selectedDeckIds.length !== REQUIRED_SELECTION_COUNT){
      showToastMessage("이번 여정에 포함할 길 " + REQUIRED_SELECTION_COUNT + "가지를 선택하세요.");
      return;
    }

    const payload = {
      selectedDeckIds: selectedDeckIds.slice(),
      alwaysIncludeGeneric: true
    };

    try {
      sessionStorage.setItem("viberun.selectedSpiritPathDeckIds", JSON.stringify(payload.selectedDeckIds));
    } catch(error) {
      console.warn("[SpiritPathUI] 선택값 저장 실패", error);
    }

    window.VIBERUN_RUN_DECK_SELECTION = payload;

    const callback = onCompleteCallback;
    close();
    if(callback) callback(payload);
  }

  window.addEventListener("viberun:mailbox-changed", refreshOwnedAndRender);
  window.addEventListener("viberun:wallet-changed", event => {
    const wallet = event && event.detail ? event.detail.wallet : null;
    if(wallet) walletMoonShards = wallet.moonShards || 0;
    if(rootEl && !rootEl.hidden) render();
  });

  window.VIBERUN_SPIRIT_PATH_UI = {
    open,
    close
  };
})();
