"use strict";

/* =========================================================================
   Login Modal
   - 새 게임/이어하기 진입 전 계정 선택을 받는 1차 UI입니다.
   - Guest만 실제 세션을 생성하고, 외부 계정은 준비 중 안내만 표시합니다.
   ========================================================================= */
(function(){
  let modal = null;
  let successCallback = null;
  let cancelCallback = null;

  /* startMenu/settingsViewer에서 호출하는 진입점입니다. 모달은 1회 생성 후 재사용합니다. */
  function open(options){
    const config = options || {};
    successCallback = typeof config.onSuccess === "function" ? config.onSuccess : null;
    cancelCallback = typeof config.onCancel === "function" ? config.onCancel : null;

    if(!modal) modal = createModal();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    const guestButton = modal.querySelector(".auth-login-guest");
    if(guestButton) guestButton.focus();
  }

  function close(wasCancelled){
    if(!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");

    if(wasCancelled && cancelCallback) cancelCallback();
    if(wasCancelled){
      successCallback = null;
      cancelCallback = null;
    }
  }

  /* 로그인 선택 UI를 동적으로 구성해 기존 시작 화면 DOM 구조를 변경하지 않습니다. */
  function createModal(){
    const overlay = document.createElement("div");
    overlay.id = "authLoginModal";
    overlay.className = "auth-login-modal";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="auth-login-panel" role="dialog" aria-modal="true" aria-labelledby="authLoginTitle">' +
        '<div class="auth-login-head">' +
          '<h2 id="authLoginTitle">계정 선택</h2>' +
          '<button type="button" class="auth-login-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<p class="auth-login-desc">플레이 데이터를 저장하고 보상을 받기 위해 계정을 선택해 주세요.</p>' +
        '<div class="auth-login-actions">' +
          '<button type="button" class="auth-login-button auth-login-google">Google Play</button>' +
          '<button type="button" class="auth-login-button auth-login-facebook">Facebook</button>' +
          '<button type="button" class="auth-login-button auth-login-guest">Guest로 시작</button>' +
        '</div>' +
        '<p class="auth-login-note">Guest 계정은 앱/브라우저 데이터 삭제 시 복구할 수 없습니다.</p>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) close(true);
    });
    overlay.querySelector(".auth-login-close").addEventListener("click", () => close(true));
    overlay.querySelector(".auth-login-guest").addEventListener("click", signInGuest);
    overlay.querySelector(".auth-login-google").addEventListener("click", signInGooglePlay);
    overlay.querySelector(".auth-login-facebook").addEventListener("click", signInFacebook);
    document.addEventListener("keydown", event => {
      if(event.key !== "Escape" || !overlay.classList.contains("show")) return;
      close(true);
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);
    return overlay;
  }

  /* Guest 선택 시 authService에 세션 생성을 맡기고, 성공 후 원래 게임 흐름 콜백을 실행합니다. */
  function signInGuest(){
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.signInGuest !== "function"){
      showMessage("로그인 서비스를 불러올 수 없습니다.");
      return;
    }

    try {
      const result = window.VIBERUN_AUTH.signInGuest();
      if(!result || !result.ok){
        showMessage((result && result.message) || "Guest 로그인에 실패했습니다.");
        return;
      }

      const onSuccess = successCallback;
      close(false);
      successCallback = null;
      cancelCallback = null;
      if(typeof onSuccess === "function") onSuccess();
    } catch(error) {
      console.warn("[Auth] Guest 로그인 처리 중 오류가 발생했습니다.", error);
      showMessage("Guest 로그인에 실패했습니다.");
    }
  }

  function signInGooglePlay(){
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.signInGooglePlay === "function"){
      window.VIBERUN_AUTH.signInGooglePlay();
    }
    showMessage("아직 준비 중입니다.");
  }

  function signInFacebook(){
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.signInFacebook === "function"){
      window.VIBERUN_AUTH.signInFacebook();
    }
    showMessage("아직 준비 중입니다.");
  }

  /* 기존 toast가 있으면 재사용하고, 초기 로딩 상황에서는 시작 화면 알림/alert로 안전하게 대체합니다. */
  function showMessage(message){
    if(typeof toast === "function"){
      toast(message);
      return;
    }
    if(typeof showStartNotice === "function"){
      showStartNotice(message);
      return;
    }
    window.alert(message);
  }

  window.VIBERUN_LOGIN_MODAL = {
    open,
    close
  };
})();
