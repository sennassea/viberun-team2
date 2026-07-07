"use strict";

/* =========================================================================
   Endless Journey Progress
   - "끝없는 여정 N을 클리어한 적이 있는지"를 계정 단위로 영구 저장한다.
   - 현재 런 저장/이어하기 데이터와는 무관하며, 이어하기 파일이 삭제되어도 유지된다.
   - 신령의 길 UI에서 "끝없는 여정 직접 시작" 해금 판정에 사용될 예정이다.
   ========================================================================= */
(function(){
  const BASE_STORAGE_KEY = "viberunEndlessProgress";
  const VERSION = 1;
  const MAX_LEVEL = 20;

  function getStorageKey(){
    const auth = window.VIBERUN_AUTH;
    if(auth && typeof auth.getAccountInfo === "function"){
      const account = auth.getAccountInfo();
      const accountId = account && account.isLoggedIn ? account.accountId : "";
      if(accountId){
        return BASE_STORAGE_KEY + ":" + String(accountId);
      }
    }
    return BASE_STORAGE_KEY;
  }

  function clampLevel(level){
    const number = Number(level);
    if(!Number.isFinite(number)) return 0;
    if(number < 0) return 0;
    if(number > MAX_LEVEL) return MAX_LEVEL;
    return Math.floor(number);
  }

  function defaultProgress(){
    return {
      version: VERSION,
      highestClearedEndlessLevel: 0,
      updatedAt: new Date().toISOString()
    };
  }

  function read(){
    try {
      const raw = localStorage.getItem(getStorageKey());
      if(!raw) return defaultProgress();

      const parsed = JSON.parse(raw);
      if(!parsed || typeof parsed !== "object") return defaultProgress();

      return {
        version: VERSION,
        highestClearedEndlessLevel: clampLevel(parsed.highestClearedEndlessLevel),
        updatedAt: parsed.updatedAt || new Date().toISOString()
      };
    } catch(error){
      return defaultProgress();
    }
  }

  function write(progress){
    const normalized = {
      version: VERSION,
      highestClearedEndlessLevel: clampLevel(progress && progress.highestClearedEndlessLevel),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(normalized));
    } catch(error){
      console.warn("[EndlessProgress] 진행도 저장 실패:", error);
    }

    return normalized;
  }

  function getHighestClearedLevel(){
    return read().highestClearedEndlessLevel;
  }

  function markCleared(level){
    const number = Number(level);
    if(!Number.isFinite(number)) return false;
    if(number <= 0) return false;

    const clamped = clampLevel(number);
    const current = read();

    if(clamped <= current.highestClearedEndlessLevel) return false;

    write({ highestClearedEndlessLevel: clamped });
    return true;
  }

  function canStartFromEndlessLevel(level){
    if(level === 0) return true;
    return getHighestClearedLevel() >= Number(level);
  }

  function getUnlockedStartLevels(){
    const highest = getHighestClearedLevel();
    const list = [{ level: 0, label: "최초의 여정", unlocked: true }];

    for(let level = 1; level <= highest && level <= MAX_LEVEL; level++){
      list.push({ level, label: "끝없는 여정 " + level, unlocked: true });
    }

    return list;
  }

  function reset(){
    try {
      localStorage.removeItem(getStorageKey());
    } catch(error){
      console.warn("[EndlessProgress] 진행도 초기화 실패:", error);
    }
  }

  window.VIBERUN_ENDLESS_PROGRESS = {
    read,
    write,
    getHighestClearedLevel,
    markCleared,
    canStartFromEndlessLevel,
    getUnlockedStartLevels,
    reset
  };
})();
