"use strict";
/* =========================================================================
   Start Menu 로직 (startMenu.js)
   - New game, continue, start-screen return, and saved-progress logic.
   - 화면 표시 갱신(버튼 표시/숨김, 이어하기 라벨 등)은 startMenuUI.js로
     분리되어 있으며, 이 파일은 게임 상태 전환과 저장 데이터 판독만
     담당한다. 유니티 이식 시 이 파일의 흐름/판독 로직은 C#으로 그대로
     옮길 수 있다.
   ========================================================================= */

function startNewGameFromMenu(){
  /* 로그인 이력이 없으면 모달을 먼저 띄우고, 성공 후 이 함수를 다시 호출해 기존 새 게임 흐름을 보존합니다. */
  if(window.VIBERUN_AUTH && !window.VIBERUN_AUTH.requireLogin(startNewGameFromMenu)) return;

  /* 신령의 길 UI(임시 구현, script.js 미수정): 덱 3종 선택 완료 후에만 기존 새 게임 흐름을 실행합니다. */
  if(window.VIBERUN_SPIRIT_PATH_UI && typeof window.VIBERUN_SPIRIT_PATH_UI.open === "function"){
    window.VIBERUN_SPIRIT_PATH_UI.open({
      onComplete(payload){
        startNewGameAfterSpiritPath(payload || {});
      }
    });
    return;
  }

  startNewGameAfterSpiritPath();
}

function startNewGameAfterSpiritPath(options){
  options = options || {};
  const startEndlessLevel = Number(options.startEndlessLevel) || 0;

  markHasPlayedBefore();
  /* ACT1 새 게임 시작 오버라이드 (mapNodeLogic.js) */
  if(typeof window.ACT1_START_NEW_GAME === "function"){
    /* 끝없는 여정 직접 시작 분기는 다음 작업에서 구현 예정. 현재는 값만 전달한다. */
    window.ACT1_START_NEW_GAME({
      startEndlessLevel
    });
    return;
  }

  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  if(typeof generateMap === "function") generateMap();
  if(typeof beginNewRun === "function") beginNewRun();
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;
    window.MAP_STATE.proceedMode = true;
    window.MAP_STATE.startMapMode = true;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  $("#over").classList.remove("show");
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  if(typeof openMap === "function") openMap();
  updateContinueButtonInfo();
}

function returnToStartScreen(){
  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  STARTER_DECK = [...BASE_STARTER_DECK];
  if(typeof beginNewRun === "function") beginNewRun();
  if(typeof generateMap === "function") generateMap();
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = 0;
    window.MAP_STATE.proceedMode = false;
  }
  if(typeof loadStageMonsters === "function") loadStageMonsters(0);
  if(typeof updateHudFloor === "function") updateHudFloor();

  closeRewardOverlay();
  $("#over").classList.remove("show");
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateContinueButtonInfo();
  updateStartScreenMode();
}

function continueGameFromMenu(){
  /* 저장 지점 유무 판단은 로그인 성공 뒤 기존 로직에서 처리해 기존 안내 문구와 흐름을 유지합니다. */
  if(window.VIBERUN_AUTH && !window.VIBERUN_AUTH.requireLogin(continueGameFromMenu)) return;

  const saved = readSavedProgress();
  if(!saved){
    showStartNotice("저장 지점이 없습니다.");
    return;
  }

  if(typeof window.restoreSavedRunState === "function") window.restoreSavedRunState(saved);
  $("#over").classList.remove("show");
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  updateContinueButtonInfo();
}

function readSavedProgress(){
  if(typeof localStorage === "undefined") return null;
  if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.isLoggedIn === "function" && !window.VIBERUN_AUTH.isLoggedIn()) return null;
  try {
    const raw = localStorage.getItem("viberunSaveState");
    if(!raw) return null;
    const saved = JSON.parse(raw);
    if(!isUsableSavedProgress(saved)) return null;
    if(!isSavedProgressForCurrentAccount(saved)) return null;
    return saved;
  } catch(error) {
    localStorage.removeItem("viberunSaveState");
    return null;
  }
}

