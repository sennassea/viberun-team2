"use strict";
/* =========================================================================
   최종 승리 / 패배 결과 UI (runResult.js)
   기획서: 최종 승리 / 패배 UI 구현 기획서

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

let rrOverlayEl = null;

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

/* ── DOM 생성 ────────────────────────────────────────────────────────────── */
function ensureRrOverlay(){
  if(rrOverlayEl) return rrOverlayEl;
  ensureRrStyles();

  const overlay = document.createElement("div");
  overlay.id = "runResultOverlay";
  overlay.className = "rr-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="rr-backdrop"></div>' +
    '<div class="rr-frame">' +
      '<div class="rr-character-wrap" id="rrCharacterWrap"></div>' +
      '<div class="rr-panel-slot" id="rrPanelSlot"></div>' +
    '</div>';

  (document.querySelector("#game") || document.body).appendChild(overlay);
  rrOverlayEl = overlay;
  return overlay;
}

function closeRrOverlay(){
  if(!rrOverlayEl) return;
  rrOverlayEl.classList.remove("show");
  rrOverlayEl.setAttribute("aria-hidden", "true");
  document.body.classList.remove("result-ui-open");
}

/* ── 승리 연출: 신령의 은혜 신령 출현 ─────────────────────────────────────── */
function renderBlessingSpiritAppearance(spirit, snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.className = "rr-character-wrap rr-character-wrap--victory";
  characterWrap.innerHTML = spirit.image
    ? '<img src="' + spirit.image + '" alt="' + (spirit.name || "") + '">'
    : '<div class="rr-character-emoji">' + (spirit.emoji || "") + '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-dialog-panel">' +
      '<div class="rr-badge"><span id="rrBadgeText">승리</span></div>' +
      '<div class="rr-lines rr-lines--victory" id="rrLines"></div>' +
      '<div class="rr-divider"></div>' +
      '<div class="rr-continue">✦ 터치하여 계속 ✦</div>' +
    '</div>';

  overlay.querySelector("#rrBadgeText").textContent =
    spirit.appearanceTitle || (RR_ENDING.labels && RR_ENDING.labels.spirit) || "승리";

  const dialogLines = getEndingSpiritLines(spirit);
  let lineIndex = 0;
  const renderLine = () => {
    overlay.querySelector("#rrLines").innerHTML = '<p>' + escapeRrHtml(dialogLines[lineIndex] || "").replace(/\n/g, "<br>") + '</p>';
  };
  renderLine();

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  const handleContinue = (event) => {
    event.preventDefault();
    lineIndex += 1;
    if(lineIndex < dialogLines.length){
      renderLine();
      return;
    }
    overlay.removeEventListener("click", handleContinue);
    renderEndlessJourneyChoice(NPC_DONGJASEUNG, snapshot, onFinish);
  };
  overlay.addEventListener("click", handleContinue);
}

/* ── 패배 연출: 동자승 (기획서 §3-3) ───────────────────────────────────────
   승리 연출(renderBlessingSpiritAppearance)과 동일한 rr-dialog-panel 구조를
   재사용해 패널/캐릭터 크기를 그대로 맞춘다. 터치하면 끝없는 여정 선택 화면을
   거치지 않고 바로 전투 요약 화면으로 이동한다 (기획서 §2-2). */
function renderDongjaseungDefeat(npc, snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.className = "rr-character-wrap";
  const defeatImage = npc.defeatImage || RR_DEFEAT.image || RR_TUTORIAL_SKIP_DONGJASIN_IMAGE;
  characterWrap.innerHTML = defeatImage
    ? '<img class="rr-defeat-dongjasin" src="' + defeatImage + '" alt="' + (npc.name || "") + '">'
    : '<div class="rr-character-emoji">' + (npc.emoji || "") + '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-dialog-panel rr-dialog-panel--defeat">' +
      '<div class="rr-badge"><span id="rrBadgeText">패배</span></div>' +
      '<div class="rr-lines" id="rrLines"></div>' +
      '<div class="rr-divider"></div>' +
      '<div class="rr-continue">✦ 터치하여 계속 ✦</div>' +
    '</div>';

  overlay.querySelector("#rrBadgeText").textContent = npc.defeatTitle || "패배";

  const dialogLines = [npc.defeatLine1, npc.defeatLine2].filter(Boolean);
  overlay.querySelector("#rrLines").innerHTML =
    dialogLines.map(line => '<p>' + escapeRrHtml(line).replace(/\n/g, "<br>") + '</p>').join("");

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  const handleContinue = (event) => {
    event.preventDefault();
    overlay.removeEventListener("click", handleContinue);
    renderRunSummary(snapshot, onFinish);
  };
  overlay.addEventListener("click", handleContinue);
}

/* ── 동자신: 끝없는 여정 선택 화면 (기획서 §3-1, §7-2) ────────────────────
   동자신 대사가 모두 끝난 뒤 선택지를 노출한다. 여정 종료는 기존 전투 요약
   UI로 연결하고, 끝없는 여정은 외부 진입 함수가 있을 때만 호출한다. */
