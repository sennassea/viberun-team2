"use strict";
/* =========================================================================
   병원 지도 시스템 (mapSystem.js)
   - 기존 코드(script.js 등) 미수정, 독립 동작
   - 현재 테스트 빌드: 1F(스테이지1) + 2F(스테이지2-1 / 스테이지2-2) 만 표시
   =========================================================================
   핵심 원리:
   - MONSTER_DEFS(script.js const) === BOHYUN_COMBAT_DATA.monsters (동일 배열 참조)
   - splice()로 in-place 교체 시 MONSTER_DEFS에도 즉시 반영됨
   - newGame()은 script.js 전역 함수 선언 → 직접 호출 가능
   ========================================================================= */

/* ── 스테이지별 몬스터 데이터 ─────────────────────────────────────────── */
const STAGE_2A_MONSTERS = [
  { id:"child_2a",  name:"어린이 영혼", emoji:"🧒",    maxHp:28, x:72, first:0,
    moves:[{t:"attack",v:5,name:"울음"},{t:"defend",v:4,name:"웅크리기"}] },
  { id:"doctor_2a", name:"의사 영혼",   emoji:"👨‍⚕️", maxHp:44, x:72, first:0,
    moves:[{t:"attack",v:9,name:"오진"},{t:"defend",v:6,name:"차트 방패"},{t:"debuff",v:1,name:"불안 진단"}] },
];

const STAGE_2B_MONSTERS = [
  { id:"nurse_2b", name:"간호사 영혼", emoji:"👩‍⚕️", maxHp:40, x:72, first:0,
    moves:[{t:"attack",v:8,name:"호출음"},{t:"defend",v:6,name:"차트 정리"}] },
  { id:"adult_2b", name:"어른 영혼",   emoji:"🧑",    maxHp:52, x:72, first:0,
    moves:[{t:"attack",v:10,name:"한숨"},{t:"attack",v:7,name:"서성임"},{t:"debuff",v:1,name:"분노"}] },
];

/* ── 스테이지 정의 ─────────────────────────────────────────────────────── */
const MAP_STAGES = [
  { label:"스테이지 1",   getMonsters:()=>{ const d=window.BOHYUN_COMBAT_DATA; return d._orig?[...d._orig]:[...d.monsters]; } },
  { label:"스테이지 2-1", getMonsters:()=>STAGE_2A_MONSTERS },
  { label:"스테이지 2-2", getMonsters:()=>STAGE_2B_MONSTERS },
];

// 팝업 표시용 (배열 교체 후에도 원본 참조)
const POPUP_GETTERS = [
  ()=>(window.BOHYUN_COMBAT_DATA._orig || window.BOHYUN_COMBAT_DATA.monsters),
  ()=>STAGE_2A_MONSTERS,
  ()=>STAGE_2B_MONSTERS,
];

// stageIndex → 노드 id
const STAGE_NODE_MAP = { 0:"enemy_1", 1:"enemy_2a", 2:"enemy_2b" };

/* ── 전역 진행 상태 ────────────────────────────────────────────────────── */
window.MAP_STATE = { currentStage:0, proceedMode:false };

/* ── 몬스터 배열 in-place 교체 ────────────────────────────────────────── */
function loadStageMonsters(idx){
  const d = window.BOHYUN_COMBAT_DATA;
  if(!d || !d.monsters) return;
  if(!d._orig) d._orig = [...d.monsters];
  d.monsters.splice(0, d.monsters.length, ...MAP_STAGES[idx].getMonsters());
}

/* ── 지도 레이아웃 (현재 빌드: 1F · 2F만 표기) ────────────────────────── */
//   floor 0 = 입구(하단), floor 1 = 1F 적, floor 2 = 2F 두 갈래 적
const MAP_FLOORS = [
  [{ id:"start",    type:"start", emoji:"🚪", label:"입구" }],
  [{ id:"enemy_1",  type:"enemy", emoji:"👺", label:"적",  stageIndex:0 }],
  [
    { id:"enemy_2a", type:"enemy", emoji:"👺", label:"적", sublabel:"2-1", stageIndex:1 },
    { id:"enemy_2b", type:"enemy", emoji:"👺", label:"적", sublabel:"2-2", stageIndex:2 },
  ],
];

