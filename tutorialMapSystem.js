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
  let tutorialMapIntroActive = false;
  const MAP_INTRO_DIALOGUE_IDS = ["M-001", "M-002", "M-003"];

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
    const title = document.querySelector("#mapOverlay .map-title");
    if(title) title.textContent = "🗺️ 튜토리얼 여정";
    startTutorialMapIntro();
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
      [{ id: "start", type: "start", emoji: "🚪", label: "집" }],
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

  function ensureTutorialMapStyles(){
    if(document.getElementById("tutorialMapStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialMapStyles";
    style.textContent = `
      #mapOverlay.tutorial-map-mode{
        z-index:220;
      }
      #mapOverlay.tutorial-map-mode .mfloor-lbl{
        display:none;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue{
        position:absolute;
        left:50%;
        bottom:2.4cqh;
        transform:translateX(-50%);
        z-index:12;
        pointer-events:none;
        width:min(54cqw, 72cqh);
        padding:1.6cqh 1.8cqw;
        border:0.22cqh solid rgba(255,255,255,.88);
        border-radius:1cqh;
        background:rgba(244,248,252,.96);
        color:#243247;
        box-shadow:0 1.2cqh 2.8cqh rgba(20,35,60,.22);
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-speaker{
        margin-bottom:.7cqh;
        font-size:1.7cqh;
        font-weight:900;
        color:#2f66a8;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-text{
        font-size:1.9cqh;
        line-height:1.45;
        font-weight:800;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-actions{
        display:flex;
        justify-content:flex-end;
        margin-top:1.2cqh;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-next{
        pointer-events:auto;
        min-width:7.5cqw;
        min-height:4.2cqh;
        border:0.16cqh solid #2f66a8;
        border-radius:.8cqh;
        background:#4b8bd8;
        color:#fff;
        font-size:1.7cqh;
        font-weight:900;
        cursor:pointer;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-click-blocker{
        position:absolute;
        inset:0;
        z-index:11;
        background:rgba(12,24,40,.12);
        cursor:default;
      }
    `;
    document.head.appendChild(style);
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
    renderTutorialMapDialogue(dialogue, () => {
      showTutorialMapDialogueSequence(ids, index + 1);
    });
  }

  function getTutorialMapDialogue(id){
    if(typeof window.getTutorialDialogueById !== "function") return null;
    return window.getTutorialDialogueById(id);
  }

  function renderTutorialMapDialogue(dialogue, onNext){
    const overlay = document.getElementById("mapOverlay");
    if(!overlay || !overlay.classList.contains("tutorial-map-mode")) return;

    removeTutorialMapDialogue();

    const box = document.createElement("div");
    box.className = "tutorial-map-dialogue";
    box.innerHTML =
      '<div class="tutorial-map-dialogue-speaker">' + escapeTutorialMapHtml(dialogue.speaker || "") + '</div>' +
      '<div class="tutorial-map-dialogue-text">' + renderTutorialMapText(dialogue.text || "") + '</div>' +
      '<div class="tutorial-map-dialogue-actions">' +
        '<button type="button" class="tutorial-map-dialogue-next">다음</button>' +
      '</div>';

    const nextButton = box.querySelector(".tutorial-map-dialogue-next");
    if(nextButton) nextButton.addEventListener("click", onNext);
    overlay.appendChild(box);
  }

  function removeTutorialMapDialogue(){
    const dialogue = document.querySelector("#mapOverlay .tutorial-map-dialogue");
    if(dialogue) dialogue.remove();
  }

  function showTutorialMapClickBlocker(){
    const overlay = document.getElementById("mapOverlay");
    if(!overlay || !overlay.classList.contains("tutorial-map-mode")) return;
    if(overlay.querySelector(".tutorial-map-click-blocker")) return;

    const blocker = document.createElement("div");
    blocker.className = "tutorial-map-click-blocker";
    ["pointerdown", "mousedown", "mouseup", "click", "touchstart", "touchend"].forEach(eventName => {
      blocker.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
      });
    });
    overlay.appendChild(blocker);
  }

  function removeTutorialMapClickBlocker(){
    const blocker = document.querySelector("#mapOverlay .tutorial-map-click-blocker");
    if(blocker) blocker.remove();
  }

  function setTutorialMapStep(step){
    if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.setTutorialStep === "function"){
      window.TUTORIAL_BATTLE.setTutorialStep(step);
    }
  }

  function escapeTutorialMapHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTutorialMapText(text){
    return escapeTutorialMapHtml(text).replace(/&lt;br&gt;/g, "<br>");
  }

  function ensureTutorialMapStageClickWrapped(){
    if(stageClickWrapped || typeof startStage !== "function") return;
    originalStartStage = startStage;
    stageClickWrapped = true;
    startStage = function tutorialWrappedStartStage(stageIdx){
      if(tutorialMapActive){
        if(tutorialMapIntroActive) return;
        console.log("[Tutorial] 튜토리얼 전투 노드 클릭", stageIdx);
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
        removeTutorialMapClickBlocker();
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
})();