function isUsableSavedProgress(saved){
  return !!(
    saved &&
    saved.state &&
    saved.state.player &&
    typeof saved.state.player.hp === "number" &&
    typeof saved.state.player.maxHp === "number" &&
    Array.isArray(saved.state.hand) &&
    Array.isArray(saved.state.draw) &&
    Array.isArray(saved.state.discard) &&
    Array.isArray(saved.starterDeck) &&
    saved.starterDeck.length > 0
  );
}

function isSavedProgressForCurrentAccount(saved){
  const savedAccountId = saved && (saved.accountId || saved.accountUid);
  if(!savedAccountId) return true;
  if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.getAccountInfo !== "function") return true;
  const account = window.VIBERUN_AUTH.getAccountInfo();
  const currentAccountId = account && (account.accountId || account.uid);
  return !!(account && account.isLoggedIn && currentAccountId === savedAccountId);
}

function closeOpenNodeOverlays(){
  if(typeof closeShopNode === "function") closeShopNode();
  if(typeof closePrayerNode === "function") closePrayerNode();
  if(typeof closeEventOverlayOnly === "function") closeEventOverlayOnly();
}

function showStartScreenAfterSave(){
  $("#over").classList.remove("show");
  closeRewardOverlay();
  closeOpenNodeOverlays();
  updateContinueButtonInfo();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateStartScreenMode();
}

function showStartMenu(options={}){
  $("#over").classList.remove("show");
  closeRewardOverlay();
  closeOpenNodeOverlays();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateContinueButtonInfo({ ignoreSavedProgress: !!options.ignoreSavedProgress });
  updateStartScreenMode({
    forceFirstVisit: !!options.forceFirstVisit,
    forceTutorialVisible: !!options.forceTutorialVisible
  });
}

function shouldShowNewbieStartMenu(){
  if(window.TUTORIAL_SYSTEM && typeof window.TUTORIAL_SYSTEM.shouldShowNewbieStart === "function"){
    return window.TUTORIAL_SYSTEM.shouldShowNewbieStart();
  }
  if(typeof localStorage === "undefined") return true;
  try {
    return !(
      localStorage.getItem("viberunTutorialCompleted") === "true" ||
      localStorage.getItem("viberunTutorialWasSkipped") === "true"
    );
  } catch(error) {
    return true;
  }
}

function markHasPlayedBefore(){
  if(typeof window.BOHYUN_TUTORIAL === "object" && typeof window.BOHYUN_TUTORIAL.markHasPlayedBefore === "function"){
    window.BOHYUN_TUTORIAL.markHasPlayedBefore();
    return;
  }
  if(typeof localStorage === "undefined") return;
  try {
    localStorage.setItem("viberunHasPlayedBefore", "true");
    localStorage.setItem("hasPlayedBefore", "1");
  } catch(error) {}
}

$("#returnStart").addEventListener("click", returnToStartScreen);
document.querySelectorAll(".start-new-game").forEach(button => {
  button.addEventListener("click", startNewGameFromMenu);
});
document.querySelectorAll(".start-continue-game").forEach(button => {
  button.addEventListener("click", continueGameFromMenu);
});
document.querySelectorAll(".start-mailbox-button").forEach(button => {
  button.addEventListener("click", () => {
    if(window.VIBERUN_MAILBOX_UI && typeof window.VIBERUN_MAILBOX_UI.open === "function"){
      window.VIBERUN_MAILBOX_UI.open({ mode: "start" });
    } else if(typeof toast === "function") {
      toast("선물함을 불러올 수 없습니다.");
    }
  });
});

window.showStartMenu = showStartMenu;
window.returnToMainMenu = showStartMenu;
window.addEventListener("viberun:auth-changed", () => {
  updateContinueButtonInfo();
  updateStartMailboxVisibility();
  refreshStartWalletUI();
  refreshStartMonthlyPassUI();
  refreshStartMenuProfileUI();
  if(window.VIBERUN_MAILBOX_UI && typeof window.VIBERUN_MAILBOX_UI.refreshBadge === "function"){
    window.VIBERUN_MAILBOX_UI.refreshBadge();
  }
});

updateContinueButtonInfo();
updateStartScreenMode();
