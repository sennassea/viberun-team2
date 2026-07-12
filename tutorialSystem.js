"use strict";
/* =========================================================================
   Tutorial System (logic)
   - Isolated tutorial combat branch. Does not touch ACT1 map/shop flow.
   - 안내/완료 팝업 DOM 렌더링은 tutorialSystemUI.js로 분리되어 있다.
     이 파일이 로드되자마자(맨 아래 즉시 실행) 시작 화면 버튼 클릭을
     tutorialSystemUI.js의 showTutorialGuidePopup에 연결하므로,
     tutorialSystemUI.js가 먼저 로드되어야 한다(index.html 참고).
   - 과거에는 진행 상태를 IIFE 클로저 변수로 감췄으나, 다른 전투/노드
     파일과 동일하게 파일 최상위 변수로 공유한다.
   ========================================================================= */

const TUTORIAL_COMPLETED_KEY = "viberunTutorialCompleted";
const TUTORIAL_WAS_SKIPPED_KEY = "viberunTutorialWasSkipped";
const TUTORIAL_IN_PROGRESS_KEY = "viberunTutorialInProgress";
const HAS_PLAYED_KEY = "viberunHasPlayedBefore";
const SAVE_KEY = "viberunSaveState";

let tutorialActive = false;
let originalMonsters = null;
let wrapped = false;

function initTutorialSystem(){
  bindTutorialButton();
  wrapCombatFlowOnce();
  if(typeof updateStartScreenMode === "function") updateStartScreenMode();
  openFirstLaunchLogin();
}

function bindTutorialButton(){
  document.querySelectorAll(".start-tutorial-button").forEach(button => {
    button.addEventListener("click", showTutorialGuidePopup);
  });
}

function openFirstLaunchLogin(){
  if(!shouldShowNewbieStart()) return;
  if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.isLoggedIn !== "function") return;
  if(window.VIBERUN_AUTH.isLoggedIn()) return;
  if(!window.VIBERUN_LOGIN_MODAL || typeof window.VIBERUN_LOGIN_MODAL.open !== "function") return;

  window.VIBERUN_LOGIN_MODAL.open({
    required: true,
    onSuccess(){
      showTutorialGuidePopup();
    }
  });
}

function startTutorialFlow(){
  console.log("[Tutorial] startTutorialFlow");
  markTutorialStarted();
  closeTutorialGuidePopup();
  if(window.TUTORIAL_MAP_SYSTEM && typeof window.TUTORIAL_MAP_SYSTEM.open === "function"){
    window.TUTORIAL_MAP_SYSTEM.open();
  }
}

/* startMenu.js도 같은 이름의 전역 markHasPlayedBefore를 갖고 있다(원래는 이
   파일이 IIFE로 감싸져 있어 그 쪽과 이름이 겹치지 않았다). 전역 함수 선언이
   서로 덮어쓰지 않도록 이 파일 전용 이름을 쓰고, window.TUTORIAL_SYSTEM /
   window.BOHYUN_TUTORIAL에는 기존과 동일하게 markHasPlayedBefore 이름으로
   내보낸다. */
function markTutorialHasPlayedBefore(){
  if(typeof localStorage === "undefined") return;
  try { localStorage.setItem(HAS_PLAYED_KEY, "true"); } catch(error) {}
}

function hasPlayedBefore(){
  return getStorageValue(HAS_PLAYED_KEY) === "true";
}

function isTutorialCompleted(){
  return getStorageValue(TUTORIAL_COMPLETED_KEY) === "true";
}

function wasTutorialSkipped(){
  return getStorageValue(TUTORIAL_WAS_SKIPPED_KEY) === "true";
}

function shouldShowNewbieStart(){
  return !(
    isTutorialCompleted() ||
    wasTutorialSkipped()
  );
}

function markTutorialStarted(){
  if(typeof localStorage === "undefined") return;
  try { localStorage.setItem(TUTORIAL_IN_PROGRESS_KEY, "true"); } catch(error) {}
}

function markTutorialComplete(){
  markTutorialCompleted({ skipped: false });
}

function markTutorialCompleted(options={}){
  if(typeof localStorage === "undefined") return;
  const skipped = !!options.skipped;
  try {
    if(skipped){
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      localStorage.setItem(TUTORIAL_WAS_SKIPPED_KEY, "true");
    } else {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      localStorage.setItem(TUTORIAL_WAS_SKIPPED_KEY, "false");
    }
    localStorage.setItem(HAS_PLAYED_KEY, "true");
    localStorage.removeItem(TUTORIAL_IN_PROGRESS_KEY);
  } catch(error) {}
}

function markTutorialSkipped(){
  markTutorialCompleted({ skipped: true });
}

function hasSavedProgress(){
  return !!getStorageValue(SAVE_KEY);
}

function getStorageValue(key){
  if(typeof localStorage === "undefined") return null;
  try { return localStorage.getItem(key); }
  catch(error) { return null; }
}

function startTutorialFromMenu(){
  startTutorialBattle();
}

