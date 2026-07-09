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
  const PREVIEW_CARD_LIMIT = 2;
  const PREVIEW_RELIC_LIMIT = 1;
  const PREVIEW_POTION_LIMIT = 1;
  const SPIRIT_PATH_ASSETS = {
    panelUnlocked: "assets/ui/spirit_path/deck_panel_unlocked.png",
    panelLocked: "assets/ui/spirit_path/deck_panel_locked.png",
    selectedRibbon: "assets/ui/spirit_path/selected_ribbon.png",
    lockSeal: "assets/ui/spirit_path/lock_seal.png",
    deck_emblem_barrier: "assets/ui/spirit_path/deck_emblem_barrier.png",
    deck_emblem_memory: "assets/ui/spirit_path/deck_emblem_memory.png",
    deck_emblem_soul_mark: "assets/ui/spirit_path/deck_emblem_soul_mark.png",
    deck_emblem_hanpuri: "assets/ui/spirit_path/deck_emblem_hanpuri.png",
    deck_emblem_gutpan: "assets/ui/spirit_path/deck_emblem_gutpan.png"
  };

  /* deckId <-> cardData.js attr 표기 매핑입니다. 카드 썸네일 미리보기에만 사용합니다. */
  const DECKS = [
    {
      id: "barrier",
      name: "결계",
      subtitle: "막고, 모아서, 되돌린다",
      tags: ["방어", "반격"],
      cardAttr: "결계 덱",
      itemDeck: "결계",
      deckPackId: null,
      emblemKey: "deck_emblem_barrier"
    },
    {
      id: "memory",
      name: "회상",
      subtitle: "쌓고, 오래 괴롭힌다",
      tags: ["지속 정화", "장기전"],
      cardAttr: "회상 덱",
      itemDeck: "회상",
      deckPackId: null,
      emblemKey: "deck_emblem_memory"
    },
    {
      id: "soul_mark",
      name: "성불 표식",
      subtitle: "모았다가 한 번에 터뜨린다",
      tags: ["축적", "폭발"],
      cardAttr: "성불 표식 덱",
      itemDeck: "성불 표식",
      deckPackId: null,
      emblemKey: "deck_emblem_soul_mark"
    },
    {
      id: "hanpuri",
      name: "한풀이",
      subtitle: "참았다가 더 크게 푼다",
      tags: ["성장", "회수"],
      cardAttr: "한풀이 덱",
      itemDeck: "한풀이",
      deckPackId: "hanpuri",
      emblemKey: "deck_emblem_hanpuri"
    },
    {
      id: "gutpan",
      name: "굿판",
      subtitle: "만들고, 연속으로 몰아친다",
      tags: ["생성", "연속 사용"],
      cardAttr: "굿판 덱",
      itemDeck: "굿판",
      deckPackId: "gutpan",
      emblemKey: "deck_emblem_gutpan"
    }
  ];

  let rootEl = null;
  let selectedDeckIds = DEFAULT_SELECTED.slice();
  let ownedDeckPackIds = [];
  let deckPackProductsById = {};
  let walletMoonShards = 0;
  let onCompleteCallback = null;
  const state = {
    startEndlessLevel: 0
  };

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
      .map(key => ({ key, card: CARD_DB[key] }))
      .filter(entry => entry.card && entry.card.attr === deck.cardAttr);
  }

  function getRelicPreviewList(deck){
    if(typeof RELIC_MASTER_DB === "undefined" || !Array.isArray(RELIC_MASTER_DB)) return [];
    return RELIC_MASTER_DB.filter(relic => {
      if(!relic || relic.category === "blessingRelic" || relic.source === "startBlessing") return false;
      return relic.deck === deck.itemDeck;
    });
  }

  function getPotionPreviewList(deck){
    if(typeof POTION_DB === "undefined" || !Array.isArray(POTION_DB)) return [];
    return POTION_DB.filter(potion => potion && potion.deckId === deck.id);
  }

  function hasDeckMechanicSignal(card){
    if(!card) return false;
    if(card.hanpuriGrowth) return true;
    if(Array.isArray(card.fx)){
      return card.fx.some(effect => {
        return effect && (effect.growthStat || effect.gutpanBonus || effect.memory || effect.mark || effect.barrier);
      });
    }
    return false;
  }

  function isRarePreviewCard(entry){
    const card = entry && entry.card;
    return card && String(card.rarity || "").toLowerCase() === "rare";
  }

  function isUsablePreviewCard(entry){
    const card = entry && entry.card;
    return !!(card && !card.generatedOnly && !card.excludeFromRewards && card.type !== "status");
  }

  function appendUniquePreviewCards(target, source, seen){
    source.forEach(entry => {
      const key = entry && entry.key;
      if(!entry || !key || seen[key]) return;
      seen[key] = true;
      target.push(entry);
    });
  }

  function getRepresentativeCardPreviewList(entries){
    const usableEntries = entries.filter(isUsablePreviewCard);
    const rareEntries = usableEntries.filter(isRarePreviewCard);
    const coreEntries = usableEntries.filter(entry => hasDeckMechanicSignal(entry.card));
    const selected = [];
    const seen = {};

    appendUniquePreviewCards(selected, rareEntries, seen);
    appendUniquePreviewCards(selected, coreEntries, seen);
    appendUniquePreviewCards(selected, usableEntries, seen);
    appendUniquePreviewCards(selected, entries, seen);

    return selected.slice(0, PREVIEW_CARD_LIMIT);
  }

  function getUnlockedStartLevels(){
    const progress = window.VIBERUN_ENDLESS_PROGRESS;
    if(progress && typeof progress.getUnlockedStartLevels === "function"){
      return progress.getUnlockedStartLevels();
    }
    return [{ level: 0, label: "최초의 여정", unlocked: true }];
  }

  function getStartEndlessLevelNumber(entry){
    const level = Number(entry && entry.level);
    return Number.isFinite(level) ? Math.max(0, Math.floor(level)) : 0;
  }

  function getStartEndlessDebuff(level){
    const numericLevel = Number(level) || 0;
    if(numericLevel <= 0) return null;
    if(typeof window.getEndlessJourneyDebuffByLevel === "function"){
      return window.getEndlessJourneyDebuffByLevel(numericLevel);
    }
    const list = window.ENDLESS_JOURNEY_DEBUFFS;
    return Array.isArray(list)
      ? list.find(debuff => debuff && debuff.level === numericLevel) || null
      : null;
  }

  function getStartEndlessLevelOptions(){
    const levels = getUnlockedStartLevels()
      .filter(entry => entry && entry.unlocked !== false)
      .map(entry => ({
        level: getStartEndlessLevelNumber(entry),
        label: entry.label || ""
      }));
    return levels.length ? levels : [{ level: 0, label: "최초의 여정" }];
  }

  function getCurrentStartEndlessLevelIndex(levels){
    const currentLevel = Math.max(0, Math.floor(Number(state.startEndlessLevel) || 0));
    const index = levels.findIndex(entry => entry.level === currentLevel);
    return index >= 0 ? index : 0;
  }

  function renderActSection(){
    const levels = getStartEndlessLevelOptions();
    const currentIndex = getCurrentStartEndlessLevelIndex(levels);
    const currentLevel = levels[currentIndex].level;
    const debuff = getStartEndlessDebuff(currentLevel);
    const title = currentLevel === 0 ? "최초의 여정" : "끝없는 여정 " + currentLevel;
    const value = currentLevel === 0 ? "기본" : "심도 " + currentLevel;
    const effectName = currentLevel === 0 ? "심도 디버프 없음" : (debuff && debuff.name ? debuff.name : "심도 " + currentLevel);
    const effectDesc = currentLevel === 0 ? "적용되는 심도 디버프가 없습니다." : (debuff && debuff.desc ? debuff.desc : "기존 심도 효과가 적용됩니다.");
    const cumulativeNote = currentLevel > 0
      ? "심도 1~" + currentLevel + " 효과가 누적 적용됩니다."
      : "기본 여정으로 시작합니다.";

    return (
      '<div class="spirit-path-act-section">' +
        '<h2 class="spirit-path-act-title">시작 여정</h2>' +
        '<p class="spirit-path-act-desc">클리어한 끝없는 여정까지 선택할 수 있습니다.</p>' +
        '<div class="spirit-path-depth-selector">' +
          '<button type="button" class="spirit-path-depth-arrow" data-depth-step="-1"' + (currentIndex <= 0 ? ' disabled' : '') + ' aria-label="이전 심도">‹</button>' +
          '<div class="spirit-path-depth-body">' +
            '<strong class="spirit-path-depth-title">' + escapeHtml(title) + '</strong>' +
            '<div class="spirit-path-depth-value">' + escapeHtml(value) + '</div>' +
            '<div class="spirit-path-depth-effect-name">' + escapeHtml(effectName) + '</div>' +
            '<p class="spirit-path-depth-effect-desc">' + escapeHtml(effectDesc) + '</p>' +
            '<p class="spirit-path-depth-cumulative-note">' + escapeHtml(cumulativeNote) + '</p>' +
          '</div>' +
          '<button type="button" class="spirit-path-depth-arrow" data-depth-step="1"' + (currentIndex >= levels.length - 1 ? ' disabled' : '') + ' aria-label="다음 심도">›</button>' +
        '</div>' +
      '</div>'
    );
  }

  function stepStartEndlessLevel(direction){
    const levels = getStartEndlessLevelOptions();
    const currentIndex = getCurrentStartEndlessLevelIndex(levels);
    const nextIndex = Math.max(0, Math.min(levels.length - 1, currentIndex + direction));
    if(nextIndex === currentIndex) return;
    selectStartEndlessLevel(levels[nextIndex].level);
  }

  function selectStartEndlessLevel(level){
    const numericLevel = Number(level);
    const progress = window.VIBERUN_ENDLESS_PROGRESS;
    const canStart = progress && typeof progress.canStartFromEndlessLevel === "function"
      ? progress.canStartFromEndlessLevel(numericLevel)
      : numericLevel === 0;

    if(!canStart){
      showToastMessage("아직 선택할 수 없는 여정입니다.");
      return;
    }

    state.startEndlessLevel = numericLevel;
    render();
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

  function escapeHtml(value){
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value){
    return escapeHtml(value);
  }

  function cardArtHtml(card){
    if(card && card.art){
      return '<img src="' + escapeAttr(card.art) + '" alt="' + escapeAttr(card.name || "") + '">';
    }
    return escapeHtml(card && card.emoji ? card.emoji : "?");
  }

  function cardFramePath(card){
    if(card && card.type === "status") return "assets/card_frames/card-frame-status.png";
    const type = card && ["attack", "defense", "skill"].includes(card.type) ? card.type : "skill";
    const rarity = card && card.rarity ? card.rarity : "common";
    return "assets/card_frames/card-frame-" + type + "-" + rarity + ".png";
  }

  function cardFaceHtml(card){
    const safeCard = card || {};
    const desc = typeof colorizeRarityLabels === "function"
      ? colorizeRarityLabels(escapeHtml(safeCard.desc || ""))
      : escapeHtml(safeCard.desc || "");
    return '<div class="card-art-layer">' + cardArtHtml(safeCard) + '</div>' +
      '<img class="card-frame-layer" src="' + escapeAttr(cardFramePath(safeCard)) + '" alt="" aria-hidden="true" draggable="false">' +
      '<div class="card-text-layer">' +
        '<div class="card-cost-text">' + escapeHtml(safeCard.cost ?? "") + '</div>' +
        '<div class="card-name-text">' + escapeHtml(safeCard.name || "") + '</div>' +
        '<div class="card-desc-text">' + desc + '</div>' +
      '</div>' +
      '<div class="card-hit-layer" aria-hidden="true"></div>';
  }

  function getItemIconSrc(item, iconMapName){
    const iconMap = window[iconMapName];
    if(item && item.iconImage) return item.iconImage;
    if(iconMap && item && item.id && iconMap[item.id]) return iconMap[item.id];
    return "";
  }

  function renderMiniCard(entry, locked){
    const card = entry && entry.card;
    if(!card) return "";
    return '<div class="spirit-path-mini-card card-frame-card cost-' + escapeAttr(card.type || "skill") +
      (locked ? ' is-preview-disabled" data-tooltip-disabled="true"' : '"') +
      ' data-card-key="' + escapeAttr(entry.key) + '">' +
      cardFaceHtml(card) +
    '</div>';
  }

  function renderMiniItem(item, kind, locked){
    if(!item) return "";
    const iconSrc = kind === "relic"
      ? getItemIconSrc(item, "RELIC_ICON_PATHS")
      : getItemIconSrc(item, "POTION_ICON_PATHS");
    const imgHtml = iconSrc
      ? '<img class="spirit-path-mini-item-icon" src="' + escapeAttr(iconSrc) + '" alt="" onerror="this.remove()">'
      : "";
    return (
      '<div class="spirit-path-mini-item spirit-path-mini-item--' + kind + '" data-tooltip-title="' +
        escapeAttr((item.name || "") + (item.emoji ? " " + item.emoji : "")) + '" data-tooltip="' + escapeAttr(item.desc || item.effectText || "") + '"' +
        (locked ? ' data-tooltip-disabled="true"' : '') + '>' +
        '<span class="spirit-path-mini-item-fallback">' + escapeHtml(item.emoji || (kind === "relic" ? "🏺" : "🧪")) + '</span>' +
        imgHtml +
      '</div>'
    );
  }

  function renderPreviewSection(title, className, itemsHtml, emptyText){
    return '<div class="spirit-path-preview-section spirit-path-preview-section--' + className + '">' +
      '<div class="spirit-path-preview-title">' + title + '</div>' +
      '<div class="spirit-path-preview-grid spirit-path-preview-grid--' + className + '">' +
        (itemsHtml || '<span class="spirit-path-preview-empty">' + emptyText + '</span>') +
      '</div>' +
    '</div>';
  }

  function assetStyleVar(name, value){
    return value ? '--' + name + ':url(&quot;' + escapeAttr(value) + '&quot;);' : "";
  }

  function renderDeckEmblem(deck){
    const emblemPath = SPIRIT_PATH_ASSETS[deck.emblemKey];
    if(emblemPath){
      return '<img class="spirit-path-card-emblem" src="' + escapeAttr(emblemPath) + '" alt="" aria-hidden="true">';
    }
    return '<span class="spirit-path-card-emblem spirit-path-card-emblem--fallback" aria-hidden="true">' + escapeHtml(deck.name.charAt(0) || "") + '</span>';
  }

  function renderDeckCard(deck){
    const locked = isDeckLocked(deck);
    const selected = selectedDeckIds.indexOf(deck.id) !== -1;
    const product = deck.deckPackId ? getDeckPackProduct(deck.deckPackId) : null;
    const previewCards = getCardPreviewList(deck);
    const previewRelics = getRelicPreviewList(deck);
    const previewPotions = getPotionPreviewList(deck);
    const visiblePreviewCards = getRepresentativeCardPreviewList(previewCards);
    const visiblePreviewRelics = previewRelics.slice(0, PREVIEW_RELIC_LIMIT);
    const visiblePreviewPotions = previewPotions.slice(0, PREVIEW_POTION_LIMIT);

    const tagsHtml = '<span class="spirit-path-card-tags">' +
      deck.tags.map(tag => '<em>' + escapeHtml(tag) + '</em>').join("") +
      '</span>';

    const purchaseHtml = locked
      ? '<div class="spirit-path-purchase-panel">' +
          '<button type="button" class="spirit-path-purchase-btn" data-deck-pack-id="' + deck.deckPackId + '">' +
            '<span>🌙 ' + formatMoonShards(product ? product.price : 0) + '</span><strong>구매</strong>' +
          '</button>' +
        '</div>'
      : "";
    const statusHtml = selected
      ? '<span class="spirit-path-selected-ribbon"><span>선택됨</span></span>'
      : (locked ? '<span class="spirit-path-lock-seal">' +
          (SPIRIT_PATH_ASSETS.lockSeal
            ? '<img src="' + escapeAttr(SPIRIT_PATH_ASSETS.lockSeal) + '" alt="" aria-hidden="true">'
            : '<span class="spirit-path-lock-seal-fallback" aria-hidden="true">잠금</span>') +
        '</span>' : "");
    const cardStyle = assetStyleVar("spirit-path-panel-bg", locked ? SPIRIT_PATH_ASSETS.panelLocked : SPIRIT_PATH_ASSETS.panelUnlocked) +
      assetStyleVar("spirit-path-ribbon-bg", SPIRIT_PATH_ASSETS.selectedRibbon);

    return (
      '<div role="button" tabindex="0" class="spirit-path-card' +
        (locked ? '' : ' is-unlocked') +
        (selected ? ' is-selected' : '') +
        (locked ? ' is-locked' : '') +
      '" data-deck-id="' + deck.id + '"' + (locked ? ' data-locked="true"' : '') + (cardStyle ? ' style="' + cardStyle + '"' : '') + '>' +
        statusHtml +
        '<div class="spirit-path-card-head">' +
          renderDeckEmblem(deck) +
          '<strong class="spirit-path-card-title">' + escapeHtml(deck.name) + '</strong>' +
          '<span class="spirit-path-card-subtitle">' + escapeHtml(deck.subtitle) + '</span>' +
          tagsHtml +
        '</div>' +
        '<div class="spirit-path-card-content">' +
          renderPreviewSection("주문", "cards", visiblePreviewCards.map(entry => renderMiniCard(entry, locked)).join(""), "주문 없음") +
          renderPreviewSection("법구", "relics", visiblePreviewRelics.map(relic => renderMiniItem(relic, "relic", locked)).join(""), "법구 없음") +
          renderPreviewSection("약병", "potions", visiblePreviewPotions.map(potion => renderMiniItem(potion, "potion", locked)).join(""), "약병 없음") +
        '</div>' +
        purchaseHtml +
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
        '<div class="spirit-path-main-frame">' +
          '<div class="spirit-path-main-content">' +
            '<h1 class="spirit-path-title">신령의 길</h1>' +
            '<p class="spirit-path-desc">당신을 인도할 길을 선택하세요.<br>당신이 선택한 길에 따라 이번 정화 여정 운명이 정해집니다</p>' +
            '<div class="spirit-path-count">' + selectedDeckIds.length + '/' + REQUIRED_SELECTION_COUNT + ' 선택 완료</div>' +
            '<div class="spirit-path-card-list">' + cardsHtml + '</div>' +
            '<p class="spirit-path-note spirit-path-main-note">※ 범용 주문, 약병, 법구는 항상 이번 여정에 포함됩니다.</p>' +
          '</div>' +
        '</div>' +
        '<div class="spirit-path-journey-panel">' +
          '<div class="spirit-path-bottom-row">' +
          '<div class="spirit-path-bottom-side spirit-path-bottom-side--left">' +
            '<button type="button" class="spirit-path-back">뒤로가기</button>' +
          '</div>' +
          '<div class="spirit-path-bottom-center">' +
            renderActSection() +
            '<span class="spirit-path-wallet">🌙 보유 달빛 조각 <strong>' + formatMoonShards(walletMoonShards) + '</strong></span>' +
          '</div>' +
          '<div class="spirit-path-bottom-side spirit-path-bottom-side--right">' +
            '<button type="button" class="spirit-path-start"' + (canStart ? "" : " disabled") + '>여정 시작</button>' +
          '</div>' +
          '</div>' +
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

    root.querySelectorAll(".spirit-path-depth-arrow").forEach(btnEl => {
      btnEl.addEventListener("click", () => {
        stepStartEndlessLevel(Number(btnEl.dataset.depthStep) || 0);
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
    state.startEndlessLevel = 0;
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
      alwaysIncludeGeneric: true,
      startEndlessLevel: state.startEndlessLevel || 0
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
