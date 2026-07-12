"use strict";
/* =========================================================================
   Run Records UI 레이어 — runRecord.js에서 분리된 기록 화면 렌더링/스타일.
   기록 저장/조회(localStorage)는 runRecord.js에 남아있고 이 파일은 그
   결과를 화면에 그리기만 한다. 유니티 이식 시 이 파일은 통째로 버리고
   uGUI로 새로 짜면 된다.
   ========================================================================= */

/* 세로 드래그 스크롤: runResultUI.js의 rrEnableDragScroll(가로용)과 동일한 방식을
   세로 스크롤에 맞춰 적용한다. */
function enableRecordPageDragScroll(container){
  if(!container || container.dataset.recordDragReady === "1") return;
  container.dataset.recordDragReady = "1";

  let dragging = false, startY = 0, startScrollTop = 0, pointerId = null;

  container.addEventListener("pointerdown", (event) => {
    if(container.scrollHeight <= container.clientHeight) return;
    dragging = true;
    delete container.dataset.recordPageDragged;
    pointerId = event.pointerId;
    startY = event.clientY;
    startScrollTop = container.scrollTop;
    container.classList.add("record-page-dragging");
    container.setPointerCapture?.(pointerId);
  });
  container.addEventListener("pointermove", (event) => {
    if(!dragging) return;
    const diff = event.clientY - startY;
    if(Math.abs(diff) > 4) container.dataset.recordPageDragged = "1";
    container.scrollTop = startScrollTop - diff;
  });
  const stopDrag = (event) => {
    if(!dragging) return;
    dragging = false;
    container.classList.remove("record-page-dragging");
    try{ container.releasePointerCapture?.(event.pointerId); }catch(error){}
    // 드래그 직후 클릭이 카드 오픈으로 오작동하지 않도록 다음 tick에 플래그를 정리한다.
    setTimeout(() => { delete container.dataset.recordPageDragged; }, 0);
  };
  container.addEventListener("pointerup", stopDrag);
  container.addEventListener("pointercancel", stopDrag);
  container.addEventListener("pointerleave", stopDrag);
}

function openRecordPage(){
  let overlay = document.getElementById("recordPageOverlay");
  if(!overlay) overlay = buildRecordPage();
  renderRecordPage(overlay);
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
}

