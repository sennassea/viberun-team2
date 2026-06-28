"use strict";
/* =========================================================================
   카드 데이터베이스
   - 캐릭터/몬스터/라이프 데이터는 별도 파일에서 관리
   - 이 파일은 카드, 턴 흐름, 렌더링, 드래그 조작만 담당
   ========================================================================= */

const COMBAT_DATA = window.BOHYUN_COMBAT_DATA || {};
const LIFE = window.BOHYUN_LIFE_SYSTEM;
const MONSTER_PATTERN = COMBAT_DATA.monsterPatternSystem;

if(!COMBAT_DATA.character || !Array.isArray(COMBAT_DATA.monsters) || !LIFE || !MONSTER_PATTERN){
  throw new Error("캐릭터/몬스터/라이프 데이터 파일이 먼저 로드되어야 합니다.");
}

const PLAYER_DEF = COMBAT_DATA.character;
const MONSTER_DEFS = COMBAT_DATA.monsters;

const CARD_DB = {
  rosary:{name:"염주",   cost:1, type:"attack",  emoji:"📿", target:"enemy",
          desc:"적에게 9 피해를 줍니다.\n신성: 1 추가 피해", fx:[{t:"damage",v:9}]},
  bell:  {name:"방울",   cost:1, type:"attack",  emoji:"🔔", target:"enemy",
          desc:"적에게 7 피해를 줍니다.\n3장 뽑습니다.",      fx:[{t:"damage",v:7},{t:"draw",v:3}]},
  doll:  {name:"인형",   cost:1, type:"attack",  emoji:"🧸", target:"enemy",
          desc:"적에게 8 피해를 줍니다.\n약화 1 부여",         fx:[{t:"damage",v:8},{t:"applyWeak",v:1}]},
  bible: {name:"성경",   cost:1, type:"defense", emoji:"📖", target:"self",
          desc:"보호막 8 획득합니다.\n카드 1장을 뽑습니다.", fx:[{t:"block",v:8},{t:"draw",v:1}]},
  charm: {name:"오색방지",cost:1, type:"defense", emoji:"🎀", target:"self",
          desc:"보호막 10 획득합니다.\n약화 1 제거",          fx:[{t:"block",v:10},{t:"removeWeak",v:1}]},
  pray:  {name:"기도",   cost:1, type:"skill",   emoji:"🙏", target:"self",
          desc:"체력 6 회복합니다.\n추가 에너지 +1",        fx:[{t:"heal",v:6},{t:"energy",v:1}]},
};

/* 시작 덱(여러 장 복제) */
const STARTER_DECK = [
  "rosary","rosary","rosary","rosary",
  "bell","bell","doll","doll",
  "bible","bible","bible","charm","charm","pray",
];

const MAX_ENERGY = 3;
const DRAW_PER_TURN = 5;

/* 전역 상태 */
let S;

function newGame(){
  S = {
    player: LIFE.createPlayer(PLAYER_DEF),
    enemyIndex: 0,
    enemies: [],
    energy: MAX_ENERGY,
    hand: [],
    draw: [],
    discard: [],
    selectedId: null,
    busy: false,
    over: null,
  };

  spawnCurrentEnemy();

  // 덱 셔플 후 첫 드로우
  S.draw = shuffle([...STARTER_DECK]);
  drawCards(DRAW_PER_TURN);
  renderAll();
}

function spawnCurrentEnemy(){
  const monsterDef = MONSTER_DEFS[S.enemyIndex];
  if(!monsterDef){
    S.enemies = [];
    S.selectedId = null;
    return null;
  }

  const enemy = LIFE.createMonster(monsterDef, S.enemyIndex);
  S.enemies = [enemy];
  S.selectedId = enemy.id;
  return enemy;
}

/* ----- 유틸 ----- */
const $ = s=>document.querySelector(s);
const livingEnemies = ()=>S.enemies.filter(e=>e.hp>0);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

