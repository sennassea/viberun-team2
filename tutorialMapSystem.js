"use strict";
/* =========================================================================
   Tutorial Map System
   - Isolated tutorial-only map branch. Does not modify ACT1 map generation.
   ========================================================================= */

(function(){
  let tutorialMapActive = false;
  let originalStartStage = null;
  let originalCloseMap = null;
  let stageClickWrapped = false;
  let closeMapWrapped = false;

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

    const startScreen = document.getElementById("startScreen");
    if(startScreen) startScreen.classList.add("hidden");
    if(typeof closeRewardOverlay === "function") closeRewardOverlay();
    const over = document.getElementById("over");
    if(over) over.classList.remove("show");

    openMap();
    const overlay = document.getElementById("mapOverlay");
    if(overlay) overlay.classList.add("tutorial-map-mode");
    const title = document.querySelector("#mapOverlay .map-title");
    if(title) title.textContent = "🗺️ 튜토리얼 지도";
  }

  function generateTutorialMap(){
    const originalMapGenerator = window.ACT1_MAP_GENERATE;
    window.ACT1_MAP_GENERATE = function tutorialMapGenerate(setMapData){
      const tutorialMapData = createTutorialMapData();
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
    } finally {
      window.ACT1_MAP_GENERATE = originalMapGenerator;
    }
  }

  function createTutorialMapData(){
    const floors = [
      [],
      [],
      [],
      [{ id: "start", type: "start", emoji: "🚪", label: "시작 지점" }],
      [{ id: "tutorial_battle", type: "enemy", emoji: "👺", label: "튜토리얼 전투", stageIndex: 0 }],
      [],
      [],
      []
    ];

    return {
      floors,
      paths: [[[3, 0], [4, 0]]],
      stages: [{
        label: "튜토리얼 전투",
        type: "tutorial",
        packageId: "tutorial_battle",
        getMonsters: () => []
      }],
      popupGetters: [() => []],
      dims: { mapFullH: 560 }
    };
  }

  function ensureTutorialMapStyles(){
    if(document.getElementById("tutorialMapStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialMapStyles";
    style.textContent = `
      #mapOverlay.tutorial-map-mode .mfloor-lbl{
        display:none;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTutorialMapStageClickWrapped(){
    if(stageClickWrapped || typeof startStage !== "function") return;
    originalStartStage = startStage;
    stageClickWrapped = true;
    startStage = function tutorialWrappedStartStage(stageIdx){
      if(tutorialMapActive){
        console.log("[Tutorial] 튜토리얼 전투 노드 클릭", stageIdx);
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
      if(tutorialMapActive) tutorialMapActive = false;
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
})();
