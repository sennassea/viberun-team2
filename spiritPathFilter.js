"use strict";
/* =========================================================================
   Spirit Path Filter (신령의 길 후보 풀 필터)
   - 신령의 길에서 선택한 3개 덱(+범용)만 이번 런의 카드/약병/법구 후보로 허용합니다.
   - 전투 수치, 확률, 가격 등 밸런스에는 관여하지 않습니다.
   ========================================================================= */
(function(){
  const DEFAULT_SELECTED = ["barrier", "memory", "soul_mark"];

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

  function getStoredSpiritPathDeckIds(){
    if(window.VIBERUN_RUN_DECK_SELECTION &&
       Array.isArray(window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds) &&
       window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds.length === 3){
      return window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds.slice();
    }

    try {
      const raw = sessionStorage.getItem("viberun.selectedSpiritPathDeckIds");
      const parsed = JSON.parse(raw);
      if(Array.isArray(parsed) && parsed.length === 3) return parsed;
    } catch(error) {}

    return getDefaultSpiritPathDeckIds();
  }

  function getActiveSpiritPathDeckIds(){
    if(typeof S !== "undefined" && S && Array.isArray(S.selectedSpiritPathDeckIds) &&
       S.selectedSpiritPathDeckIds.length === 3){
      return S.selectedSpiritPathDeckIds.slice();
    }

    if(typeof RUN_STATE !== "undefined" && RUN_STATE && Array.isArray(RUN_STATE.selectedSpiritPathDeckIds) &&
       RUN_STATE.selectedSpiritPathDeckIds.length === 3){
      return RUN_STATE.selectedSpiritPathDeckIds.slice();
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
    resolveItemSpiritPathId,
    isItemAllowedBySpiritPath,
    filterCardKeysBySpiritPath,
    filterItemsBySpiritPath
  };
})();
