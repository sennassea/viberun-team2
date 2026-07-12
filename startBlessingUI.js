"use strict";
/* =========================================================================
   신령의 은혜 UI 레이어 — startBlessing.js에서 분리된 DOM 렌더링/스타일.
   은혜 효과 적용(덱/법구/약병 지급 등)은 startBlessing.js에 남아있고
   이 파일은 그 결과를 화면에 그리기만 한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

/* ── 신령의 은혜 화면이 열려있는 동안 감춰둘 전투 화면 요소 (restNode.js와 동일 패턴) */
const SB_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

function closeSbOverlay(){
  if(!sbOverlayEl) return;
  sbOverlayEl.classList.remove("show");
  sbOverlayEl.setAttribute("aria-hidden", "true");
  showSbChrome();
}

function hideSbChrome(){
  SB_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.sbPrevDisplay === undefined) el.dataset.sbPrevDisplay = el.style.display || "";
      el.style.display = "none";
    });
  });
}

function showSbChrome(){
  SB_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.sbPrevDisplay !== undefined){
        el.style.display = el.dataset.sbPrevDisplay;
        delete el.dataset.sbPrevDisplay;
      }
    });
  });
}

/* ── 상단 메뉴 연결 ──────────────────────────────────────────────────────── */
function openSbMapPreview(){
  if(!window.MAP_STATE || typeof openMap !== "function") return;
  window.MAP_STATE.currentStage = -1;
  /* 은혜 선택 전: 노드 이동 불가(읽기 전용). 은혜를 이미 골랐다면(sbResolved)
     신령의 은혜 화면 위로 다시 연 여정도 정상적으로 다음 노드를 고를 수 있어야 한다. */
  window.MAP_STATE.proceedMode  = sbResolved;
  window.MAP_STATE.startMapMode = false;
  openMap();
  const footer = document.getElementById("mapFooter");
  if(footer){
    footer.textContent = sbResolved
      ? "⬆️ 다음 구역을 클릭하여 진행하세요"
      : "은혜를 선택하면 다음 구역을 고를 수 있습니다.";
  }
}

function openSbDeck(){
  const deckBtn = document.getElementById("deckViewerButton");
  if(deckBtn) deckBtn.click();
}

