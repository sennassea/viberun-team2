"use strict";

(function(){
  const SAVE_KEY = "viberunSaveState";
  const VOLUME_KEY = "viberunVolumeSettings";
  const LOGOUT_FIRST_VISIT_KEYS = [
    SAVE_KEY,
    "viberunTutorialComplete",
    "viberunTutorialCompleted",
    "viberunTutorialWasSkipped",
    "viberunTutorialInProgress",
    "viberunHasPlayedBefore",
    "hasPlayedBefore",
    "tutorialCompleted",
    "hasSeenTutorial",
    "firstTutorialDone",
    "onboardingCompleted",
    "viberunFirstVisitCompleted",
    "viberunStartMenuState",
    "viberunLastProgress",
    "viberunCurrentRun"
  ];
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
  const DEFAULT_VOLUMES = { master: 80, music: 70, effect: 80, muted: { master: false, music: false, effect: false } };
  function normalizeMuted(muted){
    const source = muted && typeof muted === "object" ? muted : {};
    return {
      master: source.master === true,
      music: source.music === true,
      effect: source.effect === true,
    };
  }
  const volumeSettingsApi = window.VIBERUN_VOLUME_SETTINGS || (window.VIBERUN_VOLUME_SETTINGS = {
    key: VOLUME_KEY,
    defaults: { ...DEFAULT_VOLUMES, muted: normalizeMuted(DEFAULT_VOLUMES.muted) },
    read(){
      if(typeof localStorage === "undefined") return { ...this.defaults };
      try {
        const saved = JSON.parse(localStorage.getItem(this.key) || "{}");
        return {
          master: Number.isFinite(saved.master) ? saved.master : this.defaults.master,
          music: Number.isFinite(saved.music) ? saved.music : this.defaults.music,
          effect: Number.isFinite(saved.effect) ? saved.effect : this.defaults.effect,
          muted: normalizeMuted(saved.muted),
        };
      } catch(error) {
        localStorage.removeItem(this.key);
        return { ...this.defaults };
      }
    },
    write(volumes){
      if(typeof localStorage === "undefined") return;
      localStorage.setItem(this.key, JSON.stringify({
        master: Number(volumes.master),
        music: Number(volumes.music),
        effect: Number(volumes.effect),
        muted: normalizeMuted(volumes.muted),
      }));
    }
  });
  let els = null;
  let pauseState = null;
  let settingsMode = "combat";
  let accountMessageTimer = null;

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
          '<section class="settings-viewer-section settings-account-section" aria-label="계정 정보">' +
            '<h3>계정 정보</h3>' +
            '<div class="settings-account-status">' +
              accountInfoRowHtml("현재 로그인 상태", "settings-account-login-state") +
              accountInfoRowHtml("계정 타입", "settings-account-type") +
              accountInfoRowHtml("UID", "settings-account-uid") +
              accountInfoRowHtml("연동 상태", "settings-account-linked") +
            '</div>' +
            '<div class="settings-account-actions">' +
              '<button type="button" class="settings-account-login">로그인하기</button>' +
              '<button type="button" class="settings-account-google">Google Play 연동</button>' +
              '<button type="button" class="settings-account-facebook">Facebook 연동</button>' +
              '<button type="button" class="settings-account-logout">로그아웃</button>' +
            '</div>' +
            '<div class="settings-account-message" role="alert" aria-live="polite"></div>' +
          '</section>' +
          '<div class="settings-viewer-actions">' +
            '<button type="button" class="settings-viewer-danger">여정 포기</button>' +
            '<button type="button" class="settings-viewer-primary">저장하기</button>' +
            '<button type="button" class="settings-viewer-tutorial">튜토리얼 다시 보기</button>' +
            '<button type="button" class="settings-viewer-reset">게임 기록 초기화</button>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsGiveUpTitle">' +
            '<h3 id="settingsGiveUpTitle">여정을 포기하시겠습니까?</h3>' +
            '<p>여정 포기 시 패배로 처리되며,<br>현재 런 진행만 종료됩니다.</p>' +
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
        '<div class="settings-viewer-logout-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsLogoutTitle">' +
            '<h3 id="settingsLogoutTitle">로그아웃</h3>' +
            '<p>로그아웃하면 현재 계정의 진행 상태를 이어서 불러올 수 없으며,<br>처음 접속한 상태의 메인 화면으로 돌아갑니다.<br>계속하시겠습니까?</p>' +
            '<div class="settings-viewer-confirm-actions">' +
              '<button type="button" class="settings-viewer-logout-no">취소</button>' +
              '<button type="button" class="settings-viewer-logout-yes">로그아웃</button>' +
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
      event.target.style.setProperty("--val", event.target.value + "%");
      const output = event.target.closest(".settings-viewer-volume").querySelector("output");
      if(output) output.textContent = event.target.value;
      saveVolumeSettings();
      applyVolumeSettings();
    });
    overlay.addEventListener("click", event => {
      const muteButton = event.target.closest(".settings-viewer-volume-mute");
      if(!muteButton) return;
      toggleVolumeMute(muteButton.dataset.volumeKey);
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
    overlay.querySelector(".settings-account-login").addEventListener("click", openAccountLogin);
    overlay.querySelector(".settings-account-google").addEventListener("click", showGoogleLinkReady);
    overlay.querySelector(".settings-account-facebook").addEventListener("click", showFacebookLinkReady);
    overlay.querySelector(".settings-account-logout").addEventListener("click", openLogoutConfirm);
    overlay.querySelector(".settings-viewer-logout-no").addEventListener("click", closeLogoutConfirm);
    overlay.querySelector(".settings-viewer-logout-yes").addEventListener("click", confirmLogout);
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
      if(overlay.querySelector(".settings-viewer-logout-confirm.show")){
        closeLogoutConfirm();
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
      logoutConfirm: overlay.querySelector(".settings-viewer-logout-confirm"),
      logoutNo: overlay.querySelector(".settings-viewer-logout-no"),
      close: overlay.querySelector(".settings-viewer-close"),
      confirm: overlay.querySelector(".settings-viewer-confirm"),
      confirmNo: overlay.querySelector(".settings-viewer-confirm-no"),
      actions: overlay.querySelector(".settings-viewer-actions"),
      accountLoginState: overlay.querySelector(".settings-account-login-state"),
      accountType: overlay.querySelector(".settings-account-type"),
      accountUid: overlay.querySelector(".settings-account-uid"),
      accountLinked: overlay.querySelector(".settings-account-linked"),
      accountLogin: overlay.querySelector(".settings-account-login"),
      accountGoogle: overlay.querySelector(".settings-account-google"),
      accountFacebook: overlay.querySelector(".settings-account-facebook"),
      accountLogout: overlay.querySelector(".settings-account-logout"),
      accountMessage: overlay.querySelector(".settings-account-message"),
      volumeInputs: Array.from(overlay.querySelectorAll(".settings-viewer-volume input")),
      volumeMuteButtons: Array.from(overlay.querySelectorAll(".settings-viewer-volume-mute")),
    };
  }

  function accountInfoRowHtml(label, valueClass){
    return '<div class="settings-account-row">' +
      '<span class="settings-account-label">' + label + '</span>' +
      '<span class="settings-account-value ' + valueClass + '">-</span>' +
    '</div>';
  }

  function volumeControlHtml(id, label, value){
    return '<label class="settings-viewer-volume" for="settingsVolume' + id + '">' +
      '<span>' + label + '</span>' +
      '<input id="settingsVolume' + id + '" type="range" min="0" max="100" value="' + value + '" style="--val:' + value + '%">' +
      '<output>' + value + '</output>' +
      volumeMuteButtonHtml(id, label) +
    '</label>';
  }

  function volumeMuteButtonHtml(id, label){
    return '<button type="button" class="settings-viewer-volume-mute" data-volume-key="' + id + '" data-muted="false" aria-pressed="false" aria-label="' + label + ' 음소거">' +
      '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none"></path>' +
        '<g class="settings-viewer-volume-mute-on">' +
          '<path d="M16.3 8.5a5 5 0 0 1 0 7"></path>' +
          '<path d="M18.8 6a9 9 0 0 1 0 12"></path>' +
        '</g>' +
        '<g class="settings-viewer-volume-mute-off">' +
          '<line x1="15.5" y1="9" x2="21.5" y2="15"></line>' +
          '<line x1="21.5" y1="9" x2="15.5" y2="15"></line>' +
        '</g>' +
      '</svg>' +
    '</button>';
  }

  function getVolumeSettings(){
    return volumeSettingsApi.read();
  }

  function saveVolumeSettings(){
    if(typeof localStorage === "undefined" || !els) return;
    const volumes = { muted: getVolumeSettings().muted };
    els.volumeInputs.forEach(input => {
      const key = input.id.replace("settingsVolume", "");
      volumes[key] = Number(input.value);
    });
    volumeSettingsApi.write(volumes);
  }

  function toggleVolumeMute(key){
    if(!els || !key) return;
    const volumes = getVolumeSettings();
    const muted = { ...volumes.muted, [key]: !volumes.muted[key] };
    volumeSettingsApi.write({ ...volumes, muted });
    applyVolumeSettings();
  }

  function applyVolumeSettings(){
    if(!els) return;
    const volumes = getVolumeSettings();
    els.volumeInputs.forEach(input => {
      const key = input.id.replace("settingsVolume", "");
      const value = volumes[key] ?? DEFAULT_VOLUMES[key] ?? 80;
      input.value = value;
      input.style.setProperty("--val", value + "%");
      const output = input.closest(".settings-viewer-volume").querySelector("output");
      if(output) output.textContent = value;
    });
    els.volumeMuteButtons.forEach(button => {
      const key = button.dataset.volumeKey;
      const isMuted = !!(volumes.muted && volumes.muted[key]);
      button.dataset.muted = isMuted ? "true" : "false";
      button.setAttribute("aria-pressed", isMuted ? "true" : "false");
    });
  }

  function restoreSavedProgress(){
    if(typeof localStorage === "undefined") return;
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.isLoggedIn === "function" && !window.VIBERUN_AUTH.isLoggedIn()) return;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if(!raw) return;
      const saved = JSON.parse(raw);
      if(!saved || !saved.state || !Array.isArray(saved.starterDeck)) return;
      if(!isSavedProgressForCurrentAccount(saved)) return;
      /* S는 배틀 시작 전까지 초기값이 없어(let S;) typeof S가 항상 "undefined"이므로,
         기존 typeof 가드로는 새로고침 직후 복원이 절대 실행되지 않았다. */
      if(typeof window.restoreSavedRunState === "function") window.restoreSavedRunState(saved);
    } catch(error) {
      localStorage.removeItem(SAVE_KEY);
    }
  }

  function isSavedProgressForCurrentAccount(saved){
    const savedAccountId = saved && (saved.accountId || saved.accountUid);
    if(!savedAccountId) return true;
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.getAccountInfo !== "function") return true;
    const account = window.VIBERUN_AUTH.getAccountInfo();
    const currentAccountId = account && (account.accountId || account.uid);
    return !!(account && account.isLoggedIn && currentAccountId === savedAccountId);
  }

  function saveProgressAndExit(){
    if(typeof localStorage === "undefined" || typeof S === "undefined" || !S || S.over) return;

    const state = JSON.parse(JSON.stringify(S));
    state.busy = pauseState ? pauseState.busy : !!S.busy;
    if(typeof RUN_STATE !== "undefined" && RUN_STATE && typeof ensureJourneyState === "function"){
      state.journey = cloneJourneyState(ensureJourneyState(RUN_STATE));
    } else if(typeof ensureJourneyState === "function") {
      ensureJourneyState(state);
    }
    const starterDeck = typeof STARTER_DECK === "undefined" ? [] : [...STARTER_DECK];
    const journey = state.journey || null;
    const displayAreaNumber = typeof getCurrentDisplayAreaNumber === "function"
      ? getCurrentDisplayAreaNumber()
      : null;
    const displayAreaLabel = typeof formatCurrentDisplayArea === "function"
      ? formatCurrentDisplayArea()
      : ((document.querySelector("#hudFloor") || {}).textContent || "");
    const actName = typeof getCurrentActName === "function"
      ? getCurrentActName()
      : ((journey && journey.actName) || "최초의 여정");
    const mapState = window.MAP_STATE ? {
      currentStage: window.MAP_STATE.currentStage || 0,
      proceedMode: !!window.MAP_STATE.proceedMode,
      startMapMode: !!window.MAP_STATE.startMapMode,
      floorLabel: (document.querySelector("#hudFloor") || {}).textContent || "",
      actName,
      displayAreaNumber,
      displayAreaLabel,
      journeyMode: journey ? journey.mode : "first",
      endlessLevel: journey ? journey.endlessLevel : 0,
    } : null;
    const account = window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.getAccountInfo === "function"
      ? window.VIBERUN_AUTH.getAccountInfo()
      : null;

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        savedAt: Date.now(),
        accountId: account && account.isLoggedIn ? (account.accountId || account.uid) : null,
        accountUid: account && account.isLoggedIn ? (account.accountId || account.uid) : null,
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
      ".settings-viewer.start-mode{z-index:300!important;}" +
      ".settings-viewer-panel{position:relative;width:min(86cqw,124cqh);max-height:86cqh;display:flex;flex-direction:column;background:transparent url('assets/ui/settings/outer_panel.png') center/100% 100% no-repeat;border:0;border-radius:1.6cqh;box-shadow:0 2cqh 4cqh rgba(0,0,0,.28);padding:3.2cqh 3cqw 2.8cqh;}" +
      ".settings-viewer-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid var(--c-panel-line);}" +
      ".settings-viewer-head h2{font-size:3cqh;line-height:1;flex:1;}" +
      ".settings-viewer-help{width:4.4cqh;height:4.4cqh;border:0;background:transparent url('assets/ui/settings/help.png') center/contain no-repeat;color:transparent;font-size:0;line-height:1;cursor:pointer;}" +
      ".settings-viewer-close{width:4.8cqh;height:4.8cqh;border:0;background:transparent url('assets/ui/settings/close.png') center/contain no-repeat;color:transparent;font-size:0;line-height:1;cursor:pointer;}" +
      ".settings-viewer-body{padding:2cqh 0 0;min-height:18cqh;display:flex;flex-direction:column;gap:2cqh;}" +
      ".settings-viewer-section{border:0.18cqh solid var(--c-panel-line);border-radius:1.2cqh;background:rgba(255,255,255,.58);padding:1.6cqh 1.4cqw;}" +
      ".settings-viewer-section:not(.settings-account-section){background:transparent url('assets/ui/settings/settings_panel.png') center/100% 100% no-repeat;border:0;padding:2.1cqh 2cqw;}" +
      ".settings-account-section{position:relative;background:transparent url('assets/ui/settings/account_info_panel.png') center/100% 100% no-repeat;border:0;padding:2.1cqh 2cqw;}" +
      ".settings-viewer-section h3{font-size:2.1cqh;margin-bottom:1.4cqh;color:var(--c-ink);}" +
      ".settings-viewer-volume{display:grid;grid-template-columns:8cqw minmax(0,1fr) 3.4cqw 4.2cqh;align-items:center;gap:1cqw;margin-top:1.4cqh;color:var(--c-ink-soft);font-size:1.7cqh;font-weight:800;}" +
      ".settings-viewer-volume output{text-align:right;color:var(--c-ink);font-weight:900;}" +
      ".settings-viewer-volume input[type=\"range\"]{-webkit-appearance:none;appearance:none;width:100%;height:3.2cqh;background:transparent;margin:0;padding:0;cursor:pointer;}" +
      ".settings-viewer-volume input[type=\"range\"]::-webkit-slider-runnable-track{height:.9cqh;border-radius:1cqh;background:linear-gradient(90deg,var(--c-gold-deep) 0%,var(--c-gold) var(--val,50%),rgba(255,255,255,.6) var(--val,50%),rgba(255,255,255,.6) 100%);border:.12cqh solid var(--c-gold-deep);box-shadow:inset 0 .12cqh .22cqh rgba(90,60,10,.28);}" +
      ".settings-viewer-volume input[type=\"range\"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:3cqh;height:3cqh;margin-top:-1.05cqh;border-radius:50%;background:#fdf1da url('assets/ui/settings/volume_icon.png') center/68% no-repeat;border:.16cqh solid var(--c-gold-deep);box-shadow:0 .2cqh .4cqh rgba(90,60,10,.35);}" +
      ".settings-viewer-volume input[type=\"range\"]::-moz-range-track{height:.9cqh;border-radius:1cqh;background:rgba(255,255,255,.6);border:.12cqh solid var(--c-gold-deep);box-shadow:inset 0 .12cqh .22cqh rgba(90,60,10,.28);}" +
      ".settings-viewer-volume input[type=\"range\"]::-moz-range-progress{height:.9cqh;border-radius:1cqh 0 0 1cqh;background:linear-gradient(90deg,var(--c-gold-deep),var(--c-gold));}" +
      ".settings-viewer-volume input[type=\"range\"]::-moz-range-thumb{width:3cqh;height:3cqh;border-radius:50%;background:#fdf1da url('assets/ui/settings/volume_icon.png') center/68% no-repeat;border:.16cqh solid var(--c-gold-deep);box-shadow:0 .2cqh .4cqh rgba(90,60,10,.35);}" +
      ".settings-viewer-volume input[type=\"range\"]:focus-visible::-webkit-slider-thumb{outline:.2cqh solid var(--c-blue);outline-offset:.15cqh;}" +
      ".settings-viewer-volume input[type=\"range\"]:focus-visible::-moz-range-thumb{outline:.2cqh solid var(--c-blue);outline-offset:.15cqh;}" +
      ".settings-viewer-volume-mute{width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;padding:.8cqh;cursor:pointer;justify-self:center;background:linear-gradient(180deg,#fff6df,#f0c15a);border:.16cqh solid var(--c-gold-deep);color:#5b3a12;box-shadow:0 .2cqh .4cqh rgba(176,125,29,.32);transition:background .15s ease,border-color .15s ease,color .15s ease;}" +
      ".settings-viewer-volume-mute svg{width:100%;height:100%;}" +
      ".settings-viewer-volume-mute[data-muted=\"true\"]{background:linear-gradient(180deg,#ffe0d3,#f6b9a0);border-color:#c96a3e;color:#7a2b12;box-shadow:0 .2cqh .4cqh rgba(180,60,40,.28);}" +
      ".settings-viewer-volume-mute .settings-viewer-volume-mute-off{display:none;}" +
      ".settings-viewer-volume-mute[data-muted=\"true\"] .settings-viewer-volume-mute-on{display:none;}" +
      ".settings-viewer-volume-mute[data-muted=\"true\"] .settings-viewer-volume-mute-off{display:inline;}" +
      ".settings-viewer-volume-mute:focus-visible{outline:0.2cqh solid var(--c-blue);outline-offset:.2cqh;}" +
      ".settings-viewer-actions{display:flex;justify-content:center;align-items:center;gap:1.2cqw;margin-top:-1cqh;}" +
      ".settings-viewer-actions button{height:5.58cqh;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-danger{order:2;height:5.58cqh;border-radius:2.5cqh;padding:0 2.2cqw;background:linear-gradient(180deg,#ffe0d3,#f6b9a0);border:0.22cqh solid #c96a3e;color:#7a2b12;box-shadow:0 .3cqh .6cqh rgba(180,60,40,.22),inset 0 0 0 .12cqh #ffe9d8;position:relative;top:-0.5cqh;}" +
      ".settings-viewer-danger:hover{background:linear-gradient(180deg,#ffe9de,#f7c7b1);}" +
      ".settings-viewer-actions .settings-viewer-tutorial{order:1;width:21.8cqh;max-width:none;height:5.58cqh;border:0!important;border-radius:0!important;background:transparent url('assets/ui/settings/replay_tutorial.png') center/100% 100% no-repeat;color:transparent;font-size:0;padding:0!important;}" +
      ".settings-viewer-actions .settings-viewer-reset{order:4;width:21.8cqh;max-width:none;height:5.58cqh;border:0!important;border-radius:0!important;background:transparent url('assets/ui/settings/reset_record.png') center/100% 100% no-repeat;color:transparent;font-size:0;padding:0!important;}" +
      ".settings-viewer-primary{order:3;height:5.58cqh;border-radius:1.2cqh;padding:0 2.2cqw;background:linear-gradient(180deg,#fff6df,#f0c15a);border-color:var(--c-gold-deep);color:#5b3a12;box-shadow:0 .3cqh .7cqh rgba(176,125,29,.38);position:relative;top:-0.5cqh;}" +
      ".settings-viewer-primary:hover{background:linear-gradient(180deg,#fffaea,#f6cf72);}" +
      ".settings-account-google,.settings-account-facebook,.settings-account-logout{width:25.2cqh;max-width:none;height:5.6cqh;border:0!important;background-color:transparent!important;background-position:center!important;background-repeat:no-repeat!important;background-size:100% 100%!important;color:transparent!important;font-size:0!important;padding:0!important;}" +
      ".settings-account-google{background-image:url('assets/ui/settings/google_play.png')!important;}" +
      ".settings-account-facebook{background-image:url('assets/ui/settings/facebook.png')!important;}" +
      ".settings-account-logout{background-image:url('assets/ui/settings/logout.png')!important;}" +
      ".settings-account-message{position:absolute;left:50%;bottom:.8cqh;z-index:3;display:block;width:min(58cqh,80%);min-height:0;box-sizing:border-box;padding:.85cqh 1.2cqw;border:.16cqh solid rgba(184,132,64,.58);border-radius:.9cqh;background:rgba(255,250,238,.94);box-shadow:0 .8cqh 1.6cqh rgba(63,40,14,.16);color:#4a2b07;font-size:1.35cqh;font-weight:900;line-height:1.35;text-align:center;pointer-events:none;opacity:0;transform:translate(-50%,.5cqh);transition:opacity .18s ease,transform .18s ease;}" +
      ".settings-account-message.is-visible{opacity:1;transform:translate(-50%,0);}" +
      ".settings-account-message--error{border-color:rgba(211,88,88,.58);background:rgba(255,241,238,.96);color:#7d1f19;}" +
      ".settings-account-message--info{border-color:rgba(102,148,205,.58);background:rgba(240,247,255,.96);color:#1f4a7d;}" +
      ".settings-account-message--success{border-color:rgba(83,152,92,.58);background:rgba(240,252,242,.96);color:#245d2b;}" +
      ".settings-viewer-confirm,.settings-viewer-save-confirm,.settings-viewer-reset-confirm,.settings-viewer-logout-confirm{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".settings-viewer-confirm.show,.settings-viewer-save-confirm.show,.settings-viewer-reset-confirm.show,.settings-viewer-logout-confirm.show{display:grid;}" +
      ".settings-viewer-confirm-panel{width:min(38cqw,54cqh);background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:2.2cqh 2cqw;text-align:center;}" +
      ".settings-viewer-confirm-panel h3{font-size:2.4cqh;color:var(--c-ink);margin-bottom:1cqh;}" +
      ".settings-viewer-confirm-panel p{font-size:1.7cqh;line-height:1.45;color:var(--c-ink-soft);font-weight:800;margin-bottom:1.8cqh;}" +
      ".settings-viewer-confirm-actions{display:flex;justify-content:center;gap:1cqw;}" +
      ".settings-viewer-confirm-actions button{height:4.2cqh;min-width:8cqw;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-confirm-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-confirm-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-reset-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-reset-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-logout-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-logout-yes{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-save-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-save-yes{background:var(--c-blue);color:#fff;}" +
      ".settings-viewer-help-layer{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".settings-viewer-help-layer.show{display:grid;}" +
      ".settings-viewer-help-panel{width:min(46cqw,68cqh);max-height:58cqh;display:flex;flex-direction:column;background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:1.8cqh 1.6cqw;}" +
      ".settings-viewer-help-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1cqh;border-bottom:0.14cqh solid var(--c-panel-line);}" +
      ".settings-viewer-help-head h3{flex:1;font-size:2.4cqh;color:var(--c-ink);}" +
      ".settings-viewer-help-close{width:4.4cqh;height:4.4cqh;border:0;background:transparent url('assets/ui/settings/close.png') center/contain no-repeat;color:transparent;font-size:0;line-height:1;cursor:pointer;}" +
      ".settings-viewer-help-content{min-height:0;overflow-y:auto;padding:1.2cqh .4cqw 0 0;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;}" +
      ".settings-viewer-help-content section{padding:1cqh 0;border-bottom:0.12cqh solid rgba(150,170,200,.35);}" +
      ".settings-viewer-help-content section:last-child{border-bottom:0;}" +
      ".settings-viewer-help-content h4{font-size:1.9cqh;color:var(--c-ink);margin-bottom:.5cqh;}" +
      ".settings-viewer-help-content p{font-size:1.65cqh;line-height:1.5;color:var(--c-ink-soft);font-weight:800;}";
    document.head.appendChild(style);
  }

  function openSettingsViewer(){
    if(!els) return;
    if(isTutorialMapSettings()){
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
    refreshAccountInfo();
    clearSettingsAccountMessage();
    pauseCombat();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function openStartSettingsViewer(){
    if(!els) return;
    const isNewbieStart = isNewbieStartSettings();
    const isTutorialMap = isTutorialMapSettings();
    const hideActionButtons = isTutorialMap || isNewbieStart;
    settingsMode = "start";
    els.overlay.classList.add("start-mode");
    els.overlay.classList.toggle("tutorial-map-settings-mode", !!isTutorialMap);
    els.overlay.style.zIndex = isTutorialMap ? "1000" : "";
    if(isTutorialMap && els.overlay.parentNode){
      els.overlay.parentNode.appendChild(els.overlay);
    }
    if(els.actions) els.actions.style.display = hideActionButtons ? "none" : "";
    if(els.reset) els.reset.style.display = hideActionButtons ? "none" : "";
    if(els.tutorial) els.tutorial.style.display = hideActionButtons ? "none" : "";
    if(els.primary) els.primary.style.display = "none";
    const danger = els.overlay.querySelector(".settings-viewer-danger");
    if(danger) danger.style.display = "none";
    closeSaveConfirm();
    closeGiveUpConfirm();
    closeResetConfirm();
    closeLogoutConfirm();
    applyVolumeSettings();
    refreshAccountInfo();
    clearSettingsAccountMessage();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  /* 설정 팝업이 열릴 때마다 최신 계정 세션을 읽어 미로그인/Guest/연동 상태 표시를 갱신합니다. */
  function refreshAccountInfo(){
    if(!els || !els.accountLoginState) return;

    const auth = window.VIBERUN_AUTH;
    const info = auth && typeof auth.getAccountInfo === "function"
      ? auth.getAccountInfo()
      : { isLoggedIn: false, uid: "", accountType: "미로그인", isGuest: false, linkedProvider: "" };

    els.accountLoginState.textContent = info.isLoggedIn ? "로그인됨" : "미로그인";
    els.accountType.textContent = info.isLoggedIn ? info.accountType : "-";
    els.accountUid.textContent = info.uid || "-";
    els.accountUid.title = info.uid || "";
    els.accountLinked.textContent = info.isGuest ? "미연동" : (info.linkedProvider || "-");

    if(els.accountLogin) els.accountLogin.style.display = info.isLoggedIn ? "none" : "";
    if(els.accountGoogle) els.accountGoogle.style.display = info.isGuest ? "" : "none";
    if(els.accountFacebook) els.accountFacebook.style.display = info.isGuest ? "" : "none";
    if(els.accountLogout) els.accountLogout.style.display = info.isLoggedIn ? "" : "none";
  }

  /* 설정 팝업을 닫지 않고 로그인 모달만 겹쳐 띄운 뒤, 성공 시 계정 정보 영역만 다시 렌더링합니다. */
  function openAccountLogin(){
    if(window.VIBERUN_LOGIN_MODAL && typeof window.VIBERUN_LOGIN_MODAL.open === "function"){
      window.VIBERUN_LOGIN_MODAL.open({
        onSuccess(){
          refreshAccountInfo();
        }
      });
      return;
    }

    if(typeof toast === "function") toast("로그인 창을 불러올 수 없습니다.");
  }

  function showGoogleLinkReady(){
    linkProviderAccount("signInGooglePlay", "Google Play");
  }

  function showFacebookLinkReady(){
    linkProviderAccount("signInFacebook", "Facebook");
  }

  /* 설정 > 계정 정보에서 Guest 계정을 외부 provider 세션으로 승격하고, 성공 시 표시 정보를 즉시 갱신합니다. */
  function linkProviderAccount(methodName, label){
    clearSettingsAccountMessage();
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH[methodName] !== "function"){
      showSettingsAccountMessage(label + " 계정 연동에 실패했습니다. 다시 시도해 주세요.", "error");
      return;
    }

    Promise.resolve(window.VIBERUN_AUTH[methodName]()).then(result => {
      if(!result || !result.ok){
        const message = normalizeSettingsAccountMessage(result, label);
        showSettingsAccountMessage(message.text, message.type);
        return;
      }

      refreshAccountInfo();
      showSettingsAccountMessage("계정 연동이 완료되었습니다.", "success");
    }).catch(error => {
      console.warn("[Auth] " + label + " 계정 연동 중 오류가 발생했습니다.", error);
      const message = normalizeSettingsAccountMessage({ message: error && error.message }, label);
      showSettingsAccountMessage(message.text, message.type);
    });
  }

  /* provider별 원문 오류를 설정 화면 계정 섹션에서 쓰는 짧은 고정 문구로 변환합니다. */
  function normalizeSettingsAccountMessage(result, label){
    if(result && result.code === "ACCOUNT_ALREADY_LINKED"){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    const rawMessage = result && result.message ? String(result.message) : "";
    if(rawMessage.includes("이미 다른 계정에 연결된 로그인")){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    if(rawMessage.includes("Android 모바일 빌드")){
      return { text: "Google Play 로그인은 Android 모바일 빌드에서 사용할 수 있습니다.", type: "info" };
    }
    if(rawMessage.includes("취소")){
      return { text: "계정 연동이 취소되었습니다.", type: "info" };
    }
    if(rawMessage.includes("이미") && rawMessage.includes("연동")){
      return { text: "이미 연동된 계정입니다.", type: "info" };
    }
    if(rawMessage.includes("이미") && rawMessage.includes("연결")){
      return { text: "이미 다른 계정에 연결된 로그인입니다.", type: "error" };
    }
    if(rawMessage.includes("서버") || rawMessage.includes("네트워크")){
      return { text: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.", type: "error" };
    }
    if(label === "Facebook"){
      return { text: "Facebook 계정 연동에 실패했습니다. 다시 시도해 주세요.", type: "error" };
    }
    if(label === "Google Play"){
      return { text: "Google Play 계정 연동에 실패했습니다. 다시 시도해 주세요.", type: "error" };
    }
    return { text: rawMessage || "계정 연동에 실패했습니다. 다시 시도해 주세요.", type: "error" };
  }

  /* 계정 연동 메시지는 전역 toast 대신 설정 모달 내부에 표시해 흐린 오버레이 뒤로 밀리지 않게 합니다. */
  function showSettingsAccountMessage(message, type){
    const messageEl = els && els.accountMessage;
    if(!messageEl){
      console.warn("[SettingsViewer] account message element not found:", message);
      return;
    }

    if(accountMessageTimer){
      clearTimeout(accountMessageTimer);
      accountMessageTimer = null;
    }
    messageEl.textContent = message;
    messageEl.classList.add("is-visible");
    messageEl.classList.toggle("settings-account-message--error", type === "error");
    messageEl.classList.toggle("settings-account-message--info", type === "info");
    messageEl.classList.toggle("settings-account-message--success", type === "success");
    accountMessageTimer = setTimeout(clearSettingsAccountMessage, 3600);
  }

  function clearSettingsAccountMessage(){
    const messageEl = els && els.accountMessage;
    if(accountMessageTimer){
      clearTimeout(accountMessageTimer);
      accountMessageTimer = null;
    }
    if(!messageEl) return;

    messageEl.textContent = "";
    messageEl.classList.remove(
      "is-visible",
      "settings-account-message--error",
      "settings-account-message--info",
      "settings-account-message--success"
    );
  }

  function openLogoutConfirm(){
    if(!els || !els.logoutConfirm) return;
    els.logoutConfirm.classList.add("show");
    els.logoutConfirm.setAttribute("aria-hidden", "false");
    if(els.logoutNo) els.logoutNo.focus();
  }

  function closeLogoutConfirm(){
    if(!els || !els.logoutConfirm) return;
    els.logoutConfirm.classList.remove("show");
    els.logoutConfirm.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show") && els.accountLogout) els.accountLogout.focus();
  }

  /* 로그아웃 후 계정 진행 저장과 튜토리얼 완료 상태를 지워 첫 방문 메인 메뉴로 되돌립니다. */
  function confirmLogout(){
    if(!window.VIBERUN_AUTH || typeof window.VIBERUN_AUTH.logout !== "function"){
      if(typeof toast === "function") toast("로그아웃 처리 중 오류가 발생했습니다.");
      return;
    }

    const result = window.VIBERUN_AUTH.logout();
    if(!result || !result.ok){
      if(typeof toast === "function") toast((result && result.message) || "로그아웃 처리 중 오류가 발생했습니다.");
      return;
    }

    resetLogoutFirstVisitData();
    closeLogoutConfirm();
    closeSettingsViewer();
    returnToFirstVisitStartMenu();
    if(typeof toast === "function") toast("로그아웃되었습니다.");
  }

  function resetLogoutFirstVisitData(){
    if(typeof localStorage === "undefined") return;
    LOGOUT_FIRST_VISIT_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch(error) {
        console.warn("[Auth] 로그아웃 후 첫 방문 데이터 정리 실패:", key, error);
      }
    });
  }

  function returnToFirstVisitStartMenu(){
    const options = {
      forceFirstVisit: true,
      forceTutorialVisible: true,
      ignoreSavedProgress: true
    };

    if(typeof window.showStartMenu === "function"){
      window.showStartMenu(options);
      return;
    }

    if(typeof window.returnToMainMenu === "function"){
      window.returnToMainMenu(options);
      return;
    }

    // 시작 메뉴 강제 렌더 API가 없는 구버전 구조에서는 위에서 localStorage 키를 지운 뒤 새로고침해야 첫 방문 메뉴가 보장됩니다.
    location.reload();
  }

  function isTutorialMapSettings(){
    const mapOverlay = document.getElementById("mapOverlay");
    const tutorialMapSystemActive = window.TUTORIAL_MAP_SYSTEM &&
      typeof window.TUTORIAL_MAP_SYSTEM.isActive === "function" &&
      window.TUTORIAL_MAP_SYSTEM.isActive();
    const tutorialBattleMapOpen = !!(
      mapOverlay &&
      window.TUTORIAL_BATTLE &&
      typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
      window.TUTORIAL_BATTLE.isTutorialBattle()
    );
    return !!(tutorialMapSystemActive || (mapOverlay && mapOverlay.classList.contains("tutorial-map-mode")) || tutorialBattleMapOpen);
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
    closeLogoutConfirm();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    els.overlay.classList.remove("start-mode");
    els.overlay.classList.remove("tutorial-map-settings-mode");
    els.overlay.style.zIndex = "";
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