function closeRecordPage(){
  const overlay = document.getElementById("recordPageOverlay");
  if(!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

function buildRecordPage(){
  injectRecordPageStyles();
  const overlay = document.createElement("div");
  overlay.id = "recordPageOverlay";
  overlay.className = "record-page-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="record-page-panel" role="dialog" aria-modal="true" aria-labelledby="recordPageTitle">' +
      '<div class="record-page-head">' +
        '<h2 id="recordPageTitle">기록</h2>' +
        '<button type="button" class="record-page-close" aria-label="닫기">닫기</button>' +
      '</div>' +
      '<div class="record-page-body"></div>' +
    '</div>';
  overlay.querySelector(".record-page-close").addEventListener("click", closeRecordPage);
  overlay.addEventListener("click", event => {
    if(event.target === overlay) closeRecordPage();
  });
  document.getElementById("game").appendChild(overlay);
  return overlay;
}

function renderRecordPage(overlay){
  const body = overlay.querySelector(".record-page-body");
  const records = readRunRecords().slice(0, RUN_RECORD_MAX);
  if(!records.length){
    body.innerHTML = '<p class="record-page-empty">아직 완료된 기록이 없습니다.</p>';
    return;
  }

  body.innerHTML = records.map((record, index) => {
    /* 패배 표기는 노출하지 않는다 (기획 요청). 승리(클리어)만 결과 라벨로 보여준다. */
    const resultLabel = record.result === "win" ? "클리어" : "";
    const date = record.createdAt ? new Date(record.createdAt).toLocaleDateString("ko-KR") : "";
    const statusText = resultLabel ? (resultLabel + (date ? ' · ' + date : '')) : date;
    const playTimeMs = record.snapshot && record.snapshot.playTimeMs;
    const playTimeText = typeof playTimeMs === "number" && typeof formatRrPlayTime === "function"
      ? formatRrPlayTime(playTimeMs)
      : "";
    return '<button type="button" class="record-page-item">' +
      '<div class="record-page-rank">' + (index + 1) + '</div>' +
      '<div class="record-page-main">' +
        '<strong>' + (record.floor || "신령의 은혜") + ' ' + (record.turn || 1) + '턴</strong>' +
        '<span>' + statusText + '</span>' +
      '</div>' +
      (playTimeText ? '<div class="record-page-playtime">⏳ ' + playTimeText + '</div>' : '') +
      '<div class="record-page-chevron" aria-hidden="true">›</div>' +
    '</button>';
  }).join("");

  body.querySelectorAll(".record-page-item").forEach((item, index) => {
    item.addEventListener("click", () => {
      if(body.dataset.recordPageDragged === "1") return;
      openRecordDetailOverlay(records[index]);
    });
  });

  enableRecordPageDragScroll(body);
}

function injectRecordPageStyles(){
  if(document.getElementById("recordPageStyle")) return;
  const style = document.createElement("style");
  style.id = "recordPageStyle";
  style.textContent =
    '.record-page-overlay{position:absolute;inset:0;z-index:230;display:none;place-items:center;background:rgba(10,20,40,.58);backdrop-filter:blur(.5cqh);}' +
    '.record-page-overlay.show{display:grid;}' +
    '.record-page-panel{width:min(66cqw,96cqh);max-height:80cqh;display:flex;flex-direction:column;box-sizing:border-box;padding:3.3cqh 3.4cqw 3cqh;background:transparent url("assets/ui_panels/codex_section_panel.png") center/100% 100% no-repeat;border:0;border-radius:0;box-shadow:0 2cqh 6cqh rgba(0,0,0,.28);overflow:hidden;color:var(--c-ink);}' +
    '.record-page-head{display:flex;align-items:center;justify-content:center;position:relative;padding:.15cqh 4.8cqh 1.35cqh;border-bottom:.16cqh solid rgba(201,164,91,.52);}' +
    '.record-page-head h2{font-size:3.2cqh;margin:0;font-weight:900;letter-spacing:.08em;color:#6b4628;text-shadow:0 .12cqh 0 rgba(255,255,255,.9);}' +
    '.record-page-close{position:absolute;right:-.55cqh;top:-1.05cqh;width:4.7cqh;height:4.7cqh;border:0;background:transparent url("assets/ui_buttons/close.png") center/contain no-repeat;color:transparent;font-size:0;cursor:pointer;line-height:1;}' +
    '.record-page-body{min-height:20cqh;max-height:44cqh;padding:1.6cqh .6cqw .2cqh;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;display:grid;gap:1cqh;align-content:start;cursor:grab;touch-action:pan-y;' +
      'scrollbar-width:thin;scrollbar-color:rgba(180,132,44,.85) rgba(255,255,255,.3);}' +
    '.record-page-body.record-page-dragging{cursor:grabbing;}' +
    '.record-page-body::-webkit-scrollbar{width:.6cqh;}' +
    '.record-page-body::-webkit-scrollbar-track{background:rgba(255,255,255,.3);border-radius:1cqh;}' +
    '.record-page-body::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#d4a030,#a8791a);border-radius:1cqh;border:.08cqh solid rgba(255,255,255,.5);}' +
    '.record-page-body::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#e7b54a,#c0902a);}' +
    '.record-page-empty{align-self:center;padding:6cqh 1cqw;text-align:center;font-size:2cqh;font-weight:900;color:var(--c-ink-soft);}' +
    '.record-page-item{display:flex;align-items:center;gap:1cqw;width:100%;min-height:7cqh;padding:1cqh 1.15cqw;border:.14cqh solid rgba(201,164,91,.58);border-radius:1cqh;background:rgba(255,250,238,.74);box-shadow:inset 0 0 0 .08cqh rgba(255,255,255,.72);font:inherit;text-align:left;cursor:inherit;transition:transform .12s,filter .12s;}' +
    '.record-page-item:hover{transform:translateY(-.15cqh);filter:brightness(1.03);}' +
    '.record-page-item:active{transform:scale(.985);}' +
    '.record-page-rank{flex:none;width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;background:#d6a95b;color:#fff;font-size:1.8cqh;font-weight:900;box-shadow:inset 0 -.2cqh .45cqh rgba(83,49,12,.24);}' +
    '.record-page-main{flex:1;min-width:0;display:grid;gap:.25cqh;}' +
    '.record-page-main strong{font-size:2.2cqh;line-height:1.1;color:#52371f;}' +
    '.record-page-main span{font-size:1.45cqh;font-weight:800;color:var(--c-ink-soft);min-height:1.45cqh;}' +
    '.record-page-playtime{flex:none;font-size:1.5cqh;font-weight:800;color:#8a6a3a;white-space:nowrap;}' +
    '.record-page-chevron{flex:none;font-size:2.4cqh;font-weight:900;color:rgba(201,164,91,.85);}';
  document.head.appendChild(style);
}

/* ── 기록 상세 오버레이 (여정 요약/상세, 읽기 전용) ─────────────────────────
   runResultUI.js의 rr-overlay/rr-summary-panel/rr-detail-panel 스타일과 헬퍼
   함수(rrRouteNodeHtml 등)를 그대로 재사용하되, 달빛 조각 수령 버튼이나
   "메인 메뉴로 돌아가기"(세이브 삭제) 같은 실행 중 전용 동작은 넣지 않는다.
   과거 기록을 다시 볼 때 보상을 재수령하거나 현재 진행 중인 세이브가
   지워지면 안 되기 때문이다. */
function openRecordDetailOverlay(record){
  const snapshot = record && record.snapshot;
  if(!snapshot){
    if(typeof toast === "function") toast("상세 정보가 없는 기록입니다.");
    return;
  }
  if(typeof ensureRrOverlay !== "function") return;
  injectRecordDetailStyles();
  renderRecordSummaryReadOnly(snapshot);
}

function renderRecordSummaryReadOnly(snapshot){
  const overlay = ensureRrOverlay();
  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  if(characterWrap) characterWrap.innerHTML = "";

  const cleared = snapshot.cleared || {};
  const rows = [
    { icon:"🏆", label:"최종 여정 점수",   value:snapshot.totalScore || 0,      unit:"점" },
    { icon:"🗼", label:"진행한 구역 수",   value:snapshot.highestFloor || 0,    unit:"층" },
    { icon:"💀", label:"클리어 보스 수",   value:cleared.boss || 0,             unit:"개" },
    { icon:"👺", label:"클리어 노멀 수",   value:cleared.enemy || 0,            unit:"개" },
    { icon:"👹", label:"클리어 엘리트 수", value:cleared.elite || 0,            unit:"개" },
    { icon:"🏺", label:"수집한 법구 수",   value:snapshot.relicCount || 0,      unit:"개" },
    { icon:"🧪", label:"사용한 약병 수",   value:snapshot.usedPotionCount || 0, unit:"개" }
  ];

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-summary-panel">' +
      '<button type="button" class="record-detail-close" aria-label="닫기">✕</button>' +
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
      '<button type="button" class="rr-summary-next" id="rrRecordSummaryNext">상세 보기</button>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  panelSlot.querySelector("#rrRecordSummaryNext").addEventListener("click", (event) => {
    event.stopPropagation();
    renderRecordDetailReadOnly(snapshot);
  });
  panelSlot.querySelector(".record-detail-close").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRrOverlay();
  });
}

