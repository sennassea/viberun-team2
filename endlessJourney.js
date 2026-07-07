"use strict";
/* =========================================================================
   끝없는 여정 진입 로직 (endlessJourney.js)
   - ACT1 보스 클리어 후 "끝없는 여정 진입" 선택 시 실행되는 흐름을 담당한다.
   - 디버프의 실제 전투 효과 적용은 다음 작업으로 미루고, 이번에는 상태 갱신과
     ACT1 맵 재생성/신령의 은혜 진입까지만 처리한다.
   ========================================================================= */

function getEndlessJourneyDebuffByLevel(level){
  const list = window.ENDLESS_JOURNEY_DEBUFFS;
  if(!Array.isArray(list)) return null;
  return list.find(d => d && d.level === level) || null;
}

function getEndlessJourneyActiveDebuffs(){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  if(!run || !run.journey) return [];
  const ids = run.journey.activeDebuffIds;
  const list = window.ENDLESS_JOURNEY_DEBUFFS;
  if(!Array.isArray(ids) || !Array.isArray(list)) return [];
  return ids.map(id => list.find(d => d && d.id === id)).filter(Boolean);
}

function canEnterEndlessJourney(){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  if(!run || !run.journey) return true;
  return run.journey.endlessLevel < 20;
}

window.getEndlessJourneyDebuffByLevel = getEndlessJourneyDebuffByLevel;
window.getEndlessJourneyActiveDebuffs = getEndlessJourneyActiveDebuffs;
window.canEnterEndlessJourney = canEnterEndlessJourney;

/* ── 신령의 길에서 선택한 시작 여정 레벨을 새 런에 적용 ─────────────────
   ACT1_START_NEW_GAME(mapNodeLogic.js)이 beginNewRun() 직후 호출한다.
   0(최초의 여정)이면 아무것도 하지 않아 기존 새 게임 흐름과 동일하게 유지된다. */
window.APPLY_START_ENDLESS_LEVEL_TO_NEW_RUN = function(requestedLevel){
  const level = Number(requestedLevel) || 0;
  if(level <= 0) return 0;

  const progress = window.VIBERUN_ENDLESS_PROGRESS;
  const canStart = progress && typeof progress.canStartFromEndlessLevel === "function"
    ? progress.canStartFromEndlessLevel(level)
    : false;

  if(!canStart){
    console.warn("[EndlessJourney] 아직 시작할 수 없는 끝없는 여정 레벨입니다: " + level);
    if(typeof toast === "function") toast("아직 선택할 수 없는 여정입니다.");
    return 0;
  }

  if(typeof RUN_STATE === "undefined" || !RUN_STATE){
    console.warn("[EndlessJourney] RUN_STATE가 없어 시작 여정 레벨을 적용할 수 없습니다.");
    return 0;
  }

  const journey = typeof ensureJourneyState === "function"
    ? ensureJourneyState(RUN_STATE)
    : RUN_STATE.journey;
  if(!journey) return 0;

  journey.mode = "endless";
  journey.actName = "끝없는 여정 " + level;
  journey.endlessLevel = level;
  journey.totalDisplayFloorOffset = level * 16;
  journey.activeDebuffIds = [];
  journey.appliedOneShotDepthEffectIds = [];
  journey.unremovableIntrusiveThoughtCount = 0;
  // 직접 시작한 끝없는 여정 N의 첫 보스 승리에서만 신령 승리 연출을 보여준다.
  journey.firstVictoryPresentationEndlessLevel = level;
  journey.firstVictoryPresentationShown = false;

  for(let debuffLevel = 1; debuffLevel <= level; debuffLevel++){
    const debuff = getEndlessJourneyDebuffByLevel(debuffLevel);
    if(debuff && journey.activeDebuffIds.indexOf(debuff.id) === -1){
      journey.activeDebuffIds.push(debuff.id);
    }
  }

  // 여정 N을 직접 시작하는 경우, 1~N 심도의 1회성 효과(정신력 압박/잠념 침투)를
  // 순서대로 모두 적용한다. 이 시점에는 아직 S(전투 상태)가 없을 수 있으므로
  // RUN_STATE 기준으로 동작한다.
  if(typeof applyEndlessOneShotDepthEffects === "function") applyEndlessOneShotDepthEffects(journey);

  if(typeof S !== "undefined" && S) S.journey = cloneJourneyState(journey);

  return level;
};