/* 카드 드로우: 덱이 비면 버린 더미를 섞어 보충
   손패가 10장이면 새로 뽑은 카드를 버린 더미로 이동 (최대 10장 제한) */
function drawCards(n){
  for(let i=0;i<n;i++){
    if(S.draw.length===0){
      if(S.discard.length===0) break;
      S.draw = shuffle(S.discard);
      S.discard = [];
    }
    const drawn = S.draw.pop();
    if(S.hand.length >= 10){
      S.discard.push(drawn);
    } else {
      S.hand.push(drawn);
    }
  }
}

/* =========================================================================
   카드 사용
   ========================================================================= */
function playCard(handIndex, targetEnemy){
  const key = S.hand[handIndex];
  const card = CARD_DB[key];
  if(!card) return false;
  if(S.energy < card.cost){ flashEnergy(); toast("에너지가 부족합니다"); return false; }
  if(card.target==="enemy" && (!targetEnemy || targetEnemy.hp<=0)) return false;

  S.energy -= card.cost;

  for(const e of card.fx){
    switch(e.t){
      case "damage":
        applyDamageWithFeedback(targetEnemy, e.v, S.player.weak);
        break;
      case "block":
        LIFE.addBlock(S.player, e.v);
        spawnFloat('.player', '+'+e.v, 'blk');
        break;
      case "draw":
        drawCards(e.v);
        break;
      case "heal": {
        const healed = LIFE.heal(S.player, e.v);
        if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
        break;
      }
      case "energy":
        S.energy += e.v;
        break;
      case "applyWeak":
        if(targetEnemy) LIFE.addWeak(targetEnemy, e.v);
        break;
      case "removeWeak":
        LIFE.reduceWeak(S.player, e.v);
        break;
    }
  }

  // 손패 → 버린 더미
  S.hand.splice(handIndex,1);
  S.discard.push(key);

  if(livingEnemies().length===0){
    advanceEnemyOrWin();
    renderAll();
    return true;
  }

  renderAll();
  return true;
}

function applyDamageWithFeedback(target, rawDamage, attackerWeak){
  const result = LIFE.applyDamage(target, rawDamage, attackerWeak);
  const sel = target===S.player ? '.player' : '[data-id="'+target.id+'"]';

  if(result.absorbed > 0){
    spawnFloat(sel, '-'+result.absorbed, 'blk');
  }
  if(result.hpLoss > 0){
    spawnFloat(sel, '-'+result.hpLoss, 'dmg');
  }
  if(result.absorbed === 0 && result.hpLoss === 0){
    spawnFloat(sel, '0', 'blk');
  }
}

function advanceEnemyOrWin(){
  const defeated = S.enemies[0];
  if(defeated){
    toast(defeated.name + " 성불 완료");
  }

  S.enemyIndex += 1;

  if(S.enemyIndex >= MONSTER_DEFS.length){
    return endGame("win");
  }

  const nextEnemy = spawnCurrentEnemy();
  if(nextEnemy){
    toast(nextEnemy.name + " 등장");
  }
}

/* =========================================================================
   턴 종료 → 적 행동 → 새 플레이어 턴
   ========================================================================= */
async function endTurn(){
  if(S.busy || S.over) return;
  S.busy = true;
  updateEndBtn();

  // 플레이어 턴 종료: 자신의 약화 1 감소
  LIFE.reduceWeak(S.player, 1);

  // 남은 손패 버림
  S.discard.push(...S.hand);
  S.hand = [];
  renderAll();
  await wait(250);

  // 현재 몬스터 행동
  for(const e of S.enemies){
    if(e.hp<=0) continue;
    const mv = e.intent;
    if(!mv) continue;

    if(mv.t==="attack"){
      applyDamageWithFeedback(S.player, mv.v, e.weak);
    }
    else if(mv.t==="defend"){
      LIFE.addBlock(e, mv.v);
      spawnFloat('[data-id="'+e.id+'"]', '+'+mv.v, 'blk');
    }
    else if(mv.t==="debuff"){
      LIFE.addWeak(S.player, mv.v);
      spawnFloat('.player', '약화', 'dmg');
    }

    LIFE.reduceWeak(e, 1);
    renderAll();

    if(S.player.hp<=0){
      return endGame("lose");
    }

    await wait(450);
  }

  // 새 플레이어 턴 준비
  LIFE.prepareNextPlayerTurn(S.player);
  S.energy = MAX_ENERGY;
  drawCards(DRAW_PER_TURN);
  S.enemies.forEach(planIntent);
  S.busy = false;
  renderAll();
}

