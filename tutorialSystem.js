"use strict";
/* =========================================================================
   Tutorial System
   - Isolated tutorial combat branch. Does not touch ACT1 map/shop flow.
   ========================================================================= */

(function(){
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

  function showTutorialGuidePopup(){
    /* 완전 첫 시작의 튜토리얼 진입도 계정 기반 흐름에 포함해, 로그인 성공 후 기존 안내 팝업을 그대로 엽니다. */
    if(window.VIBERUN_AUTH && !window.VIBERUN_AUTH.requireLogin(showTutorialGuidePopup)) return;

    ensureTutorialGuidePopup();
    const popup = document.getElementById("tutorialGuidePopup");
    if(popup) popup.classList.add("show");
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

  function getTutorialGuideDialogue(id, fallback){
    if(typeof window.getTutorialDialogueById !== "function") return fallback;
    const dialogue = window.getTutorialDialogueById(id);
    return dialogue || fallback;
  }

  function escapeTutorialGuideHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderTutorialGuideText(text){
    return escapeTutorialGuideHtml(text).replace(/&lt;br&gt;/g, "<br>");
  }

  function ensureTutorialGuidePopup(){
    ensureTutorialGuideStyles();
    if(document.getElementById("tutorialGuidePopup")) return;

    const titleDialogue = getTutorialGuideDialogue("T-001", {
      speaker: "시스템",
      text: "튜토리얼 안내"
    });
    const bodyDialogue = getTutorialGuideDialogue("T-002", {
      speaker: "",
      text: "이 튜토리얼은 전투의 기본을 안내드려요."
    });
    const titleText = renderTutorialGuideText(titleDialogue.text);
    const bodySpeaker = "";
    const bodyText = renderTutorialGuideText(bodyDialogue.text);
    const skipReactionDialogue = getTutorialGuideDialogue("S-001", {
      speaker: "",
      text: "튜토리얼을 건너뛰시겠어요?"
    });
    const skipReactionSpeaker = "";
    const skipResultSpeaker = "";
    const skipReactionText = renderTutorialGuideText(skipReactionDialogue.text);
    const skipResultText = renderTutorialGuideText("튜토리얼을 건너뛰겠습니까?");
    const skipConfirmAssetPath = skipReactionDialogue.dongjasinAssetPath || "assets/characters/dongjasin/dgs_tease_smile.png";
    const skipConfirmAssetHtml = skipConfirmAssetPath
      ? '<div class="tutorial-guide-confirm-character" aria-hidden="true"><img src="' + escapeTutorialGuideHtml(skipConfirmAssetPath) + '" alt=""></div>'
      : "";
    const popup = document.createElement("div");
    popup.id = "tutorialGuidePopup";
    popup.className = "tutorial-guide-popup";
    popup.innerHTML = `
      <div class="tutorial-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorialGuideTitle">
        <div class="tutorial-guide-main" data-tutorial-guide-main>
          <h2 id="tutorialGuideTitle">${titleText}</h2>
          <p>${bodySpeaker}${bodyText}</p>
          <p>예상 플레이 시간 3~5분</p>
          <p>이 과정을 통해 다음을 배워요!</p>
          <div class="tutorial-guide-list">
            <div class="tutorial-guide-item"><span aria-hidden="true">🎮</span><span>기본 조작</span></div>
            <div class="tutorial-guide-item"><span aria-hidden="true">🃏</span><span>주문 사용</span></div>
            <div class="tutorial-guide-item"><span aria-hidden="true">🏺</span><span>법구/약병</span></div>
            <div class="tutorial-guide-item"><span aria-hidden="true">🗺️</span><span>맵 진행</span></div>
          </div>
          <div class="tutorial-guide-actions">
            <button type="button" class="tutorial-guide-button tutorial-guide-button-primary" data-tutorial-proceed>진행하기</button>
            <button type="button" class="tutorial-guide-button tutorial-guide-button-secondary" data-tutorial-skip>건너뛰기</button>
          </div>
        </div>
        <div class="tutorial-guide-confirm" data-tutorial-skip-confirm hidden>
          ${skipConfirmAssetHtml}
          <h2>${skipReactionSpeaker}${skipReactionText}</h2>
          <p>${skipResultSpeaker}${skipResultText}</p>
          <div class="tutorial-guide-actions">
            <button type="button" class="tutorial-guide-button tutorial-guide-button-primary" data-tutorial-skip-confirm-button>예</button>
            <button type="button" class="tutorial-guide-button tutorial-guide-button-secondary" data-tutorial-skip-back>아니오</button>
          </div>
        </div>
      </div>
    `;

    popup.querySelector("[data-tutorial-proceed]").addEventListener("click", () => {
      startTutorialFlow();
    });
    popup.querySelector("[data-tutorial-skip]").addEventListener("click", () => {
      showTutorialSkipConfirm(popup);
    });
    popup.querySelector("[data-tutorial-skip-back]").addEventListener("click", () => {
      hideTutorialSkipConfirm(popup);
    });
    popup.querySelector("[data-tutorial-skip-confirm-button]").addEventListener("click", () => {
      markTutorialSkipped();
      closeTutorialGuidePopup();
      if(typeof updateStartScreenMode === "function") updateStartScreenMode();
    });

    document.body.appendChild(popup);
  }

  function ensureTutorialGuideStyles(){
    if(document.getElementById("tutorialGuideStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialGuideStyles";
    style.textContent = `
      .tutorial-guide-popup{
        position:fixed;
        inset:0;
        z-index:2600;
        display:none;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(15, 31, 51, .48);
      }
      .tutorial-guide-popup.show{display:flex;}
      .tutorial-guide-dialog{
        position:relative;
        width:min(580px, 100%);
        border:0;
        border-radius:0;
        background:transparent url("assets/ui/dialog_panel.png") center/100% 100% no-repeat;
        color:#243247;
        box-shadow:none;
        padding:54px 56px;
      }
      .tutorial-guide-dongjasin{
        display:block;
        width:min(148px, 32vw);
        height:176px;
        object-fit:contain;
        object-position:bottom center;
        margin:0 auto 8px;
      }
      .tutorial-guide-close{
        position:absolute;
        top:10px;
        right:10px;
        width:34px;
        height:34px;
        border:1px solid rgba(53, 93, 135, .28);
        border-radius:8px;
        background:#ffffff;
        color:#405066;
        font-size:24px;
        font-weight:800;
        line-height:1;
        cursor:pointer;
      }
      .tutorial-guide-dialog h2{
        margin:0 0 16px;
        font-size:28px;
        text-align:center;
      }
      .tutorial-guide-dialog p{
        margin:8px 0;
        font-size:17px;
        line-height:1.45;
        text-align:center;
      }
      .tutorial-guide-list{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:10px;
        margin:22px 0 24px;
      }
      .tutorial-guide-item{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        min-height:46px;
        border:1px solid rgba(53, 93, 135, .28);
        border-radius:8px;
        background:#ffffff;
        font-size:17px;
        font-weight:700;
      }
      .tutorial-guide-actions{
        display:flex;
        gap:12px;
      }
      .tutorial-guide-button{
        flex:1;
        min-height:52px;
        border-radius:8px;
        border:1px solid transparent;
        font-size:18px;
        font-weight:800;
        cursor:pointer;
      }
      .tutorial-guide-button-primary{
        background:#4b8bd8;
        border-color:#2f66a8;
        color:#ffffff;
      }
      .tutorial-guide-button-secondary{
        background:#dbe6f2;
        border-color:#b6c6d8;
        color:#405066;
      }
      .tutorial-guide-button[data-tutorial-proceed],
      .tutorial-guide-button[data-tutorial-skip]{
        min-height:74px;
        border:0;
        border-radius:0;
        background-color:transparent;
        background-position:center;
        background-repeat:no-repeat;
        background-size:100% 100%;
        color:transparent;
        font-size:0;
      }
      .tutorial-guide-button[data-tutorial-proceed]{
        background-image:url("assets/ui_buttons/tutorial_proceed.png");
      }
      .tutorial-guide-button[data-tutorial-skip]{
        background-image:url("assets/ui_buttons/tutorial_skip.png");
      }
      .tutorial-guide-dialog-skip{
        width:min(780px, calc(100% - 44px));
        min-height:360px;
        padding:34px 46px 36px;
      }
      .tutorial-guide-dialog-skip .tutorial-guide-close{
        top:-16px;
        right:-16px;
        width:56px;
        height:56px;
        border-radius:14px;
        font-size:38px;
      }
      .tutorial-guide-confirm{
        position:relative;
        min-height:280px;
        padding-left:220px;
        display:flex;
        flex-direction:column;
        justify-content:center;
      }
      .tutorial-guide-confirm-character{
        position:absolute;
        left:8px;
        top:8px;
        bottom:4px;
        width:210px;
        display:flex;
        align-items:flex-end;
        justify-content:center;
        pointer-events:none;
      }
      .tutorial-guide-confirm-character img{
        width:100%;
        height:100%;
        object-fit:contain;
        object-position:bottom center;
      }
      .tutorial-guide-speaker-badge{
        width:min(300px, 100%);
        margin:0 auto 16px;
        padding:12px 24px;
        border-radius:14px;
        background:linear-gradient(180deg, rgba(79,166,157,.96), rgba(45,137,132,.98));
        border:2px solid rgba(220,176,84,.78);
        color:#fff8df;
        text-align:center;
        font-size:28px;
        font-weight:900;
        box-shadow:inset 0 2px 6px rgba(255,255,255,.34), 0 3px 8px rgba(78,54,18,.16);
      }
      .tutorial-guide-dialog-skip .tutorial-guide-confirm h2{
        margin:0;
        padding:26px 30px;
        border:2px solid rgba(218,178,101,.62);
        border-radius:18px;
        background:rgba(255,252,240,.88);
        color:#5a3a22;
        font-size:30px;
        line-height:1.35;
        box-shadow:inset 0 2px 8px rgba(255,255,255,.5), 0 4px 10px rgba(98,68,25,.13);
      }
      .tutorial-guide-dialog-skip .tutorial-guide-confirm p{
        margin:22px 0 22px;
        color:#405066;
        font-size:22px;
        font-weight:700;
      }
      .tutorial-guide-dialog-skip .tutorial-guide-actions{
        gap:28px;
      }
      .tutorial-guide-dialog-skip .tutorial-guide-button{
        min-height:66px;
        border-radius:12px;
        font-size:26px;
        font-weight:900;
      }
      .tutorial-guide-button[data-tutorial-skip-confirm-button],
      .tutorial-guide-button[data-tutorial-skip-back]{
        min-height:66px;
        border:0;
        border-radius:0;
        background-color:transparent;
        background-position:center;
        background-repeat:no-repeat;
        background-size:100% 100%;
        color:transparent;
        font-size:0;
      }
      .tutorial-guide-button[data-tutorial-skip-confirm-button]{
        background-image:url("assets/ui_buttons/tutorial_yes.png");
      }
      .tutorial-guide-button[data-tutorial-skip-back]{
        background-image:url("assets/ui_buttons/tutorial_no.png");
      }
      .tutorial-guide-confirm[hidden],
      .tutorial-guide-main[hidden]{
        display:none;
      }
      @media (max-width:520px){
        .tutorial-guide-dialog{padding:22px;}
        .tutorial-guide-dialog-skip{
          width:min(520px, calc(100% - 20px));
          min-height:0;
          padding:28px 24px;
        }
        .tutorial-guide-confirm{
          min-height:0;
          padding-left:0;
        }
        .tutorial-guide-confirm-character{
          display:none;
        }
        .tutorial-guide-speaker-badge{
          font-size:22px;
          padding:9px 18px;
        }
        .tutorial-guide-dialog-skip .tutorial-guide-confirm h2{
          font-size:25px;
          padding:24px 18px;
        }
        .tutorial-guide-dialog-skip .tutorial-guide-confirm p{
          font-size:18px;
          margin:20px 0;
        }
        .tutorial-guide-dialog-skip .tutorial-guide-button{
          min-height:58px;
          font-size:22px;
        }
        .tutorial-guide-list{grid-template-columns:1fr;}
        .tutorial-guide-actions{flex-direction:column;}
      }
    `;
    document.head.appendChild(style);
  }

  function showTutorialSkipConfirm(popup){
    const main = popup.querySelector("[data-tutorial-guide-main]");
    const confirm = popup.querySelector("[data-tutorial-skip-confirm]");
    const dialog = popup.querySelector(".tutorial-guide-dialog");
    if(main) main.hidden = true;
    if(confirm) confirm.hidden = false;
    if(dialog) dialog.classList.add("tutorial-guide-dialog-skip");
  }

  function hideTutorialSkipConfirm(popup){
    const main = popup.querySelector("[data-tutorial-guide-main]");
    const confirm = popup.querySelector("[data-tutorial-skip-confirm]");
    const dialog = popup.querySelector(".tutorial-guide-dialog");
    if(confirm) confirm.hidden = true;
    if(main) main.hidden = false;
    if(dialog) dialog.classList.remove("tutorial-guide-dialog-skip");
  }

  function closeTutorialGuidePopup(){
    const popup = document.getElementById("tutorialGuidePopup");
    if(!popup) return;
    popup.classList.remove("show");
    hideTutorialSkipConfirm(popup);
  }

  function startTutorialFlow(){
    console.log("[Tutorial] startTutorialFlow");
    markTutorialStarted();
    closeTutorialGuidePopup();
    if(window.TUTORIAL_MAP_SYSTEM && typeof window.TUTORIAL_MAP_SYSTEM.open === "function"){
      window.TUTORIAL_MAP_SYSTEM.open();
    }
  }

  function markHasPlayedBefore(){
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
      if(isTutorialBattle()){
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
      if(isTutorialBattle()){
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

  function isTutorialBattle(){
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

  function showTutorialCompleteOverlay(){
    ensureTutorialCompletePopup();
    const rewardOverlay = document.getElementById("battleVictoryOverlay");
    const over = document.getElementById("over");
    const popup = document.getElementById("tutorialCompletePopup");
    if(rewardOverlay) rewardOverlay.classList.remove("show");
    if(over) over.classList.remove("show");
    if(popup) popup.classList.add("show");
  }

  function ensureTutorialCompletePopup(){
    ensureTutorialCompleteStyles();
    if(document.getElementById("tutorialCompletePopup")) return;

    const popup = document.createElement("div");
    popup.id = "tutorialCompletePopup";
    popup.className = "tutorial-complete-popup";
    popup.innerHTML = `
      <div class="tutorial-complete-dialog" role="dialog" aria-modal="true" aria-labelledby="tutorialCompleteTitle">
        <h2 id="tutorialCompleteTitle">튜토리얼 완료</h2>
        <p>전투의 기본을 모두 배웠어요.<br>이제 새 게임을 시작할 수 있어요.</p>
        <button type="button" class="tutorial-complete-confirm">확인</button>
      </div>
    `;

    popup.querySelector(".tutorial-complete-confirm").addEventListener("click", confirmTutorialComplete);
    document.body.appendChild(popup);
  }

  function ensureTutorialCompleteStyles(){
    if(document.getElementById("tutorialCompleteStyles")) return;
    const style = document.createElement("style");
    style.id = "tutorialCompleteStyles";
    style.textContent = `
      .tutorial-complete-popup{
        position:fixed;
        inset:0;
        z-index:2700;
        display:none;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(15, 31, 51, .48);
      }
      .tutorial-complete-popup.show{display:flex;}
      .tutorial-complete-dialog{
        width:min(540px, 100%);
        border:0;
        border-radius:0;
        background:transparent url("assets/ui/dialog_panel.png") center/100% 100% no-repeat;
        color:#243247;
        box-shadow:none;
        padding:54px 56px;
        text-align:center;
      }
      .tutorial-complete-dialog h2{
        margin:0 0 16px;
        font-size:28px;
      }
      .tutorial-complete-dialog p{
        margin:0 0 24px;
        font-size:17px;
        line-height:1.45;
      }
      .tutorial-complete-confirm{
        width:100%;
        min-height:52px;
        border-radius:8px;
        border:1px solid #2f66a8;
        background:#4b8bd8;
        color:#ffffff;
        font:inherit;
        font-size:18px;
        font-weight:800;
        cursor:pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function confirmTutorialComplete(){
    markTutorialComplete();
    const popup = document.getElementById("tutorialCompletePopup");
    if(popup) popup.classList.remove("show");
    if(typeof S !== "undefined" && S){
      S.over = null;
      S.busy = false;
    }
    const startScreen = document.getElementById("startScreen");
    if(startScreen) startScreen.classList.remove("hidden");
    if(typeof updateStartScreenMode === "function") updateStartScreenMode();
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
    markHasPlayedBefore,
    markTutorialStarted,
    markTutorialCompleted,
    markTutorialSkipped,
    showGuide: showTutorialGuidePopup,
    startTutorialFlow,
    startTutorialBattle,
    completeTutorialBattle,
    endTutorialMode: finishTutorialMode,
    start: startTutorialFromMenu,
    isActive: isTutorialBattle
  };

  window.BOHYUN_TUTORIAL = {
    start: startTutorialFromMenu,
    isActive: isTutorialBattle,
    markHasPlayedBefore,
    keys: window.TUTORIAL_SYSTEM.keys
  };

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initTutorialSystem);
  else initTutorialSystem();
})();