function startTutorialBattle(){
  const data = window.BOHYUN_COMBAT_DATA;
  const tutorialMonsters = getTutorialBattleMonsters(data);
  if(!data || !Array.isArray(data.monsters) || !tutorialMonsters.length){
    if(typeof showStartNotice === "function") showStartNotice("튜토리얼을 불러올 수 없습니다.");
    return;
  }

  markTutorialStarted();
  tutorialActive = true;
  originalMonsters = data.monsters.map(monster => cloneMonster(monster));
  data.monsters.splice(0, data.monsters.length, ...tutorialMonsters.map(monster => cloneMonster(monster)));

  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  if(typeof beginNewRun === "function") beginNewRun();
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = 0;
    window.MAP_STATE.proceedMode = false;
    window.MAP_STATE.startMapMode = false;
  }

  const startScreen = document.getElementById("startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  if(typeof closeRewardOverlay === "function") closeRewardOverlay();
  const over = document.getElementById("over");
  if(over) over.classList.remove("show");

  if(typeof newGame === "function") newGame({ resetRun: true, tutorial: true, tutorialEncounterId: "stage_tutorial_child_spirit" });
  if(typeof S !== "undefined" && S){
    S.tutorialMode = true;
    S.battleNodeType = "tutorial";
    S.battlePackageId = "stage_tutorial_child_spirit";
  }
}

function getTutorialBattleMonsters(data){
  if(!data) return [];
  if(typeof data.getEncounterMonsters === "function"){
    const encounterMonsters = data.getEncounterMonsters("stage_tutorial_child_spirit");
    if(encounterMonsters.length) return encounterMonsters;
  }
  if(typeof data.getMonsterById !== "function") return [];
  const fallbackMonster = data.getMonsterById("child_spirit");
  return fallbackMonster ? [fallbackMonster] : [];
}

function wrapCombatFlowOnce(){
  if(wrapped) return;
  if(typeof nodeClear !== "function" || typeof endGame !== "function") return;
  wrapped = true;

  const originalNodeClear = nodeClear;
  nodeClear = function tutorialWrappedNodeClear(){
    if(isTutorialModeActive()){
      if(window.TUTORIAL_BATTLE &&
         typeof window.TUTORIAL_BATTLE.shouldDelayTutorialCompletion === "function" &&
         window.TUTORIAL_BATTLE.shouldDelayTutorialCompletion()){
        if(typeof window.TUTORIAL_BATTLE.onTutorialVictoryPending === "function"){
          window.TUTORIAL_BATTLE.onTutorialVictoryPending();
        }
        return;
      }
      completeTutorialBattle();
      return;
    }
    return originalNodeClear.apply(this, arguments);
  };

  const originalEndGame = endGame;
  endGame = function tutorialWrappedEndGame(result){
    if(isTutorialModeActive()){
      finishTutorialBattle(result);
      return true;
    }
    return originalEndGame.apply(this, arguments);
  };
}

function finishTutorialBattle(result){
  if(result === "win"){
    completeTutorialBattle();
    return true;
  }
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

/* tutorialBattle.js도 같은 이름의 전역 isTutorialBattle을 갖고 있다(원래는
   각자 IIFE로 감싸져 있어 이름이 겹치지 않았다). 전역 함수 선언이 서로
   덮어쓰지 않도록 이 파일 전용 이름을 쓰고, 외부 노출 시에는 기존과 동일하게
   isActive 이름을 유지한다. */
function isTutorialModeActive(){
  return !!(tutorialActive || (typeof S !== "undefined" && S && S.tutorialMode));
}

function completeTutorialBattle(){
  if(typeof S !== "undefined" && S){
    S.encounterCleared = true;
    S.over = "tutorial";
    S.busy = false;
  }
  finishTutorialMode();
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmTutorial");
  }
  showTutorialCompleteOverlay();
}

function finishTutorialMode(){
  tutorialActive = false;
  restoreOriginalMonsters();
  if(typeof S !== "undefined" && S) S.tutorialMode = false;
  if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.endTutorialBattle === "function"){
    window.TUTORIAL_BATTLE.endTutorialBattle();
  }
}

function restoreOriginalMonsters(){
  const data = window.BOHYUN_COMBAT_DATA;
  if(!data || !Array.isArray(data.monsters) || !originalMonsters) return;
  data.monsters.splice(0, data.monsters.length, ...originalMonsters.map(monster => cloneMonster(monster)));
  originalMonsters = null;
}

function cloneMonster(monster){
  return {
    ...monster,
    moves: Array.isArray(monster.moves) ? monster.moves.map(move => ({ ...move })) : []
  };
}

window.startTutorialFlow = startTutorialFlow;
window.startTutorialBattle = startTutorialBattle;

window.TUTORIAL_SYSTEM = {
  keys: {
    tutorialCompleted: TUTORIAL_COMPLETED_KEY,
    tutorialWasSkipped: TUTORIAL_WAS_SKIPPED_KEY,
    tutorialInProgress: TUTORIAL_IN_PROGRESS_KEY,
    hasPlayedBefore: HAS_PLAYED_KEY,
    tutorialComplete: TUTORIAL_COMPLETED_KEY,
    hasPlayed: HAS_PLAYED_KEY,
    save: SAVE_KEY
  },
  hasPlayedBefore,
  isTutorialCompleted,
  shouldShowNewbieStart,
  markHasPlayedBefore: markTutorialHasPlayedBefore,
  markTutorialStarted,
  markTutorialCompleted,
  markTutorialSkipped,
  showGuide: showTutorialGuidePopup,
  startTutorialFlow,
  startTutorialBattle,
  completeTutorialBattle,
  endTutorialMode: finishTutorialMode,
  start: startTutorialFromMenu,
  isActive: isTutorialModeActive
};

window.BOHYUN_TUTORIAL = {
  start: startTutorialFromMenu,
  isActive: isTutorialModeActive,
  markHasPlayedBefore: markTutorialHasPlayedBefore,
  keys: window.TUTORIAL_SYSTEM.keys
};

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTutorialSystem);
else initTutorialSystem();
