"use strict";
/* =========================================================================
   상점 노드 메인 화면 (shopNode.js)
   기획서: 상점 UI 구현 기획서 - 최신 코드 반영본 (카드 / 약병 / 법구 판매 탭)

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / restNode.js / script.js /
   cardData.js / bagUI.js 이후에 로드되어야 합니다. 기존 코드를 직접 수정하지
   않고, startStage()를 감싸(wrap) shop 타입 노드 진입 시 상점 화면을 띄웁니다.
   (restNode.js가 mapSystem.js의 startStage를 재정의한 것과 동일한 방식이지만,
   여기서는 기존 startStage를 완전히 덮어쓰지 않고 wrapping하여 기도터 처리도
   그대로 보존합니다.)
   ========================================================================= */

/* ── 화면 이용 중 감춰둘 전투 화면 요소 (restNode.js와 동일 패턴) ───────── */
const SHOP_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

/* ── 임시 테스트 가격 (기획서 9장 가격 권장안 기준. 정식 가격 기획 전까지 사용) ──
   카드: 50-90 / 약병: 40-80 / 법구: 80-140 골드, 새로고침 20 골드 시작 */
const SHOP_CARD_PRICE_BY_RARITY = { common: 50, uncommon: 70, rare: 90 };
const SHOP_DEFAULT_CARD_PRICE   = 60;
const SHOP_RELIC_PRICE = { incense_burner: 90, spirit_tablet: 110, charm_box: 130 };

/* 약병 DB (기획서 11장 "약병 DB 신규 추가 권장"). 전역 이름 POTION_DB는
   deckViewer.js(보유 카드 도감)와 cheatConsole.js(CHEAT.give.potion)가 이미
   window.POTION_DB를 찾도록 되어 있어, 그대로 사용하면 자동으로 연결된다. */
const POTION_DB = [
  { id: "heal_potion",    name: "치유 약병", emoji: "💧", desc: "아군 1명 HP 30 회복",  price: 50 },
  { id: "cleanse_potion", name: "정화 약병", emoji: "🌿", desc: "해로운 효과 2개 제거", price: 60 },
  { id: "power_potion",   name: "기운 약병", emoji: "🔥", desc: "공격력 2 증가 (2턴)",  price: 70 },
];
const SHOP_POTION_SLOT_LIMIT = 3;
const SHOP_REFRESH_COST      = 20;
const SHOP_CARD_STOCK_COUNT  = 4;

const SHOP_TAB_INFO = {
  card:   { label: "카드", columns: 4 },
  potion: { label: "약병", columns: 3 },
  relic:  { label: "법구", columns: 3 },
};

const SHOP_MERCHANT_FLAVOR = {
  card: {
    bubble: "몸과 마음이 편안해지는 물건들만 준비했어요.",
    recommend: "치유와 정화, 그 균형이 당신의 승리를 이끌어줄 거예요.",
    tip: "카드는 전투 중 한 번만 사용할 수 있어요.\n최적의 순간을 노려 보세요.",
  },
  potion: {
    bubble: "몸과 마음이 편안해지는 물건들만 준비했어요.",
    recommend: "치유와 정화, 그 균형이 당신의 승리를 이끌어줄 거예요.",
    tip: "치유와 정화로 전투를 안정적으로 이어가,\n승리의 길을 열어보세요.",
  },
  relic: {
    bubble: "몸과 마음에 짙은 여운을 남기는 법구들을 준비했어요.",
    recommend: "전투를 든든하게 받쳐주는 법구는\n오래도록 당신과 함께해요.",
    tip: "법구는 지속 효과가 강력해\n장기적인 전투에 큰 도움이 돼요!",
  },
};

let shopOverlayEl = null;
let SHOP_STATE     = null;

