"use strict";
/* =========================================================================
   병원 지도 시스템 (mapSystem.js) – 5층 동적 맵
   - 1층: 일반 적, 2~4층: 일반 2회 + 엘리트 1회 (랜덤 배치), 5층: 보스
   - 드래그로 스크롤 가능한 SVG 지도
   ========================================================================= */

/* ── SVG 좌표 상수 ─────────────────────────────────────────────────────── */
const MAP_W          = 360;
let   MAP_FULL_H     = 980;
const MAP_VIEW_H     = 480;
let   MAP_MAX_SCROLL = MAP_FULL_H - MAP_VIEW_H;  // 500
const PT = 80, PB = 60, PX = 65;                  // top/bottom/x 패딩

let mapScrollY = 0;  // 0=하단(입구) → MAP_MAX_SCROLL=상단(보스)

function getViewBox(){
  const s = Math.max(0, Math.min(MAP_MAX_SCROLL, mapScrollY));
  return `0 ${MAP_FULL_H - MAP_VIEW_H - s} ${MAP_W} ${MAP_VIEW_H}`;
}

/* ── 동적 지도 데이터 ──────────────────────────────────────────────────── */
let MAP_FLOORS    = [];
let MAP_PATHS     = [];
let MAP_STAGES    = [];
let POPUP_GETTERS = [];

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

