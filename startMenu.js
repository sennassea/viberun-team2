"use strict";
/* =========================================================================
   Start Menu
   - New game, continue, start-screen return, and saved-progress labels.
   ========================================================================= */

function startNewGameFromMenu(){
  /* 로그인 이력이 없으면 모달을 먼저 띄우고, 성공 후 이 함수를 다시 호출해 기존 새 게임 흐름을 보존합니다. */
  if(window.VIBERUN_AUTH && !window.VIBERUN_AUTH.requireLogin(startNewGameFromMenu)) return;

  /* 신령의 길 UI(임시 구현, script.js 미수정): 덱 3종 선택 완료 후에만 기존 새 게임 흐름을 실행합니다. */
  if(window.VIBERUN_SPIRIT_PATH_UI && typeof window.VIBERUN_SPIRIT_PATH_UI.open === "function"){
    window.VIBERUN_SPIRIT_PATH_UI.open({
      onComplete(){
        startNewGameAfterSpiritPath();
      }
    });
    return;
  }

  startNewGameAfterSpiritPath();
}

function startNewGameAfterSpiritPath(){
  markHasPlayedBefore();
  /* ACT1 새 게임 시작 오버라이드 (mapNodeLogic.js) */
  if(typeof window.ACT1_START_NEW_GAME === "function"){
    window.ACT1_START_NEW_GAME();
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

  S = saved.state;
  normalizeRunResources();
  STARTER_DECK = [...saved.starterDeck];
  if(typeof syncRunStateFromCombat === "function") syncRunStateFromCombat();
  S.busy = false;
  if(window.MAP_STATE && saved.mapState){
    window.MAP_STATE.currentStage = saved.mapState.currentStage || 0;
    window.MAP_STATE.proceedMode = !!saved.mapState.proceedMode;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  $("#over").classList.remove("show");
  closeRewardOverlay();
  renderAll();
  /* 보상 선택 화면이 열려 있던 상태로 저장되었다면, 새로 뽑지 않고
     저장된 카드 3종(S.victoryCardRewardKeys)을 그대로 다시 표시한다. */
  if(S && S.rewardOpen){
    if(S.victoryCardRewardOpen && Array.isArray(S.victoryCardRewardKeys) && typeof renderRewardOverlay === "function"){
      renderRewardOverlay(S.victoryCardRewardKeys);
    } else if(typeof renderBattleVictoryOverlay === "function"){
      renderBattleVictoryOverlay();
    }
    if(typeof updateEndBtn === "function") updateEndBtn();
  }
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

function showStartNotice(message){
  let notice = document.querySelector("#startNotice");
  if(!notice){
    notice = document.createElement("div");
    notice.id = "startNotice";
    notice.className = "start-notice";
    notice.innerHTML =
      '<div class="start-notice-panel">' +
        '<p></p>' +
      '</div>';
  }
  const host = document.querySelector("#startScreen") || document.querySelector(".start-continue-game");
  if(notice.parentNode !== host) host.appendChild(notice);
  notice.querySelector("p").textContent = message;
  notice.classList.add("show");
  clearTimeout(notice._hideTimer);
  notice._hideTimer = setTimeout(() => notice.classList.remove("show"), 1500);
}

function showStartScreenAfterSave(){
  $("#over").classList.remove("show");
  closeRewardOverlay();
  updateContinueButtonInfo();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateStartScreenMode();
}

function showStartMenu(options={}){
  $("#over").classList.remove("show");
  closeRewardOverlay();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateContinueButtonInfo({ ignoreSavedProgress: !!options.ignoreSavedProgress });
  updateStartScreenMode({
    forceFirstVisit: !!options.forceFirstVisit,
    forceTutorialVisible: !!options.forceTutorialVisible
  });
}

function updateStartScreenMode(options={}){
  const tutorial = document.querySelector(".start-tutorial-button");
  const newGame = document.querySelector(".start-new-game");
  const continueGame = document.querySelector(".start-continue-game");
  const codex = document.querySelector(".start-codex-button");
  const record = document.querySelector(".start-record-button");
  const mailbox = document.querySelector(".start-mailbox-button");
  const settings = document.querySelector(".start-settings-button");
  const codexRecordRow = codex && record ? codex.closest(".start-menu-row") : null;
  const isNewbie = options.forceFirstVisit || options.forceTutorialVisible || shouldShowNewbieStartMenu();

  setStartMenuVisible(tutorial, isNewbie);
  setStartMenuVisible(newGame, !isNewbie);
  setStartMenuVisible(continueGame, !isNewbie);
  setStartMenuVisible(codex, !isNewbie);
  setStartMenuVisible(record, !isNewbie);
  setStartMenuVisible(codexRecordRow, !isNewbie);
  updateStartMailboxVisibility(mailbox);
  refreshStartWalletUI();
  refreshStartMonthlyPassUI();
  refreshStartMenuProfileUI();
  setStartMenuVisible(settings, true);
}

function updateStartMailboxVisibility(button){
  const target = button || document.querySelector(".start-mailbox-button");
  if(!target) return;
  const auth = window.VIBERUN_AUTH;
  const isLoggedIn = !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());
  setStartMenuVisible(target, isLoggedIn);
}

function refreshStartWalletUI(){
  if(window.VIBERUN_WALLET_UI && typeof window.VIBERUN_WALLET_UI.refresh === "function"){
    window.VIBERUN_WALLET_UI.refresh();
  }
}

function refreshStartMonthlyPassUI(){
  if(window.VIBERUN_MONTHLY_PASS_UI && typeof window.VIBERUN_MONTHLY_PASS_UI.refresh === "function"){
    window.VIBERUN_MONTHLY_PASS_UI.refresh();
  }
}

function refreshStartMenuProfileUI(){
  if(window.VIBERUN_MENU_PROFILE_UI && typeof window.VIBERUN_MENU_PROFILE_UI.refresh === "function"){
    window.VIBERUN_MENU_PROFILE_UI.refresh();
  }
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

function setStartMenuVisible(el, visible){
  if(!el) return;
  el.hidden = !visible;
  el.style.display = visible ? "" : "none";
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

function updateContinueButtonInfo(options={}){
  const button = document.querySelector(".start-continue-game");
  if(!button) return;
  const status = button.querySelector(".continue-status");
  if(!status) return;

  const saved = options.ignoreSavedProgress ? null : readSavedProgress();
  if(!saved){
    button.classList.remove("has-save");
    status.textContent = "신령의 은혜";
    return;
  }

  button.classList.add("has-save");
  const floor = formatSavedFloor(saved);
  const turn = saved.state && saved.state.turn ? saved.state.turn : 1;
  status.textContent = floor + " " + turn + "턴";
}

function formatSavedFloor(saved){
  const label = saved.mapState && saved.mapState.floorLabel ? saved.mapState.floorLabel : "";
  const match = label.match(/(\d+)\s*F/i);
  if(match) return match[1] + "층";
  return "신령의 은혜";
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
