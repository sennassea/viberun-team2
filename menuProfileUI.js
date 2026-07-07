"use strict";

/* =========================================================================
   Menu Profile UI
   - 메인메뉴 좌상단 프로필 아이콘 UI입니다.
   - 체력바/재화 등 전투용 상태 수치는 표시하지 않고, 프로필 아이콘 + 이름만 다룹니다.
   - 스킨 실소유 여부는 서버의 characterSkins.ownedSkinIds만 기준으로 판단하며,
     구매만 하고 선물함에서 수령하지 않은 스킨은 목록에 노출하지 않습니다.
   - 이번 단계에서는 equippedSkinId 저장 + 메인메뉴 프로필 아이콘 반영까지만 담당하며,
     전투 화면 캐릭터 외형은 변경하지 않습니다.
   ========================================================================= */
(function(){
  const DEFAULT_PROFILE_ICON = "assets/profile/profile_default.png";
  const DEFAULT_PROFILE_LABEL = "기본";

  let rootEl = null;
  let avatarBtnEl = null;
  let avatarImgEl = null;
  let nameEl = null;
  let popupEl = null;

  let cachedState = null;
  let isApplying = false;

  function isLoggedIn(){
    const auth = window.VIBERUN_AUTH;
    return !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());
  }

  function getService(){
    return window.VIBERUN_BM_STORE_SERVICE || null;
  }

  function getStoreData(){
    return window.VIBERUN_BM_STORE_DATA || null;
  }

  function getServerProfile(){
    const userData = window.VIBERUN_USER_DATA;
    if(!userData || typeof userData.getCachedProfile !== "function") return null;
    return userData.getCachedProfile();
  }

  function getDisplayName(profileState){
    const serverProfile = getServerProfile();
    if(serverProfile && serverProfile.nickname) return serverProfile.nickname;
    return (profileState && profileState.displayName) || "빛솔이";
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
    console.log("[MenuProfileUI]", message);
  }

  function ensureElements(){
    rootEl = rootEl || document.querySelector(".menu-profile");
    if(!rootEl) return false;

    avatarBtnEl = avatarBtnEl || rootEl.querySelector(".menu-profile-avatar-btn");
    avatarImgEl = avatarImgEl || rootEl.querySelector(".menu-profile-avatar");
    nameEl = nameEl || rootEl.querySelector(".menu-profile-name");
    popupEl = popupEl || rootEl.querySelector(".menu-profile-popup");

    if(!avatarBtnEl || !avatarImgEl || !nameEl || !popupEl){
      console.warn("[MenuProfileUI] 필수 DOM 요소를 찾을 수 없습니다.");
      return false;
    }

    if(!rootEl.dataset.bound){
      rootEl.dataset.bound = "true";
      avatarBtnEl.addEventListener("click", handleAvatarClick);
      document.addEventListener("click", closePopupOnOutsideClick);

      const defaultButton = popupEl.querySelector(".menu-profile-option.is-default");
      if(defaultButton){
        defaultButton.addEventListener("click", () => handleOptionClick(null));
      }
    }

    bindNicknameClick();

    return true;
  }

  /* 닉네임 클릭 시 메인/전투 공통 닉네임 변경 모달을 엽니다. 스킨 적용 로직과는 무관합니다. */
  function bindNicknameClick(){
    if(!nameEl || nameEl.dataset.nicknameBound) return;

    nameEl.dataset.nicknameBound = "true";
    nameEl.setAttribute("role", "button");
    nameEl.setAttribute("tabindex", "0");
    nameEl.title = "닉네임 변경";

    const openNicknameUI = () => {
      if(window.VIBERUN_NICKNAME_UI && typeof window.VIBERUN_NICKNAME_UI.open === "function"){
        window.VIBERUN_NICKNAME_UI.open();
      }
    };

    nameEl.addEventListener("click", openNicknameUI);
    nameEl.addEventListener("keydown", event => {
      if(event.key === "Enter" || event.key === " "){
        event.preventDefault();
        openNicknameUI();
      }
    });
  }

  function setVisible(visible){
    if(!ensureElements()) return;
    rootEl.hidden = !visible;
    rootEl.style.display = visible ? "" : "none";
    if(!visible) togglePopup(false);
  }

  function togglePopup(forceOpen){
    if(!ensureElements()) return;
    const nextOpen = typeof forceOpen === "boolean" ? forceOpen : popupEl.hidden;
    popupEl.hidden = !nextOpen;
    rootEl.classList.toggle("is-open", nextOpen);
  }

  function handleAvatarClick(event){
    event.stopPropagation();
    togglePopup();
  }

  function closePopupOnOutsideClick(event){
    if(!rootEl || popupEl.hidden) return;
    if(rootEl.contains(event.target)) return;
    togglePopup(false);
  }

  /* 보유 중인 스킨의 프로필 아이콘만 골라 정렬합니다.
     구매만 하고 선물함 미수령인 스킨은 ownedSkinIds에 없으므로 자연히 제외됩니다. */
  function getOwnedProfileOptions(ownedSkinIds){
    const data = getStoreData();
    if(!data || typeof data.getCharacterSkinProducts !== "function") return [];

    const owned = Array.isArray(ownedSkinIds) ? ownedSkinIds : [];
    return data.getCharacterSkinProducts()
      .filter(product => product.skinId && owned.includes(product.skinId) && product.profileIcon)
      .sort((a, b) => (Number(a.profileSortOrder) || 0) - (Number(b.profileSortOrder) || 0));
  }

  function renderProfileOptions(ownedSkins, equippedSkinId){
    if(!ensureElements()) return;

    const defaultButton = popupEl.querySelector(".menu-profile-option.is-default");
    if(defaultButton){
      defaultButton.classList.toggle("is-selected", !equippedSkinId);
    }

    popupEl.querySelectorAll(".menu-profile-option:not(.is-default)").forEach(el => el.remove());

    ownedSkins.forEach(product => {
      const optionEl = document.createElement("button");
      optionEl.type = "button";
      optionEl.className = "menu-profile-option";
      optionEl.dataset.skinId = product.skinId;
      if(product.skinId === equippedSkinId) optionEl.classList.add("is-selected");

      const imgEl = document.createElement("img");
      imgEl.src = product.profileIcon;
      imgEl.alt = "";

      const labelEl = document.createElement("span");
      labelEl.textContent = product.profileLabel || product.name || "";

      optionEl.appendChild(imgEl);
      optionEl.appendChild(labelEl);
      optionEl.addEventListener("click", () => handleOptionClick(product.skinId));

      popupEl.appendChild(optionEl);
    });
  }

  function renderProfile(profileState){
    if(!ensureElements()) return;

    const currentProfileIcon = (profileState && profileState.currentProfileIcon) || DEFAULT_PROFILE_ICON;
    avatarImgEl.src = currentProfileIcon;
    nameEl.textContent = getDisplayName(profileState);
  }

  function handleOptionClick(skinId){
    if(isApplying) return;
    if(cachedState && cachedState.profile && (cachedState.profile.equippedSkinId || null) === (skinId || null)){
      togglePopup(false);
      return;
    }

    const service = getService();
    if(!service || typeof service.equipCharacterSkinProfile !== "function"){
      showToastMessage("스킨을 적용할 수 없습니다.", "error");
      return;
    }

    isApplying = true;
    Promise.resolve(service.equipCharacterSkinProfile(skinId || null)).then(result => {
      isApplying = false;

      if(!result || !result.ok){
        if(result && result.code === "CHARACTER_SKIN_NOT_OWNED"){
          showToastMessage("보유하지 않은 스킨입니다.", "error");
        } else {
          showToastMessage((result && result.message) || "스킨 적용에 실패했습니다.", "error");
        }
        return;
      }

      applyResultState(result);
      togglePopup(false);
      showToastMessage("스킨이 적용되었습니다.", "success");
      window.dispatchEvent(new CustomEvent("viberun:character-skin-changed"));
    }).catch(error => {
      isApplying = false;
      console.warn("[MenuProfileUI] 스킨 적용 중 오류가 발생했습니다.", error);
      showToastMessage("스킨 적용에 실패했습니다.", "error");
    });
  }

  function applyResultState(result){
    cachedState = {
      profile: result.profile || null,
      characterSkins: result.characterSkins || null
    };

    renderProfile(cachedState.profile);

    const ownedSkinIds = cachedState.characterSkins ? cachedState.characterSkins.ownedSkinIds : [];
    const equippedSkinId = cachedState.profile ? cachedState.profile.equippedSkinId : null;
    renderProfileOptions(getOwnedProfileOptions(ownedSkinIds), equippedSkinId);
  }

  const FALLBACK_PROFILE = {
    displayName: "빛솔이",
    equippedSkinId: null,
    currentProfileIcon: DEFAULT_PROFILE_ICON
  };

  function refresh(){
    if(!ensureElements()) return;

    if(!isLoggedIn()){
      setVisible(false);
      return;
    }

    setVisible(true);

    const service = getService();
    if(!service || typeof service.fetchCharacterSkinProfileState !== "function"){
      renderProfile(FALLBACK_PROFILE);
      renderProfileOptions([], null);
      return;
    }

    Promise.resolve(service.fetchCharacterSkinProfileState()).then(result => {
      if(!result || !result.ok){
        renderProfile(FALLBACK_PROFILE);
        renderProfileOptions([], null);
        return;
      }

      cachedState = {
        profile: result.profile || FALLBACK_PROFILE,
        characterSkins: result.characterSkins || null
      };

      renderProfile(cachedState.profile);

      const ownedSkinIds = cachedState.characterSkins ? cachedState.characterSkins.ownedSkinIds : [];
      renderProfileOptions(getOwnedProfileOptions(ownedSkinIds), cachedState.profile.equippedSkinId);
    }).catch(error => {
      console.warn("[MenuProfileUI] 프로필 상태 조회 실패", error);
      renderProfile(FALLBACK_PROFILE);
      renderProfileOptions([], null);
    });
  }

  /* 전투화면이 진입 시점에 동기적으로 참조하는 현재 적용 스킨 ID입니다.
     menuProfileUI가 이미 캐시해 둔 값을 그대로 돌려주며, 새 네트워크 요청은 하지 않습니다. */
  function getEquippedSkinId(){
    return (cachedState && cachedState.profile) ? (cachedState.profile.equippedSkinId || null) : null;
  }

  window.VIBERUN_MENU_PROFILE_UI = {
    refresh,
    getEquippedSkinId
  };

  window.addEventListener("viberun:auth-changed", refresh);
  window.addEventListener("viberun:mailbox-changed", refresh);
  window.addEventListener("viberun:profile-nickname-changed", event => {
    const nickname = event.detail && event.detail.nickname;
    if(!ensureElements() || !nickname) return;
    nameEl.textContent = nickname;
  });
  window.addEventListener("viberun:user-data-changed", event => {
    const profile = event.detail && event.detail.profile;
    if(!ensureElements() || !profile || !profile.nickname) return;
    nameEl.textContent = profile.nickname;
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