const MAP_PATHS = [
  [[0,0],[1,0]],
  [[1,0],[2,0]], [[1,0],[2,1]],
];

/* ── 보조 함수 ─────────────────────────────────────────────────────────── */
function nodeFloorIdx(id){ return MAP_FLOORS.findIndex(f => f.some(n => n.id === id)); }
function getCurrentNodeId(){ return STAGE_NODE_MAP[window.MAP_STATE.currentStage] || "enemy_1"; }

function getCurrentLabel(nodeId){
  for(const f of MAP_FLOORS) for(const n of f){
    if(n.id !== nodeId) continue;
    if(n.type === "enemy"){
      const lbl = n.sublabel ? n.sublabel : String(n.stageIndex + 1);
      return "적 스테이지 " + lbl;
    }
    return n.label;
  }
  return "";
}

// 현재 위치보다 높은 층에 적 노드가 있으면 true
function hasNextTier(){
  const myFloor = nodeFloorIdx(getCurrentNodeId());
  return MAP_FLOORS.some((floor, fi) => fi > myFloor && floor.some(n => n.type === "enemy"));
}

/* ── 스테이지 시작 ─────────────────────────────────────────────────────── */
function startStage(stageIdx){
  window.MAP_STATE.currentStage = stageIdx;
  window.MAP_STATE.proceedMode  = false;
  loadStageMonsters(stageIdx);
  closeMap();
  if(typeof newGame === "function") newGame();
}

