"use strict";
/* =========================================================================
   Tutorial Map System (logic)
   - Isolated tutorial-only map branch. Does not modify ACT1 map generation.
   - 대사 상자/클릭 차단막/강조 표시 DOM 렌더링은 tutorialMapSystemUI.js로
     분리되어 있다. 이 파일은 튜토리얼 맵 진행 상태(현재 어떤 대사 단계인지,
     노드 클릭을 막아야 하는지)만 관리한다.
   - 과거에는 이 상태를 IIFE 클로저 변수로 감췄으나, 다른 모든 전투/노드
     파일과 동일하게 파일 최상위 변수로 공유해 UI 분리 파일에서도 필요하면
     참조할 수 있게 했다(현재 UI 파일은 DOM만 다루므로 참조하지 않는다).
   ========================================================================= */

let tutorialMapActive = false;
let originalStartStage = null;
let originalCloseMap = null;
let stageClickWrapped = false;
let closeMapWrapped = false;
let tutorialMapIntroActive = false;
let tutorialMapNodeSelectActive = false;
const MAP_INTRO_DIALOGUE_IDS = ["M-001", "M-002", "M-003", "M-004", "M-005", "M-006", "M-007", "M-008", "M-009", "M-010", "M-011", "M-012", "M-013", "M-014", "M-015"];
const MAP_LEGEND_DIALOGUE_TYPES = {
  "M-008": "enemy",
  "M-009": "elite",
  "M-010": "event",
  "M-011": "shop",
  "M-012": "rest",
  "M-013": "boss"
};
const TUTORIAL_MAP_BLOCK_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "touchstart", "touchend"];

function openTutorialMap(){
  if(typeof generateMap !== "function" || typeof openMap !== "function") return;

  tutorialMapActive = true;
  ensureTutorialMapStyles();
  ensureTutorialMapStageClickWrapped();
  ensureTutorialMapCloseWrapped();
  generateTutorialMap();

  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;
    window.MAP_STATE.proceedMode = true;
    window.MAP_STATE.startMapMode = false;
  }

  if(typeof closeRewardOverlay === "function") closeRewardOverlay();
  const over = document.getElementById("over");
  if(over) over.classList.remove("show");

  openMap();
  const overlay = document.getElementById("mapOverlay");
  if(overlay) overlay.classList.add("tutorial-map-mode");
  /* openMap()이 기본 bgmMap을 트는데, 튜토리얼 진행 중에는 처음부터 끝까지(전투 제외)
     튜토리얼 전용 BGM이 나와야 하므로 맵 BGM을 튜토리얼 BGM으로 바로 덮어쓴다. */
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmTutorial");
  }
  startTutorialMapIntro();
}

function generateTutorialMap(){
  const originalMapGenerator = window.ACT1_MAP_GENERATE;
  let generatedStages = null;
  window.ACT1_MAP_GENERATE = function tutorialMapGenerate(setMapData){
    const tutorialMapData = createTutorialMapData();
    generatedStages = tutorialMapData.stages;
    setMapData(
      tutorialMapData.floors,
      tutorialMapData.paths,
      tutorialMapData.stages,
      tutorialMapData.popupGetters,
      tutorialMapData.dims
    );
  };

  try {
    generateMap();
    /* battleInit.js가 전투 시작 시 window.ACT1_MAP_STAGES[stageIdx]로 스테이지 타입/패키지를
       참조하므로, 실제 ACT1 맵 생성(mapNodeLogic.js)과 동일하게 이 전역도 갱신해야
       튜토리얼 전투가 이전 ACT1 스테이지 데이터로 잘못 연결되지 않는다. */
    if(generatedStages) window.ACT1_MAP_STAGES = generatedStages;
  } finally {
    window.ACT1_MAP_GENERATE = originalMapGenerator;
  }
}

function createTutorialMapData(){
  const floors = [
    [],
    [],
    [],
    [{ id: "start", type: "start", emoji: "🚪", label: "튜토리얼" }],
    [{ id: "tutorial_battle", type: "enemy", emoji: "👺", label: "튜토리얼 구역", stageIndex: 0 }],
    [],
    [],
    []
  ];

  return {
    floors,
    paths: [[[3, 0], [4, 0]]],
    stages: [{
      label: "튜토리얼 구역",
      type: "tutorial",
      packageId: "tutorial_battle",
      getMonsters: () => []
    }],
    popupGetters: [() => []],
    dims: { mapFullH: 560 }
  };
}

function startTutorialMapIntro(){
  if(!tutorialMapActive) return;
  tutorialMapIntroActive = true;
  showTutorialMapClickBlocker();
  showTutorialMapDialogueSequence(MAP_INTRO_DIALOGUE_IDS, 0);
}