function openSbBag(){
  if(typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
}

function openSbSettings(){
  const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
    .find(b => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
  if(settingsBtn) settingsBtn.click();
}

/* ── DOM 생성 ────────────────────────────────────────────────────────────── */
function ensureSbOverlay(){
  if(sbOverlayEl) return sbOverlayEl;
  ensureSbStyles();

  const overlay = document.createElement("div");
  overlay.id = "startBlessingOverlay";
  overlay.className = "sb-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = sbOverlayHtml();

  overlay.querySelector("#sbMapBtn").addEventListener("click", openSbMapPreview);
  overlay.querySelector("#sbDeckBtn").addEventListener("click", openSbDeck);
  overlay.querySelector("#sbBagBtn").addEventListener("click", openSbBag);
  overlay.querySelector("#sbSettingsBtn").addEventListener("click", openSbSettings);

  (document.querySelector("#game") || document.body).appendChild(overlay);
  sbOverlayEl = overlay;
  return overlay;
}

function sbOverlayHtml(){
  return (
    '<div class="sb-menu">' +
      '<button type="button" class="sb-menu-btn ui-asset-button ui-map-button" id="sbMapBtn"><span class="sb-menu-ico">🗺️</span><span>여정</span></button>' +
      '<button type="button" class="sb-menu-btn ui-asset-button ui-codex-button" id="sbDeckBtn"><span class="sb-menu-ico">📖</span><span>보유주문</span></button>' +
      '<button type="button" class="sb-menu-btn ui-asset-button ui-bag-button" id="sbBagBtn"><span class="sb-menu-ico">🎒</span><span>가방</span></button>' +
      '<button type="button" class="sb-menu-btn ui-asset-button ui-settings-button" id="sbSettingsBtn"><span class="sb-menu-ico">⚙️</span><span>설정</span></button>' +
    '</div>' +
    '<div class="sb-title-row">' +
      '<div class="sb-title">신령의 은혜</div>' +
    '</div>' +
    '<div class="sb-header">' +
      '<div class="sb-subtitle">여정을 떠나기 전, 신령이 은혜를 내립니다.</div>' +
      '<div class="sb-dialogue" id="sbDialogue"></div>' +
    '</div>' +
    '<div class="sb-scene">' +
      '<div class="sb-spirit" id="sbSpiritEmoji"></div>' +
    '</div>' +
    '<div class="sb-choices" id="sbChoices"></div>'
  );
}

function sbChoiceHtml(blessing, index){
  return (
    '<button type="button" class="sb-card item-frame-card" data-id="' + blessing.id + '">' +
      sbBlessingFaceHtml(blessing) +
    '</button>'
  );
}

function sbIconHtml(icon){
  if(typeof icon === "string" && icon.indexOf("assets/") === 0){
    return '<img src="' + icon + '" alt="" aria-hidden="true">';
  }
  return icon || "";
}

function sbItemFramePath(item){
  const rarity = String(item && item.rarity ? item.rarity : "blessing").toLowerCase();
  if(rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
  if(rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
  if(rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
  return "assets/ui_panels/relic_potion_frame_common.png";
}

function sbBlessingFaceHtml(blessing){
  const safeBlessing = blessing || {};
  return '<div class="item-art-layer">' + sbIconHtml(safeBlessing.icon) + '</div>' +
    '<img class="item-frame-layer" src="' + sbItemFramePath(safeBlessing) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="item-text-layer">' +
      '<div class="item-name-text">' + (safeBlessing.name || "") + '</div>' +
      '<div class="item-desc-text">' + colorizeRarityLabels(safeBlessing.desc || "") + '</div>' +
    '</div>' +
    '<div class="item-hit-layer" aria-hidden="true"></div>';
}

/* ── 화면 값 렌더링 (열 때마다 최신 상태 반영) ────────────────────────────── */
function sbSpiritVisualHtml(spirit){
  if(spirit && spirit.image){
    return '<img src="' + spirit.image + '" alt="' + (spirit.name || "") + '">';
  }
  return (spirit && spirit.emoji) || "";
}

function renderSbOverlay(){
  if(!sbOverlayEl) return;

  sbOverlayEl.querySelector("#sbSpiritEmoji").innerHTML = sbSpiritVisualHtml(sbSpirit);
  const sbDialogueEl = sbOverlayEl.querySelector("#sbDialogue");
  sbDialogueEl.textContent = '"' + sbSpirit.dialogue + '"';
  sbDialogueEl.style.color = getSbSpiritColor(sbSpirit);

  const choices = sbOverlayEl.querySelector("#sbChoices");
  const visibleBlessings = getSbVisibleBlessings();
  choices.innerHTML = visibleBlessings.map(sbChoiceHtml).join("");
  choices.querySelectorAll(".sb-card[data-id]").forEach(card => {
    card.addEventListener("click", () => {
      const blessing = visibleBlessings.find(b => b.id === card.dataset.id);
      selectSbBlessing(blessing);
    });
  });
}

function getSbVisibleBlessings(){
  const spiritName = getSbSpiritGroup(sbSpirit);
  const mapped = START_BLESSINGS.filter(blessing => blessing.spirit === spiritName);
  const pool = mapped.length ? mapped : START_BLESSINGS;
  return shuffleSbList(pool).slice(0, 3);
}

function getSbSpiritGroup(spirit){
  const id = String((spirit && spirit.id) || "");
  const name = String((spirit && spirit.name) || "");
  if(id === "GENERAL_CHOE" || name.includes("수호") || name.includes("장군")) return "수호 신령";
  if(id === "CHILSEONG" || name.includes("인연") || name.includes("칠성")) return "인연 신령";
  if(id === "OGU_BARI" || name.includes("길잡이") || name.includes("오구") || name.includes("바리")) return "길잡이 신령";
  return name;
}

/* ── 신령별 대표 색상 (대사 색상에 반영) ───────────────────────────────── */
const SB_SPIRIT_COLORS = {
  "수호 신령": "#e0574a",
  "인연 신령": "#5b8fd9",
  "길잡이 신령": "#e0a23c"
};

function getSbSpiritColor(spirit){
  return SB_SPIRIT_COLORS[getSbSpiritGroup(spirit)] || "#9fd8c9";
}

/* ── 스타일 (기획서 11장: 배경과 어우러지는 반투명 청록/금색 톤) ─────────── */
function ensureSbStyles(){
  if(document.getElementById("startBlessingStyles")) return;

  const style = document.createElement("style");
  style.id = "startBlessingStyles";
  style.textContent =
    ".sb-overlay{position:absolute;inset:0;z-index:45;display:none;flex-direction:column;" +
      "padding:1.6cqh 2cqw 2cqh;color:#eee6cf;font-family:inherit;" +
      "background-image:radial-gradient(120% 70% at 50% 0%,rgba(30,55,65,.38) 0%,rgba(14,28,38,.62) 45%,rgba(6,12,20,.76) 100%),url('assets/background/shrine_01_main.jpg');" +
      "background-size:cover;background-position:center;background-repeat:no-repeat;}" +
    ".sb-overlay.show{display:flex;}" +
    ".sb-menu{position:absolute;top:1.4cqh;right:1.4cqh;height:12cqh;display:flex;align-items:center;gap:.8cqw;z-index:5;}" +
    ".sb-menu-btn{position:relative;width:8.2cqh;height:100%;display:flex;align-items:center;justify-content:center;" +
      "background-color:transparent;background-position:center;background-repeat:no-repeat;background-size:contain;border:0;border-radius:0;" +
      "color:transparent;cursor:pointer;font:inherit;font-size:0;padding:0;box-shadow:none;backdrop-filter:none;}" +
    ".sb-menu-btn .sb-menu-ico{font-size:3.1cqh;line-height:1;}" +
    ".sb-menu-btn span:last-child{display:none;}" +
    ".sb-menu-btn:active{transform:scale(.94);}" +
    ".sb-title-row{flex:none;position:relative;z-index:4;text-align:center;padding-top:1.4cqh;}" +
    ".sb-title{font-size:4.4cqh;font-weight:900;letter-spacing:.3cqh;color:#f1d98c;" +
      "text-shadow:0 0 1.2cqh rgba(230,190,110,.55),-.16cqh -.16cqh 0 rgba(20,14,4,.9),.16cqh -.16cqh 0 rgba(20,14,4,.9)," +
      "-.16cqh .16cqh 0 rgba(20,14,4,.9),.16cqh .16cqh 0 rgba(20,14,4,.9),0 .2cqh .5cqh rgba(0,0,0,.85);}" +
    ".sb-header{flex:none;position:relative;z-index:4;text-align:center;padding-top:1cqh;display:flex;flex-direction:column;align-items:center;gap:.7cqh;}" +
    ".sb-subtitle,.sb-dialogue{display:inline-block;}" +
    ".sb-subtitle{font-size:2cqh;color:#cfe3df;font-weight:700;" +
      "text-shadow:-.13cqh -.13cqh 0 rgba(10,10,10,.92),.13cqh -.13cqh 0 rgba(10,10,10,.92)," +
      "-.13cqh .13cqh 0 rgba(10,10,10,.92),.13cqh .13cqh 0 rgba(10,10,10,.92),0 .16cqh .4cqh rgba(0,0,0,.85);}" +
    ".sb-dialogue{font-size:2.7cqh;color:#9fd8c9;font-weight:800;margin-top:1.4cqh;" +
      "text-shadow:-.13cqh -.13cqh 0 rgba(6,16,14,.92),.13cqh -.13cqh 0 rgba(6,16,14,.92)," +
      "-.13cqh .13cqh 0 rgba(6,16,14,.92),.13cqh .13cqh 0 rgba(6,16,14,.92),0 .16cqh .4cqh rgba(0,0,0,.85);}" +
    ".sb-scene{flex:1;min-height:0;position:relative;z-index:1;pointer-events:none;display:flex;align-items:flex-end;justify-content:center;}" +
    ".sb-spirit{width:51cqh;height:82cqh;font-size:14cqh;display:grid;place-items:center;position:relative;z-index:1;pointer-events:none;" +
      "transform:translateY(14cqh);border:none;background:transparent;box-shadow:none;overflow:visible;}" +
    ".sb-spirit img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 1.2cqh 1.6cqh rgba(0,0,0,.45)) drop-shadow(0 0 1.8cqh rgba(180,220,255,.2));}" +
    ".sb-choices{flex:none;position:relative;z-index:3;display:flex;justify-content:center;gap:10cqw;padding:0 2cqw;margin-top:-20cqh;}" +
    ".sb-card{position:relative;flex:1;max-width:17cqw;min-height:39cqh;display:flex;flex-direction:column;align-items:center;" +
      "box-sizing:border-box;gap:.55cqh;padding:3.1cqh 2.15cqw 3cqh;background:transparent url(\"assets/ui_panels/start_blessing_choice_panel.png\") center/100% 100% no-repeat;" +
      "border:0;border-radius:0;cursor:pointer;font:inherit;color:#4a2b07;" +
      "box-shadow:none;overflow:hidden;transition:transform .14s ease,filter .14s ease;}" +
    ".sb-card.item-frame-card{display:block;min-height:39cqh;background:transparent;}" +
    ".sb-card.item-frame-card .item-art-layer{font-size:9cqh;}" +
    ".sb-card.item-frame-card .item-name-text{font-size:2.05cqh;}" +
    ".sb-card.item-frame-card .item-desc-text{font-size:1.62cqh;line-height:1.28;}" +
    ".sb-card:hover{transform:translateY(-.6cqh);filter:brightness(1.05) drop-shadow(0 .9cqh 1.2cqh rgba(90,65,25,.24));}" +
    ".sb-card-icon{height:12cqh;font-size:12cqh;display:flex;align-items:flex-start;justify-content:center;}" +
    ".sb-card-icon img{width:12cqh;height:12cqh;object-fit:contain;display:block;}" +
    ".sb-card-name{max-width:100%;margin-top:.35cqh;padding:0 .25cqw;font-size:1.75cqh;font-weight:900;text-align:center;line-height:1.14;word-break:keep-all;overflow-wrap:anywhere;text-shadow:0 .08cqh 0 rgba(255,255,255,.8);}" +
    ".sb-card-desc{flex:1;width:100%;box-sizing:border-box;margin-top:.25cqh;padding:0 .35cqw;font-size:1.08cqh;color:#5c3c10;text-align:center;line-height:1.44;font-weight:800;white-space:normal;word-break:keep-all;overflow-wrap:anywhere;text-wrap:pretty;text-shadow:0 .06cqh 0 rgba(255,255,255,.65);}" +
    "@media (max-width:900px){" +
      ".sb-menu{top:1.2cqh;right:1.2cqh;height:10cqh;gap:.6cqw;}" +
      ".sb-menu-btn{width:7.2cqh;}" +
      ".sb-title-row{padding-top:1.2cqh;}" +
      ".sb-title{font-size:3.8cqh;}" +
      ".sb-subtitle{font-size:1.75cqh;}" +
      ".sb-dialogue{font-size:2.35cqh;}" +
      ".sb-spirit{width:48cqh;height:76cqh;transform:translateY(12.5cqh);}" +
      ".sb-choices{flex-direction:row;align-items:stretch;justify-content:center;gap:8cqw;padding:0 2cqw;margin-top:-19cqh;}" +
      ".sb-card{flex:1;max-width:17cqw;min-height:37cqh;padding:3cqh 2cqw 2.8cqh;}" +
      ".sb-card-icon{height:11cqh;font-size:11cqh;}" +
      ".sb-card-icon img{width:11cqh;height:11cqh;}" +
      ".sb-card-name{font-size:1.6cqh;}" +
      ".sb-card-desc{font-size:1.02cqh;line-height:1.4;}" +
    "}";
  document.head.appendChild(style);
}
