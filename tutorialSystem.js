"use strict";
/* =========================================================================
   Tutorial System
   - Isolated tutorial combat branch. Does not touch ACT1 map/shop flow.
   ========================================================================= */

(function(){
  const TUTORIAL_COMPLETE_KEY = "viberunTutorialComplete";
  const HAS_PLAYED_KEY = "viberunHasPlayedBefore";
  const LEGACY_HAS_PLAYED_KEY = "hasPlayedBefore";

  let tutorialActive = false;
  let originalMonsters = null;
  let wrapped = false;

  function initTutorialSystem(){
    bindTutorialButton();
    wrapCombatFlowOnce();
  }

  function bindTutorialButton(){
    document.querySelectorAll(".start-tutorial-button").forEach(button => {
      button.addEventListener("click", startTutorialFromMenu);
    });
  }

  function markHasPlayedBefore(){
    if(typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(HAS_PLAYED_KEY, "1");
      localStorage.setItem(LEGACY_HAS_PLAYED_KEY, "1");
    } catch(error) {}
  }

  function markTutorialComplete(){
    if(typeof localStorage === "undefined") return;
    try { localStorage.setItem(TUTORIAL_COMPLETE_KEY, "1"); } catch(error) {}
  }

  function startTutorialFromMenu(){
    const data = window.BOHYUN_COMBAT_DATA;
    const tutorialMonster = data && typeof data.getMonsterById === "function"
      ? data.getMonsterById("child_spirit")
      : null;
    if(!data || !Array.isArray(data.monsters) || !tutorialMonster){
      if(typeof showStartNotice === "function") showStartNotice("튜토리얼을 불러올 수 없습니다.");
      return;
    }

    markHasPlayedBefore();
    tutorialActive = true;
    originalMonsters = data.monsters.map(monster => cloneMonster(monster));
    data.monsters.splice(0, data.monsters.length, cloneMonster(tutorialMonster));

    try {
      if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
    } catch(error) {}

    if(typeof beginNewRun === "function") beginNewRun();
    if(window.MAP_STATE){
      window.MAP_STATE.currentStage = -1;
      window.MAP_STATE.proceedMode = false;
      window.MAP_STATE.startMapMode = false;
    }

    const startScreen = document.getElementById("startScreen");
    if(startScreen) startScreen.classList.add("hidden");
    if(typeof closeRewardOverlay === "function") closeRewardOverlay();
    const over = document.getElementById("over");
    if(over) over.classList.remove("show");

    if(typeof newGame === "function") newGame({ resetRun: true });
    if(typeof S !== "undefined" && S){
      S.tutorialMode = true;
      S.battleNodeType = "tutorial";
      S.battlePackageId = "stage_tutorial_child_spirit";
    }
  }

  function wrapCombatFlowOnce(){
    if(wrapped) return;
    if(typeof nodeClear !== "function" || typeof endGame !== "function") return;
    wrapped = true;

    const originalNodeClear = nodeClear;
    nodeClear = function tutorialWrappedNodeClear(){
      if(isTutorialBattle()){
        completeTutorialBattle();
        return;
      }
      return originalNodeClear.apply(this, arguments);
    };

    const originalEndGame = endGame;
    endGame = function tutorialWrappedEndGame(result){
      if(isTutorialBattle()){
        finishTutorialBattle(result);
        return true;
      }
      return originalEndGame.apply(this, arguments);
    };
  }

  function finishTutorialBattle(result){
    if(typeof S !== "undefined" && S){
      S.over = result || "lose";
      S.busy = false;
      finishTutorialMode();
      const title = document.getElementById("overTitle");
      const desc = document.getElementById("overDesc");
      const returnStart = document.getElementById("returnStart");
      const over = document.getElementById("over");
      if(title) title.textContent = "튜토리얼 종료";
      if(desc) desc.textContent = "튜토리얼은 언제든 다시 연습할 수 있습니다.";
      if(returnStart) returnStart.style.display = "block";
      if(over) over.classList.add("show");
    }
  }

  function isTutorialBattle(){
    return !!(tutorialActive || (typeof S !== "undefined" && S && S.tutorialMode));
  }

  function completeTutorialBattle(){
    if(typeof S !== "undefined" && S){
      S.encounterCleared = true;
      S.over = "tutorial";
      S.busy = false;
    }
    markTutorialComplete();
    finishTutorialMode();
    showTutorialCompleteOverlay();
  }

  function finishTutorialMode(){
    tutorialActive = false;
    restoreOriginalMonsters();
    if(typeof S !== "undefined" && S) S.tutorialMode = false;
  }

  function restoreOriginalMonsters(){
    const data = window.BOHYUN_COMBAT_DATA;
    if(!data || !Array.isArray(data.monsters) || !originalMonsters) return;
    data.monsters.splice(0, data.monsters.length, ...originalMonsters.map(monster => cloneMonster(monster)));
    originalMonsters = null;
  }

  function showTutorialCompleteOverlay(){
    const title = document.getElementById("overTitle");
    const desc = document.getElementById("overDesc");
    const returnStart = document.getElementById("returnStart");
    const over = document.getElementById("over");
    if(title) title.textContent = "튜토리얼 완료";
    if(desc) desc.textContent = "기본 전투 흐름을 익혔습니다.";
    if(returnStart) returnStart.style.display = "block";
    if(over) over.classList.add("show");
  }

  function cloneMonster(monster){
    return {
      ...monster,
      moves: Array.isArray(monster.moves) ? monster.moves.map(move => ({ ...move })) : []
    };
  }

  window.BOHYUN_TUTORIAL = {
    start: startTutorialFromMenu,
    isActive: isTutorialBattle,
    markHasPlayedBefore,
    keys: {
      tutorialComplete: TUTORIAL_COMPLETE_KEY,
      hasPlayed: HAS_PLAYED_KEY,
      legacyHasPlayed: LEGACY_HAS_PLAYED_KEY
    }
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTutorialSystem);
  else initTutorialSystem();
})();
