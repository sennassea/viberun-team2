"use strict";

/* =========================================================================
   Debug Panel
   - Logo 7 taps toggles Debug Mode itself.
   - Panel open/close is separate and only available while Debug Mode is ON.
   ========================================================================= */
(function(){
  const TAP_LIMIT = 7;
  const TAP_WINDOW_MS = 3000;

  let isDebugModeEnabled = false;
  let isDebugPanelOpen = false;
  let debugLogoTapCount = 0;
  let debugLogoTapTimer = null;
  let isDebugActionPending = false;
  let activeCategory = "move";
  let entryButton = null;
  let panelEl = null;
  let statusEl = null;

  const categories = [
    {
      id: "move",
      label: "이동",
      commands: [
        { id: "moveBattle", label: "일반 전투", run: () => runCheatCommand("node.type", "battle") },
        { id: "moveElite", label: "엘리트", run: () => runCheatCommand("node.type", "elite") },
        { id: "moveBoss", label: "보스", run: () => runCheatCommand("node.boss") },
        { id: "moveShop", label: "상점", run: () => runCheatCommand("node.type", "shop") },
        { id: "moveRest", label: "휴식", run: () => runCheatCommand("node.type", "rest") },
        { id: "moveReward", label: "보상", run: () => runCheatCommand("node.treasure") },
        { id: "moveMap", label: "맵", run: () => runCheatCommand("node.map") },
        { id: "moveLobby", label: "로비", run: () => runCheatCommand("node.lobby") }
      ]
    },
    {
      id: "event",
      label: "이벤트",
      commands: getEventCommands
    },
    {
      id: "monster",
      label: "몬스터",
      commands: [
        { id: "monsterSpawnOne", label: "소환 1마리", run: () => runCheatCommand("monster.spawn", "child_spirit_lost", 1) },
        { id: "monsterSpawnTwo", label: "소환 2마리", run: () => runCheatCommand("monster.spawn", "child_spirit_lost", 2) },
        { id: "monsterSpawnHp1", label: "체력 1 소환", run: () => runCheatCommand("monster.spawn", "child_spirit_lost", 1, { hp: 1 }) },
        { id: "monsterReplaceHN01", label: "HN01로 교체", run: () => runCheatCommand("monster.spawnPackage", "HN01", true) },
        { id: "monsterClearDead", label: "죽은 몬스터 제거", run: () => runCheatCommand("monster.clearDead") },
        { id: "monsterClearSummoned", label: "치트 소환 제거", run: () => runCheatCommand("monster.clearSummoned") },
        { id: "monsterKillAll", label: "모든 몬스터 즉사", run: () => runCheatCommand("kill.enemy", "all") },
        { id: "monsterListLog", label: "몬스터 목록(콘솔)", run: () => runCheatCommand("monster.list") },
        { id: "monsterPackagesLog", label: "패키지 목록(콘솔)", run: () => runCheatCommand("monster.packages") }
      ]
    },
    {
      id: "player",
      label: "플레이어",
      commands: [
        { id: "playerHeal", label: "체력 회복", run: healPlayer },
        { id: "playerHp999", label: "999 체력", run: () => runCheatCommand("hp.player", 999, 999) },
        { id: "playerKill", label: "즉사시키기", run: () => runCheatCommand("kill.player") },
        { id: "playerStatusClear", label: "상태이상 지우기", run: () => runCheatCommand("status.clear", "player") },
        { id: "playerAtkAdd10", label: "공격 보정 +10", run: () => runCheatCommand("atk.player.add", 10) },
        { id: "playerAtkMul2", label: "공격 배율 x2", run: () => runCheatCommand("atk.player.mul", 2) },
        { id: "playerAtkSet50", label: "공격 고정 50", run: () => runCheatCommand("atk.player.set", 50) },
        { id: "playerAtkReset", label: "공격 보정 초기화", run: () => runCheatCommand("atk.player.reset") }
      ]
    },
    {
      id: "status",
      label: "상태이상",
      commands: [
        { id: "statusAddPlayerWeak", label: "PL 동요 +2", run: () => runCheatCommand("status.add", "player", "weak", 2) },
        { id: "statusAddPlayerAnxiety", label: "PL 불안 +2", run: () => runCheatCommand("status.add", "player", "anxiety", 2) },
        { id: "statusAddPlayerLethargy", label: "PL 무기력 +2", run: () => runCheatCommand("status.add", "player", "lethargy", 2) },
        { id: "statusRemovePlayerWeak", label: "PL 동요 -2", run: () => runCheatCommand("status.remove", "player", "weak", 2) },
        { id: "statusRemovePlayerAnxiety", label: "PL 불안 -2", run: () => runCheatCommand("status.remove", "player", "anxiety", 2) },
        { id: "statusAddEnemyWeak", label: "적 전체 동요 +2", run: () => runCheatCommand("status.add", "enemy", "all", "weak", 2) },
        { id: "statusAddEnemyAnxiety", label: "적 전체 불안 +2", run: () => runCheatCommand("status.add", "enemy", "all", "anxiety", 2) },
        { id: "statusAddEnemyLethargy", label: "적 전체 무기력 +2", run: () => runCheatCommand("status.add", "enemy", "all", "lethargy", 2) },
        { id: "statusClearEnemyAll", label: "적 전체 상태이상 제거", run: () => runCheatCommand("status.clear", "enemy", "all") }
      ]
    },
    {
      id: "currency",
      label: "재화",
      commands: [
        { id: "gold1000", label: "골드 +1000", run: grantGold },
        { id: "gold5000", label: "골드 +5000", run: () => runCheatCommand("give.gold", 5000) },
        { id: "goldTake500", label: "골드 -500", run: () => runCheatCommand("take.gold", 500) },
        { id: "gem100", label: "달빛조각 +100", run: grantGem },
        { id: "gem1000", label: "달빛조각 +1000", run: () => runCheatCommand("wallet.moon.add", 1000) },
        { id: "gemSet5000", label: "달빛조각 5000 설정", run: () => runCheatCommand("wallet.moon.set", 5000) },
        { id: "gemTake100", label: "계정 달빛조각 -100", run: () => runCheatCommand("wallet.moon.take", 100) },
        { id: "gemGetLog", label: "계정 달빛조각 확인(콘솔)", run: () => runCheatCommand("wallet.moon.get") },
        { id: "walletRefresh", label: "현재 재화 새로고침", run: refreshWallet }
      ]
    },
    {
      id: "item",
      label: "아이템",
      commands: [
        { id: "relicGiveSample", label: "법구: 놋쇠 향로", run: () => runCheatCommand("give.relic", "bronze_incense_burner") },
        { id: "potionGiveSample", label: "약병: 청심환", run: () => runCheatCommand("give.potion", "cheongsim_pill") },
        { id: "relicListLog", label: "법구 목록(콘솔)", run: () => runCheatCommand("give.relicList") },
        { id: "potionListLog", label: "약병 목록(콘솔)", run: () => runCheatCommand("give.potionList") },
        { id: "takeRelicAll", label: "법구 모두 제거", run: () => runCheatCommand("take.relic", "all") },
        { id: "takePotionAll", label: "물약 모두 제거", run: () => runCheatCommand("take.potion", "all") }
      ]
    },
    {
      id: "card",
      label: "주문",
      commands: [
        { id: "cardHandAdd", label: "손패에 혼백천도", run: () => runCheatCommand("card.hand", "soul_passing", 1) },
        { id: "cardDeckAdd", label: "덱에 로사리 던지기", run: () => runCheatCommand("card.deck", "rosary_throw", 1) },
        { id: "cardDrawAdd", label: "뽑을패에 혼백천도", run: () => runCheatCommand("card.draw", "soul_passing", 1) },
        { id: "cardRemoveOne", label: "혼백천도 1장 제거", run: () => runCheatCommand("card.remove", "soul_passing") },
        { id: "cardRemoveAll", label: "혼백천도 전량 제거", run: () => runCheatCommand("card.removeAll", "soul_passing") },
        { id: "cardClearHand", label: "손패 비우기", run: () => runCheatCommand("card.clear", "hand") },
        { id: "cardClearStatus", label: "상태이상 카드 정리", run: () => runCheatCommand("card.clear", "status") },
        { id: "cardListLog", label: "주문 목록(콘솔)", run: () => runCheatCommand("card.list") },
        { id: "cardFindLog", label: "주문 검색: 혼백(콘솔)", run: () => runCheatCommand("card.find", "혼백") }
      ]
    },
    {
      id: "endless",
      label: "끝없는 여정",
      commands: [
        { id: "endlessUnlockAll", label: "전체 해금", run: () => runCheatCommand("endless.unlockAll") },
        { id: "endlessUnlock10", label: "10까지 해금", run: () => runCheatCommand("endless.unlock", 10) },
        { id: "endlessLockZero", label: "해금 기록 0으로", run: () => runCheatCommand("endless.lock") },
        { id: "endlessLock3", label: "3까지로 되돌리기", run: () => runCheatCommand("endless.lock", 3) },
        { id: "endlessReset", label: "진행도 완전 삭제", run: () => runCheatCommand("endless.reset") },
        { id: "endlessStatusLog", label: "해금 상태 확인(콘솔)", run: () => runCheatCommand("endless.status") }
      ]
    },
    {
      id: "system",
      label: "시스템",
      commands: [
        { id: "resetBattle", label: "전투 초기화", run: () => runCheatCommand("reset.battle") },
        { id: "resetRun", label: "런 초기화", run: () => runCheatCommand("reset.run") },
        { id: "dumpState", label: "상태 출력(콘솔)", run: () => runCheatCommand("dump.state") },
        { id: "dumpCards", label: "카드 출력(콘솔)", run: () => runCheatCommand("dump.cards") },
        { id: "dumpEnemies", label: "몬스터 출력(콘솔)", run: () => runCheatCommand("dump.enemies") },
        { id: "toastInfo", label: "토스트: 안내", run: () => runCheatCommand("toast.info", "안내 테스트") },
        { id: "toastSuccess", label: "토스트: 성공", run: () => runCheatCommand("toast.success", "성공 테스트") },
        { id: "toastWarning", label: "토스트: 경고", run: () => runCheatCommand("toast.warning", "경고 테스트") },
        { id: "toastError", label: "토스트: 오류", run: () => runCheatCommand("toast.error", "오류 테스트") }
      ]
    }
  ];

  function getEventCommands(){
    const commands = [];
    const db = Array.isArray(window.EVENT_DB) ? window.EVENT_DB : [];
    const eventNumbers = Array.from(new Set(db.map(event => getEventNumber(event && event.id)).filter(Number.isFinite)))
      .sort((a, b) => a - b);

    eventNumbers.forEach(number => {
      commands.push({
        id: "eventOpen" + number,
        label: "이벤트 " + number,
        run: () => runCheatCommand("event.open", number)
      });
    });

    commands.push({ id: "eventClose", label: "이벤트 닫기", run: () => runCheatCommand("event.close") });
    return commands;
  }

  function getEventNumber(eventId){
    const match = /^event_(\d+)_/.exec(String(eventId || ""));
    return match ? Number(match[1]) : NaN;
  }

  function getCategoryCommands(category){
    if(!category) return [];
    if(typeof category.commands === "function") return category.commands();
    return Array.isArray(category.commands) ? category.commands : [];
  }

  function setStatus(message){
    if(statusEl) statusEl.textContent = message || "";
    if(message) console.log("[Debug]", message);
  }

  function showToast(message, type){
    if(typeof toast === "function") toast(message, type || "info");
    else if(typeof window.showToast === "function") window.showToast(message, type || "info");
  }

  function emitStateChanged(){
    if(typeof window.dispatchEvent === "function"){
      window.dispatchEvent(new CustomEvent("viberun:debug-mode-changed", {
        detail: {
          isDebugModeEnabled,
          isDebugPanelOpen
        }
      }));
    }
  }

  function renderVisibility(){
    if(entryButton) entryButton.hidden = !isDebugModeEnabled;
    if(panelEl) panelEl.hidden = !(isDebugModeEnabled && isDebugPanelOpen);
  }

  function enableDebugMode(){
    isDebugModeEnabled = true;
    renderVisibility();
    emitStateChanged();
    setStatus("Debug Mode ON");
    showToast("Debug Mode ON", "success");
  }

  function disableDebugMode(){
    closeDebugPanel();
    isDebugModeEnabled = false;
    renderVisibility();
    emitStateChanged();
    setStatus("");
    showToast("Debug Mode OFF", "info");
  }

  function toggleDebugMode(){
    if(isDebugModeEnabled) disableDebugMode();
    else enableDebugMode();
  }

  function openDebugPanel(){
    if(!isDebugModeEnabled) return false;
    isDebugPanelOpen = true;
    renderPanel();
    renderVisibility();
    emitStateChanged();
    return true;
  }

  function closeDebugPanel(){
    isDebugPanelOpen = false;
    renderVisibility();
    emitStateChanged();
  }

  function resetLogoTapCount(){
    debugLogoTapCount = 0;
    if(debugLogoTapTimer){
      clearTimeout(debugLogoTapTimer);
      debugLogoTapTimer = null;
    }
  }

  function handleLogoTap(event){
    if(event && typeof event.preventDefault === "function") event.preventDefault();

    if(debugLogoTapTimer){
      clearTimeout(debugLogoTapTimer);
    }

    debugLogoTapCount += 1;
    debugLogoTapTimer = setTimeout(resetLogoTapCount, TAP_WINDOW_MS);

    if(debugLogoTapCount >= TAP_LIMIT){
      resetLogoTapCount();
      toggleDebugMode();
    }
  }

  function bindLogoTap(){
    const targets = [
      document.querySelector(".start-logo-main"),
      document.querySelector(".start-logo-sub")
    ].filter(Boolean);

    targets.forEach(target => {
      if(target.dataset.debugTapBound) return;
      target.dataset.debugTapBound = "1";
      target.addEventListener("click", handleLogoTap);
      target.addEventListener("touchend", handleLogoTap, { passive: false });
    });
  }

  function ensureElements(){
    if(entryButton && panelEl) return true;

    const game = document.getElementById("game") || document.body;
    if(!game) return false;

    entryButton = document.createElement("button");
    entryButton.type = "button";
    entryButton.className = "debug-entry-button";
    entryButton.textContent = "Debug";
    entryButton.hidden = true;
    entryButton.addEventListener("click", openDebugPanel);

    panelEl = document.createElement("div");
    panelEl.className = "debug-panel";
    panelEl.hidden = true;

    game.appendChild(entryButton);
    game.appendChild(panelEl);
    renderPanel();
    renderVisibility();
    return true;
  }

  function renderPanel(){
    if(!panelEl) return;

    const category = categories.find(item => item.id === activeCategory) || categories[0];
    const commands = getCategoryCommands(category);
    activeCategory = category.id;

    panelEl.innerHTML =
      '<div class="debug-panel-head">' +
        '<div class="debug-panel-title">Debug Mode</div>' +
        '<button type="button" class="debug-panel-close" aria-label="닫기">x</button>' +
      '</div>' +
      '<div class="debug-category-list">' +
        categories.map(item =>
          '<button type="button" class="debug-category-button' + (item.id === activeCategory ? " active" : "") + '" data-category="' + item.id + '">' +
            item.label +
          '</button>'
        ).join("") +
      '</div>' +
      '<div class="debug-command-list">' +
        commands.map(command =>
          '<button type="button" class="debug-command-button" data-command="' + command.id + '">' +
            command.label +
          '</button>'
        ).join("") +
      '</div>' +
      '<div class="debug-status-line"></div>';

    statusEl = panelEl.querySelector(".debug-status-line");
    panelEl.querySelector(".debug-panel-close").addEventListener("click", closeDebugPanel);
    panelEl.querySelectorAll(".debug-category-button").forEach(button => {
      button.addEventListener("click", () => {
        activeCategory = button.dataset.category || activeCategory;
        renderPanel();
      });
    });
    panelEl.querySelectorAll(".debug-command-button").forEach(button => {
      button.addEventListener("click", () => runCommand(button.dataset.command));
    });
  }

  function findCommand(commandId){
    for(const category of categories){
      const commands = getCategoryCommands(category);
      const command = commands.find(item => item.id === commandId);
      if(command) return command;
    }
    return null;
  }

  function runCommand(commandId){
    const command = findCommand(commandId);
    if(!command) return;

    runGuarded(() => Promise.resolve(command.run())).then(result => {
      if(result && result.message) setStatus(result.message);
    });
  }

  function getCheatFunction(path){
    const parts = String(path || "").split(".").filter(Boolean);
    let current = window.CHEAT;
    for(const part of parts){
      if(!current) return null;
      current = current[part];
    }
    return typeof current === "function" ? current : null;
  }

  function runCheatCommand(path){
    const fn = getCheatFunction(path);
    if(!fn){
      return { ok: false, message: "명령 없음: CHEAT." + path };
    }

    const args = Array.prototype.slice.call(arguments, 1);
    const result = fn.apply(window.CHEAT, args);
    return {
      ok: true,
      result,
      message: "실행: CHEAT." + path
    };
  }

  function runGuarded(action){
    if(!isDebugModeEnabled){
      console.warn("[Debug] Debug Mode is OFF.");
      return Promise.resolve({ ok: false, code: "DEBUG_MODE_OFF", message: "Debug Mode OFF" });
    }

    if(isDebugActionPending){
      return Promise.resolve({ ok: false, code: "REQUEST_PENDING", message: "처리 중" });
    }

    isDebugActionPending = true;
    setStatus("처리 중...");

    return Promise.resolve()
      .then(action)
      .catch(error => {
        console.warn("[Debug] command failed:", error);
        showToast("디버그 명령 실패", "error");
        return { ok: false, error, message: "실패" };
      })
      .finally(() => {
        isDebugActionPending = false;
      });
  }

  function guardCheatFunction(fn, path){
    if(fn && fn.__debugGuarded) return fn;
    const guarded = function(){
      if(!isDebugModeEnabled){
        console.warn("[CHEAT] Debug Mode OFF: " + path);
        return undefined;
      }
      return fn.apply(this, arguments);
    };
    guarded.__debugGuarded = true;
    guarded.__debugOriginal = fn;
    return guarded;
  }

  function guardCheatTree(target, path){
    if(!target || typeof target !== "object") return target;
    Object.keys(target).forEach(key => {
      const value = target[key];
      const nextPath = path ? path + "." + key : key;
      if(typeof value === "function"){
        target[key] = guardCheatFunction(value, nextPath);
      } else if(value && typeof value === "object"){
        guardCheatTree(value, nextPath);
      }
    });
    return target;
  }

  function refreshHud(){
    if(typeof renderHud === "function") renderHud();
    if(typeof renderAll === "function") renderAll();
  }

  function grantGold(){
    if(typeof S === "undefined" || !S){
      return { ok: false, message: "전투 중이 아님" };
    }
    S.gold = Math.max(0, Math.floor(Number(S.gold) || 0)) + 1000;
    refreshHud();
    showToast("골드 +1000", "success");
    return { ok: true, message: "골드 +1000" };
  }

  function grantGem(){
    const service = window.VIBERUN_CHEAT_WALLET;
    if(!service || typeof service.updateMoon !== "function"){
      return { ok: false, message: "치트 지갑 서비스 없음" };
    }
    return service.updateMoon("add", 100, "debug panel gem +100").then(result => {
      if(result && result.ok){
        showToast("달빛조각 +100", "success");
        return { ok: true, message: "달빛조각 +100" };
      }
      return { ok: false, message: (result && result.message) || "달빛조각 지급 실패" };
    });
  }

  function healPlayer(){
    if(typeof S === "undefined" || !S || !S.player){
      return { ok: false, message: "전투 중이 아님" };
    }
    S.player.hp = S.player.maxHp;
    refreshHud();
    showToast("체력 회복", "success");
    return { ok: true, message: "체력 회복" };
  }

  function submitTestScore(){
    const service = window.VIBERUN_RANKING_SERVICE;
    if(!service || typeof service.submitRunResult !== "function"){
      return { ok: false, message: "랭킹 서비스 없음" };
    }
    return service.submitRunResult({
      runId: "debug-test-" + Date.now(),
      result: "win",
      totalScore: 777,
      playTimeMs: 123000,
      scoreBreakdown: {
        total: 777,
        isTemporary: false
      }
    }).then(result => {
      if(result && result.ok){
        showToast("테스트 점수 제출", "success");
        return { ok: true, message: "점수 제출 완료" };
      }
      return { ok: false, message: (result && result.message) || "점수 제출 실패" };
    });
  }

  function refreshRanking(){
    const service = window.VIBERUN_RANKING_SERVICE;
    if(!service || typeof service.fetchRanking !== "function"){
      return { ok: false, message: "랭킹 서비스 없음" };
    }
    return service.fetchRanking("all").then(result => {
      if(result && result.ok){
        window.dispatchEvent(new CustomEvent("viberun:ranking-updated", { detail: { source: "debug" } }));
        showToast("랭킹 새로고침", "success");
        return { ok: true, message: "랭킹 " + result.rows.length + "건" };
      }
      return { ok: false, message: (result && result.message) || "랭킹 새로고침 실패" };
    });
  }

  function refreshWallet(){
    const service = window.VIBERUN_WALLET;
    if(!service || typeof service.fetchWallet !== "function"){
      return { ok: false, message: "지갑 서비스 없음" };
    }
    return service.fetchWallet().then(result => {
      if(result && result.ok){
        showToast("재화 새로고침", "success");
        return { ok: true, message: "재화 새로고침" };
      }
      return { ok: false, message: (result && result.message) || "재화 새로고침 실패" };
    });
  }

  function closePanelCommand(){
    closeDebugPanel();
    return { ok: true, message: "패널 닫음" };
  }

  function init(){
    bindLogoTap();
    ensureElements();
  }

  window.VIBERUN_DEBUG = {
    isEnabled: () => isDebugModeEnabled,
    isPanelOpen: () => isDebugPanelOpen,
    enable: enableDebugMode,
    disable: disableDebugMode,
    openPanel: openDebugPanel,
    closePanel: closeDebugPanel,
    runGuarded,
    guardCheatTree
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
