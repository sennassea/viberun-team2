"use strict";

/* =========================================================================
   Login Modal
   - 새 게임/이어하기 진입 전 계정 선택을 받는 1차 UI입니다.
   - Guest와 외부 provider 로그인 결과를 같은 성공 콜백 흐름으로 전달합니다.
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
    clearLoginMessage();
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
          '<button type="button" class="auth-login-button auth-login-google">Google</button>' +
          '<button type="button" class="auth-login-button auth-login-facebook">Facebook</button>' +
          '<button type="button" class="auth-login-button auth-login-guest">Guest로 시작</button>' +
        '</div>' +
        '<div class="auth-login-message" role="alert" aria-live="polite"></div>' +
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

  /* 로그인 성공 후 모달 상태를 정리하고, 새 게임/이어하기에서 넘겨준 원래 콜백을 이어서 실행합니다. */
  function finishLoginSuccess(){
    const onSuccess = successCallback;
    close(false);
    successCallback = null;
    cancelCallback = null;
    if(typeof onSuccess === "function") onSuccess();
  }

  /* provider 로그인 중 중복 클릭을 막아 SDK 팝업/네이티브 브리지가 여러 번 뜨는 상황을 방지합니다. */
  function setPending(isPending){
    if(!modal) return;
    Array.from(modal.querySelectorAll(".auth-login-button, .auth-login-close")).forEach(button => {
      button.disabled = !!isPending;
    });
  }

  /* Guest 선택 시 authService에 세션 생성을 맡기고, 성공 후 원래 게임 흐름 콜백을 실행합니다. */
  function signInGuest(){
    clearLoginMessage();
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.signInGuest !== "function"){
      showLoginMessage("로그인 서비스를 불러올 수 없습니다.", "error");
      return;
    }

    try {
      setPending(true);
      Promise.resolve(window.VIBERUN_AUTH.signInGuest()).then(result => {
        if(!result || !result.ok){
          showLoginMessage((result && result.message) || "Guest 계정 로그인에 실패했습니다.", "error");
          return;
        }

        clearLoginMessage();
        finishLoginSuccess();
      }).catch(error => {
        console.warn("[Auth] Guest 로그인 처리 중 오류가 발생했습니다.", error);
        showLoginMessage("Guest 계정 로그인에 실패했습니다.", "error");
      }).finally(() => {
        setPending(false);
      });
    } catch(error) {
      setPending(false);
      console.warn("[Auth] Guest 로그인 호출 중 오류가 발생했습니다.", error);
      showLoginMessage("Guest 계정 로그인에 실패했습니다.", "error");
    }
  }
  function signInGooglePlay(){
    signInProvider("signInGooglePlay", "Google");
  }

  function signInFacebook(){
    signInProvider("signInFacebook", "Facebook");
  }

  /* 외부 SDK/앱 브리지 로그인은 비동기일 수 있으므로 Promise로 감싸 결과를 표준 처리합니다. */
  function signInProvider(methodName, label){
    clearLoginMessage();
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH[methodName] !== "function"){
      showLoginMessage(label + " 로그인 서비스를 불러올 수 없습니다.", "error");
      return;
    }

    setPending(true);
    Promise.resolve(window.VIBERUN_AUTH[methodName]()).then(result => {
      if(!result || !result.ok){
        const message = normalizeLoginErrorMessage(result, label);
        showLoginMessage(message.text, message.type);
        return;
      }

      clearLoginMessage();
      finishLoginSuccess();
    }).catch(error => {
      console.warn("[Auth] " + label + " 로그인 처리 중 오류가 발생했습니다.", error);
      const message = normalizeLoginErrorMessage({ message: error && error.message }, label);
      showLoginMessage(message.text, message.type);
    }).finally(() => {
      setPending(false);
    });
  }

  /* SDK별 실패 원인을 사용자가 이해하기 쉬운 고정 문구로 정리합니다. */
  function normalizeLoginErrorMessage(result, label){
    if(result && result.code === "ACCOUNT_ALREADY_LINKED"){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    if(result && result.code === "OAUTH_REDIRECT"){
      return { text: (result.message || "로그인 페이지로 이동합니다."), type: "info" };
    }
    const rawMessage = result && result.message ? String(result.message) : "";
    if(rawMessage.includes("이미 다른 계정에 연결된 로그인")){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    if(rawMessage.includes("Android 모바일 빌드")){
      return { text: "Google Play 로그인은 Android 모바일 빌드에서 사용할 수 있습니다.", type: "info" };
    }
    if(rawMessage.includes("취소")){
      return { text: "로그인이 취소되었습니다.", type: "info" };
    }
    if(rawMessage.includes("이미") && rawMessage.includes("연결")){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    if(rawMessage.includes("서버") || rawMessage.includes("네트워크")){
      return { text: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.", type: "error" };
    }
    if(label === "Facebook"){
      return { text: "Facebook 로그인에 실패했습니다. 다시 시도해 주세요.", type: "error" };
    }
    if(label === "Google" || label === "Google Play"){
      return { text: "Google 로그인에 실패했습니다. 다시 시도해 주세요.", type: "error" };
    }
    return { text: rawMessage || "로그인에 실패했습니다. 다시 시도해 주세요.", type: "error" };
  }

  /* 로그인 관련 안내는 전역 toast 대신 모달 내부에 표시해 오버레이 뒤로 가려지지 않게 합니다. */
  function showLoginMessage(message, type){
    const messageEl = modal && modal.querySelector(".auth-login-message");
    if(!messageEl){
      console.warn("[LoginModal] message element not found:", message);
      return;
    }

    messageEl.textContent = message;
    messageEl.classList.add("is-visible");
    messageEl.classList.toggle("auth-login-message--error", type !== "info");
    messageEl.classList.toggle("auth-login-message--info", type === "info");
  }

  function clearLoginMessage(){
    const messageEl = modal && modal.querySelector(".auth-login-message");
    if(!messageEl) return;

    messageEl.textContent = "";
    messageEl.classList.remove("is-visible", "auth-login-message--error", "auth-login-message--info");
  }

  window.VIBERUN_LOGIN_MODAL = {
    open,
    close
  };
})();
