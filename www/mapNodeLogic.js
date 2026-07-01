"use strict";
/* =========================================================================
   ACT 1 노드 출현 로직 (mapNodeLogic.js)
   기획서: 노드 출현 로직 구현 세부 기획서 - 로비 포함 딤드 테스트 빌드

   이 파일은 mapSystem.js / script.js 이후에 로드되어야 합니다.
   기존 코드를 직접 수정하지 않고 window 훅을 통해 통합합니다.
   ========================================================================= */

const ACT1_TOTAL_FLOORS      = 15;
const ACT1_MAX_NODES         = 4;
const ACT1_MAP_FULL_H        = 2000; // 17개 층(로비+15층+보스)을 위한 맵 높이

/* ── 구간별 노드 출현 가중치 (기획서 11장) ─────────────────────────────── */
const ACT1_WEIGHTS = {
  early_low:  { enemy: 65, elite:  0, event: 25, shop: 10, rest:  0 }, // 1~3층
  early_high: { enemy: 50, elite: 15, event: 15, shop:  5, rest: 15 }, // 4~5층
  mid:        { enemy: 40, elite: 15, event: 20, shop: 15, rest: 10 }, // 6~10층
  late_low:   { enemy: 40, elite: 15, event: 20, shop: 10, rest: 15 }, // 11~13층
  late_high:  { enemy: 25, elite:  0, event:  5, shop: 35, rest: 35 }, // 14층 (15층은 휴식 전용 고정으로 이 가중치를 사용하지 않음)
};

/* ── 노드 표시 정보 ─────────────────────────────────────────────────────
   isDimmed  : 아직 구현되지 않아 맵에서 흐리게 표시하고 자동 통과시킬지 여부
   hasCombat : 맵 생성 시 전투 패키지(몬스터)를 배정해야 하는 노드인지 여부
   ── ──────────────────────────────────────────────────────────────────── */
const ACT1_NODE_INFO = {
  lobby: { emoji: "🚪", label: "로비",   isDimmed: true,  hasCombat: false },
  enemy: { emoji: "👺", label: "적",     isDimmed: false, hasCombat: true  },
  elite: { emoji: "👹", label: "엘리트", isDimmed: false, hasCombat: true  },
  boss:  { emoji: "💀", label: "보스",   isDimmed: false, hasCombat: true  },
  event: { emoji: "❓", label: "이벤트", isDimmed: true,  hasCombat: false },
  shop:  { emoji: "🛒", label: "상점",   isDimmed: true,  hasCombat: false },
  rest:  { emoji: "🛖", label: "기도터", isDimmed: false, hasCombat: false },
};

/* ── 딤드 노드 툴팁 (기획서 8장) ─────────────────────────────────────── */
const ACT1_DIMMED_TOOLTIPS = {
  lobby: "로비 노드 - 현재 테스트 빌드에서는 로비 기능이 준비 중입니다. 새 게임 시작 시 자동으로 건너뜁니다.",
  event: "이벤트 노드 - 현재 테스트 빌드에서는 이벤트 기능이 준비 중입니다. 선택 시 자동으로 통과됩니다.",
  shop:  "상점 노드 - 현재 테스트 빌드에서는 상점 기능이 준비 중입니다. 선택 시 자동으로 통과됩니다.",
};

/* ── 유틸 ──────────────────────────────────────────────────────────────── */
function act1RandInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function act1GetWeights(floor) {
  if (floor <= 3)  return ACT1_WEIGHTS.early_low;
  if (floor <= 5)  return ACT1_WEIGHTS.early_high;
  if (floor <= 10) return ACT1_WEIGHTS.mid;
  if (floor <= 13) return ACT1_WEIGHTS.late_low;
  return ACT1_WEIGHTS.late_high;
}

function act1WeightedPick(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0) return "enemy";
  let r = Math.random() * total;
  for (const [type, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return type;
  }
  return "enemy";
}

