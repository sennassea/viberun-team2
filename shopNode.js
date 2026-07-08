"use strict";
/* =========================================================================
   상점 노드 메인 화면 (shopNode.js)
   기획서: 상점 UI 구현 기획서 - 최신 코드 반영본 (주문 / 약병 / 법구 판매 탭)

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / restNode.js / script.js /
   cardData.js / bagUI.js 이후에 로드되어야 합니다. 기존 코드를 직접 수정하지
   않고, startStage()를 감싸(wrap) shop 타입 노드 진입 시 상점 화면을 띄웁니다.
   (restNode.js가 mapSystem.js의 startStage를 재정의한 것과 동일한 방식이지만,
   여기서는 기존 startStage를 완전히 덮어쓰지 않고 wrapping하여 기도터 처리도
   그대로 보존합니다.)
   ========================================================================= */

/* ── 화면 이용 중 감춰둘 전투 화면 요소 (restNode.js와 동일 패턴) ───────── */
const SHOP_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

/* ── 상점 가격. 카드 가격은 balanceData.js에서 관리합니다. ──
   주문: 일반 50-70 / 희귀·강력 90-130 기준, 새로고침 20 골드 시작 */
const SHOP_BALANCE = window.BOHYUN_BALANCE || {};
const SHOP_CARD_PRICE_BY_RARITY = SHOP_BALANCE.shopCardPriceByRarity || { common: 60, uncommon: 90, rare: 120 };
const SHOP_DEFAULT_CARD_PRICE   = SHOP_BALANCE.shopDefaultCardPrice || 60;
const SHOP_RELIC_PRICE = { common: 80, uncommon: 110, rare: 145 };

/* 약병 DB는 potion.js의 POTION_DB를 사용합니다. */
const SHOP_POTION_DB = (typeof window.POTION_DB !== "undefined") ? window.POTION_DB : [];
const SHOP_POTION_SLOT_LIMIT = (typeof window.POTION_SLOT_LIMIT === "number") ? window.POTION_SLOT_LIMIT : 3;
const SHOP_REFRESH_COST      = 20;
const SHOP_CARD_STOCK_COUNT  = 4;
const SHOP_POTION_STOCK_COUNT = 3;
const SHOP_RELIC_STOCK_COUNT  = 3;

const SHOP_TAB_INFO = {
  card:   { label: "주문", columns: 4 },
  potion: { label: "약병", columns: 3 },
  relic:  { label: "법구", columns: 3 },
};

const SHOP_MERCHANT_FLAVOR = {
  card: {
    bubble: "몸과 마음이 편안해지는 물건들만 준비했어요.",
    recommend: "치유와 정화, 그 균형이 당신의 승리를 이끌어줄 거예요.",
    tip: "주문은 전투 중 한 번만 사용할 수 있어요.\n최적의 순간을 노려 보세요.",
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
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmShop");
  }
}

function closeShopNode() {
  if (!shopOverlayEl) return;
  shopOverlayEl.classList.remove("show");
  shopOverlayEl.setAttribute("aria-hidden", "true");
  showShopChrome();
}

