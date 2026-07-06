"use strict";

/* =========================================================================
   Nickname UI
   - 메인화면/전투화면 공통 닉네임 변경 모달입니다.
   - 전투 상태, 스킨 구매/장착, 월영의 약속 로직에는 관여하지 않습니다.
   ========================================================================= */
(function(){
  const DEFAULT_NICKNAME = "빛솔이";

  let rootEl = null;
  let inputEl = null;
  let errorEl = null;
  let confirmBtn = null;
  let cancelBtn = null;
  let backdropEl = null;
  let isSubmitting = false;
  let cachedProfile = null;

  function getService(){
    return window.VIBERUN_BM_STORE_SERVICE || null;
  }

  function isLoggedIn(){
    const auth = window.VIBERUN_AUTH;
    return !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());
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
    console.log("[NicknameUI]", message);
  }

  function ensureElements(){
    rootEl = rootEl || document.querySelector(".nickname-modal");
    if(!rootEl) return false;

    inputEl = inputEl || rootEl.querySelector(".nickname-modal-input");
    errorEl = errorEl || rootEl.querySelector(".nickname-modal-error");
    confirmBtn = confirmBtn || rootEl.querySelector(".nickname-modal-confirm");
    cancelBtn = cancelBtn || rootEl.querySelector(".nickname-modal-cancel");
    backdropEl = backdropEl || rootEl.querySelector(".nickname-modal-backdrop");

    if(!inputEl || !errorEl || !confirmBtn || !cancelBtn || !backdropEl){
      console.warn("[NicknameUI] 필수 DOM 요소를 찾을 수 없습니다.");
      return false;
    }

    if(!rootEl.dataset.bound){
      rootEl.dataset.bound = "true";

      confirmBtn.addEventListener("click", submit);
      cancelBtn.addEventListener("click", close);
      backdropEl.addEventListener("click", close);

      inputEl.addEventListener("keydown", event => {
        if(event.key === "Enter") submit();
        if(event.key === "Escape") close();
      });
    }

    return true;
  }

  function countNicknameLength(nickname){
    return Array.from(String(nickname || "").trim()).length;
  }

  function sanitizeNickname(rawNickname){
    return String(rawNickname || "").trim().replace(/\s+/g, " ");
  }

  function validateNickname(rawNickname){
    const nickname = sanitizeNickname(rawNickname);
    const length = countNicknameLength(nickname);

    if(length < 2){
      return { ok: false, message: "닉네임은 최소 2글자 이상이어야 합니다." };
    }
    if(length > 8){
      return { ok: false, message: "닉네임은 최대 8글자까지 가능합니다." };
    }
    return { ok: true, nickname };
  }

  function setError(message){
    if(!ensureElements()) return;

    if(message){
      errorEl.hidden = false;
      errorEl.textContent = message;
    } else {
      errorEl.hidden = true;
      errorEl.textContent = "";
    }
  }

  function setSubmitting(submitting){
    isSubmitting = submitting;
    if(!ensureElements()) return;

    confirmBtn.disabled = submitting;
    cancelBtn.disabled = submitting;
    confirmBtn.textContent = submitting ? "변경 중..." : "변경";
  }

  function refreshCache(){
    if(!isLoggedIn()) return;

    const service = getService();
    if(!service || typeof service.fetchProfileStatus !== "function") return;

    Promise.resolve(service.fetchProfileStatus()).then(result => {
      if(result && result.ok && result.profile){
        cachedProfile = result.profile;
        window.dispatchEvent(new CustomEvent("viberun:profile-nickname-changed", {
          detail: { nickname: cachedProfile.nickname, profile: cachedProfile }
        }));
      }
    }).catch(error => {
      console.warn("[NicknameUI] 프로필 상태 조회 실패", error);
    });
  }

  function open(){
    if(!ensureElements()) return;

    rootEl.hidden = false;
    rootEl.style.display = "";
    setError("");
    setSubmitting(false);

    const service = getService();
    const fallbackNickname = (cachedProfile && cachedProfile.nickname) || DEFAULT_NICKNAME;

    if(service && typeof service.fetchProfileStatus === "function"){
      Promise.resolve(service.fetchProfileStatus()).then(result => {
        if(result && result.ok && result.profile){
          cachedProfile = result.profile;
          inputEl.value = result.profile.nickname || DEFAULT_NICKNAME;
        } else {
          inputEl.value = fallbackNickname;
        }
        inputEl.focus();
        inputEl.select();
      }).catch(error => {
        console.warn("[NicknameUI] 프로필 상태 조회 실패", error);
        inputEl.value = fallbackNickname;
        inputEl.focus();
        inputEl.select();
      });
    } else {
      inputEl.value = fallbackNickname;
      inputEl.focus();
      inputEl.select();
    }
  }

  function close(){
    if(!ensureElements()) return;
    if(isSubmitting) return;

    rootEl.hidden = true;
    rootEl.style.display = "none";
    setError("");
  }

  function submit(){
    if(isSubmitting || !ensureElements()) return;

    const validation = validateNickname(inputEl.value);
    if(!validation.ok){
      setError(validation.message);
      return;
    }

    const service = getService();
    if(!service || typeof service.updateProfileNickname !== "function"){
      setError("닉네임 변경 기능을 사용할 수 없습니다.");
      return;
    }

    setSubmitting(true);
    setError("");

    Promise.resolve(service.updateProfileNickname(validation.nickname)).then(result => {
      setSubmitting(false);

      if(!result || !result.ok){
        setError((result && result.message) || "닉네임 변경에 실패했습니다.");
        return;
      }

      cachedProfile = result.profile || { nickname: validation.nickname };

      window.dispatchEvent(new CustomEvent("viberun:profile-nickname-changed", {
        detail: { nickname: cachedProfile.nickname, profile: cachedProfile }
      }));

      showToastMessage(result.message || "닉네임이 변경되었습니다.", "success");
      close();
    }).catch(error => {
      console.warn("[NicknameUI] 닉네임 변경 실패", error);
      setSubmitting(false);
      setError("닉네임 변경에 실패했습니다.");
    });
  }

  function getCachedNickname(){
    return (cachedProfile && cachedProfile.nickname) || null;
  }

  window.VIBERUN_NICKNAME_UI = {
    open,
    close,
    getCachedNickname
  };

  window.addEventListener("viberun:auth-changed", refreshCache);

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => {
      ensureElements();
      refreshCache();
    });
  } else {
    ensureElements();
    refreshCache();
  }
})();
