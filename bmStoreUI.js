"use strict";

/* =========================================================================
   BM Store UI
   - 월영당 팝업 생성/열기/닫기, 패키지 탭 렌더링, 구매 버튼 처리를 담당합니다.
   - 추천/주문 팩/달빛조각 충전 탭은 화면에만 표시하고 클릭 시 준비 중 토스트를 띄웁니다.
   - 전투 화면 진입 버튼은 만들지 않으며, 메인/선물함의 wallet UI가 이 open()만 호출합니다.
   ========================================================================= */
(function(){
  const READY_MESSAGE = "해당 탭은 준비 중입니다.";
  const PURCHASE_SUCCESS_MESSAGE = "구매가 완료되었습니다. 선물함에서 수령할 수 있습니다.";
  const MOON_CHARGE_SUCCESS_MESSAGE = "테스트 구매가 완료되었습니다. 선물함에서 달빛조각을 수령할 수 있습니다.";
  const MOON_CHARGE_NOTICE = "테스트 구매입니다. 실제 결제가 발생하지 않습니다.";
  const RECOMMENDED_NOTICE = "운영자가 추천하는 특별 상품입니다.";
  const RECOMMENDED_CASH_NOTICE = "테스트 구매 상품은 실제 결제가 발생하지 않습니다.";
  let els = null;
  let purchasingProductId = "";

  const state = {
    activeTab: "package",
    wallet: { moonShards: 0 },
    products: []
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
      '<div class="bm-store-panel" role="dialog" aria-modal="true" aria-labelledby="bmStoreTitle">' +
        '<div class="bm-store-title-ornament" aria-hidden="true"></div>' +
        '<div class="bm-store-head">' +
          '<div class="bm-store-heading">' +
            '<h2 id="bmStoreTitle">월영당</h2>' +
            '<p>달빛 조각을 바쳐 특별한 인연과 물품을 얻습니다.</p>' +
          '</div>' +
          '<div class="bm-store-head-actions">' +
            '<div class="bm-store-wallet" aria-label="현재 달빛조각 보유량">' +
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
  }

  function close(){
    if(!els) return;
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
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
  }

  function handleBodyClick(event){
    const button = event.target.closest(".bm-store-buy-btn");
    if(button){
      if(!button.disabled) purchase(button.dataset.productId);
      return;
    }

    const dimmedCard = event.target.closest(".bm-product-card.is-dimmed");
    if(dimmedCard){
      showToastMessage(dimmedCard.dataset.disabledReason || "준비 중입니다.", "info");
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
          ? "달빛조각이 부족합니다."
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
    const knownTabs = ["package", "order_pack", "moon_charge", "recommended"];
    if(knownTabs.indexOf(state.activeTab) === -1){
      els.body.innerHTML = '<div class="bm-store-empty">해당 탭은 준비 중입니다.</div>';
      return;
    }

    if(state.activeTab === "recommended"){
      renderRecommendedLayout();
      return;
    }

    if(!state.products.length){
      const emptyTextByTab = {
        order_pack: "판매 중인 주문 팩이 없습니다.",
        moon_charge: "판매 중인 충전 상품이 없습니다.",
        recommended: "현재 추천 상품이 없습니다."
      };
      const emptyText = emptyTextByTab[state.activeTab] || "판매 중인 패키지가 없습니다.";
      els.body.innerHTML = (state.activeTab === "recommended"
        ? '<p class="bm-store-recommend-notice">' + escapeHtml(RECOMMENDED_NOTICE) + '</p>'
        : "") + '<div class="bm-store-empty">' + emptyText + '</div>';
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

  /* 추천 탭 전용 레이아웃입니다. 좌측에 월영의 약속 대형 카드, 우측 상단에 혼꽃 설화편 딤드 배너,
     우측 하단에 진언 스킨/캐릭터 스킨 딤드 패널 + 확장팩 준비 중 영역을 배치합니다.
     패키지/주문 팩/충전 탭의 기존 그리드 렌더링에는 영향을 주지 않습니다. */
  function renderRecommendedLayout(){
    const products = state.products || [];
    const monthlyPass = products.find(product => product.layoutType === "monthly_pass_main");
    const storyDlc = products.find(product => product.layoutType === "story_dlc_banner");
    const mantraSkin = products.find(product => product.layoutType === "mantra_skin_panel");
    const characterSkin = products.find(product => product.layoutType === "character_skin_panel");

    els.body.innerHTML =
      '<div class="bm-recommended-layout">' +
        (monthlyPass ? renderMonthlyPassCard(monthlyPass) : "") +
        '<div class="bm-recommended-right">' +
          '<div class="bm-recommended-top">' +
            (storyDlc ? renderStoryDlcCard(storyDlc) : "") +
          '</div>' +
          '<div class="bm-recommended-bottom">' +
            (mantraSkin ? renderSkinPanelCard(mantraSkin, "진언 스킨") : "") +
            (characterSkin ? renderSkinPanelCard(characterSkin, "캐릭터 스킨") : "") +
            renderExpansionPlaceholder() +
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
        '<div class="bm-monthly-pass-art" aria-hidden="true"><span class="bm-store-art-icon">' + escapeHtml(product.icon || "🌙") + '</span></div>' +
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

  function renderProductCard(product){
    const isBusy = purchasingProductId === product.id;
    const isTestCash = product.priceType === "test_cash";
    const secondaryText = product.limitText || product.bonusText;
    const badgeText = state.activeTab === "recommended"
      ? (product.recommendBadge || product.badge)
      : product.badge;
    return (
      '<article class="bm-store-product">' +
        (badgeText ? '<div class="bm-store-badge">' + escapeHtml(badgeText) + '</div>' : "") +
        '<div class="bm-store-product-art" aria-hidden="true">' +
          (product.icon
            ? '<span class="bm-store-art-icon">' + escapeHtml(product.icon) + '</span>'
            : '<span class="bm-store-art-moon"></span><span class="bm-store-art-box">✦</span>') +
        '</div>' +
        '<div class="bm-store-product-copy">' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          (secondaryText ? '<p class="bm-store-limit-text">' + escapeHtml(secondaryText) + '</p>' : "") +
          (product.description ? '<p>' + escapeHtml(product.description) + '</p>' : "") +
          (isTestCash ? '<p>' + escapeHtml(formatKRW(product.price)) + '</p>' : "") +
        '</div>' +
        '<button type="button" class="bm-store-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (isBusy ? " disabled" : "") + '>' +
          (isTestCash
            ? '<span>' + (isBusy ? "구매 중..." : "테스트 구매") + '</span>'
            : '<span class="bm-store-price-icon" aria-hidden="true"></span><span>' + (isBusy ? "구매 중..." : formatCount(product.price)) + '</span>') +
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
})();
