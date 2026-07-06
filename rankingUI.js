"use strict";
/* =========================================================================
   Ranking UI
   - Ranking overlay: all-time / weekly / daily tabs + my-ranking lookup.
   - 열릴 때/탭을 바꿀 때마다 항상 서버에서 최신 데이터를 조회한다 (캐시 없음).
   - 데이터는 rankingService.js에서 가져온다.
   ========================================================================= */

const RANKING_TABS = [
  { period: "all", label: "역대 랭킹" },
  { period: "weekly", label: "주간 랭킹" },
  { period: "daily", label: "일일 랭킹" }
];

const RANKING_NOTICE_TEXT = "여정이 끝나면 점수가 즉시 랭킹에 반영됩니다.";
const RANKING_MAX_ROWS = 100;

let rankingActivePeriod = "all";

function isRankingOpen(){
  const overlay = document.getElementById("rankingPageOverlay");
  return !!(overlay && overlay.classList.contains("show"));
}

function refreshCurrentRankingTab(){
  const overlay = document.getElementById("rankingPageOverlay");
  if(!overlay) return;
  renderRankingTab(overlay, rankingActivePeriod);
}

window.addEventListener("viberun:ranking-updated", () => {
  if(!isRankingOpen()) return;
  refreshCurrentRankingTab();
});

function openRankingPage(){
  let overlay = document.getElementById("rankingPageOverlay");
  if(!overlay) overlay = buildRankingPage();
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  renderRankingTab(overlay, rankingActivePeriod);
}

function closeRankingPage(){
  const overlay = document.getElementById("rankingPageOverlay");
  if(!overlay) return;
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}

function buildRankingPage(){
  injectRankingPageStyles();
  const overlay = document.createElement("div");
  overlay.id = "rankingPageOverlay";
  overlay.className = "ranking-page-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="ranking-page-panel" role="dialog" aria-modal="true" aria-labelledby="rankingPageTitle">' +
      '<div class="ranking-page-head">' +
        '<h2 id="rankingPageTitle">랭킹</h2>' +
        '<button type="button" class="ranking-page-close" aria-label="닫기">닫기</button>' +
      '</div>' +
      '<div class="ranking-page-tabs">' +
        RANKING_TABS.map(tab =>
          '<button type="button" class="ranking-page-tab" data-period="' + tab.period + '">' + tab.label + '</button>'
        ).join("") +
      '</div>' +
      '<div class="ranking-page-meta">' + RANKING_NOTICE_TEXT + '</div>' +
      '<div class="ranking-page-body"></div>' +
      '<button type="button" class="ranking-page-my-button">내 랭킹 확인</button>' +
      '<div class="ranking-page-my-result"></div>' +
    '</div>';

  overlay.querySelector(".ranking-page-close").addEventListener("click", closeRankingPage);
  overlay.addEventListener("click", event => {
    if(event.target === overlay) closeRankingPage();
  });
  overlay.querySelectorAll(".ranking-page-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      rankingActivePeriod = tab.dataset.period;
      overlay.querySelector(".ranking-page-my-result").innerHTML = "";
      renderRankingTab(overlay, rankingActivePeriod);
    });
  });
  overlay.querySelector(".ranking-page-my-button").addEventListener("click", () => {
    handleMyRankingClick(overlay);
  });

  setupRankingBodyDragScroll(overlay.querySelector(".ranking-page-body"));

  document.getElementById("game").appendChild(overlay);
  return overlay;
}

function renderRankingTab(overlay, period){
  overlay.querySelectorAll(".ranking-page-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.period === period);
  });

  const body = overlay.querySelector(".ranking-page-body");
  body.innerHTML = '<p class="ranking-page-empty">불러오는 중...</p>';

  const service = window.VIBERUN_RANKING_SERVICE;
  if(!service){
    body.innerHTML = '<p class="ranking-page-empty">랭킹 데이터 연결 전입니다.</p>';
    return;
  }

  service.fetchRanking(period).then(response => {
    if(rankingActivePeriod !== period) return;
    renderRankingRows(body, response);
  });
}

