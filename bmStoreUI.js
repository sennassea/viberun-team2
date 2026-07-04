"use strict";

/* =========================================================================
   BM Store UI
   - 월영당 팝업 생성/열기/닫기, 패키지 탭 렌더링, 구매 버튼 처리를 담당합니다.
   - 추천/주문 팩/달빛조각 충전 탭은 화면에만 표시하고 클릭 시 준비 중 토스트를 띄웁니다.
   - 전투 화면 진입 버튼은 만들지 않으며, 메인/선물함의 wallet UI가 이 open()만 호출합니다.
   ========================================================================= */
(function(){
  const READY_MESSAGE = "해당 탭은 준비 중입니다.";
  const SUCCESS_SUFFIX = "을 구매했습니다. 테스트용 더미 아이템이 지급되었습니다.";
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

  function getTabs(){
    const data = window.VIBERUN_BM_STORE_DATA;
    return data && typeof data.getTabs === "function" ? data.getTabs() : [];
  }

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
              '<span class="bm-store-wallet-icon" aria-hidden="true">🌙</span>' +
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

  function open(){
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.requireLogin === "function" &&
       !window.VIBERUN_AUTH.requireLogin(open)){
      return;
    }

    ensureUI();
    state.activeTab = "package";
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
    if(!button || button.disabled) return;
    purchase(button.dataset.productId);
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
      const productName = result.product && result.product.name ? result.product.name : findProductName(productId);
      showToastMessage(productName + SUCCESS_SUFFIX, "success");
    }).catch(error => {
      console.warn("[BMStoreUI] 패키지 구매 중 오류가 발생했습니다.", error);
      purchasingProductId = "";
      render();
      showToastMessage("구매에 실패했습니다.", "error");
    });
  }

  function findProductName(productId){
    const found = state.products.find(product => product.id === productId);
    return found ? found.name : "상품";
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
    if(state.activeTab !== "package" && state.activeTab !== "order_pack"){
      els.body.innerHTML = '<div class="bm-store-empty">해당 탭은 준비 중입니다.</div>';
      return;
    }

    if(!state.products.length){
      const emptyText = state.activeTab === "order_pack" ? "판매 중인 주문 팩이 없습니다." : "판매 중인 패키지가 없습니다.";
      els.body.innerHTML = '<div class="bm-store-empty">' + emptyText + '</div>';
      return;
    }

    els.body.innerHTML =
      '<div class="bm-store-package-grid bm-store-product-grid--' + escapeHtml(state.activeTab) + '">' +
        state.products.map(renderProductCard).join("") +
      '</div>';
  }

  function renderProductCard(product){
    const isBusy = purchasingProductId === product.id;
    return (
      '<article class="bm-store-product">' +
        (product.badge ? '<div class="bm-store-badge">' + escapeHtml(product.badge) + '</div>' : "") +
        '<div class="bm-store-product-art" aria-hidden="true">' +
          (product.icon
            ? '<span class="bm-store-art-icon">' + escapeHtml(product.icon) + '</span>'
            : '<span class="bm-store-art-moon">🌙</span><span class="bm-store-art-box">✦</span>') +
        '</div>' +
        '<div class="bm-store-product-copy">' +
          '<h3>' + escapeHtml(product.name) + '</h3>' +
          (product.limitText ? '<p class="bm-store-limit-text">' + escapeHtml(product.limitText) + '</p>' : "") +
          '<p>' + escapeHtml(product.description) + '</p>' +
        '</div>' +
        '<button type="button" class="bm-store-buy-btn" data-product-id="' + escapeHtml(product.id) + '"' +
          (isBusy ? " disabled" : "") + '>' +
          '<span class="bm-store-price-icon" aria-hidden="true">🌙</span>' +
          '<span>' + (isBusy ? "구매 중..." : formatCount(product.price)) + '</span>' +
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
