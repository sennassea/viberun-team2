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
    endTutorialBattle();
    return state.tutorialBattleExitTarget;
  }

  function applyTutorialBattleRootState(active){
    const root = document.getElementById("game");
    if(!root) return;
    root.classList.toggle("is-tutorial-battle", !!active);
    if(active) root.dataset.state = "tutorial-battle";
    else if(root.dataset.state === "tutorial-battle") delete root.dataset.state;
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
    handleTutorialExit
  };
})();