/* 다음 행동 의도 결정 */
function planIntent(e){
  MONSTER_PATTERN.planNextIntent(e);
}

function endGame(result){
  S.over = result;
  S.busy = false;
  $("#overTitle").textContent = result==="win" ? "🎉 승리!" : "💀 패배...";
  $("#overDesc").textContent  = result==="win" ? "모든 영혼을 성불시켰습니다." : PLAYER_DEF.name + "이 쓰러졌습니다.";
  $("#over").classList.add("show");
  return true;
}

/* =========================================================================
   렌더링
   ========================================================================= */
function renderAll(){ renderHud(); renderEffects(); renderIntents(); renderField(); renderHand(); renderDock(); updateEndBtn(); }

function renderHud(){
  $("#hudPortrait").textContent = S.player.emoji || "👼";
  $("#hudName").textContent = S.player.name;
  $("#hudTitle").textContent = S.player.title || "";
  $("#hudHp").textContent = S.player.hp+"/"+S.player.maxHp;
  $("#hudDeck").textContent = STARTER_DECK.length;
}

function renderEffects(){
  const rows=[];
  if(S.player.block>0) rows.push(eff("🛡️","은총의 보호","보호막 "+S.player.block));
  if(S.player.weak>0)  rows.push(eff("🌀","약화","공격 피해 25% 감소 ("+S.player.weak+"턴)"));
  rows.push(eff("💚","치유의 향기","회복 카드 보유"));
  $("#effList").innerHTML = rows.join("") || '<div class="eff-empty">효과 없음</div>';
}
function eff(ico,name,sub){
  return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
       +'<div class="eff-txt"><b>'+name+'</b><span>'+sub+'</span></div></div>';
}

function renderIntents(){
  const html = S.enemies.filter(e=>e.hp>0).map(e=>{
    const m=e.intent;
    if(!m) return "";
    let ico,txt,cls;
    if(m.t==="attack"){ico="⚔️";txt=(m.name ? m.name+" / " : "")+m.v+" 피해"+(e.weak>0?" (약화)":"");cls="atk";}
    else if(m.t==="defend"){ico="🛡️";txt=(m.name ? m.name+" / " : "")+"보호막 "+m.v+" 획득";cls="def";}
    else {ico="🌀";txt=(m.name ? m.name+" / " : "")+"약화 "+m.v+" 부여";cls="deb";}
    return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
         +'<div class="eff-txt"><b style="color:'
         +(cls==="atk"?"var(--c-red-deep)":cls==="def"?"var(--c-blue-deep)":"#8a5cc0")
         +'">'+e.name+'</b><span>'+txt+'</span></div></div>';
  }).join("");
  $("#intentList").innerHTML = html || '<div class="eff-empty">성불 완료</div>';
}

function renderField(){
  const f=$("#field");
  f.innerHTML="";

  // 플레이어(좌측)
  f.appendChild(combatantEl({
    cls:"player", emoji:S.player.emoji || "👼", name:S.player.name,
    hp:S.player.hp, maxHp:S.player.maxHp,
    block:S.player.block, weak:S.player.weak, healingAura:S.player.healingAura, x:18, intent:null,
  }));

  // 현재 몬스터 1명만 우측에 표시
  S.enemies.forEach((e)=>{
    const el=combatantEl({
      cls:"enemy ghost"+(e.id===S.selectedId?" selected":""), emoji:e.emoji, name:e.name,
      hp:e.hp, maxHp:e.maxHp, block:e.block, weak:e.weak, x:e.x || 72, intent:e.intent, id:e.id,
    });
    if(e.hp<=0) el.classList.add("dead");
    el.addEventListener("pointerdown",()=>{ if(e.hp>0){ S.selectedId=e.id; renderField(); } });
    f.appendChild(el);
  });
}