/* ── startStage 감싸기: shop 타입 노드만 가로채고 나머지는 기존 로직에 위임 ── */
(function () {
  const prevStartStage = window.startStage;
  window.startStage = function (stageIdx) {
    const stage = typeof MAP_STAGES !== "undefined" ? MAP_STAGES[stageIdx] : null;

    if (stage && stage.type === "shop") {
      window.MAP_STATE.currentStage = stageIdx;
      window.MAP_STATE.proceedMode  = false;
      window.MAP_STATE.startMapMode = false;
      if (typeof updateHudFloor === "function") updateHudFloor();
      if (typeof closeMap === "function") closeMap();
      openShopNode();
      return;
    }

    if (typeof prevStartStage === "function") return prevStartStage(stageIdx);
  };
})();

/* ── 상점 열기/닫기 ──────────────────────────────────────────────────────── */
function openShopNode() {
  ensureShopOverlay();
  hideShopChrome();
  ensureShopState();
  switchShopTab("card");
  shopOverlayEl.classList.add("show");
  shopOverlayEl.setAttribute("aria-hidden", "false");
}

function closeShopNode() {
  if (!shopOverlayEl) return;
  shopOverlayEl.classList.remove("show");
  shopOverlayEl.setAttribute("aria-hidden", "true");
  showShopChrome();
}

/* 나가기: 상점 종료 후 맵으로 복귀 (기획서 8장 순서 7) */
function exitShopNode() {
  closeShopNode();
  if (typeof syncRunStateFromCombat === "function") syncRunStateFromCombat();
  window.MAP_STATE.proceedMode = true;
  if (typeof openMap === "function") openMap();
}

function hideShopChrome() {
  SHOP_HIDE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.dataset.shopPrevDisplay === undefined) el.dataset.shopPrevDisplay = el.style.display || "";
      el.style.display = "none";
    });
  });
}

function showShopChrome() {
  SHOP_HIDE_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (el.dataset.shopPrevDisplay !== undefined) {
        el.style.display = el.dataset.shopPrevDisplay;
        delete el.dataset.shopPrevDisplay;
      }
    });
  });
}

/* ── 상점 상태 / 판매 목록 생성 (기획서 11장 SHOP_STATE 구조) ─────────────── */
function ensureShopState() {
  SHOP_STATE = {
    activeTab: "card",
    selectedId: null,
    refreshCost: SHOP_REFRESH_COST,
    stock: { card: [], potion: [], relic: [] },
  };
  generateShopStock();
}

function generateShopStock() {
  SHOP_STATE.stock.card   = buildCardStock();
  SHOP_STATE.stock.potion = buildPotionStock();
  SHOP_STATE.stock.relic  = buildRelicStock();
}

function getCardPrice(key) {
  const card = CARD_DB[key];
  return (card && SHOP_CARD_PRICE_BY_RARITY[card.rarity]) || SHOP_DEFAULT_CARD_PRICE;
}

function buildCardStock() {
  const pool = CARD_REWARD_POOL.slice().sort(() => Math.random() - 0.5);
  return pool.slice(0, SHOP_CARD_STOCK_COUNT).map((key) => {
    const card = CARD_DB[key];
    return {
      id: key, category: "card", sourceKey: key,
      name: card.name, emoji: card.emoji, cardType: card.type,
      desc: card.desc, price: getCardPrice(key), soldOut: false,
    };
  });
}

function buildPotionStock() {
  return POTION_DB.map((p) => ({ ...p, category: "potion", soldOut: false }));
}

function buildRelicStock() {
  return RELIC_DB.map((r) => ({
    ...r, category: "relic",
    price: SHOP_RELIC_PRICE[r.id] || 100,
    soldOut: false,
  }));
}

/* ── 탭 전환 / 상품 선택 ──────────────────────────────────────────────────── */
function switchShopTab(tab) {
  SHOP_STATE.activeTab = tab;
  const stock = SHOP_STATE.stock[tab];
  const firstAvailable = stock.find((it) => !it.soldOut) || stock[0] || null;
  SHOP_STATE.selectedId = firstAvailable ? firstAvailable.id : null;
  renderShopOverlay();
}

function selectShopItem(id) {
  SHOP_STATE.selectedId = id;
  renderShopOverlay();
}

