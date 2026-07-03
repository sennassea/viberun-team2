"use strict";
/* =========================================================================
   최종 승리 / 패배 결과 UI (runResult.js)
   기획서: 최종 승리 / 패배 UI 구현 기획서

   현재 구현 범위:
   - 승리: ① 신령의 은혜 신령 출현 연출 → ② 동자승의 끝없는 여정 선택 화면
     → ③ 전투 요약 화면
   - 패배: 동자승 패배 연출은 아직 없으므로 결과 즉시 ③ 전투 요약 화면으로
     진입한다.
   전투 상세 화면은 이후 단계에서 추가한다.
   이 파일이 처리하지 못하는 결과는 endGame()의 기존 종료 UI로 폴백된다.

   script.js / startBlessing.js 이후에 로드되어야 한다.
   ========================================================================= */

/* ── 동자승 NPC 데이터 (기획서 §5-3) ────────────────────────────────────────
   동자승 에셋이 아직 없으므로 emoji로 임시 대체한다. */
const NPC_DONGJASEUNG = {
  id: "npc_dongjaseung",
  name: "동자승",
  emoji: "🧘",
  endlessTitle: "끝없는 여정 선택",
  endlessLine1: "아가, 아직도 많은 미련들이 남아 있단다.",
  endlessLine2: "끝없는 여정을 떠나보겠느냐?",
  endlessLine3: "더 깊은 곳으로 나아가 볼까?",
  defeatTitle: "패배",
  defeatLine1: "저런, 안타깝다~",
  defeatLine2: "더 잘 해보지 그랬느냐?"
};

let rrOverlayEl = null;

/* ── DOM 생성 ────────────────────────────────────────────────────────────── */
function ensureRrOverlay(){
  if(rrOverlayEl) return rrOverlayEl;
  ensureRrStyles();

  const overlay = document.createElement("div");
  overlay.id = "runResultOverlay";
  overlay.className = "rr-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML =
    '<div class="rr-backdrop"></div>' +
    '<div class="rr-frame">' +
      '<div class="rr-character-wrap" id="rrCharacterWrap"></div>' +
      '<div class="rr-panel-slot" id="rrPanelSlot"></div>' +
    '</div>';

  (document.querySelector("#game") || document.body).appendChild(overlay);
  rrOverlayEl = overlay;
  return overlay;
}

function closeRrOverlay(){
  if(!rrOverlayEl) return;
  rrOverlayEl.classList.remove("show");
  rrOverlayEl.setAttribute("aria-hidden", "true");
}

/* ── 승리 연출: 신령의 은혜 신령 출현 ─────────────────────────────────────── */
function renderBlessingSpiritAppearance(spirit, snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = spirit.image
    ? '<img src="' + spirit.image + '" alt="' + (spirit.name || "") + '">'
    : '<div class="rr-character-emoji">' + (spirit.emoji || "") + '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-dialog-panel">' +
      '<div class="rr-badge"><span id="rrBadgeText">승리</span></div>' +
      '<div class="rr-lines" id="rrLines"></div>' +
      '<div class="rr-divider"></div>' +
      '<div class="rr-continue">✦ 터치하여 계속 ✦</div>' +
    '</div>';

  overlay.querySelector("#rrBadgeText").textContent = spirit.appearanceTitle || "승리";

  const dialogLines = (spirit.appearanceLines && spirit.appearanceLines.length)
    ? spirit.appearanceLines
    : [spirit.dialogue || ""];
  overlay.querySelector("#rrLines").innerHTML =
    dialogLines.map(line => '<p>' + line + '</p>').join("");

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  const handleContinue = (event) => {
    event.preventDefault();
    overlay.removeEventListener("click", handleContinue);
    renderEndlessJourneyChoice(NPC_DONGJASEUNG, snapshot, onFinish);
  };
  overlay.addEventListener("click", handleContinue);
}

/* ── 동자승: 끝없는 여정 선택 화면 (기획서 §3-1, §7-2) ────────────────────
   끝없는 여정은 아직 미개발이므로 딤드 처리하고, 기록 보고 종료만 다음
   단계(onFinish, 현재는 기존 종료 UI로 폴백)로 이어준다. */
