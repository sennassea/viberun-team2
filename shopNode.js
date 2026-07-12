"use strict";
/* =========================================================================
   상점 노드 로직 (shopNode.js)
   기획서: 상점 UI 구현 기획서 - 최신 코드 반영본 (주문 / 약병 / 법구 판매 탭)

   가격 계산, 재고 생성, 구매/새로고침 처리, 노드 진입 흐름을 담당한다.
   화면 렌더링(오버레이 DOM, 스타일)은 shopNodeUI.js로 분리되어 있으며
   이 파일은 함수 이름으로만 그 UI 함수들을 호출한다(같은 전역 스코프).
   유니티 이식 시 이 파일의 가격/재고/구매 로직은 C#으로 그대로 옮길 수 있다.

   이 파일은 mapSystem.js / mapNodeLogic.js / mapUI.js / restNode.js / script.js /
   cardData.js / bagUI.js 이후에 로드되어야 합니다. 기존 코드를 직접 수정하지
   않고, startStage()를 감싸(wrap) shop 타입 노드 진입 시 상점 화면을 띄웁니다.
   (restNode.js가 mapSystem.js의 startStage를 재정의한 것과 동일한 방식이지만,
   여기서는 기존 startStage를 완전히 덮어쓰지 않고 wrapping하여 기도터 처리도
   그대로 보존합니다.)
   ========================================================================= */

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
