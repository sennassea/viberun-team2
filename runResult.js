"use strict";
/* =========================================================================
   최종 승리 / 패배 결과 로직 (runResult.js)
   기획서: 최종 승리 / 패배 UI 구현 기획서

   화면 렌더링(오버레이 DOM, 스타일, 드래그 스크롤)은 runResultUI.js로
   분리되어 있으며, 이 파일은 점수/보상 계산, 결과 스냅샷 생성, 랭킹 제출,
   방문 노드 기록, 그리고 어떤 화면을 보여줄지 결정하는 rrOpen() 진입점만
   담당한다. 유니티 이식 시 이 파일의 계산 로직은 C#으로 그대로 옮길 수 있다.

   현재 구현 범위:
   - 승리(최초의 여정): ① 신령 출현 연출 → ② 동자신 대사 → ③ 여정 종료/끝없는 여정 선택
     → ④ 기존 전투 요약 화면
   - 승리(끝없는 여정): ① 신령 출현 연출 생략 → ② 동자신 대사 → ③ 여정 종료/다음 끝없는 여정 선택
     → ④ 기존 전투 요약 화면
   - 패배: ① 동자신 패배 연출 → ② 기존 전투 요약 화면
   전투 상세 화면의 "메인 메뉴로 돌아가기"는 오버레이를 닫고
   startMenu.js의 returnToStartScreen()을 호출해 새 게임을 바로 시작하지
   않고 시작 화면(메인 메뉴)으로 돌아간다.
   이 파일이 처리하지 못하는 결과는 endGame()의 기존 종료 UI로 폴백된다.

   script.js / startMenu.js / startBlessing.js 이후에 로드되어야 한다.
   ========================================================================= */

const RR_DATA = window.BOHYUN_RUN_RESULT_DATA || {};
const RR_ENDING = RR_DATA.ending || {};
const RR_DEFEAT = RR_DATA.defeat || {};
const RR_TUTORIAL_SKIP_DONGJASIN_IMAGE = "assets/characters/dongjasin/dgs_tease_smile.png";

/* ── 동자신 NPC 데이터 ────────────────────────────────────────────────────
   엑셀 v3 지시서 기준으로 동자신은 선택지 안내와 패배 대사만 담당한다. */
const NPC_DONGJASEUNG = {
  id: "npc_dongjaseung",
  name: (RR_ENDING.dongja && RR_ENDING.dongja.name) || RR_DEFEAT.speaker || "동자신",
  emoji: (RR_ENDING.dongja && RR_ENDING.dongja.emoji) || RR_DEFEAT.emoji || "🧒",
  image: (RR_ENDING.dongja && RR_ENDING.dongja.image) || "assets/characters/dongjasin/dgs_greeting_wave.png",
  endlessTitle: (RR_ENDING.labels && RR_ENDING.labels.dongja) || "끝없는 여정",
  endlessLines: (RR_ENDING.dongja && RR_ENDING.dongja.lines) || [
    { text: "드디어 여정이 끝났네.", portrait: "assets/characters/dongjasin/dgs_serious_gentle.png" },
    "아가, 이번 여정은 끝났지만 아직도 수많은 미련이 남았구나.",
    "아가, 이 끝없는 여정을 시작할래?"
  ],
  defeatTitle: RR_DEFEAT.label || "패배",
  defeatLine1: RR_DEFEAT.mainLine || "어라? 벌써 끝이야?",
  defeatLine2: RR_DEFEAT.subLine || "아가, 너무 서두른 거 아니야? 다음엔 더 멀리 가보자."
};

/* ── 노드 타입별 표시 정보 (전투 상세 화면의 "밟은 노드 루트"용) ──────────
   에셋이 없으므로 emoji로 임시 대체한다. mapNodeLogic.js의 ACT1_NODE_INFO와
   동일한 emoji를 사용해 기존 여정 화면과 시각적으로 통일한다. */