function renderRankingRows(body, response){
  if(!response || !response.ok){
    body.innerHTML = '<p class="ranking-page-empty">' +
      escapeRankingHtml((response && response.message) || "랭킹을 불러오지 못했습니다.") +
      '</p>';
    return;
  }

  const rows = (Array.isArray(response.rows) ? response.rows : []).slice(0, RANKING_MAX_ROWS);
  if(!rows.length){
    body.innerHTML = '<p class="ranking-page-empty">아직 랭킹 데이터가 없습니다.</p>';
    return;
  }

  body.innerHTML = rows.map((row, index) => {
    const playTime = formatRankingPlayTime(row.playTimeMs);
    return '<div class="ranking-page-item">' +
      '<div class="ranking-page-rank">' + (index + 1) + '</div>' +
      '<div class="ranking-page-name">' + escapeRankingHtml(row.nickname || "익명") + '</div>' +
      '<div class="ranking-page-time">' + playTime + '</div>' +
      '<div class="ranking-page-score">' + (row.score || 0) + '점</div>' +
    '</div>';
  }).join("");
}

function handleMyRankingClick(overlay){
  const auth = window.VIBERUN_AUTH;
  const isLoggedIn = !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());

  if(!isLoggedIn){
    if(auth && typeof auth.requireLogin === "function"){
      auth.requireLogin(() => handleMyRankingClick(overlay));
    }
    return;
  }

  const resultBox = overlay.querySelector(".ranking-page-my-result");
  resultBox.textContent = "내 랭킹을 확인하는 중...";

  const service = window.VIBERUN_RANKING_SERVICE;
  if(!service || typeof service.fetchMyRanking !== "function"){
    resultBox.textContent = "랭킹 데이터 연결 전입니다.";
    return;
  }

  service.fetchMyRanking(rankingActivePeriod).then(response => {
    if(!response || !response.ok){
      resultBox.textContent = (response && response.message) || "내 랭킹을 불러오지 못했습니다.";
      return;
    }

    const myRank = response.myRank;
    if(!myRank){
      resultBox.textContent = "아직 랭킹에 등록된 기록이 없습니다.";
      return;
    }

    resultBox.textContent =
      "내 순위: " + myRank.rank + "위 · " + (myRank.score || 0) + "점 · " +
      formatRankingPlayTime(myRank.playTimeMs);
  });
}

