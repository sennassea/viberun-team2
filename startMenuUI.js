"use strict";
/* =========================================================================
   Start Menu UI 레이어 — startMenu.js에서 분리된 화면 표시 갱신 함수.
   저장 데이터 판독/게임 상태 전환 로직은 startMenu.js에 남아있고 이
   파일은 그 결과를 화면(시작 메뉴 버튼 표시 여부, 이어하기 라벨 등)에
   반영하는 역할만 한다.
   startMenu.js가 로드 직후 이 파일의 updateContinueButtonInfo() /
   updateStartScreenMode()를 즉시 호출하므로, 이 파일은 반드시
   startMenu.js보다 먼저 로드되어야 한다(index.html 스크립트 순서 참고).
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

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

function setStartMenuVisible(el, visible){
  if(!el) return;
  el.hidden = !visible;
  el.style.display = visible ? "" : "none";
}

function updateStartScreenMode(options={}){
  const tutorial = document.querySelector(".start-tutorial-button");
  const newGame = document.querySelector(".start-new-game");
  const continueGame = document.querySelector(".start-continue-game");
  const ranking = document.querySelector(".start-ranking-button");
  const codex = document.querySelector(".start-codex-button");
  const record = document.querySelector(".start-record-button");
  const mailbox = document.querySelector(".start-mailbox-button");
  const settings = document.querySelector(".start-settings-button");
  const codexRecordRow = codex && record ? codex.closest(".start-menu-row") : null;
  const isNewbie = options.forceFirstVisit || options.forceTutorialVisible || shouldShowNewbieStartMenu();

  setStartMenuVisible(tutorial, isNewbie);
  setStartMenuVisible(newGame, !isNewbie);
  setStartMenuVisible(continueGame, !isNewbie);
  setStartMenuVisible(ranking, !isNewbie);
  setStartMenuVisible(codex, !isNewbie);
  setStartMenuVisible(record, !isNewbie);
  setStartMenuVisible(codexRecordRow, !isNewbie);
  updateStartMailboxVisibility(mailbox);
  refreshStartWalletUI();
  refreshStartMonthlyPassUI();
  refreshStartMenuProfileUI();
  setStartMenuVisible(settings, true);
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmTitle");
  }
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

function updateContinueButtonInfo(options={}){
  const button = document.querySelector(".start-continue-game");
  if(!button) return;
  const status = button.querySelector(".continue-status");
  if(!status) return;

  const saved = options.ignoreSavedProgress ? null : readSavedProgress();
  if(!saved){
    button.classList.remove("has-save");
    status.hidden = true;
    status.textContent = "";
    return;
  }

  button.classList.add("has-save");
  status.hidden = false;
  const label = formatSavedProgressLabel(saved);
  const turn = saved.state && saved.state.turn ? saved.state.turn : 1;
  status.textContent = label + " / " + turn + "턴";
}

function formatSavedProgressLabel(saved){
  const mapState = saved.mapState || {};
  const journey = saved.state && saved.state.journey;
  const actName = mapState.actName || (journey && journey.actName) || "최초의 여정";
  const currentStage = Number.isFinite(mapState.currentStage) ? mapState.currentStage : 0;

  // displayAreaLabel(저장 당시 실제 표시 구역)을 우선 사용하고, 구버전 세이브처럼
  // 값이 없는 경우에만 저장된 floorLabel 텍스트를 파싱해 구역 수를 복원한다.
  let areaLabel = mapState.displayAreaLabel;
  if(!areaLabel){
    if(currentStage < 0){
      areaLabel = "신령의 은혜";
    } else {
      const legacyLabel = mapState.floorLabel || "";
      const match = legacyLabel.match(/(\d+)\s*(?:F|구역)/i);
      areaLabel = match ? (match[1] + "구역") : "신령의 은혜";
    }
  }

  return actName + " / " + areaLabel;
}
