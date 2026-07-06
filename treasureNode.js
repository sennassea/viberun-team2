"use strict";
/* =========================================================================
   보물 노드 화면 (treasureNode.js)
   기획서: 10층 보물 노드 구현 지시서

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / restNode.js /
   shopNode.js / eventNode.js / equipment.js(RELIC_DB) / script.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고, startStage()를
   감싸(wrap) treasure 타입 노드 진입 시 보물 노드 화면을 띄웁니다.
   (shopNode.js / eventNode.js와 동일한 wrapping 패턴)

   기존 상단 HUD(top-hud)는 그대로 유지하고, 전투 전용 요소(좌측 사이드
   HUD, 전투 필드, 하단 도크, 힌트 문구)만 감춘다.
   ========================================================================= */

const TREASURE_HIDE_SELECTORS = [".left-side-hud", ".battle-field", "#dock", "#hint"];
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

function closeTreasureOverlayOnly(){
  if(!treasureOverlayEl) return;
  treasureOverlayEl.classList.remove("show");
  treasureOverlayEl.setAttribute("aria-hidden", "true");
  showTreasureChrome();
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

function hideTreasureChrome(){
  TREASURE_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.treasurePrevDisplay === undefined) el.dataset.treasurePrevDisplay = el.style.display || "";
      el.style.display = "none";
    });
  });
}

function showTreasureChrome(){
  TREASURE_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.treasurePrevDisplay !== undefined){
        el.style.display = el.dataset.treasurePrevDisplay;
        delete el.dataset.treasurePrevDisplay;
      }
    });
  });
}

/* ── DOM 생성 ────────────────────────────────────────────────────────────── */
function ensureTreasureOverlay(){
  if(treasureOverlayEl) return treasureOverlayEl;
  ensureTreasureStyles();

  const overlay = document.createElement("div");
  overlay.id = "treasureOverlay";
  overlay.className = "treasure-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = treasureOverlayHtml();
  overlay.addEventListener("click", onTreasureOverlayClick);

  (document.querySelector("#game") || document.body).appendChild(overlay);
  treasureOverlayEl = overlay;
  return overlay;
}

function treasureOverlayHtml(){
  return (
    '<div class="treasure-stage">' +
      '<div class="treasure-hint" id="treasureHint"></div>' +
      '<button type="button" class="treasure-chest-btn" id="treasureChestBtn">' +
        '<img class="treasure-chest-img" id="treasureChestImg" src="assets/treasure/treasure_chest_closed.png" alt="달빛 상자">' +
      '</button>' +
    '</div>' +
    '<div class="treasure-relic-popup" id="treasureRelicPopup" aria-hidden="true">' +
      '<div class="treasure-relic-box">' +
        '<div class="treasure-relic-title">법구 발견</div>' +
        '<div class="treasure-relic-body" id="treasureRelicBody"></div>' +
        '<div class="treasure-relic-actions">' +
          '<button type="button" class="treasure-relic-btn treasure-relic-skip" id="treasureRelicSkip">건너뛰기</button>' +
          '<button type="button" class="treasure-relic-btn treasure-relic-take" id="treasureRelicTake">받기</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function onTreasureOverlayClick(e){
  if(e.target.closest("#treasureChestBtn")){ onTreasureChestClick(); return; }
  if(e.target.closest("#treasureRelicTake")){ onTreasureRelicTake(); return; }
  if(e.target.closest("#treasureRelicSkip")){ onTreasureRelicSkip(); return; }
}

/* ── 화면 값 렌더링 ──────────────────────────────────────────────────────── */
function renderTreasureOverlay(){
  if(!treasureOverlayEl) return;
  const state = ensureTreasureNodeState();
  if(!state) return;

  const chestBtn = treasureOverlayEl.querySelector("#treasureChestBtn");
  const chestImg = treasureOverlayEl.querySelector("#treasureChestImg");
  const hint = treasureOverlayEl.querySelector("#treasureHint");
  if(!chestBtn || !chestImg) return;

  chestImg.src = state.opened
    ? "assets/treasure/treasure_chest_open.png"
    : "assets/treasure/treasure_chest_closed.png";
  chestBtn.disabled = state.opened;
  chestBtn.classList.toggle("opened", state.opened);
  if(hint){
    hint.textContent = state.opened
      ? "달빛 상자를 열었습니다."
      : "달빛 상자를 눌러 열어보세요";
  }
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
    if(typeof toast === "function") toast("복채 " + TREASURE_GOLD_AMOUNT + "을(를) 얻었습니다.");
  }

  if(state.offeredRelicId === null){
    const relic = pickTreasureRelic();
    state.offeredRelicId = relic ? relic.id : TREASURE_NONE_RELIC_ID;
  }

  renderTreasureOverlay();
  setTimeout(showTreasureRelicPopup, 600);
}

/* ── 법구 제안 팝업 ──────────────────────────────────────────────────────── */
function findTreasureOfferedRelic(){
  const state = ensureTreasureNodeState();
  if(!state || !state.offeredRelicId || state.offeredRelicId === TREASURE_NONE_RELIC_ID) return null;
  const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  return db.find(r => r && r.id === state.offeredRelicId) || null;
}

function showTreasureRelicPopup(){
  const state = ensureTreasureNodeState();
  if(!state || state.relicResolved || !treasureOverlayEl) return;

  const relic = findTreasureOfferedRelic();
  if(!relic){
    state.relicResolved = true;
    finishTreasureNode();
    return;
  }

  const popup = treasureOverlayEl.querySelector("#treasureRelicPopup");
  const body = treasureOverlayEl.querySelector("#treasureRelicBody");
  if(!popup || !body) return;

  body.innerHTML = treasureRelicItemHtml(relic);
  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");
}