/* 전투원 1명 DOM 생성 */
function combatantEl(o){
  const el=document.createElement("div");
  el.className="combatant "+o.cls;
  el.style.left=o.x+"%";
  el.style.bottom="2cqh";
  el.style.transform="translateX(-50%)";
  if(o.id) el.dataset.id=o.id;
  const intentHtml = o.intent ? intentBubble(o.intent,o.weak) : "";
  el.innerHTML =
    intentHtml +
    '<div class="avatar">'+o.emoji+'</div>'+
    '<div class="name">'+o.name+'</div>'+ 
    LIFE.renderCombatantStats(o) +
    '<div class="hit"></div>';
  return el;
}
function intentBubble(m,weak){
  if(m.t==="attack") return '<div class="intent atk">⚔️ '+m.v+(weak>0?'↓':'')+'</div>';
  if(m.t==="defend") return '<div class="intent def">🛡️ 보호</div>';
  return '<div class="intent deb">🌀 약화</div>';
}

function renderHand(){
  const h=$("#hand");
  h.innerHTML="";
  S.hand.forEach((key,i)=>{
    const c=CARD_DB[key];
    const el=document.createElement("div");
    el.className="card cost-"+c.type;
    el.dataset.index=i;
    el.innerHTML =
      '<div class="cost">'+c.cost+'</div>'+ 
      '<div class="cname">'+c.name+'</div>'+ 
      '<div class="art">'+c.emoji+'</div>'+ 
      '<div class="type '+c.type+'">'+typeLabel(c.type)+'</div>'+ 
      '<div class="desc">'+c.desc+'</div>';
    attachDrag(el, i);
    h.appendChild(el);
  });
}
const typeLabel = t=> t==="attack"?"공격":t==="defense"?"방어":"스킬";

function renderDock(){
  $("#energy .val").textContent = S.energy+"/"+MAX_ENERGY;
  $("#deckCount").textContent = S.draw.length;
  $("#discardCount").textContent = S.discard.length;
}
function updateEndBtn(){ $("#endTurn").disabled = !!(S.busy||S.over); }

/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
function attachDrag(cardEl, index){
  let startX=0,startY=0,dragging=false,pid=null;

  cardEl.addEventListener("pointerdown", down);
  function down(ev){
    if(S.busy||S.over) return;
    pid=ev.pointerId; startX=ev.clientX; startY=ev.clientY; dragging=false;
    cardEl.setPointerCapture(pid);
    cardEl.addEventListener("pointermove", move);
    cardEl.addEventListener("pointerup", up);
    cardEl.addEventListener("pointercancel", cancel);
  }
  function move(ev){
    const dx=ev.clientX-startX, dy=ev.clientY-startY;
    if(!dragging && Math.hypot(dx,dy)>DRAG_THRESHOLD){
      dragging=true; beginDrag(cardEl, index);
    }
    if(dragging) updateDrag(ev.clientX, ev.clientY, index);
  }
  function up(ev){
    cleanup();
    if(dragging){ dragging=false; dropDrag(ev.clientX, ev.clientY, index); }
  }
  function cancel(){ cleanup(); if(dragging){ dragging=false; endDrag(); } }
  function cleanup(){
    try{ cardEl.releasePointerCapture(pid); }catch(e){}
    cardEl.removeEventListener("pointermove", move);
    cardEl.removeEventListener("pointerup", up);
    cardEl.removeEventListener("pointercancel", cancel);
  }
}

