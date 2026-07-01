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

let prayerOverlayEl   = null;
let prayerSelected    = null;
let prayerPrevStageId = 0;

/* ── startStage 재정의: rest 타입 노드는 기도터 화면으로 진입 ───────────── */
function startStage(stageIdx){
  const stage = MAP_STAGES[stageIdx];

  if(stage && stage.type === "rest"){
    prayerPrevStageId = window.MAP_STATE.currentStage;
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
    if(footer) footer.textContent = "⬆️ 다음 스테이지를 클릭하여 진행하세요";
    return;
  }

  window.MAP_STATE.currentStage = stageIdx;
  window.MAP_STATE.proceedMode  = false;
  window.MAP_STATE.startMapMode = false;
  loadStageMonsters(stageIdx);
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

/* 기도터를 마치고 다음 노드를 고를 수 있도록 맵으로 복귀 (카드 보상 흐름과 동일 패턴) */
function resolvePrayerNode(){
  closePrayerNode();
  window.MAP_STATE.proceedMode = true;
  if(typeof openMap === "function") openMap();
}

/* 취소: 이번 기도터 선택을 취소하고 이전 위치 기준으로 맵에 복귀 */
function cancelPrayerNode(){
  closePrayerNode();
  window.MAP_STATE.currentStage = prayerPrevStageId;
  window.MAP_STATE.proceedMode  = true;
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

/* ── 카드 선택 상태 ──────────────────────────────────────────────────────── */
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

  /* 받아들이기(카드 추가) / 정리하기(카드 제거)는 별도 UI로 후속 구현 예정 */
  const label = prayerSelected === "accept" ? "받아들이기(카드 추가)" : "정리하기(카드 제거)";
  if(typeof toast === "function") toast(label + " 기능은 다음 업데이트에서 제공됩니다.");
}

function applyPrayerRest(){
  if(typeof S === "undefined" || !S || !S.player) return;
  const player     = S.player;
  const healAmount = Math.max(0, Math.round(player.maxHp * PRAYER_REST_HEAL_RATIO));
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
  overlay.querySelector("#prayerCancelBtn").addEventListener("click", cancelPrayerNode);

  overlay.querySelector("#prayerMapBtn").addEventListener("click", () => {
    if(typeof openMap === "function") openMap();
    else if(typeof toast === "function") toast("지도를 열 수 없습니다.");
  });
  overlay.querySelector("#prayerDeckBtn").addEventListener("click", () => {
    const deckBtn = document.getElementById("deckViewerButton");
    if(deckBtn) deckBtn.click();
    else if(typeof toast === "function") toast("보유 카드 확인 기능은 준비 중입니다.");
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
          '<div class="prayer-hp-row"><span>정신력</span><span id="prayerHpText"></span></div>' +
          '<div class="prayer-hp-bar"><div class="prayer-hp-fill" id="prayerHpFill"></div></div>' +
          '<div class="prayer-resource-row">' +
            '<span class="prayer-resource">🏺<b id="prayerRelicCount">0</b></span>' +
            '<span class="prayer-resource">🧪<b id="prayerPotionCount">0</b></span>' +
            '<span class="prayer-resource">🪙<b id="prayerGold">0</b></span>' +
            '<span class="prayer-resource">🌙<b id="prayerMoonShard">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="prayer-title-badge">' +
        '<div class="prayer-title-main">기도터</div>' +
        '<div class="prayer-title-sub">잠시 머물러 몸과 마음을 가다듬으세요.</div>' +
      '</div>' +
      '<div class="prayer-header-buttons">' +
        '<button type="button" class="prayer-header-btn" id="prayerMapBtn"><span class="ico">🗺️</span><span>지도</span></button>' +
        '<button type="button" class="prayer-header-btn" id="prayerDeckBtn"><span class="ico">📖</span><span>보유카드</span></button>' +
        '<button type="button" class="prayer-header-btn" id="prayerBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="prayer-header-btn" id="prayerSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="prayer-body">' +
      '<div class="prayer-tip prayer-tip-left">' +
        '<span class="prayer-tip-ghost">👻</span>' +
        '<span class="prayer-tip-text"><b>TIP</b> 기도는 언제나 당신을 지켜줄 힘이 되어줄 거예요.</span>' +
      '</div>' +
      '<div class="prayer-cards">' +
        prayerCardHtml("rest",    "🍵", "휴식하기",   "정신력 회복", "따뜻한 향과 차 한 잔으로 지친 몸을 쉬게 합니다.") +
        prayerCardHtml("accept",  "🌸", "받아들이기", "카드 추가",   "기도의 가호로 새로운 인연을 덱에 맞이합니다.") +
        prayerCardHtml("cleanse", "📜", "정리하기",   "카드 제거",   "마음을 정화하며 불필요한 인연을 정리합니다.") +
      '</div>' +
      '<div class="prayer-tip prayer-tip-right">' +
        '<span class="prayer-tip-text">기도가 전해지길 바라는 마음이 가장 중요해요~</span>' +
        '<span class="prayer-tip-ghost">👻</span>' +
      '</div>' +
    '</div>' +
    '<div class="prayer-actions">' +
      '<button type="button" class="prayer-btn prayer-btn-cancel" id="prayerCancelBtn">취소</button>' +
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
    const healAmount = Math.max(0, Math.round(p.maxHp * PRAYER_REST_HEAL_RATIO));
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
    acceptExtra.textContent = "덱에 카드 1장을 추가";
  }

  const cleanseExtra = prayerOverlayEl.querySelector('[data-extra="cleanse"]');
  if(cleanseExtra){
    cleanseExtra.className = "prayer-card-extra prayer-card-pill";
    cleanseExtra.textContent = "덱에서 카드 1장을 제거";
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
      "background:radial-gradient(120% 70% at 50% 0%,rgba(255,241,214,.92) 0%,rgba(243,224,189,.82) 45%,rgba(196,168,132,.62) 100%)," +
        "linear-gradient(180deg,#efe0c4 0%,#d8c39a 55%,#c3aa7c 100%);}" +
    ".prayer-overlay.show{display:flex;}" +
    ".prayer-header{flex:none;display:flex;align-items:stretch;gap:1.2cqw;height:11.5cqh;}" +
    ".prayer-player-card{flex:none;display:flex;align-items:center;gap:1cqw;width:26cqw;min-width:32cqh;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "padding:.9cqh 1.1cqw;box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".prayer-portrait{flex:none;width:8.4cqh;height:8.4cqh;border-radius:50%;display:grid;place-items:center;" +
      "font-size:4.3cqh;background:linear-gradient(160deg,#fff8e6,#f0dcb0);border:.22cqh solid #caa15a;}" +
    ".prayer-player-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.4cqh;}" +
    ".prayer-player-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".prayer-player-name b{font-size:1.85cqh;}" +
    ".prayer-player-name span{margin-left:.6cqw;font-size:1.25cqh;color:#8a6b3d;font-weight:800;}" +
    ".prayer-hp-row{display:flex;justify-content:space-between;font-size:1.35cqh;font-weight:900;color:#6b4a20;}" +
    ".prayer-hp-bar{position:relative;height:1.25cqh;border-radius:.7cqh;overflow:hidden;background:rgba(120,60,40,.25);}" +
    ".prayer-hp-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(180deg,#f0857a,#c94a3d);transition:width .3s ease;}" +
    ".prayer-resource-row{display:flex;gap:.8cqw;font-size:1.2cqh;font-weight:900;color:#6b4a20;}" +
    ".prayer-resource{display:inline-flex;align-items:center;gap:.25cqw;}" +
    ".prayer-title-badge{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".prayer-title-main{font-size:2.6cqh;font-weight:900;letter-spacing:.25cqh;}" +
    ".prayer-title-sub{font-size:1.2cqh;color:#8a6b3d;margin-top:.35cqh;font-weight:700;}" +
    ".prayer-header-buttons{flex:none;display:flex;align-items:center;gap:.7cqw;}" +
    ".prayer-header-btn{width:8.2cqh;height:100%;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:.3cqh;background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);" +
      "border-radius:1.2cqh;color:#6b4a20;cursor:pointer;font:inherit;}" +
    ".prayer-header-btn .ico{font-size:2.4cqh;line-height:1;}" +
    ".prayer-header-btn span:last-child{font-size:1.05cqh;font-weight:900;}" +
    ".prayer-header-btn:active{transform:scale(.94);}" +
    ".prayer-body{flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;}" +
    ".prayer-cards{display:flex;gap:1.6cqw;justify-content:center;width:100%;max-width:88cqw;}" +
    ".prayer-card{flex:1;max-width:26cqw;min-height:44cqh;display:flex;flex-direction:column;align-items:center;" +
      "gap:.9cqh;padding:2cqh 1.4cqw;background:linear-gradient(180deg,rgba(255,252,242,.96),rgba(247,235,208,.92));" +
      "border:.28cqh solid rgba(178,140,80,.5);border-radius:1.6cqh;box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.18);" +
      "cursor:pointer;font:inherit;color:#4a3a24;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;}" +
    ".prayer-card:hover{transform:translateY(-.6cqh);box-shadow:0 1.1cqh 2cqh rgba(90,65,25,.26);}" +
    ".prayer-card.selected{border-color:#c94a3d;box-shadow:0 0 0 .3cqh rgba(201,74,61,.28),0 1.1cqh 2cqh rgba(90,65,25,.26);}" +
    ".prayer-card.disabled{opacity:.55;cursor:not-allowed;}" +
    ".prayer-card.disabled:hover{transform:none;box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.18);}" +
    ".prayer-card-icon{flex:none;width:9cqh;height:9cqh;border-radius:1.2cqh;display:grid;place-items:center;" +
      "font-size:5cqh;background:linear-gradient(160deg,#fff8e6,#f0dcb0);border:.16cqh solid #d9bd85;}" +
    ".prayer-card-title{font-size:2.15cqh;font-weight:900;}" +
    ".prayer-card-sub{font-size:1.3cqh;font-weight:800;color:#8a6b3d;}" +
    ".prayer-card-desc{flex:1;font-size:1.32cqh;color:#6b4a20;text-align:center;line-height:1.4;font-weight:700;}" +
    ".prayer-card-extra{width:100%;border-radius:1cqh;padding:.8cqh 1cqw;text-align:center;font-size:1.3cqh;font-weight:900;}" +
    ".prayer-card-preview{background:rgba(110,175,110,.2);border:.15cqh solid rgba(80,140,80,.4);color:#2f5f30;}" +
    ".prayer-card-preview.full{background:rgba(140,140,140,.2);border-color:rgba(110,110,110,.4);color:#5a5a5a;}" +
    ".prayer-card-pill{background:rgba(200,150,80,.18);border:.15cqh solid rgba(178,140,80,.42);color:#8a6b3d;}" +
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
    ".prayer-btn-cancel{background:rgba(255,251,240,.88);color:#6b4a20;}" +
    ".prayer-btn-cancel:hover{background:#fff;}" +
    ".prayer-btn-confirm{background:linear-gradient(180deg,#7fbf8a,#4f9c62);color:#fff;border-color:#3f7c4e;}" +
    ".prayer-btn-confirm:disabled{filter:grayscale(.5) brightness(.92);cursor:default;opacity:.7;}" +
    "@media (max-width:900px){.prayer-cards{flex-direction:column;align-items:stretch;}.prayer-card{max-width:none;min-height:auto;}" +
      ".prayer-tip{display:none;}}";
  document.head.appendChild(style);
}
