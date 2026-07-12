"use strict";
/* =========================================================================
   여정 시스템 (mapSystem.js) – 5층 동적 맵
   - 1층: 일반 적, 2~4층: 일반 2회 + 엘리트 1회 (랜덤 배치), 5층: 보스
   - 여기서는 맵 데이터 생성/진행 상태만 다룬다. 실제 캔버스 렌더링/드래그
     스크롤/팝업 등 DOM 관련 코드는 mapUI.js에 있다(전역 함수 오버라이드
     방식이 아니라 이 파일에서 렌더링 함수를 아예 제거함 — 과거에는
     getViewBox/centerScrollOnFloor/setupDragScroll/buildOverlay/renderCanvas
     가 이 파일과 mapUI.js에 동일한 이름으로 중복 정의되어 있었고, 나중에
     로드되는 mapUI.js가 전역 함수를 덮어써서 이 파일의 정의는 항상
     죽은 코드였다. showNodePopup/removePopup은 아예 어디서도 호출되지
     않는 고아 함수였다. 유니티 이식 혼선을 막기 위해 정리했다).
   ========================================================================= */

/* ── 동적 여정 데이터 ──────────────────────────────────────────────────── */
let MAP_FLOORS    = [];
let MAP_PATHS     = [];
let MAP_STAGES    = [];
let POPUP_GETTERS = [];

/* mapUI.js가 SVG 렌더링에 쓰는 좌표/스크롤 상수·상태는 mapUI.js 소유.
   mapScrollY만 이 파일과 mapUI.js가 공유하는 진행 스크롤 상태다. */
let mapScrollY = 0;

/* ── 전역 진행 상태 ────────────────────────────────────────────────────── */
window.MAP_STATE = { currentStage: 0, proceedMode: false };

/* ── 유틸 ──────────────────────────────────────────────────────────────── */
function randInt(min, max){
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickMonsters(ids, data, count){
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length))
    .map(id => data.getMonsterById(id)).filter(Boolean);
}

function cloneMonsterList(list){
  return list.map(m => ({
    ...m,
    moves: Array.isArray(m.moves) ? m.moves.map(mv => ({ ...mv })) : []
  }));
}

/* ── 여정 생성 ──────────────────────────────────────────────────────────── */
function generateMap(){
  /* ACT1 노드 로직이 있으면 외부 생성 로직 사용 (mapNodeLogic.js) */
  if(typeof window.ACT1_MAP_GENERATE === "function"){
    window.ACT1_MAP_GENERATE(function(floors, paths, stages, popupGetters, dims){
      MAP_FLOORS    = floors;
      MAP_PATHS     = paths;
      MAP_STAGES    = stages;
      POPUP_GETTERS = popupGetters;
      mapScrollY = 0;
    });
    return;
  }

  const d = window.BOHYUN_COMBAT_DATA;
  if(!d || !d.monsterGroups) return;

  const normalIds = d.monsterGroups.normal || [];
  const eliteIds  = d.monsterGroups.elite  || [];
  const bossIds   = d.monsterGroups.boss   || [];

  // 층별 노드 수: 1층=1, 2~4층=2~4, 5층=1(보스)
  const nodeCounts = [
    1,
    randInt(2, 4),
    randInt(2, 4),
    randInt(2, 4),
    1
  ];

  // 2~4층의 모든 노드 중 랜덤으로 1~3개를 엘리트로 지정
  const candidateNodes = [];
  for(let fi = 2; fi <= 4; fi++){
    for(let ni = 0; ni < nodeCounts[fi - 1]; ni++){
      candidateNodes.push(`${fi},${ni}`);
    }
  }
  const eliteNodes = new Set(
    candidateNodes.sort(() => Math.random() - 0.5).slice(0, randInt(1, 3))
  );

  MAP_FLOORS    = [];
  MAP_PATHS     = [];
  MAP_STAGES    = [];
  POPUP_GETTERS = [];

  // Floor 0: 로비
  MAP_FLOORS.push([{ id:"start", type:"start", emoji:"🚪", label:"로비" }]);

  let stageIdx = 0;

  for(let fi = 1; fi <= 5; fi++){
    const count = nodeCounts[fi - 1];
    const floorNodes = [];

    for(let ni = 0; ni < count; ni++){
      let type, emoji, label, monsters;

      if(fi === 1){
        type = "enemy"; emoji = "👺"; label = "미련이 느껴지는 곳";
        monsters = pickMonsters(normalIds, d, randInt(1, 2));
      } else if(fi === 5){
        type = "boss"; emoji = "💀"; label = "기운이 엄청 무거운 곳";
        monsters = bossIds.map(id => d.getMonsterById(id)).filter(Boolean);
      } else {
        const isElite = eliteNodes.has(`${fi},${ni}`);
        if(isElite){
          type = "elite"; emoji = "👹"; label = "기운이 더 무거워 보이는 곳";
          monsters = pickMonsters(eliteIds, d, 1);
        } else {
          type = "enemy"; emoji = "👺"; label = "미련이 느껴지는 곳";
          monsters = pickMonsters(normalIds, d, randInt(1, 2));
        }
      }

      // 폴백: 몬스터가 없으면 일반 몬스터 1마리
      if(!monsters || !monsters.length) monsters = pickMonsters(normalIds, d, 1);

      const nodeId =
        fi === 1 ? "enemy_1" :
        fi === 5 ? "boss_5"  :
        `node_${fi}_${ni}`;

      const stageLabel =
        fi === 5 ? `${fi}층 기운이 엄청 무거운 곳` :
        type === "elite" ? `${fi}층 기운이 더 무거워 보이는 곳` :
        `${fi}층 미련이 느껴지는 곳 ${"ABCD"[ni] || (ni + 1)}`;

      const stageMons = monsters.slice();

      MAP_STAGES.push({
        label: stageLabel,
        type,
        getMonsters: (function(m){ return () => cloneMonsterList(m); })(stageMons),
      });
      POPUP_GETTERS.push((function(m){ return () => m; })(stageMons));

      floorNodes.push({ id:nodeId, type, emoji, label, stageIndex:stageIdx++ });
    }

    MAP_FLOORS.push(floorNodes);
  }

  // 층 간 경로 생성
  for(let fi = 0; fi < MAP_FLOORS.length - 1; fi++){
    MAP_PATHS.push(...buildFloorPaths(fi, MAP_FLOORS[fi].length, MAP_FLOORS[fi + 1].length));
  }

  mapScrollY = 0;
}