let dragState=null;
function beginDrag(cardEl, index){
  const c=CARD_DB[S.hand[index]];
  cardEl.classList.add("dragging");
  const clone=$("#dragClone");
  clone.innerHTML='<div class="card cost-'+c.type+'" style="width:100%;height:100%">'
    +'<div class="cost">'+c.cost+'</div><div class="cname">'+c.name+'</div>'
    +'<div class="art">'+c.emoji+'</div><div class="type '+c.type+'">'+typeLabel(c.type)+'</div>'
    +'<div class="desc">'+c.desc+'</div></div>';
  clone.style.display="block";
  dragState={cardEl, card:c, index, origin:cardEl.getBoundingClientRect()};
  if(c.target==="enemy") document.querySelectorAll(".enemy").forEach(e=>{
    if(!e.classList.contains("dead")) e.classList.add("targetable");
  });
}
function updateDrag(x,y,index){
  if(!dragState) return;
  const gr=$("#game").getBoundingClientRect();
  const clone=$("#dragClone");
  clone.style.left=(x-gr.left)+"px";
  clone.style.top=(y-gr.top)+"px";
  const en=enemyUnder(x,y);
  document.querySelectorAll(".enemy.hovered").forEach(e=>e.classList.remove("hovered"));
  if(dragState.card.target==="enemy" && en) en.el.classList.add("hovered");
  if(dragState.card.target==="enemy"){
    const o=dragState.origin;
    drawAim(o.left+o.width/2-gr.left, o.top-gr.top, x-gr.left, y-gr.top);
  }
}
function dropDrag(x,y,index){
  const c=dragState ? dragState.card : CARD_DB[S.hand[index]];
  if(c.target==="enemy"){
    const en=enemyUnder(x,y);
    if(en) playCard(index, en.enemy);
  } else {
    const dock=$("#dock").getBoundingClientRect();
    if(y < dock.top) playCard(index, null);
  }
  endDrag();
}
function endDrag(){
  $("#dragClone").style.display="none";
  $("#aim").innerHTML="";
  document.querySelectorAll(".targetable,.hovered").forEach(e=>e.classList.remove("targetable","hovered"));
  if(dragState && dragState.cardEl) dragState.cardEl.classList.remove("dragging");
  dragState=null;
  renderHand();
}

function enemyUnder(x,y){
  const el=document.elementFromPoint(x,y);
  if(!el) return null;
  const ce=el.closest(".enemy");
  if(!ce || ce.classList.contains("dead")) return null;
  const enemy=S.enemies.find(e=>e.id===ce.dataset.id);
  return enemy && enemy.hp>0 ? {el:ce, enemy} : null;
}

function drawAim(x1,y1,x2,y2){
  const mx=(x1+x2)/2, my=Math.min(y1,y2)-60;
  $("#aim").innerHTML=
    '<svg width="100%" height="100%" style="position:absolute;inset:0">'
    +'<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">'
    +'<path d="M2 2 L10 6 L2 10 Z" fill="#e7b54a"/></marker></defs>'
    +'<path d="M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2+'" fill="none" '
    +'stroke="#e7b54a" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" '
    +'marker-end="url(#ah)" opacity="0.9"/></svg>';
}

/* ----- 피드백 유틸 ----- */
function spawnFloat(sel, text, kind){
  const host=document.querySelector(sel); if(!host) return;
  const g=$("#game").getBoundingClientRect();
  const r=host.getBoundingClientRect();
  const el=document.createElement("div");
  el.className="float "+kind; el.textContent=text;
  el.style.left=(r.left-g.left+r.width/2)+"px";
  el.style.top =(r.top -g.top +r.height*0.25)+"px";
  el.style.transform="translateX(-50%)";
  $("#fx").appendChild(el);
  setTimeout(()=>el.remove(),900);
}
let toastT;
function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("show"),1200);
}
function flashEnergy(){ const e=$("#energy"); e.classList.add("flash"); setTimeout(()=>e.classList.remove("flash"),350); }
const wait = ms=>new Promise(r=>setTimeout(r,ms));

/* ----- 버튼 바인딩 ----- */
$("#endTurn").addEventListener("click", endTurn);
$("#restart").addEventListener("click", ()=>{ $("#over").classList.remove("show"); newGame(); });

/* 시작 */
newGame();
