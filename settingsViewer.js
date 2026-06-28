"use strict";

(function(){
  let els = null;

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
          '<button type="button" class="settings-viewer-close" aria-label="닫기">×</button>' +
        '</div>' +
        '<div class="settings-viewer-body">' +
          '<div class="settings-viewer-empty">설정 항목을 준비 중입니다.</div>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeSettingsViewer();
    });
    overlay.querySelector(".settings-viewer-close").addEventListener("click", closeSettingsViewer);
    document.addEventListener("keydown", event => {
      if(event.key === "Escape" && overlay.classList.contains("show")) closeSettingsViewer();
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    return {
      overlay,
      close: overlay.querySelector(".settings-viewer-close"),
    };
  }

  function ensureSettingsViewerStyles(){
    if(document.querySelector("#settingsViewerStyles")) return;

    const style = document.createElement("style");
    style.id = "settingsViewerStyles";
    style.textContent =
      ".settings-viewer{position:absolute;inset:0;z-index:96;display:none;place-items:center;background:rgba(20,35,60,.45);backdrop-filter:blur(3px);}" +
      ".settings-viewer.show{display:grid;}" +
      ".settings-viewer-panel{width:min(54cqw,72cqh);max-height:72cqh;display:flex;flex-direction:column;background:var(--c-panel);border:0.3cqh solid var(--c-gold);border-radius:var(--r);box-shadow:0 2cqh 4cqh rgba(0,0,0,.28);padding:2cqh 2cqw;}" +
      ".settings-viewer-head{display:flex;align-items:center;gap:1cqw;padding-bottom:1.2cqh;border-bottom:0.15cqh solid var(--c-panel-line);}" +
      ".settings-viewer-head h2{font-size:3cqh;line-height:1;flex:1;}" +
      ".settings-viewer-close{width:4.2cqh;height:4.2cqh;border-radius:50%;border:0.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);font-size:3cqh;font-weight:800;line-height:1;cursor:pointer;}" +
      ".settings-viewer-body{padding:2cqh 0 0;min-height:18cqh;}" +
      ".settings-viewer-empty{min-height:16cqh;display:grid;place-items:center;border:0.2cqh dashed var(--c-panel-line);border-radius:1.2cqh;color:var(--c-ink-soft);font-size:2cqh;font-weight:800;}";
    document.head.appendChild(style);
  }

  function openSettingsViewer(){
    if(!els) return;
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    els.close.focus();
  }

  function closeSettingsViewer(){
    if(!els) return;
    els.overlay.classList.remove("show");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSettingsViewer);
  else initSettingsViewer();
})();
