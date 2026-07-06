"use strict";
/* =========================================================================
   Ranking UI
   - Ranking overlay: all-time / weekly / daily tabs + my-ranking lookup.
   - Data comes from rankingService.js (mock until the backend is wired up).
   ========================================================================= */

const RANKING_TABS = [
  { period: "all", label: "역대 랭킹" },
  { period: "weekly", label: "주간 랭킹" },
  { period: "daily", label: "일일 랭킹" }
];

let rankingActivePeriod = "all";

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
      '<div class="ranking-page-meta"></div>' +
      '<div class="ranking-page-body"></div>' +
      '<button type="button" class="ranking-page-my-button">내 랭킹 확인</button>' +
    '</div>';

  overlay.querySelector(".ranking-page-close").addEventListener("click", closeRankingPage);
  overlay.addEventListener("click", event => {
    if(event.target === overlay) closeRankingPage();
  });
  overlay.querySelectorAll(".ranking-page-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      rankingActivePeriod = tab.dataset.period;
      renderRankingTab(overlay, rankingActivePeriod);
    });
  });
  overlay.querySelector(".ranking-page-my-button").addEventListener("click", () => {
    handleMyRankingClick(overlay);
  });

  document.getElementById("game").appendChild(overlay);
  return overlay;
}

function renderRankingTab(overlay, period){
  overlay.querySelectorAll(".ranking-page-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.period === period);
  });

  const meta = overlay.querySelector(".ranking-page-meta");
  const body = overlay.querySelector(".ranking-page-body");
  meta.textContent = "불러오는 중...";
  body.innerHTML = "";

  const service = window.VIBERUN_RANKING_SERVICE;
  if(!service){
    meta.textContent = "";
    body.innerHTML = '<p class="ranking-page-empty">랭킹 데이터 연결 전입니다.</p>';
    return;
  }

  service.fetchRanking(period).then(response => {
    if(rankingActivePeriod !== period) return;
    renderRankingMeta(meta, response);
    renderRankingRows(body, response);
  });
}

function renderRankingMeta(meta, response){
  if(!response || !response.lastUpdatedAt){
    meta.textContent = "";
    return;
  }
  const updated = formatRankingTimestamp(response.lastUpdatedAt);
  const minutesLeft = Math.max(0, Math.round((response.nextUpdateAt - Date.now()) / 60000));
  meta.textContent = "최근 갱신: " + updated + " · 다음 갱신: 약 " + minutesLeft + "분 후";
}

function renderRankingRows(body, response){
  const rows = response && Array.isArray(response.rows) ? response.rows : [];
  if(!rows.length){
    body.innerHTML = '<p class="ranking-page-empty">아직 랭킹 데이터가 없습니다.</p>';
    return;
  }

  body.innerHTML = rows.map((row, index) => {
    const playTime = formatRankingPlayTime(row.playTimeMs);
    const achievedAt = row.achievedAt ? formatRankingTimestamp(row.achievedAt) : "";
    return '<div class="ranking-page-item">' +
      '<div class="ranking-page-rank">' + (index + 1) + '</div>' +
      '<div class="ranking-page-main">' +
        '<strong>' + (row.nickname || "익명") + '</strong>' +
        '<span>' + (row.score || 0) + '점 · ' + playTime + (achievedAt ? ' · ' + achievedAt : '') + '</span>' +
      '</div>' +
    '</div>';
  }).join("");
}

function handleMyRankingClick(overlay){
  const auth = window.VIBERUN_AUTH;
  const isLoggedIn = !!(auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn());

  if(!isLoggedIn && auth && typeof auth.requireLogin === "function"){
    auth.requireLogin(() => handleMyRankingClick(overlay));
    return;
  }

  const meta = overlay.querySelector(".ranking-page-meta");
  meta.textContent = "랭킹 데이터 연결 전입니다.";
}

function formatRankingTimestamp(timestamp){
  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR") + " " +
    String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
}

function formatRankingPlayTime(playTimeMs){
  if(!playTimeMs) return "0:00";
  const totalSeconds = Math.floor(playTimeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
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
    '.ranking-page-body{min-height:28cqh;padding:1.6cqh .6cqw .2cqh;overflow:auto;display:grid;gap:1cqh;}' +
    '.ranking-page-empty{align-self:center;padding:6cqh 1cqw;text-align:center;font-size:2cqh;font-weight:900;color:var(--c-ink-soft);}' +
    '.ranking-page-item{display:flex;align-items:center;gap:1cqw;min-height:7cqh;padding:1cqh 1.15cqw;border:.14cqh solid rgba(201,164,91,.58);border-radius:1cqh;background:rgba(255,250,238,.74);box-shadow:inset 0 0 0 .08cqh rgba(255,255,255,.72);}' +
    '.ranking-page-rank{width:4.2cqh;height:4.2cqh;border-radius:50%;display:grid;place-items:center;background:#d6a95b;color:#fff;font-size:1.8cqh;font-weight:900;box-shadow:inset 0 -.2cqh .45cqh rgba(83,49,12,.24);}' +
    '.ranking-page-main{min-width:0;display:grid;gap:.25cqh;}' +
    '.ranking-page-main strong{font-size:2.2cqh;line-height:1.1;color:#52371f;}' +
    '.ranking-page-main span{font-size:1.45cqh;font-weight:800;color:var(--c-ink-soft);}' +
    '.ranking-page-my-button{margin-top:1.2cqh;height:6cqh;border:.24cqh solid rgba(201,164,91,.72);border-radius:1.2cqh;background:linear-gradient(180deg, rgba(255,250,238,.96), rgba(239,211,151,.94));color:#6b4628;font-family:var(--font-title);font-size:2.1cqh;font-weight:900;cursor:pointer;}' +
    '.ranking-page-my-button:hover{border-color:var(--c-gold);}';
  document.head.appendChild(style);
}

document.querySelectorAll(".start-ranking-button").forEach(button => {
  button.addEventListener("click", openRankingPage);
});