/* ── 구매 조건 판정 (기획서 9장) ──────────────────────────────────────────── */
function canAfford(price) {
  return typeof S !== "undefined" && S && typeof S.gold === "number" && S.gold >= price;
}

function isRelicOwned(id) {
  return typeof S !== "undefined" && S && Array.isArray(S.relics) && S.relics.some((r) => r && r.id === id);
}

function getPotionCount() {
  return (typeof S !== "undefined" && S && Array.isArray(S.potions)) ? S.potions.length : 0;
}

/* 구매/새로고침 성공 시 공통 마무리 처리 (기획서 12장: S와 RUN_STATE 모두 반영) */
function finalizeShopChange() {
  if (typeof renderHud === "function") renderHud();
  if (typeof syncRunStateFromCombat === "function") syncRunStateFromCombat();
  renderShopOverlay();
}

function buyCurrentItem() {
  if (!SHOP_STATE || !SHOP_STATE.selectedId) return;
  const item = SHOP_STATE.stock[SHOP_STATE.activeTab].find((it) => it.id === SHOP_STATE.selectedId);
  if (!item || item.soldOut) return;

  if (item.category === "card")   { buyCard(item);   return; }
  if (item.category === "potion") { buyPotion(item);  return; }
  if (item.category === "relic")  { buyRelic(item);   return; }
}

function buyCard(item) {
  if (!canAfford(item.price)) { if (typeof toast === "function") toast("골드가 부족합니다."); return; }
  STARTER_DECK.push(item.sourceKey);
  S.gold -= item.price;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  finalizeShopChange();
}

function buyPotion(item) {
  if (getPotionCount() >= SHOP_POTION_SLOT_LIMIT) { if (typeof toast === "function") toast("약병 슬롯이 가득 찼습니다."); return; }
  if (!canAfford(item.price)) { if (typeof toast === "function") toast("골드가 부족합니다."); return; }
  if (!Array.isArray(S.potions)) S.potions = [];
  S.potions.push({ id: item.id, name: item.name, emoji: item.emoji, desc: item.desc });
  S.gold -= item.price;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  finalizeShopChange();
}

function buyRelic(item) {
  if (isRelicOwned(item.id)) { if (typeof toast === "function") toast("이미 보유한 법구입니다."); return; }
  if (!canAfford(item.price)) { if (typeof toast === "function") toast("골드가 부족합니다."); return; }
  if (!Array.isArray(S.relics)) S.relics = [];
  S.relics.push({ id: item.id, name: item.name, emoji: item.emoji, desc: item.desc });
  S.gold -= item.price;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  finalizeShopChange();
}

function refreshShopStock() {
  if (!canAfford(SHOP_STATE.refreshCost)) { if (typeof toast === "function") toast("골드가 부족합니다."); return; }
  S.gold -= SHOP_STATE.refreshCost;
  generateShopStock();
  const stock = SHOP_STATE.stock[SHOP_STATE.activeTab];
  SHOP_STATE.selectedId = stock.length ? stock[0].id : null;
  if (typeof toast === "function") toast("판매 목록을 새로고침했습니다.");
  finalizeShopChange();
}

