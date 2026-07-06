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

function createRunRewardId(){
  return "act1-run-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
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
      runId: createRunRewardId(),
      cleared: { enemy: 0, elite: 0, boss: 0 },
      usedPotionCount: 0,
      usedPotions: [],
      route: [{ stageIndex: -1, type: "start", score: 0, completed: true }],

      // ACT1 실제 점수 기록 (기획서 ACT1_점수_달빛조각_통합기획서_v4.0)
      scoreBreakdown: {
        nodeProgress: 0,
        act1Clear: 0,
        monsterKill: 0,
        combatPerformance: 0,
        bossEndHp: 0,
        journeyAction: 0,
        total: 0
      },
      nodeScores: [],
      completedScoreKeys: {},
      combatPerformanceTotal: 0,
      journeyActionCounts: {
        cardUpgrade: 0,
        cardRemove: 0,
        highRiskEventSuccess: 0
      },
      pendingEventCombat: null,

      // ACT1 달빛조각 실제 계정 wallet 수령 상태 (전투용 S.moonShards와는 무관)
      moonReward: {
        claimKey: null,
        claimed: false,
        claimedAt: null,
        amount: 0,
        score: 0
      }
    }
  };
}

function recordBattleClear(nodeType){
  if(!RUN_STATE || !RUN_STATE.runStats || !RUN_STATE.runStats.cleared) return;
  if(nodeType !== "enemy" && nodeType !== "elite" && nodeType !== "boss") return;
  RUN_STATE.runStats.cleared[nodeType] += 1;
}

/* ── ACT1 실제 점수 기록 유틸 ─────────────────────────────────────────────
   전투/이벤트/상점/휴식 완료 시 실제 진행 데이터를 기반으로
   RUN_STATE.runStats.scoreBreakdown / nodeScores를 채운다.
   runResult.js는 이 값이 있으면 임시 추정값 대신 이 값을 우선 사용한다. */
function getRunScoreData(){
  const data = window.BOHYUN_RUN_RESULT_DATA || {};
  return data.act1Score || {};
}