function setupRankingBodyDragScroll(body){
  if(!body || body.dataset.dragScrollBound) return;
  body.dataset.dragScrollBound = "1";

  let dragging = false;
  let startY = 0;
  let startScrollTop = 0;
  let moved = false;

  const onMove = event => {
    if(!dragging) return;
    const deltaY = event.clientY - startY;
    if(Math.abs(deltaY) > 3) moved = true;
    body.scrollTop = startScrollTop - deltaY;
  };

  const onUp = () => {
    if(!dragging) return;
    dragging = false;
    body.classList.remove("dragging");
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  };

  body.addEventListener("mousedown", event => {
    dragging = true;
    moved = false;
    startY = event.clientY;
    startScrollTop = body.scrollTop;
    body.classList.add("dragging");
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  body.addEventListener("click", event => {
    if(moved) event.stopPropagation();
  }, true);
}

function formatRankingPlayTime(playTimeMs){
  if(!playTimeMs) return "0:00";
  const totalSeconds = Math.floor(playTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

function escapeRankingHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function injectRankingPageStyles(){
  if(document.getElementById("rankingPageStyle")) return;
  const style = document.createElement("style");
  style.id = "rankingPageStyle";
  style.textContent =
    '.ranking-page-overlay{position:absolute;inset:0;z-index:230;display:none;place-items:center;background:rgba(10,20,40,.58);backdrop-filter:blur(.5cqh);}' +
    '.ranking-page-overlay.show{display:grid;}' +
    '.ranking-page-panel{width:min(66cqw,96cqh);max-height:82cqh;display:flex;flex-direction:column;box-sizing:border-box;padding:3.3cqh 3.4cqw 3cqh;background:transparent url("assets/ui/dialog_panel.png") center/115% 122% no-repeat;border:0;border-radius:0;box-shadow:0 2cqh 6cqh rgba(0,0,0,.28);overflow:hidden;color:var(--c-ink);}' +
    '.ranking-page-head{display:flex;align-items:center;justify-content:center;position:relative;padding:.15cqh 4.8cqh 1.35cqh;border-bottom:.16cqh solid rgba(201,164,91,.52);}' +
    '.ranking-page-head h2{font-size:3.2cqh;margin:0;font-weight:900;letter-spacing:.08em;color:#6b4628;text-shadow:0 .12cqh 0 rgba(255,255,255,.9);}' +
    '.ranking-page-close{position:absolute;right:-.55cqh;top:-1.05cqh;width:4.7cqh;height:4.7cqh;border:0;background:transparent url("assets/ui_buttons/close.png") center/contain no-repeat;color:transparent;font-size:0;cursor:pointer;line-height:1;}' +
    '.ranking-page-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:.8cqw;margin-top:1.5cqh;}' +
    '.ranking-page-tab{border:.2cqh solid rgba(201,164,91,.52);border-radius:1cqh;background:rgba(255,255,255,.72);color:var(--c-ink-soft);font-family:var(--font-title);font-size:1.9cqh;font-weight:900;padding:1cqh 0;cursor:pointer;}' +
    '.ranking-page-tab.active{background:#d6a95b;color:#fff;border-color:#d6a95b;}' +
    '.ranking-page-meta{margin-top:1.2cqh;font-size:1.4cqh;font-weight:700;color:var(--c-ink-soft);text-align:center;min-height:2cqh;}' +
    '.ranking-page-body{height:28cqh;max-height:28cqh;padding:1.6cqh .6cqw .2cqh;overflow-y:auto;overflow-x:hidden;display:grid;gap:.7cqh;align-content:start;cursor:grab;user-select:none;}' +
    '.ranking-page-body.dragging{cursor:grabbing;}' +
    '.ranking-page-empty{align-self:center;padding:6cqh 1cqw;text-align:center;font-size:2cqh;font-weight:900;color:var(--c-ink-soft);}' +
    '.ranking-page-item{display:grid;grid-template-columns:4.2cqh 1fr auto auto;align-items:center;gap:1cqw;min-height:6cqh;padding:1cqh 1.15cqw;border:.14cqh solid rgba(201,164,91,.58);border-radius:1cqh;background:rgba(255,250,238,.74);box-shadow:inset 0 0 0 .08cqh rgba(255,255,255,.72);}' +
    '.ranking-page-rank{width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;background:#d6a95b;color:#fff;font-size:1.8cqh;font-weight:900;box-shadow:inset 0 -.2cqh .45cqh rgba(83,49,12,.24);}' +
    '.ranking-page-name{min-width:0;font-size:2cqh;font-weight:900;color:#52371f;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.ranking-page-time{font-size:1.45cqh;font-weight:800;color:var(--c-ink-soft);white-space:nowrap;}' +
    '.ranking-page-score{font-size:1.6cqh;font-weight:900;color:#6b4628;white-space:nowrap;}' +
    '.ranking-page-my-button{margin-top:1.2cqh;height:6cqh;border:.24cqh solid rgba(201,164,91,.72);border-radius:1.2cqh;background:linear-gradient(180deg, rgba(255,250,238,.96), rgba(239,211,151,.94));color:#6b4628;font-family:var(--font-title);font-size:2.1cqh;font-weight:900;cursor:pointer;}' +
    '.ranking-page-my-button:hover{border-color:var(--c-gold);}' +
    '.ranking-page-my-result{margin-top:1cqh;min-height:2cqh;text-align:center;font-size:1.45cqh;font-weight:800;color:#52371f;}';
  document.head.appendChild(style);
}

document.querySelectorAll(".start-ranking-button").forEach(button => {
  button.addEventListener("click", openRankingPage);
});