function buildFloorPaths(fi, fromCount, toCount){
  const paths = [], seen = new Set();

  const add = (ni, ti) => {
    const key = `${ni}:${ti}`;
    if(!seen.has(key)){ seen.add(key); paths.push([[fi, ni], [fi + 1, ti]]); }
  };

  // 각 from-노드를 비례 to-노드에 연결, 40% 확률로 인접 노드에도 연결
  for(let ni = 0; ni < fromCount; ni++){
    const ti = Math.min(Math.floor(ni * toCount / fromCount), toCount - 1);
    add(ni, ti);
    if(toCount > 1 && Math.random() < 0.45){
      const adj = ti < toCount - 1 ? ti + 1 : ti - 1;
      if(adj !== ti) add(ni, adj);
    }
  }

  // 연결 안 된 to-노드 보장 (모든 노드 도달 가능)
  const reached = new Set(paths.map(p => p[1][1]));
  for(let ti = 0; ti < toCount; ti++){
    if(!reached.has(ti)){
      add(Math.min(Math.floor(ti * fromCount / toCount), fromCount - 1), ti);
    }
  }

  return paths;
}

/* ── 보조 함수 ─────────────────────────────────────────────────────────── */
function nodeFloorIdx(id){
  return MAP_FLOORS.findIndex(f => f.some(n => n.id === id));
}

function getCurrentNodeId(){
  if(window.MAP_STATE.currentStage < 0) return "start";
  for(const f of MAP_FLOORS) for(const n of f){
    if(n.stageIndex === window.MAP_STATE.currentStage) return n.id;
  }
  return MAP_FLOORS[1]?.[0]?.id || "start";
}

function hasNextTier(){
  const myFloor = nodeFloorIdx(getCurrentNodeId());
  return MAP_FLOORS.some((f, fi) =>
    fi > myFloor && f.some(n => n.stageIndex !== undefined)
  );
}

function getCurrentLabel(nodeId){
  for(const f of MAP_FLOORS) for(const n of f){
    if(n.id !== nodeId) continue;
    if(n.stageIndex !== undefined && MAP_STAGES[n.stageIndex])
      return MAP_STAGES[n.stageIndex].label;
    return n.label;
  }
  return "";
}