function renderRecordDetailReadOnly(snapshot){
  const overlay = ensureRrOverlay();
  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  if(characterWrap) characterWrap.innerHTML = "";

  const route = Array.isArray(snapshot.route) ? snapshot.route : [];
  const relics = Array.isArray(snapshot.relics) ? snapshot.relics : [];
  const potions = Array.isArray(snapshot.usedPotions) ? snapshot.usedPotions : [];

  const routeHtml = route.length
    ? route.map((node, index) =>
        rrRouteNodeHtml(node) + (index < route.length - 1 ? '<div class="rr-route-arrow">→</div>' : '')
      ).join("")
    : '<div class="rr-empty-text">기록 없음</div>';

  const relicTrackHtml = relics.length
    ? relics.map(relic => rrItemCardHtml(relic.iconImage || relic.emoji, relic.name)).join("")
    : '<div class="rr-empty-text">없음</div>';

  const potionTrackHtml = potions.length
    ? potions.map(potion => rrItemCardHtml(potion.iconImage || potion.emoji, potion.name, potion.count)).join("")
    : '<div class="rr-empty-text">없음</div>';

  const scoreBreakdown = snapshot.scoreBreakdown || {};
  const moonReward = snapshot.moonRewardPreview || {};
  const moonClaimText = snapshot.moonRewardClaim && snapshot.moonRewardClaim.claimed
    ? "🌙 " + (moonReward.moonShards || 0) + "개 수령 완료"
    : "🌙 " + (moonReward.moonShards || 0) + "개 (당시 획득 예정량)";

  const scoreDetailHtml =
    '<div class="rr-score-breakdown">' +
      '<div class="rr-score-breakdown-title">여정 점수 상세</div>' +
      '<div class="rr-score-breakdown-grid">' +
        '<div><span>구역 진행</span><strong>' + (scoreBreakdown.nodeProgress || 0) + '점</strong></div>' +
        '<div><span>ACT1 완주</span><strong>' + (scoreBreakdown.act1Clear || 0) + '점</strong></div>' +
        '<div><span>몬스터 처치</span><strong>' + (scoreBreakdown.monsterKill || 0) + '점</strong></div>' +
        '<div><span>전투 수행</span><strong>' + (scoreBreakdown.combatPerformance || 0) + '점</strong></div>' +
        '<div><span>보스 종료 상태</span><strong>' + (scoreBreakdown.bossEndHp || 0) + '점</strong></div>' +
        '<div><span>여정 행동</span><strong>' + (scoreBreakdown.journeyAction || 0) + '점</strong></div>' +
      '</div>' +
      '<div class="rr-score-reward-line">' +
        '<span>최종 ' + (snapshot.totalScore || 0) + '점</span>' +
        '<strong>' + escapeRrHtml(moonClaimText) + '</strong>' +
      '</div>' +
    '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-detail-panel">' +
      '<button type="button" class="record-detail-close" aria-label="닫기">✕</button>' +
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
          '<div class="rr-detail-tile">' +
            '<div class="rr-detail-tile-icon">🃏</div>' +
            '<div class="rr-detail-tile-body">' +
              '<div class="rr-detail-tile-label">수집한 주문 수</div>' +
              '<div class="rr-detail-tile-value">' + (snapshot.deckCount || 0) + '장</div>' +
            '</div>' +
          '</div>' +
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
      '<button type="button" class="rr-detail-finish" id="rrRecordDetailClose">닫기</button>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("result-ui-open");

  if(typeof rrInitDragScroll === "function") rrInitDragScroll(panelSlot);

  panelSlot.querySelector("#rrRecordDetailClose").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRrOverlay();
  });
  panelSlot.querySelector(".record-detail-close").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRrOverlay();
  });
}

function injectRecordDetailStyles(){
  if(document.getElementById("recordDetailStyle")) return;
  const style = document.createElement("style");
  style.id = "recordDetailStyle";
  style.textContent =
    '.record-detail-close{position:absolute;top:.7cqh;right:.7cqh;width:3.4cqh;height:3.4cqh;border-radius:50%;' +
      'border:.14cqh solid rgba(232,200,116,.75);background:rgba(0,0,0,.28);color:#fbe9c8;font-size:1.6cqh;' +
      'font-weight:900;line-height:1;cursor:pointer;display:grid;place-items:center;z-index:2;}' +
    '.record-detail-close:hover{background:rgba(0,0,0,.4);}';
  document.head.appendChild(style);
}

document.querySelectorAll(".start-record-button").forEach(button => {
  button.addEventListener("click", openRecordPage);
});
