"use strict";
/* =========================================================================
   피드백 유틸
   ========================================================================= */
function spawnFloat(sel, text, kind){
  const host = document.querySelector(sel);
  if(!host) return;
  const g  = $("#game").getBoundingClientRect();
  const r  = host.getBoundingClientRect();
  const el = document.createElement("div");
  el.className   = "float "+kind;
  el.textContent = text;
  el.style.left      = (r.left-g.left+r.width/2)+"px";
  el.style.top       = (r.top-g.top+r.height*0.25)+"px";
  el.style.transform = "translateX(-50%)";
  $("#fx").appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/* 전역 토스트는 모든 모달/오버레이보다 위에 떠야 하므로 toastService.js의 전역 레이어를 통해 표시합니다. */
function toast(msg, type){
  if(typeof window.showToast === "function") window.showToast(msg, type);
}
function flashEnergy(){ const e=$("#energy"); e.classList.add("flash"); setTimeout(()=>e.classList.remove("flash"),350); }
const wait = ms => new Promise(r => setTimeout(r, ms));

/* =========================================================================
   보상 오버레이 CSS
   ========================================================================= */
function injectRewardStyles(){
  if(document.querySelector("#rewardStyle")) return;
  const style = document.createElement("style");
  style.id = "rewardStyle";
  style.textContent = `
    #cardRewardOverlay{position:absolute;inset:0;z-index:220;display:none;place-items:center;background:rgba(10,20,40,.58);backdrop-filter:blur(.5cqh);}
    #cardRewardOverlay.show{display:grid;}
    .reward-panel{width:min(70cqw,90cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.94);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;}
    #cardRewardOverlay.blessing-card-reward .reward-panel{width:min(74cqw,98cqh);box-sizing:border-box;padding:5.6cqh 5.2cqw 5cqh;border:0;border-radius:0;background:transparent url("assets/ui_panels/codex_popup_frame.png") center/100% 100% no-repeat;box-shadow:none;}
    #cardRewardOverlay.blessing-card-reward .reward-panel h2{color:#3e2912;text-shadow:0 .08cqh 0 rgba(255,255,255,.85);}
    #cardRewardOverlay.blessing-card-reward .reward-panel p{color:#5c3c10;font-weight:800;text-shadow:0 .06cqh 0 rgba(255,255,255,.75);}
    #cardRewardOverlay.blessing-card-reward .reward-cards{margin-bottom:0;}
    .reward-panel h2{font-size:3.2cqh;margin-bottom:.8cqh;color:var(--c-ink);}
    .reward-panel p{font-size:1.7cqh;color:var(--c-ink-soft);margin-bottom:2cqh;}
    .reward-cards{display:flex;justify-content:center;align-items:stretch;gap:1.4cqw;margin-bottom:1.6cqh;}
    .reward-card{position:relative;width:15cqw;min-height:28cqh;border-radius:1.4cqh;background:linear-gradient(180deg,#fbfcff,#eef4fb);border:.35cqh solid #cdddf0;box-shadow:0 .8cqh 1.6cqh rgba(40,70,120,.22);display:flex;flex-direction:column;align-items:center;padding:.8cqh .7cqw;cursor:pointer;font:inherit;color:var(--c-ink);transition:transform .14s, box-shadow .14s;}
    .reward-card:hover{transform:translateY(-1.4cqh) scale(1.03);box-shadow:0 1.2cqh 2.2cqh rgba(40,70,120,.34);}
    .reward-card .cost{position:absolute;top:-1cqh;left:-1cqw;width:4.6cqh;height:4.6cqh;border-radius:50%;display:grid;place-items:center;font-size:2.4cqh;font-weight:800;color:#fff;background:radial-gradient(circle at 35% 30%,#bfe6ff,#3f8fe0 70%);border:.25cqh solid #eaf6ff;}
    .reward-card .cname{font-size:2cqh;font-weight:900;margin-top:.4cqh;}
    .reward-card .art{width:100%;height:9cqh;margin:.6cqh 0;border-radius:1cqh;display:grid;place-items:center;font-size:6cqh;background:linear-gradient(160deg,#eef6ff,#dcebfb);border:.15cqh solid #d6e6f5;}
    .reward-card .type{font-size:1.4cqh;font-weight:800;color:#fff;padding:.15cqh .8cqw;border-radius:.7cqh;margin-bottom:.4cqh;}
    .reward-meta{font-size:1.25cqh;font-weight:800;color:var(--c-ink-soft);margin-bottom:.4cqh;}
    .reward-card .desc{font-size:1.45cqh;line-height:1.35;white-space:pre-line;}
    .reward-skip{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#fff;cursor:pointer;color:var(--c-ink-soft);}
    .reward-card.card-frame-card{aspect-ratio:2/3;min-height:0;height:32cqh;padding:0;border:0;overflow:hidden;background:#f5efe4;}
    .reward-card.card-frame-card .card-art-layer{position:absolute;inset:0;z-index:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(160deg,#eef6ff,#dcebfb);pointer-events:none;}
    .reward-card.card-frame-card .card-art-layer img{width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;}
    .reward-card.card-frame-card .card-frame-layer{position:absolute;inset:0;z-index:2;width:100%;height:100%;object-fit:fill;pointer-events:none;}
    .reward-card.card-frame-card .card-text-layer{position:absolute;inset:0;z-index:3;pointer-events:none;font-weight:900;color:#10243f;}
    .reward-card.card-frame-card .card-cost-text{position:absolute;left:6.2%;top:2.4%;width:18.8%;height:13.9%;display:grid;place-items:center;color:#2b3848;font-size:3cqh;line-height:1;text-shadow:0 .08cqh 0 rgba(255,255,255,.95);}
    .reward-card.card-frame-card .card-name-text{position:absolute;left:12%;right:8%;top:5.9%;height:10%;display:grid;place-items:center;text-align:center;font-size:1.85cqh;line-height:1.05;overflow:hidden;text-shadow:0 .08cqh 0 rgba(255,255,255,.75);}
    .reward-card.card-frame-card .card-desc-text{position:absolute;left:8%;right:8%;top:77.8%;bottom:7.4%;display:block;text-align:center;font-size:1.25cqh;line-height:1.34;white-space:pre-line;overflow:hidden;}
    .reward-card.card-frame-card .card-hit-layer{position:absolute;inset:0;z-index:4;background:transparent;cursor:inherit;}
    #battleCardChoiceOverlay{position:absolute;inset:0;z-index:235;display:none;place-items:center;background:rgba(10,20,40,.48);backdrop-filter:blur(.35cqh);}
    #battleCardChoiceOverlay.show{display:grid;}
    .battle-card-choice-panel{width:min(72cqw,92cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.95);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;}
    .battle-card-choice-panel h2{font-size:3cqh;margin-bottom:.8cqh;color:var(--c-ink);}
    .battle-card-choice-panel p{font-size:1.65cqh;color:var(--c-ink-soft);margin-bottom:1.8cqh;}
    .battle-card-choice-cards{display:flex;justify-content:center;align-items:stretch;gap:1.4cqw;margin-bottom:1.6cqh;flex-wrap:wrap;}
    .battle-card-choice-card{font:inherit;}
    .battle-card-choice-cancel{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#fff;cursor:pointer;color:var(--c-ink-soft);}
    #battleVictoryOverlay{position:absolute;inset:0;z-index:220;display:none;place-items:center;background:rgba(10,20,40,.64);backdrop-filter:blur(.5cqh);}
    #battleVictoryOverlay.show{display:grid;}
    .victory-reward-panel{width:min(62cqw,82cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.95);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;display:flex;flex-direction:column;gap:2cqh;}
    .victory-title-area h2{font-size:3.2cqh;margin-bottom:.6cqh;color:var(--c-ink);}
    .victory-title-area p{font-size:1.7cqh;color:var(--c-ink-soft);}
    .victory-section{border:.2cqh solid var(--c-panel-line);border-radius:1.4cqh;background:rgba(255,255,255,.55);padding:1.6cqh 1.5cqw;}
    .victory-section-title{font-size:1.8cqh;font-weight:900;color:var(--c-ink);margin-bottom:1.2cqh;}
    .victory-reward-row{min-height:15cqh;border:.25cqh dashed var(--c-panel-line);border-radius:1.2cqh;display:flex;align-items:center;justify-content:center;gap:1cqw;background:rgba(255,255,255,.45);}
    .victory-reward-slot{position:relative;flex:0 0 10cqw;width:10cqw;height:13.8cqh;border:.2cqh solid #d6e6f5;border-radius:1.1cqh;background:linear-gradient(180deg,#fbfcff,#eef4fb);box-shadow:0 .5cqh 1cqh rgba(40,70,120,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5cqh;color:var(--c-ink);font:inherit;cursor:pointer;}
    .victory-reward-slot.done{filter:saturate(.65) brightness(.9);border-color:#b8c6d4;background:linear-gradient(180deg,#edf1f5,#dfe6ee);color:#6f7d8a;}
    .victory-reward-check{position:absolute;top:.6cqh;right:.6cqw;width:2.3cqh;height:2.3cqh;border-radius:50%;display:none;place-items:center;background:#5d9f78;color:#fff;font-size:1.5cqh;font-weight:900;}
    .victory-reward-slot.done .victory-reward-check{display:grid;}
    .victory-reward-category{font-size:1.1cqh;font-weight:900;color:var(--c-ink-soft);}
    .victory-reward-icon{width:4.8cqh;height:4.8cqh;border-radius:1cqh;display:grid;place-items:center;background:#fff;border:.18cqh solid var(--c-panel-line);font-size:2.3cqh;font-weight:900;color:var(--c-blue-deep);}
    .victory-reward-icon img{width:100%;height:100%;object-fit:contain;display:block;}
    .victory-reward-icon img{width:3.6cqh;height:3.6cqh;object-fit:contain;display:block;}
    .victory-reward-name{font-size:1.55cqh;font-weight:900;white-space:nowrap;}
    .victory-reward-state{min-height:1.6cqh;font-size:1.15cqh;font-weight:800;color:var(--c-ink-soft);}
    .victory-enemy-name{min-height:2.4cqh;font-size:1.85cqh;font-weight:900;color:var(--c-ink);margin-bottom:1cqh;}
    .victory-battle-meta{display:flex;justify-content:center;gap:.8cqw;flex-wrap:wrap;}
    .victory-battle-meta span{min-width:7cqw;padding:.55cqh .9cqw;border-radius:.8cqh;background:#eef4fb;border:.15cqh solid #d6e6f5;font-size:1.4cqh;font-weight:800;color:var(--c-ink-soft);}
    .victory-button-area{display:flex;justify-content:center;}
    .victory-next{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#f3f5f8;color:#9aa5b2;cursor:not-allowed;opacity:.72;}
    .victory-next.active{background:#fff;color:var(--c-ink);cursor:pointer;opacity:1;box-shadow:0 .45cqh 1cqh rgba(40,70,120,.15);}
    .victory-confirm-modal{position:absolute;inset:0;z-index:230;display:none;place-items:center;background:rgba(10,20,40,.18);}
    .victory-confirm-modal.show{display:flex;align-items:center;justify-content:center;gap:1cqw;}
    .victory-leave-confirm-modal{position:absolute;inset:0;z-index:232;display:none;place-items:center;background:rgba(10,20,40,.42);}
    .victory-leave-confirm-modal.show{display:flex;align-items:center;justify-content:center;}
    .victory-leave-confirm-modal .victory-confirm-box{width:min(34cqw,48cqh);}
    .victory-confirm-modal.replace-mode{background:rgba(10,20,40,.42);backdrop-filter:blur(.35cqh);}
    .victory-confirm-modal.replace-mode .victory-confirm-box{display:none;}
    .victory-confirm-box{width:min(28cqw,42cqh);padding:2cqh 2cqw;border-radius:1.4cqh;background:#fff;border:.25cqh solid var(--c-panel-line);box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.32);text-align:center;}
    .victory-confirm-title{font-size:2.1cqh;font-weight:900;color:var(--c-ink);margin-bottom:.8cqh;}
    .victory-confirm-desc{font-size:1.45cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.35;margin-bottom:1.6cqh;}
    .victory-confirm-actions{display:flex;justify-content:center;gap:.8cqw;}
    .victory-confirm-actions button{font:inherit;font-size:1.55cqh;font-weight:900;padding:.75cqh 1.2cqw;border-radius:.9cqh;border:.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);cursor:pointer;}
    .victory-confirm-take{box-shadow:0 .35cqh .8cqh rgba(40,70,120,.13);}
    .victory-potion-replace-panel{display:none;width:min(25cqw,38cqh);padding:1.6cqh 1.4cqw;border-radius:1.2cqh;background:#fff;border:.25cqh solid var(--c-panel-line);box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.28);text-align:left;}
    .victory-potion-replace-panel.show{display:block;}
    .victory-potion-replace-title{font-size:1.75cqh;font-weight:900;color:var(--c-ink);margin-bottom:.7cqh;text-align:center;}
    .victory-potion-replace-desc{font-size:1.25cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.35;margin-bottom:1.2cqh;text-align:center;}
    .victory-potion-replace-slots{display:flex;flex-direction:column;gap:.7cqh;}
    .victory-potion-replace-slot{width:100%;min-height:5.2cqh;padding:.75cqh .8cqw;border-radius:.9cqh;border:.2cqh solid #d6e6f5;background:linear-gradient(180deg,#fbfcff,#eef4fb);display:flex;align-items:center;gap:.7cqw;color:var(--c-ink);font:inherit;cursor:pointer;text-align:left;}
    .victory-potion-replace-slot.selected{border-color:#5d9f78;background:linear-gradient(180deg,#eef9f3,#dcefe6);box-shadow:0 0 0 .2cqh rgba(93,159,120,.18) inset;}
    .victory-potion-replace-icon{flex:0 0 3.2cqh;width:3.2cqh;height:3.2cqh;border-radius:.8cqh;display:grid;place-items:center;background:#fff;border:.16cqh solid var(--c-panel-line);font-size:1.65cqh;font-weight:900;color:var(--c-blue-deep);}
    .victory-potion-replace-name{font-size:1.35cqh;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .victory-potion-replace-detail{display:none;margin-top:1cqh;padding:1cqh .9cqw;border-radius:.9cqh;border:.18cqh solid #d6e6f5;background:#f7fafc;}
    .victory-potion-replace-detail.show{display:block;}
    .victory-potion-detail-row{padding:.65cqh 0;border-bottom:.12cqh solid rgba(160,180,200,.45);}
    .victory-potion-detail-row:last-of-type{border-bottom:0;}
    .victory-potion-detail-label{font-size:1.05cqh;font-weight:900;color:#6f7d8a;margin-bottom:.25cqh;}
    .victory-potion-detail-name{font-size:1.35cqh;font-weight:900;color:var(--c-ink);margin-bottom:.2cqh;}
    .victory-potion-detail-desc{font-size:1.15cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.3;}
    .victory-potion-detail-question{font-size:1.2cqh;font-weight:900;color:var(--c-ink);text-align:center;margin:1cqh 0 .8cqh;}
    .victory-potion-detail-actions{display:flex;justify-content:center;gap:.6cqw;}
    .victory-potion-detail-actions button{font:inherit;font-size:1.25cqh;font-weight:900;padding:.55cqh .9cqw;border-radius:.75cqh;border:.18cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);cursor:pointer;}
    .victory-potion-replace-footer{display:flex;justify-content:center;margin-top:1.1cqh;}
    .victory-potion-replace-back{font:inherit;font-size:1.3cqh;font-weight:900;padding:.65cqh 1cqw;border-radius:.8cqh;border:.18cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink-soft);cursor:pointer;}
  `;
  document.head.appendChild(style);
}

/* =========================================================================
   상태이상 아이콘 CSS
   ========================================================================= */
function injectStatusStyles(){
  if(document.querySelector("#statusStyle")) return;
  const style = document.createElement("style");
  style.id = "statusStyle";
  style.textContent = `
    .enemy-status-icons{display:flex !important;flex-direction:row !important;align-items:center;justify-content:center;gap:.65cqw;margin-top:.45cqh;min-height:4.5cqh;position:relative;z-index:20;}
    .enemy-status-icon{position:relative;width:4.1cqh;height:4.1cqh;border-radius:.85cqh;display:grid;place-items:center;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(236,241,255,.86));border:.18cqh solid rgba(255,255,255,.75);box-shadow:0 .35cqh .9cqh rgba(40,50,90,.28), inset 0 0 0 .22cqh color-mix(in srgb, var(--status-color) 25%, transparent);font-size:2.15cqh;line-height:1;cursor:help;}
    .enemy-status-icon img{width:100%;height:100%;object-fit:contain;border-radius:.7cqh;}
    .enemy-status-icon span{filter:drop-shadow(0 .15cqh .2cqh rgba(0,0,0,.18));}
    .enemy-status-icon b{position:absolute;right:-.55cqh;bottom:-.55cqh;min-width:2cqh;height:2cqh;padding:0 .25cqh;border-radius:999px;display:grid;place-items:center;background:#1f2d45;color:#fff;border:.18cqh solid #fff;font-size:1.25cqh;font-weight:900;box-shadow:0 .2cqh .45cqh rgba(0,0,0,.25);}
    .enemy-status-icon.status-agitation{--status-color:#5577ff !important;}
    .enemy-status-icon.status-mark{--status-color:#ff6fb1 !important;}
    .enemy-status-icon.status-fracture{--status-color:#d94a68 !important;}
    #enemyStatusTooltip{position:fixed;left:0;top:0;z-index:99999;max-width:28cqw;min-width:17cqw;padding:1.2cqh 1.35cqw;border-radius:.9cqh;background:rgba(20,30,48,.96);color:#edf5ff;box-shadow:0 .55cqh 1.4cqh rgba(0,0,0,.32);border:.12cqh solid rgba(170,190,230,.25);pointer-events:none;opacity:0;transform:translate3d(-9999px,-9999px,0);transition:opacity .08s ease;white-space:pre-line;font-size:1.45cqh;line-height:1.45;text-align:left;}
    #enemyStatusTooltip.show{opacity:1;}
    #enemyStatusTooltip .status-tooltip-title{display:flex;align-items:center;gap:.5cqw;margin-bottom:.55cqh;font-weight:900;font-size:1.65cqh;color:#fff;}
    #enemyStatusTooltip .status-tooltip-body{font-weight:700;color:#dce8fa;}
  `;
  document.head.appendChild(style);
}

function ensureEnemyStatusTooltip(){
  let tip = document.querySelector("#enemyStatusTooltip");
  if(tip) return tip;
  tip = document.createElement("div");
  tip.id = "enemyStatusTooltip";
  document.body.appendChild(tip);
  return tip;
}

function showEnemyStatusTooltip(iconEl){
  if(!iconEl) return;
  const tip = ensureEnemyStatusTooltip();
  const statusId = iconEl.dataset.statusId;
  const data = STATUS_DATA[statusId] || {};
  const icon = data.icon || "•";
  const name = iconEl.dataset.statusName || data.name || statusId;
  const body = iconEl.dataset.statusTooltip || name;
  const bodyLines = body.split("\n").slice(1).join("\n");
  tip.innerHTML = '<div class="status-tooltip-title"><span>'+escapeHtml(icon)+'</span><b>'+escapeHtml(name)+'</b></div>'
    + '<div class="status-tooltip-body">'+escapeHtml(bodyLines || body)+'</div>';
  tip.classList.add("show");
  positionEnemyStatusTooltip(iconEl, tip);
}

function positionEnemyStatusTooltip(iconEl, tip){
  if(!iconEl || !tip) return;
  const r = iconEl.getBoundingClientRect();
  const pad = 8;
  const tw = tip.offsetWidth || 260;
  const th = tip.offsetHeight || 120;
  let left = r.left + r.width / 2 - tw / 2;
  let top = r.bottom + 10;
  if(left < pad) left = pad;
  if(left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
  if(top + th > window.innerHeight - pad) top = Math.max(pad, r.top - th - 10);
  tip.style.transform = "translate3d("+left+"px,"+top+"px,0)";
}

function hideEnemyStatusTooltip(){
  const tip = document.querySelector("#enemyStatusTooltip");
  if(!tip) return;
  tip.classList.remove("show");
  tip.style.transform = "translate3d(-9999px,-9999px,0)";
}

function bindEnemyStatusTooltipEvents(){
  document.addEventListener("mouseover", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon) showEnemyStatusTooltip(icon);
  });
  document.addEventListener("mousemove", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon) positionEnemyStatusTooltip(icon, ensureEnemyStatusTooltip());
  });
  document.addEventListener("mouseout", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon && (!ev.relatedTarget || !icon.contains(ev.relatedTarget))) hideEnemyStatusTooltip();
  });
}

function bindCombatButtonsOnce(){
  if(window.__BOHYUN_COMBAT_BUTTONS_BOUND__) return;
  window.__BOHYUN_COMBAT_BUTTONS_BOUND__ = true;
  const endTurnButton = document.querySelector("#endTurn");
  if(endTurnButton) endTurnButton.addEventListener("click", endTurn);
  const restartButton = document.querySelector("#restart");
  if(restartButton) restartButton.addEventListener("click", () => {
    const over = document.querySelector("#over");
    if(over) over.classList.remove("show");
    newGame({ resetRun:true });
  });
  const bagViewerButton = document.querySelector("#bagViewerButton");
  if(bagViewerButton){
    bagViewerButton.addEventListener("click", () => {
      if(typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
      else toast("가방을 불러올 수 없습니다.");
    });
  }
}

injectRewardStyles();
injectStatusStyles();
bindEnemyStatusTooltipEvents();
bindCombatButtonsOnce();