function showTutorialMapDialogueSequence(ids, index){
  if(!tutorialMapActive){
    tutorialMapIntroActive = false;
    removeTutorialMapClickBlocker();
    return;
  }
  if(index >= ids.length){
    tutorialMapIntroActive = false;
    removeTutorialMapClickBlocker();
    removeTutorialMapDialogue();
    applyTutorialMapHighlight("M-004");
    enableTutorialMapNodeSelect();
    setTutorialMapStep("map_intro_completed");
    console.log("tutorial map intro completed");
    return;
  }

  const dialogue = getTutorialMapDialogue(ids[index]);
  if(!dialogue){
    showTutorialMapDialogueSequence(ids, index + 1);
    return;
  }

  setTutorialMapStep(dialogue.id);
  applyTutorialMapHighlight(dialogue.id);
  renderTutorialMapDialogue(dialogue, () => {
    showTutorialMapDialogueSequence(ids, index + 1);
  });
}

function getTutorialMapDialogue(id){
  if(typeof window.getTutorialDialogueById !== "function") return null;
  return window.getTutorialDialogueById(id);
}

function enableTutorialMapNodeSelect(){
  if(tutorialMapNodeSelectActive) return;
  tutorialMapNodeSelectActive = true;
  TUTORIAL_MAP_BLOCK_EVENTS.forEach(eventName => {
    document.addEventListener(eventName, blockNonTutorialBattleNodeEvent, true);
  });
}

function disableTutorialMapNodeSelect(){
  if(!tutorialMapNodeSelectActive) return;
  tutorialMapNodeSelectActive = false;
  TUTORIAL_MAP_BLOCK_EVENTS.forEach(eventName => {
    document.removeEventListener(eventName, blockNonTutorialBattleNodeEvent, true);
  });
}

function blockNonTutorialBattleNodeEvent(event){
  if(!tutorialMapNodeSelectActive || !tutorialMapActive) return;
  if(isTutorialBattleNodeEvent(event)) return;
  event.preventDefault();
  event.stopPropagation();
}

function isTutorialBattleNodeEvent(event){
  const target = event.target;
  if(!target || typeof target.closest !== "function") return false;
  const overlay = target.closest("#mapOverlay.tutorial-map-mode");
  if(!overlay) return false;
  return !!target.closest('[data-nodeid="tutorial_battle"]');
}

function showTutorialMapBattleTransition(stageIdx){
  const dialogue = getTutorialMapDialogue("M-016");
  if(!dialogue){
    enterTutorialBattleFromMap(stageIdx);
    return;
  }

  tutorialMapIntroActive = true;
  disableTutorialMapNodeSelect();
  showTutorialMapClickBlocker();
  clearTutorialMapHighlight();
  applyTutorialMapHighlight("M-015");
  setTutorialMapStep(dialogue.id);
  renderTutorialMapDialogue(dialogue, () => {
    enterTutorialBattleFromMap(stageIdx);
  });
}

function enterTutorialBattleFromMap(stageIdx){
  tutorialMapIntroActive = false;
  disableTutorialMapNodeSelect();
  removeTutorialMapClickBlocker();
  removeTutorialMapDialogue();
  clearTutorialMapHighlight();

  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = stageIdx;
    window.MAP_STATE.proceedMode = false;
    window.MAP_STATE.startMapMode = false;
  }
  tutorialMapActive = false;
  const overlay = document.getElementById("mapOverlay");
  if(overlay) overlay.remove();
  if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.startTutorialBattle === "function"){
    window.TUTORIAL_BATTLE.startTutorialBattle();
  }
}

function setTutorialMapStep(step){
  if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.setTutorialStep === "function"){
    window.TUTORIAL_BATTLE.setTutorialStep(step);
  }
}

function ensureTutorialMapStageClickWrapped(){
  if(stageClickWrapped || typeof startStage !== "function") return;
  originalStartStage = startStage;
  stageClickWrapped = true;
  startStage = function tutorialWrappedStartStage(stageIdx){
    if(tutorialMapActive){
      if(tutorialMapIntroActive) return;
      console.log("[Tutorial] 튜토리얼 전투 노드 클릭", stageIdx);
      showTutorialMapBattleTransition(stageIdx);
      return;
    }
    return originalStartStage.apply(this, arguments);
  };
}

function ensureTutorialMapCloseWrapped(){
  if(closeMapWrapped || typeof closeMap !== "function") return;
  originalCloseMap = closeMap;
  closeMapWrapped = true;
  closeMap = function tutorialWrappedCloseMap(){
    const shouldReturnToNewbieStart = tutorialMapActive;
    if(tutorialMapActive){
      tutorialMapActive = false;
      tutorialMapIntroActive = false;
      disableTutorialMapNodeSelect();
      removeTutorialMapClickBlocker();
      clearTutorialMapHighlight();
      removeTutorialMapDialogue();
    }
    if(shouldReturnToNewbieStart && window.MAP_STATE){
      window.MAP_STATE.currentStage = -1;
      window.MAP_STATE.proceedMode = false;
      window.MAP_STATE.startMapMode = true;
    }
    return originalCloseMap.apply(this, arguments);
  };
}

window.TUTORIAL_MAP_SYSTEM = {
  open: openTutorialMap,
  isActive: () => tutorialMapActive
};
