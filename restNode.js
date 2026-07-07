"use strict";
/* =========================================================================
   기도터(휴식 노드) 메인 화면 (restNode.js)
   기획서: 기도터 UI 통합 기획서 - 3장 기도터 메인 화면

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / script.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고, startStage()를
   재정의(override)하여 rest 타입 노드 진입 시 기도터 화면을 띄웁니다.
   (mapUI.js가 getViewBox/renderCanvas 등을 재정의하는 방식과 동일한 패턴)
   ========================================================================= */

/* ── 기도터 화면이 열려있는 동안 감춰둘 전투 화면 요소 ───────────────────── */
const PRAYER_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

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

/* ── 끝없는 여정 잠념 침투(심도 13/20)로 추가된 카드는 일정 수량만큼 제거할 수 없다.
   덱은 카드 키 배열이라 개별 인스턴스를 구분하지 못하므로, 덱에 남은
   "잠념" 수가 저주로 보호된 수량을 초과할 때만 제거를 허용한다. ── */
function isEndlessRestCardRemovable(key){
  if(key !== "intrusive_thought") return true;
  const protectedCount = typeof getEndlessUnremovableIntrusiveThoughtCount === "function"
    ? getEndlessUnremovableIntrusiveThoughtCount()
    : 0;
  if(protectedCount <= 0) return true;
  const deck = typeof STARTER_DECK !== "undefined" ? STARTER_DECK : [];
  const currentCount = deck.filter(k => k === "intrusive_thought").length;
  return currentCount > protectedCount;
}
window.isEndlessRestCardRemovable = isEndlessRestCardRemovable;

let prayerOverlayEl   = null;
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
}

function closePrayerNode(){
  if(!prayerOverlayEl) return;
  prayerOverlayEl.classList.remove("show");
  prayerOverlayEl.setAttribute("aria-hidden", "true");
  showPrayerChrome();
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

function hidePrayerChrome(){
  PRAYER_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.prayerPrevDisplay === undefined) el.dataset.prayerPrevDisplay = el.style.display || "";
      el.style.display = "none";
    });
  });
}

function showPrayerChrome(){
  PRAYER_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.prayerPrevDisplay !== undefined){
        el.style.display = el.dataset.prayerPrevDisplay;
        delete el.dataset.prayerPrevDisplay;
      }
    });
  });
}

/* ── 주문 선택 상태 ──────────────────────────────────────────────────────── */
function resetPrayerSelection(){
  prayerSelected = null;
  if(!prayerOverlayEl) return;
  prayerOverlayEl.querySelectorAll(".prayer-card").forEach(el => el.classList.remove("selected"));
  const confirmBtn = prayerOverlayEl.querySelector("#prayerConfirmBtn");
  if(confirmBtn) confirmBtn.disabled = true;
}

