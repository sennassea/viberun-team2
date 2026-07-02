"use strict";
/* =========================================================================
   맵 UI 리디자인 (mapUI.js) - ACT1 기획서 기반
   ● 사선 노드 배치: 좌하단(로비) → 우상단(보스)
   ● 상하좌우 자유 드래그 스크롤
   ● 맵 캔버스 내 층수 레이블 제거 (헤더 배지로 이동)
   ● 범례 툴팁 (hover / 터치)
   기존 mapSystem.js / mapNodeLogic.js 수정 없음 – 전역 함수 오버라이드
   ========================================================================= */

/* ── 대각선 맵 좌표 상수 ─────────────────────────────────────────────────── */
const DMAP_W      = 1470;   // 가상 맵 전체 너비
const DMAP_H      = 1310;   // 가상 맵 전체 높이 (하단 여백 최소화)
const DMAP_VIEW_W = 820;    // SVG viewBox 너비 (가상 좌표계)
const DMAP_VIEW_H = 510;    // SVG viewBox 높이 (가상 좌표계)

const DMAP_START_X = 260;   // 로비(시작) 노드 기준 X  (좌측 여백 확보)
const DMAP_START_Y = 1100;  // 로비(시작) 노드 기준 Y  (하단 단축)
const DMAP_END_X   = 1340;  // 보스 노드 기준 X
const DMAP_END_Y   = 290;   // 보스 노드 기준 Y

const DMAP_SPREAD  = 170;   // 같은 층 노드 간 간격 (가상 좌표)

/* ── 2D 스크롤 / 줌 상태 ──────────────────────────────────────────────────── */
// mapScrollY 는 mapSystem.js 에서 let 으로 선언됨 – 공유 가능
let mapScrollX = 0;
let mapZoom    = 1.0;   // >1 = 확대, <1 = 축소

const DMAP_ZOOM_MIN = 0.558; // 전체 노드 가로가 딱 맞는 최대 축소 (820/1470)
const DMAP_ZOOM_MAX = 1.5;   // 이미지1 수준의 적당한 확대까지만 허용

function dmapViewW() { return DMAP_VIEW_W / mapZoom; }
function dmapViewH() { return DMAP_VIEW_H / mapZoom; }
function dmapMaxSX() { return Math.max(0, DMAP_W - dmapViewW()); }
function dmapMaxSY() { return Math.max(0, DMAP_H - dmapViewH()); }

/* ── getViewBox 오버라이드 (2D 스크롤 + 줌) ─────────────────────────────── */
function getViewBox() {
  const vw = dmapViewW(), vh = dmapViewH();
  const sx = Math.max(0, Math.min(DMAP_W - vw, mapScrollX));
  const sy = Math.max(0, Math.min(DMAP_H - vh, mapScrollY));
  return `${sx | 0} ${sy | 0} ${vw | 0} ${vh | 0}`;
}

/* ── 대각선 노드 좌표 계산 ──────────────────────────────────────────────── */
function getDiagNodePos(floors) {
  const total  = Math.max(1, floors.length - 1);
  const diagDX = DMAP_END_X - DMAP_START_X;  // 1800
  const diagDY = DMAP_END_Y - DMAP_START_Y;  // -1160
  const len    = Math.sqrt(diagDX * diagDX + diagDY * diagDY);

  // 수직 방향: (-dy, dx) 정규화 → 대각선과 90° 방향으로 노드 퍼짐
  const perpX = -diagDY / len;
  const perpY =  diagDX / len;

  const pos = {};
  floors.forEach((floor, fi) => {
    const t     = fi / total;
    const baseX = DMAP_START_X + t * diagDX;
    const baseY = DMAP_START_Y + t * diagDY;
    const count = floor.length;

    floor.forEach((node, ni) => {
      const offset = ni - (count - 1) / 2;
      pos[node.id] = {
        x: baseX + offset * DMAP_SPREAD * perpX,
        y: baseY + offset * DMAP_SPREAD * perpY,
      };
    });
  });
  return pos;
}

