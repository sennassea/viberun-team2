"use strict";
/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
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
  }
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
  const bow=Math.min(Math.hypot(dx,dy)*0.22, 90);
  const mx=(x1+x2)/2 + dy*(bow/(Math.hypot(dx,dy)||1));
  const my=(y1+y2)/2 - dx*(bow/(Math.hypot(dx,dy)||1));
  $("#aim").innerHTML =
    '<svg width="100%" height="100%" style="position:absolute;inset:0">'+
    '<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">'+
    '<path d="M2 2 L10 6 L2 10 Z" fill="#e7b54a"/></marker></defs>'+
    '<path d="M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2+'" fill="none" '+
    'stroke="#e7b54a" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" '+
    'marker-end="url(#ah)" opacity="0.9"/></svg>';
}

