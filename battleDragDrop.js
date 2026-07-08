"use strict";
/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
// 알트탭 등으로 창이 포커스를 잃으면 pointerup/pointercancel이 발생하지 않아
// 드래그 상태가 정리되지 않고 조준 화살표가 화면에 남는 문제를 방지하기 위한 참조.
let activeDragCleanup = null;
function attachDrag(cardEl, index){
  let startX=0, startY=0, dragging=false, pid=null;
  cardEl.addEventListener("pointerdown", down);
  function down(ev){
    if(S.busy||S.pendingCardChoice||S.over) return;
    const key = S.hand[index];
    const card = CARD_DB[key];
    if(window.TUTORIAL_BATTLE &&
       typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
       window.TUTORIAL_BATTLE.isTutorialBattle() &&
       typeof window.TUTORIAL_BATTLE.canUseCard === "function" &&
       !window.TUTORIAL_BATTLE.canUseCard(card, key, index)){
      const message = typeof window.TUTORIAL_BATTLE.getTutorialRestrictionMessage === "function"
        ? window.TUTORIAL_BATTLE.getTutorialRestrictionMessage("card")
        : "";
      if(message && typeof toast === "function") toast(message);
      return;
    }
    pid=ev.pointerId; startX=ev.clientX; startY=ev.clientY; dragging=false;
    cardEl.setPointerCapture(pid);
    cardEl.addEventListener("pointermove",   move);
    cardEl.addEventListener("pointerup",     up);
    cardEl.addEventListener("pointercancel", cancel);
    activeDragCleanup = cleanup;
  }
  function move(ev){
    const dx=ev.clientX-startX, dy=ev.clientY-startY;
    if(!dragging && Math.hypot(dx,dy)>DRAG_THRESHOLD){ dragging=true; beginDrag(cardEl, index); }
    if(dragging) updateDrag(ev.clientX, ev.clientY, index);
  }
  function up(ev){ cleanup(); if(dragging){ dragging=false; dropDrag(ev.clientX, ev.clientY, index); } }
  function cancel(){ cleanup(); if(dragging){ dragging=false; endDrag(); } }
  function cleanup(){
    try{ cardEl.releasePointerCapture(pid); }catch(e){}
    cardEl.removeEventListener("pointermove",   move);
    cardEl.removeEventListener("pointerup",     up);
    cardEl.removeEventListener("pointercancel", cancel);
    if(activeDragCleanup===cleanup) activeDragCleanup=null;
  }
}

window.addEventListener("blur", forceEndActiveDrag);
document.addEventListener("visibilitychange", function(){
  if(document.hidden) forceEndActiveDrag();
});
function forceEndActiveDrag(){
  if(activeDragCleanup){ const fn=activeDragCleanup; activeDragCleanup=null; fn(); }
  if(dragState) endDrag();
}

let dragState = null;
function beginDrag(cardEl, index){
  const c     = CARD_DB[S.hand[index]];
  const clone = $("#dragClone");
  clone.innerHTML = '<div class="card card-frame-card cost-'+c.type+'" style="width:100%;height:100%">'+
    cardFaceHtml(c) + '</div>';
  if(c.target==="enemy"){
    cardEl.classList.add("targeting");
  } else {
    cardEl.classList.add("dragging");
    clone.style.display = "block";
  }
  dragState = { cardEl, card:c, index, origin:cardEl.getBoundingClientRect() };
  if(c.target==="enemy") document.querySelectorAll(".enemy").forEach(e => {
    if(!e.classList.contains("dead")) e.classList.add("targetable");
  });
}

function updateDrag(x, y){
  if(!dragState) return;
  if(dragState.card.target!=="enemy"){
    const clone = $("#dragClone");
    clone.style.left = x+"px"; clone.style.top = y+"px";
  }
  const en = enemyUnder(x, y);
  document.querySelectorAll(".enemy.hovered").forEach(e => e.classList.remove("hovered"));
  if(dragState.card.target==="enemy" && en) en.el.classList.add("hovered");
  if(dragState.card.target==="enemy"){
    const o = dragState.cardEl.getBoundingClientRect();
    drawAim(o.left+o.width/2, o.top+o.height/2, x, y);
  }
}

function dropDrag(x, y, index){
  const c = dragState ? dragState.card : CARD_DB[S.hand[index]];
  if(c.target==="enemy"){
    const en = enemyUnder(x, y);
    if(en) playCard(index, en.enemy);
  } else {
    const dock = $("#dock").getBoundingClientRect();
    if(y < dock.top) playCard(index, null);
  }
  endDrag();
}

function endDrag(){
  $("#dragClone").style.display = "none";
  $("#aim").innerHTML = "";
  document.querySelectorAll(".targetable,.hovered").forEach(e => e.classList.remove("targetable","hovered"));
  if(dragState && dragState.cardEl) dragState.cardEl.classList.remove("dragging","targeting");
  dragState = null;
  renderHand();
}

function enemyUnder(x, y){
  const el = document.elementFromPoint(x, y);
  if(!el) return null;
  const ce = el.closest(".enemy");
  if(!ce || ce.classList.contains("dead")) return null;
  const enemy = S.enemies.find(e => e.id===ce.dataset.id);
  return enemy && enemy.hp>0 ? { el:ce, enemy } : null;
}

function drawAim(x1, y1, x2, y2){
  const dx=x2-x1, dy=y2-y1;
  const dist=Math.hypot(dx,dy)||1;
  const bow=Math.min(dist*0.22, 90);
  const mx=(x1+x2)/2 + dy*(bow/dist);
  const my=(y1+y2)/2 - dx*(bow/dist);
  // 곡선(베지어) 끝점의 접선 방향(제어점->끝점)으로 회전시켜 화살촉이 곡선과 이어지도록 함.
  // 화살촉 에셋 기본 방향(위쪽)을 그 접선 각도에 맞추기 위한 보정(+90deg)
  const headDeg = Math.atan2(y2-my, x2-mx) * 180/Math.PI + 90;
  const pathD = 'M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2;
  $("#aim").innerHTML =
    '<svg width="100%" height="100%" style="position:absolute;inset:0">'+
    '<defs>'+
    '<linearGradient id="aimLineGrad" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" gradientUnits="userSpaceOnUse">'+
    '<stop offset="0%" stop-color="#fff3d0"/><stop offset="55%" stop-color="#e7b54a"/><stop offset="100%" stop-color="#b07d1d"/>'+
    '</linearGradient>'+
    '<filter id="aimGlow" x="-60%" y="-60%" width="220%" height="220%">'+
    '<feGaussianBlur stdDeviation="2.4" result="blur"/>'+
    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'+
    '</filter>'+
    '</defs>'+
    '<path d="'+pathD+'" fill="none" stroke="url(#aimLineGrad)" stroke-width="7" '+
    'stroke-dasharray="3 10" stroke-linecap="round" filter="url(#aimGlow)" opacity="0.95"/>'+
    '<path d="'+pathD+'" fill="none" stroke="#fff8e4" stroke-width="2" '+
    'stroke-dasharray="3 10" stroke-linecap="round" opacity="0.6"/>'+
    '</svg>'+
    '<div class="aim-head-pivot" style="left:'+x2+'px;top:'+y2+'px;transform:rotate('+headDeg+'deg)">'+
    '<img class="aim-head-img" src="assets/ui/battle/target_arrow_head.png" alt="">'+
    '</div>';
}

