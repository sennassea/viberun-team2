"use strict";
/* =========================================================================
   상점 노드 UI 레이어 — shopNode.js에서 분리된 DOM 렌더링/스타일.
   가격 계산, 재고 생성, 구매 로직은 shopNode.js에 남아있고 이 파일은
   그 결과(SHOP_STATE)를 화면에 그리기만 한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

/* ── 화면 이용 중 감춰둘 전투 화면 요소 (restNode.js와 동일 패턴) ───────── */
const SHOP_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];

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

function closeShopNode() {
  if (!shopOverlayEl) return;
  shopOverlayEl.classList.remove("show");
  shopOverlayEl.setAttribute("aria-hidden", "true");
  showShopChrome();
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
      '<div class="shop-panels">' +
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

    ".shop-stage-info{position:absolute;left:50%;top:0;transform:translateX(-50%);width:32cqw;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35cqh;" +
      "padding:.8cqh 4.2cqw;background:transparent url(\"assets/ui/stage_info_panel.png\") center/100% 100% no-repeat;" +
      "border:0;border-radius:0;box-shadow:none;backdrop-filter:none;font-size:2.52cqh;font-weight:900;color:#4a2f12;text-shadow:0 .07cqh 0 rgba(255,255,255,.55);}" +
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

    ".shop-merchant{flex:none;width:21cqw;min-width:25cqh;position:relative;z-index:2;min-height:0;}" +
    ".shop-merchant-bubble{position:absolute;left:0;right:.8cqw;top:0;z-index:2;" +
      "background:linear-gradient(155deg,#fffaf0 0%,#f6e6c2 50%,#ecd39d 100%);border:.15cqh solid #b07d1d;border-radius:1.3cqh;" +
      "padding:1.9cqh 1.8cqw;font-size:1.55cqh;font-weight:800;color:#5b3710;text-align:center;text-shadow:0 .1cqh 0 rgba(255,255,255,.65);" +
      "box-shadow:0 .4cqh .8cqh rgba(90,65,25,.22),inset 0 0 0 .09cqh rgba(255,255,255,.6),inset 0 0 0 .2cqh rgba(231,181,74,.35);}" +
    ".shop-merchant-npc{position:absolute;left:-8cqw;top:18cqh;z-index:1;width:43cqw;height:105cqh;display:flex;align-items:flex-start;justify-content:flex-start;" +
      "filter:drop-shadow(0 .7cqh 1.1cqh rgba(90,65,25,.28));pointer-events:none;}" +
    ".shop-merchant-npc img{display:block;width:auto;height:100%;max-width:none;object-fit:contain;object-position:left bottom;}" +
    ".shop-merchant-box{position:absolute;left:0;right:.8cqw;z-index:2;background:linear-gradient(155deg,#fffaf0 0%,#f6e6c2 50%,#ecd39d 100%);border:.15cqh solid #b07d1d;border-radius:1.3cqh;padding:1.9cqh 1.8cqw;" +
      "box-shadow:0 .4cqh .8cqh rgba(90,65,25,.22),inset 0 0 0 .09cqh rgba(255,255,255,.6),inset 0 0 0 .2cqh rgba(231,181,74,.35);}" +
    ".shop-merchant-box:nth-of-type(3){bottom:15.4cqh;}" +
    ".shop-merchant-box:nth-of-type(4){bottom:1.2cqh;}" +
    ".shop-box-title{font-size:1.55cqh;font-weight:900;color:#7a5521;margin-bottom:.35cqh;text-shadow:0 .1cqh 0 rgba(255,255,255,.65);}" +
    ".shop-box-desc{font-size:1.45cqh;font-weight:800;color:#5b3710;line-height:1.4;white-space:pre-line;}" +

    ".shop-panels{flex:none;position:relative;z-index:1;align-self:center;display:flex;align-items:stretch;justify-content:space-between;gap:1.4cqw;" +
      "width:calc(7.1cqw + (4 * min(13.5cqw,22cqh)) + max(17cqw,22cqh));}" +
    ".shop-main{flex:none;width:calc(5.7cqw + (4 * min(13.5cqw,22cqh)));display:flex;flex-direction:column;gap:.6cqh;padding:1.5cqh 1.4cqw 2.2cqh;" +
      "background:linear-gradient(165deg,#fffaf0 0%,#f3dfb3 45%,#e8cb92 100%);border:.2cqh solid #b07d1d;border-radius:1.5cqh;" +
      "box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.28),inset 0 0 0 .1cqh rgba(255,255,255,.55),inset 0 0 0 .24cqh rgba(231,181,74,.28);}" +
    ".shop-tabs{flex:1;min-height:3.6cqh;display:flex;align-items:center;gap:.5cqw;padding:0 .2cqw;}" +
    ".shop-tab{flex:1;align-self:center;height:6cqh;display:flex;align-items:center;justify-content:center;border-radius:.9cqh;border:.14cqh solid rgba(178,140,80,.5);" +
      "background:linear-gradient(180deg,#fff8ea 0%,#f0e0bd 100%);color:#8a6b3d;text-shadow:0 .1cqh 0 rgba(255,255,255,.6);font-size:1.3cqh;font-weight:900;cursor:pointer;font:inherit;" +
      "box-shadow:0 .25cqh .5cqh rgba(120,90,40,.14);transition:background .15s ease,color .15s ease,box-shadow .15s ease,transform .15s ease;}" +
    ".shop-tab:hover{background:linear-gradient(180deg,#fffcf3 0%,#f6e8c9 100%);}" +
    ".shop-tab.active{background:linear-gradient(180deg,#ffe6a8 0%,#e7b54a 100%);border-color:#b07d1d;color:#5b3a12;" +
      "box-shadow:0 .35cqh .9cqh rgba(176,125,29,.4),inset 0 0 0 .12cqh #fff6df;transform:translateY(-.15cqh);}" +
    ".shop-products{flex:none;display:grid;align-content:start;gap:.9cqw;padding:.9cqh .1cqw .1cqh;max-height:60cqh;overflow-x:hidden;overflow-y:auto;}" +

    ".shop-product{display:flex;flex-direction:column;align-items:center;gap:.5cqh;padding:1.1cqh .9cqw;" +
      "background:linear-gradient(165deg,rgba(255,255,255,.85),rgba(245,232,200,.8));" +
      "border:.15cqh solid rgba(178,140,80,.4);border-radius:1.1cqh;cursor:pointer;font:inherit;color:#4a3a24;" +
      "box-shadow:0 .3cqh .6cqh rgba(90,65,25,.12);transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;}" +
    ".shop-product:hover{transform:translateY(-.4cqh);border-color:rgba(178,140,80,.7);}" +
    ".shop-product.selected:not(.shop-product-card-frame):not(.shop-product-item-frame){border-color:#3f8fbf;box-shadow:0 0 0 .18cqh rgba(63,143,224,.45),0 .4cqh .8cqh rgba(90,65,25,.15);}" +
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
      "justify-self:center;width:min(13.5cqw,22cqh);height:auto;min-height:0;padding:0;gap:1cqh;border:0;border-radius:0;background:transparent;box-shadow:none;}" +
    ".shop-card-visual{position:relative;width:100%;flex:none;transition:box-shadow .12s ease,filter .12s ease;}" +
    ".shop-product.shop-product-card-frame.selected .shop-card-visual,.shop-product.shop-product-item-frame.selected .shop-card-visual{" +
      "box-shadow:0 0 0 .28cqh rgba(63,143,224,.55),0 .5cqh 1cqh rgba(90,65,25,.14);}" +
    ".shop-card-price-badge{position:static;flex:none;padding:.4cqh 1cqw;border-radius:.8cqh;" +
      "background:rgba(255,251,240,.95);border:.16cqh solid rgba(178,140,80,.6);color:#a97a1f;font-size:2cqh;font-weight:900;}" +

    ".shop-detail{flex:none;width:17cqw;min-width:22cqh;display:flex;flex-direction:column;align-items:center;gap:.8cqh;" +
      "padding:2.1cqh 1.35cqw 2.5cqh;background:linear-gradient(165deg,#fffaf0 0%,#f3dfb3 45%,#e8cb92 100%);border:.2cqh solid #b07d1d;border-radius:1.5cqh;" +
      "box-shadow:0 .8cqh 1.6cqh rgba(90,65,25,.28),inset 0 0 0 .1cqh rgba(255,255,255,.55),inset 0 0 0 .24cqh rgba(231,181,74,.28);}" +
    ".shop-detail-placeholder{margin:auto;min-height:20cqh;display:flex;align-items:center;justify-content:center;font-size:1.3cqh;font-weight:700;color:#8a6b3d;text-align:center;}" +
    ".shop-detail-name{font-size:1.7cqh;font-weight:900;text-align:center;}" +
    ".shop-detail-art{width:100%;min-height:14cqh;display:grid;place-items:center;font-size:7cqh;" +
      "background:linear-gradient(160deg,#fff8e6,#f0dcb0);border-radius:1.2cqh;border:.18cqh solid #d9bd85;}" +
    ".shop-detail-type{font-size:1.15cqh;font-weight:800;color:#fff;padding:.2cqh 1cqw;border-radius:.8cqh;background:#8a6b3d;}" +
    ".shop-detail-desc{font-size:1.2cqh;font-weight:700;color:#6b4a20;text-align:center;line-height:1.4;}" +
    ".shop-detail-price{font-size:2.1cqh;font-weight:900;color:#a97a1f;}" +
    ".shop-detail-card-preview{position:relative;width:min(14cqw,25cqh);height:auto;aspect-ratio:2/3;flex:none;}" +
    ".shop-detail-item-preview{position:relative;width:min(14cqw,25cqh);height:auto;aspect-ratio:2/3;flex:none;}" +
    ".shop-buy-btn{width:100%;height:5cqh;border-radius:1.1cqh;font-size:.8cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.2cqh solid #2f7a4e;background:linear-gradient(180deg,#9adca6 0%,#4bb07a 52%,#2f8a5c 100%);color:#fff;text-shadow:0 .12cqh 0 rgba(20,60,35,.4);-webkit-text-stroke:.03em currentColor;margin-top:auto;" +
      "box-shadow:inset 0 .12cqh 0 rgba(255,255,255,.55),inset 0 -.25cqh .4cqh rgba(20,60,35,.28),0 .35cqh .7cqh rgba(40,70,45,.32);transition:filter .12s ease,transform .12s ease;}" +
    ".shop-buy-btn:hover:not(:disabled){filter:brightness(1.05);}" +
    ".shop-buy-btn:active:not(:disabled){transform:scale(.97);}" +
    ".shop-buy-btn:disabled{filter:grayscale(.5) brightness(.92);cursor:default;}" +

    ".shop-footer{flex:none;display:flex;justify-content:flex-end;gap:1cqw;}" +
    ".shop-footer-btn{min-width:14cqw;height:5.4cqh;border-radius:1.2cqh;font-size:.75cqh;font-weight:900;cursor:pointer;" +
      "font:inherit;border:.2cqh solid #b07d1d;background:linear-gradient(180deg,#fffaf0 0%,#f3dfb0 52%,#e2c184 100%);color:#6b4a20;-webkit-text-stroke:.03em currentColor;" +
      "box-shadow:inset 0 .1cqh 0 rgba(255,255,255,.75),inset 0 -.2cqh .35cqh rgba(140,100,40,.25),0 .3cqh .6cqh rgba(90,65,25,.25);transition:filter .12s ease,transform .12s ease;}" +
    ".shop-footer-btn:hover:not(:disabled){filter:brightness(1.04);}" +
    ".shop-footer-btn:active:not(:disabled){transform:scale(.97);}" +
    ".shop-footer-btn:disabled{opacity:.5;cursor:default;}" +
    ".shop-cost{margin-left:.4cqw;font-size:1.9cqh;}" +
    ".shop-cost .shop-price-icon{width:2.6cqh;height:2.6cqh;}" +
    ".shop-exit-btn{background:linear-gradient(180deg,#f2ac9c 0%,#d97a63 52%,#b85a45 100%);color:#fff;text-shadow:0 .12cqh 0 rgba(90,30,20,.35);border-color:#8a3d2c;" +
      "box-shadow:inset 0 .1cqh 0 rgba(255,255,255,.5),inset 0 -.2cqh .35cqh rgba(90,30,20,.3),0 .3cqh .6cqh rgba(90,40,25,.3);}";
  document.head.appendChild(style);
}