function renderEndlessJourneyChoice(npc, snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = npc.image
    ? '<img src="' + npc.image + '" alt="' + (npc.name || "") + '">'
    : '<div class="rr-character-emoji">' + (npc.emoji || "") + '</div>';

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-choice-panel">' +
      '<div class="rr-choice-titlebar"><span>' + (npc.endlessTitle || "끝없는 여정 선택") + '</span></div>' +
      '<div class="rr-choice-lines">' +
        '<p class="rr-choice-line-main">' + npc.endlessLine1 + '</p>' +
        '<p>' + npc.endlessLine2 + '</p>' +
        '<p>' + npc.endlessLine3 + '</p>' +
      '</div>' +
      '<div class="rr-choice-cards">' +
        '<div class="rr-choice-card rr-choice-card--disabled" id="rrChoiceEndless" aria-disabled="true">' +
          '<div class="rr-choice-card-icon">🔒</div>' +
          '<div class="rr-choice-card-title">끝없는 여정 진입</div>' +
          '<div class="rr-choice-card-tag">준비 중</div>' +
          '<div class="rr-choice-card-desc">끝없는 여정은 아직 준비 중입니다.</div>' +
        '</div>' +
        '<div class="rr-choice-card rr-choice-card--active" id="rrChoiceFinish">' +
          '<div class="rr-choice-card-icon">📖</div>' +
          '<div class="rr-choice-card-title">여정 종료</div>' +
          '<div class="rr-choice-card-desc">이번 여정의 기록을 확인하고 돌아갑니다.</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  const endlessCard = panelSlot.querySelector("#rrChoiceEndless");
  const finishCard = panelSlot.querySelector("#rrChoiceFinish");

  endlessCard.addEventListener("click", (event) => {
    event.stopPropagation();
    endlessCard.classList.remove("rr-choice-card--shake");
    void endlessCard.offsetWidth;
    endlessCard.classList.add("rr-choice-card--shake");
  });

  finishCard.addEventListener("click", (event) => {
    event.stopPropagation();
    renderRunSummary(snapshot, onFinish);
  });
}

/* ── 전투 요약 화면 (기획서 §4-1, §10-1) ────────────────────────────────────
   승리: 끝없는 여정 선택에서 "여정 종료" 클릭 시 진입.
   패배: 동자승 패배 연출이 아직 없으므로 결과 직후 바로 진입한다. */
function renderRunSummary(snapshot, onFinish){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = "";

  const rows = [
    { icon:"🗼", label:"진행한 스테이지 수", value:snapshot.highestFloor, unit:"층" },
    { icon:"💀", label:"클리어 보스 수",     value:snapshot.cleared.boss,  unit:"개" },
    { icon:"👺", label:"클리어 일반 전투 수", value:snapshot.cleared.enemy, unit:"개" },
    { icon:"👹", label:"클리어 엘리트 수",    value:snapshot.cleared.elite, unit:"개" },
    { icon:"🏺", label:"수집한 법구 수",      value:snapshot.relicCount,    unit:"개" },
    { icon:"🧪", label:"사용한 약병 수",      value:snapshot.usedPotionCount, unit:"개" }
  ];

  const panelSlot = overlay.querySelector("#rrPanelSlot");
  panelSlot.innerHTML =
    '<div class="rr-summary-panel">' +
      '<div class="rr-summary-titlebar"><span>' + (snapshot.result === "win" ? "전투 요약" : "패배") + '</span></div>' +
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
      '<button type="button" class="rr-summary-next" id="rrSummaryNext">다음</button>' +
    '</div>';

  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");

  panelSlot.querySelector("#rrSummaryNext").addEventListener("click", (event) => {
    event.stopPropagation();
    closeRrOverlay();
    if(typeof onFinish === "function") onFinish();
  });
}

/* ── 결과 스냅샷 생성 (기획서 §7-3) ─────────────────────────────────────── */
function buildRunResultSnapshot(result){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const stats = (run && run.runStats) || {};
  const cleared = stats.cleared || {};

  let highestFloor = 0;
  if(typeof nodeFloorIdx === "function" && typeof getCurrentNodeId === "function"){
    highestFloor = Math.max(0, nodeFloorIdx(getCurrentNodeId()));
  }

  return {
    result,
    highestFloor,
    cleared: {
      enemy: cleared.enemy || 0,
      elite: cleared.elite || 0,
      boss:  cleared.boss  || 0
    },
    relicCount: (run && Array.isArray(run.relics)) ? run.relics.length : 0,
    usedPotionCount: stats.usedPotionCount || 0
  };
}

/* ── 전역 인터페이스 ─────────────────────────────────────────────────────── */
function rrOpen(result, onContinue){
  if(result !== "win" && result !== "lose") return false;

  const snapshot = buildRunResultSnapshot(result);

  if(result === "win"){
    const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
    const spirit = run && run.blessingSpirit;
    if(!spirit) return false;
    renderBlessingSpiritAppearance(spirit, snapshot, onContinue);
    return true;
  }

  // 패배: 동자승 패배 연출은 이후 단계에서 추가하고, 현재는 전투 요약으로 바로 진입한다.
  renderRunSummary(snapshot, onContinue);
  return true;
}

window.RUN_RESULT_UI = { open: rrOpen };

