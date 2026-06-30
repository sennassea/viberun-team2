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
  late_high:  { enemy: 25, elite:  0, event:  5, shop: 35, rest: 35 }, // 14~15층
};

/* ── 노드 표시 정보 ────────────────────────────────────────────────────── */
const ACT1_NODE_INFO = {
  lobby: { emoji: "🚪", label: "로비",   isDimmed: true  },
  enemy: { emoji: "👺", label: "적",     isDimmed: false },
  elite: { emoji: "👹", label: "엘리트", isDimmed: false },
  boss:  { emoji: "💀", label: "보스",   isDimmed: false },
  event: { emoji: "❓", label: "이벤트", isDimmed: true  },
  shop:  { emoji: "🛒", label: "상점",   isDimmed: true  },
  rest:  { emoji: "🛖", label: "휴식",   isDimmed: true  },
};

/* ── 딤드 노드 툴팁 (기획서 8장) ─────────────────────────────────────── */
const ACT1_DIMMED_TOOLTIPS = {
  lobby: "로비 노드 - 현재 테스트 빌드에서는 로비 기능이 준비 중입니다. 새 게임 시작 시 자동으로 건너뜁니다.",
  event: "이벤트 노드 - 현재 테스트 빌드에서는 이벤트 기능이 준비 중입니다. 선택 시 자동으로 통과됩니다.",
  shop:  "상점 노드 - 현재 테스트 빌드에서는 상점 기능이 준비 중입니다. 선택 시 자동으로 통과됩니다.",
  rest:  "휴식 노드 - 현재 테스트 빌드에서는 휴식 기능이 준비 중입니다. 선택 시 자동으로 통과됩니다.",
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
  const eliteIds  = (d.monsterGroups && d.monsterGroups.elite)  || [];
  const bossIds   = (d.monsterGroups && d.monsterGroups.boss)   || [];

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

  let stageIdx = 0;

  /* ── Floor 0: 로비 (딤드 / 자동 스킵 / stageIndex 없음) ── */
  floors.push([{
    id: "lobby_0", type: "lobby",
    emoji: "🚪", label: "로비",
    isDimmed: true, isAutoSkip: true,
  }]);

  /* ── Floors 1~15: 구간별 가중치 배치 ── */
  for (let fi = 1; fi <= ACT1_TOTAL_FLOORS; fi++) {
    const floorNodes = [];
    const nodeCount  = fi === 1 ? 1 : act1RandInt(2, ACT1_MAX_NODES);
    const weights    = act1GetWeights(fi);

    /* 타입 배정 */
    const types = [];
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
    /* 보정 3 (기획서 12-1): 14~15층 정비 노드(휴식/상점) 없으면 마지막을 정비로 */
    if (fi >= 14 && !types.some(t => t === "rest" || t === "shop")) {
      types[types.length - 1] = Math.random() < 0.5 ? "rest" : "shop";
    }

    /* 노드 생성 */
    for (let ni = 0; ni < types.length; ni++) {
      const type = types[ni];
      const info = ACT1_NODE_INFO[type];
      const nodeId = `node_${fi}_${ni}`;

      if (!info.isDimmed) {
        /* 구현된 전투 노드 (enemy / elite) */
        let mons;
        if (type === "elite") {
          mons = pickMons(eliteIds, 1);
          if (!mons.length) mons = pickMons(normalIds, 1);
        } else {
          mons = pickMons(normalIds, act1RandInt(1, 2));
        }
        if (!mons.length) mons = pickMons(normalIds, 1);
        const ms  = mons.slice();
        const lbl = type === "elite"
          ? `${fi}층 엘리트`
          : `${fi}층 적 ${"ABCD"[ni] || (ni + 1)}`;
        stages.push({
          label: lbl, type, isDimmed: false,
          getMonsters: (m => () => cloneMons(m))(ms),
        });
        popupGetters.push((m => () => m)(ms));
      } else {
        /* 딤드 노드 (event / shop / rest): 전투 없음 */
        stages.push({
          label: `${fi}층 ${info.label}`, type, isDimmed: true,
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

  /* ── Boss Floor (16번째) ── */
  const bossMs = bossIds.length
    ? bossIds.map(id => d.getMonsterById(id)).filter(Boolean)
    : pickMons(normalIds, 1);
  if (!bossMs.length) bossMs.push(...pickMons(normalIds, 1));
  stages.push({
    label: "보스 스테이지", type: "boss", isDimmed: false,
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