/* ── DOM 생성 ─────────────────────────────────────────────────────────────── */
function ensureShopOverlay() {
  if (shopOverlayEl) return shopOverlayEl;
  ensureShopStyles();

  const overlay = document.createElement("div");
  overlay.id = "shopOverlay";
  overlay.className = "shop-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = shopOverlayHtml();

  overlay.querySelectorAll(".shop-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchShopTab(btn.dataset.tab));
  });
  overlay.querySelector("#shopRefreshBtn").addEventListener("click", refreshShopStock);
  overlay.querySelector("#shopExitBtn").addEventListener("click", exitShopNode);

  overlay.querySelector("#shopMapBtn").addEventListener("click", () => {
    if (typeof openMap === "function") openMap();
    else if (typeof toast === "function") toast("지도를 열 수 없습니다.");
  });
  overlay.querySelector("#shopDeckBtn").addEventListener("click", () => {
    const deckBtn = document.getElementById("deckViewerButton");
    if (deckBtn) deckBtn.click();
    else if (typeof toast === "function") toast("보유 카드 확인 기능을 열 수 없습니다.");
  });
  overlay.querySelector("#shopBagBtn").addEventListener("click", () => {
    if (typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
    else if (typeof toast === "function") toast("가방 확인 기능은 준비 중입니다.");
  });
  overlay.querySelector("#shopSettingsBtn").addEventListener("click", () => {
    const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
      .find((b) => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
    if (settingsBtn) settingsBtn.click();
    else if (typeof toast === "function") toast("설정 기능을 열 수 없습니다.");
  });

  (document.querySelector("#game") || document.body).appendChild(overlay);
  shopOverlayEl = overlay;
  return overlay;
}

function shopOverlayHtml() {
  return (
    '<div class="shop-header">' +
      '<div class="shop-player-card">' +
        '<div class="shop-portrait" id="shopPortrait">👼</div>' +
        '<div class="shop-player-body">' +
          '<div class="shop-player-name"><b id="shopName"></b><span id="shopTitle"></span></div>' +
          '<div class="shop-hp-row"><span>정신력</span><span id="shopHpText"></span></div>' +
          '<div class="shop-hp-bar"><div class="shop-hp-fill" id="shopHpFill"></div></div>' +
          '<div class="shop-resource-row">' +
            '<span class="shop-resource">🏺<b id="shopRelicCount">0</b></span>' +
            '<span class="shop-resource">🧪<b id="shopPotionCount">0</b></span>' +
            '<span class="shop-resource">🪙<b id="shopGold">0</b></span>' +
            '<span class="shop-resource">🌙<b id="shopMoonShard">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="shop-title-badge">' +
        '<div class="shop-title-main">상점</div>' +
        '<div class="shop-title-sub">필요한 물품을 구매해 다음 전투를 준비하세요.</div>' +
      '</div>' +
      '<div class="shop-header-buttons">' +
        '<button type="button" class="shop-header-btn" id="shopMapBtn"><span class="ico">🗺️</span><span>지도</span></button>' +
        '<button type="button" class="shop-header-btn" id="shopDeckBtn"><span class="ico">📖</span><span>보유카드</span></button>' +
        '<button type="button" class="shop-header-btn" id="shopBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="shop-header-btn" id="shopSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="shop-body">' +
      '<div class="shop-merchant">' +
        '<div class="shop-merchant-bubble" id="shopMerchantBubble"></div>' +
        '<div class="shop-merchant-npc">👻</div>' +
        '<div class="shop-merchant-box">' +
          '<div class="shop-box-title">오늘의 추천</div>' +
          '<div class="shop-box-desc" id="shopRecommendText"></div>' +
        '</div>' +
        '<div class="shop-merchant-box">' +
          '<div class="shop-box-title">상인 TIP</div>' +
          '<div class="shop-box-desc" id="shopTipText"></div>' +
        '</div>' +
      '</div>' +
      '<div class="shop-main">' +
        '<div class="shop-tabs" id="shopTabs">' +
          '<button type="button" class="shop-tab" data-tab="card">카드</button>' +
          '<button type="button" class="shop-tab" data-tab="potion">약병</button>' +
          '<button type="button" class="shop-tab" data-tab="relic">법구</button>' +
        '</div>' +
        '<div class="shop-products" id="shopProducts"></div>' +
      '</div>' +
      '<div class="shop-detail" id="shopDetail"></div>' +
    '</div>' +
    '<div class="shop-footer">' +
      '<button type="button" class="shop-footer-btn" id="shopRefreshBtn">새로고침 <span class="shop-cost" id="shopRefreshCost">🪙 20</span></button>' +
      '<button type="button" class="shop-footer-btn shop-exit-btn" id="shopExitBtn">나가기</button>' +
    '</div>'
  );
}

/* ── 렌더링 (열거나 상태가 바뀔 때마다 최신 상태 반영) ────────────────────── */
function renderShopOverlay() {
  if (!shopOverlayEl || !SHOP_STATE) return;
  renderShopHeader();
  renderShopMerchant();
  renderShopTabs();
  renderShopProducts();
  renderShopDetail();
  renderShopFooter();
}

function renderShopHeader() {
  if (typeof S === "undefined" || !S || !S.player) return;
  const p = S.player;

  shopOverlayEl.querySelector("#shopPortrait").textContent = p.emoji || "👼";
  shopOverlayEl.querySelector("#shopName").textContent     = p.name  || "";
  shopOverlayEl.querySelector("#shopTitle").textContent    = p.title || "";
  shopOverlayEl.querySelector("#shopHpText").textContent   = p.hp + "/" + p.maxHp;

  const pct = p.maxHp ? Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100)) : 0;
  shopOverlayEl.querySelector("#shopHpFill").style.width = pct + "%";

  const count = typeof resourceCount === "function" ? resourceCount : (v => Array.isArray(v) ? v.length : (v || 0));
  shopOverlayEl.querySelector("#shopRelicCount").textContent  = count(S.relics);
  shopOverlayEl.querySelector("#shopPotionCount").textContent = count(S.potions);
  shopOverlayEl.querySelector("#shopGold").textContent        = S.gold || 0;
  shopOverlayEl.querySelector("#shopMoonShard").textContent   = S.moonShards || 0;
}