function renderEndlessJourneyChoice(npc, snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.className = "rr-character-wrap";
  const renderCharacterForLine = (line) => {
    const portrait = (line && typeof line === "object" && line.portrait) || npc.image;
    characterWrap.innerHTML = portrait
      ? '<img class="rr-defeat-dongjasin" src="' + portrait + '" alt="' + (npc.name || "") + '">'
      : '<div class="rr-character-emoji">' + (npc.emoji || "") + '</div>';
  };
  const getLineText = (line) => typeof line === "string" ? line : ((line && line.text) || "");

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  const lines = Array.isArray(npc.endlessLines) ? npc.endlessLines : [];
  let lineIndex = 0;
  const renderDialogue = () => {
    const currentLine = lines[lineIndex];
    renderCharacterForLine(currentLine);
    const panelSlot = overlay.querySelector("#rrPanelSlot");
    panelSlot.innerHTML =
      '<div class="rr-choice-panel">' +
        '<div class="rr-choice-titlebar"><span>' + escapeRrHtml(npc.endlessTitle || "끝없는 여정") + '</span></div>' +
        '<div class="rr-choice-lines">' +
          '<p class="rr-choice-line-main">' + escapeRrHtml(getLineText(currentLine)).replace(/\n/g, "<br>") + '</p>' +
        '</div>' +
        '<div class="rr-divider"></div>' +
        '<div class="rr-continue">✦ ' + escapeRrHtml((RR_ENDING.labels && RR_ENDING.labels.continue) || "터치하여 계속") + ' ✦</div>' +
      '</div>';
  };
  const renderChoices = () => {
    const choices = RR_ENDING.choices || {};
    const panelSlot = overlay.querySelector("#rrPanelSlot");

    const canEnterEndless = canRrEnterEndlessJourney();
    const nextLevel = getRrNextEndlessLevel();
    const nextDebuff = getRrNextEndlessDebuff();

    const endlessTitle = canEnterEndless
      ? "끝없는 여정 " + nextLevel + " 진입"
      : ((choices.infinite && choices.infinite.title) || "끝없는 여정 진입");

    let endlessDesc;
    if(!canEnterEndless){
      endlessDesc = "끝없는 여정 20까지 완료했습니다. 더 이상 진입할 수 없습니다.";
    } else if(nextDebuff){
      endlessDesc = "추가 심도: 심도 " + nextDebuff.level + "\n" + nextDebuff.name + "\n" + nextDebuff.desc;
    } else {
      endlessDesc = (choices.infinite && choices.infinite.desc) || "다음 끝없는 여정으로 이어서 나아갑니다.";
    }

    const endlessCardClass = "rr-choice-card " +
      (canEnterEndless ? "rr-choice-card--active" : "rr-choice-card--disabled");

    panelSlot.innerHTML =
      '<div class="rr-choice-panel">' +
        '<div class="rr-choice-titlebar"><span>' + escapeRrHtml(npc.endlessTitle || "끝없는 여정") + '</span></div>' +
        '<div class="rr-choice-lines">' +
          '<p class="rr-choice-line-main">이후 진행을 선택하세요.</p>' +
        '</div>' +
        '<div class="rr-choice-cards">' +
          '<div class="rr-choice-card rr-choice-card--active" id="rrChoiceFinish">' +
            '<div class="rr-choice-card-icon">📖</div>' +
            '<div class="rr-choice-card-title">' + escapeRrHtml(choices.exit && choices.exit.title || "여정 종료") + '</div>' +
            '<div class="rr-choice-card-desc">' + escapeRrHtml(choices.exit && choices.exit.desc || "이번 여정의 기록을 확인하고 돌아갑니다.") + '</div>' +
          '</div>' +
          '<div class="' + endlessCardClass + '" id="rrChoiceEndless"' + (canEnterEndless ? "" : ' aria-disabled="true"') + '>' +
            '<div class="rr-choice-card-icon">∞</div>' +
            '<div class="rr-choice-card-title">' + escapeRrHtml(endlessTitle) + '</div>' +
            '<div class="rr-choice-card-desc">' + escapeRrHtml(endlessDesc).replace(/\n/g, "<br>") + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    panelSlot.querySelector("#rrChoiceFinish").addEventListener("click", (event) => {
      event.stopPropagation();
      renderRunSummary(snapshot, onFinish);
    });
    panelSlot.querySelector("#rrChoiceEndless").addEventListener("click", (event) => {
      event.stopPropagation();
      if(!canRrEnterEndlessJourney()){
        if(typeof toast === "function") toast("더 이상 진입할 수 있는 끝없는 여정이 없습니다.");
        return;
      }
      startInfiniteJourney();
    });
  };

  renderDialogue();
  const handleContinue = (event) => {
    event.preventDefault();
    lineIndex += 1;
    if(lineIndex < lines.length){
      renderDialogue();
      return;
    }
    overlay.removeEventListener("click", handleContinue);
    renderChoices();
  };
  overlay.addEventListener("click", handleContinue);
}

/* ── 전투 요약 화면 (기존 구현 재사용) ─────────────────────────────────────
   승리: 끝없는 여정 선택에서 "여정 종료" 클릭 시 진입.
   패배: 동자신 패배 연출 터치 후 바로 진입한다. */
