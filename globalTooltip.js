"use strict";

(function () {
  const SELECTOR = "[data-tooltip], [data-global-tooltip], [data-tooltip-title]";
  const SKIN_OPTION_SELECTOR = ".menu-profile-popup .menu-profile-option";
  const SPIRIT_PATH_CARD_PREVIEW_SELECTOR = ".spirit-path-preview-item";
  const RANDOM_ITEM_RESULT_CARD_SELECTOR = ".random-item-result-card";
  /* 상점 상품 카드(주문 카드형은 tooltip.js가 별도 처리하므로 제외) */
  const SHOP_PRODUCT_SELECTOR = ".shop-product:not(.shop-product-card-frame)";
  const SHOP_DETAIL_SELECTOR = "#shopDetail";
  /* 월영당(BM 스토어) 스킨 프리뷰 대상: 스킨 탭 카드 + 추천 탭의 마법무녀 스킨(한정) 카드.
     추천 탭의 다른 카드에는 툴팁을 붙이지 않는다. 주문 팩(.bm-store-product)은
     덱 프리뷰 패널 전용 로직(하단)에서 별도로 처리하므로 여기 포함하지 않는다 */
  const BM_SKIN_CARD_SELECTOR = ".bm-store-skin-card, .bm-recommended-wide-card, .bm-recommended-small-card";
  const GAP = 10;
  let tooltipEl = null;
  let activeAnchor = null;
  let hideTimer = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.id = "globalTooltip";
    tooltipEl.className = "global-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function findAnchor(target) {
    if (!target || typeof target.closest !== "function") return null;
    const anchor = target.closest(SELECTOR) || target.closest(SKIN_OPTION_SELECTOR) || target.closest(SPIRIT_PATH_CARD_PREVIEW_SELECTOR) ||
      target.closest(RANDOM_ITEM_RESULT_CARD_SELECTOR) || target.closest(SHOP_PRODUCT_SELECTOR) || target.closest(SHOP_DETAIL_SELECTOR) ||
      target.closest(BM_SKIN_CARD_SELECTOR);
    if (!anchor || anchor.dataset.tooltipDisabled === "true") return null;
    return anchor;
  }

  function getCardDbEntryByName(name) {
    if (!name || typeof CARD_DB !== "object" || !CARD_DB) return null;
    const key = Object.keys(CARD_DB).find(k => CARD_DB[k] && CARD_DB[k].name === name);
    return key ? CARD_DB[key] : null;
  }

  function getRelicOrPotionDbEntryByName(name) {
    if (!name) return null;
    const relicDb = typeof RELIC_DB !== "undefined" && Array.isArray(RELIC_DB) ? RELIC_DB : null;
    const potionDb = typeof POTION_DB !== "undefined" && Array.isArray(POTION_DB) ? POTION_DB : null;
    const relic = relicDb && relicDb.find(item => item && item.name === name);
    if (relic) return relic;
    return potionDb && potionDb.find(item => item && item.name === name) || null;
  }

  function getItemDataByDisplayedName(anchor) {
    const nameEl = anchor.querySelector(".random-item-result-name, .card-name-text, .shop-product-name, .shop-detail-name");
    const name = nameEl ? nameEl.textContent.trim() : "";
    if (!name) return null;

    const card = getCardDbEntryByName(name);
    if (card) {
      const icon = card.emoji ? " " + card.emoji : "";
      return { title: card.name + icon, body: card.desc || "" };
    }

    const item = getRelicOrPotionDbEntryByName(name);
    if (item) {
      const icon = item.emoji ? " " + item.emoji : "";
      return { title: item.name + icon, body: item.desc || "" };
    }

    return null;
  }

  /* 월영당 상품(BM 스토어) 데이터 조회 헬퍼. 카드 DOM은 카드 종류별로 마크업이 달라
     이미지/설명이 누락된 경우가 있어(예: 추천 탭 소형 카드는 큰 프리뷰 이미지 대신 프로필
     아이콘만 표시), data-product-id로 window.VIBERUN_BM_STORE_SERVICE의 원본 상품 데이터를
     읽기 전용으로 조회해 항상 완전한 이름/설명/이미지를 사용한다 */
  function findBmStoreProductById(productId) {
    if (!productId) return null;
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if (!service || typeof service.getProductsByTab !== "function") return null;
    const tabs = ["recommended", "package", "order_pack", "moon_charge"];
    for (let i = 0; i < tabs.length; i++) {
      const products = service.getProductsByTab(tabs[i]) || [];
      const found = products.find(p => p && p.id === productId);
      if (found) return found;
    }
    return null;
  }

  function getBmCardProductId(anchor) {
    const btn = anchor.querySelector(".bm-store-buy-btn");
    return btn && btn.dataset ? btn.dataset.productId : "";
  }

  /* 월영당 스킨 프리뷰 툴팁 데이터. 스킨 탭 카드/추천 탭의 마법무녀 스킨(한정)/월영학당
     전학생(프리미엄) 카드가 모두 대상이며, 상품 데이터를 그대로 써서 항상 스킨 탭과
     동일한 전신 프리뷰 이미지를 보여준다. 설명에 판매 기간 문구가 있으면 별도 줄로 내린다 */
  function getBmSkinCardData(anchor) {
    const product = findBmStoreProductById(getBmCardProductId(anchor));
    if (!product || product.rewardType !== "character_skin") return null;

    let desc = product.description || "";
    desc = desc.replace(/\s*(판매\s*기간\s*:)/, "\n$1");

    return {
      isBmPreview: true,
      title: product.name || "",
      grade: product.gradeLabel || product.badge || "",
      body: [product.skinTypeName || "", desc].filter(Boolean).join("\n"),
      imageSrc: product.previewImage || ""
    };
  }

  function getTooltipData(anchor) {
    const title = anchor.dataset.tooltipTitle || "";
    const body = anchor.dataset.tooltip || anchor.dataset.globalTooltip || "";
    if (title || body) return { title, body };

    if (anchor.classList && (anchor.classList.contains("bm-store-skin-card") ||
      anchor.classList.contains("bm-recommended-wide-card") || anchor.classList.contains("bm-recommended-small-card"))) {
      return getBmSkinCardData(anchor);
    }

    if (anchor.classList && anchor.classList.contains("menu-profile-option") && anchor.closest(".menu-profile-popup")) {
      return { title: "프로필", body: "보유 스킨에 따라 프로필 사진을 변경할 수 있습니다." };
    }

    if (anchor.classList && anchor.classList.contains("spirit-path-preview-item")) {
      if (!anchor.dataset.spiritPathCardName) {
        const rawName = anchor.getAttribute("title");
        if (rawName) anchor.dataset.spiritPathCardName = rawName;
      }
      const card = getCardDbEntryByName(anchor.dataset.spiritPathCardName);
      if (!card) return null;
      const icon = card.emoji ? " " + card.emoji : "";
      return { title: (card.name || "") + icon, body: card.desc || "" };
    }

    if (anchor.classList && anchor.classList.contains("random-item-result-card")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.classList && anchor.classList.contains("shop-product")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.id === "shopDetail" && !anchor.querySelector(".shop-detail-card-preview")) {
      return getItemDataByDisplayedName(anchor);
    }

    return null;
  }

  function buildHtml(data) {
    if (data.isBmPreview) return buildBmPreviewHtml(data);
    const title = data.title
      ? '<span class="global-tooltip-title">' + escapeHtml(data.title) + "</span>"
      : "";
    const body = data.body
      ? '<span class="global-tooltip-body">' + colorizeRarityLabels(escapeHtml(data.body)) + "</span>"
      : "";
    return title + body;
  }

  function buildBmPreviewHtml(data) {
    const imgHtml = data.imageSrc
      ? '<img class="global-tooltip-preview-img" src="' + escapeHtml(data.imageSrc) + '" alt="" onerror="this.remove()">'
      : "";
    const title = '<span class="global-tooltip-title">' + escapeHtml(data.title) +
      (data.grade ? " · " + escapeHtml(data.grade) : "") + "</span>";
    const body = data.body
      ? '<span class="global-tooltip-body">' + escapeHtml(data.body) + "</span>"
      : "";
    return imgHtml + title + body;
  }

  function getOpenProfileSkinPopup(anchor) {
    let popup = null;
    if (anchor.classList && anchor.classList.contains("menu-profile-avatar-btn")) {
      const profileRoot = anchor.closest(".menu-profile");
      popup = profileRoot ? profileRoot.querySelector(".menu-profile-popup") : null;
    } else {
      popup = anchor.closest(".menu-profile-popup");
    }
    if (!popup || popup.hidden) return null;
    return popup;
  }

  const LEFT_SIDE_SELECTOR = ".start-mailbox-button";

  function positionTooltip(anchor) {
    const tip = ensureTooltip();
    const tipRect = tip.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const openPopup = getOpenProfileSkinPopup(anchor);
    const monthlyPassCard = anchor.closest ? anchor.closest(".monthly-pass-claim-card") : null;
    const leftSideTarget = !openPopup && !monthlyPassCard && anchor.closest
      ? anchor.closest(LEFT_SIDE_SELECTOR)
      : null;
    const randomItemResultCard = !openPopup && !monthlyPassCard && !leftSideTarget && anchor.closest
      ? anchor.closest(".random-item-result-card")
      : null;
    const bmSkinCard = !openPopup && !monthlyPassCard && !leftSideTarget && !randomItemResultCard && anchor.closest
      ? anchor.closest(".bm-store-skin-card, .bm-recommended-wide-card")
      : null;
    /* 추천 탭 소형 카드(월영학당 전학생 등)는 화면 오른쪽 여백이 좁아 항상 카드 왼쪽에 띄운다 */
    const bmSmallSkinCard = !openPopup && !monthlyPassCard && !leftSideTarget && !randomItemResultCard && !bmSkinCard && anchor.closest
      ? anchor.closest(".bm-recommended-small-card")
      : null;
    let left;
    let top;

    if (openPopup) {
      const popupRect = openPopup.getBoundingClientRect();
      left = popupRect.right + GAP;
      top = popupRect.top + (popupRect.height - tipRect.height) / 2;
    } else if (monthlyPassCard) {
      const cardRect = monthlyPassCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (leftSideTarget) {
      const targetRect = leftSideTarget.getBoundingClientRect();
      left = targetRect.left - tipRect.width - GAP;
      top = targetRect.top + (targetRect.height - tipRect.height) / 2;
    } else if (randomItemResultCard) {
      const cardRect = randomItemResultCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      if (left + tipRect.width > vw - GAP) {
        left = cardRect.left - tipRect.width - GAP;
      }
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (bmSkinCard) {
      const cardRect = bmSkinCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      if (left + tipRect.width > vw - GAP) {
        left = cardRect.left - tipRect.width - GAP;
      }
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (bmSmallSkinCard) {
      const cardRect = bmSmallSkinCard.getBoundingClientRect();
      left = cardRect.left - tipRect.width - GAP;
      if (left < GAP) {
        left = cardRect.right + GAP;
      }
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else {
      const anchorRect = anchor.getBoundingClientRect();
      left = anchorRect.left + (anchorRect.width - tipRect.width) / 2;
      top = anchorRect.bottom + GAP;

      if (top + tipRect.height > vh - GAP) {
        top = anchorRect.top - tipRect.height - GAP;
      }
    }

    left = Math.max(GAP, Math.min(left, vw - tipRect.width - GAP));
    top = Math.max(GAP, Math.min(top, vh - tipRect.height - GAP));

    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function suppressNativeTooltip(anchor) {
    if (anchor.hasAttribute("title")) {
      anchor.removeAttribute("title");
    }
  }

  function show(anchor) {
    const data = getTooltipData(anchor);
    if (!data) return;
    suppressNativeTooltip(anchor);
    window.clearTimeout(hideTimer);
    activeAnchor = anchor;
    const tip = ensureTooltip();
    tip.innerHTML = buildHtml(data);
    tip.classList.toggle("is-preview", !!data.isBmPreview);
    tip.classList.add("is-show");
    positionTooltip(anchor);
  }

  function hide() {
    activeAnchor = null;
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-show");
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 60);
  }

  function refresh() {
    if (activeAnchor && tooltipEl && tooltipEl.classList.contains("is-show")) {
      positionTooltip(activeAnchor);
    }
  }

  document.addEventListener("pointerover", event => {
    const nameEl = event.target && typeof event.target.closest === "function"
      ? event.target.closest(".menu-profile-name")
      : null;
    if (nameEl) suppressNativeTooltip(nameEl);

    const anchor = findAnchor(event.target);
    if (!anchor || anchor === activeAnchor) return;
    show(anchor);
  });

  document.addEventListener("pointerout", event => {
    if (!activeAnchor) return;
    const next = event.relatedTarget;
    if (next && activeAnchor.contains(next)) return;
    scheduleHide();
  });

  document.addEventListener("focusin", event => {
    const anchor = findAnchor(event.target);
    if (anchor) show(anchor);
  });

  document.addEventListener("focusout", event => {
    if (activeAnchor && activeAnchor.contains(event.target)) scheduleHide();
  });

  document.addEventListener("pointerdown", event => {
    const avatarBtn = event.target && typeof event.target.closest === "function"
      ? event.target.closest(".menu-profile-avatar-btn")
      : null;
    if (avatarBtn) {
      hide();
      return;
    }

    const anchor = findAnchor(event.target);
    if (anchor) show(anchor);
    else hide();
  }, true);

  document.addEventListener("scroll", refresh, true);
  window.addEventListener("resize", refresh);
  window.addEventListener("blur", hide);

  function applyStartMenuProfileTooltips() {
    const avatarBtn = document.querySelector(".menu-profile-avatar-btn");
    if (avatarBtn) {
      avatarBtn.dataset.tooltipTitle = "프로필";
      avatarBtn.dataset.tooltip = "보유 스킨에 따라 프로필 사진을 변경할 수 있습니다.";
    }

    const monthlyPassCard = document.querySelector(".monthly-pass-claim-card");
    if (monthlyPassCard) {
      monthlyPassCard.dataset.tooltipTitle = "월영의 약속";
      monthlyPassCard.dataset.tooltip = "매일 보상을 확인하고 받을 수 있는 월간 보상 영역입니다.";
    }

    const codexBtn = document.querySelector(".start-codex-button");
    if (codexBtn) {
      codexBtn.dataset.tooltipTitle = "도감";
      codexBtn.dataset.tooltip = "게임 내 모든 주문, 법구, 약병 정보를 확인할 수 있습니다.";
    }

    const recordBtn = document.querySelector(".start-record-button");
    if (recordBtn) {
      recordBtn.dataset.tooltipTitle = "기록";
      recordBtn.dataset.tooltip = "플레이 기록과 진행 내역을 확인할 수 있습니다.";
    }

    const moonWallet = document.querySelector(".start-moon-wallet");
    if (moonWallet) {
      moonWallet.dataset.tooltipTitle = "달빛 조각";
      moonWallet.dataset.tooltip = "희귀 보상과 특별한 보물함을 여는 데 사용하는 유료 재화입니다.";
    }

    const mailboxBtn = document.querySelector(".start-mailbox-button");
    if (mailboxBtn) {
      mailboxBtn.dataset.tooltipTitle = "선물함";
      mailboxBtn.dataset.tooltip = "지급된 보상과 선물을 확인하고 받을 수 있는 공간입니다.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStartMenuProfileTooltips);
  } else {
    applyStartMenuProfileTooltips();
  }

  /* ── 월영당 달빛 조각 툴팁 ─────────────────────────────────────────────
     #bmStoreOverlay는 최초 open() 시 1회만 생성되어 재사용되므로, 생성되는
     순간을 MutationObserver로 감지해 1회만 dataset을 부여한다. 4개 탭 공통 헤더라
     탭 전환과 무관하게 항상 표시된다 */
  function applyBmStoreWalletTooltip() {
    const wallet = document.querySelector(".bm-store-wallet");
    if (!wallet || wallet.dataset.tooltipTitle) return;
    wallet.dataset.tooltipTitle = "달빛 조각";
    wallet.dataset.tooltip = "월영당에서 특별한 인연과 물품을 얻는 데 사용하는 재화입니다.";
  }

  new MutationObserver(applyBmStoreWalletTooltip)
    .observe(document.body, { childList: true, subtree: true });
  applyBmStoreWalletTooltip();

  /* ══════════════════════════════════════════════════════════════════════
     월영당 덱 포함 카드 프리뷰 패널 (주문 팩 탭 + 추천 탭의 한풀이 덱 소형 카드)
     - .bm-store-product(주문 팩 카드) / .bm-recommended-small-card(추천 탭 한풀이 덱)
       hover/click 시 패널을 띄운다. 두 selector가 겹치는 소형 카드 중 deck_pack이
       아닌 상품(스킨/충전 등)은 findDeckPackProduct가 null을 반환해 조용히 무시된다.
     - 한풀이 덱은 카드 오른쪽, 굿판 덱은 카드 왼쪽에 고정 배치한다.
     - 클릭으로 열면 pinned 상태가 되어 바깥 클릭 또는 다른 상품 hover 전까지 유지된다.
     - CARD_DB는 읽기 전용으로만 참조하며 수정하지 않는다.
     ══════════════════════════════════════════════════════════════════════ */
  const DECK_PREVIEW_CARD_SELECTOR = ".bm-store-product, .bm-recommended-small-card";
  let deckPreviewEl = null;
  let deckPreviewAnchor = null;
  let deckPreviewPinned = false;
  let deckHideTimer = null;

  function ensureDeckPreview() {
    if (deckPreviewEl) return deckPreviewEl;
    deckPreviewEl = document.createElement("div");
    deckPreviewEl.id = "bmDeckPreviewPanel";
    deckPreviewEl.className = "bm-deck-preview-panel";
    document.body.appendChild(deckPreviewEl);
    return deckPreviewEl;
  }

  function findDeckPackProduct(card) {
    const product = findBmStoreProductById(getBmCardProductId(card));
    return product && product.rewardType === "deck_pack" ? product : null;
  }

  function getDeckCards(unlockKeyword) {
    if (!unlockKeyword || typeof CARD_DB !== "object" || !CARD_DB) return [];
    return Object.keys(CARD_DB)
      .map(key => CARD_DB[key])
      .filter(card => card && card.attr === unlockKeyword);
  }

  /* deckViewer.js의 카드 프레임 경로 규칙(assets/card_frames/card-frame-{type}-{rarity}.png)을
     그대로 참고해 실제 카드 에셋(프레임 + 원화/이모지)으로 미니 카드를 렌더링한다.
     CARD_DB는 읽기 전용으로만 참조한다 */
  function getDeckCardFramePath(card) {
    if (card && card.type === "status") return "assets/card_frames/card-frame-status.png";
    const type = card && ["attack", "defense", "skill"].includes(card.type) ? card.type : "skill";
    const rarity = card && card.rarity ? card.rarity : "common";
    return "assets/card_frames/card-frame-" + type + "-" + rarity + ".png";
  }

  /* 카드 프레임 PNG 위에 비용/이름/설명 텍스트를 겹쳐 그린다. 위치(%)는 deckViewer.js의
     card-cost-text/card-name-text/card-desc-text와 동일한 비율이며, 폰트 크기는
     시각 영역 자체를 기준 컨테이너로 잡아(container-type:size) 카드 크기와 무관하게
     항상 같은 비율로 보이도록 한다 */
  function buildDeckPreviewCardHtml(card) {
    const visualHtml = card.art
      ? '<img class="bm-deck-preview-card-art" src="' + escapeHtml(card.art) + '" alt="" onerror="this.remove()">'
      : '<span class="bm-deck-preview-card-emoji">' + escapeHtml(card.emoji || "🃏") + "</span>";
    return (
      '<div class="bm-deck-preview-card">' +
        '<div class="bm-deck-preview-card-visual">' +
          visualHtml +
          '<img class="bm-deck-preview-card-frame" src="' + escapeHtml(getDeckCardFramePath(card)) + '" alt="" onerror="this.style.display=&quot;none&quot;">' +
          '<div class="bm-deck-preview-card-cost">' + escapeHtml(card.cost != null ? card.cost : "") + "</div>" +
          '<div class="bm-deck-preview-card-title">' + escapeHtml(card.name || "") + "</div>" +
          '<div class="bm-deck-preview-card-desc">' + escapeHtml(card.desc || "") + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function buildDeckPreviewHtml(product, cards) {
    const title = '<div class="bm-deck-preview-title">' + escapeHtml(product.name) + "</div>";
    const desc = product.description
      ? '<div class="bm-deck-preview-desc">' + escapeHtml(product.description) + "</div>"
      : "";
    if (!cards.length) {
      return title + desc + '<div class="bm-deck-preview-empty">포함 카드 정보를 불러올 수 없습니다.</div>';
    }
    const grid = '<div class="bm-deck-preview-grid">' +
      cards.map(buildDeckPreviewCardHtml).join("") +
      "</div>";
    return title + desc + grid;
  }

  function positionDeckPreview(card, side) {
    const panel = ensureDeckPreview();
    const cardRect = card.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    let left = side === "left" ? cardRect.left - panelRect.width - GAP : cardRect.right + GAP;
    if (side === "right" && left + panelRect.width > vw - GAP) left = cardRect.left - panelRect.width - GAP;
    if (side === "left" && left < GAP) left = cardRect.right + GAP;

    let top = cardRect.top + (cardRect.height - panelRect.height) / 2;
    left = Math.max(GAP, Math.min(left, vw - panelRect.width - GAP));
    top = Math.max(GAP, Math.min(top, vh - panelRect.height - GAP));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function showDeckPreview(card) {
    const product = findDeckPackProduct(card);
    if (!product) return;
    const cards = getDeckCards(product.unlockKeyword);
    const panel = ensureDeckPreview();
    panel.innerHTML = buildDeckPreviewHtml(product, cards);
    panel.classList.add("is-show");
    deckPreviewAnchor = card;
    positionDeckPreview(card, product.deckPackId === "gutpan" ? "left" : "right");
  }

  function hideDeckPreview() {
    deckPreviewAnchor = null;
    deckPreviewPinned = false;
    if (deckPreviewEl) deckPreviewEl.classList.remove("is-show");
  }

  function scheduleHideDeckPreview() {
    if (deckPreviewPinned) return;
    window.clearTimeout(deckHideTimer);
    deckHideTimer = window.setTimeout(hideDeckPreview, 80);
  }

  document.addEventListener("pointerover", event => {
    const card = event.target && typeof event.target.closest === "function"
      ? event.target.closest(DECK_PREVIEW_CARD_SELECTOR)
      : null;
    if (!card) return;
    window.clearTimeout(deckHideTimer);
    deckPreviewPinned = false;
    if (card === deckPreviewAnchor && deckPreviewEl && deckPreviewEl.classList.contains("is-show")) return;
    showDeckPreview(card);
  });

  document.addEventListener("pointerout", event => {
    if (!deckPreviewAnchor) return;
    const card = event.target && typeof event.target.closest === "function"
      ? event.target.closest(DECK_PREVIEW_CARD_SELECTOR)
      : null;
    if (!card || card !== deckPreviewAnchor) return;
    const next = event.relatedTarget;
    if (next && deckPreviewAnchor.contains(next)) return;
    if (next && deckPreviewEl && deckPreviewEl.contains(next)) return;
    scheduleHideDeckPreview();
  });

  document.addEventListener("pointerdown", event => {
    const card = event.target && typeof event.target.closest === "function"
      ? event.target.closest(DECK_PREVIEW_CARD_SELECTOR)
      : null;
    if (card) {
      if (event.target.closest(".bm-store-buy-btn")) { hideDeckPreview(); return; }
      showDeckPreview(card);
      deckPreviewPinned = true;
      return;
    }
    if (deckPreviewEl && deckPreviewEl.contains(event.target)) return;
    hideDeckPreview();
  }, true);

  window.GlobalTooltip = {
    hide,
    refresh,
    showForElement: show
  };
})();