const RR_NODE_TYPE_INFO = {
  start: { emoji: "🚪", label: "신령의 은혜", iconImage: "assets/map_icons/start.png" },
  lobby: { emoji: "🚪", label: "신령의 은혜", iconImage: "assets/map_icons/start.png" },
  enemy: { emoji: "👺", label: "노멀", iconImage: "assets/map_icons/enemy.png" },
  elite: { emoji: "👹", label: "엘리트", iconImage: "assets/map_icons/elite.png" },
  boss:  { emoji: "💀", label: "보스", iconImage: "assets/map_icons/boss.png" },
  event: { emoji: "❓", label: "이벤트", iconImage: "assets/map_icons/event.png" },
  shop:  { emoji: "🛒", label: "상점", iconImage: "assets/map_icons/shop.png" },
  rest:  { emoji: "🛖", label: "휴식", iconImage: "assets/map_icons/rest.png" },
  unknown: { emoji: "❔", label: "알 수 없음", iconImage: "" }
};

/* ── 끝없는 여정 상태 판별 헬퍼 ────────────────────────────────────────────
   RUN_STATE.journey를 우선 사용하고, 없으면 S.journey로 폴백한다. */
function getRrJourneyState(){
  if(typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey) return RUN_STATE.journey;
  if(typeof S !== "undefined" && S && S.journey) return S.journey;
  return null;
}

function isRrEndlessMode(){
  const journey = getRrJourneyState();
  return !!journey && journey.mode === "endless";
}

function getRrCurrentEndlessLevel(){
  const journey = getRrJourneyState();
  return (journey && Number.isFinite(journey.endlessLevel)) ? journey.endlessLevel : 0;
}

function getRrNextEndlessLevel(){
  return getRrCurrentEndlessLevel() + 1;
}

function getRrNextEndlessDebuff(){
  const nextLevel = getRrNextEndlessLevel();
  if(typeof window.getEndlessJourneyDebuffByLevel === "function"){
    return window.getEndlessJourneyDebuffByLevel(nextLevel);
  }
  const list = window.ENDLESS_JOURNEY_DEBUFFS;
  if(!Array.isArray(list)) return null;
  return list.find(d => d && d.level === nextLevel) || null;
}

function canRrEnterEndlessJourney(){
  return getRrNextEndlessLevel() <= 20;
}

/* ── ACT1 점수 / 달빛 조각 임시 계산 유틸 ──────────────────────────────────
   ACT1_점수_달빛조각_통합기획서_v4.0 기준. script.js를 아직 연결하지 않았으므로
   route 방문 기록 기반의 임시 추정치만 계산한다. snapshot.scoreBreakdown이
   실제로 들어오면(추후 script.js 연결) 그 값을 우선 사용한다.
   모든 함수는 데이터 누락/오류 상황에서도 0으로 안전하게 폴백한다. */
