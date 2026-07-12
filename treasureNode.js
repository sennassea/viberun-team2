"use strict";
/* =========================================================================
   보물 노드 로직 (treasureNode.js)
   기획서: 10층 보물 노드 구현 지시서

   상자 개봉/골드·법구 지급, 중복 지급 방지 상태, 노드 진입 흐름을 담당한다.
   화면 렌더링(오버레이 DOM, 스타일)은 treasureNodeUI.js로 분리되어 있으며
   이 파일은 함수 이름으로만 그 UI 함수들을 호출한다(같은 전역 스코프).
   유니티 이식 시 이 파일의 지급 로직은 C#으로 그대로 옮길 수 있다.

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / restNode.js /
   shopNode.js / eventNode.js / equipment.js(RELIC_DB) / script.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고, startStage()를
   감싸(wrap) treasure 타입 노드 진입 시 보물 노드 화면을 띄웁니다.
   (shopNode.js / eventNode.js와 동일한 wrapping 패턴)
   ========================================================================= */

const TREASURE_GOLD_AMOUNT = 40;
const TREASURE_RELIC_RARITY_WEIGHTS = { common: 50, uncommon: 35, rare: 15 };
/* 후보가 없을 때(전부 보유/필터링됨)를 "아직 추첨 안 함"과 구분하기 위한 표식 */
const TREASURE_NONE_RELIC_ID = "__treasure_none__";

let treasureOverlayEl = null;

/* ── 중복 지급 방지 상태값 ───────────────────────────────────────────────── */
function ensureTreasureNodeState(){
  if(typeof S === "undefined" || !S) return null;
  if(!S.treasureNodeState){
    S.treasureNodeState = {
      opened: false,
      goldGranted: false,
      relicResolved: false,
      offeredRelicId: null
    };
  }
  return S.treasureNodeState;
}

/* ── 법구 후보 추첨 ───────────────────────────────────────────────────────
   getRelicCandidatesBySource("treasure")는 RELIC_DB의 obtainFrom/
   obtainFromProposal에 "treasure" 소스가 매핑되어 있지 않아 후보가 비게
   되므로, treasure 전용으로 RELIC_DB를 직접 필터링한다. */
function getTreasureRelicCandidates(){
  const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  const ownedIds = new Set(
    (typeof S !== "undefined" && S && Array.isArray(S.relics) ? S.relics : [])
      .map(relic => relic && relic.id)
      .filter(Boolean)
  );
  return db.filter(item => {
    if(!item || ownedIds.has(item.id)) return false;
    if(item.category === "blessingRelic" || item.source === "startBlessing") return false;
    if(!["common", "uncommon", "rare"].includes(item.rarity)) return false;
    if(window.VIBERUN_SPIRIT_PATH_FILTER &&
       typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath === "function" &&
       !window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(item)){
      return false;
    }
    return true;
  });
}

function pickTreasureRelic(){
  const pool = getTreasureRelicCandidates();
  if(!pool.length) return null;
  const picked = typeof window.pickRewardItemByRarity === "function"
    ? window.pickRewardItemByRarity(pool, { rarityWeights: TREASURE_RELIC_RARITY_WEIGHTS })
    : pool[Math.floor(Math.random() * pool.length)];
  return picked ? { ...picked } : null;
}

/* ── startStage 감싸기: treasure 타입 노드만 가로채고 나머지는 기존 로직에 위임 ── */
(function(){
  const prevStartStage = window.startStage;
  window.startStage = function(stageIdx){
    const stage = typeof MAP_STAGES !== "undefined" ? MAP_STAGES[stageIdx] : null;

    if(stage && stage.type === "treasure"){
      window.MAP_STATE.currentStage = stageIdx;
      window.MAP_STATE.proceedMode  = false;
      window.MAP_STATE.startMapMode = false;
      if(typeof updateHudFloor === "function") updateHudFloor();
      if(typeof closeMap === "function") closeMap();
      openTreasureNode();
      return;
    }

    if(typeof prevStartStage === "function") return prevStartStage(stageIdx);
  };
})();

