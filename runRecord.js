"use strict";
/* =========================================================================
   Run Records
   - Stores completed run records and renders the record page.
   ========================================================================= */

const RUN_RECORD_KEY = "viberunRunRecords";

function saveCompletedRunRecord(result){
  if(!S || S.recordSaved) return;
  const completed = result === "lose" || (result === "win" && typeof hasNextTier === "function" && !hasNextTier());
  if(!completed) return;

  S.recordSaved = true;
  if(typeof localStorage === "undefined") return;

  try {
    const records = readRunRecords();
    records.unshift({
      id: Date.now(),
      result,
      floor: getRunRecordFloor(),
      turn: S.turn || 1,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(RUN_RECORD_KEY, JSON.stringify(records));
  } catch(error) {}
}

function readRunRecords(){
  if(typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RUN_RECORD_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch(error) {
    return [];
  }
}

function getRunRecordFloor(){
  if(typeof getCurrentNodeId === "function" && typeof nodeFloorIdx === "function"){
    const floorIndex = nodeFloorIdx(getCurrentNodeId());
    if(floorIndex > 0) return floorIndex + "층";
  }

  const hudFloor = document.getElementById("hudFloor");
  const match = hudFloor ? hudFloor.textContent.match(/(\d+)\s*F/i) : null;
  if(match) return match[1] + "층";
  return "신령의 은혜";
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
  const records = readRunRecords();
  if(!records.length){
    body.innerHTML = '<p class="record-page-empty">아직 완료된 기록이 없습니다.</p>';
    return;
  }

  body.innerHTML = records.map((record, index) => {
    const resultLabel = record.result === "win" ? "클리어" : "패배";
    const date = record.createdAt ? new Date(record.createdAt).toLocaleDateString("ko-KR") : "";
    return '<div class="record-page-item">' +
      '<div class="record-page-rank">' + (index + 1) + '</div>' +
      '<div class="record-page-main">' +
        '<strong>' + (record.floor || "신령의 은혜") + ' ' + (record.turn || 1) + '턴</strong>' +
        '<span>' + resultLabel + (date ? ' · ' + date : '') + '</span>' +
      '</div>' +
    '</div>';
  }).join("");
}

function injectRecordPageStyles(){
  if(document.getElementById("recordPageStyle")) return;
  const style = document.createElement("style");
  style.id = "recordPageStyle";
  style.textContent =
    '.record-page-overlay{position:absolute;inset:0;z-index:230;display:none;place-items:center;background:rgba(10,20,40,.58);backdrop-filter:blur(.5cqh);}' +
    '.record-page-overlay.show{display:grid;}' +
    '.record-page-panel{width:min(66cqw,96cqh);max-height:80cqh;display:flex;flex-direction:column;box-sizing:border-box;padding:3.3cqh 3.4cqw 3cqh;background:transparent url("assets/ui/dialog_panel.png") center/115% 122% no-repeat;border:0;border-radius:0;box-shadow:0 2cqh 6cqh rgba(0,0,0,.28);overflow:hidden;color:var(--c-ink);}' +
    '.record-page-head{display:flex;align-items:center;justify-content:center;position:relative;padding:.15cqh 4.8cqh 1.35cqh;border-bottom:.16cqh solid rgba(201,164,91,.52);}' +
    '.record-page-head h2{font-size:3.2cqh;margin:0;font-weight:900;letter-spacing:.08em;color:#6b4628;text-shadow:0 .12cqh 0 rgba(255,255,255,.9);}' +
    '.record-page-close{position:absolute;right:-.55cqh;top:-1.05cqh;width:4.7cqh;height:4.7cqh;border:0;background:transparent url("assets/ui_buttons/close.png") center/contain no-repeat;color:transparent;font-size:0;cursor:pointer;line-height:1;}' +
    '.record-page-body{min-height:28cqh;padding:1.6cqh .6cqw .2cqh;overflow:auto;display:grid;gap:1cqh;}' +
    '.record-page-empty{align-self:center;padding:6cqh 1cqw;text-align:center;font-size:2cqh;font-weight:900;color:var(--c-ink-soft);}' +
    '.record-page-item{display:flex;align-items:center;gap:1cqw;min-height:7cqh;padding:1cqh 1.15cqw;border:.14cqh solid rgba(201,164,91,.58);border-radius:1cqh;background:rgba(255,250,238,.74);box-shadow:inset 0 0 0 .08cqh rgba(255,255,255,.72);}' +
    '.record-page-rank{width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;background:#d6a95b;color:#fff;font-size:1.8cqh;font-weight:900;box-shadow:inset 0 -.2cqh .45cqh rgba(83,49,12,.24);}' +
    '.record-page-main{min-width:0;display:grid;gap:.25cqh;}' +
    '.record-page-main strong{font-size:2.2cqh;line-height:1.1;color:#52371f;}' +
    '.record-page-main span{font-size:1.45cqh;font-weight:800;color:var(--c-ink-soft);}';
  document.head.appendChild(style);
}

document.querySelectorAll(".start-record-button").forEach(button => {
  button.addEventListener("click", openRecordPage);
});
