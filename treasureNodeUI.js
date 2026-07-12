"use strict";
/* =========================================================================
   보물 노드 UI 레이어 — treasureNode.js에서 분리된 DOM 렌더링/스타일.
   상자 개봉/법구 지급 로직은 treasureNode.js에 남아있고 이 파일은
   그 결과를 화면에 그리기만 한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

const TREASURE_HIDE_SELECTORS = [".left-side-hud", ".battle-field", "#dock", "#hint", ".progress-center-hud"];

function closeTreasureOverlayOnly(){
  if(!treasureOverlayEl) return;
  treasureOverlayEl.classList.remove("show");
  treasureOverlayEl.setAttribute("aria-hidden", "true");
  showTreasureChrome();
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

/* ── 법구 제안 팝업 ──────────────────────────────────────────────────────── */
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
  const desc = relic.desc || relic.effectText || relic.valueText || "";
  return (
    '<div class="treasure-relic-item item-frame-card">' +
      treasureRelicFaceHtml(relic, desc) +
    '</div>'
  );
}

function treasureItemFramePath(item){
  const rarity = String(item && item.rarity ? item.rarity : "common").toLowerCase();
  if(rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
  if(rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
  if(rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
  return "assets/ui_panels/relic_potion_frame_common.png";
}

function treasureRelicIconHtml(relic){
  const icon = relic.iconImage || relic.icon || relic.emoji || "🏺";
  return (typeof icon === "string" && icon.indexOf("assets/") === 0)
    ? '<img src="' + icon + '" alt="" aria-hidden="true">'
    : icon;
}

function treasureRelicFaceHtml(relic, desc){
  return '<div class="item-art-layer">' + treasureRelicIconHtml(relic) + '</div>' +
    '<img class="item-frame-layer" src="' + treasureItemFramePath(relic) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="item-text-layer">' +
      '<div class="item-name-text">' + (relic.name || "") + '</div>' +
      '<div class="item-desc-text">' + (typeof colorizeRarityLabels === "function" ? colorizeRarityLabels(desc || "") : (desc || "")) + '</div>' +
    '</div>' +
    '<div class="item-hit-layer" aria-hidden="true"></div>';
}

function closeTreasureRelicPopup(){
  if(!treasureOverlayEl) return;
  const popup = treasureOverlayEl.querySelector("#treasureRelicPopup");
  if(!popup) return;
  popup.classList.remove("show");
  popup.setAttribute("aria-hidden", "true");
}

/* ── 스타일 ──────────────────────────────────────────────────────────────── */
function ensureTreasureStyles(){
  if(document.getElementById("treasureNodeStyles")) return;

  const style = document.createElement("style");
  style.id = "treasureNodeStyles";
  style.textContent =
    ".treasure-overlay{position:absolute;inset:0;z-index:28;display:none;" +
      "background-image:radial-gradient(120% 70% at 50% 30%,rgba(30,20,45,.05) 0%,rgba(10,8,20,.32) 60%,rgba(5,5,12,.55) 100%)," +
        "url(\"assets/node_background/treasure.jpg\");background-size:cover,cover;background-position:center,center;background-repeat:no-repeat,no-repeat;}" +
    ".treasure-overlay.show{display:block;}" +
    ".treasure-stage{position:absolute;inset:0;}" +
    /* 상자가 제단 받침대 위가 아니라 배경 계단 앞 바닥(제단과 같은 높이)에 오도록 배치했으므로, 힌트 문구는 그 아래 계단 쪽에 배치한다 */
    ".treasure-hint{position:absolute;top:84cqh;left:50%;transform:translateX(-50%);z-index:2;" +
      "font-size:1.9cqh;font-weight:900;color:#fdf6e3;text-shadow:0 .2cqh .4cqh rgba(0,0,0,.6);" +
      "background:rgba(30,20,10,.4);padding:.7cqh 1.6cqw;border-radius:1cqh;border:.14cqh solid rgba(200,170,110,.4);white-space:nowrap;}" +
    /* 상자 맨 아래가 화면 세로길이의 80% 지점(위에서부터)에 오도록 배치 */
    ".treasure-chest-btn{position:absolute;left:50%;top:80cqh;transform:translate(-50%,-100%);" +
      "border:0;background:transparent;padding:0;cursor:pointer;width:min(90cqw,45cqh);}" +
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
    ".treasure-relic-item.item-frame-card{width:21cqh;min-height:0;box-shadow:0 .45cqh 1.2cqh rgba(65,45,25,.16);}" +
    ".treasure-relic-icon{width:9cqh;height:9cqh;display:grid;place-items:center;font-size:5cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1.2cqh;border:.16cqh solid #d9bd85;overflow:hidden;}" +
    ".treasure-relic-icon img{width:100%;height:100%;object-fit:contain;}" +
    ".treasure-relic-name{font-size:1.8cqh;font-weight:900;color:#4a3a24;}" +
    ".treasure-relic-desc{font-size:1.3cqh;font-weight:700;color:#6b4a20;line-height:1.4;}" +
    ".treasure-relic-actions{display:flex;gap:1.2cqw;width:100%;justify-content:center;}" +
    ".treasure-relic-btn{min-width:12cqw;height:5cqh;border-radius:1.2cqh;font-size:1.7cqh;cursor:pointer;" +
      "font-family:'Paperozi',var(--font-body);font-weight:700;border:.2cqh solid rgba(178,140,80,.5);}" +
    ".treasure-relic-skip{background:rgba(255,251,240,.9);color:#6b4a20;}" +
    ".treasure-relic-take{background:linear-gradient(180deg,#7fbf8a,#4f9c62);color:#fff;border-color:#3f7c4e;}" +
    "@media (max-width:900px){.treasure-chest-btn{width:min(80cqw,45cqh);}.treasure-relic-box{width:min(80cqw,60cqh);}}";
  document.head.appendChild(style);
}