function renderRunSummary(snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = "";

  const scoreBreakdown = getAct1ScoreBreakdown(snapshot);
  const moonReward = getAct1MoonReward(scoreBreakdown.total, snapshot);
  const isClaimed = !!(snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed);

  const rows = [
    { icon:"🏆", label:"최종 여정 점수",      value:scoreBreakdown.total,   unit:"점" },
    { icon:"🌙", label:isClaimed ? "달빛 조각 수령 완료" : "달빛 조각 수령 가능",  value:moonReward.moonShards,  unit:"개" },
    { icon:"🗼", label:"진행한 구역 수", value:snapshot.highestFloor, unit:"층" },
    { icon:"💀", label:"클리어 보스 수",     value:snapshot.cleared.boss,  unit:"개" },
    { icon:"👺", label:"클리어 노멀 수",      value:snapshot.cleared.enemy, unit:"개" },
    { icon:"👹", label:"클리어 엘리트 수",    value:snapshot.cleared.elite, unit:"개" },
    { icon:"🏺", label:"수집한 법구 수",      value:snapshot.relicCount,    unit:"개" },
    { icon:"🧪", label:"사용한 약병 수",      value:snapshot.usedPotionCount, unit:"개" }
  ];

  const canClaimMoon = canClaimAct1MoonReward(snapshot, scoreBreakdown, moonReward);
  const claimButtonLabel = getAct1MoonClaimButtonLabel(snapshot, scoreBreakdown, moonReward);

  const moonClaimBoxHtml =
    '<div class="rr-moon-claim-wrap">' +
      '<div class="rr-moon-claim-box' + (isClaimed ? " is-claimed" : "") + '">' +
        '<div class="rr-moon-claim-icon">🌙</div>' +
        '<div class="rr-moon-claim-label">' + (isClaimed ? "수령 완료" : "점수 보상") + '</div>' +
        '<div class="rr-moon-claim-count">' + rrToSafeNumber(moonReward.moonShards, 0) + '개</div>' +
        '<button type="button" class="rr-moon-claim-btn" id="rrMoonClaimBtn" ' +
          (canClaimMoon ? "" : "disabled") +
        '>' + escapeRrHtml(claimButtonLabel) + '</button>' +
      '</div>' +
    '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-summary-panel">' +
      '<div class="rr-summary-titlebar"><span>여정 요약</span></div>' +
      '<div class="rr-summary-rows">' +
        rows.map(row =>
          '<div class="rr-summary-row">' +
            '<div class="rr-summary-row-icon">' + row.icon + '</div>' +
            '<div class="rr-summary-row-label">' + row.label + '</div>' +
            '<div class="rr-summary-row-sep">✦</div>' +
            '<div class="rr-summary-row-value"><strong>' + row.value + '</strong><span>' + row.unit + '</span></div>' +
          '</div>'
        ).join("") +
      '</div>' +
      moonClaimBoxHtml +
      '<button type="button" class="rr-summary-next" id="rrSummaryNext">다음</button>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  const claimButton = panelSlot.querySelector("#rrMoonClaimBtn");
  if(claimButton){
    claimButton.addEventListener("click", (event) => {
      event.stopPropagation();

      claimAct1MoonRewardFromResult(snapshot, { button: claimButton }).then(() => {
        const refreshedBreakdown = getAct1ScoreBreakdown(snapshot);
        const refreshedReward = getAct1MoonReward(refreshedBreakdown.total, snapshot);

        claimButton.textContent = getAct1MoonClaimButtonLabel(snapshot, refreshedBreakdown, refreshedReward);
        claimButton.disabled = !canClaimAct1MoonReward(snapshot, refreshedBreakdown, refreshedReward);

        const box = panelSlot.querySelector(".rr-moon-claim-box");
        if(box && snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed){
          box.classList.add("is-claimed");
        }
      });
    });
  }

  panelSlot.querySelector("#rrSummaryNext").addEventListener("click", (event) => {
    event.stopPropagation();
    renderRunDetail(snapshot, onFinish);
  });
}

/* ── 전투 상세 화면 (기획서 §4-2, §10-2) ────────────────────────────────────
   전투 요약의 "다음" 클릭 시 진입. 캐릭터 없이 중앙 패널로 표시하며,
   노드 루트 / 법구 종류 / 약병 종류는 가로 드래그로 넘겨볼 수 있다. */