/* ── 지도 생성 ──────────────────────────────────────────────────────────── */
function generateMap(){
  /* ACT1 노드 로직이 있으면 외부 생성 로직 사용 (mapNodeLogic.js) */
  if(typeof window.ACT1_MAP_GENERATE === "function"){
    window.ACT1_MAP_GENERATE(function(floors, paths, stages, popupGetters, dims){
      MAP_FLOORS    = floors;
      MAP_PATHS     = paths;
      MAP_STAGES    = stages;
      POPUP_GETTERS = popupGetters;
      if(dims && dims.mapFullH){ MAP_FULL_H = dims.mapFullH; MAP_MAX_SCROLL = MAP_FULL_H - MAP_VIEW_H; }
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
        type = "enemy"; emoji = "👺"; label = "적";
        monsters = pickMonsters(normalIds, d, randInt(1, 2));
      } else if(fi === 5){
        type = "boss"; emoji = "💀"; label = "보스";
        monsters = bossIds.map(id => d.getMonsterById(id)).filter(Boolean);
      } else {
        const isElite = eliteNodes.has(`${fi},${ni}`);
        if(isElite){
          type = "elite"; emoji = "👹"; label = "엘리트";
          monsters = pickMonsters(eliteIds, d, 1);
        } else {
          type = "enemy"; emoji = "👺"; label = "적";
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
        fi === 5 ? "보스 스테이지" :
        type === "elite" ? `${fi}층 엘리트` :
        `${fi}층 적 ${"ABCD"[ni] || (ni + 1)}`;

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

function updateHudFloor(){
  const el = document.getElementById("hudFloor"); if(!el) return;
  const fi = nodeFloorIdx(getCurrentNodeId());
  el.textContent = fi > 0 ? fi + "F" : "1F";
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

// 현재 층이 화면 중앙에 오도록 스크롤 오프셋 계산
function centerScrollOnFloor(fi){
  const floorN = MAP_FLOORS.length;
  const useH   = MAP_FULL_H - PT - PB;
  const nodeY  = PT + useH * (1 - fi / (floorN - 1));
  const targetViewBoxY = nodeY - MAP_VIEW_H / 2;
  mapScrollY = Math.max(0, Math.min(MAP_MAX_SCROLL, MAP_FULL_H - MAP_VIEW_H - targetViewBoxY));
}

/* ── 몬스터 배열 in-place 교체 ────────────────────────────────────────── */
function loadStageMonsters(idx){
  const d = window.BOHYUN_COMBAT_DATA;
  if(!d || !d.monsters) return;
  if(!d._orig) d._orig = [...d.monsters];
  if(MAP_STAGES[idx]){
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
    if(footer) footer.textContent = "⬆️ 다음 스테이지를 클릭하여 진행하세요";
    return;
  }

  window.MAP_STATE.currentStage = stageIdx;
  window.MAP_STATE.proceedMode  = false;
  window.MAP_STATE.startMapMode = false;
  loadStageMonsters(stageIdx);
  updateHudFloor();
  closeMap();
  if(typeof newGame === "function") newGame();
}

/* ── 지도 열기/닫기 ────────────────────────────────────────────────────── */
function openMap(){
  if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
  let ov = document.getElementById("mapOverlay");
  if(!ov){ ov = buildOverlay(); document.getElementById("game").appendChild(ov); }
  const isStartMap = window.MAP_STATE && window.MAP_STATE.startMapMode && window.MAP_STATE.currentStage < 0;
  ov.classList.toggle("start-map-mode", !!isStartMap);
  const fi = nodeFloorIdx(getCurrentNodeId());
  if(fi >= 0) centerScrollOnFloor(fi);
  renderCanvas(getCurrentNodeId());
  ov.style.display = "grid";
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = "1"; }));
}

function closeMap(){
  if(typeof window.BAG_UI_CLOSE === "function") window.BAG_UI_CLOSE();
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

/* ── 오버레이 DOM ──────────────────────────────────────────────────────── */
function buildOverlay(){
  const div = document.createElement("div");
  div.id = "mapOverlay"; div.style.opacity = "0";
  div.innerHTML = `
    <div class="map-panel">
      <div class="map-header">
        <span class="map-title">🗺️ 병원 지도</span>
        <button class="map-close" id="mapClose">✕</button>
      </div>
      <div class="map-body">
        <div class="map-canvas-wrap" id="mapCanvasWrap">
          <svg id="mapCanvas" xmlns="http://www.w3.org/2000/svg"
               style="width:100%;height:100%;display:block"></svg>
        </div>
        <div class="map-legend">
          <div class="legend-title">범례</div>
          <div class="legend-item"><span class="leg-ico enemy">👺</span>적</div>
          <div class="legend-item"><span class="leg-ico elite">👹</span>엘리트</div>
          <div class="legend-item"><span class="leg-ico boss">💀</span>보스</div>
          <div class="legend-item"><span class="leg-ico event">❓</span>이벤트</div>
          <div class="legend-item"><span class="leg-ico shop">🛒</span>상점</div>
          <div class="legend-item"><span class="leg-ico rest">🛖</span>기도터</div>
        </div>
      </div>
      <div class="map-footer" id="mapFooter"></div>
    </div>`;
  div.addEventListener("click", e => { if(e.target === div) closeMap(); });
  div.querySelector("#mapClose").addEventListener("click", closeMap);
  setupDragScroll(
    div.querySelector("#mapCanvasWrap"),
    div.querySelector("#mapCanvas")
  );
  return div;
}

/* ── 드래그 스크롤 ──────────────────────────────────────────────────────── */
function setupDragScroll(wrap, svgEl){
  let dragging = false, startY = 0, startScroll = 0;

  const onMove = e => {
    if(!dragging) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mapScrollY = Math.max(0, Math.min(MAP_MAX_SCROLL, startScroll + (clientY - startY)));
    svgEl.setAttribute("viewBox", getViewBox());
  };
  const onEnd = () => {
    if(!dragging) return;
    dragging = false;
    wrap.style.cursor = "grab";
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onEnd);
  };

  wrap.addEventListener("mousedown", e => {
    e.preventDefault();
    dragging = true;
    startY = e.clientY;
    startScroll = mapScrollY;
    wrap.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  });

  wrap.addEventListener("touchstart", e => {
    startY = e.touches[0].clientY;
    startScroll = mapScrollY;
    dragging = true;
  }, { passive: true });
  wrap.addEventListener("touchmove", e => {
    e.preventDefault();
    onMove(e);
  }, { passive: false });
  wrap.addEventListener("touchend", () => { dragging = false; });
}

/* ── SVG 캔버스 렌더링 ─────────────────────────────────────────────────── */
function renderCanvas(currentNodeId){
  const svg = document.getElementById("mapCanvas"); if(!svg) return;

  const floorN = MAP_FLOORS.length;
  const useH   = MAP_FULL_H - PT - PB;

  // 노드 SVG 좌표 계산
  const pos = {};
  MAP_FLOORS.forEach((floor, fi) => {
    const y = PT + useH * (1 - fi / (floorN - 1));
    floor.forEach((node, ni) => {
      const cnt = floor.length;
      pos[node.id] = {
        x: cnt === 1 ? MAP_W / 2 : PX + (MAP_W - PX * 2) * ni / (cnt - 1),
        y
      };
    });
  });

  const myFloor = nodeFloorIdx(currentNodeId);
  const isPast  = id   => nodeFloorIdx(id) < myFloor;
  const isCur   = id   => id === currentNodeId;

  // 현재 노드와 실제로 선(MAP_PATHS)으로 연결된 다음 노드만 선택 가능하도록 집합 구성
  const nextNodeIds = new Set();
  if(window.MAP_STATE.proceedMode && myFloor >= 0){
    const myIdx = MAP_FLOORS[myFloor]?.findIndex(n => n.id === currentNodeId);
    if(myIdx >= 0){
      MAP_PATHS.forEach(([[f1, n1], [f2, n2]]) => {
        if(f1 === myFloor && n1 === myIdx){
          const target = MAP_FLOORS[f2]?.[n2];
          if(target) nextNodeIds.add(target.id);
        }
      });
    }
  }
  const isNext  = node =>
    window.MAP_STATE.proceedMode &&
    node.stageIndex !== undefined &&
    nextNodeIds.has(node.id);

  // 경로 선
  let paths = "";
  MAP_PATHS.forEach(([[f1, n1], [f2, n2]]) => {
    const a = MAP_FLOORS[f1]?.[n1], b = MAP_FLOORS[f2]?.[n2];
    if(!a || !b) return;
    const p1 = pos[a.id], p2 = pos[b.id];
    const active = isPast(a.id) || isCur(a.id);
    paths += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
      class="mpath${active ? " mpath-active" : ""}"
      stroke-dasharray="7 5" stroke-linecap="round"/>`;
  });

  // 층 번호 레이블 (좌측)
  let floorLbls = "";
  MAP_FLOORS.forEach((_, fi) => {
    if(fi === 0) return;
    const y = PT + useH * (1 - fi / (floorN - 1));
    floorLbls += `<text x="14" y="${y + 4}" class="mfloor-lbl">${fi}F</text>`;
  });

  // 노드
  let nodes = "";
  MAP_FLOORS.forEach(floor => floor.forEach(node => {
    const { x, y } = pos[node.id];
    const cur  = isCur(node.id);
    const past = isPast(node.id);
    const next = isNext(node);
    const r    = cur ? 24 : 20;

    const cls = ["mnode", `mnode-${node.type}`,
      cur  ? "mnode-current" : "",
      past ? "mnode-past"    : "",
      next ? "mnode-next"    : "",
      (node.isDimmed && !past) ? "mnode-dimmed" : "",
    ].filter(Boolean).join(" ");

    const attrs = [];
    if(node.stageIndex !== undefined){
      attrs.push(`data-stage="${node.stageIndex}"`, `data-nodeid="${node.id}"`);
    }
    if(next && node.stageIndex !== undefined) attrs.push(`data-nextstage="${node.stageIndex}"`);

    /* 딤드 노드: "준비중" 배지 표시 */
    const dimmedBadge = (node.isDimmed && !past && !cur)
      ? `<text text-anchor="middle" y="${-(r + 5)}" font-size="8" class="mnode-dimmed-badge">준비중</text>`
      : "";

    nodes += `<g class="${cls}" transform="translate(${x},${y})" ${attrs.join(" ")}>
      ${cur  ? `<circle r="32" class="mnode-pulse"/>` : ""}
      ${next ? `<circle r="28" class="mnode-pulse-next"/>` : ""}
      <circle r="${r}" class="mnode-bg"/>
      <text text-anchor="middle" dominant-baseline="central"
            font-size="${cur ? 16 : 13}" class="mnode-emoji">${node.emoji}</text>
      <text text-anchor="middle" y="${r + 14}" font-size="10" class="mnode-lbl">${node.label}</text>
      ${dimmedBadge}
    </g>`;
  }));

  // 플레이어 핀
  let pin = "";
  if(pos[currentNodeId]){
    const { x, y } = pos[currentNodeId];
    pin = `<g transform="translate(${x},${y - 40})">
      <polygon points="0,-14 12,8 -12,8" fill="#e7b54a" stroke="#b07d1d" stroke-width="1.5"/>
      <text text-anchor="middle" y="-1" font-size="12">👼</text>
    </g>`;
  }

  svg.innerHTML = paths + floorLbls + nodes + pin;
  svg.setAttribute("viewBox", getViewBox());

  // 푸터 업데이트
  const footer = document.getElementById("mapFooter");
  if(footer) footer.textContent = window.MAP_STATE.proceedMode
    ? "⬆️ 다음 스테이지를 클릭하여 진행하세요"
    : (getCurrentLabel(currentNodeId) ? "📍 현재 위치: " + getCurrentLabel(currentNodeId) : "");

  // 다음 스테이지 클릭 이벤트
  svg.querySelectorAll("[data-nextstage]").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", e => {
      e.stopPropagation();
      startStage(+el.dataset.nextstage);
    });
  });

  // 노드 팝업 (다음 스테이지가 아닌 노드)
}

/* ── 몬스터 팝업 ────────────────────────────────────────────────────────── */
function showNodePopup(e, el){
  removePopup();
  const si       = +el.dataset.stage;
  const monsters = POPUP_GETTERS[si] ? POPUP_GETTERS[si]() : [];
  if(!monsters.length) return;

  const stage = MAP_STAGES[si];
  const ico   = stage?.type === "boss" ? "💀" : stage?.type === "elite" ? "👹" : "👺";

  const popup = document.createElement("div");
  popup.className = "map-node-popup"; popup.id = "mapNodePopup";
  let html = `<div class="popup-title">${ico} ${stage?.label || ""}</div>`;
  monsters.forEach(m => {
    html += `<div class="popup-monster">${m.emoji} ${m.name}<span class="popup-hp"> HP ${m.maxHp}</span></div>`;
  });
  popup.innerHTML = html;

  const panel = document.querySelector(".map-panel");
  const svg   = document.getElementById("mapCanvas");
  if(!panel || !svg) return;

  const sr = svg.getBoundingClientRect(), pr = panel.getBoundingClientRect();
  const nid = el.dataset.nodeid;
  let nx = sr.left + sr.width / 2, ny = sr.top;

  // SVG viewBox 좌표 → 화면 px 변환 (스크롤 오프셋 반영)
  for(const floor of MAP_FLOORS) for(const n of floor){
    if(n.id !== nid) continue;
    const fi     = MAP_FLOORS.findIndex(f => f.includes(n));
    const ni2    = MAP_FLOORS[fi].indexOf(n);
    const cnt    = MAP_FLOORS[fi].length;
    const floorN = MAP_FLOORS.length;
    const useH   = MAP_FULL_H - PT - PB;
    const vx     = cnt === 1 ? MAP_W / 2 : PX + (MAP_W - PX * 2) * ni2 / (cnt - 1);
    const vy     = PT + useH * (1 - fi / (floorN - 1));
    const viewBoxY = MAP_FULL_H - MAP_VIEW_H - Math.max(0, Math.min(MAP_MAX_SCROLL, mapScrollY));
    nx = sr.left + vx * (sr.width / MAP_W);
    ny = sr.top  + (vy - viewBoxY) * (sr.height / MAP_VIEW_H);
  }

  popup.style.cssText = `position:absolute; left:${nx - pr.left + 12}px; top:${ny - pr.top - 10}px;`;
  panel.style.position = "relative";
  panel.appendChild(popup);
  setTimeout(() => document.addEventListener("click", removePopup, { once: true }), 0);
}
function removePopup(){ const p = document.getElementById("mapNodePopup"); if(p) p.remove(); }

/* ── 승리 화면: '다시 시작' → '진행' 교체 ────────────────────────────── */
function setupWinInterception(){
  const overEl     = document.getElementById("over");
  const restartBtn = document.getElementById("restart");
  if(!overEl || !restartBtn) return;

  const proceedBtn = document.createElement("button");
  proceedBtn.id = "proceedBtn";
  proceedBtn.textContent = "진행";
  proceedBtn.style.display = "none";
  restartBtn.parentNode.insertBefore(proceedBtn, restartBtn.nextSibling);

  new MutationObserver(() => {
    if(!overEl.classList.contains("show")) return;
    const isWin = typeof S !== "undefined" && S.over === "win";
    if(isWin && hasNextTier()){
      restartBtn.style.display = "none";
      proceedBtn.style.display = "";
    } else {
      restartBtn.style.display = "";
      proceedBtn.style.display = "none";
    }
  }).observe(overEl, { attributes: true, attributeFilter: ["class"] });

  proceedBtn.addEventListener("click", () => {
    overEl.classList.remove("show");
    window.MAP_STATE.proceedMode = true;
    openMap();
  });

  // 캡처 페이즈: script.js 핸들러보다 먼저 실행
  restartBtn.addEventListener("click", () => {
    const isWin = typeof S !== "undefined" && S.over === "win";
    if(isWin && !hasNextTier()){
      // 보스 클리어 후 재시작 → 새 맵 생성
      generateMap();
      window.MAP_STATE.currentStage = 0;
      loadStageMonsters(0);
    }
    window.MAP_STATE.proceedMode = false;
    updateHudFloor();
  }, true);
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
      if(btn.textContent.includes("병원 지도") && !btn.dataset.mapBound){
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