function treasureRelicItemHtml(relic){
  const icon = relic.iconImage || relic.icon || relic.emoji || "🏺";
  const iconHtml = (typeof icon === "string" && icon.indexOf("assets/") === 0)
    ? '<img src="' + icon + '" alt="">'
    : icon;
  const desc = relic.desc || "";
  return (
    '<div class="treasure-relic-icon">' + iconHtml + '</div>' +
    '<div class="treasure-relic-name">' + (relic.name || "") + '</div>' +
    '<div class="treasure-relic-desc">' + (typeof colorizeRarityLabels === "function" ? colorizeRarityLabels(desc) : desc) + '</div>'
  );
}

function closeTreasureRelicPopup(){
  if(!treasureOverlayEl) return;
  const popup = treasureOverlayEl.querySelector("#treasureRelicPopup");
  if(!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
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
        icon: relic.iconImage || relic.icon || relic.emoji || "🏺"
      }]
    }).then(finishTreasureNode);
    return;
  }

  if(typeof toast === "function") toast((relic.emoji || "🏺") + " " + relic.name + " 법구를 획득했습니다.");
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

/* ── 스타일 ──────────────────────────────────────────────────────────────── */
function ensureTreasureStyles(){
  if(document.getElementById("treasureNodeStyles")) return;

  const style = document.createElement("style");
  style.id = "treasureNodeStyles";
  style.textContent =
    ".treasure-overlay{position:absolute;inset:0;z-index:28;display:none;flex-direction:column;" +
      "align-items:center;justify-content:center;padding-top:13cqh;" +
      "background-image:radial-gradient(120% 70% at 50% 30%,rgba(30,20,45,.05) 0%,rgba(10,8,20,.32) 60%,rgba(5,5,12,.55) 100%)," +
        "url(\"assets/node_background/treasure.jpg\");background-size:cover,cover;background-position:center,center;background-repeat:no-repeat,no-repeat;}" +
    ".treasure-overlay.show{display:flex;}" +
    ".treasure-stage{display:flex;flex-direction:column;align-items:center;gap:2.2cqh;}" +
    ".treasure-hint{font-size:1.9cqh;font-weight:900;color:#fdf6e3;text-shadow:0 .2cqh .4cqh rgba(0,0,0,.6);" +
      "background:rgba(30,20,10,.4);padding:.7cqh 1.6cqw;border-radius:1cqh;border:.14cqh solid rgba(200,170,110,.4);}" +
    ".treasure-chest-btn{border:0;background:transparent;padding:0;cursor:pointer;width:min(34cqw,42cqh);}" +
    ".treasure-chest-btn:disabled{cursor:default;}" +
    ".treasure-chest-img{width:100%;height:auto;display:block;filter:drop-shadow(0 1cqh 2.2cqh rgba(0,0,0,.5));transition:transform .15s ease;}" +
    ".treasure-chest-btn:not(:disabled):hover .treasure-chest-img{transform:translateY(-.4cqh) scale(1.02);}" +
    ".treasure-chest-btn.opened .treasure-chest-img{animation:treasureChestPop .35s ease;}" +
    "@keyframes treasureChestPop{0%{transform:scale(.9);}60%{transform:scale(1.08);}100%{transform:scale(1);}}" +
    ".treasure-relic-popup{position:absolute;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:rgba(20,14,8,.58);}" +
    ".treasure-relic-popup.show{display:flex;}" +
    ".treasure-relic-box{width:min(46cqw,60cqh);padding:3cqh 3cqw;border-radius:1.6cqh;border:.2cqh solid rgba(183,146,82,.72);" +
      "background:linear-gradient(180deg,rgba(255,250,235,.98),rgba(239,224,193,.98));box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.4);" +
      "display:flex;flex-direction:column;align-items:center;gap:1.4cqh;text-align:center;}" +
    ".treasure-relic-title{font-size:2cqh;font-weight:900;color:#4a3a24;}" +
    ".treasure-relic-icon{width:9cqh;height:9cqh;display:grid;place-items:center;font-size:5cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1.2cqh;border:.16cqh solid #d9bd85;overflow:hidden;}" +
    ".treasure-relic-icon img{width:100%;height:100%;object-fit:contain;}" +
    ".treasure-relic-name{font-size:1.8cqh;font-weight:900;color:#4a3a24;}" +
    ".treasure-relic-desc{font-size:1.3cqh;font-weight:700;color:#6b4a20;line-height:1.4;}" +
    ".treasure-relic-actions{display:flex;gap:1.2cqw;width:100%;justify-content:center;}" +
    ".treasure-relic-btn{min-width:12cqw;height:5cqh;border-radius:1.2cqh;font-size:1.7cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.2cqh solid rgba(178,140,80,.5);}" +
    ".treasure-relic-skip{background:rgba(255,251,240,.9);color:#6b4a20;}" +
    ".treasure-relic-take{background:linear-gradient(180deg,#7fbf8a,#4f9c62);color:#fff;border-color:#3f7c4e;}" +
    "@media (max-width:900px){.treasure-chest-btn{width:min(60cqw,42cqh);}.treasure-relic-box{width:min(80cqw,60cqh);}}";
  document.head.appendChild(style);
}
