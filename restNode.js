"use strict";
/* =========================================================================
   기도터(휴식 노드) 로직 (restNode.js)
   기획서: 기도터 UI 통합 기획서 - 3장 기도터 메인 화면

   회복량/제거 비용 계산, 카드 추가·제거 처리, 노드 진입 흐름을 담당한다.
   화면 렌더링(오버레이 DOM, 스타일)은 restNodeUI.js로 분리되어 있으며
   이 파일은 함수 이름으로만 그 UI 함수들을 호출한다(같은 전역 스코프).
   유니티 이식 시 이 파일의 회복/비용 계산 로직은 C#으로 그대로 옮길 수 있다.

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / script.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고, startStage()를
   재정의(override)하여 rest 타입 노드 진입 시 기도터 화면을 띄웁니다.
   (mapUI.js가 getViewBox/renderCanvas 등을 재정의하는 방식과 동일한 패턴)
   ========================================================================= */

/* ── 휴식하기(정신력 회복) 비율 ───────────────────────────────────────────
   기획서 5-3 예시(정신력 78 -> 108, +30)에 맞춰 최대 정신력의 25%를 회복한다. */
const PRAYER_REST_HEAL_RATIO = 0.25;

/* ── 정리하기(주문 제거) 복채 비용 ────────────────────────────────────────
   해당 런에서 사용한 횟수(0-based)에 따라 1회차 60, 2회차 100, 3회차 이상 150 복채. */
const PRAYER_CARD_REMOVE_COST_TABLE = [60, 100, 150];

function getCardRemoveCost(){
  if(typeof hasRelic === "function" && hasRelic("empty_spirit_tablet") &&
     typeof S !== "undefined" && S && (S.cleanseCount || 0) === 0) return 0;
  const count = (typeof S !== "undefined" && S && typeof S.cleanseCount === "number") ? S.cleanseCount : 0;
  const idx = Math.min(count, PRAYER_CARD_REMOVE_COST_TABLE.length - 1);
  return PRAYER_CARD_REMOVE_COST_TABLE[idx];
}
window.getCardRemoveCost = getCardRemoveCost;

/* ── 끝없는 여정 잡념 침투(심도 13/20)로 추가된 카드는 일정 수량만큼 제거할 수 없다.
   덱은 카드 키 배열이라 개별 인스턴스를 구분하지 못하므로, 덱에 남은
   "잡념" 수가 저주로 보호된 수량을 초과할 때만 제거를 허용한다. ── */
function isEndlessRestCardRemovable(key){
  return typeof window.IS_CARD_REMOVABLE_FROM_DECK !== "function" ||
    window.IS_CARD_REMOVABLE_FROM_DECK(key);
}
window.isEndlessRestCardRemovable = isEndlessRestCardRemovable;

let prayerSelected    = null;

/* ── startStage 재정의: rest 타입 노드는 기도터 화면으로 진입 ───────────── */
function startStage(stageIdx){
  const stage = MAP_STAGES[stageIdx];

  if(stage && stage.type === "rest"){
    window.MAP_STATE.currentStage = stageIdx;
    window.MAP_STATE.proceedMode  = false;
    window.MAP_STATE.startMapMode = false;
    updateHudFloor();
    closeMap();
    openPrayerNode();
    return;
  }

  /* 딤드 노드(이벤트/상점): 자동 통과 처리 (기획서 9-2) */
  if(stage && stage.isDimmed){
    window.MAP_STATE.currentStage = stageIdx;
    window.MAP_STATE.proceedMode  = true;
    window.MAP_STATE.startMapMode = false;
    updateHudFloor();
    renderCanvas(getCurrentNodeId());
    const footer = document.getElementById("mapFooter");
    if(footer) footer.textContent = "⬆️ 다음 구역을 클릭하여 진행하세요";
    return;
  }

  window.MAP_STATE.currentStage = stageIdx;
  window.MAP_STATE.proceedMode  = false;
  window.MAP_STATE.startMapMode = false;
  loadStageMonsters(stageIdx, { recordHistory:true });
  updateHudFloor();
  closeMap();
  if(typeof newGame === "function") newGame();
}

/* ── 기도터 화면 열기/닫기 ───────────────────────────────────────────────── */
function openPrayerNode(){
  ensurePrayerOverlay();
  hidePrayerChrome();
  resetPrayerSelection();
  renderPrayerOverlay();
  prayerOverlayEl.classList.add("show");
  prayerOverlayEl.setAttribute("aria-hidden", "false");
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmPrayer");
  }
}

/* 기도터를 마치고 다음 노드를 고를 수 있도록 맵으로 복귀 (주문 보상 흐름과 동일 패턴) */
function resolvePrayerNode(){
  if(typeof recordCompletedNodeScore === "function"){
    recordCompletedNodeScore("rest", {
      reason: "휴식/신당 이용"
    });
  }

  if(typeof applyRelicTrigger === "function") applyRelicTrigger("onPrayerActionComplete", { action:prayerSelected });
  closePrayerNode();
  window.MAP_STATE.proceedMode = true;
  if(typeof openMap === "function") openMap();
}

/* ── 확정 처리 ───────────────────────────────────────────────────────────── */
function confirmPrayerChoice(){
  if(!prayerSelected) return;

  if(prayerSelected === "rest"){
    applyPrayerRest();
    resolvePrayerNode();
    return;
  }

  if(prayerSelected === "accept"){
    openRestCardAdd();
    return;
  }

  if(prayerSelected === "cleanse"){
    openRestCardRemove();
    return;
  }
}

