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
        '<button type="button" class="record-page-close" aria-label="닫기">×</button>' +
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
    '.record-page-panel{width:min(54cqw,78cqh);max-height:78cqh;display:flex;flex-direction:column;background:rgba(255,255,255,.96);border:.28cqh solid var(--c-panel-line);border-radius:1.4cqh;box-shadow:0 2cqh 6cqh rgba(0,0,0,.34);overflow:hidden;color:var(--c-ink);}' +
    '.record-page-head{display:flex;align-items:center;justify-content:space-between;padding:1.6cqh 1.8cqw;border-bottom:.18cqh solid var(--c-panel-line);}' +
    '.record-page-head h2{font-size:2.8cqh;margin:0;font-weight:900;}' +
    '.record-page-close{width:4cqh;height:4cqh;border-radius:50%;border:.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:2.2cqh;font-weight:900;cursor:pointer;line-height:1;}' +
    '.record-page-body{padding:1.4cqh 1.5cqw;overflow:auto;display:grid;gap:1cqh;}' +
    '.record-page-empty{padding:6cqh 1cqw;text-align:center;font-size:2cqh;font-weight:900;color:var(--c-ink-soft);}' +
    '.record-page-item{display:flex;align-items:center;gap:1cqw;padding:1.1cqh 1cqw;border:.18cqh solid var(--c-panel-line);border-radius:1cqh;background:linear-gradient(180deg,#fff,#eef6ff);}' +
    '.record-page-rank{width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;background:var(--c-blue);color:#fff;font-size:1.8cqh;font-weight:900;}' +
    '.record-page-main{min-width:0;display:grid;gap:.25cqh;}' +
    '.record-page-main strong{font-size:2.2cqh;line-height:1.1;}' +
    '.record-page-main span{font-size:1.45cqh;font-weight:800;color:var(--c-ink-soft);}';
  document.head.appendChild(style);
}

document.querySelectorAll(".start-record-button").forEach(button => {
  button.addEventListener("click", openRecordPage);
});
