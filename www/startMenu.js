"use strict";
/* =========================================================================
   Start Menu
   - New game, continue, start-screen return, and saved-progress labels.
   ========================================================================= */

function startNewGameFromMenu(){
  /* ACT1 새 게임 시작 오버라이드 (mapNodeLogic.js) */
  if(typeof window.ACT1_START_NEW_GAME === "function"){
    window.ACT1_START_NEW_GAME();
    return;
  }

  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  if(typeof generateMap === "function") generateMap();
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
}

function continueGameFromMenu(){
  const saved = readSavedProgress();
  if(!saved){
    showStartNotice("저장 지점이 없습니다.");
    return;
  }

  S = saved.state;
  normalizeRunResources();
  STARTER_DECK = [...saved.starterDeck];
  S.busy = false;
  if(window.MAP_STATE && saved.mapState){
    window.MAP_STATE.currentStage = saved.mapState.currentStage || 0;
    window.MAP_STATE.proceedMode = !!saved.mapState.proceedMode;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  $("#over").classList.remove("show");
  closeRewardOverlay();
  renderAll();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  updateContinueButtonInfo();
}

function readSavedProgress(){
  if(typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("viberunSaveState");
    if(!raw) return null;
    const saved = JSON.parse(raw);
    if(!isUsableSavedProgress(saved)) return null;
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
}

function updateContinueButtonInfo(){
  const button = document.querySelector(".start-continue-game");
  if(!button) return;
  const status = button.querySelector(".continue-status");
  if(!status) return;

  const saved = readSavedProgress();
  if(!saved){
    button.classList.remove("has-save");
    status.textContent = "메인 로비";
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
  return "메인 로비";
}

$("#returnStart").addEventListener("click", returnToStartScreen);
document.querySelectorAll(".start-new-game").forEach(button => {
  button.addEventListener("click", startNewGameFromMenu);
});
document.querySelectorAll(".start-continue-game").forEach(button => {
  button.addEventListener("click", continueGameFromMenu);
});

updateContinueButtonInfo();
