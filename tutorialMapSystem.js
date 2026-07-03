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
  let tutorialMapNodeSelectActive = false;
  const MAP_INTRO_DIALOGUE_IDS = ["M-001", "M-002", "M-003", "M-004", "M-005", "M-006", "M-007", "M-008", "M-009", "M-010", "M-011", "M-012", "M-013"];
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
        --tutorial-dongjasin-avatar-width:7.2cqh;
        --tutorial-dongjasin-avatar-height:10.2cqh;
        --tutorial-dongjasin-avatar-left:-8.8cqh;
        --tutorial-dongjasin-avatar-top:-1.6cqh;
        --tutorial-dongjasin-avatar-transform:none;
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
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-content{
        display:block;
      }
      #mapOverlay.tutorial-map-mode .tutorial-dongjasin-avatar{
        position:absolute;
        left:var(--tutorial-dongjasin-avatar-left);
        top:var(--tutorial-dongjasin-avatar-top);
        transform:var(--tutorial-dongjasin-avatar-transform);
        width:var(--tutorial-dongjasin-avatar-width);
        height:var(--tutorial-dongjasin-avatar-height);
        pointer-events:none;
      }
      #mapOverlay.tutorial-map-mode .tutorial-dongjasin-avatar-placeholder{
        width:100%;
        height:100%;
        border:.22cqh solid rgba(47,102,168,.45);
        border-radius:46% 46% 42% 42% / 38% 38% 52% 52%;
        background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(220,234,250,.96));
        box-shadow:0 .45cqh 1cqh rgba(20,35,60,.16);
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-dialogue-body{
        min-width:0;
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
      #mapOverlay.tutorial-map-mode.tutorial-map-focus-active .mnode:not(.tutorial-map-focus-node){
        opacity:.45;
        filter:saturate(.75);
      }
      #mapOverlay.tutorial-map-mode.tutorial-map-focus-active .mpath{
        opacity:.35;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-path{
        opacity:1 !important;
        stroke:#ffd25f !important;
        stroke-width:5 !important;
        filter:drop-shadow(0 0 .8cqh rgba(255,210,95,.78));
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-legend{
        position:relative;
        z-index:13;
        isolation:isolate;
        opacity:1 !important;
        filter:none !important;
        background:rgba(244,248,252,.98) !important;
        border-color:#ffd25f !important;
        box-shadow:0 0 0 .36cqh #ffd25f,0 0 2.4cqh rgba(255,210,95,.95),0 1cqh 2.4cqh rgba(20,35,60,.26) !important;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-legend-panel{
        position:relative;
        z-index:13;
        isolation:isolate;
        opacity:1 !important;
        filter:none !important;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-legend-items .dmap-legend-item:not(.tutorial-map-focus-legend-item){
        opacity:.42;
        filter:saturate(.72);
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-legend-item{
        position:relative;
        z-index:14;
        opacity:1 !important;
        filter:none !important;
        background:rgba(255,248,214,.96) !important;
        box-shadow:0 0 0 .24cqh #ffd25f,0 0 1.2cqh rgba(255,210,95,.9) !important;
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-node{
        opacity:1;
        filter:drop-shadow(0 0 .8cqh rgba(255,210,95,.82));
      }
      #mapOverlay.tutorial-map-mode .tutorial-map-focus-node .mnode-bg{
        stroke:#ffd25f !important;
        stroke-width:5 !important;
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

  function renderTutorialMapDialogue(dialogue, onNext){
    const overlay = document.getElementById("mapOverlay");
    if(!overlay || !overlay.classList.contains("tutorial-map-mode")) return;

    removeTutorialMapDialogue();

    const box = document.createElement("div");
    box.className = "tutorial-map-dialogue";
    const avatarHtml = dialogue.speaker === "동자신"
      ? '<div class="tutorial-dongjasin-avatar" aria-hidden="true"><div class="tutorial-dongjasin-avatar-placeholder"></div></div>'
      : "";
    box.innerHTML =
      avatarHtml +
      '<div class="tutorial-map-dialogue-content">' +
        '<div class="tutorial-map-dialogue-body">' +
          '<div class="tutorial-map-dialogue-speaker">' + escapeTutorialMapHtml(dialogue.speaker || "") + '</div>' +
          '<div class="tutorial-map-dialogue-text">' + renderTutorialMapText(dialogue.text || "") + '</div>' +
          '<div class="tutorial-map-dialogue-actions">' +
            '<button type="button" class="tutorial-map-dialogue-next">다음</button>' +
          '</div>' +
        '</div>' +
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
    TUTORIAL_MAP_BLOCK_EVENTS.forEach(eventName => {
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

  function applyTutorialMapHighlight(dialogueId){
    clearTutorialMapHighlight();
    const overlay = document.getElementById("mapOverlay");
    if(!overlay || !overlay.classList.contains("tutorial-map-mode")) return;

    let node = null;
    if(dialogueId === "M-002" || dialogueId === "M-003"){
      node = overlay.querySelector("#mapCanvas .mnode-current");
    } else if(dialogueId === "M-004"){
      node = overlay.querySelector('#mapCanvas [data-nodeid="tutorial_battle"]');
    } else if(dialogueId === "M-005"){
      const path = overlay.querySelector("#mapCanvas .mpath");
      if(path){
        overlay.classList.add("tutorial-map-focus-active");
        path.classList.add("tutorial-map-focus-path");
      }
      return;
    } else if(dialogueId === "M-006" || dialogueId === "M-007"){
      const legend = overlay.querySelector("#dMapLegend, .dmap-legend, .map-legend");
      if(legend){
        overlay.classList.add("tutorial-map-focus-active");
        legend.classList.add("tutorial-map-focus-legend");
      }
      return;
    } else if(MAP_LEGEND_DIALOGUE_TYPES[dialogueId]){
      applyTutorialMapLegendItemHighlight(MAP_LEGEND_DIALOGUE_TYPES[dialogueId]);
      return;
    }

    if(!node) return;
    overlay.classList.add("tutorial-map-focus-active");
    node.classList.add("tutorial-map-focus-node");
  }

  function clearTutorialMapHighlight(){
    const overlay = document.getElementById("mapOverlay");
    if(!overlay) return;
    overlay.classList.remove("tutorial-map-focus-active");
    overlay.querySelectorAll(".tutorial-map-focus-node").forEach(node => {
      node.classList.remove("tutorial-map-focus-node");
    });
    overlay.querySelectorAll(".tutorial-map-focus-path").forEach(path => {
      path.classList.remove("tutorial-map-focus-path");
    });
    overlay.querySelectorAll(".tutorial-map-focus-legend").forEach(legend => {
      legend.classList.remove("tutorial-map-focus-legend");
    });
    overlay.querySelectorAll(".tutorial-map-focus-legend-panel").forEach(legend => {
      legend.classList.remove("tutorial-map-focus-legend-panel", "tutorial-map-focus-legend-items");
    });
    overlay.querySelectorAll(".tutorial-map-focus-legend-item").forEach(item => {
      item.classList.remove("tutorial-map-focus-legend-item");
    });
  }

  function applyTutorialMapLegendItemHighlight(type){
    const overlay = document.getElementById("mapOverlay");
    if(!overlay || !overlay.classList.contains("tutorial-map-mode")) return;
    const legend = overlay.querySelector("#dMapLegend, .dmap-legend, .map-legend");
    if(!legend) return;
    const item = legend.querySelector('.dmap-legend-item[data-type="' + type + '"], .legend-item[data-type="' + type + '"]');
    if(!item) return;

    overlay.classList.add("tutorial-map-focus-active");
    legend.classList.add("tutorial-map-focus-legend-panel", "tutorial-map-focus-legend-items");
    item.classList.add("tutorial-map-focus-legend-item");
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
        disableTutorialMapNodeSelect();
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
})();
