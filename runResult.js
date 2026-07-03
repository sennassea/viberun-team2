"use strict";
/* =========================================================================
   최종 승리 / 패배 결과 UI (runResult.js)
   기획서: 최종 승리 / 패배 UI 구현 기획서

   현재 구현 범위: 보스 처치(승리) 후 신령의 은혜 신령 출현 연출만 처리한다.
   전투 요약/상세, 끝없는 여정 선택, 패배 연출(동자승)은 이후 단계에서 추가한다.
   이 파일이 처리하지 못하는 결과(패배 등)는 endGame()의 기존 종료 UI로
   그대로 폴백된다.

   script.js / startBlessing.js 이후에 로드되어야 한다.
   ========================================================================= */

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
      '<div class="rr-dialog-panel">' +
        '<div class="rr-badge"><span id="rrBadgeText">승리</span></div>' +
        '<div class="rr-lines" id="rrLines"></div>' +
        '<div class="rr-divider"></div>' +
        '<div class="rr-continue">✦ 터치하여 계속 ✦</div>' +
      '</div>' +
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
function renderBlessingSpiritAppearance(spirit, onContinue){
  const overlay = ensureRrOverlay();

  const characterWrap = overlay.querySelector("#rrCharacterWrap");
  characterWrap.innerHTML = spirit.image
    ? '<img src="' + spirit.image + '" alt="' + (spirit.name || "") + '">'
    : '<div class="rr-character-emoji">' + (spirit.emoji || "") + '</div>';

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
    closeRrOverlay();
    if(typeof onContinue === "function") onContinue();
  };
  overlay.addEventListener("click", handleContinue);
}

/* ── 전역 인터페이스 ─────────────────────────────────────────────────────── */
function rrOpen(result, onContinue){
  if(result !== "win") return false;

  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const spirit = run && run.blessingSpirit;
  if(!spirit) return false;

  renderBlessingSpiritAppearance(spirit, onContinue);
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
    "@media (max-width:900px){" +
      ".rr-frame{width:94%;height:84%;}" +
      ".rr-character-wrap{width:56%;height:56%;left:50%;transform:translateX(-50%);bottom:auto;top:2%;}" +
      ".rr-dialog-panel{right:5%;left:5%;width:auto;top:auto;bottom:3%;height:44%;}" +
      ".rr-badge{top:-3.4cqh;}" +
    "}";
  document.head.appendChild(style);
}
