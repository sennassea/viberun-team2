"use strict";
/* =========================================================================
   Spirit Path Filter (신령의 길 후보 풀 필터)
   - 신령의 길에서 선택한 3개 덱(+범용)만 이번 런의 카드/약병/법구 후보로 허용합니다.
   - 전투 수치, 확률, 가격 등 밸런스에는 관여하지 않습니다.
   ========================================================================= */
(function(){
  const DEFAULT_SELECTED = ["barrier", "memory", "soul_mark"];
  const REQUIRED_SELECTION_COUNT = 3;
  const VALID_DECK_IDS = ["barrier", "memory", "soul_mark", "hanpuri", "gutpan"];
  const EXTENSION_DECK_PACK_IDS = {
    hanpuri: ["hanpuri", "deck_pack_hanpuri"],
    gutpan: ["gutpan", "deck_pack_gutpan"]
  };
  const warnedSelectionKeys = new Set();

  /* cardData.js의 attr("○○ 덱") / equipment.js의 deck("○○") 표기를 canonical id로 매핑합니다. */
  const DECK_LABEL_TO_ID = {
    "결계": "barrier",
    "회상": "memory",
    "동요": "memory",
    "성불": "soul_mark",
    "성불 표식": "soul_mark",
    "한풀이": "hanpuri",
    "굿판": "gutpan",
    "범용": "generic",
    "범용 보조": "generic"
  };

  function normalizeDeckLabel(label){
    if(typeof label !== "string") return null;
    const trimmed = label.replace(/\s*덱\s*$/, "").trim();
    return trimmed || null;
  }

  function mapDeckLabelToId(label){
    const normalized = normalizeDeckLabel(label);
    if(!normalized) return null;
    if(Object.prototype.hasOwnProperty.call(DECK_LABEL_TO_ID, normalized)){
      return DECK_LABEL_TO_ID[normalized];
    }
    return null;
  }

  function getDefaultSpiritPathDeckIds(){
    return DEFAULT_SELECTED.slice();
  }

  function getOwnedDeckPackIdsSafely(){
    const ownedDeckPackIds = [];
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if(service && typeof service.getCachedDeckPackUnlocks === "function"){
      const cached = service.getCachedDeckPackUnlocks();
      if(cached && Array.isArray(cached.ownedDeckPackIds)){
        ownedDeckPackIds.push(...cached.ownedDeckPackIds);
      }
    }

    if(window.VIBERUN_CONTENT_UNLOCKS && Array.isArray(window.VIBERUN_CONTENT_UNLOCKS.ownedDeckPackIds)){
      ownedDeckPackIds.push(...window.VIBERUN_CONTENT_UNLOCKS.ownedDeckPackIds);
    }

    return Array.from(new Set(
      ownedDeckPackIds
        .map(id => String(id || "").trim())
        .filter(Boolean)
    ));
  }

  function isExtensionDeckOwned(deckId, ownedDeckPackIds){
    const aliases = EXTENSION_DECK_PACK_IDS[deckId];
    if(!aliases) return true;
    return aliases.some(id => ownedDeckPackIds.indexOf(id) !== -1);
  }

  function warnSanitizedSelection(originalIds, sanitizedIds){
    const key = originalIds.join(",") + "=>" + sanitizedIds.join(",");
    if(warnedSelectionKeys.has(key)) return;
    warnedSelectionKeys.add(key);
    console.warn("[SpiritPathFilter] 미보유 확장덱 또는 잘못된 신령의 길 선택값을 기본 덱으로 보정했습니다.", {
      original: originalIds,
      sanitized: sanitizedIds
    });
  }

  /* sessionStorage 조작으로 확장덱을 강제 선택해도 실제 보유권이 확인되지 않으면
     후보 풀에는 반영하지 않습니다. 부족한 선택칸은 기존 기본 3덱 순서로 채워
     새 게임 진행 자체는 막지 않습니다. */
  function sanitizeSpiritPathSelection(selectedDeckIds, options){
    const sourceIds = Array.isArray(selectedDeckIds) ? selectedDeckIds : [];
    const ownedDeckPackIds = getOwnedDeckPackIdsSafely();
    const sanitized = [];
    let changed = !Array.isArray(selectedDeckIds);

    sourceIds.forEach(deckId => {
      const normalizedId = String(deckId || "").trim();
      if(VALID_DECK_IDS.indexOf(normalizedId) === -1){
        changed = true;
        return;
      }
      if(EXTENSION_DECK_PACK_IDS[normalizedId] &&
         !isExtensionDeckOwned(normalizedId, ownedDeckPackIds)){
        changed = true;
        return;
      }
      if(sanitized.indexOf(normalizedId) === -1){
        sanitized.push(normalizedId);
      } else {
        changed = true;
      }
    });

    DEFAULT_SELECTED.forEach(deckId => {
      if(sanitized.length >= REQUIRED_SELECTION_COUNT) return;
      if(sanitized.indexOf(deckId) === -1) sanitized.push(deckId);
    });

    if(sanitized.length > REQUIRED_SELECTION_COUNT){
      sanitized.length = REQUIRED_SELECTION_COUNT;
      changed = true;
    }

    if(sanitized.length !== sourceIds.length ||
       sanitized.some((deckId, index) => deckId !== sourceIds[index])){
      changed = true;
    }

    if(changed && (!options || options.warn !== false)){
      warnSanitizedSelection(sourceIds.map(id => String(id || "").trim()), sanitized);
    }

    return sanitized;
  }

  function persistSanitizedSelection(target, sanitizedIds){
    if(target && typeof target === "object"){
      target.selectedDeckIds = sanitizedIds.slice();
    }

    try {
      sessionStorage.setItem("viberun.selectedSpiritPathDeckIds", JSON.stringify(sanitizedIds));
    } catch(error) {}
  }

  function getStoredSpiritPathDeckIds(){
    if(window.VIBERUN_RUN_DECK_SELECTION &&
       Array.isArray(window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds) &&
       window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds.length === 3){
      const sanitized = sanitizeSpiritPathSelection(window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds);
      if(sanitized.join(",") !== window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds.join(",")){
        persistSanitizedSelection(window.VIBERUN_RUN_DECK_SELECTION, sanitized);
      }
      return sanitized;
    }

    try {
      const raw = sessionStorage.getItem("viberun.selectedSpiritPathDeckIds");
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length === 3){
        const sanitized = sanitizeSpiritPathSelection(parsed);
        if(sanitized.join(",") !== parsed.join(",")){
          persistSanitizedSelection(window.VIBERUN_RUN_DECK_SELECTION || null, sanitized);
        }
        return sanitized;
      }
    } catch(error) {}

    return getDefaultSpiritPathDeckIds();
  }

  function getActiveSpiritPathDeckIds(){
    if(typeof S !== "undefined" && S && Array.isArray(S.selectedSpiritPathDeckIds) &&
       S.selectedSpiritPathDeckIds.length === 3){
      const sanitized = sanitizeSpiritPathSelection(S.selectedSpiritPathDeckIds);
      if(sanitized.join(",") !== S.selectedSpiritPathDeckIds.join(",")){
        S.selectedSpiritPathDeckIds = sanitized.slice();
      }
      return sanitized;
    }

    if(typeof RUN_STATE !== "undefined" && RUN_STATE && Array.isArray(RUN_STATE.selectedSpiritPathDeckIds) &&
       RUN_STATE.selectedSpiritPathDeckIds.length === 3){
      const sanitized = sanitizeSpiritPathSelection(RUN_STATE.selectedSpiritPathDeckIds);
      if(sanitized.join(",") !== RUN_STATE.selectedSpiritPathDeckIds.join(",")){
        RUN_STATE.selectedSpiritPathDeckIds = sanitized.slice();
      }
      return sanitized;
    }

    return getStoredSpiritPathDeckIds();
  }

  /* 알 수 없는 아이템은 기존 기능 보호를 위해 기본 허용(null) 처리합니다.
     deckId/attr/deck으로 특정 덱 소속이 명확히 판별될 때만 제한 대상이 됩니다. */
  function resolveItemSpiritPathId(item){
    if(!item || typeof item !== "object") return null;

    if(typeof item.deckId === "string" && item.deckId){
      return item.deckId;
    }

    if(typeof item.attr === "string"){
      const mapped = mapDeckLabelToId(item.attr);
      if(mapped) return mapped;
    }

    if(typeof item.deck === "string"){
      const mapped = mapDeckLabelToId(item.deck);
      if(mapped) return mapped;
    }

    return null;
  }

  function isItemAllowedBySpiritPath(item){
    const deckId = resolveItemSpiritPathId(item);
    if(!deckId || deckId === "generic") return true;

    const activeIds = getActiveSpiritPathDeckIds();
    return activeIds.indexOf(deckId) !== -1;
  }

  function filterCardKeysBySpiritPath(keys){
    if(!Array.isArray(keys)) return [];
    if(typeof CARD_DB === "undefined" || !CARD_DB) return keys.slice();
    return keys.filter(key => isItemAllowedBySpiritPath(CARD_DB[key]));
  }

  function filterItemsBySpiritPath(items){
    if(!Array.isArray(items)) return [];
    return items.filter(item => isItemAllowedBySpiritPath(item));
  }

  window.VIBERUN_SPIRIT_PATH_FILTER = {
    getDefaultSpiritPathDeckIds,
    getStoredSpiritPathDeckIds,
    getActiveSpiritPathDeckIds,
    getOwnedDeckPackIdsSafely,
    sanitizeSpiritPathSelection,
    resolveItemSpiritPathId,
    isItemAllowedBySpiritPath,
    filterCardKeysBySpiritPath,
    filterItemsBySpiritPath
  };
})();
