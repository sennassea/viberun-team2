"use strict";

/* =========================================================================
   Monthly Pass Claim UI
   - 메인메뉴 좌하단 월영의 약속 일일 보상 수령 UI
   - 계정용 달빛조각 wallet만 갱신한다.
   - 전투/런 진행 데이터는 절대 수정하지 않는다.
   ========================================================================= */
(function(){
  let rootEl = null;
  let ddayEl = null;
  let rewardTextEl = null;
  let claimButtonEl = null;
  let cachedStatus = null;
  let isClaiming = false;

  function isLoggedIn(){
    const auth = window.VIBERUN_AUTH;
    return !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());
  }

  function getService(){
    return window.VIBERUN_BM_STORE_SERVICE || null;
  }

  function showToastMessage(message, type){
    if(typeof toast === "function"){
      toast(message, type || "info");
      return;
    }

    if(typeof window.showToast === "function"){
      window.showToast(message, type || "info");
      return;
    }

    console.log("[MonthlyPassUI]", message);
  }

  function ensureElements(){
    rootEl = rootEl || document.querySelector(".monthly-pass-claim-card");

    if(!rootEl){
      return false;
    }

    ddayEl = ddayEl || rootEl.querySelector(".monthly-pass-claim-dday");
    rewardTextEl = rewardTextEl || rootEl.querySelector(".monthly-pass-claim-text");
    claimButtonEl = claimButtonEl || rootEl.querySelector(".monthly-pass-claim-button");

    if(!ddayEl || !rewardTextEl || !claimButtonEl){
      console.warn("[MonthlyPassUI] 필수 DOM 요소를 찾을 수 없습니다.");
      return false;
    }

    if(!rootEl.dataset.bound){
      rootEl.dataset.bound = "true";
      claimButtonEl.addEventListener("click", handleClaimClick);
    }

    return true;
  }

  function setVisible(visible){
    if(!ensureElements()) return;

    rootEl.hidden = !visible;
    rootEl.style.display = visible ? "" : "none";
  }

  /* 미구매 상태에서 사용할 기본 표시값입니다. 실제 monthlyPass 레코드를 만들지 않고
     화면 안내용으로만 쓰이며, 구매/지급 관련 서버 로직에는 영향을 주지 않습니다. */
  function isExpiredMonthlyPass(status){
    if(!status) return false;

    const expiresAt = Number(status.expiresAt) || 0;
    return !!expiresAt && expiresAt <= Date.now();
  }

  function render(monthlyPass){
    if(!ensureElements()) return;

    cachedStatus = monthlyPass || null;

    setVisible(true);

    if(isExpiredMonthlyPass(cachedStatus)){
      ddayEl.textContent = "D-0";
      rewardTextEl.textContent = "달빛조각 x15";

      claimButtonEl.disabled = false;
      claimButtonEl.textContent = "다시 구매";

      rootEl.classList.remove("is-claimable", "is-claimed", "is-not-purchased");
      rootEl.classList.add("is-expired");
      return;
    }

    if(!cachedStatus || !cachedStatus.active){
      ddayEl.textContent = "D-30";
      rewardTextEl.textContent = "달빛조각 x15";

      claimButtonEl.disabled = false;
      claimButtonEl.textContent = "구매하기";

      rootEl.classList.remove("is-claimable", "is-claimed", "is-expired");
      rootEl.classList.add("is-not-purchased");
      return;
    }

    const daysRemaining = Math.max(0, Number(cachedStatus.daysRemaining) || 0);
    const rewardAmount = Math.max(0, Number(cachedStatus.todayRewardAmount || cachedStatus.dailyRewardAmount) || 15);

    ddayEl.textContent = "D-" + daysRemaining;
    rewardTextEl.textContent = "달빛조각 x" + rewardAmount;

    claimButtonEl.disabled = false;
    claimButtonEl.classList.remove("is-claimed", "is-disabled");
    rootEl.classList.remove("is-not-purchased", "is-expired");

    if(cachedStatus.canClaimToday){
      claimButtonEl.textContent = "받기";
      rootEl.classList.add("is-claimable");
      rootEl.classList.remove("is-claimed");
    } else {
      claimButtonEl.textContent = "수령 완료";
      claimButtonEl.disabled = true;
      claimButtonEl.classList.add("is-claimed");
      rootEl.classList.remove("is-claimable");
      rootEl.classList.add("is-claimed");
    }
  }

  const FALLBACK_STATUS = {
    active: false,
    daysRemaining: 30,
    dailyRewardAmount: 15,
    todayRewardAmount: 15,
    canClaimToday: false
  };

  function refresh(){
    if(!ensureElements()) return;

    if(!isLoggedIn()){
      setVisible(false);
      return;
    }

    const service = getService();

    if(!service || typeof service.fetchMonthlyPassStatus !== "function"){
      render(FALLBACK_STATUS);
      return;
    }

    Promise.resolve(service.fetchMonthlyPassStatus()).then(result => {
      if(!result || !result.ok){
        render(FALLBACK_STATUS);
        return;
      }

      render(result.monthlyPass);
    }).catch(error => {
      console.warn("[MonthlyPassUI] 월영의 약속 상태 조회 실패", error);
      render(FALLBACK_STATUS);
    });
  }

  /* 미구매/비활성/만료 상태에서 구매하기·다시 구매 클릭 시 호출됩니다.
     월영당을 추천 탭으로 열어 구매를 유도할 뿐, 구매 API를 직접 호출하지 않습니다. */
  function openMonthlyPassPurchase(){
    if(window.VIBERUN_BM_STORE_UI){
      if(typeof window.VIBERUN_BM_STORE_UI.open === "function"){
        window.VIBERUN_BM_STORE_UI.open("recommended");
        return;
      }

      if(typeof window.VIBERUN_BM_STORE_UI.show === "function"){
        window.VIBERUN_BM_STORE_UI.show("recommended");
        return;
      }
    }

    showToastMessage("월영당에서 월영의 약속을 구매할 수 있습니다.", "info");
  }

  function refreshWallet(wallet){
    if(!wallet) return;

    if(window.VIBERUN_WALLET_UI && typeof window.VIBERUN_WALLET_UI.render === "function"){
      window.VIBERUN_WALLET_UI.render(wallet);
    }

    window.dispatchEvent(new CustomEvent("viberun:wallet-changed", {
      detail: { wallet }
    }));
  }

  function handleClaimClick(){
    if(isClaiming) return;

    if(!cachedStatus || !cachedStatus.active || isExpiredMonthlyPass(cachedStatus)){
      openMonthlyPassPurchase();
      return;
    }

    if(!cachedStatus.canClaimToday){
      showToastMessage("오늘 보상은 이미 수령했습니다.", "info");
      return;
    }

    const service = getService();

    if(!service || typeof service.claimMonthlyPassDailyReward !== "function"){
      showToastMessage("월영의 약속 보상을 받을 수 없습니다.", "error");
      return;
    }

    isClaiming = true;
    claimButtonEl.disabled = true;
    claimButtonEl.textContent = "수령 중";

    Promise.resolve(service.claimMonthlyPassDailyReward()).then(result => {
      isClaiming = false;

      if(!result || !result.ok){
        showToastMessage((result && result.message) || "보상 수령에 실패했습니다.", "error");
        refresh();
        return;
      }

      if(result.wallet){
        refreshWallet(result.wallet);
      }

      if(result.monthlyPass){
        render(result.monthlyPass);
      } else {
        refresh();
      }

      const amount = result.reward && result.reward.amount
        ? result.reward.amount
        : 15;

      showToastMessage("달빛조각 " + amount + "개를 받았습니다.", "success");
    }).catch(error => {
      isClaiming = false;
      console.warn("[MonthlyPassUI] 월영의 약속 보상 수령 실패", error);
      showToastMessage("보상 수령에 실패했습니다.", "error");
      refresh();
    });
  }

  window.VIBERUN_MONTHLY_PASS_UI = {
    refresh,
    render,
    setVisible
  };

  window.addEventListener("viberun:auth-changed", refresh);
  window.addEventListener("viberun:mailbox-changed", refresh);

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
