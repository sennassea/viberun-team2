"use strict";
/* =========================================================================
   끝없는 여정 강제 해금 치트 (cheatEndless.js)

   - endlessJourneyProgress.js / endlessJourney.js / endlessDepthUI.js /
     cheatConsole.js는 전혀 수정하지 않는다.
   - cheatConsole.js가 만들어 둔 window.CHEAT 객체에 endless 그룹만
     "추가"하고, CHEAT.help()는 원본을 감싸서(wrap) 안내 문구만 덧붙인다.
     (cheatMonster.js / cheatEvent.js와 동일한 패턴)
   - 반드시 cheatConsole.js, endlessJourneyProgress.js 이후에 로드되어야 한다.
   - window.VIBERUN_ENDLESS_PROGRESS(read/write)만 사용해 계정별
     "끝없는 여정 N 클리어 기록"을 조작한다. 실제 최대 레벨(MAX_LEVEL) 클램프는
     endlessJourneyProgress.js의 write()가 그대로 처리하므로 여기서 다시
     정의하지 않는다.
   ========================================================================= */
(function initCheatEndless(){

  if(!window.CHEAT){
    return;
  }

  function eWarn(msg){ console.warn("[CHEAT] " + msg); }
  function eLog(msg){ console.log("[CHEAT] " + msg); }

  function getProgressApi(){
    const api = window.VIBERUN_ENDLESS_PROGRESS;
    if(!api){
      eWarn("endlessJourneyProgress.js가 로드되지 않았습니다.");
      return null;
    }
    return api;
  }

  /* CHEAT.endless.unlock(10) → 끝없는 여정 10까지 클리어한 것으로 기록 */
  function cheatEndlessUnlock(level){
    const api = getProgressApi();
    if(!api) return;
    const n = Number(level);
    if(!Number.isFinite(n) || n <= 0){
      eWarn("레벨은 0보다 큰 숫자여야 합니다.");
      return;
    }
    const normalized = api.write({ highestClearedEndlessLevel: n });
    eLog("끝없는 여정 " + normalized.highestClearedEndlessLevel + "까지 해금되었습니다.");
    return normalized;
  }

  /* CHEAT.endless.unlockAll() → 최대 레벨까지 전부 해금 (write()가 MAX_LEVEL로 클램프) */
  function cheatEndlessUnlockAll(){
    return cheatEndlessUnlock(9999);
  }

  /* CHEAT.endless.lock() / CHEAT.endless.lock(3) → 해금 기록 초기화(0) 또는 특정 레벨로 되돌리기 */
  function cheatEndlessLock(level){
    const api = getProgressApi();
    if(!api) return;
    const n = level === undefined ? 0 : Number(level);
    if(!Number.isFinite(n) || n < 0){
      eWarn("레벨은 0 이상의 숫자여야 합니다.");
      return;
    }
    const normalized = api.write({ highestClearedEndlessLevel: n });
    eLog("끝없는 여정 해금 기록이 " + normalized.highestClearedEndlessLevel + "(으)로 되돌아갔습니다.");
    return normalized;
  }

  /* CHEAT.endless.reset() → 저장된 진행도 자체를 삭제 (완전 초기화) */
  function cheatEndlessReset(){
    const api = getProgressApi();
    if(!api) return;
    api.reset();
    eLog("끝없는 여정 진행도가 완전히 초기화되었습니다.");
  }

  /* CHEAT.endless.status() → 현재 해금 상태 출력 */
  function cheatEndlessStatus(){
    const api = getProgressApi();
    if(!api) return;
    const progress = api.read();
    const list = api.getUnlockedStartLevels();
    console.log("[CHEAT] 끝없는 여정 진행도:", progress);
    console.table(list);
    return progress;
  }

  /* ── window.CHEAT.endless 등록 (기존 그룹은 그대로 둔 채 추가만 한다) ──── */
  window.CHEAT.endless = {
    unlock: cheatEndlessUnlock,
    unlockAll: cheatEndlessUnlockAll,
    lock: cheatEndlessLock,
    reset: cheatEndlessReset,
    status: cheatEndlessStatus
  };

  /* ── CHEAT.help() 확장: 원본 help()를 감싸서 안내 문구만 덧붙인다 ──────── */
  if(typeof window.CHEAT.help === "function"){
    const ORIGINAL_HELP = window.CHEAT.help;
    window.CHEAT.help = function cheatWrappedHelpEndless(){
      ORIGINAL_HELP();
      console.log([
        "",
        "── CHEAT.endless (끝없는 여정 강제 해금) ──",
        "CHEAT.endless.unlockAll()        끝없는 여정 전체(최대 레벨까지) 강제 해금",
        "CHEAT.endless.unlock(10)         끝없는 여정 10까지 클리어한 것으로 기록",
        "CHEAT.endless.lock()             해금 기록을 0으로 되돌림(최초의 여정만 남김)",
        "CHEAT.endless.lock(3)            해금 기록을 3까지로 되돌림",
        "CHEAT.endless.reset()            저장된 진행도 자체를 완전히 삭제",
        "CHEAT.endless.status()           현재 해금 상태 출력"
      ].join("\n"));
    };
  }

  console.log("[CHEAT] 끝없는 여정 강제 해금 치트(CHEAT.endless)가 등록되었습니다.");
})();