/* ── centerScrollOnFloor 오버라이드 (2D) ────────────────────────────────── */
function centerScrollOnFloor(fi) {
  // 맵 열 때 기본 줌 1.0 (최소줌 0.558에서 휠 5번 확대한 수준)
  mapZoom = 1.0;

  const pos   = getDiagNodePos(MAP_FLOORS);
  const floor = MAP_FLOORS[fi];
  if (!floor || !floor.length) return;

  let sumX = 0, sumY = 0, cnt = 0;
  floor.forEach(n => {
    const p = pos[n.id]; if (!p) return;
    sumX += p.x; sumY += p.y; cnt++;
  });
  if (!cnt) return;

  mapScrollX = Math.max(0, Math.min(dmapMaxSX(), sumX / cnt - dmapViewW() / 2));
  mapScrollY = Math.max(0, Math.min(dmapMaxSY(), sumY / cnt - dmapViewH() / 2));
}

/* ── setupDragScroll 오버라이드 (드래그 + 휠 줌 + 핀치 줌) ────────────── */
function setupDragScroll(wrap, svgEl) {

  /* ── 마우스 드래그 ─────────────────────────────────────────────────────── */
  let dragging = false;
  let startX = 0, startY = 0, startSX = 0, startSY = 0;

  const onMouseMove = e => {
    if (!dragging) return;
    mapScrollX = Math.max(0, Math.min(dmapMaxSX(), startSX - (e.clientX - startX)));
    mapScrollY = Math.max(0, Math.min(dmapMaxSY(), startSY - (e.clientY - startY)));
    svgEl.setAttribute("viewBox", getViewBox());
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    wrap.style.cursor = "grab";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  };

  wrap.addEventListener("mousedown", e => {
    e.preventDefault();
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startSX = mapScrollX; startSY = mapScrollY;
    wrap.style.cursor = "grabbing";
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });

  /* ── 마우스 휠 줌 ──────────────────────────────────────────────────────── */
  wrap.addEventListener("wheel", e => {
    e.preventDefault();
    const factor  = e.deltaY < 0 ? 1.12 : (1 / 1.12);
    const newZoom = Math.max(DMAP_ZOOM_MIN, Math.min(DMAP_ZOOM_MAX, mapZoom * factor));
    if (newZoom === mapZoom) return;

    const rect   = svgEl.getBoundingClientRect();
    const relX   = (e.clientX - rect.left)  / rect.width;
    const relY   = (e.clientY - rect.top)   / rect.height;

    // 마우스 위치의 SVG 좌표를 줌 전후에 고정
    const svgPivX = mapScrollX + relX * dmapViewW();
    const svgPivY = mapScrollY + relY * dmapViewH();

    mapZoom = newZoom;
    const vw = dmapViewW(), vh = dmapViewH();
    mapScrollX = Math.max(0, Math.min(DMAP_W - vw, svgPivX - relX * vw));
    mapScrollY = Math.max(0, Math.min(DMAP_H - vh, svgPivY - relY * vh));

    svgEl.setAttribute("viewBox", getViewBox());
  }, { passive: false });

  /* ── 터치 드래그 + 핀치 줌 ─────────────────────────────────────────────── */
  let isPinching   = false;
  let pinchStartDist = 0, pinchStartZoom = 0;
  let pinchSvgMidX = 0, pinchSvgMidY = 0;
  let pinchRelX = 0, pinchRelY = 0;

  function touchDist(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  wrap.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
      isPinching = false;
      dragging   = true;
      startX  = e.touches[0].clientX;
      startY  = e.touches[0].clientY;
      startSX = mapScrollX;
      startSY = mapScrollY;
    } else if (e.touches.length >= 2) {
      dragging   = false;
      isPinching = true;
      pinchStartDist = touchDist(e.touches);
      pinchStartZoom = mapZoom;

      const rect     = svgEl.getBoundingClientRect();
      const midCX    = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midCY    = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      pinchRelX = (midCX - rect.left) / rect.width;
      pinchRelY = (midCY - rect.top)  / rect.height;
      // 핀치 시작 시 SVG 기준점 고정
      pinchSvgMidX = mapScrollX + pinchRelX * dmapViewW();
      pinchSvgMidY = mapScrollY + pinchRelY * dmapViewH();
    }
  }, { passive: true });

  wrap.addEventListener("touchmove", e => {
    e.preventDefault();
    if (e.touches.length === 1 && dragging && !isPinching) {
      mapScrollX = Math.max(0, Math.min(dmapMaxSX(), startSX - (e.touches[0].clientX - startX)));
      mapScrollY = Math.max(0, Math.min(dmapMaxSY(), startSY - (e.touches[0].clientY - startY)));
      svgEl.setAttribute("viewBox", getViewBox());
    } else if (e.touches.length >= 2 && isPinching) {
      const scale = touchDist(e.touches) / pinchStartDist;
      mapZoom = Math.max(DMAP_ZOOM_MIN, Math.min(DMAP_ZOOM_MAX, pinchStartZoom * scale));

      const rect  = svgEl.getBoundingClientRect();
      const midCX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midCY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const curRelX = (midCX - rect.left) / rect.width;
      const curRelY = (midCY - rect.top)  / rect.height;

      const vw = dmapViewW(), vh = dmapViewH();
      // 기준점이 현재 핀치 중간점 아래에 위치하도록
      mapScrollX = Math.max(0, Math.min(DMAP_W - vw, pinchSvgMidX - curRelX * vw));
      mapScrollY = Math.max(0, Math.min(DMAP_H - vh, pinchSvgMidY - curRelY * vh));

      svgEl.setAttribute("viewBox", getViewBox());
    }
  }, { passive: false });

  wrap.addEventListener("touchend", e => {
    if (e.touches.length < 2) isPinching = false;
    if (e.touches.length === 0) { dragging = false; return; }
    if (e.touches.length === 1 && !isPinching) {
      // 핀치 → 단일 터치로 전환 시 드래그 재시작
      startX  = e.touches[0].clientX;
      startY  = e.touches[0].clientY;
      startSX = mapScrollX;
      startSY = mapScrollY;
      dragging = true;
    }
  });
}