/* ── 층간 경로 생성 (mapSystem.js buildFloorPaths와 동일 로직) ─────────── */
function act1BuildFloorPaths(fi, fromCount, toCount) {
  const paths = [], seen = new Set();
  const add = (ni, ti) => {
    const key = `${ni}:${ti}`;
    if (!seen.has(key)) { seen.add(key); paths.push([[fi, ni], [fi + 1, ti]]); }
  };
  for (let ni = 0; ni < fromCount; ni++) {
    const ti = Math.min(Math.floor(ni * toCount / fromCount), toCount - 1);
    add(ni, ti);
    if (toCount > 1 && Math.random() < 0.45) {
      const adj = ti < toCount - 1 ? ti + 1 : ti - 1;
      if (adj !== ti) add(ni, adj);
    }
  }
  const reached = new Set(paths.map(p => p[1][1]));
  for (let ti = 0; ti < toCount; ti++) {
    if (!reached.has(ti)) {
      add(Math.min(Math.floor(ti * fromCount / toCount), fromCount - 1), ti);
    }
  }
  return paths;
}

/* ── ACT1 맵 생성 (mapSystem.js generateMap() 훅으로 호출됨) ──────────── */
window.ACT1_MAP_GENERATE = function(setMapData) {
  const d = window.BOHYUN_COMBAT_DATA;
  if (!d) { console.warn("[ACT1] BOHYUN_COMBAT_DATA 없음"); return; }

  const floors = [], paths = [], stages = [], popupGetters = [];
  const normalIds = (d.monsterGroups && d.monsterGroups.normal) || [];

  function pickMons(ids, count) {
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length))
      .map(id => d.getMonsterById(id)).filter(Boolean);
  }
  function cloneMons(list) {
    return list.map(m => ({
      ...m,
      moves: Array.isArray(m.moves) ? m.moves.map(mv => ({ ...mv })) : []
    }));
  }

  /* 패키지로 몬스터 목록 반환, 실패 시 폴백 */
  function getMonsFromPackage(pkg, type) {
    if (!pkg) return null;
    const mons = d.getMonstersByIds(pkg.monsterIds);
    return mons.length ? mons : null;
  }

  let stageIdx = 0;
  /* 이번 맵 생성에서 사용한 패키지 ID 추적 */
  const usedPkgIds = new Set();

  /* 휴식 노드 연속 출현 방지를 위한 추적 변수
     - prevFloorHasRest: 직전 층에 휴식 노드가 있었는지 (있었다면 이번 층은 휴식 후보 제외) */
  let prevFloorHasRest = false;

  /* ── Floor 0: 로비 (딤드 / 자동 스킵 / stageIndex 없음) ── */
  floors.push([{
    id: "lobby_0", type: "lobby",
    emoji: "🚪", label: "로비",
    isDimmed: true, isAutoSkip: true,
  }]);

  /* ── Floors 1~15: 구간별 가중치 배치 ── */
  for (let fi = 1; fi <= ACT1_TOTAL_FLOORS; fi++) {
    const floorNodes = [];

    /* 15층(보스 직전): 확률 테이블을 사용하지 않고 휴식 전용층으로 강제 지정
       (기획서 v2 6장 "15층 휴식 전용 규칙" - 노드 타입 고정 / 랜덤 배치 제외 / 1~2개 권장) */
    const isRestOnlyFloor = fi === ACT1_TOTAL_FLOORS;
    /* 14층: 다음 층(15층)이 항상 휴식이므로, 휴식 연속 출현 방지를 위해 이 층은 휴식 후보에서 제외 */
    const isFloorBeforeFinalRest = fi === ACT1_TOTAL_FLOORS - 1;

    let types;
    if (isRestOnlyFloor) {
      const nodeCount = act1RandInt(1, 2);
      types = Array(nodeCount).fill("rest");
    } else {
      const nodeCount = fi === 1 ? 1 : act1RandInt(2, ACT1_MAX_NODES);
      const weights   = { ...act1GetWeights(fi) };

      /* 휴식 노드 연속 출현 방지: 직전 층에 휴식이 있었거나, 다음 층이 항상 휴식인 14층이면
         이번 층의 휴식 가중치를 0으로 만들어 후보에서 제외한다. */
      if (prevFloorHasRest || isFloorBeforeFinalRest) weights.rest = 0;

      /* 타입 배정 */
      types = [];
      for (let ni = 0; ni < nodeCount; ni++) {
        types.push(fi === 1 ? "enemy" : act1WeightedPick(weights));
      }

      /* 보정 1 (기획서 12-1): 13층 이하 전투 노드 없으면 첫 노드를 enemy로 */
      if (fi <= 13 && !types.some(t => t === "enemy" || t === "elite")) {
        types[0] = "enemy";
      }
      /* 보정 2 (기획서 12-2): 같은 층 엘리트 2개 이상이면 1개만 유지 */
      const eliteCnt = types.filter(t => t === "elite").length;
      if (eliteCnt > 1) {
        let replaced = 0;
        for (let i = 0; i < types.length && replaced < eliteCnt - 1; i++) {
          if (types[i] === "elite") { types[i] = "enemy"; replaced++; }
        }
      }
      /* 보정 3 (기획서 v2 5-3): 14층까지 정비 노드(상점) 없으면 마지막을 상점으로
         (14층은 휴식 후보에서 제외되므로 정비 노드는 상점만 사용) */
      if (isFloorBeforeFinalRest && !types.some(t => t === "shop")) {
        types[types.length - 1] = "shop";
      }
    }

    /* 다음 층 계산을 위해 이번 층의 휴식 출현 여부 기록 */
    prevFloorHasRest = types.includes("rest");

    /* 노드 생성 */
    for (let ni = 0; ni < types.length; ni++) {
      const type = types[ni];
      const info = ACT1_NODE_INFO[type];
      const nodeId = `node_${fi}_${ni}`;

      if (info.hasCombat) {
        /* 전투 노드: 패키지 선택 → 몬스터 로드 */
        const pkg = typeof window.ACT1_PICK_PACKAGE === "function"
          ? window.ACT1_PICK_PACKAGE(type, fi, usedPkgIds)
          : null;

        let mons = getMonsFromPackage(pkg, type);
        /* 폴백: 패키지 없으면 기존 방식 */
        if (!mons || !mons.length) {
          mons = pickMons(normalIds, act1RandInt(1, 2));
        }
        if (!mons.length) mons = pickMons(normalIds, 1);

        const ms  = mons.slice();
        const lbl = type === "elite"
          ? `${fi}층 엘리트`
          : `${fi}층 적 ${"ABCD"[ni] || (ni + 1)}`;
        stages.push({
          label: lbl, type, isDimmed: info.isDimmed,
          packageId: pkg ? pkg.id : null,
          getMonsters: (m => () => cloneMons(m))(ms),
        });
        popupGetters.push((m => () => m)(ms));
      } else {
        /* 전투 없는 노드 (event / shop / rest): 몬스터 없음 */
        stages.push({
          label: `${fi}층 ${info.label}`, type, isDimmed: info.isDimmed,
          packageId: null,
          getMonsters: null,
        });
        popupGetters.push(() => []);
      }

      floorNodes.push({
        id: nodeId, type,
        emoji: info.emoji, label: info.label,
        isDimmed: info.isDimmed,
        stageIndex: stageIdx++,
      });
    }
    floors.push(floorNodes);
  }

  /* ── 1~10층 휴식 노드 최소 1개 보장 검사 (기획서 v3 6장) ─────────────────
     맵 생성 후 1~10층에 휴식 노드가 0개면, 10→8→6→5→4층 순으로 전환 후보를
     찾아 그중 1개 노드를 휴식으로 전환한다. 1층 일반 전투는 전환 대상에서
     제외한다. 강제 통과 노드가 아니라 선택 가능한 노드 중 하나를 휴식으로
     바꾸는 것이므로, 전투 노드보다 이벤트/상점 노드를 우선 전환 대상으로
     삼아 해당 층의 전투 보상 흐름을 최대한 보존한다. */
  const hasRestIn1to10 = floors.slice(1, 11).some(floorNodes =>
    floorNodes.some(n => n.type === "rest")
  );
  if (!hasRestIn1to10) {
    const REST_GUARANTEE_FLOOR_ORDER = [10, 8, 6, 5, 4];
    for (const floorNum of REST_GUARANTEE_FLOOR_ORDER) {
      const floorNodes = floors[floorNum];
      if (!floorNodes) continue;

      const combatIdxs = [];
      const nonCombatIdxs = [];
      floorNodes.forEach((n, idx) => {
        if (n.type === "enemy" || n.type === "elite") combatIdxs.push(idx);
        else if (n.type !== "rest") nonCombatIdxs.push(idx);
      });

      /* 이벤트/상점 노드 우선 전환, 없으면 전투 노드가 2개 이상일 때만
         그중 1개를 전환 (해당 층의 유일한 전투 노드는 보존) */
      let targetIdx = nonCombatIdxs.length
        ? nonCombatIdxs[nonCombatIdxs.length - 1]
        : (combatIdxs.length > 1 ? combatIdxs[combatIdxs.length - 1] : null);
      if (targetIdx === null) continue;

      const node = floorNodes[targetIdx];
      const info = ACT1_NODE_INFO.rest;
      node.type = "rest";
      node.emoji = info.emoji;
      node.label = info.label;
      node.isDimmed = info.isDimmed;

      const stage = stages[node.stageIndex];
      stage.label = `${floorNum}층 ${info.label}`;
      stage.type = "rest";
      stage.isDimmed = info.isDimmed;
      stage.packageId = null;
      stage.getMonsters = null;
      popupGetters[node.stageIndex] = () => [];

      break;
    }
  }

  /* ── Boss Floor (16번째): 보스 패키지에서 1개 선택 ── */
  const bossPkg = typeof window.ACT1_PICK_PACKAGE === "function"
    ? window.ACT1_PICK_PACKAGE("boss", 16, usedPkgIds)
    : null;
  let bossMs = bossPkg ? d.getMonstersByIds(bossPkg.monsterIds) : [];
  if (!bossMs.length) bossMs = pickMons(normalIds, 1);
  stages.push({
    label: "보스 스테이지", type: "boss", isDimmed: false,
    packageId: bossPkg ? bossPkg.id : null,
    getMonsters: (m => () => cloneMons(m))(bossMs.slice()),
  });
  popupGetters.push((m => () => m)(bossMs.slice()));
  floors.push([{
    id: "boss_final", type: "boss",
    emoji: "💀", label: "보스",
    isDimmed: false, stageIndex: stageIdx++,
  }]);

  /* ── 층간 경로 생성 ── */
  for (let fi = 0; fi < floors.length - 1; fi++) {
    paths.push(...act1BuildFloorPaths(fi, floors[fi].length, floors[fi + 1].length));
  }

  /* ── 데이터 주입 ── */
  setMapData(floors, paths, stages, popupGetters, { mapFullH: ACT1_MAP_FULL_H });
  /* 전투 로직에서 스테이지 타입·패키지 참조용으로 전역 노출 */
  window.ACT1_MAP_STAGES = stages;
  console.log(`[ACT1] 맵 생성 완료: ${floors.length}층 (로비+${ACT1_TOTAL_FLOORS}층+보스), ${stages.length}스테이지`);
};

/* ── 새 게임 시작: 로비 자동 스킵 → 1층 전투 즉시 진입 ────────────────── */
window.ACT1_START_NEW_GAME = function() {
  try { localStorage.removeItem("viberunSaveState"); } catch (e) {}

  /* ACT1 15층 맵 생성 */
  if (typeof generateMap === "function") generateMap();

  if (window.MAP_STATE) {
    window.MAP_STATE.currentStage = 0;
    window.MAP_STATE.proceedMode  = false;
    window.MAP_STATE.startMapMode = false;
  }

  /* 시작 화면 숨기기 */
  const startScreen = document.getElementById("startScreen");
  if (startScreen) startScreen.classList.add("hidden");
  if (typeof updateContinueButtonInfo === "function") updateContinueButtonInfo();

  /* 로비 자동 스킵 로그 */
  console.log("[ACT1] 로비 자동 스킵 → 1스테이지 전투 즉시 진입");

  /* 1층 일반 전투(stageIndex=0) 즉시 시작 */
  if (typeof startStage === "function") startStage(0);
};
