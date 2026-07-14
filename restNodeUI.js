"use strict";
/* =========================================================================
   기도터(휴식 노드) UI 레이어 — restNode.js에서 분리된 DOM 렌더링/스타일.
   회복량/제거 비용 계산, 카드 추가·제거 처리 로직은 restNode.js에 남아있고
   이 파일은 그 결과(prayerSelected 등)를 화면에 그리기만 한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

/* ── 기도터 화면이 열려있는 동안 감춰둘 전투 화면 요소 ───────────────────── */
const PRAYER_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

let prayerOverlayEl   = null;

function closePrayerNode(){
  if(!prayerOverlayEl) return;
  prayerOverlayEl.classList.remove("show");
  prayerOverlayEl.setAttribute("aria-hidden", "true");
  showPrayerChrome();
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

/* ── 주문 선택 상태 (화면 표시) ─────────────────────────────────────────── */
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
  overlay.querySelector("#prayerSkipBtn").addEventListener("click", skipPrayerNode);

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
        '<span class="prayer-tip-ghost" style="background-image:url(\'assets/prayer_icons/ghost_left.png\')"></span>' +
        '<span class="prayer-tip-text"><b>TIP</b> 기도는 언제나 당신을 지켜줄 힘이 되어줄 거예요.</span>' +
      '</div>' +
      '<div class="prayer-cards">' +
        prayerCardHtml("rest",    "assets/prayer_icons/rest.png",    "휴식하기",   "정신력 회복", "따뜻한 향과 차 한 잔으로 지친 몸을 쉬게 합니다.") +
        prayerCardHtml("accept",  "assets/prayer_icons/accept.png",  "받아들이기", "주문 추가",   "기도의 가호로 새로운 인연을 덱에 맞이합니다.") +
        prayerCardHtml("cleanse", "assets/prayer_icons/cleanse.png", "정리하기",   "주문 제거",   "마음을 정화하며 불필요한 인연을 정리합니다.") +
      '</div>' +
      '<div class="prayer-tip prayer-tip-right">' +
        '<span class="prayer-tip-text">기도가 전해지길 바라는 마음이 가장 중요해요~</span>' +
        '<span class="prayer-tip-ghost" style="background-image:url(\'assets/prayer_icons/ghost_right.png\')"></span>' +
      '</div>' +
    '</div>' +
    '<div class="prayer-actions">' +
      '<button type="button" class="prayer-btn prayer-btn-skip" id="prayerSkipBtn">건너뛰기</button>' +
      '<button type="button" class="prayer-btn prayer-btn-confirm" id="prayerConfirmBtn" disabled>선택하고 다음으로</button>' +
    '</div>'
  );
}

