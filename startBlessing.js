"use strict";
/* =========================================================================
   신령의 은혜 화면 (startBlessing.js)
   기획서: 신령의 은혜 시작 UI 기획서

   이 파일은 mapNodeLogic.js / mapSystem.js / mapUI.js / script.js /
   bagUI.js 이후에 로드되어야 합니다. 기존 코드를 직접 수정하지 않고,
   window 훅과 함수 재정의(override)를 통해 통합합니다.
   (restNode.js가 startStage()를 재정의하는 것과 동일한 패턴)

   새 게임 시작 시 로비 자리에서 신령이 시작 은혜 3개 중 1개를 선택하게
   하고, 선택 후에는 기존 노드 선택 화면(openMap)을 그대로 열어 1층 진입을
   플레이어가 직접 고르게 한다.
   ========================================================================= */

/* ── 신령 3종 (화면을 열 때마다 랜덤 출현) ───────────────────────────────── */
const START_BLESSING_SPIRITS = [
  { emoji: "👻", name: "수호 신령",   dialogue: "기특하구나, 빈손으로 들여보낼 수는 없지." },
  { emoji: "🧿", name: "인연 신령",   dialogue: "얽힌 것은 풀고, 필요한 것은 이어주마." },
  { emoji: "🏮", name: "길잡이 신령", dialogue: "길은 어둡지만, 네 손엔 아직 빛이 남아 있구나." },
];

/* ── 은혜 선택지 3종 (테스트 데이터 - 기획서 참고 이미지 예시 기준) ─────────
   주문 ID/희귀도, 결계 수치는 밸런스 단계에서 변경될 수 있는 예시 데이터다. */
const START_BLESSINGS = [
  { id: "sealed_talisman", icon: "📿", name: "봉인 부적",
    desc: "희귀 부적 주문 1장을 얻습니다.", effect: "gainRareCard" },
  { id: "red_thread", icon: "🪢", name: "붉은 실 매듭",
    desc: "기본 주문 1장을 제거합니다.", effect: "removeStarterCard" },
  { id: "clear_bell", icon: "🔔", name: "맑은 방울",
    desc: "첫 전투 시작 시 결계 8을 얻습니다.", effect: "firstBattleBlock", value: 8 },
];

/* ── 신령의 은혜 화면이 열려있는 동안 감춰둘 전투 화면 요소 (restNode.js와 동일 패턴) */
const SB_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

let sbOverlayEl = null;
let sbResolved  = false;
let sbSpirit    = null;

/* ── 화면 열기 ────────────────────────────────────────────────────────────── */
window.OPEN_START_BLESSING = function(){
  sbResolved = false;
  sbSpirit = START_BLESSING_SPIRITS[Math.floor(Math.random() * START_BLESSING_SPIRITS.length)];

  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;   // 로비(신령의 은혜) 위치
    window.MAP_STATE.proceedMode  = false;
    window.MAP_STATE.startMapMode = false;
  }

  ensureSbOverlay();
  hideSbChrome();
  renderSbOverlay();
  sbOverlayEl.classList.add("show");
  sbOverlayEl.setAttribute("aria-hidden", "false");
};

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
  window.MAP_STATE.proceedMode  = false;  // 은혜 선택 전: 노드 이동 불가(읽기 전용)
  window.MAP_STATE.startMapMode = false;
  openMap();
  const footer = document.getElementById("mapFooter");
  if(footer) footer.textContent = "은혜를 선택하면 다음 노드를 고를 수 있습니다.";
}

function openSbDeck(){
  const deckBtn = document.getElementById("deckViewerButton");
  if(deckBtn) deckBtn.click();
  else if(typeof toast === "function") toast("보유 주문 확인 기능을 불러올 수 없습니다.");
}