/* 나가기: 상점 종료 후 맵으로 복귀 (기획서 8장 순서 7) */
function exitShopNode() {
  if(typeof recordCompletedNodeScore === "function"){
    recordCompletedNodeScore("shop", {
      reason: "상점 방문 완료"
    });
  }

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
    firstPurchaseDone: false,
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

/**
 * 상점 판매 후보 목록을 무작위로 섞은 뒤 지정 개수만큼 반환합니다.
 * 원본 DB 배열은 직접 변경하지 않습니다.
 *
 * @param {Array} list - 판매 후보 목록
 * @param {number} count - 상점에 실제로 표시할 개수
 * @returns {Array} 지정 개수만큼 추출된 판매 목록
 */
function pickShopItems(list, count) {
  if (!Array.isArray(list)) {
    console.warn("[Shop] 판매 후보 목록이 배열이 아닙니다.", list);
    return [];
  }

  return list
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

/**
 * 상점 판매 후보(법구/약병처럼 rarity를 가진 객체)에서 등급 우선 추첨(60/30/10)으로
 * 지정 개수만큼 중복 없이 뽑습니다. 원본 배열은 변경하지 않습니다.
 */
function pickShopItemsByRarity(list, count) {
  if (!Array.isArray(list)) {
    console.warn("[Shop] 판매 후보 목록이 배열이 아닙니다.", list);
    return [];
  }
  const pool = list.slice();
  const picked = [];
  for (let i = 0; i < count && pool.length; i++) {
    const item = typeof window.pickRewardItemByRarity === "function"
      ? window.pickRewardItemByRarity(pool, { context: "shop" })
      : pool[Math.floor(Math.random() * pool.length)];
    if (!item) break;
    const idx = pool.indexOf(item);
    if (idx >= 0) pool.splice(idx, 1);
    picked.push(item);
  }
  return picked;
}

function buildCardStock() {
  const cardPool =
    window.VIBERUN_SPIRIT_PATH_FILTER &&
    typeof window.VIBERUN_SPIRIT_PATH_FILTER.filterCardKeysBySpiritPath === "function"
      ? window.VIBERUN_SPIRIT_PATH_FILTER.filterCardKeysBySpiritPath(CARD_REWARD_POOL)
      : CARD_REWARD_POOL;
  const keys = typeof window.getWeightedCardRewardKeys === "function"
    ? window.getWeightedCardRewardKeys(SHOP_CARD_STOCK_COUNT, cardPool, { context: "shop" })
    : pickShopItems(cardPool, SHOP_CARD_STOCK_COUNT);
  return keys.map((key) => {
    const card = CARD_DB[key];

    if (!card) {
      console.warn("[Shop] 존재하지 않는 주문 ID가 판매 목록에 포함되었습니다.", key);
      return null;
    }

    return {
      id: key,
      category: "card",
      sourceKey: key,
      name: card.name,
      emoji: card.emoji,
      cardType: card.type,
      desc: card.desc,
      price: getCardPrice(key),
      soldOut: false,
    };
  }).filter(Boolean);
}

function buildPotionStock() {
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("shop")
    : SHOP_POTION_DB;

  return pickShopItemsByRarity(db, SHOP_POTION_STOCK_COUNT).map((p) => ({
    ...p,
    category: "potion",
    price: p.shopPrice || p.price || 0,
    soldOut: false,
  }));
}

function buildRelicStock() {
  let db = typeof window.getRelicCandidatesBySource === "function"
    ? window.getRelicCandidatesBySource("shop")
    : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);

  if (!db.length) db = getShopRelicMasterCandidates();

  return pickShopItemsByRarity(db, SHOP_RELIC_STOCK_COUNT).map((r) => ({
    ...r,
    category: "relic",
    price: r.shopPrice || r.price || SHOP_RELIC_PRICE[r.rarity] || 100,
    soldOut: false,
  }));
}

function getShopRelicMasterCandidates() {
  const masterDb = Array.isArray(window.RELIC_MASTER_DB)
    ? window.RELIC_MASTER_DB
    : (typeof RELIC_MASTER_DB !== "undefined" ? RELIC_MASTER_DB : []);

  return masterDb
    .filter((item) => {
      if (!item) return false;
      if (item.category === "blessingRelic" || item.source === "startBlessing") return false;
      if (Array.isArray(item.obtainFrom) && item.obtainFrom.includes("shop")) return true;
      return Array.isArray(item.obtainFromProposal) && item.obtainFromProposal.includes("상점");
    })
    .map((item) => {
      if (typeof normalizeRelicForRuntime === "function") return normalizeRelicForRuntime(item);
      return {
        ...item,
        attr: item.attr || item.deck || "범용",
        price: item.shopPrice || item.price || 0,
        desc: item.desc || item.effectText || item.valueText || "",
        fx: Array.isArray(item.fx) ? item.fx : [],
        masterData: item
      };
    });
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

function getEffectiveShopPrice(item) {
  const base = Math.max(0, item && Number.isFinite(item.price) ? item.price : 0);
  let price = base;
  if (SHOP_STATE && !SHOP_STATE.firstPurchaseDone && typeof hasRelic === "function" && hasRelic("peddler_abacus")) {
    price = Math.max(0, Math.floor(base * 0.85));
  }
  return typeof scaleEndlessShopPrice === "function" ? scaleEndlessShopPrice(price) : price;
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
  const price = getEffectiveShopPrice(item);
  if (!canAfford(price)) {
    if (typeof toast === "function") toast("골드가 부족합니다.");
    if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuyFail");
    return;
  }
  if (typeof addPermanentCard === "function") addPermanentCard(item.sourceKey, { source:"shop" });
  else STARTER_DECK.push(item.sourceKey);
  S.gold -= price;
  SHOP_STATE.firstPurchaseDone = true;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuy");
  finalizeShopChange();
}

function buyPotion(item) {
  if (getPotionCount() >= SHOP_POTION_SLOT_LIMIT) { if (typeof toast === "function") toast("약병 슬롯이 가득 찼습니다."); return; }
  const price = getEffectiveShopPrice(item);
  if (!canAfford(price)) {
    if (typeof toast === "function") toast("골드가 부족합니다.");
    if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuyFail");
    return;
  }
  if (!Array.isArray(S.potions)) S.potions = [];
  S.potions.push({ ...item, soldOut: undefined, category: undefined });
  S.gold -= price;
  SHOP_STATE.firstPurchaseDone = true;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuy");
  finalizeShopChange();
}

function buyRelic(item) {
  if (isRelicOwned(item.id)) { if (typeof toast === "function") toast("이미 보유한 법구입니다."); return; }
  const price = getEffectiveShopPrice(item);
  if (!canAfford(price)) {
    if (typeof toast === "function") toast("골드가 부족합니다.");
    if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuyFail");
    return;
  }
  if (!Array.isArray(S.relics)) S.relics = [];
  // 효과 배열(fx)까지 보존해야 전투 시작/턴 종료/조건부 법구 효과가 정상 발동됩니다.
  S.relics.push({ ...item });
  S.gold -= price;
  SHOP_STATE.firstPurchaseDone = true;
  item.soldOut = true;
  if (typeof toast === "function") toast(item.name + " 구매 완료");
  if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("shopBuy");
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
    else if (typeof toast === "function") toast("여정을 열 수 없습니다.");
  });
  overlay.querySelector("#shopDeckBtn").addEventListener("click", () => {
    const deckBtn = document.getElementById("deckViewerButton");
    if (deckBtn) deckBtn.click();
    else if (typeof toast === "function") toast("보유 주문 확인 기능을 열 수 없습니다.");
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
          '<div class="shop-hp-row">' +
            '<div class="shop-hp-bar"><div class="shop-hp-fill" id="shopHpFill"></div><span id="shopHpText"></span></div>' +
          '</div>' +
          '<div class="shop-resource-row">' +
            '<span class="shop-resource"><span class="hud-resource-icon hud-resource-icon-relic">🏺</span><b id="shopRelicCount">0</b></span>' +
            '<span class="shop-resource"><span class="hud-resource-icon hud-resource-icon-potion">🧪</span><b id="shopPotionCount">0</b></span>' +
            '<span class="shop-resource"><span class="hud-resource-icon hud-resource-icon-gold" aria-hidden="true"></span><b id="shopGold">0</b></span>' +
            '<span class="shop-resource" style="display:none"><span class="hud-resource-icon hud-resource-icon-moon">🌙</span><b id="shopMoonShard">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="shop-stage-info">' +
        '<div class="shop-stage-title-main">상점</div>' +
        '<div class="shop-stage-title-sub">필요한 물품을 구매해 다음 전투를 준비하세요.</div>' +
      '</div>' +
      '<div class="shop-header-buttons">' +
        '<button type="button" class="shop-header-btn ui-asset-button ui-map-button" id="shopMapBtn"><span class="ico">🗺️</span><span>여정</span></button>' +
        '<button type="button" class="shop-header-btn ui-asset-button ui-codex-button" id="shopDeckBtn"><span class="ico">📖</span><span>보유주문</span></button>' +
        '<button type="button" class="shop-header-btn ui-asset-button ui-bag-button" id="shopBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="shop-header-btn ui-asset-button ui-settings-button" id="shopSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="shop-body">' +
      '<div class="shop-merchant">' +
        '<div class="shop-merchant-bubble" id="shopMerchantBubble"></div>' +
        '<div class="shop-merchant-npc"><img src="assets/characters/shop_npc.png" alt="상점 NPC"></div>' +
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
          '<button type="button" class="shop-tab" data-tab="card">주문</button>' +
          '<button type="button" class="shop-tab" data-tab="potion">약병</button>' +
          '<button type="button" class="shop-tab" data-tab="relic">법구</button>' +
        '</div>' +
        '<div class="shop-products" id="shopProducts"></div>' +
      '</div>' +
      '<div class="shop-detail" id="shopDetail"></div>' +
    '</div>' +
    '<div class="shop-footer">' +
      '<button type="button" class="shop-footer-btn" id="shopRefreshBtn">새로고침 <span class="shop-cost" id="shopRefreshCost"></span></button>' +
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

  renderPlayerPortraitIcon(shopOverlayEl.querySelector("#shopPortrait"));
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

function shopItemFramePath(item) {
  const rarity = String(item && item.rarity ? item.rarity : "common").toLowerCase();
  if (rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
  if (rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
  if (rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
  return "assets/ui_panels/relic_potion_frame_common.png";
}

function shopItemFaceHtml(item) {
  const safeItem = item || {};
  return '<div class="item-art-layer">' + shopItemArtHtml(safeItem) + '</div>' +
    '<img class="item-frame-layer" src="' + escapeShopHtml(shopItemFramePath(safeItem)) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="item-text-layer">' +
      '<div class="item-name-text">' + escapeShopHtml(safeItem.name || "") + '</div>' +
      '<div class="item-desc-text">' + colorizeRarityLabels(escapeShopHtml(safeItem.desc || "").replace(/\n/g, "<br>")) + '</div>' +
    '</div>' +
    '<div class="item-hit-layer" aria-hidden="true"></div>';
}

function shopProductCardHtml(item) {
  const selected = item.id === SHOP_STATE.selectedId;
  const typeCls  = item.category === "card" ? item.cardType : "";
  const priceHtml = '<div class="shop-card-price-badge">' + (item.soldOut ? "품절" : shopGoldCostHtml(getEffectiveShopPrice(item))) + '</div>';
  if (item.category === "card" && typeof cardFaceHtml === "function") {
    const card = CARD_DB[item.sourceKey];
    if (card) {
      return (
        '<button type="button" class="shop-product shop-product-card-frame' +
          (selected ? " selected" : "") + (item.soldOut ? " sold-out" : "") + '" data-id="' + escapeShopHtml(item.id) + '">' +
          '<div class="shop-card-visual card-frame-card cost-' + escapeShopHtml(card.type) + '">' + cardFaceHtml(card) + '</div>' +
          priceHtml +
        '</button>'
      );
    }
  }
  if (item.category === "potion" || item.category === "relic") {
    return (
      '<button type="button" class="shop-product shop-product-item-frame' +
        (selected ? " selected" : "") + (item.soldOut ? " sold-out" : "") + '" data-id="' + escapeShopHtml(item.id) + '">' +
        '<div class="shop-card-visual item-frame-card">' + shopItemFaceHtml(item) + '</div>' +
        priceHtml +
      '</button>'
    );
  }
  return (
    '<button type="button" class="shop-product' + (selected ? " selected" : "") + (item.soldOut ? " sold-out" : "") + '" data-id="' + item.id + '">' +
      '<div class="shop-product-name">' + escapeShopHtml(item.name) + '</div>' +
      '<div class="shop-product-art">' + shopItemArtHtml(item) + '</div>' +
      '<div class="shop-product-type type ' + typeCls + '">' + escapeShopHtml(shopItemTypeLabel(item)) + '</div>' +
      '<div class="shop-product-desc">' + colorizeRarityLabels(escapeShopHtml(item.desc || "").replace(/\n/g, "<br>")) + '</div>' +
      '<div class="shop-product-price">' + (item.soldOut ? "품절" : shopGoldCostHtml(getEffectiveShopPrice(item))) + '</div>' +
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
  const displayPrice = getEffectiveShopPrice(item);
  const goldShort   = !canAfford(displayPrice);
  const disabled    = item.soldOut || goldShort || potionFull || relicOwned;

  let buyLabel = "구매";
  if (item.soldOut) buyLabel = "품절";
  else if (relicOwned) buyLabel = "보유 중";
  else if (potionFull) buyLabel = "슬롯 가득 참";
  else if (goldShort) buyLabel = "골드 부족";

  const card = item.category === "card" && typeof cardFaceHtml === "function" ? CARD_DB[item.sourceKey] : null;
  const framedItem = !card && (item.category === "potion" || item.category === "relic");
  host.innerHTML = card
    ? (
      '<div class="shop-detail-card-preview card-frame-card cost-' + escapeShopHtml(card.type) + '">' +
        cardFaceHtml(card) +
      '</div>' +
      '<div class="shop-detail-price">' + (item.soldOut ? "" : shopGoldCostHtmlReversed(displayPrice)) + '</div>' +
      '<button type="button" class="shop-buy-btn" id="shopBuyBtn"' + (disabled ? " disabled" : "") + '>' + escapeShopHtml(buyLabel) + '</button>'
    )
    : framedItem
    ? (
      '<div class="shop-detail-item-preview item-frame-card">' +
        shopItemFaceHtml(item) +
      '</div>' +
      '<div class="shop-detail-price">' + (item.soldOut ? "" : shopGoldCostHtmlReversed(displayPrice)) + '</div>' +
      '<button type="button" class="shop-buy-btn" id="shopBuyBtn"' + (disabled ? " disabled" : "") + '>' + escapeShopHtml(buyLabel) + '</button>'
    )
    : (
      '<div class="shop-detail-name">' + escapeShopHtml(item.name) + '</div>' +
      '<div class="shop-detail-art">' + shopItemArtHtml(item) + '</div>' +
      '<div class="shop-detail-type type ' + typeCls + '">' + escapeShopHtml(shopItemTypeLabel(item)) + '</div>' +
      '<div class="shop-detail-desc">' + colorizeRarityLabels(escapeShopHtml(item.desc || "").replace(/\n/g, "<br>")) + '</div>' +
      '<div class="shop-detail-price">' + (item.soldOut ? "" : shopGoldCostHtmlReversed(displayPrice)) + '</div>' +
      '<button type="button" class="shop-buy-btn" id="shopBuyBtn"' + (disabled ? " disabled" : "") + '>' + escapeShopHtml(buyLabel) + '</button>'
    );

  const buyBtn = host.querySelector("#shopBuyBtn");
  if (buyBtn) buyBtn.addEventListener("click", buyCurrentItem);
}

function renderShopFooter() {
  const canRefresh = canAfford(SHOP_STATE.refreshCost);
  shopOverlayEl.querySelector("#shopRefreshBtn").disabled = !canRefresh;
  shopOverlayEl.querySelector("#shopRefreshCost").innerHTML = shopGoldCostHtml(SHOP_STATE.refreshCost);
}

function shopGoldCostHtml(value) {
  return '<span class="shop-price-icon hud-resource-icon hud-resource-icon-gold" aria-hidden="true"></span><span>' + escapeShopHtml(value) + '</span>';
}

function shopGoldCostHtmlReversed(value) {
  return '<span>' + escapeShopHtml(value) + '</span><span class="shop-price-icon hud-resource-icon hud-resource-icon-gold" aria-hidden="true"></span>';
}

function shopItemArtHtml(item) {
  if (item && item.iconImage) {
    return '<img src="' + escapeShopHtml(item.iconImage) + '" alt="" aria-hidden="true">';
  }
  return escapeShopHtml((item && item.emoji) || "");
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
      "background-image:radial-gradient(120% 70% at 50% 0%,rgba(255,241,214,.42) 0%,rgba(243,224,189,.28) 45%,rgba(70,45,28,.22) 100%)," +
        "linear-gradient(90deg,rgba(20,24,32,.12) 0%,rgba(20,24,32,.04) 45%,rgba(20,24,32,.34) 100%)," +
        "url(\"assets/node_background/shop.jpg\");background-size:cover,cover,cover;background-position:center,center,center;background-repeat:no-repeat,no-repeat,no-repeat;}" +
    ".shop-overlay.show{display:flex;}" +

    ".shop-header{flex:none;position:relative;height:12cqh;}" +
    ".shop-player-card{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;gap:1cqw;width:24cqw;min-width:30cqh;" +
      "background:linear-gradient(155deg,rgba(255,250,235,.94) 0%,rgba(240,221,181,.88) 100%);border:.16cqh solid rgba(178,140,80,.55);border-radius:1.5cqh;" +
      "padding:.8cqh 1.2cqw;box-shadow:0 .5cqh 1.1cqh rgba(90,65,25,.2),inset 0 0 0 .06cqh rgba(255,255,255,.55);backdrop-filter:none;color:var(--c-ink);font-size:2.2cqh;}" +
    ".shop-portrait{flex:none;width:7.6cqh;height:7.6cqh;border-radius:50%;display:grid;place-items:center;" +
      "font-size:4.2cqh;background:linear-gradient(160deg,#fff8e6,#f0dcb0);border:.18cqh solid #dba53f;box-shadow:0 0 .7cqh rgba(219,165,63,.5);overflow:hidden;}" +
    ".shop-portrait img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}" +
    ".shop-player-body{position:relative;z-index:1;flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:.4cqh;color:var(--c-ink);}" +
    ".shop-player-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--c-ink);line-height:1;}" +
    ".shop-player-name b{display:inline;font-size:2.3cqh;color:var(--c-ink);}" +
    ".shop-player-name span{display:none;}" +
    ".shop-hp-row{display:flex;align-items:center;gap:.8cqw;font-size:1.78cqh;font-weight:800;color:var(--c-ink);line-height:1;}" +
    ".shop-hp-row span:first-child{color:var(--c-red-deep);}" +
    ".shop-hp-bar{position:relative;width:min(13.6cqw,25cqh);height:1.65cqh;border-radius:.8cqh;overflow:hidden;background:rgba(80,38,38,.42);border:0;box-shadow:inset 0 0 0 .12cqh rgba(75,40,28,.35);}" +
    ".shop-hp-fill{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(180deg,#ff6f67 0%,#e33434 58%,#a6171f 100%);transition:width .35s ease;border-radius:.8cqh;}" +
    "#shopHpText{position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.32cqh;font-weight:900;line-height:1;text-shadow:0 .12cqh .25cqh rgba(80,20,20,.65);}" +
    ".shop-resource-row{display:flex;align-items:center;gap:.65cqw;font-size:1.45cqh;font-weight:900;color:var(--c-ink);transform:translateX(2cqw);width:calc(100% - 2cqw);line-height:1;}" +
    ".shop-resource{display:inline-flex;align-items:center;gap:.22cqw;color:var(--c-ink);font-size:1.45cqh;}" +
    ".shop-resource b{display:inline;color:var(--c-ink);font-size:1.45cqh;}" +
    ".shop-resource .hud-resource-icon{width:2.15cqh;height:2.15cqh;flex:none;display:inline-block;font-size:0;line-height:1;background-position:center;background-size:contain;background-repeat:no-repeat;}" +

    ".shop-stage-info{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:30cqw;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.3cqh;" +
      "padding:1cqh 3cqw;background:linear-gradient(155deg,rgba(255,250,235,.92) 0%,rgba(240,221,181,.85) 100%);" +
      "border:.16cqh solid rgba(178,140,80,.5);border-radius:1.4cqh;box-shadow:0 .4cqh 1cqh rgba(90,65,25,.18);backdrop-filter:none;font-size:2.52cqh;font-weight:900;color:#4a2f12;text-shadow:0 .07cqh 0 rgba(255,255,255,.55);}" +
    ".shop-stage-title-main{font-size:2.89cqh;font-weight:900;letter-spacing:0;line-height:1;}" +
    ".shop-stage-title-sub{font-size:1.41cqh;font-weight:800;color:#8a6b3d;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;}" +
    ".shop-title-badge{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "background:rgba(255,251,240,.85);border:.2cqh solid rgba(178,140,80,.45);border-radius:1.4cqh;" +
      "box-shadow:0 .4cqh 1cqh rgba(120,90,40,.18);}" +
    ".shop-title-main{font-size:2.6cqh;font-weight:900;letter-spacing:.25cqh;}" +
    ".shop-title-sub{font-size:1.2cqh;color:#8a6b3d;margin-top:.35cqh;font-weight:700;}" +

    ".shop-header-buttons{position:absolute;right:0;top:0;height:100%;display:flex;align-items:center;gap:.8cqw;}" +
    ".shop-header-btn{position:relative;width:8.2cqh;height:100%;display:flex;align-items:center;justify-content:center;" +
      "background-color:transparent;background-position:center;background-repeat:no-repeat;background-size:contain;border:0;border-radius:0;color:transparent;" +
      "cursor:pointer;font:inherit;font-size:0;padding:0;box-shadow:none;backdrop-filter:none;}" +
    ".shop-header-btn .ico{font-size:3.1cqh;line-height:1;}" +
    ".shop-header-btn span:last-child{display:none;}" +
    ".shop-header-btn:active{transform:scale(.94);}" +

    ".shop-body{flex:1;min-height:0;display:flex;justify-content:center;gap:1.4cqw;}" +

    ".shop-merchant{flex:none;width:21cqw;min-width:25cqh;position:relative;min-height:0;}" +
    ".shop-merchant-bubble{position:absolute;left:0;right:.8cqw;top:0;z-index:2;background:linear-gradient(155deg,rgba(255,250,235,.95) 0%,rgba(240,221,181,.9) 100%);border:.14cqh solid rgba(178,140,80,.5);border-radius:1.3cqh;" +
      "padding:1.7cqh 1.7cqw;font-size:1.2cqh;font-weight:800;color:#5b3710;text-align:center;text-shadow:0 .1cqh 0 rgba(255,255,255,.65);box-shadow:0 .35cqh .7cqh rgba(80,55,24,.15);}" +
    ".shop-merchant-npc{position:absolute;left:-8cqw;top:18cqh;z-index:1;width:48cqw;height:116cqh;display:flex;align-items:flex-start;justify-content:flex-start;" +
      "filter:drop-shadow(0 .7cqh 1.1cqh rgba(90,65,25,.28));pointer-events:none;}" +
    ".shop-merchant-npc img{display:block;width:auto;height:100%;max-width:none;object-fit:contain;object-position:left bottom;}" +
    ".shop-merchant-box{position:absolute;left:0;right:.8cqw;z-index:2;background:linear-gradient(155deg,rgba(255,250,235,.95) 0%,rgba(240,221,181,.9) 100%);border:.14cqh solid rgba(178,140,80,.5);border-radius:1.3cqh;padding:1.7cqh 1.7cqw;box-shadow:0 .35cqh .7cqh rgba(80,55,24,.15);}" +
    ".shop-merchant-box:nth-of-type(3){bottom:12.2cqh;}" +
    ".shop-merchant-box:nth-of-type(4){bottom:1.2cqh;}" +
    ".shop-box-title{font-size:1.2cqh;font-weight:900;color:#7a5521;margin-bottom:.3cqh;text-shadow:0 .1cqh 0 rgba(255,255,255,.65);}" +
    ".shop-box-desc{font-size:1.15cqh;font-weight:800;color:#5b3710;line-height:1.4;white-space:pre-line;}" +

    ".shop-main{flex:none;width:fit-content;align-self:flex-start;display:flex;flex-direction:column;gap:.6cqh;padding:1.5cqh 1.4cqw 1.5cqh;" +
      "background:linear-gradient(165deg,rgba(255,250,235,.92) 0%,rgba(240,221,181,.88) 100%);border:.18cqh solid rgba(178,140,80,.55);border-radius:1.5cqh;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(90,65,25,.22),inset 0 0 0 .08cqh rgba(255,255,255,.4);}" +
    ".shop-tabs{flex:none;display:flex;gap:.5cqw;padding:0 .2cqw;}" +
    ".shop-tab{flex:1;height:3.6cqh;border-radius:.9cqh;border:.13cqh solid rgba(178,140,80,.45);" +
      "background:linear-gradient(180deg,rgba(255,250,235,.85),rgba(235,215,175,.75));color:#7a5521;text-shadow:0 .1cqh 0 rgba(255,255,255,.5);font-size:1.35cqh;font-weight:900;cursor:pointer;font:inherit;transition:background .12s ease,color .12s ease,box-shadow .12s ease;}" +
    ".shop-tab:hover{background:linear-gradient(180deg,rgba(255,250,235,.95),rgba(240,222,182,.85));}" +
    ".shop-tab.active{background:linear-gradient(180deg,#fffaf0,#f0dcb0);color:#2f4f36;border-color:rgba(47,79,54,.35);box-shadow:inset 0 0 0 .1cqh rgba(47,79,54,.18);}" +
    ".shop-products{flex:none;display:grid;align-content:start;gap:.9cqw;padding:.9cqh .1cqw .1cqh;max-height:60cqh;overflow:auto;}" +

    ".shop-product{display:flex;flex-direction:column;align-items:center;gap:.5cqh;padding:1.1cqh .9cqw;" +
      "background:linear-gradient(165deg,rgba(255,255,255,.85),rgba(245,232,200,.8));" +
      "border:.15cqh solid rgba(178,140,80,.4);border-radius:1.1cqh;cursor:pointer;font:inherit;color:#4a3a24;" +
      "box-shadow:0 .3cqh .6cqh rgba(90,65,25,.12);transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;}" +
    ".shop-product:hover{transform:translateY(-.4cqh);border-color:rgba(178,140,80,.7);}" +
    ".shop-product.selected{border-color:#3f8fbf;box-shadow:0 0 0 .18cqh rgba(63,143,224,.45),0 .4cqh .8cqh rgba(90,65,25,.15);}" +
    ".shop-product.sold-out{opacity:.5;cursor:not-allowed;}" +
    ".shop-product.sold-out:hover{transform:none;}" +
    ".shop-product-name{font-size:1.35cqh;font-weight:900;text-align:center;}" +
    ".shop-product-art{width:100%;flex:1;min-height:8cqh;display:grid;place-items:center;font-size:4.4cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1cqh;border:.14cqh solid #d9bd85;}" +
    ".shop-product-art img,.shop-detail-art img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 .35cqh .55cqh rgba(80,55,24,.2));}" +
    ".shop-product-type{font-size:1.05cqh;font-weight:800;color:#fff;padding:.15cqh .8cqw;border-radius:.7cqh;background:#8a6b3d;}" +
    ".shop-product-desc{font-size:1.05cqh;font-weight:700;color:#6b4a20;text-align:center;line-height:1.3;min-height:3.2cqh;}" +
    ".shop-product-price{font-size:1.3cqh;font-weight:900;color:#a97a1f;}" +
    ".shop-product-price,.shop-detail-price,.shop-card-price-badge,.shop-cost{display:inline-flex;align-items:center;justify-content:center;gap:.25cqw;}" +
    ".shop-price-icon{width:2.3cqh;height:2.3cqh;flex:none;display:inline-block;font-size:0;line-height:1;background-position:center;background-size:contain;background-repeat:no-repeat;}" +
    ".shop-product.shop-product-card-frame,.shop-product.shop-product-item-frame{position:relative;display:flex;flex-direction:column;align-items:center;" +
      "justify-self:center;width:min(13.5cqw,22cqh);height:auto;min-height:0;padding:0;gap:1cqh;border:0;border-radius:0;background:transparent;}" +
    ".shop-card-visual{position:relative;width:100%;flex:none;transition:box-shadow .12s ease,filter .12s ease;}" +
    ".shop-product.shop-product-card-frame.selected .shop-card-visual,.shop-product.shop-product-item-frame.selected .shop-card-visual{" +
      "box-shadow:0 0 0 .28cqh rgba(63,143,224,.55),0 .5cqh 1cqh rgba(90,65,25,.14);}" +
    ".shop-card-price-badge{position:static;flex:none;padding:.4cqh 1cqw;border-radius:.8cqh;" +
      "background:rgba(255,251,240,.95);border:.16cqh solid rgba(178,140,80,.6);color:#a97a1f;font-size:2cqh;font-weight:900;box-shadow:0 .25cqh .6cqh rgba(90,65,25,.18);}" +

    ".shop-detail{flex:none;width:17cqw;min-width:22cqh;align-self:flex-start;display:flex;flex-direction:column;align-items:center;gap:.8cqh;" +
      "padding:2.1cqh 1.35cqw 1.8cqh;background:linear-gradient(165deg,rgba(255,250,235,.92) 0%,rgba(240,221,181,.88) 100%);border:.18cqh solid rgba(178,140,80,.55);border-radius:1.5cqh;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(90,65,25,.22),inset 0 0 0 .08cqh rgba(255,255,255,.4);}" +
    ".shop-detail-placeholder{margin:auto;min-height:20cqh;display:flex;align-items:center;justify-content:center;font-size:1.3cqh;font-weight:700;color:#8a6b3d;text-align:center;}" +
    ".shop-detail-name{font-size:1.7cqh;font-weight:900;text-align:center;}" +
    ".shop-detail-art{width:100%;min-height:14cqh;display:grid;place-items:center;font-size:7cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1.2cqh;border:.18cqh solid #d9bd85;}" +
    ".shop-detail-type{font-size:1.15cqh;font-weight:800;color:#fff;padding:.2cqh 1cqw;border-radius:.8cqh;background:#8a6b3d;}" +
    ".shop-detail-desc{font-size:1.2cqh;font-weight:700;color:#6b4a20;text-align:center;line-height:1.4;}" +
    ".shop-detail-price{font-size:2.1cqh;font-weight:900;color:#a97a1f;}" +
    ".shop-detail-card-preview{position:relative;width:min(14cqw,25cqh);height:auto;aspect-ratio:2/3;flex:none;}" +
    ".shop-detail-item-preview{position:relative;width:min(14cqw,25cqh);height:auto;aspect-ratio:2/3;flex:none;}" +
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
