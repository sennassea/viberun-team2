"use strict";
function cloneRunArray(list){
  return Array.isArray(list) ? list.map(item => (item && typeof item === "object") ? { ...item } : item) : [];
}

function getInitialSpiritPathSelection(){
  if(window.VIBERUN_SPIRIT_PATH_FILTER &&
     typeof window.VIBERUN_SPIRIT_PATH_FILTER.getStoredSpiritPathDeckIds === "function"){
    return window.VIBERUN_SPIRIT_PATH_FILTER.getStoredSpiritPathDeckIds();
  }

  if(window.VIBERUN_RUN_DECK_SELECTION &&
     Array.isArray(window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds)){
    return window.VIBERUN_RUN_DECK_SELECTION.selectedDeckIds.slice();
  }

  try {
    const raw = sessionStorage.getItem("viberun.selectedSpiritPathDeckIds");
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed) && parsed.length === 3) return parsed;
  } catch(error) {}

  return ["barrier", "memory", "soul_mark"];
}

function createFreshRunState(){
  const player = LIFE.createPlayer(PLAYER_DEF);
  player.block = 0;
  return {
    player,
    deck: [...BASE_STARTER_DECK],
    relics: [],
    potions: [],
    gold: STARTING_GOLD,
    moonShards: STARTING_MOON_SHARDS,
    relicRuntime: {},
    nextBattleStartBlock: 0,
    selectedSpiritPathDeckIds: getInitialSpiritPathSelection(),
    alwaysIncludeGenericItems: true,
    // 기도터 "정리하기"(주문 제거)를 이번 런에서 사용한 횟수 - 새 런 시작 시 0으로 초기화
    cleanseCount: 0,
    // 전투 요약/상세 화면(runResult.js)에서 사용하는 이번 여정 누적 기록 (기획서 §5-1)
    runStats: {
      startedAt: Date.now(),
      cleared: { enemy: 0, elite: 0, boss: 0 },
      usedPotionCount: 0,
      usedPotions: [],
      route: [{ stageIndex: -1, type: "start" }]
    }
  };
}

function recordBattleClear(nodeType){
  if(!RUN_STATE || !RUN_STATE.runStats || !RUN_STATE.runStats.cleared) return;
  if(nodeType !== "enemy" && nodeType !== "elite" && nodeType !== "boss") return;
  RUN_STATE.runStats.cleared[nodeType] += 1;
}

function recordPotionUsed(potion){
  if(!RUN_STATE || !RUN_STATE.runStats) return;
  RUN_STATE.runStats.usedPotionCount = (RUN_STATE.runStats.usedPotionCount || 0) + 1;
  if(potion && potion.id){
    if(!Array.isArray(RUN_STATE.runStats.usedPotions)) RUN_STATE.runStats.usedPotions = [];
    RUN_STATE.runStats.usedPotions.push({ id: potion.id, name: potion.name, emoji: potion.emoji });
  }
}

function beginNewRun(){
  RUN_STATE = createFreshRunState();
  STARTER_DECK = [...RUN_STATE.deck];
  S = null;
  return RUN_STATE;
}

function syncRunStateFromCombat(){
  if(!S || !S.player) return;
  if(!RUN_STATE) RUN_STATE = createFreshRunState();
  RUN_STATE.player = {
    ...RUN_STATE.player,
    hp: S.player.hp,
    maxHp: S.player.maxHp
  };
  RUN_STATE.deck       = [...STARTER_DECK];
  RUN_STATE.relics     = cloneRunArray(S.relics);
  RUN_STATE.potions    = cloneRunArray(S.potions);
  RUN_STATE.gold       = typeof S.gold === "number" ? S.gold : STARTING_GOLD;
  RUN_STATE.moonShards = typeof S.moonShards === "number" ? S.moonShards : STARTING_MOON_SHARDS;
  RUN_STATE.cleanseCount = typeof S.cleanseCount === "number" ? S.cleanseCount : 0;
  RUN_STATE.relicRuntime = S.relicRuntime || RUN_STATE.relicRuntime || {};
  RUN_STATE.nextBattleStartBlock = S.nextBattleStartBlock || 0;
  RUN_STATE.selectedSpiritPathDeckIds = Array.isArray(S.selectedSpiritPathDeckIds)
    ? S.selectedSpiritPathDeckIds.slice()
    : RUN_STATE.selectedSpiritPathDeckIds;
  RUN_STATE.alwaysIncludeGenericItems = true;
}

