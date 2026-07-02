"use strict";
/* =========================================================================
   Tutorial Battle State
   - Owns tutorial-only battle state and policy hooks.
   - Delegates to the existing tutorial battle entry without touching normal combat.
   ========================================================================= */

(function(){
  const state = {
    isTutorialBattleActive: false,
    currentTutorialStep: null,
    tutorialBattleExitTarget: "newbieStart",
    tutorialEncounterId: "stage_tutorial_child_spirit"
  };
  let tutorialPauseState = null;

  function startTutorialBattle(){
    state.isTutorialBattleActive = true;
    state.currentTutorialStep = state.currentTutorialStep || "start";
    applyTutorialBattleRootState(true);
    if(typeof window.startTutorialBattle === "function"){
      window.startTutorialBattle();
    }
  }

  function endTutorialBattle(){
    state.isTutorialBattleActive = false;
    state.currentTutorialStep = null;
    applyTutorialBattleRootState(false);
  }

  function isTutorialBattle(){
    return !!state.isTutorialBattleActive;
  }

  function setTutorialStep(step){
    state.currentTutorialStep = step;
  }

  function getTutorialStep(){
    return state.currentTutorialStep;
  }

  function handleTutorialExit(){
    closeTutorialExitConfirm();
    closeTutorialSettings();
    if(window.TUTORIAL_SYSTEM && typeof window.TUTORIAL_SYSTEM.endTutorialMode === "function"){
      window.TUTORIAL_SYSTEM.endTutorialMode();
    } else {
      endTutorialBattle();
    }
    if(typeof S !== "undefined" && S){
      S.tutorialMode = false;
      S.busy = false;
      S.over = null;
    }
    const over = document.getElementById("over");
    if(over) over.classList.remove("show");
    const startScreen = document.getElementById("startScreen");
    if(startScreen) startScreen.classList.remove("hidden");
    if(typeof updateStartScreenMode === "function") updateStartScreenMode();
    return state.tutorialBattleExitTarget;
  }

  function canUseCard(card){
    return true;
  }

  function canEndTurn(){
    return true;
  }

  function canOpenDeck(){
    return true;
  }

  function canUsePotion(){
    return true;
  }

  function canUseArtifact(){
    return true;
  }

  function getTutorialRestrictionMessage(actionType){
    return "";
  }

  function applyTutorialBattleRootState(active){
    const root = document.getElementById("game");
    if(!root) return;
    root.classList.toggle("is-tutorial-battle", !!active);
    if(active) root.dataset.state = "tutorial-battle";
    else if(root.dataset.state === "tutorial-battle") delete root.dataset.state;
  }

  function openTutorialSettings(){
    if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
    ensureTutorialSettings();
    pauseTutorialCombat();
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    overlay.style.zIndex = document.getElementById("mapOverlay") ? "1000" : "";
    if(document.getElementById("mapOverlay") && overlay.parentNode){
      overlay.parentNode.appendChild(overlay);
    }
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    const closeButton = overlay.querySelector(".tutorial-battle-settings-close");
    if(closeButton) closeButton.focus();
  }

  function closeTutorialSettings(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    closeTutorialExitConfirm();
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.zIndex = "";
    resumeTutorialCombat();
  }

  function ensureTutorialSettings(){
    ensureTutorialSettingsStyles();
    if(document.getElementById("tutorialBattleSettings")) return;

    const overlay = document.createElement("div");
    overlay.id = "tutorialBattleSettings";
    overlay.className = "tutorial-battle-settings";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="tutorial-battle-settings-panel" role="dialog" aria-modal="true" aria-labelledby="tutorialBattleSettingsTitle">' +
        '<div class="tutorial-battle-settings-head">' +
          '<h2 id="tutorialBattleSettingsTitle">튜토리얼 설정</h2>' +
          '<button type="button" class="tutorial-battle-settings-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="tutorial-battle-settings-body">' +
          '<section class="tutorial-battle-settings-section">' +
            '<h3>도움말</h3>' +
            '<p>튜토리얼 전투에서는 전투의 기본 조작을 순서대로 연습합니다.</p>' +
          '</section>' +
          '<div class="tutorial-battle-settings-actions">' +
            '<button type="button" class="tutorial-battle-settings-exit">튜토리얼 나가기</button>' +
          '</div>' +
        '</div>' +
        '<div class="tutorial-battle-exit-confirm" aria-hidden="true">' +
          '<div class="tutorial-battle-exit-panel" role="dialog" aria-modal="true" aria-labelledby="tutorialBattleExitTitle">' +
            '<h3 id="tutorialBattleExitTitle">튜토리얼을 나가시겠어요?</h3>' +
            '<p>진행 중인 튜토리얼 전투만 종료하고 시작 화면으로 돌아갑니다.</p>' +
            '<div class="tutorial-battle-exit-actions">' +
              '<button type="button" class="tutorial-battle-exit-yes">예</button>' +
              '<button type="button" class="tutorial-battle-exit-no">아니오</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeTutorialSettings();
    });
    overlay.querySelector(".tutorial-battle-settings-close").addEventListener("click", closeTutorialSettings);
    overlay.querySelector(".tutorial-battle-settings-exit").addEventListener("click", openTutorialExitConfirm);
    overlay.querySelector(".tutorial-battle-exit-yes").addEventListener("click", handleTutorialExit);
    overlay.querySelector(".tutorial-battle-exit-no").addEventListener("click", closeTutorialExitConfirm);
    document.addEventListener("keydown", event => {
      if(event.key !== "Escape" || !overlay.classList.contains("show")) return;
      if(overlay.querySelector(".tutorial-battle-exit-confirm.show")){
        closeTutorialExitConfirm();
        return;
      }
      closeTutorialSettings();
    });
    (document.getElementById("game") || document.body).appendChild(overlay);
  }

  function ensureTutorialSettingsStyles(){
    if(document.getElementById("tutorialBattleSettingsStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialBattleSettingsStyles";
    style.textContent =
      ".tutorial-battle-settings{position:absolute;inset:0;z-index:300;display:none;place-items:center;background:rgba(20,35,60,.45);backdrop-filter:blur(3px);}" +
      ".tutorial-battle-settings.show{display:grid;}" +
      ".tutorial-battle-settings-panel{position:relative;width:min(44cqw,64cqh);max-height:70cqh;display:flex;flex-direction:column;background:var(--c-panel);border:0.3cqh solid var(--c-gold);border-radius:var(--r);box-shadow:0 2cqh 4cqh rgba(0,0,0,.28);padding:2cqh 2cqw;}" +
      ".tutorial-battle-settings-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid var(--c-panel-line);}" +
      ".tutorial-battle-settings-head h2{font-size:3cqh;line-height:1;flex:1;}" +
      ".tutorial-battle-settings-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
      ".tutorial-battle-settings-body{padding:2cqh 0 0;display:flex;flex-direction:column;gap:2cqh;}" +
      ".tutorial-battle-settings-section{border:0.18cqh solid var(--c-panel-line);border-radius:1.2cqh;background:rgba(255,255,255,.58);padding:1.6cqh 1.4cqw;}" +
      ".tutorial-battle-settings-section h3{font-size:2.1cqh;margin-bottom:1cqh;color:var(--c-ink);}" +
      ".tutorial-battle-settings-section p{font-size:1.7cqh;line-height:1.5;color:var(--c-ink-soft);font-weight:800;}" +
      ".tutorial-battle-settings-actions{display:flex;justify-content:flex-end;gap:1cqw;}" +
      ".tutorial-battle-settings-actions button{height:4.4cqh;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".tutorial-battle-settings-exit{background:#fff1ef;color:var(--c-red-deep);}" +
      ".tutorial-battle-exit-confirm{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".tutorial-battle-exit-confirm.show{display:grid;}" +
      ".tutorial-battle-exit-panel{width:min(38cqw,54cqh);background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:2.2cqh 2cqw;text-align:center;}" +
      ".tutorial-battle-exit-panel h3{font-size:2.4cqh;color:var(--c-ink);margin-bottom:1cqh;}" +
      ".tutorial-battle-exit-panel p{font-size:1.7cqh;line-height:1.45;color:var(--c-ink-soft);font-weight:800;margin-bottom:1.8cqh;}" +
      ".tutorial-battle-exit-actions{display:flex;justify-content:center;gap:1cqw;}" +
      ".tutorial-battle-exit-actions button{height:4.2cqh;min-width:8cqw;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".tutorial-battle-exit-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".tutorial-battle-exit-no{background:#fff;color:var(--c-ink-soft);}";
    document.head.appendChild(style);
  }

  function openTutorialExitConfirm(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const confirm = overlay.querySelector(".tutorial-battle-exit-confirm");
    if(!confirm) return;
    confirm.classList.add("show");
    confirm.setAttribute("aria-hidden", "false");
    const noButton = confirm.querySelector(".tutorial-battle-exit-no");
    if(noButton) noButton.focus();
  }

  function closeTutorialExitConfirm(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const confirm = overlay.querySelector(".tutorial-battle-exit-confirm");
    if(!confirm) return;
    confirm.classList.remove("show");
    confirm.setAttribute("aria-hidden", "true");
    const exitButton = overlay.querySelector(".tutorial-battle-settings-exit");
    if(overlay.classList.contains("show") && exitButton) exitButton.focus();
  }

  function pauseTutorialCombat(){
    if(tutorialPauseState || typeof S === "undefined" || !S || S.over) return;
    tutorialPauseState = { busy: !!S.busy };
    S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function resumeTutorialCombat(){
    if(!tutorialPauseState) return;
    if(typeof S !== "undefined" && S && !S.over){
      S.busy = tutorialPauseState.busy;
      if(typeof updateEndBtn === "function") updateEndBtn();
    }
    tutorialPauseState = null;
  }

  window.TUTORIAL_BATTLE = {
    get isTutorialBattleActive(){ return state.isTutorialBattleActive; },
    get currentTutorialStep(){ return state.currentTutorialStep; },
    get tutorialBattleExitTarget(){ return state.tutorialBattleExitTarget; },
    set tutorialBattleExitTarget(target){ state.tutorialBattleExitTarget = target; },
    get tutorialEncounterId(){ return state.tutorialEncounterId; },
    set tutorialEncounterId(encounterId){ state.tutorialEncounterId = encounterId; },
    startTutorialBattle,
    endTutorialBattle,
    isTutorialBattle,
    setTutorialStep,
    getTutorialStep,
    handleTutorialExit,
    canUseCard,
    canEndTurn,
    canOpenDeck,
    canUsePotion,
    canUseArtifact,
    getTutorialRestrictionMessage,
    openTutorialSettings,
    closeTutorialSettings
  };
})();