/* ── 받아들이기: 기존 정화 보상 UI(전투 보상과 동일 렌더링)를 "휴식 카드 추가 모드"로 호출 ── */
function openRestCardAdd(){
  if(typeof window.OPEN_CARD_REWARD_PICK !== "function"){
    if(typeof toast === "function") toast("주문 추가 기능을 불러올 수 없습니다.");
    return;
  }
  const offerCount = (typeof hasRelic === "function" && hasRelic("tricolor_ritual_bowl")) ? 4 : 3;
  const keys = typeof getRandomRewardKeys === "function" ? getRandomRewardKeys(offerCount, "prayer") : [];
  if(keys.length === 0){
    if(typeof toast === "function") toast("추가할 수 있는 주문이 없습니다.");
    return;
  }
  window.OPEN_CARD_REWARD_PICK({
    keys,
    title: "받아들이기",
    desc: "추가할 주문 1장을 선택하세요.",
    onChoose: key => {
      if(typeof addPermanentCard === "function") addPermanentCard(key, { source:"prayerAccept" });
      else {
        if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(key);
        if(typeof S !== "undefined" && S && Array.isArray(S.discard)){
          if(typeof pushDiscardCard === "function") pushDiscardCard(key, typeof createCardInstance === "function" ? createCardInstance(key) : undefined);
          else {
            S.discard.push(key);
            if(!Array.isArray(S.discardInstances)) S.discardInstances = [];
            S.discardInstances.push(typeof createCardInstance === "function"
              ? createCardInstance(key)
              : { key, runtime:{ hanpuriGrowth:0 } });
          }
        }
      }
      if(typeof renderHud === "function") renderHud();
    }
  }).then(() => {
    resolvePrayerNode();
  });
}

/* ── 정리하기: 기존 보유 카드 UI(deckViewer.js)를 "휴식 카드 제거 모드"로 호출 ────── */
function openRestCardRemove(){
  if(typeof window.OPEN_DECK_VIEWER_CARD_PICK !== "function"){
    if(typeof toast === "function") toast("주문 제거 기능을 불러올 수 없습니다.");
    return;
  }
  const deck = typeof STARTER_DECK !== "undefined" ? STARTER_DECK : [];
  if(deck.length === 0){
    if(typeof toast === "function") toast("제거할 주문이 없습니다.");
    return;
  }
  const cost = (typeof hasRelic === "function" && hasRelic("empty_spirit_tablet") && S && (S.cleanseCount || 0) === 0) ? 0 : getCardRemoveCost();
  window.OPEN_DECK_VIEWER_CARD_PICK({
    title: "제거할 카드 선택",
    confirmText: "제거 완료",
    helpText: "제거할 주문 1장을 선택하세요.",
    disabledText: "끝없는 여정의 잡념은 제거할 수 없습니다.",
    costText: "제거 비용: " + cost + " 복채",
    costHtml: '제거 비용: <span class="inline-resource-icon inline-resource-icon-gold" aria-hidden="true"></span>' + cost + " 복채",
    isSelectable: key => isEndlessRestCardRemovable(key),
    getConfirmDisabled: () => {
      const gold = (typeof S !== "undefined" && S && typeof S.gold === "number") ? S.gold : 0;
      return gold < cost;
    },
    onConfirm: key => {
      const gold = (typeof S !== "undefined" && S && typeof S.gold === "number") ? S.gold : 0;
      if(gold < cost){
        if(typeof toast === "function") toast("복채가 부족합니다.");
        return;
      }
      if(!isEndlessRestCardRemovable(key)){
        if(typeof toast === "function") toast("끝없는 여정의 잡념은 제거할 수 없습니다.");
        return;
      }
      const idx = STARTER_DECK.indexOf(key);
      if(idx === -1) return;
      const card = typeof CARD_DB !== "undefined" ? CARD_DB[key] : null;
      STARTER_DECK.splice(idx, 1);
      S.gold -= cost;
      S.cleanseCount = (typeof S.cleanseCount === "number" ? S.cleanseCount : 0) + 1;

      if(typeof recordJourneyActionScore === "function"){
        recordJourneyActionScore("cardRemove", {
          type: "rest",
          reason: "기도터 카드 제거"
        });
      }

      if(typeof syncRunStateFromCombat === "function") syncRunStateFromCombat();
      if(typeof renderHud === "function") renderHud();
      if(typeof toast === "function" && card) toast(card.name + " 주문을 덱에서 제거했습니다. (" + cost + " 복채 사용)");
    }
  }).then(() => {
    resolvePrayerNode();
  });
}

function applyPrayerRest(){
  if(typeof S === "undefined" || !S || !S.player) return;
  const player     = S.player;
  const ratio = (typeof hasRelic === "function" && hasRelic("mugwort_bundle")) ? 0.35 : PRAYER_REST_HEAL_RATIO;
  const healAmount = Math.max(0, Math.round(player.maxHp * ratio));
  const healed     = (typeof LIFE !== "undefined" && LIFE) ? LIFE.heal(player, healAmount) : 0;
  if(typeof renderHud === "function") renderHud();
  if(typeof toast === "function"){
    toast(healed > 0 ? "정신력 " + healed + " 회복" : "정신력이 이미 가득합니다.");
  }
}