/* ── 몬스터 배열 in-place 교체 ────────────────────────────────────────── */
function loadStageMonsters(idx, options={}){
  const d = window.BOHYUN_COMBAT_DATA;
  if(!d || !d.monsters) return;
  if(!d._orig) d._orig = [...d.monsters];
  if(MAP_STAGES[idx]){
    if(typeof window.ACT1_RESOLVE_STAGE_PACKAGE === "function"){
      window.ACT1_RESOLVE_STAGE_PACKAGE(MAP_STAGES[idx], { recordHistory:!!options.recordHistory });
    }
    d.monsters.splice(0, d.monsters.length, ...MAP_STAGES[idx].getMonsters());
  }
}

/* ── 스테이지 시작 ─────────────────────────────────────────────────────── */
function startStage(stageIdx){
  /* 딤드 노드(이벤트/상점/휴식): 자동 통과 처리 (기획서 9-2) */
  if(MAP_STAGES[stageIdx] && MAP_STAGES[stageIdx].isDimmed){
    window.MAP_STATE.currentStage = stageIdx;
    window.MAP_STATE.proceedMode  = true;
    window.MAP_STATE.startMapMode = false;
    updateHudFloor();
    console.log("[ACT1] 딤드 노드 자동 통과:", MAP_STAGES[stageIdx].label);
    /* 맵 캔버스 현재 위치 갱신 (이미 열린 맵 오버레이 내에서 리렌더) */
    renderCanvas(getCurrentNodeId());
    const footer = document.getElementById("mapFooter");
    if(footer) footer.textContent = "⬆️ 다음 구역을 클릭하여 진행하세요";
    return;
  }

  window.MAP_STATE.currentStage = stageIdx;
  window.MAP_STATE.proceedMode  = false;
  window.MAP_STATE.startMapMode = false;
  loadStageMonsters(stageIdx, { recordHistory:true });
  updateHudFloor();
  closeMap();
  if(typeof newGame === "function") newGame();
}

/* ── 여정 열기/닫기 ────────────────────────────────────────────────────── */
function openMap(){
  if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
  /* 여정 오버레이는 반투명이라 뒤에 마지막 노드의 최종 화면이 비쳐야 한다.
     배경을 여기서 미리 지우면 오버레이가 빈 화면 위로 뜨게 되므로,
     실제로 다음 스테이지에 진입할 때(startStage)만 배경을 갱신/제거한다. */
  let ov = document.getElementById("mapOverlay");
  if(!ov){ ov = buildOverlay(); document.getElementById("game").appendChild(ov); }
  const isStartMap = window.MAP_STATE && window.MAP_STATE.startMapMode && window.MAP_STATE.currentStage < 0;
  ov.classList.toggle("start-map-mode", !!isStartMap);
  const fi = nodeFloorIdx(getCurrentNodeId());
  if(fi >= 0) centerScrollOnFloor(fi);
  renderCanvas(getCurrentNodeId());
  ov.style.display = "grid";
  if(typeof window.renderDepthButtonState === "function") window.renderDepthButtonState();
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = "1"; }));
}

function closeMap(){
  if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
  if(typeof window.closeDepthDropdown === "function") window.closeDepthDropdown();
  const ov = document.getElementById("mapOverlay"); if(!ov) return;
  const returnToStart = window.MAP_STATE && window.MAP_STATE.startMapMode && window.MAP_STATE.currentStage < 0;
  ov.style.opacity = "0";
  setTimeout(() => {
    if(ov.parentNode) ov.remove();
    if(returnToStart){
      window.MAP_STATE.startMapMode = false;
      window.MAP_STATE.proceedMode = false;
      const startScreen = document.getElementById("startScreen");
      if(startScreen) startScreen.classList.remove("hidden");
      if(typeof updateContinueButtonInfo === "function") updateContinueButtonInfo();
    }
  }, 280);
}

/* ── 초기화 ─────────────────────────────────────────────────────────────── */
(function init(){
  function setup(){
    const d = window.BOHYUN_COMBAT_DATA;
    if(d && d.monsters && !d._orig) d._orig = [...d.monsters];

    // 맵 생성 및 1층 몬스터로 게임 시작
    generateMap();
    loadStageMonsters(0);

    document.querySelectorAll(".hud-btn").forEach(btn => {
      if(btn.textContent.includes("여정") && !btn.dataset.mapBound){
        btn.dataset.mapBound = "1";
        btn.addEventListener("click", openMap);
      }
    });
    setupWinInterception();
    updateHudFloor();
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
