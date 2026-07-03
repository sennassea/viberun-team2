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
  const BATTLE_INTRO_DIALOGUE_IDS = ["W-001", "W-002", "W-003", "W-004", "W-005", "W-006", "W-007", "W-008"];
  const BATTLE_INTRO_ENEMY_HIGHLIGHT_IDS = new Set(["W-004"]);
  const BATTLE_ENEMY_HIGHLIGHT_SELECTOR = ".combatant.enemy:not(.dead)";
  const BATTLE_UI_GUIDE_STEPS = [
    { id: "W-009", target: [".player-info-card .hud-hp-row", ".player-info-card .hud-hpbar"] },
    { id: "W-010", target: [".player-info-card .hud-hp-row", ".player-info-card .hud-hpbar"] },
    { id: "W-011", target: [".player-info-card .hud-hp-row", ".player-info-card .hud-hpbar"] },
    { id: "W-012", target: ".enemy .hpbar" },
    { id: "W-013", target: ".enemy .hpbar" },
    { id: "W-014" },
    { id: "W-015", target: "#energy" },
    { id: "W-016", target: "#energy" },
    { id: "W-017", target: "#energy" },
    { id: "W-018", target: "#energy" },
    { id: "W-019", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-020", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" }
  ];
  const FIRST_ATTACK_DIALOGUE_ID = "W-021";
  const FIRST_ATTACK_COMPLETE_DIALOGUE_ID = "W-022";
  const FIRST_ATTACK_FOLLOWUP_STEPS = [
    { id: "W-023", target: ["#energy", ".enemy .hpbar"], separateHighlights: true },
    { id: "W-024", target: ".enemy .intent" },
    { id: "W-025", target: ".enemy .intent" },
    { id: "W-026", target: ".enemy .intent" },
    { id: "W-027", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-028", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-029", target: [".player-info-card .hud-hp-row", ".player-info-card .hud-hpbar"], dialogueClass: "tutorial-battle-intro-dialogue-top" }
  ];
  const BLOCK_CARD_DIALOGUE_ID = "W-030";
  const BLOCK_COMPLETE_DIALOGUE_ID = "W-031";
  const BLOCK_COMPLETE_HIGHLIGHT_SELECTOR = '#profileStatusEffects [data-status="block"]';
  const BLOCK_FOLLOWUP_STEPS = [
    { id: "W-032", target: BLOCK_COMPLETE_HIGHLIGHT_SELECTOR },
    { id: "W-033", target: "#endTurn" },
    { id: "W-034", target: "#endTurn" }
  ];
  const END_TURN_DIALOGUE_ID = "W-035";
  const ENEMY_ACTION_DIALOGUE_ID = "W-036";
  const ENEMY_ACTION_COMPLETE_DIALOGUE_ID = "W-037";
  const POST_ENEMY_GUIDE_STEPS = [
    { id: "W-038" },
    { id: "W-039", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-040", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-041", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-042", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-043", target: ".card-hand-area", dialogueClass: "tutorial-battle-intro-dialogue-top" },
    { id: "W-044" }
  ];
  const FINAL_ATTACK_INTRO_STEPS = [
    { id: "W-045", target: ".enemy .hpbar" },
    { id: "W-046" }
  ];
  const FINAL_LOW_HP_GUIDE_STEPS = [
    { id: "W-047", target: ".enemy .hpbar" },
    { id: "W-048", target: ".enemy .hpbar" },
    { id: "W-049", target: BATTLE_ENEMY_HIGHLIGHT_SELECTOR },
    { id: "W-050", target: ".enemy .hpbar" },
    { id: "W-051", target: ".enemy .hpbar" },
    { id: "W-052", target: BATTLE_ENEMY_HIGHLIGHT_SELECTOR }
  ];
  const FINAL_ENDING_DIALOGUE_STEPS = [
    { id: "W-053" },
    { id: "W-054" },
    { id: "W-055" },
    { id: "W-056", systemPopup: true },
    { id: "W-057" },
    { id: "W-058" },
    { id: "W-059" },
    { id: "W-060" },
    { id: "W-061" },
    { id: "W-062" },
    { id: "W-063" }
  ];
  const BATTLE_INTRO_BLOCK_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "touchstart", "touchend"];
  let tutorialPauseState = null;
  let tutorialBattleIntroActive = false;
  let tutorialBattleIntroPauseState = null;
  let firstAttackCardState = null;
  let blockCardState = null;
  let endTurnState = null;
  let skillCardState = null;
  let finalAttackCardState = null;
  let tutorialFirstNewTurnSkillCardGuaranteed = false;
  let finalFreePlayActive = false;
  let finalLowHpGuideShown = false;
  let finalEndingDialogueShown = false;

  function startTutorialBattle(){
    state.isTutorialBattleActive = true;
    state.currentTutorialStep = state.currentTutorialStep || "start";
    tutorialFirstNewTurnSkillCardGuaranteed = false;
    resetTutorialFinalFreePlayState();
    applyTutorialBattleRootState(true);
    if(typeof window.startTutorialBattle === "function"){
      window.startTutorialBattle();
    }
    ensureTutorialBattleRequiredHandCards();
    deferTutorialBattleIntro();
  }

  function endTutorialBattle(){
    cleanupTutorialBattleIntro();
    cleanupFirstAttackCardStep();
    cleanupBlockCardStep();
    cleanupSkillCardStep();
    cleanupFinalAttackCardStep();
    cleanupEndTurnStep();
    tutorialFirstNewTurnSkillCardGuaranteed = false;
    resetTutorialFinalFreePlayState();
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

  function canUseCard(card, cardKey, handIndex){
    if(firstAttackCardState && firstAttackCardState.active){
      return cardKey === firstAttackCardState.cardKey && handIndex === firstAttackCardState.handIndex;
    }
    if(blockCardState && blockCardState.active){
      return cardKey === blockCardState.cardKey && handIndex === blockCardState.handIndex;
    }
    if(skillCardState && skillCardState.active){
      return cardKey === skillCardState.cardKey && handIndex === skillCardState.handIndex;
    }
    if(finalAttackCardState && finalAttackCardState.active){
      return cardKey === finalAttackCardState.cardKey && handIndex === finalAttackCardState.handIndex;
    }
    if(endTurnState && endTurnState.active) return false;
    return true;
  }

  function canEndTurn(){
    if(firstAttackCardState && firstAttackCardState.active) return false;
    if(blockCardState && blockCardState.active) return false;
    if(skillCardState && skillCardState.active) return false;
    if(finalAttackCardState && finalAttackCardState.active) return false;
    return true;
  }

  function isEndTurnStepActive(){
    return !!(endTurnState && endTurnState.active);
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
    if(firstAttackCardState && firstAttackCardState.active){
      if(actionType === "endTurn") return "먼저 강조된 주문을 사용해보세요.";
      return "강조된 주문만 사용할 수 있습니다.";
    }
    if(blockCardState && blockCardState.active){
      if(actionType === "endTurn") return "먼저 강조된 결계 주문을 사용해보세요.";
      return "강조된 결계 주문만 사용할 수 있습니다.";
    }
    if(skillCardState && skillCardState.active){
      if(actionType === "endTurn") return "먼저 강조된 조율 주문을 사용해보세요.";
      return "강조된 조율 주문만 사용할 수 있습니다.";
    }
    if(finalAttackCardState && finalAttackCardState.active){
      if(actionType === "endTurn") return "먼저 강조된 정화 주문을 사용해보세요.";
      return "강조된 정화 주문만 사용할 수 있습니다.";
    }
    if(endTurnState && endTurnState.active){
      if(actionType === "endTurn") return "";
      return "지금은 차례 넘기기 버튼만 사용할 수 있습니다.";
    }
    return "";
  }

  function ensureTutorialBattleRequiredHandCards(){
    if(!isTutorialBattle() || typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return;
    const requiredKeys = [
      findTutorialCardKey(isFirstAttackTutorialCard),
      findTutorialCardKey(isBlockTutorialCard)
    ];
    let changed = false;
    requiredKeys.forEach(cardKey => {
      if(!cardKey) return;
      const alreadyHasType = S.hand.some(existingKey => {
        const existingCard = CARD_DB[existingKey];
        const requiredCard = CARD_DB[cardKey];
        if(!requiredCard) return false;
        if(isFirstAttackTutorialCard(requiredCard)){
          return isFirstAttackTutorialCard(existingCard);
        }
        if(isBlockTutorialCard(requiredCard)){
          return isBlockTutorialCard(existingCard);
        }
        return false;
      });
      if(!alreadyHasType){
        S.hand.push(cardKey);
        changed = true;
      }
    });
    if(changed && typeof renderAll === "function") renderAll();
  }

  function ensureTutorialFirstNewTurnSkillCard(){
    if(tutorialFirstNewTurnSkillCardGuaranteed) return;
    if(!isTutorialBattle() || typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return;
    tutorialFirstNewTurnSkillCardGuaranteed = true;
    const alreadyHasSkillCard = S.hand.some(cardKey => isTutorialSkillCard(CARD_DB[cardKey]));
    if(alreadyHasSkillCard) return;
    const skillCardKey = findTutorialCardKey(isTutorialSkillCard);
    if(!skillCardKey) return;
    S.hand.push(skillCardKey);
    if(typeof renderAll === "function") renderAll();
  }

  function findTutorialCardKey(predicate){
    if(typeof CARD_DB === "undefined" || !CARD_DB) return null;
    return Object.keys(CARD_DB).find(cardKey => predicate(CARD_DB[cardKey])) || null;
  }

  function isFirstAttackTutorialCard(card){
    return !!(card && card.type === "attack" && card.target === "enemy");
  }

  function isBlockTutorialCard(card){
    return !!(card && (card.type === "defense" || card.type === "block" || card.type === "blockCleanse"));
  }

  function isTutorialSkillCard(card){
    return !!(card && card.type === "skill");
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
      clearTutorialBattleHighlight();
      removeTutorialBattleIntroOverlay();
      setTutorialStep("battle_intro_completed");
      console.log("tutorial battle intro completed");
      showTutorialBattleUiGuideSequence(BATTLE_UI_GUIDE_STEPS, 0);
      return;
    }

    const dialogue = getTutorialBattleDialogue(ids[index]);
    if(!dialogue){
      showTutorialBattleIntroDialogueSequence(ids, index + 1);
      return;
    }

    clearTutorialBattleHighlight();
    setTutorialStep(dialogue.id);
    const targetSelector = BATTLE_INTRO_ENEMY_HIGHLIGHT_IDS.has(dialogue.id)
      ? BATTLE_ENEMY_HIGHLIGHT_SELECTOR
      : dialogue.targetSelector;
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector }, () => {
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
    const dialogueClass = "tutorial-battle-intro-dialogue" + (dialogue.dialogueClass ? " " + dialogue.dialogueClass : "");
    const avatarHtml = dialogue.speaker === "동자신"
      ? '<div class="tutorial-dongjasin-avatar" aria-hidden="true"><div class="tutorial-dongjasin-avatar-placeholder"></div></div>'
      : "";
    overlay.innerHTML =
      '<div class="' + dialogueClass + '" role="dialog" aria-modal="true">' +
        avatarHtml +
        '<div class="tutorial-battle-intro-content">' +
          '<div class="tutorial-battle-intro-body">' +
            '<div class="tutorial-battle-intro-speaker">' + escapeTutorialBattleIntroHtml(dialogue.speaker || "") + '</div>' +
            '<div class="tutorial-battle-intro-text">' + renderTutorialBattleIntroText(dialogue.text || "") + '</div>' +
            '<div class="tutorial-battle-intro-actions">' +
              '<button type="button" class="tutorial-battle-intro-next">다음</button>' +
            '</div>' +
          '</div>' +
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
        clearTutorialBattleHighlight();
        onNext();
      });
    }
    root.appendChild(overlay);
    if(nextButton) nextButton.focus();
    updateTutorialBattleHighlight(dialogue.targetSelector, { separate: !!dialogue.separateHighlights });
  }

  function renderTutorialBattleSystemPopup(dialogue, onNext){
    const root = document.getElementById("game");
    if(!root) return;
    removeTutorialBattleIntroOverlay();

    const overlay = document.createElement("div");
    overlay.className = "tutorial-battle-intro-overlay";
    overlay.innerHTML =
      '<div class="tutorial-battle-system-popup" role="dialog" aria-modal="true">' +
        '<div class="tutorial-battle-system-text">' + renderTutorialBattleIntroText(dialogue.text || "") + '</div>' +
        '<div class="tutorial-battle-system-actions">' +
          '<button type="button" class="tutorial-battle-intro-next">다음</button>' +
        '</div>' +
      '</div>';
    overlay.addEventListener("click", event => {
      if(event.target && typeof event.target.closest === "function" && event.target.closest(".tutorial-battle-intro-next")) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    const nextButton = overlay.querySelector(".tutorial-battle-intro-next");
    nextButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if(typeof onNext === "function") onNext();
    });
    root.appendChild(overlay);
    nextButton.focus();
    clearTutorialBattleHighlight();
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
    clearTutorialBattleHighlight();
    resumeTutorialBattleIntroCombat();
  }

  function cleanupFirstAttackCardStep(){
    firstAttackCardState = null;
    clearFirstAttackCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function cleanupBlockCardStep(){
    blockCardState = null;
    clearBlockCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function cleanupSkillCardStep(){
    skillCardState = null;
    removeTutorialSkillCardEventBlocker();
    clearSkillCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function cleanupFinalAttackCardStep(){
    finalAttackCardState = null;
    removeTutorialFinalAttackCardEventBlocker();
    clearFinalAttackCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function cleanupEndTurnStep(){
    endTurnState = null;
    removeTutorialEndTurnClickBlocker();
    removeTutorialEndTurnEventBlocker();
    clearEndTurnHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function removeTutorialBattleIntroOverlay(){
    const overlay = document.querySelector("#game .tutorial-battle-intro-overlay");
    if(overlay) overlay.remove();
  }

  function showTutorialBattleUiGuideSequence(steps, index){
    if(!tutorialBattleIntroActive || !isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      setTutorialStep("battle_ui_guide_completed");
      console.log("tutorial battle ui guide completed");
      showTutorialFirstAttackDialogue();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialBattleUiGuideSequence(steps, index + 1);
      return;
    }

    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass }, () => {
      showTutorialBattleUiGuideSequence(steps, index + 1);
    });
  }

  function updateTutorialBattleHighlight(selector, options={}){
    clearTutorialBattleHighlight();
    if(!selector) return;
    const targets = getTutorialBattleHighlightTargets(selector);
    const overlay = document.querySelector("#game .tutorial-battle-intro-overlay");
    if(!targets.length || !overlay) return;

    targets.forEach(target => target.classList.add("tutorial-battle-focus-target"));
    if(options.separate){
      targets.forEach(target => {
        const rect = getTutorialBattleHighlightRect([target]);
        if(rect) appendTutorialBattleHighlightBox(overlay, rect);
      });
      return;
    }

    const rect = getTutorialBattleHighlightRect(targets);
    if(!rect) return;
    appendTutorialBattleHighlightBox(overlay, rect);
  }

  function appendTutorialBattleHighlightBox(overlay, rect){
    const rootRect = document.getElementById("game").getBoundingClientRect();
    const highlight = document.createElement("div");
    highlight.className = "tutorial-battle-highlight-box";
    highlight.style.left = Math.max(0, rect.left - rootRect.left - 8) + "px";
    highlight.style.top = Math.max(0, rect.top - rootRect.top - 8) + "px";
    highlight.style.width = rect.width + 16 + "px";
    highlight.style.height = rect.height + 16 + "px";
    overlay.appendChild(highlight);
  }

  function getTutorialBattleHighlightTargets(selector){
    const selectors = Array.isArray(selector) ? selector : [selector];
    return selectors
      .map(item => document.querySelector(item))
      .filter(Boolean);
  }

  function getTutorialBattleHighlightRect(targets){
    if(!targets.length) return null;
    const enemyRect = getTutorialBattleEnemyHighlightRect(targets);
    if(enemyRect) return enemyRect;
    return targets.reduce((rect, target) => {
      const next = target.getBoundingClientRect();
      if(!rect) return next;
      const left = Math.min(rect.left, next.left);
      const top = Math.min(rect.top, next.top);
      const right = Math.max(rect.right, next.right);
      const bottom = Math.max(rect.bottom, next.bottom);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }, null);
  }

  function getTutorialBattleEnemyHighlightRect(targets){
    const enemies = targets.filter(target =>
      target &&
      target.classList &&
      target.classList.contains("combatant") &&
      target.classList.contains("enemy")
    );
    if(!enemies.length || enemies.length !== targets.length) return null;

    return enemies.reduce((rect, enemy) => {
      const enemyBox = enemy.getBoundingClientRect();
      const hpbar = enemy.querySelector(".hpbar");
      const info = enemy.querySelector(".combatant-info");
      const avatar = enemy.querySelector(".avatar");
      const hpbarBox = hpbar ? hpbar.getBoundingClientRect() : null;
      const infoBox = info ? info.getBoundingClientRect() : null;
      const avatarBox = avatar ? avatar.getBoundingClientRect() : null;
      const bottomSource = hpbarBox || infoBox || avatarBox || enemyBox;
      const next = {
        left: enemyBox.left,
        top: enemyBox.top,
        right: enemyBox.right,
        bottom: Math.min(enemyBox.bottom, bottomSource.bottom),
        width: enemyBox.width,
        height: Math.max(1, Math.min(enemyBox.bottom, bottomSource.bottom) - enemyBox.top)
      };
      if(!rect) return next;
      const left = Math.min(rect.left, next.left);
      const top = Math.min(rect.top, next.top);
      const right = Math.max(rect.right, next.right);
      const bottom = Math.max(rect.bottom, next.bottom);
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    }, null);
  }

  function clearTutorialBattleHighlight(){
    document.querySelectorAll(".tutorial-battle-focus-target").forEach(target => {
      target.classList.remove("tutorial-battle-focus-target");
    });
    document.querySelectorAll("#game .tutorial-battle-highlight-box").forEach(highlight => {
      highlight.remove();
    });
  }

  function showTutorialFirstAttackDialogue(){
    const dialogue = getTutorialBattleDialogue(FIRST_ATTACK_DIALOGUE_ID);
    if(!dialogue){
      startTutorialFirstAttackCardStep();
      return;
    }
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, dialogueClass: "tutorial-battle-intro-dialogue-top" }, () => {
      startTutorialFirstAttackCardStep();
    });
  }

  function startTutorialFirstAttackCardStep(){
    cleanupTutorialBattleIntro();
    const cardState = findFirstAttackCardState();
    if(!cardState){
      setTutorialStep("first_attack_card_missing");
      return;
    }
    firstAttackCardState = { ...cardState, active: true };
    setTutorialStep("first_attack_card");
    applyFirstAttackCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function findFirstAttackCardState(){
    if(typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return null;
    for(let index = 0; index < S.hand.length; index++){
      const cardKey = S.hand[index];
      const card = CARD_DB[cardKey];
      if(isFirstAttackTutorialCard(card)){
        return { cardKey, handIndex: index };
      }
    }
    return null;
  }

  function applyFirstAttackCardHighlight(){
    clearFirstAttackCardHighlight();
    if(!firstAttackCardState || !firstAttackCardState.active) return;
    const card = document.querySelector('#hand .card[data-index="' + firstAttackCardState.handIndex + '"]');
    if(card) card.classList.add("tutorial-first-attack-card");
  }

  function clearFirstAttackCardHighlight(){
    document.querySelectorAll(".tutorial-first-attack-card").forEach(card => {
      card.classList.remove("tutorial-first-attack-card");
    });
  }

  function onCardPlayed(cardKey, card, handIndex){
    if(onFinalAttackCardPlayed(cardKey, card, handIndex)) return;
    if(onSkillCardPlayed(cardKey, card, handIndex)) return;
    if(onBlockCardPlayed(cardKey, card, handIndex)) return;
    if(!firstAttackCardState || !firstAttackCardState.active){
      checkTutorialFinalFreePlayProgress();
      return;
    }
    if(cardKey !== firstAttackCardState.cardKey || handIndex !== firstAttackCardState.handIndex){
      checkTutorialFinalFreePlayProgress();
      return;
    }
    cleanupFirstAttackCardStep();
    setTutorialStep("first_attack_card_used");
    console.log("tutorial first attack card used");
    showTutorialFirstAttackCompleteDialogue();
  }

  function showTutorialFirstAttackCompleteDialogue(){
    if(!isTutorialBattle()) return;
    const dialogue = getTutorialBattleDialogue(FIRST_ATTACK_COMPLETE_DIALOGUE_ID);
    if(!dialogue){
      finishTutorialFirstAttackGuide();
      return;
    }
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue(dialogue, () => {
      showTutorialFirstAttackFollowupSequence(FIRST_ATTACK_FOLLOWUP_STEPS, 0);
    });
  }

  function showTutorialFirstAttackFollowupSequence(steps, index){
    if(!tutorialBattleIntroActive || !isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      finishTutorialFirstAttackGuide();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialFirstAttackFollowupSequence(steps, index + 1);
      return;
    }

    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass, separateHighlights: step.separateHighlights }, () => {
      showTutorialFirstAttackFollowupSequence(steps, index + 1);
    });
  }

  function finishTutorialFirstAttackGuide(){
    cleanupTutorialBattleIntro();
    setTutorialStep("first_attack_guide_completed");
    console.log("tutorial first attack guide completed");
    showTutorialBlockCardDialogue();
  }

  function showTutorialBlockCardDialogue(){
    const dialogue = getTutorialBattleDialogue(BLOCK_CARD_DIALOGUE_ID);
    if(!dialogue){
      startTutorialBlockCardStep();
      return;
    }
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, dialogueClass: "tutorial-battle-intro-dialogue-top" }, () => {
      startTutorialBlockCardStep();
    });
  }

  function startTutorialBlockCardStep(){
    cleanupTutorialBattleIntro();
    const cardState = findBlockCardState();
    if(!cardState){
      setTutorialStep("block_card_missing");
      return;
    }
    blockCardState = { ...cardState, active: true };
    setTutorialStep("block_card");
    applyBlockCardHighlight();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function findBlockCardState(){
    if(typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return null;
    for(let index = 0; index < S.hand.length; index++){
      const cardKey = S.hand[index];
      const card = CARD_DB[cardKey];
      if(isBlockTutorialCard(card)){
        return { cardKey, handIndex: index };
      }
    }
    return null;
  }

  function applyBlockCardHighlight(){
    clearBlockCardHighlight();
    if(!blockCardState || !blockCardState.active) return;
    const card = document.querySelector('#hand .card[data-index="' + blockCardState.handIndex + '"]');
    if(card) card.classList.add("tutorial-block-card");
  }

  function clearBlockCardHighlight(){
    document.querySelectorAll(".tutorial-block-card").forEach(card => {
      card.classList.remove("tutorial-block-card");
    });
  }

  function startTutorialSkillCardStep(){
    cleanupTutorialBattleIntro();
    const cardState = findSkillCardState();
    if(!cardState){
      setTutorialStep("skill_card_missing");
      resumeTutorialPostEnemyGuideFrom("W-043");
      return;
    }
    skillCardState = { ...cardState, active: true };
    setTutorialStep("skill_card");
    applySkillCardHighlight();
    addTutorialSkillCardEventBlocker();
    if(typeof S !== "undefined" && S && !S.over) S.busy = false;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function findSkillCardState(){
    if(typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return null;
    for(let index = 0; index < S.hand.length; index++){
      const cardKey = S.hand[index];
      const card = CARD_DB[cardKey];
      if(isTutorialSkillCard(card)){
        return { cardKey, handIndex: index };
      }
    }
    return null;
  }

  function applySkillCardHighlight(){
    clearSkillCardHighlight();
    if(!skillCardState || !skillCardState.active) return;
    const card = document.querySelector('#hand .card[data-index="' + skillCardState.handIndex + '"]');
    if(card) card.classList.add("tutorial-skill-card");
  }

  function clearSkillCardHighlight(){
    document.querySelectorAll(".tutorial-skill-card").forEach(card => {
      card.classList.remove("tutorial-skill-card");
    });
  }

  function addTutorialSkillCardEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.addEventListener(eventName, blockTutorialSkillCardEvent, true);
    });
  }

  function removeTutorialSkillCardEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.removeEventListener(eventName, blockTutorialSkillCardEvent, true);
    });
  }

  function blockTutorialSkillCardEvent(event){
    if(!skillCardState || !skillCardState.active) return;
    const allowedCard = event.target && typeof event.target.closest === "function"
      ? event.target.closest('#hand .card[data-index="' + skillCardState.handIndex + '"]')
      : null;
    if(allowedCard) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onSkillCardPlayed(cardKey, card, handIndex){
    if(!skillCardState || !skillCardState.active) return false;
    if(cardKey !== skillCardState.cardKey || handIndex !== skillCardState.handIndex) return false;
    cleanupSkillCardStep();
    setTutorialStep("skill_card_used");
    resumeTutorialPostEnemyGuideFrom("W-043");
    return true;
  }

  function startTutorialFinalAttackCardStep(){
    cleanupTutorialBattleIntro();
    ensureTutorialFinalAttackCard();
    const cardState = findFinalAttackCardState();
    if(!cardState){
      setTutorialStep("final_attack_card_missing");
      return;
    }
    finalAttackCardState = { ...cardState, active: true };
    setTutorialStep("final_attack_card");
    applyFinalAttackCardHighlight();
    addTutorialFinalAttackCardEventBlocker();
    if(typeof S !== "undefined" && S && !S.over) S.busy = false;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function ensureTutorialFinalAttackCard(){
    if(!isTutorialBattle() || typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return;
    const alreadyHasAttackCard = S.hand.some(cardKey => isFirstAttackTutorialCard(CARD_DB[cardKey]));
    if(alreadyHasAttackCard) return;
    const attackCardKey = findTutorialCardKey(isFirstAttackTutorialCard);
    if(!attackCardKey) return;
    S.hand.push(attackCardKey);
    if(typeof renderAll === "function") renderAll();
  }

  function findFinalAttackCardState(){
    if(typeof S === "undefined" || !S || !Array.isArray(S.hand) || typeof CARD_DB === "undefined") return null;
    for(let index = 0; index < S.hand.length; index++){
      const cardKey = S.hand[index];
      const card = CARD_DB[cardKey];
      if(isFirstAttackTutorialCard(card)){
        return { cardKey, handIndex: index };
      }
    }
    return null;
  }

  function applyFinalAttackCardHighlight(){
    clearFinalAttackCardHighlight();
    if(!finalAttackCardState || !finalAttackCardState.active) return;
    const card = document.querySelector('#hand .card[data-index="' + finalAttackCardState.handIndex + '"]');
    if(card) card.classList.add("tutorial-final-attack-card");
  }

  function clearFinalAttackCardHighlight(){
    document.querySelectorAll(".tutorial-final-attack-card").forEach(card => {
      card.classList.remove("tutorial-final-attack-card");
    });
  }

  function addTutorialFinalAttackCardEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.addEventListener(eventName, blockTutorialFinalAttackCardEvent, true);
    });
  }

  function removeTutorialFinalAttackCardEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.removeEventListener(eventName, blockTutorialFinalAttackCardEvent, true);
    });
  }

  function blockTutorialFinalAttackCardEvent(event){
    if(!finalAttackCardState || !finalAttackCardState.active) return;
    const allowedCard = event.target && typeof event.target.closest === "function"
      ? event.target.closest('#hand .card[data-index="' + finalAttackCardState.handIndex + '"]')
      : null;
    if(allowedCard) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onFinalAttackCardPlayed(cardKey, card, handIndex){
    if(!finalAttackCardState || !finalAttackCardState.active) return false;
    if(cardKey !== finalAttackCardState.cardKey || handIndex !== finalAttackCardState.handIndex) return false;
    cleanupFinalAttackCardStep();
    setTutorialStep("final_attack_card_used");
    console.log("tutorial final attack card used");
    return true;
  }

  function onBlockCardPlayed(cardKey, card, handIndex){
    if(!blockCardState || !blockCardState.active) return false;
    if(cardKey !== blockCardState.cardKey || handIndex !== blockCardState.handIndex) return false;
    cleanupBlockCardStep();
    setTutorialStep("block_card_used");
    console.log("tutorial block card used");
    setTimeout(showTutorialBlockCompleteDialogue, 0);
    return true;
  }

  function showTutorialBlockCompleteDialogue(){
    if(!isTutorialBattle()) return;
    const dialogue = getTutorialBattleDialogue(BLOCK_COMPLETE_DIALOGUE_ID);
    if(!dialogue){
      finishTutorialBlockGuide();
      return;
    }
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: BLOCK_COMPLETE_HIGHLIGHT_SELECTOR }, finishTutorialBlockGuide);
  }

  function finishTutorialBlockGuide(){
    cleanupTutorialBattleIntro();
    setTutorialStep("block_guide_completed");
    console.log("tutorial block guide completed");
    showTutorialBlockFollowupSequence(BLOCK_FOLLOWUP_STEPS, 0);
  }

  function showTutorialBlockFollowupSequence(steps, index){
    if(!isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      showTutorialEndTurnDialogue();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialBlockFollowupSequence(steps, index + 1);
      return;
    }

    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target }, () => {
      showTutorialBlockFollowupSequence(steps, index + 1);
    });
  }

  function showTutorialEndTurnDialogue(){
    if(!isTutorialBattle()) return;
    const dialogue = getTutorialBattleDialogue(END_TURN_DIALOGUE_ID);
    if(!dialogue){
      startTutorialEndTurnStep();
      return;
    }
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: "#endTurn" }, startTutorialEndTurnStep);
  }

  function startTutorialEndTurnStep(){
    cleanupTutorialBattleIntro();
    endTurnState = { active: true };
    if(typeof S !== "undefined" && S && !S.over) S.busy = false;
    setTutorialStep("end_turn");
    applyEndTurnHighlight();
    addTutorialEndTurnClickBlocker();
    addTutorialEndTurnEventBlocker();
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function applyEndTurnHighlight(){
    clearEndTurnHighlight();
    const button = document.getElementById("endTurn");
    if(button) button.classList.add("tutorial-end-turn-button");
  }

  function clearEndTurnHighlight(){
    const button = document.getElementById("endTurn");
    if(button) button.classList.remove("tutorial-end-turn-button");
  }

  function addTutorialEndTurnClickBlocker(){
    const root = document.getElementById("game");
    if(!root || root.querySelector(".tutorial-end-turn-click-blocker")) return;
    const blocker = document.createElement("div");
    blocker.className = "tutorial-end-turn-click-blocker";
    root.appendChild(blocker);
  }

  function removeTutorialEndTurnClickBlocker(){
    document.querySelectorAll(".tutorial-end-turn-click-blocker").forEach(blocker => blocker.remove());
  }

  function addTutorialEndTurnEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.addEventListener(eventName, blockTutorialEndTurnEvent, true);
    });
  }

  function removeTutorialEndTurnEventBlocker(){
    const root = document.getElementById("game");
    if(!root) return;
    BATTLE_INTRO_BLOCK_EVENTS.forEach(eventName => {
      root.removeEventListener(eventName, blockTutorialEndTurnEvent, true);
    });
  }

  function blockTutorialEndTurnEvent(event){
    if(!isEndTurnStepActive()) return;
    if(event.target && typeof event.target.closest === "function" && event.target.closest("#endTurn")) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onEndTurnClicked(){
    if(!endTurnState || !endTurnState.active) return false;
    cleanupEndTurnStep();
    setTutorialStep("end_turn_clicked");
    console.log("tutorial end turn clicked");
    return true;
  }

  function onEnemyTurnCompleted(){
    if(!isTutorialBattle() || getTutorialStep() !== "end_turn_clicked") return false;
    ensureTutorialFirstNewTurnSkillCard();
    const actionDialogue = getTutorialBattleDialogue(ENEMY_ACTION_DIALOGUE_ID);
    if(actionDialogue){
      ensureTutorialBattleIntroStyles();
      tutorialBattleIntroActive = true;
      pauseTutorialBattleIntroCombat();
      setTutorialStep(actionDialogue.id);
      renderTutorialBattleIntroDialogue({ ...actionDialogue, targetSelector: BATTLE_ENEMY_HIGHLIGHT_SELECTOR }, showTutorialEnemyActionCompleteDialogue);
      return true;
    }
    showTutorialEnemyActionCompleteDialogue();
    return true;
  }

  function showTutorialEnemyActionCompleteDialogue(){
    const dialogue = getTutorialBattleDialogue(ENEMY_ACTION_COMPLETE_DIALOGUE_ID);
    if(!dialogue){
      finishTutorialEnemyActionGuide();
      return;
    }
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: BLOCK_COMPLETE_HIGHLIGHT_SELECTOR }, () => {
      showTutorialPostEnemyGuideSequence(POST_ENEMY_GUIDE_STEPS, 0);
    });
  }

  function showTutorialPostEnemyGuideSequence(steps, index){
    if(!tutorialBattleIntroActive || !isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      finishTutorialPostEnemyGuide();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialPostEnemyGuideSequence(steps, index + 1);
      return;
    }

    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass }, () => {
      if(step.id === "W-042"){
        startTutorialSkillCardStep();
        return;
      }
      showTutorialPostEnemyGuideSequence(steps, index + 1);
    });
  }

  function getPostEnemyGuideStepIndex(id){
    const index = POST_ENEMY_GUIDE_STEPS.findIndex(step => step.id === id);
    return index >= 0 ? index : POST_ENEMY_GUIDE_STEPS.length;
  }

  function resumeTutorialPostEnemyGuideFrom(id){
    if(!isTutorialBattle()) return;
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    showTutorialPostEnemyGuideSequence(POST_ENEMY_GUIDE_STEPS, getPostEnemyGuideStepIndex(id));
  }

  function finishTutorialPostEnemyGuide(){
    setTutorialStep("post_enemy_guide_completed");
    showTutorialFinalAttackIntroSequence(FINAL_ATTACK_INTRO_STEPS, 0);
  }

  function showTutorialFinalAttackIntroSequence(steps, index){
    if(!tutorialBattleIntroActive || !isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      startTutorialFinalFreePlay();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialFinalAttackIntroSequence(steps, index + 1);
      return;
    }

    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass }, () => {
      showTutorialFinalAttackIntroSequence(steps, index + 1);
    });
  }

  function startTutorialFinalFreePlay(){
    cleanupTutorialBattleIntro();
    finalFreePlayActive = true;
    setTutorialStep("final_free_play");
    if(typeof S !== "undefined" && S && !S.over) S.busy = false;
    if(typeof updateEndBtn === "function") updateEndBtn();
    checkTutorialFinalFreePlayProgress();
  }

  function checkTutorialFinalFreePlayProgress(){
    if(!isTutorialBattle() || !finalFreePlayActive) return;
    const enemy = getTutorialFinalTargetEnemy();
    if(!enemy) return;
    if(enemy.hp <= 0 && !finalLowHpGuideShown){
      finalLowHpGuideShown = true;
      showTutorialFinalLowHpGuideSequence(FINAL_LOW_HP_GUIDE_STEPS, 0);
      return;
    }
    if(enemy.hp <= 0){
      startTutorialFinalEndingDialogue();
      return;
    }
    if(enemy.hp < 10 && !finalLowHpGuideShown){
      finalLowHpGuideShown = true;
      showTutorialFinalLowHpGuideSequence(FINAL_LOW_HP_GUIDE_STEPS, 0);
    }
  }

  function shouldDelayTutorialCompletion(){
    if(!isTutorialBattle()) return false;
    if(getTutorialStep() === "ending_dialogue_completed") return false;
    return !!(finalFreePlayActive || finalLowHpGuideShown || finalEndingDialogueShown);
  }

  function onTutorialVictoryPending(){
    checkTutorialFinalFreePlayProgress();
    return shouldDelayTutorialCompletion();
  }

  function getTutorialFinalTargetEnemy(){
    if(typeof S === "undefined" || !S || !Array.isArray(S.enemies)) return null;
    return S.enemies.find(enemy => enemy && enemy.hp > 0) || S.enemies.find(enemy => enemy && enemy.hp <= 0) || null;
  }

  function startTutorialFinalEndingDialogue(){
    if(finalEndingDialogueShown) return;
    finalEndingDialogueShown = true;
    finalFreePlayActive = false;
    showTutorialFinalEndingDialogueSequence(FINAL_ENDING_DIALOGUE_STEPS, 0);
  }

  function showTutorialFinalLowHpGuideSequence(steps, index){
    if(!isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      finishTutorialFinalLowHpGuide();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialFinalLowHpGuideSequence(steps, index + 1);
      return;
    }

    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass }, () => {
      showTutorialFinalLowHpGuideSequence(steps, index + 1);
    });
  }

  function finishTutorialFinalLowHpGuide(){
    cleanupTutorialBattleIntro();
    if(isTutorialFinalTargetPurified()){
      startTutorialFinalEndingDialogue();
      return;
    }
    finalFreePlayActive = true;
    setTutorialStep("final_free_play");
    if(typeof S !== "undefined" && S && !S.over) S.busy = false;
    if(typeof updateEndBtn === "function") updateEndBtn();
    checkTutorialFinalFreePlayProgress();
  }

  function isTutorialFinalTargetPurified(){
    const enemy = getTutorialFinalTargetEnemy();
    return !!(enemy && enemy.hp <= 0);
  }

  function showTutorialFinalEndingDialogueSequence(steps, index){
    if(!isTutorialBattle()){
      cleanupTutorialBattleIntro();
      return;
    }
    if(index >= steps.length){
      finishTutorialFinalEndingDialogue();
      return;
    }

    const step = steps[index];
    const dialogue = getTutorialBattleDialogue(step.id);
    if(!dialogue){
      showTutorialFinalEndingDialogueSequence(steps, index + 1);
      return;
    }

    clearTutorialBattleHighlight();
    ensureTutorialBattleIntroStyles();
    tutorialBattleIntroActive = true;
    pauseTutorialBattleIntroCombat();
    setTutorialStep(dialogue.id);
    if(step.systemPopup){
      renderTutorialBattleSystemPopup(dialogue, () => {
        showTutorialFinalEndingDialogueSequence(steps, index + 1);
      });
      return;
    }
    renderTutorialBattleIntroDialogue({ ...dialogue, targetSelector: step.target, dialogueClass: step.dialogueClass }, () => {
      showTutorialFinalEndingDialogueSequence(steps, index + 1);
    });
  }

  function finishTutorialFinalEndingDialogue(){
    cleanupTutorialBattleIntro();
    setTutorialStep("ending_dialogue_completed");
    if(typeof S !== "undefined" && S && !S.over) S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
    console.log("tutorial ending dialogue completed");
    if(window.TUTORIAL_SYSTEM && typeof window.TUTORIAL_SYSTEM.completeTutorialBattle === "function"){
      window.TUTORIAL_SYSTEM.completeTutorialBattle();
    }
  }

  function resetTutorialFinalFreePlayState(){
    finalFreePlayActive = false;
    finalLowHpGuideShown = false;
    finalEndingDialogueShown = false;
  }

  function finishTutorialEnemyActionGuide(){
    cleanupTutorialBattleIntro();
    setTutorialStep("enemy_action_guide_completed");
    console.log("tutorial enemy action guide completed");
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
      ".tutorial-battle-intro-dialogue{position:absolute;left:50%;bottom:3cqh;--tutorial-dongjasin-avatar-width:7.2cqh;--tutorial-dongjasin-avatar-height:10.2cqh;--tutorial-dongjasin-avatar-left:-9.6cqh;--tutorial-dongjasin-avatar-top:-1.6cqh;--tutorial-dongjasin-avatar-transform:none;transform:translateX(-50%);z-index:281;width:min(54cqw,72cqh);padding:1.6cqh 1.8cqw;border:0.22cqh solid rgba(255,255,255,.88);border-radius:1cqh;background:rgba(244,248,252,.97);color:#243247;box-shadow:0 1.2cqh 2.8cqh rgba(20,35,60,.24);}" +
      ".tutorial-battle-intro-dialogue.tutorial-battle-intro-dialogue-top{top:12cqh;bottom:auto;}" +
      ".tutorial-battle-system-popup{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:281;width:min(42cqw,62cqh);padding:2.2cqh 2cqw;border:.24cqh solid var(--c-panel-line);border-radius:1.4cqh;background:rgba(255,255,255,.97);box-shadow:0 1.4cqh 3.2cqh rgba(20,35,60,.28);text-align:center;color:var(--c-ink);}" +
      ".tutorial-battle-system-text{font-size:1.9cqh;line-height:1.5;font-weight:850;color:var(--c-ink);}" +
      ".tutorial-battle-system-actions{display:flex;justify-content:center;margin-top:1.8cqh;}" +
      ".tutorial-battle-highlight-box{position:absolute;z-index:280;pointer-events:none;border:.28cqh solid #ffd25f;border-radius:1cqh;box-shadow:0 0 0 9999px rgba(12,24,40,.16),0 0 1.4cqh rgba(255,210,95,.86);}" +
      ".tutorial-battle-focus-target{filter:drop-shadow(0 0 .8cqh rgba(255,210,95,.62));}" +
      ".tutorial-first-attack-card{box-shadow:0 0 0 .35cqh #ffd25f,0 0 1.5cqh rgba(255,210,95,.9) !important;border-color:#ffd25f !important;z-index:120 !important;}" +
      ".tutorial-block-card{box-shadow:0 0 0 .35cqh #ffd25f,0 0 1.5cqh rgba(255,210,95,.9) !important;border-color:#ffd25f !important;z-index:120 !important;}" +
      ".tutorial-skill-card{box-shadow:0 0 0 .35cqh #ffd25f,0 0 1.5cqh rgba(255,210,95,.9) !important;border-color:#ffd25f !important;z-index:120 !important;}" +
      ".tutorial-final-attack-card{box-shadow:0 0 0 .35cqh #ffd25f,0 0 1.5cqh rgba(255,210,95,.9) !important;border-color:#ffd25f !important;z-index:120 !important;}" +
      ".tutorial-end-turn-click-blocker{position:absolute;inset:0;z-index:280;background:rgba(12,24,40,.18);cursor:default;pointer-events:none;}" +
      "#endTurn.tutorial-end-turn-button{position:relative;z-index:281;box-shadow:0 0 0 .35cqh #ffd25f,0 0 1.5cqh rgba(255,210,95,.9) !important;border-color:#ffd25f !important;}" +
      ".tutorial-battle-intro-content{display:block;}" +
      ".tutorial-battle-intro-body{min-width:0;}" +
      ".tutorial-battle-intro-dialogue .tutorial-dongjasin-avatar{position:absolute;left:var(--tutorial-dongjasin-avatar-left);top:var(--tutorial-dongjasin-avatar-top);transform:var(--tutorial-dongjasin-avatar-transform);width:var(--tutorial-dongjasin-avatar-width);height:var(--tutorial-dongjasin-avatar-height);pointer-events:none;}" +
      ".tutorial-battle-intro-dialogue .tutorial-dongjasin-avatar-placeholder{width:100%;height:100%;border:.22cqh solid rgba(47,102,168,.45);border-radius:46% 46% 42% 42% / 38% 38% 52% 52%;background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(220,234,250,.96));box-shadow:0 .45cqh 1cqh rgba(20,35,60,.16);}" +
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
    isEndTurnStepActive,
    canOpenDeck,
    canUsePotion,
    canUseArtifact,
    getTutorialRestrictionMessage,
    openTutorialSettings,
    closeTutorialSettings,
    onCardPlayed,
    onEndTurnClicked,
    onEnemyTurnCompleted,
    shouldDelayTutorialCompletion,
    onTutorialVictoryPending
  };
})();
