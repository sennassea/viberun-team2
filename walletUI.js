"use strict";

/* =========================================================================
   Wallet UI
   - 메인 시작 화면 우상단에 계정 wallet.moonShards 보유량을 표시합니다.
   - 표시/숨김은 로그인 상태와 시작 화면 DOM만 기준으로 처리하며 전투 HUD에는
     관여하지 않습니다.
   - 달빛조각 UI 클릭 시 월영당 BM UI를 열고, UI 객체가 없을 때만 안전 토스트를 표시합니다.
   ========================================================================= */
(function(){
  let walletEl = null;
  let countEl = null;
  let plusEl = null;

  function isLoggedIn(){
    const auth = window.VIBERUN_AUTH;
    return !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());
  }

  function formatCount(value){
    const amount = Math.max(0, Math.floor(Number(value) || 0));
    return amount.toLocaleString("en-US");
  }

  function ensureElements(){
    walletEl = walletEl || document.querySelector(".start-moon-wallet");
    if(!walletEl) return false;

    countEl = walletEl.querySelector(".start-moon-count");
    plusEl = walletEl.querySelector(".start-moon-plus");

    if(!walletEl.dataset.walletUiBound){
      walletEl.dataset.walletUiBound = "true";
      walletEl.addEventListener("click", handlePlusClick);
      if(plusEl) plusEl.addEventListener("click", handlePlusClick);
    }

    return !!countEl;
  }

  function handlePlusClick(event){
    if(event) event.preventDefault();
    if(event) event.stopPropagation();

    if(window.VIBERUN_BM_STORE_UI && typeof window.VIBERUN_BM_STORE_UI.open === "function"){
      window.VIBERUN_BM_STORE_UI.open();
    } else if(typeof toast === "function") {
      toast("월영당을 불러오지 못했습니다.", "error");
    } else if(typeof window.showToast === "function") {
      window.showToast("월영당을 불러오지 못했습니다.", "error");
    }
  }

  function setVisible(visible){
    if(!ensureElements()) return;
    walletEl.hidden = !visible;
    walletEl.style.display = visible ? "" : "none";
  }

  function render(wallet){
    if(!ensureElements()) return;
    const source = wallet || (window.VIBERUN_WALLET && window.VIBERUN_WALLET.getCachedWallet
      ? window.VIBERUN_WALLET.getCachedWallet()
      : null);
    const moonShards = source && typeof source.moonShards !== "undefined" ? source.moonShards : 0;
    countEl.textContent = formatCount(moonShards);
  }

  function refresh(){
    if(!ensureElements()) return;

    if(!isLoggedIn()){
      render({ moonShards: 0 });
      setVisible(false);
      return;
    }

    setVisible(true);
    render();

    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.fetchWallet === "function"){
      Promise.resolve(window.VIBERUN_WALLET.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet) render(result.wallet);
      }).catch(error => {
        console.warn("[WalletUI] wallet 조회 중 오류가 발생했습니다.", error);
      });
    }
  }

  window.VIBERUN_WALLET_UI = {
    refresh,
    setVisible,
    render
  };

  window.addEventListener("viberun:wallet-changed", event => {
    const wallet = event && event.detail ? event.detail.wallet : null;
    render(wallet || { moonShards: 0 });
    setVisible(isLoggedIn());
  });

  window.addEventListener("viberun:auth-changed", () => {
    refresh();
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
