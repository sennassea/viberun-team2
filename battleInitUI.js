"use strict";
/* =========================================================================
   전투 초기화 UI 레이어 — battleInit.js에서 분리된 화면 표시 전용 함수.
   전투 스탯/상태 초기화(S 객체 생성, 몬스터 배치)는 battleInit.js에
   남아있고, 이 파일은 스킨/배경 이미지 표시와 시작 힌트 문구만 담당한다.
   renderPlayerPortraitIcon/resolveBattleStanding* 함수는 전투 성능·판정에
   전혀 관여하지 않고 표시용 이미지 경로만 결정하며, 상점/기도터/이벤트 등
   전투 밖 다른 화면에서도 공용으로 호출된다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

function getEquippedSkinIdForBattle(){
  const menuProfileUI = window.VIBERUN_MENU_PROFILE_UI;
  if(menuProfileUI && typeof menuProfileUI.getEquippedSkinId === "function"){
    return menuProfileUI.getEquippedSkinId() || null;
  }
  return null;
}

function resolveBattleProfileIcon(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultProfileIcon === "function")
    ? storeData.getDefaultProfileIcon()
    : "assets/profile/profile_default.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleProfileIcon) || fallback;
}

/* 전투/상점/기도터/이벤트 좌상단 카드의 프로필 아이콘을 동일한 방식(장착 스킨 이미지)으로
   렌더링합니다. 노드별로 이모지("👼")를 대신 표시하던 것을 이 함수로 통일합니다. */
function renderPlayerPortraitIcon(portraitEl){
  if(!portraitEl) return;
  const equippedSkinId = (typeof S !== "undefined" && S && S.playerAppearance) ? S.playerAppearance.equippedSkinId : null;
  const iconSrc = resolveBattleProfileIcon(equippedSkinId);

  let imgEl = portraitEl.querySelector("img");
  if(!imgEl){
    portraitEl.textContent = "";
    imgEl = document.createElement("img");
    imgEl.alt = "";
    imgEl.addEventListener("error", () => {
      const fallback = resolveBattleProfileIcon(null);
      if(imgEl.getAttribute("src") !== fallback) imgEl.src = fallback;
    });
    portraitEl.appendChild(imgEl);
  }
  if(imgEl.getAttribute("src") !== iconSrc) imgEl.src = iconSrc;
}

function resolveBattleStandingImage(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImage === "function")
    ? storeData.getDefaultBattleStandingImage()
    : "assets/characters/player-temp-cutout.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImage) || fallback;
}

function resolveBattleStandingImageAttack(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImageAttack === "function")
    ? storeData.getDefaultBattleStandingImageAttack()
    : "assets/characters/player-temp-cutout-attack.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImageAttack) || fallback;
}

function resolveBattleStandingImageDamage(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImageDamage === "function")
    ? storeData.getDefaultBattleStandingImageDamage()
    : "assets/characters/player-temp-cutout-damage.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImageDamage) || fallback;
}

function resolveBattleStandingImageBlock(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImageBlock === "function")
    ? storeData.getDefaultBattleStandingImageBlock()
    : "assets/characters/player-temp-cutout-block.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImageBlock) || fallback;
}

function resolveBattleStandingImageDead(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImageDead === "function")
    ? storeData.getDefaultBattleStandingImageDead()
    : "assets/characters/player-temp-cutout-dead.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImageDead) || fallback;
}

// 전투 시작 직후 안내 문구를 3초간만 표시하고 자동으로 숨긴다.
function showBattleStartHint(){
  const hintEl = document.getElementById("hint");
  if(!hintEl) return;
  hintEl.classList.remove("hint-hidden");
  clearTimeout(showBattleStartHint._timer);
  showBattleStartHint._timer = setTimeout(function(){
    hintEl.classList.add("hint-hidden");
  }, 3000);
}

function pickBattleTheme(enemies){
  const counts = {};
  (enemies || []).forEach(enemy => {
    const theme = enemy && enemy.theme;
    if(BATTLE_BACKGROUND_BY_THEME[theme]){
      counts[theme] = (counts[theme] || 0) + 1;
    }
  });
  const themes = Object.keys(counts);
  if(!themes.length) return "hospital";
  const max = Math.max(...themes.map(theme => counts[theme]));
  const candidates = themes.filter(theme => counts[theme] === max);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickBattleBackground(enemies){
  const theme = pickBattleTheme(enemies);
  const list = BATTLE_BACKGROUND_BY_THEME[theme] || BATTLE_BACKGROUND_BY_THEME.hospital;
  return {
    theme,
    url: list[Math.floor(Math.random() * list.length)]
  };
}

function applyBattleBackground(){
  const game = document.querySelector("#game");
  if(!game) return;
  const bg = S && S.tutorialMode
    ? (S.battleBackground || { ...TUTORIAL_BATTLE_BACKGROUND })
    : pickBattleBackground(S.enemies);
  S.battleBackground = bg;
  game.style.setProperty("--battle-bg-image", 'url("' + bg.url + '")');
  game.dataset.battleTheme = bg.theme;
  game.classList.add("battle-bg-active");
}

function clearBattleBackground(){
  const game = document.querySelector("#game");
  if(!game) return;
  game.classList.remove("battle-bg-active");
  game.style.removeProperty("--battle-bg-image");
  delete game.dataset.battleTheme;
}