function rrToSafeNumber(value, fallback = 0){
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getAct1ScoreData(){
  const data = window.BOHYUN_RUN_RESULT_DATA || {};
  return data.act1Score || {};
}

function getAct1NodeScore(node){
  const scoreData = getAct1ScoreData();
  const table = scoreData.nodeScores || {};
  const type = node && node.type ? String(node.type) : "unknown";

  return rrToSafeNumber(
    table[type] ?? table.unknown,
    0
  );
}

function getAct1RouteScore(snapshot){
  const route = Array.isArray(snapshot && snapshot.route) ? snapshot.route : [];

  return route.reduce((sum, node) => {
    return sum + getAct1NodeScore(node);
  }, 0);
}

function getAct1TemporaryBonus(snapshot){
  const scoreData = getAct1ScoreData();
  const bonus = scoreData.temporaryEstimateBonus || {};

  if(!bonus.enabled) return {
    monsterKill: 0,
    combatPerformance: 0,
    bossEndHp: 0,
    journeyAction: 0,
    total: 0
  };

  /*
   * 패배 시에는 완주 보상/추정 보너스를 지급하지 않는다.
   * 기획서 보상표가 ACT1 완주 기준이기 때문이다.
   */
  if(!snapshot || snapshot.result !== "win"){
    return {
      monsterKill: 0,
      combatPerformance: 0,
      bossEndHp: 0,
      journeyAction: 0,
      total: 0
    };
  }

  const result = {
    monsterKill: rrToSafeNumber(bonus.monsterKill, 0),
    combatPerformance: rrToSafeNumber(bonus.combatPerformance, 0),
    bossEndHp: rrToSafeNumber(bonus.bossEndHp, 0),
    journeyAction: rrToSafeNumber(bonus.journeyAction, 0)
  };

  result.total =
    result.monsterKill +
    result.combatPerformance +
    result.bossEndHp +
    result.journeyAction;

  return result;
}

function getAct1ClearBonus(snapshot){
  const scoreData = getAct1ScoreData();
  const clearBonus = scoreData.clearBonus || {};

  if(!snapshot || snapshot.result !== "win") return 0;
  return rrToSafeNumber(clearBonus.act1Win, 0);
}

/*
 * 추후 script.js에서 실제 점수 데이터가 들어오면 그 값을 우선 사용한다.
 * 현재는 route 방문 기록 + ACT1 완주 보너스 + 임시 추정 보너스로 계산한다.
 *
 * 추후 script.js 연결 시 예상 snapshot 구조:
 *
 * snapshot.scoreBreakdown = {
 *   nodeProgress: 604,
 *   act1Clear: 100,
 *   monsterKill: 106,
 *   combatPerformance: 51,
 *   bossEndHp: 15,
 *   journeyAction: 10,
 *   total: 786
 * };
 *
 * snapshot.moonReward = {
 *   moonShards: 55,
 *   tierLabel: "평균 완주",
 *   claimed: false
 * };
 *
 * 이 데이터가 들어오면 runResult.js는 임시 추정값 대신 실제 값을 우선 사용한다.
 */
function getAct1ScoreBreakdown(snapshot){
  if(!snapshot){
    return {
      nodeProgress: 0,
      act1Clear: 0,
      monsterKill: 0,
      combatPerformance: 0,
      bossEndHp: 0,
      journeyAction: 0,
      total: 0,
      isTemporary: true
    };
  }

  if(snapshot.scoreBreakdown && Number.isFinite(Number(snapshot.scoreBreakdown.total))){
    return {
      nodeProgress: rrToSafeNumber(snapshot.scoreBreakdown.nodeProgress, 0),
      act1Clear: rrToSafeNumber(snapshot.scoreBreakdown.act1Clear, 0),
      monsterKill: rrToSafeNumber(snapshot.scoreBreakdown.monsterKill, 0),
      combatPerformance: rrToSafeNumber(snapshot.scoreBreakdown.combatPerformance, 0),
      bossEndHp: rrToSafeNumber(snapshot.scoreBreakdown.bossEndHp, 0),
      journeyAction: rrToSafeNumber(snapshot.scoreBreakdown.journeyAction, 0),
      total: rrToSafeNumber(snapshot.scoreBreakdown.total, 0),
      isTemporary: false
    };
  }

  const nodeProgress = getAct1RouteScore(snapshot);
  const act1Clear = getAct1ClearBonus(snapshot);
  const temp = getAct1TemporaryBonus(snapshot);

  const total =
    nodeProgress +
    act1Clear +
    temp.monsterKill +
    temp.combatPerformance +
    temp.bossEndHp +
    temp.journeyAction;

  return {
    nodeProgress,
    act1Clear,
    monsterKill: temp.monsterKill,
    combatPerformance: temp.combatPerformance,
    bossEndHp: temp.bossEndHp,
    journeyAction: temp.journeyAction,
    total: Math.floor(total),
    isTemporary: true
  };
}

function canClaimAct1MoonReward(snapshot, scoreBreakdown, moonReward){
  if(!snapshot || snapshot.result !== "win") return false;
  if(!scoreBreakdown || scoreBreakdown.isTemporary) return false;
  if(!moonReward || rrToSafeNumber(moonReward.moonShards, 0) <= 0) return false;
  if(snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed) return false;
  return true;
}

function getAct1MoonClaimButtonLabel(snapshot, scoreBreakdown, moonReward){
  if(!snapshot || snapshot.result !== "win") return "없음";
  if(scoreBreakdown && scoreBreakdown.isTemporary) return "실제 점수 연결 필요";
  if(!moonReward || rrToSafeNumber(moonReward.moonShards, 0) <= 0) return "수령 보상 없음";
  if(snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed) return "수령 완료";
  return "달빛 조각 수령";
}

function markAct1MoonRewardClaimed(snapshot, amount, score){
  if(!snapshot) return;

  const claimedAt = Date.now();

  snapshot.moonRewardClaim = Object.assign({}, snapshot.moonRewardClaim || {}, {
    claimed: true,
    claimedAt,
    amount: rrToSafeNumber(amount, 0),
    score: rrToSafeNumber(score, 0)
  });

  if(snapshot.moonRewardPreview){
    snapshot.moonRewardPreview.claimed = true;
    snapshot.moonRewardPreview.claimedAt = claimedAt;
  }

  if(typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.runStats){
    if(!RUN_STATE.runStats.moonReward) RUN_STATE.runStats.moonReward = {};

    RUN_STATE.runStats.moonReward.claimKey =
      snapshot.moonRewardClaim.claimKey || RUN_STATE.runStats.runId;

    RUN_STATE.runStats.moonReward.claimed = true;
    RUN_STATE.runStats.moonReward.claimedAt = claimedAt;
    RUN_STATE.runStats.moonReward.amount = rrToSafeNumber(amount, 0);
    RUN_STATE.runStats.moonReward.score = rrToSafeNumber(score, 0);
  }
}

function claimAct1MoonRewardFromResult(snapshot, options){
  const ui = options || {};
  const scoreBreakdown = getAct1ScoreBreakdown(snapshot);
  const moonReward = getAct1MoonReward(scoreBreakdown.total, snapshot);

  if(!canClaimAct1MoonReward(snapshot, scoreBreakdown, moonReward)){
    return Promise.resolve({
      ok: false,
      code: "NOT_CLAIMABLE",
      message: "현재 상태에서는 달빛 조각을 수령할 수 없습니다."
    });
  }

  const service = window.VIBERUN_RUN_REWARD;
  if(!service || typeof service.claimAct1MoonReward !== "function"){
    return Promise.resolve({
      ok: false,
      code: "SERVICE_MISSING",
      message: "달빛 조각 수령 서비스가 연결되지 않았습니다."
    });
  }

  const claimKey =
    (snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimKey) ||
    snapshot.runId ||
    ("act1-run-" + Date.now());

  if(ui.button){
    ui.button.disabled = true;
    ui.button.textContent = "수령 중...";
  }

  return service.claimAct1MoonReward({
    claimKey,
    result: snapshot.result,
    score: scoreBreakdown.total,
    scoreBreakdown,
    rewardMoonShards: moonReward.moonShards,
    isTemporary: !!scoreBreakdown.isTemporary
  }).then(result => {
    if(result && result.ok){
      const paidAmount = rrToSafeNumber(result.reward && result.reward.moonShards, moonReward.moonShards);
      markAct1MoonRewardClaimed(snapshot, paidAmount, scoreBreakdown.total);

      if(typeof toast === "function"){
        toast("달빛 조각 " + paidAmount + "개를 수령했습니다.");
      }

      return result;
    }

    if(result && result.code === "ALREADY_CLAIMED"){
      const paidAmount = rrToSafeNumber(result.reward && result.reward.moonShards, moonReward.moonShards);
      markAct1MoonRewardClaimed(snapshot, paidAmount, scoreBreakdown.total);

      if(typeof toast === "function"){
        toast("이미 수령한 달빛 조각 보상입니다.");
      }

      return result;
    }

    if(ui.button){
      ui.button.disabled = false;
      ui.button.textContent = getAct1MoonClaimButtonLabel(snapshot, scoreBreakdown, moonReward);
    }

    if(typeof toast === "function"){
      toast((result && result.message) || "달빛 조각 수령에 실패했습니다.");
    }

    return result || {
      ok: false,
      code: "UNKNOWN_ERROR",
      message: "달빛 조각 수령에 실패했습니다."
    };
  }).catch(error => {
    console.warn("[runResult] 달빛 조각 수령 중 오류", error);

    if(ui.button){
      ui.button.disabled = false;
      ui.button.textContent = getAct1MoonClaimButtonLabel(snapshot, scoreBreakdown, moonReward);
    }

    if(typeof toast === "function"){
      toast("달빛 조각 수령 중 오류가 발생했습니다.");
    }

    return {
      ok: false,
      code: "CLAIM_ERROR",
      error,
      message: "달빛 조각 수령 중 오류가 발생했습니다."
    };
  });
}

function getAct1MoonReward(score, snapshot){
  const scoreData = getAct1ScoreData();

  if(!snapshot || snapshot.result !== "win"){
    const defeatReward = scoreData.defeatReward || {};
    return {
      moonShards: rrToSafeNumber(defeatReward.moonShards, 0),
      label: defeatReward.label || "미완주"
    };
  }

  const tiers = Array.isArray(scoreData.rewardTiers) ? scoreData.rewardTiers : [];
  const safeScore = rrToSafeNumber(score, 0);

  const tier = tiers.find(item => {
    const min = rrToSafeNumber(item.min, 0);
    const max = item.max === Infinity ? Infinity : rrToSafeNumber(item.max, Infinity);
    return safeScore >= min && safeScore <= max;
  });

  if(!tier){
    return { moonShards: 0, label: "보상 없음" };
  }

  return {
    moonShards: rrToSafeNumber(tier.moonShards, 0),
    label: tier.label || ""
  };
}

/* ── 노드 진입 시 루트 기록 ──────────────────────────────────────────────
   script.js / mapSystem.js / eventNode.js / shopNode.js / restNode.js가
   모두 window.startStage를 감싸고 있으므로, 이 파일이 가장 마지막에
   로드되는 점을 이용해 한 번 더 감싸서 노드 타입에 관계없이 방문 기록을
   남긴다. 기존 노드 진입 로직은 그대로 호출만 위임하고 수정하지 않는다. */
(function initRrRouteTracking(){
  const prevStartStage = window.startStage;
  window.startStage = function rrWrappedStartStage(stageIdx){
    recordVisitedNode(stageIdx);
    if(typeof prevStartStage === "function") return prevStartStage(stageIdx);
  };
})();

function recordVisitedNode(stageIdx){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  if(!run || !run.runStats) return;
  if(!Array.isArray(run.runStats.route)) run.runStats.route = [];
  const route = run.runStats.route;
  if(route.some(node => node.stageIndex === stageIdx)) return;

  const stage = typeof MAP_STAGES !== "undefined" ? MAP_STAGES[stageIdx] : null;
  route.push({ stageIndex: stageIdx, type: stage ? stage.type : "unknown" });
}

/* ── 결과 스냅샷 생성 (기획서 §7-3) ─────────────────────────────────────── */
function buildRunResultSnapshot(result){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const stats = (run && run.runStats) || {};
  const cleared = stats.cleared || {};
  const relics = (run && Array.isArray(run.relics)) ? run.relics : [];
  const deck = typeof STARTER_DECK !== "undefined" && Array.isArray(STARTER_DECK)
    ? STARTER_DECK
    : ((run && Array.isArray(run.deck)) ? run.deck : []);

  let highestFloor = 0;
  if(typeof getCurrentDisplayAreaNumber === "function"){
    highestFloor = Math.max(0, getCurrentDisplayAreaNumber());
  } else if(typeof nodeFloorIdx === "function" && typeof getCurrentNodeId === "function"){
    highestFloor = Math.max(0, nodeFloorIdx(getCurrentNodeId()));
  }

  const runId = stats.runId || ("act1-run-fallback-" + (stats.startedAt || Date.now()));
  const existingMoonReward = stats.moonReward || {};

  const snapshot = {
    result,
    runId,
    moonRewardClaim: {
      claimKey: existingMoonReward.claimKey || runId,
      claimed: !!existingMoonReward.claimed,
      claimedAt: existingMoonReward.claimedAt || null,
      amount: rrToSafeNumber(existingMoonReward.amount, 0),
      score: rrToSafeNumber(existingMoonReward.score, 0)
    },
    highestFloor,
    cleared: {
      enemy: cleared.enemy || 0,
      elite: cleared.elite || 0,
      boss:  cleared.boss  || 0
    },
    relicCount: relics.length,
    relics: relics.map(relic => ({
      name: relic.name,
      emoji: relic.emoji,
      iconImage: relic.iconImage || relic.icon || ""
    })),
    usedPotionCount: stats.usedPotionCount || 0,
    usedPotions: summarizeRrPotions(stats.usedPotions || []),
    deckCount: deck.length,
    route: Array.isArray(stats.route) ? stats.route : [],
    nodeScores: Array.isArray(stats.nodeScores) ? stats.nodeScores : [],
    scoreBreakdown: stats.scoreBreakdown || null,
    playTimeMs: Date.now() - (stats.startedAt || Date.now())
  };

  /* ACT1 임시 점수/달빛조각 지급 예정량. 추후 script.js 연결 시
     snapshot.scoreBreakdown이 이미 채워져 있으면 getAct1ScoreBreakdown이
     그 값을 우선 사용한다. */
  const scoreBreakdown = getAct1ScoreBreakdown(snapshot);
  const moonReward = getAct1MoonReward(scoreBreakdown.total, snapshot);

  snapshot.scoreBreakdown = scoreBreakdown;
  snapshot.totalScore = scoreBreakdown.total;
  snapshot.moonRewardPreview = Object.assign({}, moonReward, {
    claimKey: snapshot.moonRewardClaim.claimKey,
    claimed: snapshot.moonRewardClaim.claimed,
    claimedAt: snapshot.moonRewardClaim.claimedAt
  });

  return snapshot;
}

function summarizeRrPotions(list){
  const order = [];
  const byId = {};
  list.forEach(potion => {
    if(!potion || !potion.id) return;
    if(!byId[potion.id]){
      byId[potion.id] = { id: potion.id, name: potion.name, emoji: potion.emoji, iconImage: potion.iconImage || "", count: 0 };
      order.push(byId[potion.id]);
    }
    byId[potion.id].count += 1;
  });
  return order;
}

function getSavedEndingSpirit(){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const savedSpirit = run && run.blessingSpirit;
  const spirits = Array.isArray(RR_ENDING.spirits) ? RR_ENDING.spirits : [];
  const matched = savedSpirit && spirits.find(spirit =>
    spirit.id === savedSpirit.id || spirit.name === savedSpirit.name
  );
  const appearanceTitle = (RR_ENDING.labels && RR_ENDING.labels.spirit) || "승리";
  if(matched){
    return Object.assign({}, savedSpirit || {}, matched, {
      appearanceTitle: (savedSpirit && savedSpirit.appearanceTitle) || matched.appearanceTitle || appearanceTitle
    });
  }
  if(savedSpirit){
    return Object.assign({}, savedSpirit, {
      appearanceTitle: savedSpirit.appearanceTitle || appearanceTitle
    });
  }
  if(spirits[0]){
    return Object.assign({}, spirits[0], {
      appearanceTitle: spirits[0].appearanceTitle || appearanceTitle
    });
  }
  return null;
}

function getEndingSpiritLines(spirit){
  if(spirit && Array.isArray(spirit.lines) && spirit.lines.length) return spirit.lines;
  if(spirit && Array.isArray(spirit.appearanceLines) && spirit.appearanceLines.length) return spirit.appearanceLines;
  return [spirit && (spirit.dialogue || spirit.name) || ""].filter(Boolean);
}

function startInfiniteJourney(){
  const startInfinite = window.START_INFINITE_JOURNEY || window.START_ENDLESS_JOURNEY;
  if(typeof startInfinite === "function"){
    closeRrOverlay();
    startInfinite();
    return;
  }
  if(typeof toast === "function"){
    toast("끝없는 여정 시작 함수가 아직 연결되지 않았습니다.");
    return;
  }
  console.warn("[runResult] START_INFINITE_JOURNEY is not defined.");
}

/* ── 전역 인터페이스 ─────────────────────────────────────────────────────── */
function submitRunRankingIfAvailable(snapshot){
  if(!snapshot) return;

  const rankingService = window.VIBERUN_RANKING_SERVICE;
  if(!rankingService || typeof rankingService.submitRunResult !== "function"){
    return;
  }

  rankingService.submitRunResult(snapshot)
    .then(result => {
      if(result && result.ok){
        console.log("[Ranking] 랭킹 제출 완료:", result);
      }
    })
    .catch(error => {
      console.warn("[Ranking] 랭킹 제출 중 오류:", error);
    });
}

/* ── 끝없는 여정 직접 시작 첫 승리 연출 판별 ────────────────────────────────
   신령의 길에서 끝없는 여정 N을 직접 시작한 런은 그 N의 첫 보스 승리에서만
   신령 승리 연출을 보여주고, 이후 진입하는 끝없는 여정에서는 기존처럼
   연출을 생략한다 (기획서: 직접 시작 ACT의 첫 보스 승리 1회). */
function shouldShowDirectStartEndlessVictoryPresentation(){
  const journey = getRrJourneyState();
  if(!journey || journey.mode !== "endless") return false;

  const targetLevel = Number(journey.firstVictoryPresentationEndlessLevel) || 0;
  if(targetLevel <= 0) return false;
  if(journey.firstVictoryPresentationShown) return false;

  return Number(journey.endlessLevel) === targetLevel;
}

function markDirectStartEndlessVictoryPresentationShown(){
  const journey = getRrJourneyState();
  if(!journey) return;

  journey.firstVictoryPresentationShown = true;

  if(typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey){
    RUN_STATE.journey.firstVictoryPresentationShown = true;
  }
  if(typeof S !== "undefined" && S && S.journey){
    S.journey.firstVictoryPresentationShown = true;
  }
}

function markEndlessProgressIfNeeded(){
  const journey = getRrJourneyState();
  if(!journey || journey.mode !== "endless") return;
  const level = Number(journey.endlessLevel) || 0;
  if(level <= 0) return;

  const progress = window.VIBERUN_ENDLESS_PROGRESS;
  if(progress && typeof progress.markCleared === "function"){
    progress.markCleared(level);
  }
}

function rrOpen(result, onContinue){
  if(result !== "win" && result !== "lose") return false;

  const snapshot = buildRunResultSnapshot(result);

  submitRunRankingIfAvailable(snapshot);

  if(result === "win"){
    markEndlessProgressIfNeeded();

    if(isRrEndlessMode()){
      if(shouldShowDirectStartEndlessVictoryPresentation()){
        // 끝없는 여정 N부터 직접 시작한 런의 첫 보스 승리: 신령 승리 연출을 1회만 보여준다.
        markDirectStartEndlessVictoryPresentationShown();
        const directStartSpirit = getSavedEndingSpirit();
        if(directStartSpirit){
          renderBlessingSpiritAppearance(directStartSpirit, snapshot, onContinue);
          return true;
        }
      }
      // 끝없는 여정 보스 클리어: 신령 출현 승리 연출을 생략하고 바로 동자신 선택지로 이동한다.
      renderEndlessJourneyChoice(NPC_DONGJASEUNG, snapshot, onContinue);
      return true;
    }
    const spirit = getSavedEndingSpirit();
    if(!spirit) return false;
    renderBlessingSpiritAppearance(spirit, snapshot, onContinue);
    return true;
  }

  // 패배: 동자승 패배 연출 → (끝없는 여정 선택 없이) 전투 요약으로 이동.
  renderDongjaseungDefeat(NPC_DONGJASEUNG, snapshot, onContinue);
  return true;
}

window.RUN_RESULT_UI = { open: rrOpen };