function selectPrayerCard(card){
  if(!card || card.classList.contains("disabled")) return;
  prayerSelected = card.dataset.choice;
  prayerOverlayEl.querySelectorAll(".prayer-card").forEach(el => el.classList.toggle("selected", el === card));
  const confirmBtn = prayerOverlayEl.querySelector("#prayerConfirmBtn");
  if(confirmBtn) confirmBtn.disabled = false;
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
    disabledText: "끝없는 여정의 잠념은 제거할 수 없습니다.",
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
        if(typeof toast === "function") toast("끝없는 여정의 잠념은 제거할 수 없습니다.");
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

/* ── DOM 생성 ────────────────────────────────────────────────────────────── */
function ensurePrayerOverlay(){
  if(prayerOverlayEl) return prayerOverlayEl;
  ensurePrayerStyles();

  const overlay = document.createElement("div");
  overlay.id = "prayerOverlay";
  overlay.className = "prayer-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = prayerOverlayHtml();

  overlay.querySelectorAll(".prayer-card").forEach(card => {
    card.addEventListener("click", () => selectPrayerCard(card));
  });
  overlay.querySelector("#prayerConfirmBtn").addEventListener("click", confirmPrayerChoice);

  overlay.querySelector("#prayerMapBtn").addEventListener("click", () => {
    if(typeof openMap === "function") openMap();
    else if(typeof toast === "function") toast("여정을 열 수 없습니다.");
  });
  overlay.querySelector("#prayerDeckBtn").addEventListener("click", () => {
    const deckBtn = document.getElementById("deckViewerButton");
    if(deckBtn) deckBtn.click();
    else if(typeof toast === "function") toast("보유 주문 확인 기능은 준비 중입니다.");
  });
  overlay.querySelector("#prayerBagBtn").addEventListener("click", () => {
    if(typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
    else if(typeof toast === "function") toast("가방 확인 기능은 다음 업데이트에서 제공됩니다.");
  });
  overlay.querySelector("#prayerSettingsBtn").addEventListener("click", () => {
    const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
      .find(b => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
    if(settingsBtn) settingsBtn.click();
  });

  (document.querySelector("#game") || document.body).appendChild(overlay);
  prayerOverlayEl = overlay;
  return overlay;
}

function prayerOverlayHtml(){
  return (
    '<div class="prayer-header">' +
      '<div class="prayer-player-card">' +
        '<div class="prayer-portrait" id="prayerPortrait">👼</div>' +
        '<div class="prayer-player-body">' +
          '<div class="prayer-player-name"><b id="prayerName"></b><span id="prayerTitle"></span></div>' +
          '<div class="prayer-hp-row">' +
            '<div class="prayer-hp-bar"><div class="prayer-hp-fill" id="prayerHpFill"></div><span id="prayerHpText"></span></div>' +
          '</div>' +
          '<div class="prayer-resource-row">' +
            '<span class="prayer-resource"><span class="hud-resource-icon hud-resource-icon-relic">🏺</span><b id="prayerRelicCount">0</b></span>' +
            '<span class="prayer-resource"><span class="hud-resource-icon hud-resource-icon-potion">🧪</span><b id="prayerPotionCount">0</b></span>' +
            '<span class="prayer-resource"><span class="hud-resource-icon hud-resource-icon-gold" aria-hidden="true"></span><b id="prayerGold">0</b></span>' +
            '<span class="prayer-resource" style="display:none"><span class="hud-resource-icon hud-resource-icon-moon">🌙</span><b id="prayerMoonShard">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="prayer-stage-info">' +
        '<div class="prayer-stage-title-main">기도터</div>' +
        '<div class="prayer-stage-title-sub">잠시 머물러 몸과 마음을 가다듬으세요.</div>' +
      '</div>' +
      '<div class="prayer-header-buttons">' +
        '<button type="button" class="prayer-header-btn ui-asset-button ui-map-button" id="prayerMapBtn"><span class="ico">🗺️</span><span>여정</span></button>' +
        '<button type="button" class="prayer-header-btn ui-asset-button ui-codex-button" id="prayerDeckBtn"><span class="ico">📖</span><span>보유주문</span></button>' +
        '<button type="button" class="prayer-header-btn ui-asset-button ui-bag-button" id="prayerBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="prayer-header-btn ui-asset-button ui-settings-button" id="prayerSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="prayer-body">' +
      '<div class="prayer-tip prayer-tip-left">' +
        '<span class="prayer-tip-ghost">👻</span>' +
        '<span class="prayer-tip-text"><b>TIP</b> 기도는 언제나 당신을 지켜줄 힘이 되어줄 거예요.</span>' +
      '</div>' +
      '<div class="prayer-cards">' +
        prayerCardHtml("rest",    "🍵", "휴식하기",   "정신력 회복", "따뜻한 향과 차 한 잔으로 지친 몸을 쉬게 합니다.") +
        prayerCardHtml("accept",  "🌸", "받아들이기", "주문 추가",   "기도의 가호로 새로운 인연을 덱에 맞이합니다.") +
        prayerCardHtml("cleanse", "📜", "정리하기",   "주문 제거",   "마음을 정화하며 불필요한 인연을 정리합니다.") +
      '</div>' +
      '<div class="prayer-tip prayer-tip-right">' +
        '<span class="prayer-tip-text">기도가 전해지길 바라는 마음이 가장 중요해요~</span>' +
        '<span class="prayer-tip-ghost">👻</span>' +
      '</div>' +
    '</div>' +
    '<div class="prayer-actions">' +
      '<button type="button" class="prayer-btn prayer-btn-confirm" id="prayerConfirmBtn" disabled>선택하고 다음으로</button>' +
    '</div>'
  );
}

function prayerCardHtml(choice, icon, title, sub, desc){
  return (
    '<button type="button" class="prayer-card" data-choice="' + choice + '">' +
      '<div class="prayer-card-icon">' + icon + '</div>' +
      '<div class="prayer-card-title">' + title + '</div>' +
      '<div class="prayer-card-sub">' + sub + '</div>' +
      '<div class="prayer-card-desc">' + desc + '</div>' +
      '<div class="prayer-card-extra" data-extra="' + choice + '"></div>' +
    '</button>'
  );
}

/* ── 화면 값 렌더링 (열 때마다 최신 상태 반영) ────────────────────────────── */
function renderPrayerOverlay(){
  if(!prayerOverlayEl) return;
  renderPrayerHeader();
  renderPrayerCardPreviews();
}

function renderPrayerHeader(){
  if(typeof S === "undefined" || !S || !S.player) return;
  const p = S.player;

  prayerOverlayEl.querySelector("#prayerPortrait").textContent = p.emoji || "👼";
  prayerOverlayEl.querySelector("#prayerName").textContent     = p.name  || "";
  prayerOverlayEl.querySelector("#prayerTitle").textContent    = p.title || "";
  prayerOverlayEl.querySelector("#prayerHpText").textContent   = p.hp + "/" + p.maxHp;

  const pct = p.maxHp ? Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) : 0;
  prayerOverlayEl.querySelector("#prayerHpFill").style.width = pct + "%";

  const count = typeof resourceCount === "function" ? resourceCount : (v => Array.isArray(v) ? v.length : (v || 0));
  prayerOverlayEl.querySelector("#prayerRelicCount").textContent  = count(S.relics);
  prayerOverlayEl.querySelector("#prayerPotionCount").textContent = count(S.potions);
  prayerOverlayEl.querySelector("#prayerGold").textContent        = S.gold || 0;
  prayerOverlayEl.querySelector("#prayerMoonShard").textContent   = S.moonShards || 0;
}

function renderPrayerCardPreviews(){
  const restExtra = prayerOverlayEl.querySelector('[data-extra="rest"]');
  const restCard  = prayerOverlayEl.querySelector('.prayer-card[data-choice="rest"]');
  if(restExtra && typeof S !== "undefined" && S && S.player){
    const p          = S.player;
    const restHealRatio = (typeof hasRelic === "function" && hasRelic("mugwort_bundle")) ? 0.35 : PRAYER_REST_HEAL_RATIO;
    const healAmount = Math.max(0, Math.round(p.maxHp * restHealRatio));
    const isFull     = p.hp >= p.maxHp;
    restExtra.className = "prayer-card-extra prayer-card-preview" + (isFull ? " full" : "");
    restExtra.textContent = isFull
      ? "정신력이 이미 가득합니다."
      : "정신력 " + p.hp + " → " + Math.min(p.maxHp, p.hp + healAmount) + "   +" + healAmount + " 회복";
    if(restCard) restCard.classList.toggle("disabled", isFull);
  }

  const acceptExtra = prayerOverlayEl.querySelector('[data-extra="accept"]');
  if(acceptExtra){
    acceptExtra.className = "prayer-card-extra prayer-card-pill";
    acceptExtra.textContent = "덱에 주문 1장을 추가";
  }

  const cleanseExtra = prayerOverlayEl.querySelector('[data-extra="cleanse"]');
  const cleanseCard  = prayerOverlayEl.querySelector('.prayer-card[data-choice="cleanse"]');
  if(cleanseExtra){
    const cost         = (typeof hasRelic === "function" && hasRelic("empty_spirit_tablet") && typeof S !== "undefined" && S && (S.cleanseCount || 0) === 0) ? 0 : getCardRemoveCost();
    const currentGold  = (typeof S !== "undefined" && S && typeof S.gold === "number") ? S.gold : 0;
    const notEnough    = currentGold < cost;
    cleanseExtra.className = "prayer-card-extra prayer-card-pill" + (notEnough ? " insufficient" : "");
    cleanseExtra.innerHTML = '덱에서 주문 1장을 제거 (<span class="inline-resource-icon inline-resource-icon-gold" aria-hidden="true"></span>' + cost + " 복채)";
    if(cleanseCard) cleanseCard.classList.toggle("disabled", notEnough);
  }
}

/* ── 스타일 (기획서 2장: 크림/베이지/금색 톤의 동굴형 기도 공간) ─────────── */
function ensurePrayerStyles(){
  if(document.getElementById("prayerNodeStyles")) return;

  const style = document.createElement("style");
  style.id = "prayerNodeStyles";
  style.textContent =
    ".prayer-overlay{position:absolute;inset:0;z-index:45;display:none;flex-direction:column;" +
      "padding:1.4cqh 1.6cqw 2.2cqh;gap:1.6cqh;color:#4a3a24;font-family:inherit;" +
      "background-image:radial-gradient(120% 70% at 50% 0%,rgba(255,241,214,.42) 0%,rgba(243,224,189,.28) 45%,rgba(70,45,28,.22) 100%)," +
        "linear-gradient(90deg,rgba(20,24,32,.12) 0%,rgba(20,24,32,.04) 45%,rgba(20,24,32,.34) 100%)," +
        "url(\"assets/node_background/prayer_site.jpg\");background-size:cover,cover,cover;background-position:center,center,center;background-repeat:no-repeat,no-repeat,no-repeat;}" +
    ".prayer-overlay.show{display:flex;}" +
    ".prayer-header{flex:none;position:relative;height:12cqh;}" +
    ".prayer-player-card{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;gap:1.15cqw;width:24cqw;min-width:30cqh;" +
      "background:transparent url(\"assets/ui/player_info_panel_wide.png\") center/100% 100% no-repeat;border:0;border-radius:0;" +
      "padding:.8cqh 1cqw;box-shadow:none;backdrop-filter:none;}" +
    ".prayer-portrait{flex:none;width:8.4cqh;height:8.4cqh;border-radius:50%;display:grid;place-items:center;" +
      "font-size:4.2cqh;background:transparent;border:0;box-shadow:none;overflow:hidden;}" +
    ".prayer-player-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.4cqh;}" +
    ".prayer-player-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".prayer-player-name b{font-size:2.3cqh;}" +
    ".prayer-player-name span{display:none;}" +
    ".prayer-hp-row{display:flex;align-items:center;gap:.8cqw;font-size:1.55cqh;font-weight:800;color:var(--c-ink);}" +
    ".prayer-hp-row span:first-child{color:var(--c-red-deep);}" +
    ".prayer-hp-bar{position:relative;width:min(13.6cqw,25cqh);height:1.65cqh;border-radius:.8cqh;overflow:hidden;background:rgba(80,38,38,.42);border:0;box-shadow:inset 0 0 0 .12cqh rgba(75,40,28,.35);}" +
    ".prayer-hp-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(180deg,#ff6f67 0%,#e33434 58%,#a6171f 100%);transition:width .35s ease;border-radius:.8cqh;}" +
    "#prayerHpText{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.15cqh;font-weight:900;line-height:1;text-shadow:0 .12cqh .25cqh rgba(80,20,20,.65);}" +
    ".prayer-resource-row{display:flex;align-items:center;gap:.65cqw;font-size:1.45cqh;font-weight:900;color:var(--c-ink);transform:translateX(2cqw);width:calc(100% - 2cqw);}" +
    ".prayer-resource{display:inline-flex;align-items:center;gap:.22cqw;color:var(--c-ink);font-size:1.45cqh;}" +
    ".prayer-resource b{display:inline;color:var(--c-ink);font-size:1.45cqh;}" +
    ".prayer-resource .hud-resource-icon{width:2.15cqh;height:2.15cqh;flex:none;display:inline-block;font-size:0;line-height:1;background-position:center;background-size:contain;background-repeat:no-repeat;}" +
    ".prayer-stage-info{position:absolute;left:50%;top:0;transform:translateX(-50%);width:32cqw;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35cqh;" +
      "padding:.8cqh 4.2cqw;background:transparent url(\"assets/ui/stage_info_panel.png\") center/100% 100% no-repeat;" +
      "border:0;border-radius:0;box-shadow:none;backdrop-filter:none;font-size:2.05cqh;font-weight:900;color:var(--c-ink);}" +
    ".prayer-stage-title-main{font-size:2.35cqh;font-weight:900;letter-spacing:0;line-height:1;}" +
    ".prayer-stage-title-sub{font-size:1.15cqh;font-weight:800;color:#8a6b3d;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}" +
    ".prayer-title-badge{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".prayer-title-main{font-size:2.6cqh;font-weight:900;letter-spacing:.25cqh;}" +
    ".prayer-title-sub{font-size:1.2cqh;color:#8a6b3d;margin-top:.35cqh;font-weight:700;}" +
    ".prayer-header-buttons{position:absolute;right:0;top:0;height:100%;display:flex;align-items:center;gap:.8cqw;}" +
    ".prayer-header-btn{position:relative;width:8.2cqh;height:100%;display:flex;align-items:center;justify-content:center;" +
      "background-color:transparent;background-position:center;background-repeat:no-repeat;background-size:contain;border:0;border-radius:0;color:transparent;" +
      "cursor:pointer;font:inherit;font-size:0;padding:0;box-shadow:none;backdrop-filter:none;}" +
    ".prayer-header-btn .ico{font-size:3.1cqh;line-height:1;}" +
    ".prayer-header-btn span:last-child{display:none;}" +
    ".prayer-header-btn:active{transform:scale(.94);}" +
    ".prayer-body{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;}" +
    ".prayer-cards{display:flex;gap:1.6cqw;justify-content:center;width:100%;max-width:88cqw;}" +
    ".prayer-card{flex:1;max-width:26cqw;min-height:44cqh;display:flex;flex-direction:column;align-items:center;" +
      "gap:.9cqh;padding:4.2cqh 2.2cqw 3.2cqh;background:transparent url(\"assets/ui_panels/start_blessing_choice_panel.png\") center/100% 100% no-repeat;" +
      "border:0;border-radius:0;box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.18);" +
      "cursor:pointer;font:inherit;color:#4a3a24;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;}" +
    ".prayer-card:hover{transform:translateY(-.6cqh);box-shadow:0 1.1cqh 2cqh rgba(90,65,25,.26);}" +
    ".prayer-card.selected{filter:brightness(1.04) drop-shadow(0 0 .75cqh rgba(201,74,61,.38));box-shadow:0 1.1cqh 2cqh rgba(90,65,25,.26);}" +
    ".prayer-card.disabled{opacity:.55;cursor:not-allowed;}" +
    ".prayer-card.disabled:hover{transform:none;box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.18);}" +
    ".prayer-card-icon{flex:none;width:9cqh;height:9cqh;border-radius:1.2cqh;display:grid;place-items:center;" +
      "font-size:5cqh;background:linear-gradient(160deg,#fff8e6,#f0dcb0);border:.16cqh solid #d9bd85;}" +
    ".prayer-card-title{font-size:2.15cqh;font-weight:900;}" +
    ".prayer-card-sub{font-size:1.3cqh;font-weight:800;color:#8a6b3d;}" +
    ".prayer-card-desc{flex:1;font-size:1.32cqh;color:#6b4a20;text-align:center;line-height:1.4;font-weight:700;}" +
    ".prayer-card-extra{width:100%;border-radius:1cqh;padding:.8cqh 1cqw;text-align:center;font-size:1.3cqh;font-weight:900;}" +
    ".inline-resource-icon{display:inline-block;width:1.45cqh;height:1.45cqh;vertical-align:-.25cqh;margin-right:.18cqw;background:center/contain no-repeat;}" +
    ".inline-resource-icon-gold{background-image:url('assets/ui/resource_icons/gold.png');}" +
    ".prayer-card-preview{background:rgba(110,175,110,.2);border:.15cqh solid rgba(80,140,80,.4);color:#2f5f30;}" +
    ".prayer-card-preview.full{background:rgba(140,140,140,.2);border-color:rgba(110,110,110,.4);color:#5a5a5a;}" +
    ".prayer-card-pill{background:rgba(200,150,80,.18);border:.15cqh solid rgba(178,140,80,.42);color:#8a6b3d;}" +
    ".prayer-card-pill.insufficient{background:rgba(201,74,61,.16);border-color:rgba(168,46,46,.45);color:#a82e2e;}" +
    ".prayer-tip{position:absolute;bottom:0;display:flex;align-items:center;gap:.6cqw;max-width:15cqw;}" +
    ".prayer-tip-left{left:0;}" +
    ".prayer-tip-right{right:0;flex-direction:row-reverse;text-align:right;}" +
    ".prayer-tip-ghost{font-size:4cqh;flex:none;}" +
    ".prayer-tip-text{font-size:1.15cqh;font-weight:800;color:#6b4a20;background:rgba(255,251,240,.88);" +
      "border-radius:1cqh;padding:.6cqh .8cqw;border:.15cqh solid rgba(178,140,80,.4);}" +
    ".prayer-tip-text b{color:#c94a3d;margin-right:.3cqw;}" +
    ".prayer-actions{flex:none;display:flex;justify-content:center;gap:1.2cqw;}" +
    ".prayer-btn{min-width:16cqw;height:5.6cqh;border-radius:1.3cqh;font-size:2cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.22cqh solid rgba(178,140,80,.5);}" +
    ".prayer-btn-confirm{height:5.6cqh;background:transparent url(\"assets/ui_buttons/prayer_select.png\") center/100% 100% no-repeat;color:transparent;border:0;border-radius:0;box-shadow:none;font-size:0;}" +
    ".prayer-btn-confirm:disabled{filter:grayscale(.5) brightness(.92);cursor:default;opacity:.7;}" +
    "@media (max-width:900px){.prayer-cards{flex-direction:column;align-items:stretch;}.prayer-card{max-width:none;min-height:auto;}" +
      ".prayer-tip{display:none;}}";
  document.head.appendChild(style);
}