function renderRunDetail(snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = "";

  const routeHtml = snapshot.route.length
    ? snapshot.route.map((node, index) =>
        rrRouteNodeHtml(node) + (index < snapshot.route.length - 1 ? '<div class="rr-route-arrow">→</div>' : '')
      ).join("")
    : '<div class="rr-empty-text">기록 없음</div>';

  const relicTrackHtml = snapshot.relics.length
    ? snapshot.relics.map(relic => rrItemCardHtml(relic.iconImage || relic.emoji, relic.name)).join("")
    : '<div class="rr-empty-text">없음</div>';

  const potionTrackHtml = snapshot.usedPotions.length
    ? snapshot.usedPotions.map(potion => rrItemCardHtml(potion.iconImage || potion.emoji, potion.name, potion.count)).join("")
    : '<div class="rr-empty-text">없음</div>';

  const scoreBreakdown = getAct1ScoreBreakdown(snapshot);
  const moonReward = getAct1MoonReward(scoreBreakdown.total, snapshot);
  const moonClaimText = snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed
    ? "🌙 " + moonReward.moonShards + "개 수령 완료"
    : "🌙 " + moonReward.moonShards + "개 수령 가능";

  const scoreDetailHtml =
    '<div class="rr-score-breakdown">' +
      '<div class="rr-score-breakdown-title">여정 점수 상세</div>' +
      '<div class="rr-score-breakdown-grid">' +
        '<div><span>구역 진행</span><strong>' + scoreBreakdown.nodeProgress + '점</strong></div>' +
        '<div><span>ACT1 완주</span><strong>' + scoreBreakdown.act1Clear + '점</strong></div>' +
        '<div><span>몬스터 처치</span><strong>' + scoreBreakdown.monsterKill + '점</strong></div>' +
        '<div><span>전투 수행</span><strong>' + scoreBreakdown.combatPerformance + '점</strong></div>' +
        '<div><span>보스 종료 상태</span><strong>' + scoreBreakdown.bossEndHp + '점</strong></div>' +
        '<div><span>여정 행동</span><strong>' + scoreBreakdown.journeyAction + '점</strong></div>' +
      '</div>' +
      '<div class="rr-score-reward-line">' +
        '<span>최종 ' + scoreBreakdown.total + '점</span>' +
        '<strong>' + escapeRrHtml(moonClaimText) + '</strong>' +
      '</div>' +
    '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-detail-panel">' +
      '<div class="rr-detail-titlebar"><span>여정 상세</span></div>' +
      '<div class="rr-detail-section">' +
        '<div class="rr-detail-section-title">❀ 밟은 구역 루트 ❀</div>' +
        rrDragWrapHtml(routeHtml, "rr-route-viewport") +
      '</div>' +
      scoreDetailHtml +
      '<div class="rr-detail-grid">' +
        '<div class="rr-detail-stack">' +
          '<div class="rr-detail-tile">' +
            '<div class="rr-detail-tile-icon">⏳</div>' +
            '<div class="rr-detail-tile-body">' +
              '<div class="rr-detail-tile-label">플레이타임</div>' +
              '<div class="rr-detail-tile-value">' + formatRrPlayTime(snapshot.playTimeMs) + '</div>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="rr-detail-tile rr-detail-tile--button" id="rrDetailDeckBtn">' +
            '<div class="rr-detail-tile-icon">🃏</div>' +
            '<div class="rr-detail-tile-body">' +
              '<div class="rr-detail-tile-label">수집한 주문 수</div>' +
              '<div class="rr-detail-tile-value">' + snapshot.deckCount + '장</div>' +
            '</div>' +
          '</button>' +
        '</div>' +
        '<div class="rr-detail-stack">' +
          '<div class="rr-detail-section rr-detail-section--tight">' +
            '<div class="rr-detail-section-title">수집한 법구 종류</div>' +
            rrDragWrapHtml(relicTrackHtml, "rr-item-viewport") +
          '</div>' +
          '<div class="rr-detail-section rr-detail-section--tight">' +
            '<div class="rr-detail-section-title">사용한 약병 종류</div>' +
            rrDragWrapHtml(potionTrackHtml, "rr-item-viewport") +
          '</div>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="rr-detail-finish" id="rrDetailFinish">메인 메뉴로 돌아가기</button>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  rrInitDragScroll(panelSlot);

  const deckBtn = panelSlot.querySelector("#rrDetailDeckBtn");
  if(deckBtn){
    deckBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      if(typeof window.OPEN_DECK_VIEWER === "function") window.OPEN_DECK_VIEWER("all");
    });
  }

  panelSlot.querySelector("#rrDetailFinish").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRrOverlay();
    // 새 게임을 바로 시작하지 않고 시작 화면(메인 메뉴)으로 돌아간다 (startMenu.js).
    if(typeof returnToStartScreen === "function") returnToStartScreen();
  });
}

function rrGetRouteNodeInfo(node){
  const type = node && node.type ? String(node.type) : "unknown";
  const baseInfo = RR_NODE_TYPE_INFO[type] || RR_NODE_TYPE_INFO.unknown || { emoji: "❔", label: type };

  return {
    label: (node && node.label) || baseInfo.label || type,
    iconImage: (node && node.iconImage) || baseInfo.iconImage || "",
    emoji: (node && node.emoji) || baseInfo.emoji || "❔"
  };
}

function rrRouteIconHtml(info){
  const iconImage = info && typeof info.iconImage === "string" ? info.iconImage : "";
  const emoji = info && info.emoji ? info.emoji : "❔";

  if (iconImage) {
    return '<img src="' + escapeRrHtml(iconImage) + '" alt="" aria-hidden="true" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'is-fallback\');">';
  }

  return escapeRrHtml(emoji);
}

function rrRouteNodeHtml(node){
  const info = rrGetRouteNodeInfo(node);
  // 노드를 밟기만 하고 아직 클리어(completed)하지 않았다면 점수는 0으로 표시한다.
  const score = (node && node.completed && Number.isFinite(Number(node.score)))
    ? Number(node.score)
    : 0;

  return '<div class="rr-route-node">' +
    '<div class="rr-route-node-icon">' + rrRouteIconHtml(info) + '</div>' +
    '<div class="rr-route-node-label">' + escapeRrHtml(info.label) + '</div>' +
    '<div class="rr-route-node-score">+' + score + '</div>' +
  '</div>';
}

function rrItemIconHtml(icon){
  if (typeof icon === "string" && icon.indexOf("assets/") === 0) {
    return '<img src="' + escapeRrHtml(icon) + '" alt="" aria-hidden="true">';
  }
  return escapeRrHtml(icon || "❔");
}

function rrItemCardHtml(icon, name, count){
  const badge = count > 1 ? '<div class="rr-item-card-count">x' + count + '</div>' : '';
  return '<div class="rr-item-card" title="' + escapeRrHtml(name || "") + '">' +
    badge +
    '<div class="rr-item-card-icon">' + rrItemIconHtml(icon) + '</div>' +
    '<span class="sr-only rr-item-card-name">' + escapeRrHtml(name || "") + '</span>' +
  '</div>';
}

