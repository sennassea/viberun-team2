"use strict";
/* =========================================================================
   Tutorial Battle State
   - Owns tutorial-only battle state and policy hooks.
   - Delegates to the existing tutorial battle entry without touching normal combat.
   ========================================================================= */

(function(){
  const VOLUME_KEY = "viberunVolumeSettings";
  const DEFAULT_VOLUMES = { master: 80, music: 70, effect: 80 };
  const state = {
    isTutorialBattleActive: false,
    currentTutorialStep: null,
    tutorialBattleExitTarget: "newbieStart",
    tutorialEncounterId: "stage_tutorial_child_spirit"
  };
  const BATTLE_INTRO_DIALOGUE_IDS = ["W-001", "W-002", "W-003"];
  const BATTLE_INTRO_BLOCK_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "touchstart", "touchend"];
  let tutorialPauseState = null;
  let tutorialBattleIntroActive = false;
  let tutorialBattleIntroPauseState = null;

  function startTutorialBattle(){
    state.isTutorialBattleActive = true;
    state.currentTutorialStep = state.currentTutorialStep || "start";
    applyTutorialBattleRootState(true);
    if(typeof window.startTutorialBattle === "function"){
      window.startTutorialBattle();
    }
    deferTutorialBattleIntro();
  }

  function endTutorialBattle(){
    cleanupTutorialBattleIntro();
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

  function deferTutorialBattleIntro(){
    if(typeof requestAnimationFrame === "function"){
      requestAnimationFrame(() => requestAnimationFrame(startTutorialBattleIntro));
      return;
    }
    setTimeout(startTutorialBattleIntro, 0);
  }

  function startTutorialBattleIntro(){
    if(!isTutorialBattle()) return;
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    showTutorialBattleIntroDialogueSequence(BATTLE_INTRO_DIALOGUE_IDS, 0);
  }

  function showTutorialBattleIntroDialogueSequence(ids, index){
    if(!tutorialBattleIntroActive || !isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= ids.length){
      cleanupTutorialBattleIntro();
      setTutorialStep("battle_intro_completed");
      console.log("tutorial battle intro completed");
      return;
    }

    const dialogue = getTutorialBattleDialogue(ids[index]);
    if(!dialogue){
      showTutorialBattleIntroDialogueSequence(ids, index + 1);
      return;
    }

    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue(dialogue, () => {
      showTutorialBattleIntroDialogueSequence(ids, index + 1);
    });
  }

  function getTutorialBattleDialogue(id){
    if(typeof window.getTutorialDialogueById !== "function") return null;
    return window.getTutorialDialogueById(id);
  }

  function renderTutorialBattleIntroDialogue(dialogue, onNext){
    const root = document.getElementById("game");
    if(!root) return;

    removeTutorialBattleIntroOverlay();

    const overlay = document.createElement("div");
    overlay.className = "tutorial-battle-intro-overlay";
    overlay.setAttribute("aria-hidden", "false");
    overlay.innerHTML =
      '<div class="tutorial-battle-intro-dialogue" role="dialog" aria-modal="true">' +
        '<div class="tutorial-battle-intro-speaker">' + escapeTutorialBattleIntroHtml(dialogue.speaker || "") + '</div>' +
        '<div class="tutorial-battle-intro-text">' + renderTutorialBattleIntroText(dialogue.text || "") + '</div>' +
        '<div class="tutorial-battle-intro-actions">' +
          '<button type="button" class="tutorial-battle-intro-next">다음</button>' +
        '</div>' +
      '</div>';

    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      overlay.addEventListener(eventName, blockTutorialBattleIntroEvent);
    });
    const nextButton = overlay.querySelector(".tutorial-battle-intro-next");
    if(nextButton){
      nextButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        onNext();
      });
    }
    root.appendChild(overlay);
    if(nextButton) nextButton.focus();
  }

  function blockTutorialBattleIntroEvent(event){
    if(event.target && typeof event.target.closest === "function" && event.target.closest(".tutorial-battle-intro-next")){
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function cleanupTutorialBattleIntro(){
    tutorialBattleIntroActive = false;
    removeTutorialBattleIntroOverlay();
    resumeTutorialBattleIntroCombat();
  }

  function removeTutorialBattleIntroOverlay(){
    const overlay = document.querySelector("#game .tutorial-battle-intro-overlay");
    if(overlay) overlay.remove();
  }

  function pauseTutorialBattleIntroCombat(){
    if(tutorialBattleIntroPauseState || typeof S === "undefined" || !S || S.over) return;
    tutorialBattleIntroPauseState = { busy: !!S.busy };
    S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function resumeTutorialBattleIntroCombat(){
    if(!tutorialBattleIntroPauseState) return;
    if(typeof S !== "undefined" && S && !S.over){
      S.busy = tutorialBattleIntroPauseState.busy;
      if(typeof updateEndBtn === "function") updateEndBtn();
    }
    tutorialBattleIntroPauseState = null;
  }

  function ensureTutorialBattleIntroStyles(){
    if(document.getElementById("tutorialBattleIntroStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialBattleIntroStyles";
    style.textContent =
      ".tutorial-battle-intro-overlay{position:absolute;inset:0;z-index:280;background:rgba(12,24,40,.18);display:block;cursor:default;}" +
      ".tutorial-battle-intro-dialogue{position:absolute;left:50%;bottom:3cqh;transform:translateX(-50%);z-index:281;width:min(54cqw,72cqh);padding:1.6cqh 1.8cqw;border:0.22cqh solid rgba(255,255,255,.88);border-radius:1cqh;background:rgba(244,248,252,.97);color:#243247;box-shadow:0 1.2cqh 2.8cqh rgba(20,35,60,.24);}" +
      ".tutorial-battle-intro-speaker{margin-bottom:.7cqh;font-size:1.7cqh;font-weight:900;color:#2f66a8;}" +
      ".tutorial-battle-intro-text{font-size:1.9cqh;line-height:1.45;font-weight:800;}" +
      ".tutorial-battle-intro-actions{display:flex;justify-content:flex-end;margin-top:1.2cqh;}" +
      ".tutorial-battle-intro-next{min-width:7.5cqw;min-height:4.2cqh;border:0.16cqh solid #2f66a8;border-radius:.8cqh;background:#4b8bd8;color:#fff;font-size:1.7cqh;font-weight:900;cursor:pointer;}";
    document.head.appendChild(style);
  }

  function escapeTutorialBattleIntroHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTutorialBattleIntroText(text){
    return escapeTutorialBattleIntroHtml(text).replace(/&lt;br&gt;/g, "<br>");
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
    applyTutorialVolumeSettings();
    const closeButton = overlay.querySelector(".tutorial-battle-settings-close");
    if(closeButton) closeButton.focus();
  }

  function closeTutorialSettings(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    closeTutorialHelp();
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
          '<button type="button" class="tutorial-battle-settings-help" aria-label="도움말">?</button>' +
          '<button type="button" class="tutorial-battle-settings-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="tutorial-battle-settings-body">' +
          '<section class="tutorial-battle-settings-section" aria-label="음량 조절">' +
            '<h3>음량 조절</h3>' +
            tutorialVolumeControlHtml("master", "전체 음량", 80) +
            tutorialVolumeControlHtml("music", "배경 음악", 70) +
            tutorialVolumeControlHtml("effect", "효과음", 80) +
          '</section>' +
          '<div class="tutorial-battle-settings-actions">' +
            '<button type="button" class="tutorial-battle-settings-exit">튜토리얼 나가기</button>' +
          '</div>' +
        '</div>' +
        '<div class="tutorial-battle-help-layer" aria-hidden="true">' +
          '<div class="tutorial-battle-help-panel" role="dialog" aria-modal="true" aria-labelledby="tutorialBattleHelpTitle">' +
            '<div class="tutorial-battle-help-head">' +
              '<h3 id="tutorialBattleHelpTitle">조작법</h3>' +
              '<button type="button" class="tutorial-battle-help-close" aria-label="도움말 닫기">×</button>' +
            '</div>' +
            '<div class="tutorial-battle-help-content">' +
              '<section><h4>튜토리얼 전투</h4><p>전투의 기본 조작을 순서대로 연습합니다.</p></section>' +
              '<section><h4>카드 사용</h4><p>카드를 드래그해서 대상에게 놓으면 사용할 수 있습니다.</p></section>' +
              '<section><h4>턴 종료</h4><p>더 사용할 카드가 없다면 턴 종료로 적의 행동을 진행합니다.</p></section>' +
            '</div>' +
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
    overlay.addEventListener("input", event => {
      if(!event.target.matches(".tutorial-battle-volume input")) return;
      const output = event.target.closest(".tutorial-battle-volume").querySelector("output");
      if(output) output.textContent = event.target.value;
      saveTutorialVolumeSettings();
      applyTutorialVolumeSettings();
    });
    overlay.querySelector(".tutorial-battle-settings-help").addEventListener("click", openTutorialHelp);
    overlay.querySelector(".tutorial-battle-help-close").addEventListener("click", closeTutorialHelp);
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
      if(overlay.querySelector(".tutorial-battle-help-layer.show")){
        closeTutorialHelp();
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
      ".tutorial-battle-settings-help{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-blue-deep);font-size:2.2cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".tutorial-battle-settings-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
      ".tutorial-battle-settings-body{padding:2cqh 0 0;display:flex;flex-direction:column;gap:2cqh;}" +
      ".tutorial-battle-settings-section{border:0.18cqh solid var(--c-panel-line);border-radius:1.2cqh;background:rgba(255,255,255,.58);padding:1.6cqh 1.4cqw;}" +
      ".tutorial-battle-settings-section h3{font-size:2.1cqh;margin-bottom:1cqh;color:var(--c-ink);}" +
      ".tutorial-battle-volume{display:grid;grid-template-columns:8cqw minmax(0,1fr) 4cqw;align-items:center;gap:1cqw;margin-top:1cqh;color:var(--c-ink-soft);font-size:1.7cqh;font-weight:800;}" +
      ".tutorial-battle-volume input{width:100%;accent-color:var(--c-blue);}" +
      ".tutorial-battle-volume output{text-align:right;color:var(--c-ink);font-weight:900;}" +
      ".tutorial-battle-settings-actions{display:flex;justify-content:flex-end;gap:1cqw;}" +
      ".tutorial-battle-settings-actions button{height:4.4cqh;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".tutorial-battle-settings-exit{background:#fff1ef;color:var(--c-red-deep);}" +
      ".tutorial-battle-help-layer{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".tutorial-battle-help-layer.show{display:grid;}" +
      ".tutorial-battle-help-panel{width:min(46cqw,68cqh);max-height:58cqh;display:flex;flex-direction:column;background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:1.8cqh 1.6cqw;}" +
      ".tutorial-battle-help-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1cqh;border-bottom:0.14cqh solid var(--c-panel-line);}" +
      ".tutorial-battle-help-head h3{flex:1;font-size:2.4cqh;color:var(--c-ink);}" +
      ".tutorial-battle-help-close{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:2.6cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".tutorial-battle-help-content{min-height:0;overflow-y:auto;padding:1.2cqh .4cqw 0 0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}" +
      ".tutorial-battle-help-content section{padding:1cqh 0;border-bottom:0.12cqh solid rgba(150,170,200,.35);}" +
      ".tutorial-battle-help-content section:last-child{border-bottom:0;}" +
      ".tutorial-battle-help-content h4{font-size:1.9cqh;color:var(--c-ink);margin-bottom:.5cqh;}" +
      ".tutorial-battle-help-content p{font-size:1.65cqh;line-height:1.5;color:var(--c-ink-soft);font-weight:800;}" +
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

  function tutorialVolumeControlHtml(id, label, value){
    return '<label class="tutorial-battle-volume" for="tutorialBattleVolume' + id + '">' +
      '<span>' + label + '</span>' +
      '<input id="tutorialBattleVolume' + id + '" type="range" min="0" max="100" value="' + value + '">' +
      '<output>' + value + '</output>' +
    '</label>';
  }

  function getTutorialVolumeSettings(){
    if(window.VIBERUN_VOLUME_SETTINGS && typeof window.VIBERUN_VOLUME_SETTINGS.read === "function"){
      return window.VIBERUN_VOLUME_SETTINGS.read();
    }
    if(typeof localStorage === "undefined") return { ...DEFAULT_VOLUMES };
    try {
      const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) || "{}");
      return {
        master: Number.isFinite(saved.master) ? saved.master : DEFAULT_VOLUMES.master,
        music: Number.isFinite(saved.music) ? saved.music : DEFAULT_VOLUMES.music,
        effect: Number.isFinite(saved.effect) ? saved.effect : DEFAULT_VOLUMES.effect,
      };
    } catch(error) {
      localStorage.removeItem(VOLUME_KEY);
      return { ...DEFAULT_VOLUMES };
    }
  }

  function saveTutorialVolumeSettings(){
    if(typeof localStorage === "undefined") return;
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const volumes = {};
    overlay.querySelectorAll(".tutorial-battle-volume input").forEach(input => {
      const key = input.id.replace("tutorialBattleVolume", "");
      volumes[key] = Number(input.value);
    });
    if(window.VIBERUN_VOLUME_SETTINGS && typeof window.VIBERUN_VOLUME_SETTINGS.write === "function"){
      window.VIBERUN_VOLUME_SETTINGS.write(volumes);
      return;
    }
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
  }

  function applyTutorialVolumeSettings(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const volumes = getTutorialVolumeSettings();
    overlay.querySelectorAll(".tutorial-battle-volume input").forEach(input => {
      const key = input.id.replace("tutorialBattleVolume", "");
      const value = volumes[key] ?? DEFAULT_VOLUMES[key] ?? 80;
      input.value = value;
      const output = input.closest(".tutorial-battle-volume").querySelector("output");
      if(output) output.textContent = value;
    });
  }

  function openTutorialHelp(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const helpLayer = overlay.querySelector(".tutorial-battle-help-layer");
    if(!helpLayer) return;
    helpLayer.classList.add("show");
    helpLayer.setAttribute("aria-hidden", "false");
    const closeButton = helpLayer.querySelector(".tutorial-battle-help-close");
    if(closeButton) closeButton.focus();
  }

  function closeTutorialHelp(){
    const overlay = document.getElementById("tutorialBattleSettings");
    if(!overlay) return;
    const helpLayer = overlay.querySelector(".tutorial-battle-help-layer");
    if(!helpLayer) return;
    helpLayer.classList.remove("show");
    helpLayer.setAttribute("aria-hidden", "true");
    const helpButton = overlay.querySelector(".tutorial-battle-settings-help");
    if(overlay.classList.contains("show") && helpButton) helpButton.focus();
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