function safeRunScoreNumber(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ensureRunScoreStats(){
  if(!RUN_STATE) return null;
  if(!RUN_STATE.runStats){
    RUN_STATE.runStats = {
      startedAt: Date.now(),
      runId: createRunRewardId(),
      cleared: { enemy: 0, elite: 0, boss: 0 },
      usedPotionCount: 0,
      usedPotions: [],
      route: [{ stageIndex: -1, type: "start", score: 0, completed: true }]
    };
  }

  const stats = RUN_STATE.runStats;

  if(!stats.runId) stats.runId = createRunRewardId();

  if(!stats.moonReward){
    stats.moonReward = {
      claimKey: null,
      claimed: false,
      claimedAt: null,
      amount: 0,
      score: 0
    };
  }

  if(!stats.scoreBreakdown){
    stats.scoreBreakdown = {
      nodeProgress: 0,
      act1Clear: 0,
      monsterKill: 0,
      combatPerformance: 0,
      bossEndHp: 0,
      journeyAction: 0,
      total: 0
    };
  }

  if(!Array.isArray(stats.nodeScores)) stats.nodeScores = [];
  if(!stats.completedScoreKeys) stats.completedScoreKeys = {};
  if(!Array.isArray(stats.route)) stats.route = [{ stageIndex: -1, type: "start", score: 0, completed: true }];
  if(!stats.journeyActionCounts){
    stats.journeyActionCounts = {
      cardUpgrade: 0,
      cardRemove: 0,
      highRiskEventSuccess: 0
    };
  }

  stats.combatPerformanceTotal = safeRunScoreNumber(stats.combatPerformanceTotal, 0);

  return stats;
}

function recomputeRunScoreTotal(){
  const stats = ensureRunScoreStats();
  if(!stats) return 0;

  const b = stats.scoreBreakdown;
  b.total =
    safeRunScoreNumber(b.nodeProgress, 0) +
    safeRunScoreNumber(b.act1Clear, 0) +
    safeRunScoreNumber(b.monsterKill, 0) +
    safeRunScoreNumber(b.combatPerformance, 0) +
    safeRunScoreNumber(b.bossEndHp, 0) +
    safeRunScoreNumber(b.journeyAction, 0);

  b.total = Math.floor(b.total);
  return b.total;
}

function getCurrentRunStageIndex(){
  if(window.MAP_STATE && Number.isFinite(window.MAP_STATE.currentStage)){
    return window.MAP_STATE.currentStage;
  }
  return -1;
}

function getRunNodeScoreByType(type){
  const scoreData = getRunScoreData();
  const table = scoreData.nodeScores || {};
  const key = type || "unknown";

  return safeRunScoreNumber(
    table[key] ?? table.unknown,
    0
  );
}

function addRunRouteScore(stageIndex, type, score){
  const stats = ensureRunScoreStats();
  if(!stats) return;

  const safeStageIndex = Number.isFinite(stageIndex) ? stageIndex : getCurrentRunStageIndex();
  const safeType = type || "unknown";
  const safeScore = safeRunScoreNumber(score, 0);

  let routeNode = stats.route.find(node => node.stageIndex === safeStageIndex);

  if(!routeNode){
    routeNode = {
      stageIndex: safeStageIndex,
      type: safeType,
      score: 0,
      completed: false
    };
    stats.route.push(routeNode);
  }

  routeNode.type = routeNode.type || safeType;
  routeNode.score = safeRunScoreNumber(routeNode.score, 0) + safeScore;
  routeNode.completed = true;
}

function addRunNodeScore({ key, stageIndex, type, score, category, label, reason }){
  const stats = ensureRunScoreStats();
  if(!stats) return 0;

  const safeKey = key || [stageIndex, type, category, label].join(":");
  if(stats.completedScoreKeys[safeKey]) return 0;
  stats.completedScoreKeys[safeKey] = true;

  const safeScore = Math.max(0, Math.floor(safeRunScoreNumber(score, 0)));
  if(safeScore <= 0) return 0;

  const entry = {
    key: safeKey,
    stageIndex: Number.isFinite(stageIndex) ? stageIndex : getCurrentRunStageIndex(),
    type: type || "unknown",
    score: safeScore,
    category: category || "nodeProgress",
    label: label || "",
    reason: reason || ""
  };

  stats.nodeScores.push(entry);

  if(!stats.scoreBreakdown[entry.category]) stats.scoreBreakdown[entry.category] = 0;
  stats.scoreBreakdown[entry.category] += safeScore;

  if(entry.category === "nodeProgress"){
    addRunRouteScore(entry.stageIndex, entry.type, safeScore);
  }

  recomputeRunScoreTotal();

  return safeScore;
}

function recordCompletedNodeScore(type, options = {}){
  const stageIndex = Number.isFinite(options.stageIndex) ? options.stageIndex : getCurrentRunStageIndex();
  const score = Number.isFinite(options.score) ? options.score : getRunNodeScoreByType(type);

  return addRunNodeScore({
    key: options.key || "node:" + stageIndex + ":" + type,
    stageIndex,
    type,
    score,
    category: "nodeProgress",
    label: options.label || type,
    reason: options.reason || "노드 완료"
  });
}

function getMonsterKillScore(enemy){
  if(!enemy || enemy.summoned) return 0;

  if(enemy.isEnhanced || enemy.enhanced || enemy.grade === "enhanced") return 6;
  if(enemy.grade === "boss") return 40;
  if(enemy.grade === "elite") return 15;

  return 3;
}

function getMonsterKillCapByNodeType(nodeType){
  if(nodeType === "boss") return 40;
  if(nodeType === "elite") return 35;
  return 20;
}

function calculateBattleMonsterKillScore(nodeType){
  if(!S || !Array.isArray(S.enemies)) return 0;

  const cap = getMonsterKillCapByNodeType(nodeType);
  let total = 0;
  const countedBaseIds = {};

  S.enemies.forEach(enemy => {
    if(!enemy || enemy.summoned) return;
    if(enemy.hp > 0) return;

    const baseId = enemy.baseId || enemy.id;
    if(countedBaseIds[baseId]) return;
    countedBaseIds[baseId] = true;

    total += getMonsterKillScore(enemy);
  });

  return Math.min(cap, total);
}

function calculateBattlePerformanceScore(){
  if(!S || !S.player) return 0;

  const runtime = S.scoreRuntime || {};
  const hpLoss = Math.max(0, safeRunScoreNumber(runtime.hpLoss, 0));
  const maxHp = Math.max(1, safeRunScoreNumber(runtime.startMaxHp || S.player.maxHp, 1));
  const ratio = hpLoss / maxHp;

  if(hpLoss <= 0) return 12;
  if(ratio <= 0.10) return 7;
  if(ratio <= 0.25) return 3;
  return 0;
}

function addCombatPerformanceScore(score){
  const stats = ensureRunScoreStats();
  if(!stats) return 0;

  const cap = 100;
  const current = safeRunScoreNumber(stats.combatPerformanceTotal, 0);
  const add = Math.max(0, Math.min(score, cap - current));

  if(add <= 0) return 0;

  stats.combatPerformanceTotal = current + add;
  stats.scoreBreakdown.combatPerformance += add;
  recomputeRunScoreTotal();

  return add;
}

function calculateBossEndHpScore(){
  if(!S || !S.player || !S.player.maxHp) return 0;

  const ratio = S.player.hp / S.player.maxHp;

  if(ratio >= 0.75) return 25;
  if(ratio >= 0.50) return 15;
  if(ratio >= 0.25) return 8;
  return 0;
}

function recordJourneyActionScore(action, options = {}){
  const stats = ensureRunScoreStats();
  if(!stats) return 0;

  const counts = stats.journeyActionCounts;
  let score = 0;
  let cap = 0;
  let countKey = action;
  let label = options.label || action;

  if(action === "cardUpgrade"){
    score = 3;
    cap = 12;
    label = "카드 강화";
  } else if(action === "cardRemove"){
    score = 4;
    cap = 8;
    label = "카드 제거";
  } else if(action === "highRiskEventSuccess"){
    score = 15;
    cap = 30;
    label = "고위험 이벤트 성공";
  } else {
    return 0;
  }

  counts[countKey] = safeRunScoreNumber(counts[countKey], 0);

  const currentScore = counts[countKey] * score;
  if(currentScore >= cap) return 0;

  const add = Math.min(score, cap - currentScore);
  counts[countKey] += 1;

  stats.scoreBreakdown.journeyAction += add;

  stats.nodeScores.push({
    key: "journey:" + action + ":" + counts[countKey],
    stageIndex: Number.isFinite(options.stageIndex) ? options.stageIndex : getCurrentRunStageIndex(),
    type: options.type || "journey",
    score: add,
    category: "journeyAction",
    label,
    reason: options.reason || label
  });

  recomputeRunScoreTotal();
  return add;
}

function recordBattleScoreFromCombat(nodeType){
  if(!S || !RUN_STATE) return;

  const stats = ensureRunScoreStats();
  if(!stats) return;

  if(!S.scoreRuntime) S.scoreRuntime = {};
  if(S.scoreRuntime.battleScoreRecorded) return;
  S.scoreRuntime.battleScoreRecorded = true;

  const stageIndex = getCurrentRunStageIndex();
  const safeNodeType = nodeType || S.battleNodeType || "enemy";

  recordCompletedNodeScore(safeNodeType, {
    stageIndex,
    key: "battleNode:" + stageIndex + ":" + safeNodeType,
    reason: "전투 클리어"
  });

  const monsterKillScore = calculateBattleMonsterKillScore(safeNodeType);
  if(monsterKillScore > 0){
    addRunNodeScore({
      key: "monsterKill:" + stageIndex + ":" + safeNodeType,
      stageIndex,
      type: safeNodeType,
      score: monsterKillScore,
      category: "monsterKill",
      label: "몬스터 처치",
      reason: "원본 몬스터 처치"
    });
  }

  const performanceScore = calculateBattlePerformanceScore();
  addCombatPerformanceScore(performanceScore);

  if(safeNodeType === "boss"){
    const clearBonus = getRunScoreData().clearBonus || {};
    addRunNodeScore({
      key: "act1Clear:" + stageIndex,
      stageIndex,
      type: "boss",
      score: safeRunScoreNumber(clearBonus.act1Win, 100),
      category: "act1Clear",
      label: "ACT1 완주",
      reason: "ACT1 보스 클리어"
    });

    const bossHpScore = calculateBossEndHpScore();
    if(bossHpScore > 0){
      addRunNodeScore({
        key: "bossEndHp:" + stageIndex,
        stageIndex,
        type: "boss",
        score: bossHpScore,
        category: "bossEndHp",
        label: "보스 종료 상태",
        reason: "보스전 종료 정신력"
      });
    }
  }

  if(stats.pendingEventCombat){
    recordCompletedNodeScore("event", {
      stageIndex: stats.pendingEventCombat.stageIndex,
      key: "eventCombatComplete:" + stats.pendingEventCombat.stageIndex,
      reason: "이벤트 전투 완료"
    });

    if(stats.pendingEventCombat.highRisk){
      recordJourneyActionScore("highRiskEventSuccess", {
        stageIndex: stats.pendingEventCombat.stageIndex,
        type: "event",
        reason: "고위험 이벤트 전투 성공"
      });
    }

    stats.pendingEventCombat = null;
  }

  recomputeRunScoreTotal();
}

function recordPotionUsed(potion){
  if(!RUN_STATE || !RUN_STATE.runStats) return;
  RUN_STATE.runStats.usedPotionCount = (RUN_STATE.runStats.usedPotionCount || 0) + 1;
  if(potion && potion.id){
    if(!Array.isArray(RUN_STATE.runStats.usedPotions)) RUN_STATE.runStats.usedPotions = [];
    RUN_STATE.runStats.usedPotions.push({ id: potion.id, name: potion.name, emoji: potion.emoji, iconImage: potion.iconImage || "" });
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