function renderShopMerchant() {
  const flavor = SHOP_MERCHANT_FLAVOR[SHOP_STATE.activeTab] || SHOP_MERCHANT_FLAVOR.card;
  shopOverlayEl.querySelector("#shopMerchantBubble").textContent = flavor.bubble;
  shopOverlayEl.querySelector("#shopRecommendText").textContent  = flavor.recommend;
  shopOverlayEl.querySelector("#shopTipText").textContent        = flavor.tip;
}

function renderShopTabs() {
  shopOverlayEl.querySelectorAll(".shop-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === SHOP_STATE.activeTab);
  });
}

function renderShopProducts() {
  const host  = shopOverlayEl.querySelector("#shopProducts");
  const tab   = SHOP_STATE.activeTab;
  const stock = SHOP_STATE.stock[tab];
  const info  = SHOP_TAB_INFO[tab];

  host.style.gridTemplateColumns = "repeat(" + info.columns + ", 1fr)";
  host.innerHTML = stock.map((item) => shopProductCardHtml(item)).join("");

  host.querySelectorAll(".shop-product[data-id]").forEach((card) => {
    card.addEventListener("click", () => selectShopItem(card.dataset.id));
  });
}

function shopItemTypeLabel(item) {
  if (item.category === "card")   return typeof typeLabel === "function" ? typeLabel(item.cardType) : item.cardType;
  if (item.category === "potion") return "약병";
  return "지속";
}

function shopProductCardHtml(item) {
  const selected = item.id === SHOP_STATE.selectedId;
  const typeCls  = item.category === "card" ? item.cardType : "";
  return (
    '<button type="button" class="shop-product' + (selected ? " selected" : "") + (item.soldOut ? " sold-out" : "") + '" data-id="' + item.id + '">' +
      '<div class="shop-product-name">' + escapeShopHtml(item.name) + '</div>' +
      '<div class="shop-product-art">' + escapeShopHtml(item.emoji || "") + '</div>' +
      '<div class="shop-product-type type ' + typeCls + '">' + escapeShopHtml(shopItemTypeLabel(item)) + '</div>' +
      '<div class="shop-product-desc">' + escapeShopHtml(item.desc || "").replace(/\n/g, "<br>") + '</div>' +
      '<div class="shop-product-price">' + (item.soldOut ? "품절" : "🪙 " + item.price) + '</div>' +
    '</button>'
  );
}