/* ── 스타일 ──────────────────────────────────────────────────────────────── */
function ensureRrStyles(){
  if(document.getElementById("runResultStyles")) return;

  const style = document.createElement("style");
  style.id = "runResultStyles";
  style.textContent =
    ".rr-overlay{position:absolute;inset:0;z-index:90;display:none;align-items:center;justify-content:center;cursor:pointer;}" +
    ".rr-overlay.show{display:flex;}" +
    ".rr-backdrop{position:absolute;inset:0;" +
      "background-image:radial-gradient(120% 90% at 50% 28%,rgba(30,20,15,.35) 0%,rgba(10,7,10,.72) 60%,rgba(4,4,8,.88) 100%);}" +
    ".rr-frame{position:relative;width:88%;height:76%;}" +
    ".rr-character-wrap{position:absolute;left:2%;bottom:-2%;width:52%;height:128%;z-index:2;" +
      "display:flex;align-items:flex-end;justify-content:center;pointer-events:none;}" +
    ".rr-character-wrap img{width:100%;height:100%;object-fit:contain;object-position:bottom;" +
      "filter:drop-shadow(0 1.4cqh 2cqh rgba(0,0,0,.55));}" +
    ".rr-character-emoji{font-size:20cqh;line-height:1;}" +
    ".rr-dialog-panel{position:absolute;left:40%;right:4%;top:14%;bottom:14%;z-index:1;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.8cqh;" +
      "padding:3cqh 3cqw;border-radius:1.6cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.2cqh rgba(0,0,0,.4);}" +
    ".rr-badge{position:absolute;top:-3.8cqh;width:9cqh;height:9cqh;transform:rotate(45deg);" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.24cqh solid #e8c874;border-radius:.4cqh;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;}" +
    ".rr-badge span{transform:rotate(-45deg);color:#fbe9c8;font-weight:900;font-size:2.2cqh;letter-spacing:.15cqh;white-space:nowrap;}" +
    ".rr-lines{text-align:center;color:#4a3524;}" +
    ".rr-lines p{margin:0;font-weight:800;}" +
    ".rr-lines p:first-child{font-size:3.6cqh;margin-bottom:1.2cqh;color:#3a2814;}" +
    ".rr-lines p:not(:first-child){font-size:1.8cqh;color:#6b5236;line-height:1.5;}" +
    ".rr-divider{position:relative;width:60%;height:.16cqh;background:linear-gradient(90deg,transparent,rgba(180,140,80,.6),transparent);}" +
    ".rr-divider::after{content:'✦';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);" +
      "background:#f2e3c3;padding:0 .8cqw;color:#b98a3c;font-size:1.4cqh;}" +
    ".rr-continue{font-size:1.5cqh;color:#a9793a;font-weight:800;letter-spacing:.1cqh;animation:rrPulse 1.6s ease-in-out infinite;}" +
    "@keyframes rrPulse{0%,100%{opacity:.5;}50%{opacity:1;}}" +

    /* 끝없는 여정 선택 패널 (기획서 §3-1) — 승리 연출과 동일한 rr-frame 크기를 공유한다 */
    ".rr-choice-panel{position:absolute;left:40%;right:4%;top:9%;bottom:9%;z-index:1;" +
      "display:flex;flex-direction:column;align-items:center;gap:1.6cqh;" +
      "padding:4.2cqh 3cqw 2.6cqh;border-radius:1.6cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.2cqh rgba(0,0,0,.4);}" +
    ".rr-choice-titlebar{position:absolute;top:-3.4cqh;left:50%;transform:translateX(-50%);" +
      "padding:1cqh 3cqw;border-radius:1cqh;white-space:nowrap;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.22cqh solid #e8c874;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);}" +
    ".rr-choice-titlebar span{color:#fbe9c8;font-weight:900;font-size:2.2cqh;letter-spacing:.1cqh;}" +
    ".rr-choice-lines{text-align:center;color:#4a3524;flex:0 0 auto;}" +
    ".rr-choice-lines p{margin:0;font-weight:700;}" +
    ".rr-choice-lines p.rr-choice-line-main{font-size:2.1cqh;font-weight:900;color:#3a2814;margin-bottom:.6cqh;}" +
    ".rr-choice-lines p:not(.rr-choice-line-main){font-size:1.4cqh;color:#6b5236;line-height:1.5;}" +
    ".rr-choice-cards{display:flex;gap:2cqw;width:100%;flex:1;min-height:0;}" +
    ".rr-choice-card{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.7cqh;" +
      "padding:1.6cqh 1cqw;border-radius:1.2cqh;border:.16cqh solid rgba(150,110,60,.5);" +
      "background:linear-gradient(180deg,rgba(255,255,255,.35),rgba(255,255,255,.08));text-align:center;}" +
    ".rr-choice-card-icon{font-size:4.4cqh;line-height:1;}" +
    ".rr-choice-card-title{font-size:1.6cqh;font-weight:900;color:#3a2814;}" +
    ".rr-choice-card-tag{font-size:1.05cqh;font-weight:800;color:#8a7350;background:rgba(120,100,70,.18);" +
      "padding:.2cqh .8cqw;border-radius:1cqh;}" +
    ".rr-choice-card-desc{font-size:1.15cqh;color:#7a6142;line-height:1.4;}" +
    ".rr-choice-card--disabled{opacity:.55;filter:grayscale(.5);cursor:not-allowed;}" +
    ".rr-choice-card--active{cursor:pointer;}" +
    ".rr-choice-card--active:hover{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.15));border-color:#cf5b52;}" +
    ".rr-choice-card--shake{animation:rrShake .35s ease-in-out;}" +
    "@keyframes rrShake{0%,100%{transform:translateX(0);}25%{transform:translateX(-.6cqw);}75%{transform:translateX(.6cqw);}}" +

    /* 전투 요약 화면 (기획서 §4-1, §10-1) — 캐릭터 없이 중앙 패널로 표시한다 */
    ".rr-summary-panel{position:absolute;left:50%;top:6%;bottom:6%;transform:translateX(-50%);" +
      "width:56%;min-width:44cqh;z-index:1;display:flex;flex-direction:column;align-items:center;" +
      "padding:5.4cqh 3.4cqw 3cqh;border-radius:1.8cqh;" +
      "background:linear-gradient(180deg,#f7ecd2,#efe0bd);border:.22cqh solid rgba(190,150,80,.65);" +
      "box-shadow:0 1cqh 2.4cqh rgba(0,0,0,.45);}" +
    ".rr-summary-titlebar{position:absolute;top:-3.6cqh;left:50%;transform:translateX(-50%);" +
      "padding:1.1cqh 3.6cqw;border-radius:1cqh;white-space:nowrap;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);border:.22cqh solid #e8c874;" +
      "box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.45);}" +
    ".rr-summary-titlebar span{color:#fbe9c8;font-weight:900;font-size:2.4cqh;letter-spacing:.15cqh;}" +
    ".rr-summary-rows{flex:1;width:100%;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:1.2cqh;}" +
    ".rr-summary-row{display:flex;align-items:center;gap:1.2cqw;padding:.9cqh 0;" +
      "border-bottom:.14cqh dashed rgba(160,120,70,.4);}" +
    ".rr-summary-row:last-child{border-bottom:none;}" +
    ".rr-summary-row-icon{flex:0 0 auto;width:4.6cqh;text-align:center;font-size:3cqh;line-height:1;}" +
    ".rr-summary-row-label{flex:1;min-width:0;font-size:1.85cqh;font-weight:800;color:#4a3524;}" +
    ".rr-summary-row-sep{flex:0 0 auto;color:#c79a4a;font-size:1.3cqh;}" +
    ".rr-summary-row-value{flex:0 0 auto;display:flex;align-items:baseline;gap:.35cqw;justify-content:flex-end;min-width:7cqw;}" +
    ".rr-summary-row-value strong{font-size:2.6cqh;font-weight:900;color:#a5322a;}" +
    ".rr-summary-row-value span{font-size:1.3cqh;font-weight:800;color:#6b5236;}" +
    ".rr-summary-next{margin-top:2.2cqh;width:64%;padding:1.5cqh 0;border:.2cqh solid #e8c874;border-radius:2.6cqh;" +
      "background:linear-gradient(160deg,#cf5b52,#8f2f2f);color:#fbe9c8;font-size:2.1cqh;font-weight:900;" +
      "letter-spacing:.15cqh;cursor:pointer;box-shadow:0 .6cqh 1.4cqh rgba(0,0,0,.4);}" +
    ".rr-summary-next:hover{filter:brightness(1.08);}" +

    "@media (max-width:900px){" +
      ".rr-frame{width:94%;height:84%;}" +
      ".rr-character-wrap{width:56%;height:56%;left:50%;transform:translateX(-50%);bottom:auto;top:2%;}" +
      ".rr-dialog-panel{right:5%;left:5%;width:auto;top:auto;bottom:3%;height:44%;}" +
      ".rr-badge{top:-3.4cqh;}" +
      ".rr-choice-panel{right:5%;left:5%;width:auto;top:auto;bottom:3%;height:56%;padding-top:3.6cqh;}" +
      ".rr-choice-cards{flex-direction:column;gap:1cqh;}" +
      ".rr-summary-panel{left:5%;right:5%;width:auto;transform:none;top:4%;bottom:4%;min-width:0;}" +
    "}";
  document.head.appendChild(style);
}