function openSbBag(){
  if(typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
  else if(typeof toast === "function") toast("가방을 불러올 수 없습니다.");
}

function openSbSettings(){
  const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
    .find(b => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
  if(settingsBtn) settingsBtn.click();
  else if(typeof toast === "function") toast("설정을 불러올 수 없습니다.");
}

/* ── 은혜 선택 → 보상 적용 → 기존 노드 선택 화면 재사용 ─────────────────── */
function selectSbBlessing(blessing){
  if(sbResolved || !blessing) return;
  sbResolved = true;

  applySbBlessing(blessing);
  closeSbOverlay();
  if(typeof toast === "function") toast(blessing.name + "의 은혜를 받았습니다.");

  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;   // 현재 위치: 로비(신령의 은혜)
    window.MAP_STATE.proceedMode  = true; // 다음 노드(1층) 선택 가능
    window.MAP_STATE.startMapMode = false;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  if(typeof openMap === "function") openMap();
}

function getSbRunState(){
  if(typeof RUN_STATE === "undefined") return null;
  if(!RUN_STATE && typeof beginNewRun === "function") beginNewRun();
  return RUN_STATE;
}

function sbSetDeck(deck){
  const run = getSbRunState();
  if(!run || typeof STARTER_DECK === "undefined") return;
  run.deck = [...deck];
  STARTER_DECK = [...run.deck];
}

function applySbBlessing(blessing){
  const run = getSbRunState();
  if(!run || typeof CARD_DB === "undefined") return;

  if(blessing.effect === "gainRareCard"){
    const rareKeys = Object.keys(CARD_DB).filter(key => CARD_DB[key].rarity === "rare");
    if(rareKeys.length){
      const key = rareKeys[Math.floor(Math.random() * rareKeys.length)];
      sbSetDeck([...run.deck, key]);
    }
    return;
  }

  if(blessing.effect === "removeStarterCard"){
    const targets = run.deck
      .map((key, index) => ({ key, index }))
      .filter(x => CARD_DB[x.key] && CARD_DB[x.key].rarity === "starter");
    if(targets.length){
      const target = targets[Math.floor(Math.random() * targets.length)];
      const nextDeck = [...run.deck];
      nextDeck.splice(target.index, 1);
      sbSetDeck(nextDeck);
    }
    return;
  }

  if(blessing.effect === "firstBattleBlock"){
    run.startBlessingEffect = { type: "firstBattleBlock", value: blessing.value || 8, used: false };
  }
}

/* ── mapSystem.js의 getCurrentNodeId() 재정의 ─────────────────────────────
   원본은 currentStage<0일 때 "start"를 반환하지만 ACT1 맵의 로비 노드 id는
   "lobby_0"이라 매치되지 않아 현재 위치가 표시되지 않는 문제가 있었다.
   신령의 은혜 화면에서 로비를 현재 위치로 정확히 표시하기 위해 재정의한다. */
function getCurrentNodeId(){
  if(window.MAP_STATE.currentStage < 0){
    const lobby = MAP_FLOORS[0] && MAP_FLOORS[0][0];
    return lobby ? lobby.id : "start";
  }
  for(const f of MAP_FLOORS) for(const n of f){
    if(n.stageIndex === window.MAP_STATE.currentStage) return n.id;
  }
  return MAP_FLOORS[1]?.[0]?.id || "start";
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
      '<button type="button" class="sb-menu-btn" id="sbMapBtn"><span class="sb-menu-ico">🗺️</span><span>여정</span></button>' +
      '<button type="button" class="sb-menu-btn" id="sbDeckBtn"><span class="sb-menu-ico">📖</span><span>보유주문</span></button>' +
      '<button type="button" class="sb-menu-btn" id="sbBagBtn"><span class="sb-menu-ico">🎒</span><span>가방</span></button>' +
      '<button type="button" class="sb-menu-btn" id="sbSettingsBtn"><span class="sb-menu-ico">⚙️</span><span>설정</span></button>' +
    '</div>' +
    '<div class="sb-header">' +
      '<div class="sb-title">신령의 은혜</div>' +
      '<div class="sb-subtitle">병동에 들기 전, 신령이 은혜를 내립니다.</div>' +
      '<div class="sb-dialogue" id="sbDialogue"></div>' +
    '</div>' +
    '<div class="sb-scene">' +
      '<div class="sb-player" id="sbPlayerEmoji"></div>' +
      '<div class="sb-spirit" id="sbSpiritEmoji"></div>' +
    '</div>' +
    '<div class="sb-choices" id="sbChoices"></div>'
  );
}

function sbChoiceHtml(blessing, index){
  return (
    '<button type="button" class="sb-card" data-id="' + blessing.id + '">' +
      '<div class="sb-card-num">' + (index + 1) + '</div>' +
      '<div class="sb-card-icon">' + blessing.icon + '</div>' +
      '<div class="sb-card-name">' + blessing.name + '</div>' +
      '<div class="sb-card-desc">' + blessing.desc + '</div>' +
    '</button>'
  );
}

/* ── 화면 값 렌더링 (열 때마다 최신 상태 반영) ────────────────────────────── */
function renderSbOverlay(){
  if(!sbOverlayEl) return;

  sbOverlayEl.querySelector("#sbSpiritEmoji").textContent = sbSpirit.emoji;
  sbOverlayEl.querySelector("#sbDialogue").textContent    = '"' + sbSpirit.dialogue + '"';

  const playerEmoji = (typeof PLAYER_DEF !== "undefined" && PLAYER_DEF && PLAYER_DEF.emoji) || "👼";
  sbOverlayEl.querySelector("#sbPlayerEmoji").textContent = playerEmoji;

  const choices = sbOverlayEl.querySelector("#sbChoices");
  choices.innerHTML = START_BLESSINGS.map(sbChoiceHtml).join("");
  choices.querySelectorAll(".sb-card[data-id]").forEach(card => {
    card.addEventListener("click", () => {
      const blessing = START_BLESSINGS.find(b => b.id === card.dataset.id);
      selectSbBlessing(blessing);
    });
  });
}

/* ── 스타일 (기획서 11장: 배경과 어우러지는 반투명 청록/금색 톤) ─────────── */
function ensureSbStyles(){
  if(document.getElementById("startBlessingStyles")) return;

  const style = document.createElement("style");
  style.id = "startBlessingStyles";
  style.textContent =
    ".sb-overlay{position:absolute;inset:0;z-index:45;display:none;flex-direction:column;" +
      "padding:1.6cqh 2cqw 3cqh;color:#eee6cf;font-family:inherit;" +
      "background-image:radial-gradient(120% 70% at 50% 0%,rgba(30,55,65,.38) 0%,rgba(14,28,38,.62) 45%,rgba(6,12,20,.76) 100%),url('assets/background/shrine_01_main.jpg');" +
      "background-size:cover;background-position:center;background-repeat:no-repeat;}" +
    ".sb-overlay.show{display:flex;}" +
    ".sb-menu{position:absolute;top:1.4cqh;right:1.4cqh;height:12cqh;display:flex;align-items:center;gap:.8cqw;z-index:2;}" +
    ".sb-menu-btn{width:8.2cqh;height:100%;display:flex;align-items:center;justify-content:center;" +
      "background:var(--c-panel);border:.2cqh solid var(--c-panel-line);border-radius:var(--r);" +
      "color:var(--c-ink);cursor:pointer;font:inherit;font-size:3.1cqh;padding:0;box-shadow:0 .4cqh 1.2cqh rgba(60,90,140,.15);backdrop-filter:blur(4px);}" +
    ".sb-menu-btn .sb-menu-ico{font-size:3.1cqh;line-height:1;}" +
    ".sb-menu-btn span:last-child{display:none;}" +
    ".sb-menu-btn:active{transform:scale(.94);}" +
    ".sb-header{flex:none;text-align:center;padding-top:2.6cqh;}" +
    ".sb-title{font-size:4.2cqh;font-weight:900;letter-spacing:.3cqh;color:#f1d98c;text-shadow:0 0 1.2cqh rgba(230,190,110,.55);}" +
    ".sb-subtitle{margin-top:.8cqh;font-size:1.5cqh;color:#cfe3df;font-weight:700;}" +
    ".sb-dialogue{margin-top:.6cqh;font-size:1.6cqh;color:#9fd8c9;font-weight:800;}" +
    ".sb-scene{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;gap:6cqw;}" +
    ".sb-player,.sb-spirit{width:16cqh;height:16cqh;border-radius:50%;display:grid;place-items:center;font-size:8cqh;" +
      "background:radial-gradient(circle,rgba(80,150,170,.28),rgba(10,20,30,.12));border:.2cqh solid rgba(150,200,190,.35);}" +
    ".sb-spirit{width:20cqh;height:20cqh;font-size:10cqh;border-color:rgba(230,190,110,.55);box-shadow:0 0 3cqh rgba(230,190,110,.35);}" +
    ".sb-choices{flex:none;display:flex;justify-content:center;gap:1.8cqw;padding:0 2cqw;}" +
    ".sb-card{position:relative;flex:1;max-width:22cqw;min-height:34cqh;display:flex;flex-direction:column;align-items:center;" +
      "gap:.9cqh;padding:2.6cqh 1.2cqw 1.6cqh;background:linear-gradient(180deg,rgba(20,45,55,.85),rgba(10,22,30,.9));" +
      "border:.22cqh solid rgba(210,175,90,.45);border-radius:1.6cqh;cursor:pointer;font:inherit;color:#eee6cf;" +
      "box-shadow:0 .8cqh 1.6cqh rgba(0,0,0,.35);transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;}" +
    ".sb-card:hover{transform:translateY(-.6cqh);border-color:#f1d98c;box-shadow:0 1.1cqh 2.2cqh rgba(0,0,0,.45);}" +
    ".sb-card-num{position:absolute;top:-1.6cqh;width:3.4cqh;height:3.4cqh;border-radius:50%;display:grid;place-items:center;" +
      "background:linear-gradient(180deg,#f1d98c,#c99a3f);color:#2a1d08;font-weight:900;font-size:1.7cqh;border:.18cqh solid #fff3d0;}" +
    ".sb-card-icon{font-size:4.4cqh;}" +
    ".sb-card-name{font-size:2cqh;font-weight:900;}" +
    ".sb-card-desc{flex:1;font-size:1.3cqh;color:#cfe3df;text-align:center;line-height:1.4;font-weight:700;}" +
    "@media (max-width:900px){.sb-choices{flex-direction:column;align-items:stretch;}.sb-card{max-width:none;min-height:auto;}" +
      ".sb-scene{gap:3cqw;}}";
  document.head.appendChild(style);
}