function rrDragWrapHtml(innerHtml, viewportClass){
  return '<div class="rr-drag-wrap">' +
    '<div class="rr-drag-scroll ' + viewportClass + '" data-rr-drag-scroll>' + innerHtml + '</div>' +
    '<div class="rr-fade rr-fade-left" aria-hidden="true"></div>' +
    '<div class="rr-fade rr-fade-right" aria-hidden="true"></div>' +
  '</div>';
}

function formatRrPlayTime(ms){
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const pad = n => String(n).padStart(2, "0");
  return pad(hh) + ":" + pad(mm) + ":" + pad(ss);
}

/* ── 가로 드래그 스크롤 (기획서 §10-3, §10-6) ───────────────────────────── */
function rrEnableDragScroll(container){
  if(!container || container.dataset.rrDragReady === "1") return;
  container.dataset.rrDragReady = "1";

  let dragging = false, moved = false, startX = 0, startScrollLeft = 0, pointerId = null;

  container.addEventListener("pointerdown", (event) => {
    if(container.scrollWidth <= container.clientWidth) return;
    dragging = true;
    moved = false;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = container.scrollLeft;
    container.classList.add("rr-dragging");
    container.setPointerCapture?.(pointerId);
  });
  container.addEventListener("pointermove", (event) => {
    if(!dragging) return;
    const diff = event.clientX - startX;
    if(Math.abs(diff) > 4) moved = true;
    container.scrollLeft = startScrollLeft - diff;
  });
  const stopDrag = (event) => {
    if(!dragging) return;
    dragging = false;
    container.classList.remove("rr-dragging");
    try{ container.releasePointerCapture?.(event.pointerId); }catch(error){}
  };
  container.addEventListener("pointerup", stopDrag);
  container.addEventListener("pointercancel", stopDrag);
  container.addEventListener("pointerleave", stopDrag);
  // 드래그 후 발생하는 click을 무시해 버튼 오작동을 막는다 (기획서 §10-8)
  container.addEventListener("click", (event) => {
    if(!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);
}

function rrInitDragScroll(root){
  if(!root) return;
  root.querySelectorAll("[data-rr-drag-scroll]").forEach(viewport => {
    rrEnableDragScroll(viewport);
    requestAnimationFrame(() => {
      const wrap = viewport.closest(".rr-drag-wrap");
      if(wrap) wrap.classList.toggle("rr-scrollable", viewport.scrollWidth > viewport.clientWidth + 1);
    });
  });
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

function escapeRrHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/* ── 스타일 ──────────────────────────────────────────────────────────────── */
function ensureRrStyles(){
  if(document.getElementById("runResultStyles")) return;

  const style = document.createElement("style");
  style.id = "runResultStyles";
  style.textContent =
    ".rr-overlay{position:absolute;inset:0;z-index:240;display:none;align-items:center;justify-content:center;cursor:pointer;background:transparent;}" +
    ".rr-overlay.show{display:flex;}" +
    /* 결과 연출은 전투 화면 위에 얹고, 뒤 전투 화면은 살짝 어둡게 눌러준다. */
    "body.result-ui-open .top-hud{z-index:30;}" +
    ".rr-backdrop{position:absolute;inset:0;background:rgba(8,10,16,.6);backdrop-filter:blur(4px);pointer-events:none;}" +
    ".rr-frame{position:relative;width:88%;height:76%;}" +
    ".rr-character-wrap{position:absolute;left:0%;bottom:-5%;width:50%;height:118%;z-index:2;" +
      "display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}" +
    ".rr-character-wrap img{width:100%;height:100%;object-fit:contain;object-position:bottom;" +
      "filter:drop-shadow(0 1.4cqh 2cqh rgba(0,0,0,.55)) drop-shadow(0 0 1.6cqh rgba(120,170,255,.4));}" +
    ".rr-character-wrap img.rr-defeat-dongjasin{width:88%;height:88%;}" +
    ".rr-character-wrap--victory{bottom:-11%;}" +
    ".rr-character-emoji{font-size:17cqh;line-height:1;filter:drop-shadow(0 0 1.6cqh rgba(120,170,255,.4));}" +
    ".rr-dialog-panel{position:absolute;left:37%;right:10%;top:24%;bottom:12%;z-index:1;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.8cqh;" +
      "padding:3cqh 3cqw;border-radius:1.6cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.2cqh rgba(0,0,0,.4);}" +
    ".rr-dialog-panel--defeat{left:30%;right:17%;}" +
    ".rr-badge{position:absolute;top:-3.8cqh;width:9cqh;height:9cqh;transform:rotate(45deg);" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.24cqh solid #e8c874;border-radius:.4cqh;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}" +
    ".rr-badge span{transform:rotate(-45deg);color:#fbe9c8;font-weight:900;font-size:2.2cqh;letter-spacing:.15cqh;white-space:nowrap;}" +
    ".rr-lines{text-align:center;color:#4a3524;}" +
    ".rr-lines--victory{width:55%;}" +
    ".rr-lines p{margin:0;font-weight:800;white-space:nowrap;word-break:keep-all;}" +
    ".rr-lines p:first-child{font-size:3.6cqh;margin-bottom:1.2cqh;color:#3a2814;}" +
    ".rr-lines p:not(:first-child){font-size:1.8cqh;color:#6b5236;line-height:1.5;}" +
    ".rr-divider{position:relative;width:60%;height:.16cqh;background:linear-gradient(90deg,transparent,rgba(180,140,80,.6),transparent);}" +
    ".rr-divider::after{content:'✦';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "background:#f2e3c3;padding:0 .8cqw;color:#b98a3c;font-size:1.4cqh;}" +
    ".rr-continue{font-size:1.5cqh;color:#a9793a;font-weight:800;letter-spacing:.1cqh;animation:rrPulse 1.6s ease-in-out infinite;}" +
    "@keyframes rrPulse{0%,100%{opacity:.5;}50%{opacity:1;}}" +

    /* 끝없는 여정 선택 패널 (기획서 §3-1) — 승리 연출과 동일한 rr-frame 크기를 공유한다 */
    ".rr-choice-panel{position:absolute;left:37%;right:10%;top:18%;bottom:12%;z-index:1;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.8cqh;" +
      "padding:4.2cqh 3cqw 2.6cqh;border-radius:1.6cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.2cqh rgba(0,0,0,.4);}" +
    ".rr-choice-titlebar{position:absolute;top:-3.4cqh;left:50%;transform:translateX(-50%);" +
      "padding:1cqh 3cqw;border-radius:1cqh;white-space:nowrap;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.22cqh solid #e8c874;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);}" +
    ".rr-choice-titlebar span{color:#fbe9c8;font-weight:900;font-size:2.2cqh;letter-spacing:.1cqh;}" +
    ".rr-choice-lines{text-align:center;color:#4a3524;flex:0 0 auto;}" +
    ".rr-choice-lines p{margin:0;font-weight:800;}" +
    ".rr-choice-lines p.rr-choice-line-main{font-size:3.6cqh;font-weight:800;color:#3a2814;margin-bottom:1.2cqh;}" +
    ".rr-choice-lines p:not(.rr-choice-line-main){font-size:1.8cqh;color:#6b5236;line-height:1.5;}" +
    ".rr-choice-cards{display:flex;gap:2cqw;width:100%;flex:1;min-height:0;}" +
    ".rr-choice-card{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7cqh;" +
      "padding:1.6cqh 1cqw;border-radius:1.2cqh;border:.16cqh solid rgba(150,110,60,.5);" +
      "background:linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,.08));text-align:center;}" +
    ".rr-choice-card-icon{font-size:4.4cqh;line-height:1;}" +
    ".rr-choice-card-title{font-size:1.6cqh;font-weight:900;color:#3a2814;}" +
    ".rr-choice-card-tag{font-size:1.05cqh;font-weight:800;color:#8a7350;background:rgba(120,100,70,.18);" +
      "padding:.2cqh .8cqw;border-radius:1cqh;}" +
    ".rr-choice-card-desc{font-size:1.15cqh;color:#7a6142;line-height:1.4;}" +
    ".rr-choice-card--disabled{opacity:.55;filter:grayscale(.5);cursor:not-allowed;}" +
    ".rr-choice-card--active{cursor:pointer;}" +
    ".rr-choice-card--active:hover{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.15));border-color:#cf5b52;}" +
    ".rr-choice-card--shake{animation:rrShake .35s ease-in-out;}" +
    "@keyframes rrShake{0%,100%{transform:translateX(0);}25%{transform:translateX(-.6cqw);}75%{transform:translateX(.6cqw);}}" +

    /* 전투 요약 화면 (기획서 §4-1, §10-1) — 캐릭터 없이 중앙 패널로 표시한다 */
    ".rr-summary-panel{position:absolute;left:50%;top:4%;bottom:1.5%;transform:translateX(-50%);" +
      "width:56%;min-width:44cqh;z-index:1;display:flex;flex-direction:column;align-items:center;" +
      "padding:4.4cqh 3.4cqw 2.4cqh;border-radius:1.8cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.4cqh rgba(0,0,0,.45);}" +
    ".rr-summary-titlebar{position:absolute;top:-3.6cqh;left:50%;transform:translateX(-50%);" +
      "padding:1.1cqh 3.6cqw;border-radius:1cqh;white-space:nowrap;" +
      "display:flex;align-items:center;justify-content:center;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.22cqh solid #e8c874;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);}" +
    ".rr-summary-titlebar span{color:#fbe9c8;font-weight:900;font-size:2.4cqh;letter-spacing:.15cqh;line-height:1;}" +
    ".rr-summary-rows{flex:1;width:100%;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:.8cqh;}" +
    ".rr-summary-row{display:flex;align-items:center;gap:1.2cqw;padding:.65cqh 0;" +
      "border-bottom:.14cqh dashed rgba(160,120,70,.4);}" +
    ".rr-summary-row:last-child{border-bottom:none;}" +
    ".rr-summary-row-icon{flex:0 0 auto;width:4.6cqh;text-align:center;font-size:3cqh;line-height:1;}" +
    ".rr-summary-row-label{flex:1;min-width:0;font-size:1.85cqh;font-weight:800;color:#4a3524;}" +
    ".rr-summary-row-sep{flex:0 0 auto;color:#c79a4a;font-size:1.3cqh;}" +
    ".rr-summary-row-value{flex:0 0 auto;display:flex;align-items:baseline;gap:.35cqw;justify-content:flex-end;min-width:7cqw;}" +
    ".rr-summary-row-value strong{font-size:2.6cqh;font-weight:900;color:#a5322a;}" +
    ".rr-summary-row-value span{font-size:1.3cqh;font-weight:800;color:#6b5236;}" +
    ".rr-summary-next{margin-top:1.4cqh;width:64%;padding:1.35cqh 0;border:.2cqh solid #e8c874;border-radius:2.6cqh;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);color:#fbe9c8;font-size:2.1cqh;font-weight:900;" +
      "letter-spacing:.15cqh;cursor:pointer;box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.4);}" +
    ".rr-summary-next:hover{filter:brightness(1.08);}" +

    /* 전투 상세 화면 (기획서 §4-2, §10-2) — 요약 화면과 동일하게 캐릭터 없이 중앙 패널로 표시한다 */
    ".rr-detail-panel{position:absolute;left:50%;top:13%;bottom:0.4%;transform:translateX(-50%);" +
      "width:82%;min-width:60cqh;max-width:98cqh;z-index:1;display:flex;flex-direction:column;" +
      "padding:4.6cqh 3cqw 1.8cqh;border-radius:1.8cqh;gap:1.1cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.4cqh rgba(0,0,0,.45);}" +
    ".rr-detail-titlebar{position:absolute;top:-2.4cqh;left:50%;transform:translateX(-50%);" +
      "display:flex;align-items:center;justify-content:center;" +
      "padding:1.1cqh 3.6cqw;border-radius:1cqh;white-space:nowrap;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.22cqh solid #e8c874;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);}" +
    ".rr-detail-titlebar span{color:#fbe9c8;font-weight:900;font-size:2.4cqh;letter-spacing:.15cqh;}" +
    ".rr-detail-section{display:flex;flex-direction:column;gap:.7cqh;min-height:0;}" +
    ".rr-detail-section-title{text-align:center;font-size:1.5cqh;font-weight:800;color:#8a6a3c;letter-spacing:.05cqh;margin-top:.9cqh;}" +
    ".rr-detail-section--tight .rr-detail-section-title{margin-top:0;}" +
    ".rr-detail-grid{flex:1;min-height:0;display:grid;grid-template-columns:30% 1fr;gap:1cqh 1.2cqw;}" +
    ".rr-detail-stack{display:flex;flex-direction:column;gap:1cqh;min-height:0;}" +
    ".rr-detail-stack .rr-detail-tile,.rr-detail-stack .rr-detail-section--tight{flex:1;min-height:0;}" +
    ".rr-detail-tile{display:flex;align-items:center;gap:1cqw;padding:.95cqh 1.1cqw;border-radius:1.2cqh;margin:0;" +
      "border:.16cqh solid rgba(150,110,60,.5);background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.1));" +
      "font:inherit;text-align:left;cursor:default;}" +
    "button.rr-detail-tile--button{cursor:pointer;}" +
    "button.rr-detail-tile--button:hover{border-color:#cf5b52;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.16));}" +
    ".rr-detail-tile-icon{flex:0 0 auto;width:4.6cqh;text-align:center;font-size:2.8cqh;line-height:1;}" +
    ".rr-detail-tile-body{min-width:0;display:flex;flex-direction:column;gap:.3cqh;}" +
    ".rr-detail-tile-label{font-size:1.35cqh;font-weight:800;color:#7a6142;}" +
    ".rr-detail-tile-value{font-size:2cqh;font-weight:900;color:#4a3524;}" +
    ".rr-detail-section--tight{border-radius:1.2cqh;border:.16cqh solid rgba(150,110,60,.4);" +
      "background:rgba(255,255,255,.22);padding:.9cqh 1cqw;}" +
    ".rr-detail-finish{width:100%;padding:1.25cqh 0;border:.2cqh solid #e8c874;border-radius:2.6cqh;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);color:#fbe9c8;font-size:1.9cqh;font-weight:900;" +
      "letter-spacing:.1cqh;cursor:pointer;box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.4);}" +
    ".rr-detail-finish:hover{filter:brightness(1.08);}" +

    /* 가로 드래그 스크롤 (기획서 §10-3~§10-6) */
    ".rr-drag-wrap{position:relative;min-height:0;flex:1;}" +
    ".rr-drag-scroll{height:100%;overflow-x:auto;overflow-y:hidden;cursor:grab;user-select:none;" +
      "-webkit-overflow-scrolling:touch;touch-action:pan-x;scrollbar-width:none;padding:.3cqh .2cqw;box-sizing:border-box;}" +
    ".rr-drag-scroll::-webkit-scrollbar{display:none;}" +
    ".rr-drag-scroll.rr-dragging{cursor:grabbing;}" +
    ".rr-fade{position:absolute;top:0;bottom:0;width:3cqh;pointer-events:none;opacity:0;transition:opacity .15s ease;}" +
    ".rr-fade-left{left:0;background:linear-gradient(90deg,#efe0bd,rgba(239,224,189,0));}" +
    ".rr-fade-right{right:0;background:linear-gradient(270deg,#efe0bd,rgba(239,224,189,0));}" +
    ".rr-drag-wrap.rr-scrollable .rr-fade{opacity:1;}" +
    ".rr-empty-text{width:100%;text-align:center;font-size:1.6cqh;font-weight:800;color:#8a7350;padding:.8cqh 0;}" +

    ".rr-route-viewport{display:flex;flex-wrap:nowrap;align-items:center;gap:.6cqw;}" +
    ".rr-route-node{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:.4cqh;width:7.6cqh;}" +
    ".rr-route-node-icon{width:5.6cqh;height:5.6cqh;border-radius:50%;display:grid;place-items:center;font-size:2.6cqh;" +
      "background:linear-gradient(160deg,#fff7d7,#f6e6bf);border:.16cqh solid rgba(150,110,60,.45);" +
      "box-shadow:0 .4cqh .9cqh rgba(0,0,0,.18);overflow:hidden;}" +
    ".rr-route-node-icon img{width:72%;height:72%;object-fit:contain;display:block;}" +
    ".rr-route-node-icon.is-fallback{font-size:2.4cqh;}" +
    ".rr-route-node-label{font-size:1.15cqh;font-weight:800;color:#5a4326;text-align:center;line-height:1.2;}" +
    ".rr-route-arrow{flex:0 0 auto;display:flex;align-items:center;justify-content:center;width:2.2cqh;color:#b98a3c;font-size:1.6cqh;font-weight:900;}" +

    ".rr-item-viewport{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:.9cqw;}" +
    ".rr-item-card{position:relative;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;gap:.35cqh;" +
      "width:7.4cqh;}" +
    ".rr-item-card-icon img{width:3.2cqh;height:3.2cqh;object-fit:contain;display:block;}" +
    ".rr-item-card-icon{width:5cqh;height:5cqh;border-radius:50%;display:grid;place-items:center;font-size:2.4cqh;" +
      "background:linear-gradient(160deg,#fff7d7,#f6e6bf);border:.16cqh solid rgba(150,110,60,.45);" +
      "box-shadow:0 .4cqh .9cqh rgba(0,0,0,.18);}" +
    ".rr-item-card-count{position:absolute;top:-.4cqh;right:.4cqh;min-width:2.2cqh;height:2.2cqh;padding:0 .3cqh;" +
      "border-radius:1.1cqh;background:#a5322a;color:#fbe9c8;font-size:1.1cqh;font-weight:900;" +
      "display:grid;place-items:center;box-shadow:0 .2cqh .5cqh rgba(0,0,0,.3);}" +

    /* ACT1 임시 점수 / 달빛조각 지급 예정 표시 (script.js 미연결 상태) */
    ".rr-score-notice{width:100%;margin:1cqh 0 0;padding:.8cqh 1cqw;border-radius:1cqh;" +
      "background:rgba(120,80,30,.12);border:.12cqh solid rgba(160,120,70,.35);" +
      "font-size:1.2cqh;font-weight:800;color:#7a6142;text-align:center;line-height:1.35;}" +

    ".rr-route-node-score{font-size:1.05cqh;font-weight:900;color:#a5322a;" +
      "background:rgba(207,91,82,.12);border:.1cqh solid rgba(207,91,82,.28);" +
      "padding:.12cqh .45cqw;border-radius:.8cqh;line-height:1.2;}" +

    ".rr-score-breakdown{border-radius:1.2cqh;border:.16cqh solid rgba(150,110,60,.4);" +
      "background:rgba(255,255,255,.22);padding:1cqh 1cqw;display:flex;flex-direction:column;gap:.8cqh;}" +

    ".rr-score-breakdown-title{text-align:center;font-size:1.45cqh;font-weight:900;color:#8a6a3c;}" +

    ".rr-score-breakdown-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.6cqh .8cqw;}" +

    ".rr-score-breakdown-grid div{display:flex;align-items:center;justify-content:space-between;gap:.6cqw;" +
      "padding:.55cqh .7cqw;border-radius:.8cqh;background:rgba(255,250,238,.65);" +
      "border:.1cqh solid rgba(160,120,70,.22);}" +

    ".rr-score-breakdown-grid span{font-size:1.05cqh;font-weight:800;color:#7a6142;}" +

    ".rr-score-breakdown-grid strong{font-size:1.2cqh;font-weight:900;color:#a5322a;}" +

    ".rr-score-reward-line{display:flex;align-items:center;justify-content:center;gap:1.2cqw;" +
      "font-size:1.45cqh;font-weight:900;color:#4a3524;}" +

    ".rr-score-reward-line strong{color:#a5322a;}" +

    ".rr-moon-claim-wrap{width:100%;margin:1.6cqh 0 1cqh;padding-top:1.4cqh;}" +

    ".rr-moon-claim-box{width:100%;display:flex;align-items:center;gap:.9cqw;" +
      "padding:1cqh 1.2cqw;border-radius:1.2cqh;" +
      "background:rgba(255,248,230,.82);border:.16cqh solid rgba(203,154,76,.58);}" +

    ".rr-moon-claim-box.is-claimed{opacity:.82;}" +

    ".rr-moon-claim-icon{flex:0 0 auto;font-size:2.1cqh;line-height:1;}" +

    ".rr-moon-claim-label{flex:1;min-width:0;font-size:1.5cqh;font-weight:900;color:#7a6142;}" +

    ".rr-moon-claim-count{flex:0 0 auto;font-size:2.1cqh;font-weight:900;color:#0e4e83;}" +

    ".rr-moon-claim-btn{min-width:7cqw;padding:.8cqh 1cqw;border-radius:1.1cqh;" +
      "border:.18cqh solid rgba(207,157,75,.8);background:linear-gradient(180deg,#fff8df,#ecd49b);" +
      "color:#0e4e83;font-size:1.45cqh;font-weight:900;cursor:pointer;" +
      "box-shadow:0 .35cqh .8cqh rgba(0,0,0,.2);}" +

    ".rr-moon-claim-btn:hover:not(:disabled){filter:brightness(1.05);}" +

    ".rr-moon-claim-btn:disabled{cursor:not-allowed;opacity:.55;filter:grayscale(.25);}";
  document.head.appendChild(style);
}
