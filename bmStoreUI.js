"use strict";

/* =========================================================================
   BM Store UI
   - 월영당 팝업 생성/열기/닫기, 패키지 탭 렌더링, 구매 버튼 처리를 담당합니다.
   - 추천/주문 팩/달빛 조각 충전 탭은 화면에만 표시하고 클릭 시 준비 중 토스트를 띄웁니다.
   - 전투 화면 진입 버튼은 만들지 않으며, 메인/선물함의 wallet UI가 이 open()만 호출합니다.
   ========================================================================= */
(function(){
  const READY_MESSAGE = "해당 탭은 준비 중입니다.";
  const PURCHASE_SUCCESS_MESSAGE = "구매가 완료되었습니다. 선물함에서 수령할 수 있습니다.";
  const SKIN_PURCHASE_SUCCESS_MESSAGE = "구매가 완료되었습니다. 선물함에서 스킨을 수령할 수 있습니다.";
  const MOON_CHARGE_SUCCESS_MESSAGE = "테스트 구매가 완료되었습니다. 선물함에서 달빛 조각을 수령할 수 있습니다.";
  const DECK_PACK_PURCHASE_SUCCESS_MESSAGE = "구매가 완료되었습니다. 선물함에서 주문 덱을 수령할 수 있습니다.";
  const MOON_CHARGE_NOTICE = "테스트 구매입니다. 실제 결제가 발생하지 않습니다.";
  const RECOMMENDED_NOTICE = "운영자가 추천하는 특별 상품입니다.";
  const RECOMMENDED_CASH_NOTICE = "테스트 구매 상품은 실제 결제가 발생하지 않습니다.";
  let els = null;
  let purchasingProductId = "";
  let pendingPurchaseProduct = null;
  let isPurchaseConfirmOpen = false;

  const state = {
    activeTab: "package",
    wallet: { moonShards: 0 },
    products: [],
    ownedSkinIds: [],
    ownedDeckPackIds: []
  };

  function escapeHtml(str){
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function showToastMessage(message, type){
    if(typeof toast === "function"){
      toast(message, type || "info");
      return;
    }
    if(typeof window.showToast === "function") window.showToast(message, type || "info");
  }

  function formatCount(value){
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    return amount.toLocaleString("en-US");
  }

  function formatKRW(value){
    return "₩" + formatCount(value);
  }

  function getTabs(){
    const data = window.VIBERUN_BM_STORE_DATA;
    return data && typeof data.getTabs === "function" ? data.getTabs() : [];
  }

  /* 추천 탭은 tab: "recommended"로 태그된 상품(월영의 약속 + 딤드 미리보기 상품)만 노출합니다.
     패키지/주문 팩/충전 탭에 있는 recommended 플래그 상품은 이 탭에 섞이지 않습니다. */
  function getProductsForTab(tabId){
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if(!service) return [];
    if(typeof service.getProductsByTab === "function") return service.getProductsByTab(tabId);
    if(tabId === "package" && typeof service.getPackageProducts === "function"){
      return service.getPackageProducts();
    }
    if(tabId === "order_pack" && typeof service.getOrderPackProducts === "function"){
      return service.getOrderPackProducts();
    }
    return [];
  }

  function ensureUI(){
    if(els) return els;

    const overlay = document.createElement("div");
    overlay.id = "bmStoreOverlay";
    overlay.className = "bm-store-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="bm-store-npc" aria-hidden="true"><img src="assets/ui_panels/bm_store/bm_npc.png" alt=""></div>' +
      '<div class="bm-store-panel" role="dialog" aria-modal="true" aria-labelledby="bmStoreTitle">' +
        '<div class="bm-store-title-ornament" aria-hidden="true"></div>' +
        '<div class="bm-store-head">' +
          '<div class="bm-store-heading">' +
            '<h2 id="bmStoreTitle">월영당</h2>' +
            '<p>달빛 조각을 바쳐 특별한 인연과 물품을 얻습니다.</p>' +
          '</div>' +
          '<div class="bm-store-head-actions">' +
            '<div class="bm-store-wallet" aria-label="현재 달빛 조각 보유량">' +
              '<span class="bm-store-wallet-icon" aria-hidden="true"></span>' +
              '<span id="bmStoreWalletValue">0</span>' +
            '</div>' +
            '<button type="button" class="bm-store-close" aria-label="닫기">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="bm-store-tabs" id="bmStoreTabs"></div>' +
        '<div class="bm-store-body" id="bmStoreBody"></div>' +
        '<div class="bm-store-footer">' +
          '<div class="bm-store-notices">' +
            '<p>※ 청약 철회는 구매일로부터 7일 이내 가능하며, 일부 상품은 제외됩니다.</p>' +
            '<p>상품 및 구성품은 업데이트에 따라 변경될 수 있습니다.</p>' +
          '</div>' +
          '<button type="button" class="bm-store-rate-info" aria-disabled="true">확률 정보</button>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) close();
    });
    overlay.querySelector(".bm-store-close").addEventListener("click", close);
    overlay.querySelector("#bmStoreTabs").addEventListener("click", handleTabClick);
    overlay.querySelector("#bmStoreBody").addEventListener("click", handleBodyClick);

    (document.querySelector("#game") || document.body).appendChild(overlay);

    els = {
      overlay,
      tabs: overlay.querySelector("#bmStoreTabs"),
      body: overlay.querySelector("#bmStoreBody"),
      walletValue: overlay.querySelector("#bmStoreWalletValue")
    };
    return els;
  }

  /* tabId를 넘기면 해당 탭을 열어 시작하고(예: 월영의 약속 구매 유도),
     생략하면 기존과 동일하게 패키지 탭으로 연다. */
  function open(tabId){
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.requireLogin === "function" &&
       !window.VIBERUN_AUTH.requireLogin(() => open(tabId))){
      return;
    }

    ensureUI();
    state.activeTab = tabId || "package";
    state.products = getProductsForTab(state.activeTab);

    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    render();
    refreshWallet();
    refreshOwnedSkins();
    refreshOwnedDeckPacks();
  }

  function close(){
    if(!els) return;
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    closePurchaseConfirm();
  }

  function refreshWallet(){
    const walletService = window.VIBERUN_WALLET;
    const cached = walletService && typeof walletService.getCachedWallet === "function"
      ? walletService.getCachedWallet()
      : null;
    if(cached){
      state.wallet = cached;
      renderWallet();
    }

    if(walletService && typeof walletService.fetchWallet === "function"){
      Promise.resolve(walletService.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet){
          state.wallet = result.wallet;
          renderWallet();
        }
      }).catch(error => {
        console.warn("[BMStoreUI] wallet 갱신 중 오류가 발생했습니다.", error);
      });
    }
  }

  /* 스킨 탭 재구매 방지용 보유 스킨 목록 조회입니다. 구매만 하고 선물함에서
     수령하지 않은 스킨은 ownedSkinIds에 없으므로 재구매가 계속 허용됩니다. */
  function refreshOwnedSkins(){
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if(!service || typeof service.fetchCharacterSkinProfileState !== "function") return;

    Promise.resolve(service.fetchCharacterSkinProfileState()).then(result => {
      const ownedSkinIds = result && result.ok && result.characterSkins &&
        Array.isArray(result.characterSkins.ownedSkinIds)
        ? result.characterSkins.ownedSkinIds.slice()
        : [];
      state.ownedSkinIds = ownedSkinIds;
      if(state.activeTab === "package" || state.activeTab === "recommended") renderProducts();
    }).catch(error => {
      console.warn("[BMStoreUI] 보유 스킨 조회 중 오류가 발생했습니다.", error);
    });
  }

  /* 주문 덱 BM 임시 구현: 주문 팩 탭 재구매 방지용 보유 확장덱 목록 조회입니다. 구매만 하고
     선물함에서 수령하지 않은 덱은 ownedDeckPackIds에 없으므로 재구매 방지는 서버가 처리합니다. */
  function refreshOwnedDeckPacks(){
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if(!service || typeof service.fetchDeckPackUnlocks !== "function") return;

    Promise.resolve(service.fetchDeckPackUnlocks()).then(result => {
      const ownedDeckPackIds = result && result.ok && result.deckPackUnlocks &&
        Array.isArray(result.deckPackUnlocks.ownedDeckPackIds)
        ? result.deckPackUnlocks.ownedDeckPackIds.slice()
        : [];
      state.ownedDeckPackIds = ownedDeckPackIds;
      if(state.activeTab === "order_pack" || state.activeTab === "recommended") renderProducts();
    }).catch(error => {
      console.warn("[BMStoreUI] 보유 확장덱 조회 중 오류가 발생했습니다.", error);
    });
  }

  function handleTabClick(event){
    const tab = event.target.closest(".bm-store-tab");
    if(!tab) return;

    if(tab.dataset.enabled !== "true"){
      showToastMessage(tab.dataset.readyMessage || READY_MESSAGE, "info");
      return;
    }

    state.activeTab = tab.dataset.tab;
    state.products = getProductsForTab(state.activeTab);
    render();
    if(state.activeTab === "package") refreshOwnedSkins();
    if(state.activeTab === "order_pack") refreshOwnedDeckPacks();
  }

  function handleBodyClick(event){
    const button = event.target.closest(".bm-store-buy-btn");
    if(button){
      if(!button.disabled) handleBuyButtonClick(button.dataset.productId);
      return;
    }

    const dimmedCard = event.target.closest(".bm-product-card.is-dimmed");
    if(dimmedCard){
      showToastMessage(dimmedCard.dataset.disabledReason || "준비 중입니다.", "info");
      return;
    }

    const ownedSkinCard = event.target.closest(".bm-store-skin-card.is-owned");
    if(ownedSkinCard){
      showToastMessage("이미 보유 중인 스킨입니다.", "info");
      return;
    }

    const ownedDeckPackCard = event.target.closest(".bm-store-product.is-owned");
    if(ownedDeckPackCard){
      showToastMessage("이미 보유 중인 주문 덱입니다.", "info");
    }
  }

  function purchase(productId){
    if(!window.VIBERUN_BM_STORE_SERVICE ||
       typeof window.VIBERUN_BM_STORE_SERVICE.purchaseProduct !== "function"){
      showToastMessage("월영당을 불러오지 못했습니다.", "error");
      return;
    }

    purchasingProductId = productId;
    renderProducts();

    Promise.resolve(window.VIBERUN_BM_STORE_SERVICE.purchaseProduct(productId)).then(result => {
      purchasingProductId = "";
      if(!result || !result.ok){
        const message = result && result.code === "INSUFFICIENT_MOON_SHARDS"
          ? "달빛 조각이 부족합니다."
          : ((result && result.message) || "구매에 실패했습니다.");
        if(result && result.wallet) state.wallet = result.wallet;
        render();
        showToastMessage(message, result && result.code === "INSUFFICIENT_MOON_SHARDS" ? "warning" : "error");
        return;
      }

      if(result.wallet) state.wallet = result.wallet;
      render();

      if(window.VIBERUN_MAILBOX_UI && typeof window.VIBERUN_MAILBOX_UI.refreshBadge === "function"){
        window.VIBERUN_MAILBOX_UI.refreshBadge();
      }

      const product = findProductById(productId);
      if(product && product.rewardType === "moon_shard"){
        showToastMessage(MOON_CHARGE_SUCCESS_MESSAGE, "success");
        return;
      }

      if(product && product.rewardType === "character_skin"){
        showToastMessage(SKIN_PURCHASE_SUCCESS_MESSAGE, "success");
        return;
      }

      if(product && product.rewardType === "deck_pack"){
        showToastMessage(DECK_PACK_PURCHASE_SUCCESS_MESSAGE, "success");
        return;
      }

      showToastMessage(PURCHASE_SUCCESS_MESSAGE, "success");
    }).catch(error => {
      console.warn("[BMStoreUI] 패키지 구매 중 오류가 발생했습니다.", error);
      purchasingProductId = "";
      render();
      showToastMessage("구매에 실패했습니다.", "error");
    });
  }

  function findProductById(productId){
    return state.products.find(product => product.id === productId) || null;
  }

  function formatPurchasePrice(product){
    if(!product) return "";
    if(product.priceLabel) return product.priceLabel;
    if(product.priceType === "test_cash") return formatKRW(product.price);
    return "달빛 조각 " + formatCount(product.price) + "개";
  }

  /* 구매 버튼 클릭 시 바로 구매하지 않고 구매 확인 팝업을 먼저 띄웁니다.
     dimmed/comingSoon/purchasable:false/판매 종료 상품은 버튼 자체가 disabled 처리되어
     handleBodyClick에서 이미 걸러지므로 여기서는 확인 팝업만 담당합니다. */
  function handleBuyButtonClick(productId){
    const product = findProductById(productId);
    if(!product){
      showToastMessage("존재하지 않는 상품입니다.", "error");
      return;
    }
    openPurchaseConfirm(product);
  }

  function openPurchaseConfirm(product){
    pendingPurchaseProduct = product;
    isPurchaseConfirmOpen = true;
    renderPurchaseConfirmModal(product);
  }

  function closePurchaseConfirm(){
    pendingPurchaseProduct = null;
    isPurchaseConfirmOpen = false;
    renderPurchaseConfirmModal(null);
  }

  function confirmPendingPurchase(){
    const product = pendingPurchaseProduct;
    if(!product){
      closePurchaseConfirm();
      return;
    }
    closePurchaseConfirm();
    purchase(product.id);
  }

  function renderPurchaseConfirmModal(product){
    let modal = document.querySelector(".bm-purchase-confirm");

    if(!product){
      if(modal) modal.remove();
      return;
    }

    if(!modal){
      modal = document.createElement("div");
      modal.className = "bm-purchase-confirm";
      document.body.appendChild(modal);
    }

    const priceText = formatPurchasePrice(product);

    modal.innerHTML =
      '<div class="bm-purchase-confirm-backdrop"></div>' +
      '<section class="bm-purchase-confirm-panel" role="dialog" aria-modal="true">' +
        '<h2 class="bm-purchase-confirm-title">구매 확인</h2>' +
        '<p class="bm-purchase-confirm-message">' +
          '<strong>' + escapeHtml(product.name) + '</strong> 상품을 구매하시겠습니까?' +
        '</p>' +
        (priceText ? '<p class="bm-purchase-confirm-price">가격: ' + escapeHtml(priceText) + '</p>' : "") +
        '<div class="bm-purchase-confirm-actions">' +
          '<button type="button" class="bm-purchase-confirm-cancel">취소</button>' +
          '<button type="button" class="bm-purchase-confirm-ok">구매</button>' +
        '</div>' +
      '</section>';

    modal.querySelector(".bm-purchase-confirm-backdrop").addEventListener("click", closePurchaseConfirm);
    modal.querySelector(".bm-purchase-confirm-cancel").addEventListener("click", closePurchaseConfirm);
    modal.querySelector(".bm-purchase-confirm-ok").addEventListener("click", confirmPendingPurchase);
  }

  function render(){
    if(!els) return;
    renderTabs();
    renderWallet();
    renderProducts();
  }

  function renderTabs(){
    const tabs = getTabs();
    els.tabs.innerHTML = tabs.map(tab => {
      const enabled = !!tab.enabled;
      const active = enabled && tab.id === state.activeTab;
      return (
        '<button type="button" class="bm-store-tab' +
          (active ? " active" : "") +
          (enabled ? "" : " disabled") +
          '" data-tab="' + escapeHtml(tab.id) + '"' +
          ' data-enabled="' + String(enabled) + '"' +
          ' data-ready-message="' + escapeHtml(tab.readyMessage || READY_MESSAGE) + '"' +
          ' aria-disabled="' + String(!enabled) + '">' +
          escapeHtml(tab.label) +
        '</button>'
      );
    }).join("");
  }

  function renderWallet(){
    if(!els) return;
    els.walletValue.textContent = formatCount(state.wallet && state.wallet.moonShards);
  }

  function renderProducts(){
    if(!els) return;
    els.body.className = "bm-store-body bm-store-body--" + state.activeTab;
    const knownTabs = ["package", "order_pack", "moon_charge", "recommended"];
    if(knownTabs.indexOf(state.activeTab) === -1){
      els.body.innerHTML = '<div class="bm-store-empty">해당 탭은 준비 중입니다.</div>';
      return;
    }

    if(state.activeTab === "recommended"){
      renderRecommendedLayout();
      return;
    }

    if(state.activeTab === "moon_charge" && state.products.length){
      renderMoonChargeLayout();
      return;
    }

    if(!state.products.length){
      const emptyTextByTab = {
        order_pack: "판매 중인 주문 팩이 없습니다.",
        moon_charge: "판매 중인 충전 상품이 없습니다.",
        recommended: "현재 추천 상품이 없습니다.",
        package: "판매 중인 스킨이 없습니다."
      };
      const emptyText = emptyTextByTab[state.activeTab] || "판매 중인 패키지가 없습니다.";
      els.body.innerHTML = (state.activeTab === "recommended"
        ? '<p class="bm-store-recommend-notice">' + escapeHtml(RECOMMENDED_NOTICE) + '</p>'
        : "") + '<div class="bm-store-empty">' + emptyText + '</div>';
      return;
    }

    if(state.activeTab === "package"){
      els.body.innerHTML =
        '<div class="bm-store-skin-grid">' +
          state.products.map(renderSkinProductCard).join("") +
        '</div>';
      return;
    }

    const heading = state.activeTab === "recommended"
      ? '<p class="bm-store-recommend-notice">' + escapeHtml(RECOMMENDED_NOTICE) + '</p>'
      : "";

    const hasTestCash = state.activeTab === "recommended" &&
      state.products.some(product => product.priceType === "test_cash");
    const notice = state.activeTab === "moon_charge"
      ? '<p class="bm-store-charge-notice">' + escapeHtml(MOON_CHARGE_NOTICE) + '</p>'
      : (hasTestCash ? '<p class="bm-store-charge-notice">' + escapeHtml(RECOMMENDED_CASH_NOTICE) + '</p>' : "");

    els.body.innerHTML = heading +
      '<div class="bm-store-package-grid bm-store-product-grid--' + escapeHtml(state.activeTab) + '">' +
        state.products.map(renderProductCard).join("") +
      '</div>' + notice;
  }

  function isSkinSaleEnded(product){
    if(!product.saleEndAt) return false;
    const saleEndAt = Date.parse(product.saleEndAt);
    return Number.isFinite(saleEndAt) && Date.now() >= saleEndAt;
  }

  /* 스킨 탭 전용 카드 렌더러입니다. 3개 카드가 가로로 크게 배치되며,
     한정 스킨은 saleEndAt이 지나면 "판매 종료"로, 이미 보유한 스킨은 "보유 중"으로
     구매 버튼을 비활성화하고 카드를 딤드 처리해 재구매를 막습니다. */
  function renderSkinProductCard(product){
    const isBusy = purchasingProductId === product.id;
    const saleEnded = isSkinSaleEnded(product);
    const isOwned = !!product.skinId && state.ownedSkinIds.indexOf(product.skinId) !== -1;
    const disabled = isBusy || saleEnded || isOwned || product.purchasable === false;

    let buttonLabel = formatCount(product.price);
    if(isOwned) buttonLabel = "보유 중";
    else if(saleEnded) buttonLabel = "판매 종료";
    else if(isBusy) buttonLabel = "구매 중...";

    return (
      '<article class="bm-store-skin-card bm-store-skin-card--' + escapeHtml(product.grade || "common") +
        (isOwned ? " is-owned" : "") + '">' +
        '<div class="bm-store-skin-title">' + escapeHtml(product.name) + '</div>' +
        '<div class="bm-store-skin-badge">' + escapeHtml(product.gradeLabel || product.badge || "") + '</div>' +
        (isOwned ? '<div class="bm-store-skin-owned-flag">보유 중</div>' : "") +

        '<div class="bm-store-skin-art" aria-hidden="true">' +
          (product.previewImage
            ? '<img src="' + escapeHtml(product.previewImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : '<span class="bm-store-art-moon"></span><span class="bm-store-art-box">✦</span>') +
        '</div>' +

        '<div class="bm-store-skin-description">' +
          '<p>' + escapeHtml(product.skinTypeName || "") + '</p>' +
          (product.description ? '<p>' + escapeHtml(product.description) + '</p>' : '') +
          (product.salePeriodText ? '<p class="bm-store-sale-period">' + escapeHtml(product.salePeriodText) + '</p>' : '') +
        '</div>' +

        '<button type="button" class="bm-store-buy-btn bm-store-skin-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (disabled ? " disabled" : "") + '>' +
          (isOwned ? "" : '<span class="bm-store-price-icon" aria-hidden="true"></span>') +
          '<span>' + buttonLabel + '</span>' +
        '</button>' +
      '</article>'
    );
  }

  /* 추천 탭 전용 레이아웃입니다. 좌측에 월영의 약속 대형 카드, 우측 상단에 한정 스킨 실구매 카드,
     우측 하단에 프리미엄 스킨/한풀이 덱/달빛 조각 3,000개 실구매 카드를 배치합니다.
     패키지/주문 팩/충전 탭의 기존 그리드 렌더링에는 영향을 주지 않습니다. */
  function renderRecommendedLayout(){
    const products = state.products || [];
    const monthlyPass = products.find(product => product.layoutType === "monthly_pass_main");
    const topBanner = products.find(product => product.recommendedSlot === "top_banner");
    const bottomLeft = products.find(product => product.recommendedSlot === "bottom_left");
    const bottomMiddle = products.find(product => product.recommendedSlot === "bottom_middle");
    const bottomRight = products.find(product => product.recommendedSlot === "bottom_right");

    els.body.innerHTML =
      '<div class="bm-recommended-layout">' +
        (monthlyPass ? renderMonthlyPassCard(monthlyPass) : "") +
        '<div class="bm-recommended-right">' +
          '<div class="bm-recommended-top">' +
            (topBanner ? renderRecommendedWideProductCard(topBanner) : "") +
          '</div>' +
          '<div class="bm-recommended-bottom">' +
            (bottomLeft ? renderRecommendedSmallProductCard(bottomLeft) : "") +
            (bottomMiddle ? renderRecommendedSmallProductCard(bottomMiddle) : "") +
            (bottomRight ? renderRecommendedSmallProductCard(bottomRight) : "") +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function renderMonthlyPassCard(product){
    const isBusy = purchasingProductId === product.id;
    const detailLines = Array.isArray(product.detailLines) ? product.detailLines : [];
    return (
      '<article class="bm-product-card bm-monthly-pass-card">' +
        (product.recommendBadge ? '<div class="bm-store-badge">' + escapeHtml(product.recommendBadge) + '</div>' : "") +
        '<div class="bm-monthly-pass-art" aria-hidden="true">' +
          (product.artImage
            ? '<img src="' + escapeHtml(product.artImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : '<span class="bm-store-art-icon">' + escapeHtml(product.icon || "🌙") + '</span>') +
        '</div>' +
        '<div class="bm-monthly-pass-copy">' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          '<ul class="bm-monthly-pass-detail">' +
            detailLines.map(line => '<li>' + escapeHtml(line) + '</li>').join("") +
          '</ul>' +
        '</div>' +
        '<button type="button" class="bm-store-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (isBusy ? " disabled" : "") + '>' +
          '<span>' + (isBusy ? "구매 중..." : escapeHtml(product.priceLabel || formatKRW(product.price))) + '</span>' +
        '</button>' +
      '</article>'
    );
  }

  function renderStoryDlcCard(product){
    return (
      '<article class="bm-product-card bm-story-dlc-card is-dimmed" data-disabled-reason="' +
        escapeHtml(product.disabledReason || "준비 중입니다.") + '">' +
        '<div class="bm-story-dlc-badge">신규 스토리 DLC</div>' +
        '<h3>' + escapeHtml(product.name) + '</h3>' +
        (product.subtitle ? '<p>' + escapeHtml(product.subtitle) + '</p>' : "") +
        (product.priceLabel ? '<div class="bm-story-dlc-price">' + escapeHtml(product.priceLabel) + '</div>' : "") +
      '</article>'
    );
  }

  function renderSkinPanelCard(product, fallbackTitle){
    return (
      '<article class="bm-product-card bm-skin-panel-card is-dimmed" data-disabled-reason="' +
        escapeHtml(product.disabledReason || "준비 중입니다.") + '">' +
        '<h3>' + escapeHtml(product.name || fallbackTitle) + '</h3>' +
        (product.priceLabel ? '<p>' + escapeHtml(product.priceLabel) + '</p>' : "") +
      '</article>'
    );
  }

  /* 주문 확장팩 영역입니다. 실제 상품 연결이 없어 항상 준비 중으로 표시합니다. */
  function renderExpansionPlaceholder(){
    return (
      '<article class="bm-product-card bm-expansion-placeholder is-dimmed" data-disabled-reason="준비 중입니다.">' +
        '<h3>확장팩 1종</h3>' +
        '<p>🌙 1,200 달빛 조각</p>' +
      '</article>'
    );
  }

  /* 추천 탭 우측 상단 대형 실구매 카드입니다(한정 스킨). 딤드 없이 실제 구매 버튼을
     연결하며, 이미 보유한 스킨이면 보유 중 처리로 재구매를 막습니다. */
  function renderRecommendedWideProductCard(product){
    const isBusy = purchasingProductId === product.id;
    const isOwnedSkin = product.rewardType === "character_skin" &&
      product.skinId &&
      state.ownedSkinIds.indexOf(product.skinId) !== -1;

    const disabled = isBusy || isOwnedSkin;

    return (
      '<article class="bm-product-card bm-recommended-wide-card' + (isOwnedSkin ? ' is-owned' : '') + '">' +
        (isOwnedSkin ? '<div class="bm-store-owned-flag">보유 중</div>' : '') +
        '<div class="bm-recommended-wide-art">' +
          (product.previewImage
            ? '<img src="' + escapeHtml(product.previewImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : '<span class="bm-store-art-icon">' + escapeHtml(product.icon || "✦") + '</span>') +
        '</div>' +
        '<div class="bm-recommended-wide-copy">' +
          '<div class="bm-story-dlc-badge">' + escapeHtml(product.gradeLabel || product.badge || "추천") + '</div>' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          (product.skinTypeName ? '<p>' + escapeHtml(product.skinTypeName) + '</p>' : '') +
          (product.description ? '<p>' + escapeHtml(product.description) + '</p>' : '') +
          (product.salePeriodText ? '<p class="bm-store-sale-period">' + escapeHtml(product.salePeriodText) + '</p>' : '') +
        '</div>' +
        '<button type="button" class="bm-store-buy-btn bm-recommended-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (disabled ? ' disabled' : '') + '>' +
          (isOwnedSkin
            ? '<span>보유 중</span>'
            : '<span class="bm-store-price-icon" aria-hidden="true"></span><span>' + formatCount(product.price) + '</span>') +
        '</button>' +
      '</article>'
    );
  }

  /* 추천 탭 우측 하단 소형 실구매 카드입니다(프리미엄 스킨/한풀이 덱/달빛 조각 3,000개).
     rewardType별로 보유 상태와 가격 표시를 분기하며, 딤드는 사용하지 않습니다. */
  function renderRecommendedSmallProductCard(product){
    const isBusy = purchasingProductId === product.id;
    const isCharacterSkin = product.rewardType === "character_skin";
    const isDeckPack = product.rewardType === "deck_pack";

    const isOwned =
      (isCharacterSkin && !!product.skinId && state.ownedSkinIds.indexOf(product.skinId) !== -1) ||
      (isDeckPack && !!product.deckPackId && state.ownedDeckPackIds.indexOf(product.deckPackId) !== -1);

    const disabled = isBusy || isOwned;

    let priceText;
    if(product.priceType === "test_cash"){
      priceText = '<span>' + escapeHtml(product.priceLabel || formatKRW(product.price)) + '</span>';
    } else {
      priceText = '<span class="bm-store-price-icon" aria-hidden="true"></span><span>' + formatCount(product.price) + '</span>';
    }

    return (
      '<article class="bm-product-card bm-recommended-small-card' + (isOwned ? ' is-owned' : '') + '">' +
        (isOwned ? '<div class="bm-store-owned-flag">보유 중</div>' : '') +
        '<div class="bm-recommended-small-art' + (isCharacterSkin && product.profileIcon ? ' bm-recommended-small-art--profile' : '') + '">' +
          (isCharacterSkin && product.profileIcon
            ? '<img src="' + escapeHtml(product.profileIcon) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : product.previewImage
              ? '<img src="' + escapeHtml(product.previewImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
              : product.rewardType === "moon_shard"
                ? '<span class="bm-store-art-moon"></span>'
                : '<span class="bm-store-art-icon">' + escapeHtml(product.icon || "✦") + '</span>') +
        '</div>' +
        '<h3>' + escapeHtml(product.name) + '</h3>' +
        (product.subtitle || product.skinTypeName
          ? '<p>' + escapeHtml(product.subtitle || product.skinTypeName) + '</p>' : '') +
        '<button type="button" class="bm-store-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (disabled ? ' disabled' : '') + '>' +
          (isOwned ? '<span>보유 중</span>' : priceText) +
        '</button>' +
      '</article>'
    );
  }

  /* 달빛 조각 충전 탭 전용 레이아웃입니다. 4개 상품을 가로 4카드로 배치하며,
     구매 버튼은 기존 .bm-store-buy-btn 클래스/data-product-id를 그대로 사용해
     공통 구매 확인 팝업 → purchaseProduct 흐름을 그대로 탑니다. */
  function renderMoonChargeLayout(){
    const sortedProducts = state.products.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    els.body.innerHTML =
      '<div class="bm-moon-charge-layout">' +
        sortedProducts.map(renderMoonChargeCard).join("") +
      '</div>' +
      '<p class="bm-moon-charge-notice">' + escapeHtml(MOON_CHARGE_NOTICE) + '</p>';
  }

  function renderMoonChargeCard(product){
    const isBusy = purchasingProductId === product.id;
    const priceText = product.priceLabel || formatKRW(product.price);
    const rewardAmount = Number(product.rewardAmount) || 0;

    return (
      '<article class="bm-moon-charge-card">' +
        (product.recommendedBadge ? '<div class="bm-moon-charge-badge">' + escapeHtml(product.recommendedBadge) + '</div>' : "") +
        '<h3 class="bm-moon-charge-title">' + escapeHtml(product.name) + '</h3>' +

        '<div class="bm-moon-charge-art" aria-hidden="true">' +
          (product.artImage
            ? '<img src="' + escapeHtml(product.artImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : '<span class="bm-store-art-moon"></span><span class="bm-moon-charge-amount">' + formatCount(rewardAmount) + '</span>') +
        '</div>' +

        '<button type="button" class="bm-store-buy-btn bm-moon-charge-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (isBusy ? " disabled" : "") + '>' +
          '<span class="bm-store-price-icon" aria-hidden="true"></span>' +
          '<span>' + (isBusy ? "구매 중..." : escapeHtml(priceText)) + '</span>' +
        '</button>' +
      '</article>'
    );
  }

  function renderProductCard(product){
    const isBusy = purchasingProductId === product.id;
    const isTestCash = product.priceType === "test_cash";
    const isDeckPack = product.rewardType === "deck_pack";
    const isOwned = isDeckPack && !!product.deckPackId &&
      state.ownedDeckPackIds.indexOf(product.deckPackId) !== -1;
    const secondaryText = product.subtitle || product.limitText || product.bonusText;
    const badgeText = state.activeTab === "recommended"
      ? (product.recommendBadge || product.badge)
      : product.badge;
    const disabled = isBusy || isOwned;

    let buttonInner = '<span class="bm-store-price-icon" aria-hidden="true"></span><span>' + formatCount(product.price) + '</span>';
    if(isTestCash){
      buttonInner = '<span>' + (isBusy ? "구매 중..." : "테스트 구매") + '</span>';
    } else if(isOwned){
      buttonInner = '<span>보유 중</span>';
    } else if(isBusy){
      buttonInner = '<span class="bm-store-price-icon" aria-hidden="true"></span><span>구매 중...</span>';
    }

    return (
      '<article class="bm-store-product' + (isOwned ? " is-owned" : "") + '">' +
        (badgeText ? '<div class="bm-store-badge">' + escapeHtml(badgeText) + '</div>' : "") +
        (isOwned ? '<div class="bm-store-owned-flag">보유 중</div>' : "") +
        '<div class="bm-store-product-art" aria-hidden="true">' +
          (product.artImage
            ? '<img src="' + escapeHtml(product.artImage) + '" alt="" loading="lazy" onerror="this.style.display=&quot;none&quot;">'
            : product.icon
              ? '<span class="bm-store-art-icon">' + escapeHtml(product.icon) + '</span>'
              : '<span class="bm-store-art-moon"></span><span class="bm-store-art-box">✦</span>') +
        '</div>' +
        '<div class="bm-store-product-copy">' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          (secondaryText ? '<p class="bm-store-limit-text">' + escapeHtml(secondaryText) + '</p>' : "") +
          (product.description ? '<p>' + escapeHtml(product.description) + '</p>' : "") +
          (product.contentSummary ? '<p class="bm-store-content-summary">' + escapeHtml(product.contentSummary) + '</p>' : "") +
          (isTestCash ? '<p>' + escapeHtml(formatKRW(product.price)) + '</p>' : "") +
        '</div>' +
        '<button type="button" class="bm-store-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (disabled ? " disabled" : "") + '>' +
          buttonInner +
        '</button>' +
      '</article>'
    );
  }

  window.VIBERUN_BM_STORE_UI = {
    open,
    close,
    refreshWallet(wallet){
      if(wallet) state.wallet = wallet;
      renderWallet();
    }
  };

  window.addEventListener("viberun:wallet-changed", event => {
    const wallet = event && event.detail ? event.detail.wallet : null;
    if(wallet) state.wallet = wallet;
    if(els) renderWallet();
  });

  window.addEventListener("viberun:auth-changed", event => {
    const isLoggedIn = !!(event && event.detail && event.detail.isLoggedIn);
    if(!isLoggedIn) close();
  });

  window.addEventListener("viberun:mailbox-changed", () => {
    if(!els || !els.overlay.classList.contains("show")) return;
    refreshOwnedSkins();
    refreshOwnedDeckPacks();
  });
})();