window.START_INFINITE_JOURNEY = function(){
  if(typeof S !== "undefined" && S) syncRunStateFromCombat();

  if(!RUN_STATE){
    console.warn("[EndlessJourney] RUN_STATE가 없어 끝없는 여정에 진입할 수 없습니다.");
    if(typeof toast === "function") toast("끝없는 여정에 진입할 수 없습니다.");
    return;
  }

  const journey = typeof ensureJourneyState === "function"
    ? ensureJourneyState(RUN_STATE)
    : RUN_STATE.journey;

  if(!journey){
    console.warn("[EndlessJourney] journey 상태를 확인할 수 없어 진입을 중단합니다.");
    return;
  }

  if(journey.endlessLevel >= 20){
    if(typeof toast === "function") toast("더 이상 진입할 수 있는 끝없는 여정이 없습니다.");
    else console.warn("[EndlessJourney] endlessLevel이 이미 20 이상입니다.");
    return;
  }

  if(typeof window.ACT1_REGENERATE_MAP !== "function"){
    console.warn("[EndlessJourney] ACT1_REGENERATE_MAP을 찾을 수 없어 진입을 중단합니다.");
    return;
  }

  /* 실패 시 복구를 위해 진입 전 journey 상태를 보관해둔다. */
  const prevJourneySnapshot = cloneJourneyState(journey);
  const prevSJourneySnapshot = (typeof S !== "undefined" && S && S.journey)
    ? cloneJourneyState(S.journey)
    : null;

  const nextLevel = journey.endlessLevel + 1;
  const nextDebuff = getEndlessJourneyDebuffByLevel(nextLevel);
  if(!Array.isArray(window.ENDLESS_JOURNEY_DEBUFFS) || !nextDebuff){
    console.warn("[EndlessJourney] " + nextLevel + "레벨 디버프 데이터를 찾을 수 없습니다.");
  }

  journey.mode = "endless";
  journey.actName = "끝없는 여정 " + nextLevel;
  journey.endlessLevel = nextLevel;
  if(nextDebuff && journey.activeDebuffIds.indexOf(nextDebuff.id) === -1){
    journey.activeDebuffIds.push(nextDebuff.id);
  }
  // 끝없는 여정 1의 첫 노드가 17구역으로 보이도록, ACT1 1회 반복 단위(16구역)만큼 오프셋을 계산식으로 대입한다.
  journey.totalDisplayFloorOffset = nextLevel * 16;

  const bossPackageId = (RUN_STATE && RUN_STATE.battlePackageId)
    || (typeof S !== "undefined" && S && S.battlePackageId)
    || (typeof S !== "undefined" && S && S.battleStage && S.battleStage.packageId)
    || null;
  if(bossPackageId){
    if(journey.clearedBossPackageIds.indexOf(bossPackageId) === -1){
      journey.clearedBossPackageIds.push(bossPackageId);
    }
    if(!Array.isArray(journey.bossHistory)) journey.bossHistory = [];
    if(journey.bossHistory[journey.bossHistory.length - 1] !== bossPackageId){
      journey.bossHistory.push(bossPackageId);
      journey.bossHistory = journey.bossHistory.slice(-20);
    }
  }

  /* ACT1 맵 재생성 실패 시, 변경 전 journey 상태로 복구하고 진입을 중단한다.
     (덱/체력/골드 등 다른 런 상태는 이 시점까지 건드리지 않았으므로 그대로 둔다.) */
  const regenerated = window.ACT1_REGENERATE_MAP({
    resetCombatHistory: true,
    currentStage: -1,
    proceedMode: false,
    startMapMode: false
  });
  if(!regenerated){
    RUN_STATE.journey = prevJourneySnapshot;
    if(typeof S !== "undefined" && S) S.journey = prevSJourneySnapshot || cloneJourneyState(prevJourneySnapshot);
    console.warn("[EndlessJourney] ACT1 맵 재생성에 실패하여 끝없는 여정 진입을 중단합니다.");
    return;
  }

  const fallbackMaxHp = (typeof LIFE !== "undefined" && typeof PLAYER_DEF !== "undefined")
    ? LIFE.createPlayer(PLAYER_DEF).maxHp
    : RUN_STATE.player.maxHp;
  if(!Number.isFinite(RUN_STATE.player.maxHp) || RUN_STATE.player.maxHp <= 0){
    RUN_STATE.player.maxHp = fallbackMaxHp;
  }

  /* 보스 처치 후 정신력 회복: 기본은 잃은 정신력을 전부 회복하지만,
     심도 5/18("보스 후 회복 감소")이 활성화되어 있으면 잃은 정신력의
     75%/50%만 회복한다. 두 효과는 합산하지 않고 더 가혹한(낮은) 비율만 적용한다. */
  const maxHp = RUN_STATE.player.maxHp;
  const lostHp = Math.max(0, maxHp - (RUN_STATE.player.hp || 0));
  const healRatio = typeof getEndlessBossAfterHealRatioForIds === "function"
    ? getEndlessBossAfterHealRatioForIds(journey.activeDebuffIds)
    : 1;
  const healAmount = Math.round(lostHp * healRatio);
  RUN_STATE.player.hp = Math.max(0, Math.min(maxHp, (RUN_STATE.player.hp || 0) + healAmount));

  // 이번에 새로 도달한 심도의 1회성 효과(정신력 압박/잠념 침투)를 적용한다.
  if(typeof applyEndlessOneShotDepthEffects === "function") applyEndlessOneShotDepthEffects(journey);

  if(typeof S !== "undefined" && S && S.player){
    S.player.maxHp = RUN_STATE.player.maxHp;
    S.player.hp = RUN_STATE.player.hp;
  }

  if(typeof S !== "undefined" && S) S.journey = cloneJourneyState(journey);
  if(typeof window.renderDepthButtonState === "function") window.renderDepthButtonState();

  const startScreen = document.getElementById("startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  if(typeof updateContinueButtonInfo === "function") updateContinueButtonInfo();

  if(typeof window.OPEN_START_BLESSING === "function"){
    window.OPEN_START_BLESSING();
  } else if(typeof openMap === "function"){
    window.MAP_STATE.currentStage = -1;
    window.MAP_STATE.proceedMode = true;
    openMap();
  }
};
