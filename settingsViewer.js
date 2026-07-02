"use strict";

(function(){
  const SAVE_KEY = "viberunSaveState";
  const VOLUME_KEY = "viberunVolumeSettings";
  const RESET_KEYS = [
    SAVE_KEY,
    VOLUME_KEY,
    "viberunTutorialComplete",
    "viberunTutorialCompleted",
    "viberunTutorialWasSkipped",
    "viberunHasPlayedBefore",
    "hasPlayedBefore",
    "viberunCardCodex",
    "viberunRunRecords"
  ];
  const DEFAULT_VOLUMES = { master: 80, music: 70, effect: 80 };
  let els = null;
  let pauseState = null;
  let settingsMode = "combat";

  function initSettingsViewer(){
    const trigger = findSettingsTrigger();
    const startTrigger = document.querySelector(".start-settings-button");
    if(!trigger && !startTrigger) return;

    els = createSettingsViewer();
    restoreSavedProgress();
    if(trigger) bindOpenTrigger(trigger, openSettingsViewer);
    if(startTrigger) bindOpenTrigger(startTrigger, openStartSettingsViewer);
    window.SETTINGS_VIEWER_CLOSE = closeSettingsViewer;
  }

  function findSettingsTrigger(){
    const buttons = Array.from(document.querySelectorAll(".hud-btn"));
    return buttons.find(button => button.textContent.includes("⚙️") || button.textContent.includes("⚙"));
  }

  function bindOpenTrigger(trigger, openFn){
    trigger.addEventListener("click", openFn);
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.addEventListener("keydown", event => {
      if(event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openFn();
    });
  }

  function createSettingsViewer(){
    ensureSettingsViewerStyles();

    const overlay = document.createElement("div");
    overlay.id = "settingsViewerOverlay";
    overlay.className = "settings-viewer";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="settings-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="settingsViewerTitle">' +
        '<div class="settings-viewer-head">' +
          '<h2 id="settingsViewerTitle">설정</h2>' +
          '<button type="button" class="settings-viewer-help" aria-label="도움말">?</button>' +
          '<button type="button" class="settings-viewer-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="settings-viewer-body">' +
          '<section class="settings-viewer-section" aria-label="음량 조절">' +
            '<h3>음량 조절</h3>' +
            volumeControlHtml("master", "전체 음량", 80) +
            volumeControlHtml("music", "배경 음악", 70) +
            volumeControlHtml("effect", "효과음", 80) +
          '</section>' +
          '<div class="settings-viewer-actions">' +
            '<button type="button" class="settings-viewer-danger">전투 포기</button>' +
            '<button type="button" class="settings-viewer-primary">저장하기</button>' +
            '<button type="button" class="settings-viewer-tutorial">튜토리얼 다시 보기</button>' +
            '<button type="button" class="settings-viewer-reset">게임 기록 초기화</button>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsGiveUpTitle">' +
            '<h3 id="settingsGiveUpTitle">전투를 포기하시겠습니까?</h3>' +
            '<p>전투 포기 시 패배로 처리되며,<br>현재 런 진행만 종료됩니다.</p>' +
            '<div class="settings-viewer-confirm-actions">' +
              '<button type="button" class="settings-viewer-confirm-yes">예</button>' +
              '<button type="button" class="settings-viewer-confirm-no">아니오</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-save-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsSaveTitle">' +
            '<h3 id="settingsSaveTitle">진행 상황을 저장하시겠습니까?</h3>' +
            '<p>현재 게임 진행 상황이 저장되며,<br>이후 다시 이어서 진행할 수 있습니다.</p>' +
            '<div class="settings-viewer-confirm-actions">' +
              '<button type="button" class="settings-viewer-save-yes">예</button>' +
              '<button type="button" class="settings-viewer-save-no">아니오</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-reset-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsResetTitle">' +
            '<h3 id="settingsResetTitle">게임 기록을 초기화하시겠습니까?</h3>' +
            '<p>저장 데이터, 튜토리얼 기록, 도감, 기록이 모두 삭제됩니다.</p>' +
            '<div class="settings-viewer-confirm-actions">' +
              '<button type="button" class="settings-viewer-reset-yes">예</button>' +
              '<button type="button" class="settings-viewer-reset-no">아니오</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-help-layer" aria-hidden="true">' +
          '<div class="settings-viewer-help-panel" role="dialog" aria-modal="true" aria-labelledby="settingsHelpTitle">' +
            '<div class="settings-viewer-help-head">' +
              '<h3 id="settingsHelpTitle">조작법</h3>' +
              '<button type="button" class="settings-viewer-help-close" aria-label="도움말 닫기">×</button>' +
            '</div>' +
            '<div class="settings-viewer-help-content">' +
              '<section><h4>전투 진행</h4><p>주문을 드래그해서 적 또는 전장 위로 놓으면 사용할 수 있습니다. 주문마다 필요한 신통력이 다르니 좌측의 신통력 수치를 확인하세요.</p></section>' +
              '<section><h4>대상 선택</h4><p>정화 주문은 적에게, 회복이나 결계 주문은 자신에게 사용됩니다. 적이 여럿일 때는 원하는 적을 터치해서 대상을 확인할 수 있습니다.</p></section>' +
              '<section><h4>턴 종료</h4><p>더 사용할 주문이 없다면 턴 종료 버튼을 누르세요. 남은 주문은 버린 주문 더미로 이동하고 적의 행동이 진행됩니다.</p></section>' +
              '<section><h4>주문 더미</h4><p>덱과 버린 주문 더미를 눌러 현재 보유 주문, 손에 든 주문, 버린 주문을 확인할 수 있습니다.</p></section>' +
              '<section><h4>설정</h4><p>설정 화면이 열려 있는 동안 전투는 일시 정지됩니다. 저장하기를 누르면 현재 진행 상태가 저장됩니다.</p></section>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeSettingsViewer();
    });
    overlay.addEventListener("input", event => {
      if(!event.target.matches(".settings-viewer-volume input")) return;
      const output = event.target.closest(".settings-viewer-volume").querySelector("output");
      if(output) output.textContent = event.target.value;
      saveVolumeSettings();
      applyVolumeSettings();
    });
    overlay.querySelector(".settings-viewer-close").addEventListener("click", closeSettingsViewer);
    overlay.querySelector(".settings-viewer-help").addEventListener("click", openHelp);
    overlay.querySelector(".settings-viewer-help-close").addEventListener("click", closeHelp);
    overlay.querySelector(".settings-viewer-danger").addEventListener("click", openGiveUpConfirm);
    overlay.querySelector(".settings-viewer-primary").addEventListener("click", openSaveConfirm);
    overlay.querySelector(".settings-viewer-tutorial").addEventListener("click", replayTutorial);
    overlay.querySelector(".settings-viewer-save-no").addEventListener("click", closeSaveConfirm);
    overlay.querySelector(".settings-viewer-save-yes").addEventListener("click", saveProgressAndExit);
    overlay.querySelector(".settings-viewer-reset").addEventListener("click", openResetConfirm);
    overlay.querySelector(".settings-viewer-reset-no").addEventListener("click", closeResetConfirm);
    overlay.querySelector(".settings-viewer-reset-yes").addEventListener("click", resetAllGameRecords);
    overlay.querySelector(".settings-viewer-confirm-no").addEventListener("click", closeGiveUpConfirm);
    overlay.querySelector(".settings-viewer-confirm-yes").addEventListener("click", confirmGiveUp);
    document.addEventListener("keydown", event => {
      if(event.key !== "Escape" || !overlay.classList.contains("show")) return;
      if(overlay.querySelector(".settings-viewer-confirm.show")){
        closeGiveUpConfirm();
        return;
      }
      if(overlay.querySelector(".settings-viewer-save-confirm.show")){
        closeSaveConfirm();
        return;
      }
      if(overlay.querySelector(".settings-viewer-reset-confirm.show")){
        closeResetConfirm();
        return;
      }
      if(overlay.querySelector(".settings-viewer-help-layer.show")){
        closeHelp();
        return;
      }
      closeSettingsViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      help: overlay.querySelector(".settings-viewer-help"),
      helpLayer: overlay.querySelector(".settings-viewer-help-layer"),
      helpClose: overlay.querySelector(".settings-viewer-help-close"),
      saveConfirm: overlay.querySelector(".settings-viewer-save-confirm"),
      saveNo: overlay.querySelector(".settings-viewer-save-no"),
      primary: overlay.querySelector(".settings-viewer-primary"),
      tutorial: overlay.querySelector(".settings-viewer-tutorial"),
      reset: overlay.querySelector(".settings-viewer-reset"),
      resetConfirm: overlay.querySelector(".settings-viewer-reset-confirm"),
      resetNo: overlay.querySelector(".settings-viewer-reset-no"),
      close: overlay.querySelector(".settings-viewer-close"),
      confirm: overlay.querySelector(".settings-viewer-confirm"),
      confirmNo: overlay.querySelector(".settings-viewer-confirm-no"),
      actions: overlay.querySelector(".settings-viewer-actions"),
      volumeInputs: Array.from(overlay.querySelectorAll(".settings-viewer-volume input")),
    };
  }

  function volumeControlHtml(id, label, value){
    return '<label class="settings-viewer-volume" for="settingsVolume' + id + '">' +
      '<span>' + label + '</span>' +
      '<input id="settingsVolume' + id + '" type="range" min="0" max="100" value="' + value + '">' +
      '<output>' + value + '</output>' +
    '</label>';
  }

  function getVolumeSettings(){
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

  function saveVolumeSettings(){
    if(typeof localStorage === "undefined" || !els) return;
    const volumes = {};
    els.volumeInputs.forEach(input => {
      const key = input.id.replace("settingsVolume", "");
      volumes[key] = Number(input.value);
    });
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
  }

  function applyVolumeSettings(){
    if(!els) return;
    const volumes = getVolumeSettings();
    els.volumeInputs.forEach(input => {
      const key = input.id.replace("settingsVolume", "");
      const value = volumes[key] ?? DEFAULT_VOLUMES[key] ?? 80;
      input.value = value;
      const output = input.closest(".settings-viewer-volume").querySelector("output");
      if(output) output.textContent = value;
    });
  }

  function restoreSavedProgress(){
    if(typeof localStorage === "undefined") return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return;
      const saved = JSON.parse(raw);
      if(!saved || !saved.state || !Array.isArray(saved.starterDeck)) return;
      if(typeof S !== "undefined") S = saved.state;
      if(typeof STARTER_DECK !== "undefined") STARTER_DECK = [...saved.starterDeck];
      if(window.MAP_STATE && saved.mapState){
        window.MAP_STATE.currentStage = saved.mapState.currentStage || 0;
        window.MAP_STATE.proceedMode = !!saved.mapState.proceedMode;
      }
      if(S) S.busy = false;
      if(typeof updateHudFloor === "function") updateHudFloor();
      if(typeof renderAll === "function") renderAll();
    } catch(error) {
      localStorage.removeItem(SAVE_KEY);
    }
  }

  function saveProgressAndExit(){
    if(typeof localStorage === "undefined" || typeof S === "undefined" || !S || S.over) return;

    const state = JSON.parse(JSON.stringify(S));
    state.busy = pauseState ? pauseState.busy : !!S.busy;
    const starterDeck = typeof STARTER_DECK === "undefined" ? [] : [...STARTER_DECK];
    const mapState = window.MAP_STATE ? {
      currentStage: window.MAP_STATE.currentStage || 0,
      proceedMode: !!window.MAP_STATE.proceedMode,
      floorLabel: (document.querySelector("#hudFloor") || {}).textContent || "",
    } : null;

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        savedAt: Date.now(),
        state,
        starterDeck,
        mapState,
      }));
      closeSettingsViewer();
      if(typeof showStartScreenAfterSave === "function"){
        showStartScreenAfterSave();
      } else if(typeof toast === "function") {
        toast("진행 상태가 저장되었습니다.");
      }
    } catch(error) {
      if(typeof toast === "function") toast("저장에 실패했습니다.");
    }
  }

  function ensureSettingsViewerStyles(){
    if(document.querySelector("#settingsViewerStyles")) return;

    const style = document.createElement("style");
    style.id = "settingsViewerStyles";
    style.textContent =
      ".settings-viewer{position:absolute;inset:0;z-index:96;display:none;place-items:center;background:rgba(20,35,60,.45);backdrop-filter:blur(3px);}" +
      ".settings-viewer.show{display:grid;}" +
      ".settings-viewer.start-mode{z-index:240!important;}" +
      ".settings-viewer-panel{position:relative;width:min(54cqw,72cqh);max-height:72cqh;display:flex;flex-direction:column;background:var(--c-panel);border:0.3cqh solid var(--c-gold);border-radius:var(--r);box-shadow:0 2cqh 4cqh rgba(0,0,0,.28);padding:2cqh 2cqw;}" +
      ".settings-viewer-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid var(--c-panel-line);}" +
      ".settings-viewer-head h2{font-size:3cqh;line-height:1;flex:1;}" +
      ".settings-viewer-help{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-blue-deep);font-size:2.2cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".settings-viewer-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
      ".settings-viewer-body{padding:2cqh 0 0;min-height:18cqh;display:flex;flex-direction:column;gap:2cqh;}" +
      ".settings-viewer-section{border:0.18cqh solid var(--c-panel-line);border-radius:1.2cqh;background:rgba(255,255,255,.58);padding:1.6cqh 1.4cqw;}" +
      ".settings-viewer-section h3{font-size:2.1cqh;margin-bottom:1.4cqh;color:var(--c-ink);}" +
      ".settings-viewer-volume{display:grid;grid-template-columns:8cqw minmax(0,1fr) 4cqw;align-items:center;gap:1cqw;margin-top:1cqh;color:var(--c-ink-soft);font-size:1.7cqh;font-weight:800;}" +
      ".settings-viewer-volume input{width:100%;accent-color:var(--c-blue);}" +
      ".settings-viewer-volume output{text-align:right;color:var(--c-ink);font-weight:900;}" +
      ".settings-viewer-actions{display:flex;justify-content:flex-end;gap:1cqw;}" +
      ".settings-viewer-actions button{height:4.4cqh;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-danger{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-tutorial{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-reset{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-primary{background:var(--c-blue);color:#fff;}" +
      ".settings-viewer-confirm,.settings-viewer-save-confirm,.settings-viewer-reset-confirm{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".settings-viewer-confirm.show,.settings-viewer-save-confirm.show,.settings-viewer-reset-confirm.show{display:grid;}" +
      ".settings-viewer-confirm-panel{width:min(38cqw,54cqh);background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:2.2cqh 2cqw;text-align:center;}" +
      ".settings-viewer-confirm-panel h3{font-size:2.4cqh;color:var(--c-ink);margin-bottom:1cqh;}" +
      ".settings-viewer-confirm-panel p{font-size:1.7cqh;line-height:1.45;color:var(--c-ink-soft);font-weight:800;margin-bottom:1.8cqh;}" +
      ".settings-viewer-confirm-actions{display:flex;justify-content:center;gap:1cqw;}" +
      ".settings-viewer-confirm-actions button{height:4.2cqh;min-width:8cqw;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-confirm-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-confirm-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-reset-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-reset-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-save-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-save-yes{background:var(--c-blue);color:#fff;}" +
      ".settings-viewer-help-layer{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".settings-viewer-help-layer.show{display:grid;}" +
      ".settings-viewer-help-panel{width:min(46cqw,68cqh);max-height:58cqh;display:flex;flex-direction:column;background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:1.8cqh 1.6cqw;}" +
      ".settings-viewer-help-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1cqh;border-bottom:0.14cqh solid var(--c-panel-line);}" +
      ".settings-viewer-help-head h3{flex:1;font-size:2.4cqh;color:var(--c-ink);}" +
      ".settings-viewer-help-close{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:2.6cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".settings-viewer-help-content{min-height:0;overflow-y:auto;padding:1.2cqh .4cqw 0 0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}" +
      ".settings-viewer-help-content section{padding:1cqh 0;border-bottom:0.12cqh solid rgba(150,170,200,.35);}" +
      ".settings-viewer-help-content section:last-child{border-bottom:0;}" +
      ".settings-viewer-help-content h4{font-size:1.9cqh;color:var(--c-ink);margin-bottom:.5cqh;}" +
      ".settings-viewer-help-content p{font-size:1.65cqh;line-height:1.5;color:var(--c-ink-soft);font-weight:800;}";
    document.head.appendChild(style);
  }

  function openSettingsViewer(){
    if(!els) return;
    if(window.TUTORIAL_MAP_SYSTEM && typeof window.TUTORIAL_MAP_SYSTEM.isActive === "function" && window.TUTORIAL_MAP_SYSTEM.isActive()){
      openStartSettingsViewer();
      return;
    }
    if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" && window.TUTORIAL_BATTLE.isTutorialBattle()){
      if(typeof window.TUTORIAL_BATTLE.openTutorialSettings === "function"){
        window.TUTORIAL_BATTLE.openTutorialSettings();
      }
      return;
    }
    if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
    settingsMode = "combat";
    els.overlay.classList.remove("start-mode");
    if(els.actions) els.actions.style.display = "";
    if(els.reset) els.reset.style.display = "none";
    if(els.tutorial) els.tutorial.style.display = "";
    if(els.primary) els.primary.style.display = "";
    const danger = els.overlay.querySelector(".settings-viewer-danger");
    if(danger) danger.style.display = "";
    applyVolumeSettings();
    pauseCombat();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function openStartSettingsViewer(){
    if(!els) return;
    const isNewbieStart = isNewbieStartSettings();
    settingsMode = "start";
    els.overlay.classList.add("start-mode");
    if(els.actions) els.actions.style.display = isNewbieStart ? "none" : "";
    if(els.reset) els.reset.style.display = isNewbieStart ? "none" : "";
    if(els.tutorial) els.tutorial.style.display = isNewbieStart ? "none" : "";
    if(els.primary) els.primary.style.display = "none";
    const danger = els.overlay.querySelector(".settings-viewer-danger");
    if(danger) danger.style.display = "none";
    closeSaveConfirm();
    closeGiveUpConfirm();
    closeResetConfirm();
    applyVolumeSettings();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function isNewbieStartSettings(){
    if(typeof shouldShowNewbieStartMenu === "function") return shouldShowNewbieStartMenu();
    if(window.TUTORIAL_SYSTEM && typeof window.TUTORIAL_SYSTEM.shouldShowNewbieStart === "function"){
      return window.TUTORIAL_SYSTEM.shouldShowNewbieStart();
    }
    if(typeof localStorage === "undefined") return true;
    try {
      return !(
        localStorage.getItem("viberunTutorialCompleted") === "true" ||
        localStorage.getItem("viberunTutorialWasSkipped") === "true"
      );
    } catch(error) {
      return true;
    }
  }

  function closeSettingsViewer(){
    if(!els) return;
    closeHelp();
    closeSaveConfirm();
    closeGiveUpConfirm();
    closeResetConfirm();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    els.overlay.classList.remove("start-mode");
    if(settingsMode === "combat") resumeCombat();
    settingsMode = "combat";
  }

  function openHelp(){
    if(!els || !els.helpLayer) return;
    els.helpLayer.classList.add("show");
    els.helpLayer.setAttribute("aria-hidden", "false");
    if(els.helpClose) els.helpClose.focus();
  }

  function closeHelp(){
    if(!els || !els.helpLayer) return;
    els.helpLayer.classList.remove("show");
    els.helpLayer.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show")) els.help.focus();
  }

  function openSaveConfirm(){
    if(!els || !els.saveConfirm) return;
    els.saveConfirm.classList.add("show");
    els.saveConfirm.setAttribute("aria-hidden", "false");
    if(els.saveNo) els.saveNo.focus();
  }

  function closeSaveConfirm(){
    if(!els || !els.saveConfirm) return;
    els.saveConfirm.classList.remove("show");
    els.saveConfirm.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show")) els.primary.focus();
  }

  function openResetConfirm(){
    if(!els || !els.resetConfirm) return;
    els.resetConfirm.classList.add("show");
    els.resetConfirm.setAttribute("aria-hidden", "false");
    if(els.resetNo) els.resetNo.focus();
  }

  function closeResetConfirm(){
    if(!els || !els.resetConfirm) return;
    els.resetConfirm.classList.remove("show");
    els.resetConfirm.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show") && els.reset) els.reset.focus();
  }

  function openGiveUpConfirm(){
    if(!els || !els.confirm) return;
    els.confirm.classList.add("show");
    els.confirm.setAttribute("aria-hidden", "false");
    if(els.confirmNo) els.confirmNo.focus();
  }

  function closeGiveUpConfirm(){
    if(!els || !els.confirm) return;
    els.confirm.classList.remove("show");
    els.confirm.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show")) els.close.focus();
  }

  function replayTutorial(){
    if(typeof markHasPlayedBefore === "function") markHasPlayedBefore();
    closeSettingsViewer();
    if(window.TUTORIAL_SYSTEM && typeof window.TUTORIAL_SYSTEM.showGuide === "function"){
      window.TUTORIAL_SYSTEM.showGuide();
    }
  }

  function confirmGiveUp(){
    if(typeof endGame !== "function") return;
    clearSavedProgress();
    if(typeof markHasPlayedBefore === "function") markHasPlayedBefore();
    if(typeof S !== "undefined" && S) S.giveUpToStartOnly = true;
    endGame("lose");
    closeSettingsViewer();
  }

  function clearSavedProgress(){
    if(typeof localStorage === "undefined") return;
    localStorage.removeItem(SAVE_KEY);
  }

  function resetAllGameRecords(){
    if(typeof localStorage !== "undefined"){
      RESET_KEYS.forEach(key => localStorage.removeItem(key));
    }
    closeResetConfirm();
    closeSettingsViewer();
    if(typeof beginNewRun === "function") beginNewRun();
    if(typeof generateMap === "function") generateMap();
    if(window.MAP_STATE){
      window.MAP_STATE.currentStage = 0;
      window.MAP_STATE.proceedMode = false;
      window.MAP_STATE.startMapMode = false;
    }
    if(typeof loadStageMonsters === "function") loadStageMonsters(0);
    if(typeof updateHudFloor === "function") updateHudFloor();
    if(typeof updateContinueButtonInfo === "function") updateContinueButtonInfo();
    if(typeof updateStartScreenMode === "function") updateStartScreenMode();
    const startScreen = document.getElementById("startScreen");
    if(startScreen) startScreen.classList.remove("hidden");
    if(typeof showStartNotice === "function") showStartNotice("게임 기록을 초기화했습니다.");
  }

  function pauseCombat(){
    if(pauseState || typeof S === "undefined" || !S || S.over) return;
    pauseState = { busy: !!S.busy };
    S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function resumeCombat(){
    if(!pauseState) return;
    if(typeof S !== "undefined" && S && !S.over){
      S.busy = pauseState.busy;
      if(typeof updateEndBtn === "function") updateEndBtn();
    }
    pauseState = null;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSettingsViewer);
  else initSettingsViewer();
})();