/* ── 노드 타입별 이모지 매핑 ─────────────────────────────────────────────── */
const DMAP_EMOJI = {
  enemy:    "👊",
  elite:    "👹",
  event:    "❓",
  shop:     "🛍️",
  rest:     "🛏️",
  boss:     "💀",
  lobby:    "🏥",
  start:    "🚩",
  unknown:  "❓",
  merchant: "🛍️",
};

function getTutorialMapCurrentLabel(currentNodeId) {
  const stage = Array.isArray(MAP_STAGES) ? MAP_STAGES[0] : null;
  const isTutorialMap = !!(stage && stage.packageId === "tutorial_battle");
  const isTutorialBattle = !!(
    window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle()
  );
  if(!isTutorialMap && !isTutorialBattle) return "";
  if(currentNodeId === "tutorial_battle" || (window.MAP_STATE && window.MAP_STATE.currentStage === 0)){
    return "튜토리얼 구역";
  }
  return "집";
}

/* ── renderCanvas 오버라이드 ────────────────────────────────────────────── */
function renderCanvas(currentNodeId) {
  const svg = document.getElementById("mapCanvas");
  if (!svg) return;

  const pos     = getDiagNodePos(MAP_FLOORS);
  const myFloor = nodeFloorIdx(currentNodeId);
  const tutorialCurrentLabel = getTutorialMapCurrentLabel(currentNodeId);
  const isPast  = id   => nodeFloorIdx(id) < myFloor;
  const isCur   = id   => id === currentNodeId;

  // 현재 노드와 실제로 선(MAP_PATHS)으로 연결된 다음 노드만 선택 가능하도록 집합 구성
  const nextNodeIds = new Set();
  if (window.MAP_STATE.proceedMode && myFloor >= 0) {
    const myIdx = MAP_FLOORS[myFloor]?.findIndex(n => n.id === currentNodeId);
    if (myIdx >= 0) {
      MAP_PATHS.forEach(([[f1, n1], [f2, n2]]) => {
        if (f1 === myFloor && n1 === myIdx) {
          const target = MAP_FLOORS[f2]?.[n2];
          if (target) nextNodeIds.add(target.id);
        }
      });
    }
  }
  const isNext  = node =>
    window.MAP_STATE.proceedMode &&
    node.stageIndex !== undefined &&
    nextNodeIds.has(node.id);

  /* ── 경로 선 ── */
  let svgPaths = "";
  MAP_PATHS.forEach(([[f1, n1], [f2, n2]]) => {
    const a = MAP_FLOORS[f1]?.[n1];
    const b = MAP_FLOORS[f2]?.[n2];
    if (!a || !b) return;
    const p1 = pos[a.id], p2 = pos[b.id];
    if (!p1 || !p2) return;
    const active = isPast(a.id) || isCur(a.id);
    svgPaths += `<line x1="${p1.x | 0}" y1="${p1.y | 0}" x2="${p2.x | 0}" y2="${p2.y | 0}"
      class="mpath${active ? " mpath-active" : ""}"
      stroke-dasharray="8 6" stroke-linecap="round"/>`;
  });

  /* ── 노드 그룹 ── */
  let svgNodes = "";
  MAP_FLOORS.forEach(floor => floor.forEach(node => {
    const p = pos[node.id]; if (!p) return;
    const { x, y } = p;
    const cur  = isCur(node.id);
    const past = isPast(node.id);
    const next = isNext(node);

    // 보스는 약간 크게, 현재 위치는 조금 크게
    const r = node.type === "boss" ? 28 : (cur ? 27 : 22);

    const cls = [
      "mnode", `mnode-${node.type}`,
      cur  ? "mnode-current" : "",
      past ? "mnode-past"    : "",
      next ? "mnode-next"    : "",
      (node.isDimmed && !past) ? "mnode-dimmed" : "",
    ].filter(Boolean).join(" ");

    const attrs = [];
    if (node.stageIndex !== undefined) {
      attrs.push(`data-stage="${node.stageIndex}"`, `data-nodeid="${node.id}"`);
    }
    if (next && node.stageIndex !== undefined) {
      attrs.push(`data-nextstage="${node.stageIndex}"`);
    }

    const emoji     = DMAP_EMOJI[node.type] || node.emoji;
    const emojiSize = node.type === "boss" ? 20 : (cur ? 17 : 15);

    // 딤드 노드 "준비중" 배지
    const dimmedBadge = (node.isDimmed && !past && !cur)
      ? `<text text-anchor="middle" y="${-(r + 6)}" font-size="8" class="mnode-dimmed-badge">준비중</text>`
      : "";

    svgNodes += `<g class="${cls}" transform="translate(${x | 0},${y | 0})" ${attrs.join(" ")}>
      ${cur  ? `<circle r="36" class="mnode-pulse"/>` : ""}
      ${next ? `<circle r="30" class="mnode-pulse-next"/>` : ""}
      <circle r="${r}" class="mnode-bg"/>
      <text text-anchor="middle" dominant-baseline="central" font-size="${emojiSize}" class="mnode-emoji">${emoji}</text>
      ${dimmedBadge}
    </g>`;
  }));

  /* ── 플레이어 마커 ── */
  let svgPin = "";
  if (pos[currentNodeId]) {
    const { x, y } = pos[currentNodeId];
    svgPin = `<g transform="translate(${x | 0},${(y - 47) | 0})">
      <polygon points="0,-14 12,8 -12,8" fill="#e7b54a" stroke="#b07d1d" stroke-width="2"/>
      <text text-anchor="middle" y="-1" font-size="14">👼</text>
    </g>`;
  }

  /* ── SVG 업데이트 ── */
  svg.innerHTML = svgPaths + svgNodes + svgPin;
  svg.setAttribute("viewBox", getViewBox());

  /* ── 현재 위치 배지 ── */
  const floorBadge = document.getElementById("mapCurrentFloor");
  if (floorBadge) {
    floorBadge.textContent = tutorialCurrentLabel || (myFloor > 0 ? `${myFloor}층` : "신령의 은혜");
  }

  /* ── 푸터 텍스트 ── */
  const footer = document.getElementById("mapFooter");
  if (footer) {
    footer.textContent = tutorialCurrentLabel
      ? "📍 현재 위치: " + tutorialCurrentLabel
      : window.MAP_STATE.proceedMode
      ? "강조된 다음 노드를 클릭/터치하여 진행하세요"
      : (getCurrentLabel(currentNodeId) ? "📍 현재 위치: " + getCurrentLabel(currentNodeId) : "");
  }

  /* ── 다음 노드 클릭 이벤트 ── */
  svg.querySelectorAll("[data-nextstage]").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", e => {
      e.stopPropagation();
      startStage(+el.dataset.nextstage);
    });
  });
}

