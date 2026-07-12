"use strict";
/* =========================================================================
   Tutorial Battle State (logic)
   - Owns tutorial-only battle state and policy hooks.
   - Delegates to the existing tutorial battle entry without touching normal combat.
   - 대사 상자/하이라이트/설정 패널 DOM 렌더링은 tutorialBattleUI.js로
     분리되어 있다. 이 파일은 튜토리얼 진행 단계(state), 카드 강조 대상,
     단계 전환 시퀀스만 관리한다.
   - 과거에는 이 상태를 IIFE 클로저 변수로 감췄으나, 다른 전투/노드 파일과
     동일하게 파일 최상위 변수로 공유한다(UI 분리 파일이 읽기 전용으로
     참조하기 때문).
   ========================================================================= */

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

/* window.startTutorialBattle(tutorialSystem.js가 소유하는 실제 전투 세팅 함수)와
   이름이 겹치면 전역 함수 선언이 서로 덮어써 무한 재귀가 발생하므로
   이 파일의 오케스트레이션 함수는 다른 이름을 쓴다. 외부에는 여전히
   window.TUTORIAL_BATTLE.startTutorialBattle 이름으로 노출한다. */
function startTutorialBattleFlow(){
  state.isTutorialBattleActive = true;
  state.currentTutorialStep = state.currentTutorialStep || "start";
  tutorialFirstNewTurnSkillCardGuaranteed = false;
  resetTutorialFinalFreePlayState();
  applyTutorialBattleRootState(true);
  preloadTutorialDongjasinAssets();
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

function deferTutorialBattleIntro(){
  if(typeof requestAnimationFrame === "function"){
    requestAnimationFrame(() => requestAnimationFrame(startTutorialBattleIntro));
    return;
  }
  setTimeout(startTutorialBattleIntro, 0);
}

function preloadTutorialDongjasinAssets(){
  if(!Array.isArray(window.TUTORIAL_DIALOGUE_DATA)) return;
  const paths = new Set();
  window.TUTORIAL_DIALOGUE_DATA.forEach(dialogue => {
    if(dialogue && dialogue.dongjasinAssetPath) paths.add(dialogue.dongjasinAssetPath);
    if(dialogue && dialogue.dongjasinAltAssetPath) paths.add(dialogue.dongjasinAltAssetPath);
  });
  paths.forEach(path => {
    const image = new Image();
    image.src = path;
  });
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
    if(step.id === "W-038"){
      deferTutorialBattleTransition(() => showTutorialPostEnemyGuideSequence(steps, index + 1));
      return;
    }
    showTutorialPostEnemyGuideSequence(steps, index + 1);
  });
}

function deferTutorialBattleTransition(callback){
  if(typeof requestAnimationFrame === "function"){
    requestAnimationFrame(() => setTimeout(callback, 0));
    return;
  }
  setTimeout(callback, 0);
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
  /* "혼을 인도했습니다" (W-056)가 곧 전투 종료 시점이므로, 엔딩 대사가 전부 끝나기를
     기다리지 않고 이 대사가 뜨는 순간 바로 튜토리얼 BGM으로 전환한다. */
  if(step.id === "W-056" && window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmTutorial");
  }
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
  startTutorialBattle: startTutorialBattleFlow,
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