/* ── 지도 열기 / 닫기 ──────────────────────────────────────────────────── */
function openMap(){
  let ov = document.getElementById("mapOverlay");
  if(!ov){ ov = buildOverlay(); document.getElementById("game").appendChild(ov); }
  renderCanvas(getCurrentNodeId());
  ov.style.display = "grid";
  requestAnimationFrame(() => requestAnimationFrame(() => { ov.style.opacity = "1"; }));
}
function closeMap(){
  const ov = document.getElementById("mapOverlay"); if(!ov) return;
  ov.style.opacity = "0";
  setTimeout(() => { if(ov.parentNode) ov.remove(); }, 280);
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
        <div class="map-canvas-wrap">
          <svg id="mapCanvas" viewBox="0 0 360 520"
               xmlns="http://www.w3.org/2000/svg" style="overflow:visible"></svg>
        </div>
        <div class="map-legend">
          <div class="legend-title">범례</div>
          <div class="legend-item"><span class="leg-ico enemy">👺</span>적</div>
        </div>
      </div>
      <div class="map-footer" id="mapFooter"></div>
    </div>`;
  div.addEventListener("click", e => { if(e.target === div) closeMap(); });
  div.querySelector("#mapClose").addEventListener("click", closeMap);
  return div;
}

/* ── SVG 캔버스 렌더링 ─────────────────────────────────────────────────── */
function renderCanvas(currentNodeId){
  const svg = document.getElementById("mapCanvas"); if(!svg) return;

  const W=360, H=520, PX=65, PT=110, PB=90;
  const useH = H - PT - PB;
  const floorN = MAP_FLOORS.length;

  // 노드 좌표
  const pos = {};
  MAP_FLOORS.forEach((floor, fi) => {
    const y = PT + useH * (1 - fi / (floorN - 1));
    floor.forEach((node, ni) => {
      const cnt = floor.length;
      pos[node.id] = { x: cnt === 1 ? W/2 : PX + (W - PX*2) * ni / (cnt - 1), y };
    });
  });

  const myFloor = nodeFloorIdx(currentNodeId);
  const isPast  = id => nodeFloorIdx(id) < myFloor;
  const isCur   = id => id === currentNodeId;
  const isNext  = node =>
    window.MAP_STATE.proceedMode &&
    node.type === "enemy" && node.stageIndex !== undefined &&
    nodeFloorIdx(node.id) === myFloor + 1;

  // ── 경로 선
  let paths = "";
  MAP_PATHS.forEach(([[f1,n1],[f2,n2]]) => {
    const a = MAP_FLOORS[f1]?.[n1], b = MAP_FLOORS[f2]?.[n2]; if(!a||!b) return;
    const p1 = pos[a.id], p2 = pos[b.id];
    const active = isPast(a.id) || isCur(a.id);
    paths += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"
      class="mpath${active ? " mpath-active" : ""}"
      stroke-dasharray="7 5" stroke-linecap="round"/>`;
  });

  // ── 층 번호 (좌측)
  let floorLbls = "";
  MAP_FLOORS.forEach((_, fi) => {
    if(fi === 0) return;
    const y = PT + useH * (1 - fi / (floorN - 1));
    floorLbls += `<text x="14" y="${y + 4}" class="mfloor-lbl">${fi}F</text>`;
  });

  // ── 노드
  let nodes = "";
  MAP_FLOORS.forEach(floor => floor.forEach(node => {
    const {x, y} = pos[node.id];
    const cur  = isCur(node.id);
    const past = isPast(node.id);
    const next = isNext(node);
    const r = cur ? 24 : 20;

    const cls = ["mnode", `mnode-${node.type}`,
      cur  ? "mnode-current" : "",
      past ? "mnode-past"    : "",
      next ? "mnode-next"    : "",
    ].filter(Boolean).join(" ");

    const attrs = [];
    if(node.type === "enemy" && node.stageIndex !== undefined){
      attrs.push(`data-stage="${node.stageIndex}"`, `data-nodeid="${node.id}"`);
    }
    if(next) attrs.push(`data-nextstage="${node.stageIndex}"`);

    const sublabelSvg = node.sublabel
      ? `<text text-anchor="middle" y="${r + 26}" font-size="9" class="mnode-sublbl">${node.sublabel}</text>`
      : "";

    nodes += `<g class="${cls}" transform="translate(${x},${y})" ${attrs.join(" ")}>
      ${cur  ? `<circle r="32" class="mnode-pulse"/>` : ""}
      ${next ? `<circle r="28" class="mnode-pulse-next"/>` : ""}
      <circle r="${r}" class="mnode-bg"/>
      <text text-anchor="middle" dominant-baseline="central"
            font-size="${cur ? 16 : 13}" class="mnode-emoji">${node.emoji}</text>
      <text text-anchor="middle" y="${r + 14}" font-size="10" class="mnode-lbl">${node.label}</text>
      ${sublabelSvg}
    </g>`;
  }));

  // ── 플레이어 핀
  let pin = "";
  if(pos[currentNodeId]){
    const {x, y} = pos[currentNodeId];
    pin = `<g transform="translate(${x},${y - 40})">
      <polygon points="0,-14 12,8 -12,8" fill="#e7b54a" stroke="#b07d1d" stroke-width="1.5"/>
      <text text-anchor="middle" y="-1" font-size="12">👼</text>
    </g>`;
  }

  svg.innerHTML = paths + floorLbls + nodes + pin;

  // ── 푸터
  const footer = document.getElementById("mapFooter");
  if(footer) footer.textContent = window.MAP_STATE.proceedMode
    ? "⬆️ 다음 스테이지를 클릭하여 진행하세요"
    : (getCurrentLabel(currentNodeId) ? "📍 현재 위치: " + getCurrentLabel(currentNodeId) : "");

  // ── 이벤트: 다음 스테이지 클릭 → 시작
  svg.querySelectorAll("[data-nextstage]").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", e => {
      e.stopPropagation();
      startStage(+el.dataset.nextstage);
    });
  });

  // ── 이벤트: 일반 적 노드 → 몬스터 목록 팝업
  svg.querySelectorAll("[data-stage]:not([data-nextstage])").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", e => showNodePopup(e, el));
  });
}