function prayerCardHtml(choice, iconSrc, title, sub, desc){
  return (
    '<button type="button" class="prayer-card" data-choice="' + choice + '">' +
      '<div class="prayer-card-icon" style="background-image:url(\'' + iconSrc + '\')"></div>' +
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

  renderPlayerPortraitIcon(prayerOverlayEl.querySelector("#prayerPortrait"));
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
      : "+" + healAmount + " 회복  |  정신력 " + p.hp + " → " + Math.min(p.maxHp, p.hp + healAmount);
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
    ".prayer-portrait{flex:none;width:8.7cqh;height:8.7cqh;border-radius:50%;display:grid;place-items:center;" +
      "font-size:4.2cqh;background:transparent;border:0;box-shadow:none;overflow:hidden;transform:translate(.3cqw,.15cqh);}" +
    ".prayer-portrait img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}" +
    ".prayer-player-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.4cqh;}" +
    ".prayer-player-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;}" +
    ".prayer-player-name b{font-size:2.3cqh;}" +
    ".prayer-player-name span{display:none;}" +
    ".prayer-hp-row{display:flex;align-items:center;gap:.8cqw;font-size:1.78cqh;font-weight:800;color:var(--c-ink);line-height:1;}" +
    ".prayer-hp-row span:first-child{color:var(--c-red-deep);}" +
    ".prayer-hp-bar{position:relative;width:min(13.6cqw,25cqh);height:1.65cqh;border-radius:.8cqh;overflow:hidden;background:rgba(80,38,38,.42);border:0;box-shadow:inset 0 0 0 .12cqh rgba(75,40,28,.35);}" +
    ".prayer-hp-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(180deg,#ff6f67 0%,#e33434 58%,#a6171f 100%);transition:width .35s ease;border-radius:.8cqh;}" +
    "#prayerHpText{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.32cqh;font-weight:900;line-height:1;text-shadow:0 .12cqh .25cqh rgba(80,20,20,.65);}" +
    ".prayer-resource-row{display:flex;align-items:center;gap:.65cqw;font-size:1.45cqh;font-weight:900;color:var(--c-ink);transform:translateX(2cqw);width:calc(100% - 2cqw);line-height:1;}" +
    ".prayer-resource{display:inline-flex;align-items:center;gap:.22cqw;color:var(--c-ink);font-size:1.45cqh;}" +
    ".prayer-resource b{display:inline;color:var(--c-ink);font-size:1.45cqh;}" +
    ".prayer-resource .hud-resource-icon{width:2.15cqh;height:2.15cqh;flex:none;display:inline-block;font-size:0;line-height:1;background-position:center;background-size:contain;background-repeat:no-repeat;}" +
    ".prayer-stage-info{position:absolute;left:50%;top:0;transform:translateX(-50%);width:32cqw;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35cqh;" +
      "padding:.8cqh 4.2cqw;background:transparent url(\"assets/ui/stage_info_panel.png\") center/100% 100% no-repeat;" +
      "border:0;border-radius:0;box-shadow:none;backdrop-filter:none;font-size:2.52cqh;font-weight:900;color:#4a2f12;text-shadow:0 .07cqh 0 rgba(255,255,255,.55);}" +
    ".prayer-stage-title-main{font-size:2.89cqh;font-weight:900;letter-spacing:0;line-height:1;}" +
    ".prayer-stage-title-sub{font-size:1.41cqh;font-weight:800;color:#8a6b3d;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}" +
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
    ".prayer-cards{display:flex;gap:3.2cqw;justify-content:center;width:100%;max-width:88cqw;}" +
    ".prayer-card{flex:1;max-width:20cqw;min-height:57cqh;display:flex;flex-direction:column;align-items:center;box-sizing:border-box;" +
      "gap:1cqh;padding:4cqh 2.2cqw 3cqh;" +
      "background:linear-gradient(180deg,rgba(255,251,238,.96) 0%,rgba(240,221,182,.94) 100%);" +
      "border:.2cqh solid rgba(178,140,80,.55);border-radius:1.8cqh;" +
      "box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.22),inset 0 0 0 .12cqh rgba(255,255,255,.4);" +
      "cursor:pointer;font:inherit;color:#4a3a24;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease;}" +
    ".prayer-card:hover{transform:translateY(-.6cqh);box-shadow:0 1.1cqh 2cqh rgba(90,65,25,.3);}" +
    ".prayer-card.selected{border-color:rgba(201,74,61,.75);filter:brightness(1.04) drop-shadow(0 0 .75cqh rgba(201,74,61,.38));box-shadow:0 1.1cqh 2cqh rgba(90,65,25,.3);}" +
    ".prayer-card.disabled{filter:grayscale(1) brightness(.82);cursor:not-allowed;}" +
    ".prayer-card.disabled:hover{transform:none;box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.22);}" +
    ".prayer-card-icon{flex:none;width:22cqh;height:22cqh;background-position:center;background-size:contain;background-repeat:no-repeat;}" +
    ".prayer-card-title{font-size:2.7cqh;font-weight:900;}" +
    ".prayer-card-sub{font-size:1.65cqh;font-weight:800;color:#8a6b3d;}" +
    ".prayer-card-desc{flex:1;font-size:1.95cqh;color:#6b4a20;text-align:center;line-height:1.5;font-weight:700;word-break:keep-all;overflow-wrap:break-word;}" +
    ".prayer-card-extra{width:100%;border-radius:1cqh;padding:.8cqh 1cqw;text-align:center;font-size:1.55cqh;font-weight:900;}" +
    ".inline-resource-icon{display:inline-block;width:1.45cqh;height:1.45cqh;vertical-align:-.25cqh;margin-right:.18cqw;background:center/contain no-repeat;}" +
    ".inline-resource-icon-gold{background-image:url('assets/ui/resource_icons/gold.png');}" +
    ".prayer-card-preview{background:rgba(110,175,110,.2);border:.15cqh solid rgba(80,140,80,.4);color:#2f5f30;}" +
    ".prayer-card-preview.full{background:rgba(140,140,140,.2);border-color:rgba(110,110,110,.4);color:#5a5a5a;}" +
    ".prayer-card-pill{background:rgba(200,150,80,.18);border:.15cqh solid rgba(178,140,80,.42);color:#8a6b3d;}" +
    ".prayer-card-pill.insufficient{background:rgba(201,74,61,.16);border-color:rgba(168,46,46,.45);color:#a82e2e;}" +
    ".prayer-tip{position:absolute;bottom:-4cqh;z-index:8;display:flex;align-items:center;gap:0;max-width:26cqw;}" +
    ".prayer-tip-left{left:0;}" +
    ".prayer-tip-right{right:0;flex-direction:row-reverse;text-align:right;}" +
    ".prayer-tip-ghost{flex:none;width:20cqh;height:20cqh;background-position:center;background-size:contain;background-repeat:no-repeat;position:relative;z-index:1;}" +
    ".prayer-tip-left .prayer-tip-ghost{margin-right:-3.2cqw;}" +
    ".prayer-tip-right .prayer-tip-ghost{margin-right:-3.2cqw;}" +
    ".prayer-tip-text{position:relative;z-index:0;font-size:1.85cqh;font-weight:800;color:#6b4a20;background:rgba(255,251,240,.88);" +
      "border-radius:1cqh;padding:.8cqh 1.1cqw;border:.15cqh solid rgba(178,140,80,.4);}" +
    ".prayer-tip-text b{color:#c94a3d;margin-right:.3cqw;}" +
    ".prayer-actions{flex:none;display:flex;justify-content:center;gap:1.2cqw;margin-top:-2.4cqh;}" +
    ".prayer-btn{min-width:16cqw;height:7.4cqh;border-radius:1.3cqh;font-size:2cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.22cqh solid rgba(178,140,80,.5);}" +
    ".prayer-btn-confirm{height:7.4cqh;width:auto;min-width:0;aspect-ratio:384/107;background:transparent url(\"assets/ui_buttons/prayer_select.png\") center/100% 100% no-repeat;color:transparent;border:0;border-radius:0;box-shadow:none;font-size:0;}" +
    ".prayer-btn-skip{background:#fdf6e6;border-color:rgba(140,105,55,.9);color:#4a3a24;box-shadow:0 .4cqh 1cqh rgba(90,65,25,.22);}" +
    ".prayer-btn-skip:hover{background:#fff;}" +
    ".prayer-btn-confirm:disabled{filter:grayscale(1) brightness(.85);cursor:default;}";
  document.head.appendChild(style);
}