function renderShopDetail() {
  const host  = shopOverlayEl.querySelector("#shopDetail");
  const tab   = SHOP_STATE.activeTab;
  const stock = SHOP_STATE.stock[tab];
  const item  = stock.find((it) => it.id === SHOP_STATE.selectedId);

  if (!item) {
    host.innerHTML = '<div class="shop-detail-placeholder">상품을 선택하면 상세 정보를 볼 수 있어요.</div>';
    return;
  }

  const typeCls = item.category === "card" ? item.cardType : "";

  const potionFull  = item.category === "potion" && getPotionCount() >= SHOP_POTION_SLOT_LIMIT;
  const relicOwned  = item.category === "relic"  && isRelicOwned(item.id);
  const goldShort   = !canAfford(item.price);
  const disabled    = item.soldOut || goldShort || potionFull || relicOwned;

  let buyLabel = "구매";
  if (item.soldOut) buyLabel = "품절";
  else if (relicOwned) buyLabel = "보유 중";
  else if (potionFull) buyLabel = "슬롯 가득 참";
  else if (goldShort) buyLabel = "골드 부족";

  host.innerHTML =
    '<div class="shop-detail-name">' + escapeShopHtml(item.name) + '</div>' +
    '<div class="shop-detail-art">' + escapeShopHtml(item.emoji || "") + '</div>' +
    '<div class="shop-detail-type type ' + typeCls + '">' + escapeShopHtml(shopItemTypeLabel(item)) + '</div>' +
    '<div class="shop-detail-desc">' + escapeShopHtml(item.desc || "").replace(/\n/g, "<br>") + '</div>' +
    '<div class="shop-detail-price">' + (item.soldOut ? "" : "🪙 " + item.price) + '</div>' +
    '<button type="button" class="shop-buy-btn" id="shopBuyBtn"' + (disabled ? " disabled" : "") + '>' + escapeShopHtml(buyLabel) + '</button>';

  const buyBtn = host.querySelector("#shopBuyBtn");
  if (buyBtn) buyBtn.addEventListener("click", buyCurrentItem);
}

function renderShopFooter() {
  const canRefresh = canAfford(SHOP_STATE.refreshCost);
  shopOverlayEl.querySelector("#shopRefreshBtn").disabled = !canRefresh;
  shopOverlayEl.querySelector("#shopRefreshCost").textContent = "🪙 " + SHOP_STATE.refreshCost;
}

function escapeShopHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ── 스타일 (기획서 3장: 크림/베이지/금색 톤. restNode.js / bagUI.js와 통일) ── */
function ensureShopStyles() {
  if (document.getElementById("shopNodeStyles")) return;

  const style = document.createElement("style");
  style.id = "shopNodeStyles";
  style.textContent =
    ".shop-overlay{position:absolute;inset:0;z-index:45;display:none;flex-direction:column;" +
      "padding:1.4cqh 1.6cqw 2.2cqh;gap:1.2cqh;color:#4a3a24;font-family:inherit;" +
      "background:radial-gradient(120% 70% at 50% 0%,rgba(255,241,214,.92) 0%,rgba(243,224,189,.82) 45%,rgba(196,168,132,.62) 100%)," +
        "linear-gradient(180deg,#efe0c4 0%,#d8c39a 55%,#c3aa7c 100%);}" +
    ".shop-overlay.show{display:flex;}" +

    ".shop-header{flex:none;display:flex;align-items:stretch;gap:1.2cqw;height:11.5cqh;}" +
    ".shop-player-card{flex:none;display:flex;align-items:center;gap:1cqw;width:26cqw;min-width:32cqh;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "padding:.9cqh 1.1cqw;box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".shop-portrait{flex:none;width:8.4cqh;height:8.4cqh;border-radius:50%;display:grid;place-items:center;" +
      "font-size:4.3cqh;background:linear-gradient(160deg,#fff8e6,#f0dcb0);border:.22cqh solid #caa15a;}" +
    ".shop-player-body{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.4cqh;}" +
    ".shop-player-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".shop-player-name b{font-size:1.85cqh;}" +
    ".shop-player-name span{margin-left:.6cqw;font-size:1.25cqh;color:#8a6b3d;font-weight:800;}" +
    ".shop-hp-row{display:flex;justify-content:space-between;font-size:1.35cqh;font-weight:900;color:#6b4a20;}" +
    ".shop-hp-bar{position:relative;height:1.25cqh;border-radius:.7cqh;overflow:hidden;background:rgba(120,60,40,.25);}" +
    ".shop-hp-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(180deg,#f0857a,#c94a3d);transition:width .3s ease;}" +
    ".shop-resource-row{display:flex;gap:.8cqw;font-size:1.2cqh;font-weight:900;color:#6b4a20;}" +
    ".shop-resource{display:inline-flex;align-items:center;gap:.25cqw;}" +

    ".shop-title-badge{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".shop-title-main{font-size:2.6cqh;font-weight:900;letter-spacing:.25cqh;}" +
    ".shop-title-sub{font-size:1.2cqh;color:#8a6b3d;margin-top:.35cqh;font-weight:700;}" +

    ".shop-header-buttons{flex:none;display:flex;align-items:center;gap:.7cqw;}" +
    ".shop-header-btn{width:8.2cqh;height:100%;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:.3cqh;background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);" +
      "border-radius:1.2cqh;color:#6b4a20;cursor:pointer;font:inherit;}" +
    ".shop-header-btn .ico{font-size:2.4cqh;line-height:1;}" +
    ".shop-header-btn span:last-child{font-size:1.05cqh;font-weight:900;}" +
    ".shop-header-btn:active{transform:scale(.94);}" +

    ".shop-body{flex:1;min-height:0;display:flex;gap:1.4cqw;}" +

    ".shop-merchant{flex:none;width:19cqw;min-width:24cqh;display:flex;flex-direction:column;gap:1cqh;position:relative;}" +
    ".shop-merchant-bubble{background:rgba(255,251,240,.9);border:.18cqh solid rgba(178,140,80,.4);border-radius:1.2cqh;" +
      "padding:.9cqh 1cqw;font-size:1.2cqh;font-weight:800;color:#6b4a20;text-align:center;}" +
    ".shop-merchant-npc{flex:1;display:flex;align-items:center;justify-content:center;font-size:11cqh;" +
      "filter:drop-shadow(0 .6cqh 1cqh rgba(90,65,25,.25));}" +
    ".shop-merchant-box{background:rgba(255,251,240,.9);border:.18cqh solid rgba(178,140,80,.4);border-radius:1.2cqh;padding:.8cqh 1cqw;}" +
    ".shop-box-title{font-size:1.2cqh;font-weight:900;color:#8a6b3d;margin-bottom:.3cqh;}" +
    ".shop-box-desc{font-size:1.15cqh;font-weight:700;color:#6b4a20;line-height:1.4;white-space:pre-line;}" +

    ".shop-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:0;}" +
    ".shop-tabs{flex:none;display:flex;gap:.6cqw;}" +
    ".shop-tab{flex:1;height:5cqh;border-radius:1.1cqh 1.1cqh 0 0;border:.2cqh solid rgba(178,140,80,.5);border-bottom:none;" +
      "background:rgba(230,214,180,.6);color:#8a6b3d;font-size:1.7cqh;font-weight:900;cursor:pointer;font:inherit;}" +
    ".shop-tab.active{background:rgba(255,251,240,.96);color:#4a3a24;}" +
    ".shop-products{flex:1;min-height:0;display:grid;align-content:start;gap:1cqw;padding:1.4cqh 1.2cqw;" +
      "background:rgba(255,251,240,.9);border:.2cqh solid rgba(178,140,80,.5);border-radius:0 1.1cqh 1.1cqh 1.1cqh;overflow:auto;}" +

    ".shop-product{display:flex;flex-direction:column;align-items:center;gap:.5cqh;padding:1.2cqh .8cqw;" +
      "background:linear-gradient(180deg,rgba(255,252,242,.96),rgba(247,235,208,.92));" +
      "border:.2cqh solid rgba(178,140,80,.5);border-radius:1.2cqh;cursor:pointer;font:inherit;color:#4a3a24;" +
      "box-shadow:0 .5cqh 1cqh rgba(90,65,25,.14);transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease;}" +
    ".shop-product:hover{transform:translateY(-.4cqh);}" +
    ".shop-product.selected{border-color:#3f8fe0;box-shadow:0 0 0 .22cqh rgba(63,143,224,.35);}" +
    ".shop-product.sold-out{opacity:.5;cursor:not-allowed;}" +
    ".shop-product.sold-out:hover{transform:none;}" +
    ".shop-product-name{font-size:1.35cqh;font-weight:900;text-align:center;}" +
    ".shop-product-art{width:100%;flex:1;min-height:8cqh;display:grid;place-items:center;font-size:4.4cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1cqh;border:.14cqh solid #d9bd85;}" +
    ".shop-product-type{font-size:1.05cqh;font-weight:800;color:#fff;padding:.15cqh .8cqw;border-radius:.7cqh;background:#8a6b3d;}" +
    ".shop-product-desc{font-size:1.05cqh;font-weight:700;color:#6b4a20;text-align:center;line-height:1.3;min-height:3.2cqh;}" +
    ".shop-product-price{font-size:1.3cqh;font-weight:900;color:#a97a1f;}" +

    ".shop-detail{flex:none;width:17cqw;min-width:22cqh;display:flex;flex-direction:column;align-items:center;gap:.8cqh;" +
      "padding:1.4cqh 1.1cqw;background:rgba(255,251,240,.92);border:.2cqh solid rgba(178,140,80,.5);border-radius:1.3cqh;}" +
    ".shop-detail-placeholder{margin:auto;font-size:1.3cqh;font-weight:700;color:#8a6b3d;text-align:center;}" +
    ".shop-detail-name{font-size:1.7cqh;font-weight:900;text-align:center;}" +
    ".shop-detail-art{width:100%;min-height:14cqh;display:grid;place-items:center;font-size:7cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1.2cqh;border:.18cqh solid #d9bd85;}" +
    ".shop-detail-type{font-size:1.15cqh;font-weight:800;color:#fff;padding:.2cqh 1cqw;border-radius:.8cqh;background:#8a6b3d;}" +
    ".shop-detail-desc{font-size:1.2cqh;font-weight:700;color:#6b4a20;text-align:center;line-height:1.4;}" +
    ".shop-detail-price{font-size:1.6cqh;font-weight:900;color:#a97a1f;}" +
    ".shop-buy-btn{width:100%;height:5cqh;border-radius:1.1cqh;font-size:1.9cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.2cqh solid #3f7c4e;background:linear-gradient(180deg,#7fbf8a,#4f9c62);color:#fff;margin-top:auto;}" +
    ".shop-buy-btn:disabled{filter:grayscale(.5) brightness(.92);cursor:default;opacity:.7;}" +

    ".shop-footer{flex:none;display:flex;justify-content:flex-end;gap:1cqw;}" +
    ".shop-footer-btn{min-width:14cqw;height:5.4cqh;border-radius:1.2cqh;font-size:1.7cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.2cqh solid rgba(178,140,80,.5);background:rgba(255,251,240,.9);color:#6b4a20;}" +
    ".shop-footer-btn:disabled{opacity:.5;cursor:default;}" +
    ".shop-cost{margin-left:.4cqw;font-size:1.3cqh;}" +
    ".shop-exit-btn{background:linear-gradient(180deg,#e0b0a0,#c97a63);color:#fff;border-color:#a85a45;}" +

    "@media (max-width:900px){.shop-body{flex-direction:column;}.shop-merchant{width:auto;flex-direction:row;flex-wrap:wrap;}" +
      ".shop-detail{width:auto;}}";
  document.head.appendChild(style);
}