/* ── 몬스터 팝업 ────────────────────────────────────────────────────────── */
const STAGE_DISPLAY_LABELS = ["스테이지 1", "스테이지 2-1", "스테이지 2-2"];

function showNodePopup(e, el){
  removePopup();
  const si = +el.dataset.stage;
  const monsters = (POPUP_GETTERS[si] && POPUP_GETTERS[si]()) || [];
  if(!monsters.length) return;

  const popup = document.createElement("div");
  popup.className = "map-node-popup"; popup.id = "mapNodePopup";
  let html = `<div class="popup-title">👺 ${STAGE_DISPLAY_LABELS[si] || ("스테이지 " + (si + 1))}</div>`;
  monsters.forEach(m => {
    html += `<div class="popup-monster">${m.emoji} ${m.name}<span class="popup-hp"> HP ${m.maxHp}</span></div>`;
  });
  popup.innerHTML = html;

  const panel = document.querySelector(".map-panel");
  const svg   = document.getElementById("mapCanvas");
  if(!panel || !svg) return;

  // SVG viewBox 좌표 → 화면 px
  const sr = svg.getBoundingClientRect(), pr = panel.getBoundingClientRect();
  const nid = el.dataset.nodeid;
  let nx = sr.left + sr.width / 2, ny = sr.top;
  for(const floor of MAP_FLOORS) for(const n of floor){
    if(n.id !== nid) continue;
    const W=360, H=520, PX=65, PT=110, PB=90, floorN=MAP_FLOORS.length, useH=H-PT-PB;
    const fi  = MAP_FLOORS.findIndex(f => f.includes(n));
    const ni2 = MAP_FLOORS[fi].indexOf(n);
    const cnt = MAP_FLOORS[fi].length;
    const vx  = cnt === 1 ? W/2 : PX + (W - PX*2) * ni2 / (cnt - 1);
    const vy  = PT + useH * (1 - fi / (floorN - 1));
    nx = sr.left + vx * (sr.width  / W);
    ny = sr.top  + vy * (sr.height / H);
  }
  popup.style.cssText = `position:absolute; left:${nx - pr.left + 12}px; top:${ny - pr.top - 10}px;`;
  panel.style.position = "relative";
  panel.appendChild(popup);
  setTimeout(() => document.addEventListener("click", removePopup, {once:true}), 0);
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

  // #over 클래스 변화 감지
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
  }).observe(overEl, { attributes:true, attributeFilter:["class"] });

  // '진행' 클릭 → 지도 열기 (proceedMode 활성)
  proceedBtn.addEventListener("click", () => {
    overEl.classList.remove("show");
    window.MAP_STATE.proceedMode = true;
    openMap();
  });

  // '다시 시작' 클릭 캡처 → 필요 시 스테이지 리셋
  // (script.js 버블 핸들러보다 먼저 실행되어 올바른 몬스터 로드)
  restartBtn.addEventListener("click", () => {
    const isWin = typeof S !== "undefined" && S.over === "win";
    if(isWin && !hasNextTier()){
      // 마지막 스테이지 클리어 후 재시작 → 스테이지 1 복귀
      window.MAP_STATE.currentStage = 0;
      loadStageMonsters(0);
    }
    // 패배 시: 현재 스테이지 그대로 재시도 (몬스터 이미 로드됨)
    window.MAP_STATE.proceedMode = false;
  }, true /* capture phase */);
}

/* ── 초기화 ─────────────────────────────────────────────────────────────── */
(function init(){
  function setup(){
    const d = window.BOHYUN_COMBAT_DATA;
    if(d && d.monsters && !d._orig) d._orig = [...d.monsters];

    document.querySelectorAll(".hud-btn").forEach(btn => {
      if(btn.textContent.includes("병원 지도") && !btn.dataset.mapBound){
        btn.dataset.mapBound = "1";
        btn.addEventListener("click", openMap);
      }
    });
    setupWinInterception();
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