/* ── 열기/닫기 ───────────────────────────────────────────────────────────── */
function openTreasureNode(){
  ensureTreasureOverlay();
  hideTreasureChrome();
  ensureTreasureNodeState();
  renderTreasureOverlay();
  treasureOverlayEl.classList.add("show");
  treasureOverlayEl.setAttribute("aria-hidden", "false");
}

/* 보물 노드 종료 → 맵으로 복귀 (기도터/상점/이벤트와 동일 패턴) */
function finishTreasureNode(){
  if(typeof recordCompletedNodeScore === "function"){
    recordCompletedNodeScore("treasure", { reason: "보물 노드 완료" });
  }
  if(typeof syncRunStateFromCombat === "function") syncRunStateFromCombat();

  closeTreasureOverlayOnly();
  if(typeof renderHud === "function") renderHud();
  window.MAP_STATE.proceedMode = true;
  if(typeof openMap === "function") openMap();
}

/* ── 상자 개봉 처리 ──────────────────────────────────────────────────────── */
function onTreasureChestClick(){
  const state = ensureTreasureNodeState();
  if(!state || state.opened) return;

  state.opened = true;

  if(!state.goldGranted && typeof S !== "undefined" && S){
    S.gold = (S.gold || 0) + TREASURE_GOLD_AMOUNT;
    state.goldGranted = true;
    if(typeof renderHud === "function") renderHud();
  }

  if(state.offeredRelicId === null){
    const relic = pickTreasureRelic();
    state.offeredRelicId = relic ? relic.id : TREASURE_NONE_RELIC_ID;
  }

  renderTreasureOverlay();
  setTimeout(showTreasureRelicPopup, 1000);
}

function findTreasureOfferedRelic(){
  const state = ensureTreasureNodeState();
  if(!state || !state.offeredRelicId || state.offeredRelicId === TREASURE_NONE_RELIC_ID) return null;
  const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  return db.find(r => r && r.id === state.offeredRelicId) || null;
}

function onTreasureRelicTake(){
  const state = ensureTreasureNodeState();
  if(!state || state.relicResolved) return;

  const relic = findTreasureOfferedRelic();
  state.relicResolved = true;
  closeTreasureRelicPopup();

  if(!relic){
    finishTreasureNode();
    return;
  }

  const ownedIds = (typeof S !== "undefined" && S && Array.isArray(S.relics))
    ? S.relics.map(r => r && r.id).filter(Boolean)
    : [];
  if(ownedIds.includes(relic.id)){
    if(typeof toast === "function") toast("이미 보유한 법구입니다.");
    finishTreasureNode();
    return;
  }

  if(typeof S !== "undefined" && S){
    if(!Array.isArray(S.relics)) S.relics = [];
    S.relics.push({ ...relic });
  }
  if(typeof renderHud === "function") renderHud();

  if(typeof window.OPEN_RANDOM_ITEM_RESULT_POPUP === "function"){
    window.OPEN_RANDOM_ITEM_RESULT_POPUP({
      title: "법구 획득",
      items: [{
        type: "relic", action: "gain", key: relic.id, name: relic.name,
        icon: relic.iconImage || relic.icon || relic.emoji || "🏺",
        desc: relic.desc || relic.effectText || relic.valueText || "",
        rarity: relic.rarity || ""
      }]
    }).then(finishTreasureNode);
    return;
  }

  finishTreasureNode();
}

function onTreasureRelicSkip(){
  const state = ensureTreasureNodeState();
  if(!state || state.relicResolved) return;
  state.relicResolved = true;
  closeTreasureRelicPopup();
  if(typeof toast === "function") toast("법구를 건너뛰었습니다.");
  finishTreasureNode();
}