/* ── 범례 데이터 ──────────────────────────────────────────────────────────── */
const DMAP_LEGEND_DATA = [
  {
    type: "enemy",
    icon: "👊",
    label: "일반 전투",
    tip: "일반 적과 전투합니다. 승리하면 주문 보상과 골드를 얻을 수 있습니다.",
  },
  {
    type: "elite",
    icon: "👹",
    label: "엘리트",
    tip: "강한 적과 전투합니다. 위험하지만 더 좋은 보상을 기대할 수 있습니다.",
  },
  {
    type: "event",
    icon: "❓",
    label: "이벤트",
    tip: "예상하지 못한 상황과 선택지가 등장합니다.",
  },
  {
    type: "shop",
    icon: "🛍️",
    label: "상점",
    tip: "골드를 사용해 주문, 약병, 법구를 구매할 수 있습니다.",
  },
  {
    type: "rest",
    icon: "🛏️",
    label: "기도터",
    tip: "정신력을 회복하거나 덱을 정비할 수 있습니다.",
  },
  {
    type: "boss",
    icon: "💀",
    label: "보스",
    tip: "ACT 1의 마지막 전투입니다. 최종 목표를 향해 나아가세요.",
  },
];

/* ── buildOverlay 오버라이드 ────────────────────────────────────────────── */
function buildOverlay() {
  const div = document.createElement("div");
  div.id = "mapOverlay";
  div.style.opacity = "0";

  const legendHtml = DMAP_LEGEND_DATA.map(item =>
    `<div class="legend-item dmap-legend-item" data-type="${item.type}" data-tip="${item.tip.replace(/"/g, '&quot;')}">
      <span class="leg-ico dmap-leg-ico ${item.type}">${item.icon}</span>
      <span class="dmap-leg-label">${item.label}</span>
    </div>`
  ).join("");

  div.innerHTML = `
    <div class="map-panel dmap-panel">
      <div class="map-header dmap-header">
        <div class="dmap-loc-badge">
          <span class="dmap-loc-icon">📍</span>
          <span>현재 위치</span>
          <span class="dmap-loc-floor" id="mapCurrentFloor">-</span>
        </div>
        <span class="map-title dmap-title">🗺️ 여정</span>
        <button class="map-close dmap-close" id="mapClose" aria-label="닫기">✕</button>
      </div>
      <div class="map-body dmap-body">
        <div class="map-canvas-wrap dmap-canvas-wrap" id="mapCanvasWrap">
          <svg id="mapCanvas" xmlns="http://www.w3.org/2000/svg"
               style="width:100%;height:100%;display:block"></svg>
          <div class="dmap-drag-hint" id="dMapDragHint">
            <span>✥</span><span>드래그로 여정 이동</span>
          </div>
        </div>
        <div class="map-legend dmap-legend" id="dMapLegend">
          <div class="legend-title dmap-legend-title">✦ 범례 ✦</div>
          ${legendHtml}
          <div class="dmap-tip-box" id="dMapTipBox"></div>
        </div>
      </div>
      <div class="dmap-bottom">
        <div class="dmap-action-bar">
          <button class="dmap-action-btn" id="dMapDeckBtn">📖 보유 주문</button>
          <button class="dmap-action-btn" id="dMapItemBtn">🎒 가방</button>
          <button class="dmap-action-btn" id="dMapSettingsBtn">⚙️ 설정</button>
        </div>
        <div class="map-footer dmap-footer" id="mapFooter"></div>
      </div>
    </div>`;

  /* ── 이벤트 바인딩 ── */
  div.addEventListener("click", e => { if (e.target === div) closeMap(); });
  div.querySelector("#mapClose").addEventListener("click", closeMap);

  /* 덱 확인: 기존 덱뷰어 버튼 트리거 */
  div.querySelector("#dMapDeckBtn").addEventListener("click", () => {
    closeMapPopupViews("deck");
    const deckBtn = document.getElementById("deckViewerButton");
    if (deckBtn) deckBtn.click();
  });

  /* 소지품 확인: 기존 가방 UI 열기 */
  div.querySelector("#dMapItemBtn").addEventListener("click", (e) => {
    // 버튼 클릭이 맵 배경 클릭/노드 선택으로 번지지 않도록 차단
    e.preventDefault();
    e.stopPropagation();
    closeMapPopupViews("bag");
    // bagUI.js 에서 제공하는 가방 열기 함수 호출
    if (typeof window.BAG_UI_OPEN === "function") {
      window.BAG_UI_OPEN({ mode: "map" });
      return;
    }
    // 예외 상황: bagUI.js 로드 실패 또는 전역 함수 누락
    const footer = document.getElementById("mapFooter");
    if (footer) footer.textContent = "가방 기능을 불러올 수 없습니다. bagUI.js 로드 상태를 확인하세요.";
  });

  /* 설정: 기존 설정 버튼 트리거 */
  div.querySelector("#dMapSettingsBtn").addEventListener("click", () => {
    closeMapPopupViews("settings");
    const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
      .find(b => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
    if (settingsBtn) settingsBtn.click();
    else {
      const footer = document.getElementById("mapFooter");
      if (footer) footer.textContent = "설정 기능을 사용하려면 전투 화면에서 접근하세요.";
    }
  });

  /* ── 범례 툴팁 ── */
  const tipBox   = div.querySelector("#dMapTipBox");
  let activeTip  = null;

  div.querySelectorAll(".dmap-legend-item").forEach(item => {
    const tip = item.dataset.tip;

    /* PC: 마우스 오버 시 설명 표시 */
    item.addEventListener("mouseenter", () => {
      if (tipBox) tipBox.innerHTML = `<div class="dmap-tip-inner">${tip}</div>`;
      activeTip = item;
    });
    item.addEventListener("mouseleave", () => {
      if (activeTip === item) {
        if (tipBox) tipBox.innerHTML = "";
        activeTip = null;
      }
    });

    /* 모바일: 한 번 터치 시 토글 */
    item.addEventListener("click", e => {
      e.stopPropagation();
      if (activeTip === item) {
        if (tipBox) tipBox.innerHTML = "";
        activeTip = null;
        item.classList.remove("active");
      } else {
        if (activeTip) activeTip.classList.remove("active");
        if (tipBox) tipBox.innerHTML = `<div class="dmap-tip-inner">${tip}</div>`;
        activeTip = item;
        item.classList.add("active");
      }
    });
  });

  /* 다른 영역 터치 시 툴팁 닫기 */
  div.addEventListener("click", () => {
    if (activeTip) {
      activeTip.classList.remove("active");
      activeTip = null;
    }
    if (tipBox) tipBox.innerHTML = "";
  });

  /* ── 드래그 힌트 자동 숨기기 ── */
  const hintEl = div.querySelector("#dMapDragHint");
  const hideHint = () => {
    if (hintEl) {
      hintEl.style.opacity = "0";
      hintEl.style.pointerEvents = "none";
    }
  };
  const canvasWrap = div.querySelector("#mapCanvasWrap");
  canvasWrap.addEventListener("mousedown", hideHint, { once: true });
  canvasWrap.addEventListener("touchstart", hideHint, { once: true, passive: true });

  /* ── 드래그 스크롤 연결 ── */
  setupDragScroll(canvasWrap, div.querySelector("#mapCanvas"));

  return div;
}

function closeMapPopupViews(except) {
  if (except !== "deck" && typeof window.DECK_VIEWER_CLOSE === "function") {
    window.DECK_VIEWER_CLOSE();
  }
  if (except !== "bag" && typeof window.BAG_UI_CLOSE === "function") {
    window.BAG_UI_CLOSE();
  }
  if (except !== "settings" && typeof window.SETTINGS_VIEWER_CLOSE === "function") {
    window.SETTINGS_VIEWER_CLOSE();
  }
}
