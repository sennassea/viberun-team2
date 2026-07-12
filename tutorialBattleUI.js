"use strict";
/* =========================================================================
   Tutorial Battle UI 레이어 — tutorialBattle.js에서 분리된 DOM 렌더링.
   튜토리얼 전투 진행 상태(현재 단계, 카드 강조 대상 등)는 tutorialBattle.js에
   남아있고 이 파일은 대사 상자/하이라이트/설정 패널 DOM만 그린다.
   tutorialBattle.js 맨 아래의 window.TUTORIAL_BATTLE 내보내기가 이 파일의
   openTutorialSettings/closeTutorialSettings를 즉시 참조하므로, 이 파일은
   반드시 tutorialBattle.js보다 먼저 로드되어야 한다(index.html 참고).
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

const BATTLE_INTRO_BLOCK_EVENTS = ["pointerdown", "mousedown", "mouseup", "click", "touchstart", "touchend"];

function applyTutorialBattleRootState(active){
  const root = document.getElementById("game");
  if(!root) return;
  root.classList.toggle("is-tutorial-battle", !!active);
  if(active) root.dataset.state = "tutorial-battle";
  else if(root.dataset.state === "tutorial-battle") delete root.dataset.state;
}

function removeTutorialBattleIntroOverlay(){
  const overlay = document.querySelector("#game .tutorial-battle-intro-overlay");
  if(overlay) overlay.remove();
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

function renderTutorialBattleIntroDialogue(dialogue, onNext){
  const root = document.getElementById("game");
  if(!root) return;

  removeTutorialBattleIntroOverlay();

  const overlay = document.createElement("div");
  overlay.className = "tutorial-battle-intro-overlay";
  overlay.setAttribute("aria-hidden", "false");
  const dialogueClass = "tutorial-battle-intro-dialogue" + (dialogue.dialogueClass ? " " + dialogue.dialogueClass : "");
  const avatarImage = dialogue.dongjasinAssetPath
    ? '<img src="' + escapeTutorialBattleIntroHtml(dialogue.dongjasinAssetPath) + '" alt="">'
    : '<div class="tutorial-dongjasin-avatar-placeholder"></div>';
  const avatarHtml = dialogue.speaker === "동자신"
    ? '<div class="tutorial-dongjasin-avatar" aria-hidden="true">' + avatarImage + '</div>'
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
    let nextHandled = false;
    nextButton.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if(nextHandled) return;
      nextHandled = true;
      nextButton.disabled = true;
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

function ensureTutorialBattleIntroStyles(){
  if(document.getElementById("tutorialBattleIntroStyles")) return;
  const style = document.createElement("style");
  style.id = "tutorialBattleIntroStyles";
  style.textContent =
    ".tutorial-battle-intro-overlay{position:absolute;inset:0;z-index:280;background:rgba(12,24,40,.18);display:block;cursor:default;}" +
  ".tutorial-battle-intro-dialogue{position:absolute;left:50%;bottom:3cqh;--tutorial-dongjasin-avatar-width:36cqh;--tutorial-dongjasin-avatar-height:64cqh;--tutorial-dongjasin-avatar-left:-23cqh;--tutorial-dongjasin-avatar-top:-41.8cqh;--tutorial-dongjasin-avatar-transform:none;transform:translateX(-50%);z-index:281;width:min(58cqw,78cqh);min-height:calc(min(58cqw,78cqh) * 0.24516);display:flex;padding:1.6cqh 3cqw;border:0;border-radius:0;background:transparent url(\"assets/ui/dialog_panel_battle_intro.png\") center/100% 100% no-repeat;color:#243247;box-shadow:none;}" +
    ".tutorial-battle-intro-dialogue.tutorial-battle-intro-dialogue-top{top:12cqh;bottom:auto;--tutorial-dongjasin-avatar-top:-18cqh;}" +
  ".tutorial-battle-system-popup{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:281;width:min(46cqw,68cqh);padding:3.2cqh 2.8cqw;border:0;border-radius:0;background:transparent url(\"assets/ui/dialog_panel.png\") center/100% 100% no-repeat;box-shadow:none;text-align:center;color:var(--c-ink);}" +
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
    ".tutorial-battle-intro-content{display:flex;flex-direction:column;width:100%;}" +
    ".tutorial-battle-intro-body{display:flex;flex-direction:column;width:100%;flex:1 1 auto;min-width:0;}" +
    ".tutorial-battle-intro-dialogue .tutorial-dongjasin-avatar{position:absolute;left:var(--tutorial-dongjasin-avatar-left);top:var(--tutorial-dongjasin-avatar-top);transform:var(--tutorial-dongjasin-avatar-transform);width:var(--tutorial-dongjasin-avatar-width);height:var(--tutorial-dongjasin-avatar-height);pointer-events:none;}" +
    ".tutorial-battle-intro-dialogue .tutorial-dongjasin-avatar img{width:100%;height:100%;object-fit:contain;object-position:bottom center;display:block;}" +
    ".tutorial-battle-intro-dialogue .tutorial-dongjasin-avatar-placeholder{width:100%;height:100%;border:.22cqh solid rgba(47,102,168,.45);border-radius:46% 46% 42% 42% / 38% 38% 52% 52%;background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(220,234,250,.96));box-shadow:0 .45cqh 1cqh rgba(20,35,60,.16);}" +
    ".tutorial-battle-intro-speaker{margin-top:1cqh;margin-bottom:.6cqh;font-size:2.3cqh;color:#a8641f;text-shadow:0 0.06cqh 0 rgba(255,255,255,.5);}" +
    ".tutorial-battle-intro-text{font-size:1.9cqh;line-height:1.45;font-weight:800;}" +
    ".tutorial-battle-intro-actions{display:flex;justify-content:flex-end;margin-top:auto;}" +
    ".tutorial-battle-intro-next{min-width:0;height:4.4cqh;aspect-ratio:918/232;border:0;border-radius:0;background:transparent url(\"assets/ui_buttons/tutorial_proceed_v2.png\") center/100% 100% no-repeat;color:#2a1a08;font-size:1.7cqh;font-weight:900;cursor:pointer;display:grid;place-items:center;}";
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
    ".tutorial-battle-settings-panel{position:relative;width:min(44cqw,64cqh);max-width:94vw;box-sizing:border-box;max-height:70cqh;display:flex;flex-direction:column;background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:0.22cqh solid rgba(190,150,80,.65);border-radius:1.6cqh;box-shadow:0 1cqh 2.4cqh rgba(0,0,0,.4);padding:2cqh 2cqw;}" +
    ".tutorial-battle-settings-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid rgba(190,150,80,.4);}" +
    ".tutorial-battle-settings-head h2{font-size:3cqh;line-height:1;flex:1;color:#3a2814;font-weight:900;}" +
    ".tutorial-battle-settings-help{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid rgba(190,150,80,.55);background:#fffaf0;color:#a5322a;font-size:2.2cqh;font-weight:900;line-height:1;cursor:pointer;}" +
    ".tutorial-battle-settings-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid rgba(190,150,80,.55);background:#fffaf0;color:#3a2814;font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
    ".tutorial-battle-settings-body{padding:2cqh 0 0;display:flex;flex-direction:column;gap:2cqh;}" +
    ".tutorial-battle-settings-section{border:0.18cqh solid rgba(190,150,80,.45);border-radius:1.2cqh;background:rgba(255,255,255,.35);padding:1.6cqh 1.4cqw;}" +
    ".tutorial-battle-settings-section h3{font-size:2.1cqh;margin-bottom:1cqh;color:#3a2814;}" +
    ".tutorial-battle-volume{display:grid;grid-template-columns:8cqw minmax(0,1fr) 4cqw;align-items:center;gap:1cqw;margin-top:1cqh;color:#6b5236;font-size:1.7cqh;font-weight:800;}" +
    ".tutorial-battle-volume input{width:100%;accent-color:var(--c-gold-deep);}" +
    ".tutorial-battle-volume output{text-align:right;color:#3a2814;font-weight:900;}" +
    ".tutorial-battle-settings-actions{display:flex;justify-content:flex-end;gap:1cqw;}" +
    ".tutorial-battle-settings-actions button{height:4.4cqh;border-radius:2.2cqh;border:0.2cqh solid rgba(190,150,80,.5);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
    ".tutorial-battle-settings-exit{background:linear-gradient(160deg,#cf5b52,#8f2f2f);border-color:#e8c874;color:#fbe9c8;box-shadow:0 .4cqh .9cqh rgba(0,0,0,.3);}" +
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
    ".tutorial-battle-exit-confirm{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.45);backdrop-filter:blur(3px);}" +
    ".tutorial-battle-exit-confirm.show{display:grid;}" +
    ".tutorial-battle-exit-panel{width:min(38cqw,54cqh);max-width:92vw;box-sizing:border-box;background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:0.22cqh solid rgba(190,150,80,.65);border-radius:1.4cqh;box-shadow:0 1cqh 2.4cqh rgba(0,0,0,.4);padding:2.2cqh 2cqw;text-align:center;}" +
    ".tutorial-battle-exit-panel h3{font-size:2.4cqh;color:#3a2814;font-weight:900;margin-bottom:1cqh;}" +
    ".tutorial-battle-exit-panel p{font-size:1.7cqh;line-height:1.45;color:#6b5236;font-weight:800;margin-bottom:1.8cqh;}" +
    ".tutorial-battle-exit-actions{display:flex;justify-content:center;gap:1cqw;}" +
    ".tutorial-battle-exit-actions button{height:4.2cqh;min-width:8cqw;border-radius:2.2cqh;border:0.2cqh solid rgba(190,150,80,.5);font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
    ".tutorial-battle-exit-yes{background:linear-gradient(160deg,#cf5b52,#8f2f2f);border-color:#e8c874;color:#fbe9c8;box-shadow:0 .4cqh .9cqh rgba(0,0,0,.3);}" +
    ".tutorial-battle-exit-no{background:#fffaf0;color:#6b5236;}";
  document.head.appendChild(style);
}

function tutorialVolumeControlHtml(id, label, value){
  return '<label class="tutorial-battle-volume" for="tutorialBattleVolume' + id + '">' +
    '<span>' + label + '</span>' +
    '<input id="tutorialBattleVolume' + id + '" type="range" min="0" max="100" value="' + value + '">' +
    '<output>' + value + '</output>' +
  '</label>';
}

const VOLUME_KEY = "viberunVolumeSettings";
const DEFAULT_VOLUMES = { master: 80, music: 70, effect: 80 };

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
    volumes.muted = getTutorialVolumeSettings().muted;
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
