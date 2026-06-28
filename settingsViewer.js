"use strict";

(function(){
  let els = null;
  let pauseState = null;

  function initSettingsViewer(){
    const trigger = findSettingsTrigger();
    if(!trigger) return;

    els = createSettingsViewer();
    bindOpenTrigger(trigger);
  }

  function findSettingsTrigger(){
    const buttons = Array.from(document.querySelectorAll(".hud-btn"));
    return buttons.find(button => button.textContent.includes("⚙️") || button.textContent.includes("⚙"));
  }

  function bindOpenTrigger(trigger){
    trigger.addEventListener("click", openSettingsViewer);
    trigger.setAttribute("role", "button");
    trigger.setAttribute("tabindex", "0");
    trigger.addEventListener("keydown", event => {
      if(event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openSettingsViewer();
    });
  }

  function createSettingsViewer(){
    ensureSettingsViewerStyles();

    const overlay = document.createElement("div");
    overlay.id = "settingsViewerOverlay";
    overlay.className = "settings-viewer";
    overlay.setAttribute("aria-hidden", "true");

    overlay.innerHTML =
      '<div class="settings-viewer-panel" role="dialog" aria-modal="true" aria-labelledby="settingsViewerTitle">' +
        '<div class="settings-viewer-head">' +
          '<h2 id="settingsViewerTitle">설정</h2>' +
          '<button type="button" class="settings-viewer-help" aria-label="도움말">?</button>' +
          '<button type="button" class="settings-viewer-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="settings-viewer-body">' +
          '<section class="settings-viewer-section" aria-label="음량 조절">' +
            '<h3>음량 조절</h3>' +
            volumeControlHtml("master", "전체 음량", 80) +
            volumeControlHtml("music", "배경 음악", 70) +
            volumeControlHtml("effect", "효과음", 80) +
          '</section>' +
          '<div class="settings-viewer-actions">' +
            '<button type="button" class="settings-viewer-danger">포기하기</button>' +
            '<button type="button" class="settings-viewer-primary">저장 후 종료</button>' +
          '</div>' +
        '</div>' +
        '<div class="settings-viewer-confirm" aria-hidden="true">' +
          '<div class="settings-viewer-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="settingsGiveUpTitle">' +
            '<h3 id="settingsGiveUpTitle">정말 포기하시겠습니까?</h3>' +
            '<p>포기하면 패배로 처리되며, 진행도와 이번 진행에서 얻은 카드들이 모두 리셋됩니다.</p>' +
            '<div class="settings-viewer-confirm-actions">' +
              '<button type="button" class="settings-viewer-confirm-no">아니오</button>' +
              '<button type="button" class="settings-viewer-confirm-yes">예</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeSettingsViewer();
    });
    overlay.addEventListener("input", event => {
      if(!event.target.matches(".settings-viewer-volume input")) return;
      const output = event.target.closest(".settings-viewer-volume").querySelector("output");
      if(output) output.textContent = event.target.value;
    });
    overlay.querySelector(".settings-viewer-close").addEventListener("click", closeSettingsViewer);
    overlay.querySelector(".settings-viewer-danger").addEventListener("click", openGiveUpConfirm);
    overlay.querySelector(".settings-viewer-confirm-no").addEventListener("click", closeGiveUpConfirm);
    overlay.querySelector(".settings-viewer-confirm-yes").addEventListener("click", confirmGiveUp);
    document.addEventListener("keydown", event => {
      if(event.key !== "Escape" || !overlay.classList.contains("show")) return;
      if(overlay.querySelector(".settings-viewer-confirm.show")){
        closeGiveUpConfirm();
        return;
      }
      closeSettingsViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      help: overlay.querySelector(".settings-viewer-help"),
      close: overlay.querySelector(".settings-viewer-close"),
      confirm: overlay.querySelector(".settings-viewer-confirm"),
      confirmNo: overlay.querySelector(".settings-viewer-confirm-no"),
    };
  }

  function volumeControlHtml(id, label, value){
    return '<label class="settings-viewer-volume" for="settingsVolume' + id + '">' +
      '<span>' + label + '</span>' +
      '<input id="settingsVolume' + id + '" type="range" min="0" max="100" value="' + value + '">' +
      '<output>' + value + '</output>' +
    '</label>';
  }

  function ensureSettingsViewerStyles(){
    if(document.querySelector("#settingsViewerStyles")) return;

    const style = document.createElement("style");
    style.id = "settingsViewerStyles";
    style.textContent =
      ".settings-viewer{position:absolute;inset:0;z-index:96;display:none;place-items:center;background:rgba(20,35,60,.45);backdrop-filter:blur(3px);}" +
      ".settings-viewer.show{display:grid;}" +
      ".settings-viewer-panel{position:relative;width:min(54cqw,72cqh);max-height:72cqh;display:flex;flex-direction:column;background:var(--c-panel);border:0.3cqh solid var(--c-gold);border-radius:var(--r);box-shadow:0 2cqh 4cqh rgba(0,0,0,.28);padding:2cqh 2cqw;}" +
      ".settings-viewer-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid var(--c-panel-line);}" +
      ".settings-viewer-head h2{font-size:3cqh;line-height:1;flex:1;}" +
      ".settings-viewer-help{width:3.8cqh;height:3.8cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-blue-deep);font-size:2.2cqh;font-weight:900;line-height:1;cursor:pointer;}" +
      ".settings-viewer-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
      ".settings-viewer-body{padding:2cqh 0 0;min-height:18cqh;display:flex;flex-direction:column;gap:2cqh;}" +
      ".settings-viewer-section{border:0.18cqh solid var(--c-panel-line);border-radius:1.2cqh;background:rgba(255,255,255,.58);padding:1.6cqh 1.4cqw;}" +
      ".settings-viewer-section h3{font-size:2.1cqh;margin-bottom:1.4cqh;color:var(--c-ink);}" +
      ".settings-viewer-volume{display:grid;grid-template-columns:8cqw minmax(0,1fr) 4cqw;align-items:center;gap:1cqw;margin-top:1cqh;color:var(--c-ink-soft);font-size:1.7cqh;font-weight:800;}" +
      ".settings-viewer-volume input{width:100%;accent-color:var(--c-blue);}" +
      ".settings-viewer-volume output{text-align:right;color:var(--c-ink);font-weight:900;}" +
      ".settings-viewer-actions{display:flex;justify-content:flex-end;gap:1cqw;}" +
      ".settings-viewer-actions button{height:4.4cqh;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);padding:0 1.6cqw;font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-danger{background:#fff1ef;color:var(--c-red-deep);}" +
      ".settings-viewer-primary{background:var(--c-blue);color:#fff;}" +
      ".settings-viewer-confirm{position:absolute;inset:0;display:none;place-items:center;border-radius:var(--r);background:rgba(20,35,60,.38);}" +
      ".settings-viewer-confirm.show{display:grid;}" +
      ".settings-viewer-confirm-panel{width:min(38cqw,54cqh);background:#fff;border:0.24cqh solid var(--c-panel-line);border-radius:1.2cqh;box-shadow:0 1.4cqh 3cqh rgba(20,35,60,.26);padding:2.2cqh 2cqw;text-align:center;}" +
      ".settings-viewer-confirm-panel h3{font-size:2.4cqh;color:var(--c-ink);margin-bottom:1cqh;}" +
      ".settings-viewer-confirm-panel p{font-size:1.7cqh;line-height:1.45;color:var(--c-ink-soft);font-weight:800;margin-bottom:1.8cqh;}" +
      ".settings-viewer-confirm-actions{display:flex;justify-content:center;gap:1cqw;}" +
      ".settings-viewer-confirm-actions button{height:4.2cqh;min-width:8cqw;border-radius:1cqh;border:0.2cqh solid var(--c-panel-line);font-size:1.8cqh;font-weight:900;cursor:pointer;}" +
      ".settings-viewer-confirm-no{background:#fff;color:var(--c-ink-soft);}" +
      ".settings-viewer-confirm-yes{background:#fff1ef;color:var(--c-red-deep);}";
    document.head.appendChild(style);
  }

  function openSettingsViewer(){
    if(!els) return;
    pauseCombat();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function closeSettingsViewer(){
    if(!els) return;
    closeGiveUpConfirm();
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
    resumeCombat();
  }

  function openGiveUpConfirm(){
    if(!els || !els.confirm) return;
    els.confirm.classList.add("show");
    els.confirm.setAttribute("aria-hidden", "false");
    if(els.confirmNo) els.confirmNo.focus();
  }

  function closeGiveUpConfirm(){
    if(!els || !els.confirm) return;
    els.confirm.classList.remove("show");
    els.confirm.setAttribute("aria-hidden", "true");
    if(els.overlay.classList.contains("show")) els.close.focus();
  }

  function confirmGiveUp(){
    if(typeof endGame !== "function") return;
    endGame("lose");
    closeSettingsViewer();
  }

  function pauseCombat(){
    if(pauseState || typeof S === "undefined" || !S || S.over) return;
    pauseState = { busy: !!S.busy };
    S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function resumeCombat(){
    if(!pauseState) return;
    if(typeof S !== "undefined" && S && !S.over){
      S.busy = pauseState.busy;
      if(typeof updateEndBtn === "function") updateEndBtn();
    }
    pauseState = null;
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSettingsViewer);
  else initSettingsViewer();
})();
