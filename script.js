"use strict";
/* =========================================================================
   Combat Controller – ACT 1 패키지 다중 적 전투
   패키지 내 모든 몬스터를 전투 시작 시 동시 배치, 전멸 시 노드 클리어
   ========================================================================= */

const COMBAT_DATA    = window.BOHYUN_COMBAT_DATA || {};
const LIFE           = window.BOHYUN_LIFE_SYSTEM;
const MONSTER_PATTERN = COMBAT_DATA.monsterPatternSystem;

if(
  !COMBAT_DATA.character ||
  !Array.isArray(COMBAT_DATA.monsters) ||
  !LIFE ||
  !MONSTER_PATTERN ||
  typeof CARD_DB          === "undefined" ||
  typeof BASE_STARTER_DECK === "undefined" ||
  typeof STARTER_DECK      === "undefined" ||
  typeof CARD_REWARD_POOL  === "undefined" ||
  typeof RELIC_DB          === "undefined" ||
  typeof typeLabel         === "undefined"
){
  throw new Error("캐릭터/몬스터/라이프/카드 데이터 파일이 먼저 로드되어야 합니다.");
}

const PLAYER_DEF   = COMBAT_DATA.character;
const MONSTER_DEFS = COMBAT_DATA.monsters; // loadStageMonsters()가 패키지 몬스터로 채운다

const MAX_ENERGY        = 3;
const ENERGY_SLOT_COUNT = 8;
const DRAW_PER_TURN     = 5;
const STARTING_GOLD     = 120;
const STARTING_MOON_SHARDS = 0;

let S;

/* =========================================================================
   전투 초기화
   ========================================================================= */
function newGame(){
  STARTER_DECK = [...BASE_STARTER_DECK];

  const stageIdx = window.MAP_STATE ? window.MAP_STATE.currentStage : 0;
  const curStage = window.ACT1_MAP_STAGES && window.ACT1_MAP_STAGES[stageIdx];

  S = {
    player:   LIFE.createPlayer(PLAYER_DEF),
    enemies:  [],       // 패키지 전체 몬스터 (동시 배치)
    selectedId: null,   // 현재 선택된 적 ID
    energy:   MAX_ENERGY,
    hand: [], draw: [], discard: [],
    busy: false, over: null, rewardOpen: false,
    relics: [], potions: [],
    gold: STARTING_GOLD, moonShards: STARTING_MOON_SHARDS,
    turn: 1,
    // 노드 컨텍스트 (기획서 §2)
    battleNodeType:  curStage ? (curStage.type      || "enemy") : "enemy",
    battlePackageId: curStage ? (curStage.packageId || null)    : null,
    encounterCleared: false,
  };

  // 패키지 몬스터 전체 동시 배치 (기획서 §8-3)
  spawnPackageEnemies();

  S.draw = shuffle([...STARTER_DECK]);
  drawCards(DRAW_PER_TURN);
  renderAll();
}

// MONSTER_DEFS(패키지 몬스터 전체)를 한 번에 전장에 배치
function spawnPackageEnemies(){
  if(!MONSTER_DEFS.length){ S.enemies = []; S.selectedId = null; return; }
  S.enemies = MONSTER_DEFS.map((def, i) => {
    const e = LIFE.createMonster(def, i);
    e.spawnIndex = i;
    return e;
  });
  S.selectedId = S.enemies[0]?.id || null;
}

/* =========================================================================
   유틸
   ========================================================================= */
const $ = s => document.querySelector(s);
const livingEnemies = () => S.enemies.filter(e => e.hp > 0);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

// 선택 적이 죽으면 다음 생존 적으로 자동 전환 (기획서 §8-6)
function autoSelectTarget(){
  const alive = livingEnemies();
  if(!alive.length){ S.selectedId = null; return; }
  if(!alive.find(e => e.id === S.selectedId)) S.selectedId = alive[0].id;
}

/* =========================================================================
   카드 드로우
   ========================================================================= */
function drawCards(n){
  for(let i=0;i<n;i++){
    if(S.draw.length===0){
      if(S.discard.length===0) break;
      S.draw = shuffle(S.discard); S.discard = [];
    }
    const drawn = S.draw.pop();
    if(S.hand.length >= 10) discardCard(drawn, { source:"drawOverflow" });
    else S.hand.push(drawn);
  }
}

function discardCard(key, options={}){
  const card = CARD_DB[key];
  if(!card) return;
  const sr = LIFE.resolveStatusCardDiscard(card, S.player, options);
  if(sr.handled){
    if(sr.damage){
      if(sr.damage.absorbed > 0) spawnFloat('.player', '-'+sr.damage.absorbed, 'blk');
      if(sr.damage.hpLoss  > 0) spawnFloat('.player', '-'+sr.damage.hpLoss,   'dmg');
    }
    if(sr.message) toast(sr.message);
    if(sr.discard) S.discard.push(key);
    return;
  }
  if(card.exhaust){ toast(card.name+" 소멸"); return; }
  S.discard.push(key);
}

function addStatusCardToDiscard(cardKey, count=1){
  const card = CARD_DB[cardKey];
  if(!card || card.rarity!=="status") return 0;
  const amount = Math.max(1, count||1);
  for(let i=0;i<amount;i++) S.discard.push(cardKey);
  toast(card.name+" "+amount+"장 추가");
  return amount;
}

/* =========================================================================
   카드 사용
   ========================================================================= */
function playCard(handIndex, targetEnemy){
  const key  = S.hand[handIndex];
  const card = CARD_DB[key];
  if(!card) return false;
  if(card.unplayable){ toast(card.name+"은 사용할 수 없습니다"); return false; }
  if(S.energy < card.cost){ flashEnergy(); toast("정신력이 부족합니다"); return false; }
  if(card.target==="enemy" && (!targetEnemy || targetEnemy.hp<=0)) return false;

  S.energy -= card.cost;

  for(const e of card.fx){
    switch(e.t){
      case "damage":
        applyDamageWithFeedback(targetEnemy, e.v, S.player.weak); break;
      case "bonusLowHpDamage":
        if(targetEnemy && targetEnemy.hp>0 && targetEnemy.hp<=Math.ceil(targetEnemy.maxHp/2))
          applyDamageWithFeedback(targetEnemy, e.v, S.player.weak);
        break;
      case "damageAll":
        livingEnemies().forEach(en => applyDamageWithFeedback(en, e.v, S.player.weak)); break;
      case "applyWeakAll":
        livingEnemies().forEach(en => LIFE.addWeak(en, e.v)); break;
      case "block":
        LIFE.addBlock(S.player, e.v);
        spawnFloat('.player', '+'+e.v, 'blk'); break;
      case "draw":
        drawCards(e.v); break;
      case "heal": {
        const healed = LIFE.heal(S.player, e.v);
        if(healed>0) spawnFloat('.player', '+'+healed, 'heal');
        break;
      }
      case "energy":
        S.energy += e.v; break;
      case "applyWeak":
        if(targetEnemy) LIFE.addWeak(targetEnemy, e.v); break;
      case "removeWeak":
        LIFE.reduceWeak(S.player, e.v); break;
    }
  }

  S.hand.splice(handIndex, 1);
  discardCard(key, { source:"played" });
  autoSelectTarget();

  // 생존 적 0명 = 패키지 전멸 = 노드 클리어 (기획서 §8-6)
  if(livingEnemies().length===0){
    nodeClear();
    renderAll();
    return true;
  }

  renderAll();
  return true;
}

function applyDamageWithFeedback(target, rawDamage, attackerWeak){
  const result = LIFE.applyDamage(target, rawDamage, attackerWeak);
  const sel = target===S.player ? '.player' : '[data-id="'+target.id+'"]';
  if(result.absorbed > 0)                          spawnFloat(sel, '-'+result.absorbed, 'blk');
  if(result.hpLoss   > 0)                          spawnFloat(sel, '-'+result.hpLoss,   'dmg');
  if(result.absorbed === 0 && result.hpLoss === 0) spawnFloat(sel, '0', 'blk');
}

/* =========================================================================
   노드 클리어 – 패키지 전체 몬스터 전멸 시 1회만 실행 (기획서 §10)
   ========================================================================= */
function nodeClear(){
  if(S.encounterCleared) return;
  S.encounterCleared = true;

  S.enemies.forEach(e => toast(e.name+" 성불 완료"));

  const nodeType = S.battleNodeType || "enemy";
  if(nodeType==="boss")  return endGame("win");   // 보스 클리어 → 게임 승리 (기획서 §6)
  if(nodeType==="elite") grantRelic();             // 엘리트 → 유물 추가 (기획서 §10)
  openCardReward();                                // 카드 보상 후 맵 복귀
}

/* =========================================================================
   보상
   ========================================================================= */
function getRandomRewardKeys(count){
  return shuffle([...CARD_REWARD_POOL]).slice(0, count);
}

function openCardReward(){
  S.busy = true; S.rewardOpen = true;
  renderRewardOverlay(getRandomRewardKeys(3));
  updateEndBtn();
}

function chooseRewardCard(key){
  if(!S || !S.rewardOpen) return;
  const card = CARD_DB[key];
  if(!card) return;
  STARTER_DECK.push(key);
  S.discard.push(key);
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  toast(card.name+" 획득");
  window.MAP_STATE.proceedMode = true;
  if(typeof openMap==="function") openMap();
}

function skipRewardCard(){
  if(!S || !S.rewardOpen) return;
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  window.MAP_STATE.proceedMode = true;
  if(typeof openMap==="function") openMap();
}

function grantRelic(){
  if(!S.relics) S.relics = [];
  const relic = RELIC_DB[Math.floor(Math.random()*RELIC_DB.length)];
  S.relics.push(relic);
  toast("법구 획득: "+relic.emoji+" "+relic.name);
  renderHud();
}

function ensureRewardOverlay(){
  let ov = document.querySelector("#cardRewardOverlay");
  if(ov) return ov;
  ov = document.createElement("div");
  ov.id = "cardRewardOverlay";
  ov.innerHTML =
    '<div class="reward-panel">' +
      '<h2>정화 보상</h2>' +
      '<p>새로운 카드 1장을 선택해 덱에 추가하세요.</p>' +
      '<div class="reward-cards"></div>' +
      '<button type="button" class="reward-skip">건너뛰기</button>' +
    '</div>';
  document.querySelector("#game").appendChild(ov);
  ov.querySelector(".reward-skip").addEventListener("click", skipRewardCard);
  return ov;
}

function renderRewardOverlay(keys){
  if(typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED==="function")
    window.BOHYUN_MARK_CARDS_ENCOUNTERED(keys);
  const ov   = ensureRewardOverlay();
  const wrap = ov.querySelector(".reward-cards");
  wrap.innerHTML = keys.map(rewardCardHtml).join("");
  wrap.querySelectorAll(".reward-card").forEach(btn =>
    btn.addEventListener("click", () => chooseRewardCard(btn.dataset.card))
  );
  ov.classList.add("show");
}

function rewardCardHtml(key){
  const c = CARD_DB[key];
  if(!c) return "";
  return '<button type="button" class="reward-card cost-'+c.type+'" data-card="'+key+'">' +
    '<div class="cost">'+c.cost+'</div>' +
    '<div class="cname">'+c.name+'</div>' +
    '<div class="art">'+c.emoji+'</div>' +
    '<div class="type '+c.type+'">'+typeLabel(c.type)+'</div>' +
    '<div class="reward-meta">'+(c.attr||"-")+' · '+(c.rarity||"common")+'</div>' +
    '<div class="desc">'+c.desc+'</div>' +
  '</button>';
}

function closeRewardOverlay(){
  const ov = document.querySelector("#cardRewardOverlay");
  if(ov) ov.classList.remove("show");
}

/* =========================================================================
   턴 종료 → 생존 적 행동(spawnIndex 순) → 새 플레이어 턴
   ========================================================================= */
async function endTurn(){
  if(S.busy || S.over) return;
  S.busy = true;
  updateEndBtn();

  LIFE.reduceWeak(S.player, 1);
  LIFE.reduceAnxiety(S.player, 1);
  LIFE.reduceLethargy(S.player, 1);

  S.hand.forEach(key => discardCard(key, { source:"turnEnd" }));
  S.hand = [];
  renderAll();
  await wait(250);

  if(S.player.hp<=0) return endGame("lose");

  // 생존 적을 spawnIndex 순서대로 행동 (기획서 §8-5)
  const actingEnemies = livingEnemies().sort((a,b) => (a.spawnIndex||0)-(b.spawnIndex||0));
  for(const e of actingEnemies){
    const mv = e.intent;
    if(!mv) continue;

    if(mv.t==="attack"){
      applyDamageWithFeedback(S.player, mv.v, e.weak);
      if(mv.statusCard){
        const added = addStatusCardToDiscard(mv.statusCard, mv.statusCount||1);
        if(added>0) spawnFloat('.player', CARD_DB[mv.statusCard].name, 'dmg');
      }
    } else if(mv.t==="defend"){
      LIFE.addBlock(e, mv.v);
      spawnFloat('[data-id="'+e.id+'"]', '+'+mv.v, 'blk');
    } else if(mv.t==="summon"){
      spawnFloat('[data-id="'+e.id+'"]', '소환', 'heal');
    } else if(mv.t==="debuff"){
      if(mv.role==="anxiety"){
        LIFE.addAnxiety(S.player, mv.v);
        spawnFloat('.player', '불안', 'dmg');
      } else if(mv.role==="counter"){
        LIFE.addLethargy(S.player, mv.v);
        spawnFloat('.player', '무기력', 'dmg');
      } else {
        LIFE.addWeak(S.player, mv.v);
        spawnFloat('.player', '동요', 'dmg');
      }
    }

    LIFE.reduceWeak(e, 1);
    renderAll();
    if(S.player.hp<=0) return endGame("lose");
    await wait(450);
  }

  // 새 플레이어 턴 준비
  LIFE.prepareNextPlayerTurn(S.player);
  const anxietyPenalty  = (S.player.anxiety||0)  > 0 ? 1 : 0;
  const lethargyPenalty = (S.player.lethargy||0) > 0 ? 1 : 0;
  S.energy    = Math.max(0, MAX_ENERGY - lethargyPenalty);
  const drawCount = Math.max(0, DRAW_PER_TURN - anxietyPenalty);
  if(anxietyPenalty>0)  toast("불안으로 카드 뽑기 -1");
  if(lethargyPenalty>0) toast("무기력으로 정신력 -1");
  S.turn += 1;
  drawCards(drawCount);
  // 생존 적 다음 행동 의도 계획
  livingEnemies().forEach(e => MONSTER_PATTERN.planNextIntent(e));
  S.busy = false;
  renderAll();
}

function endGame(result){
  S.over = result; S.busy = false;
  saveCompletedRunRecord(result);
  $("#overTitle").textContent = result==="win" ? "🎉 승리!" : "💀 패배...";
  $("#overDesc").textContent  = result==="win" ? "모든 영혼을 성불시켰습니다." : PLAYER_DEF.name+"이 쓰러졌습니다.";
  $("#returnStart").style.display = result==="lose" ? "block" : "none";
  $("#over").classList.add("show");
  return true;
}

/* =========================================================================
   렌더링
   ========================================================================= */
function renderAll(){ renderHud(); renderEffects(); renderIntents(); renderField(); renderHand(); renderDock(); updateEndBtn(); }

function renderHud(){
  normalizeRunResources();
  $("#hudPortrait").textContent = S.player.emoji || "👼";
  $("#hudName").textContent     = S.player.name;
  $("#hudTitle").textContent    = S.player.title || "";
  $("#hudHp").textContent       = S.player.hp+"/"+S.player.maxHp;
  $("#hudHpFill").style.width   = Math.max(0, Math.min(100, (S.player.hp/S.player.maxHp)*100))+"%";
  $("#hudRelicCount").textContent  = resourceCount(S.relics);
  $("#hudPotionCount").textContent = resourceCount(S.potions);
  $("#hudGold").textContent        = S.gold;
  $("#hudMoonShard").textContent   = S.moonShards;
  $("#hudDeck").textContent        = STARTER_DECK.length;
  $("#hudTurnNum").textContent     = S.turn;
  renderSideItemSlots();
  renderProfileStatuses();
}

function renderProfileStatuses(){
  const host = $("#profileStatusEffects");
  if(!host) return;
  host.innerHTML = LIFE.renderStatuses(S.player);
}

function renderSideItemSlots(){
  renderItemSlots("#sideRelicSlots",  S.relics,  3, "🏺");
  renderItemSlots("#sidePotionSlots", S.potions, 3, "🧪");
}

function renderItemSlots(selector, items, maxSlots, fallbackIcon){
  const host = document.querySelector(selector);
  if(!host) return;
  const list  = Array.isArray(items) ? items : [];
  const count = Array.isArray(items) ? items.length : resourceCount(items);
  host.innerHTML = "";
  for(let i=0; i<maxSlots; i++){
    const item   = list[i];
    const filled = i < count;
    const slot   = document.createElement("span");
    slot.className   = "side-item-slot "+(filled ? "filled" : "empty");
    slot.textContent = filled && item && item.emoji ? item.emoji : fallbackIcon;
    if(filled && item && item.name) slot.title = item.name;
    host.appendChild(slot);
  }
}

function normalizeRunResources(){
  if(!S) return;
  if(!Array.isArray(S.relics))         S.relics     = [];
  if(S.potions === undefined)          S.potions    = [];
  if(typeof S.gold !== "number")       S.gold       = STARTING_GOLD;
  if(typeof S.moonShards !== "number") S.moonShards = STARTING_MOON_SHARDS;
}

function resourceCount(value){
  if(Array.isArray(value)) return value.length;
  return typeof value==="number" ? value : 0;
}

function renderEffects(){
  const rows = [];
  if(S.player.block  > 0)        rows.push(eff("🛡️","마음의 결계","결계 "+S.player.block));
  if(S.player.weak   > 0)        rows.push(eff("🌀","동요","정화 피해 25% 감소 ("+S.player.weak+"턴)"));
  if((S.player.anxiety||0)  > 0) rows.push(eff("💭","불안","다음 턴 카드 뽑기 -1 ("+S.player.anxiety+"턴)"));
  if((S.player.lethargy||0) > 0) rows.push(eff("🌫️","무기력","다음 턴 정신력 -1 ("+S.player.lethargy+"턴)"));
  rows.push(eff("💚","치유의 향기","회복 카드 보유"));
  $("#effList").innerHTML = rows.join("") || '<div class="eff-empty">효과 없음</div>';
}
function eff(ico, name, sub){
  return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
       +'<div class="eff-txt"><b>'+name+'</b><span>'+sub+'</span></div></div>';
}

function renderIntents(){
  const html = S.enemies.filter(e => e.hp>0).map(e => {
    const m = e.intent;
    if(!m) return "";
    let ico, txt, cls;
    if(m.t==="attack"){
      const sn = m.statusCard && CARD_DB[m.statusCard] ? " + "+CARD_DB[m.statusCard].name : "";
      ico="💢"; txt=(m.name ? m.name+" / " : "")+"스트레스 "+m.v+(e.weak>0?" (동요)":"")+sn; cls="atk";
    } else if(m.t==="defend"){
      ico="🛡️"; txt=(m.name ? m.name+" / " : "")+"결계 "+m.v+" 획득"; cls="def";
    } else if(m.t==="summon"){
      ico="🚪"; txt=(m.name ? m.name+" / " : "")+"소환"; cls="sum";
    } else {
      const isAnx = m.role==="anxiety", isLet = m.role==="counter";
      ico = isAnx ? "💭" : isLet ? "🌫️" : "🌀";
      txt = (m.name ? m.name+" / " : "")+(isAnx ? "불안 " : isLet ? "무기력 " : "동요 ")+m.v+" 부여";
      cls = "deb";
    }
    return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
         +'<div class="eff-txt"><b style="color:'
         +(cls==="atk"?"var(--c-red-deep)":cls==="def"?"var(--c-blue-deep)":cls==="sum"?"#6a5270":"#8a5cc0")
         +'">'+e.name+'</b><span>'+txt+'</span></div></div>';
  }).join("");
  $("#intentList").innerHTML = html || '<div class="eff-empty">성불 완료</div>';
}

function renderField(){
  const f = $("#field");
  f.innerHTML = "";
  const playerLayer = document.createElement("div");
  playerLayer.className = "player-layer";
  const monsterField = document.createElement("div");
  monsterField.className = "monster-field";
  f.appendChild(playerLayer);
  f.appendChild(monsterField);

  // 플레이어 (좌측 고정)
  playerLayer.appendChild(combatantEl({
    cls:"player", emoji:S.player.emoji||"👼",
    sprite:"assets/characters/player-temp-cutout.png",
    name:S.player.name, hp:S.player.hp, maxHp:S.player.maxHp,
    block:S.player.block, weak:S.player.weak,
    anxiety:S.player.anxiety, lethargy:S.player.lethargy,
    x:18, bottom:"0", intent:null, hideHud:true,
  }));

  // 몬스터 수별 X 배치 (기획서 §9-1)
  const X_POS = { 1:[55], 2:[42,68], 3:[33,55,78], 4:[24,45,66,87] };
  const xList = X_POS[Math.min(S.enemies.length, 4)] || X_POS[4];

  S.enemies.forEach((e, i) => {
    const el = combatantEl({
      cls:"enemy ghost"+(e.id===S.selectedId ? " selected" : ""),
      emoji:e.emoji, name:e.name,
      hp:e.hp, maxHp:e.maxHp, block:e.block, weak:e.weak,
      anxiety:e.anxiety, lethargy:e.lethargy,
      x: xList[i] ?? 55, bottom:"4cqh",
      intent:e.intent, id:e.id,
    });
    if(e.hp<=0) el.classList.add("dead");
    el.addEventListener("pointerdown", () => { if(e.hp>0){ S.selectedId=e.id; renderField(); } });
    monsterField.appendChild(el);
  });
}

function combatantEl(o){
  const el = document.createElement("div");
  el.className    = "combatant "+o.cls;
  el.style.left   = o.x+"%";
  el.style.bottom = o.bottom || "2cqh";
  el.style.transform = "translateX(-50%)";
  if(o.id) el.dataset.id = o.id;
  const intentHtml = o.intent ? intentBubble(o.intent, o.weak) : "";
  const avatarHtml = o.sprite
    ? '<div class="avatar sprite-avatar"><img src="'+o.sprite+'" alt=""></div>'
    : '<div class="avatar">'+o.emoji+'</div>';
  const infoHtml = o.hideHud ? "" : '<div class="name">'+o.name+'</div>'+LIFE.renderCombatantStats(o);
  el.innerHTML = intentHtml + avatarHtml + infoHtml + '<div class="hit"></div>';
  return el;
}

function intentBubble(m, weak){
  if(m.t==="attack"){
    const sn = m.statusCard && CARD_DB[m.statusCard] ? ' +'+CARD_DB[m.statusCard].name : '';
    return '<div class="intent atk">💢 '+m.v+(weak>0?'↓':'')+sn+'</div>';
  }
  if(m.t==="defend")     return '<div class="intent def">🛡️ 보호</div>';
  if(m.t==="summon")     return '<div class="intent deb">🚪 소환</div>';
  if(m.role==="anxiety") return '<div class="intent deb">💭 불안</div>';
  if(m.role==="counter") return '<div class="intent deb">🌫️ 무기력</div>';
  return '<div class="intent deb">🌀 동요</div>';
}

function renderHand(){
  const h = $("#hand");
  h.innerHTML = "";
  S.hand.forEach((key, i) => {
    const c  = CARD_DB[key];
    const el = document.createElement("div");
    el.className     = "card cost-"+c.type;
    el.dataset.index = i;
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

function renderDock(){
  $("#energy .val").textContent  = S.energy+"/"+MAX_ENERGY;
  renderEnergyOrbs();
  $("#deckCount").textContent    = S.draw.length;
  $("#discardCount").textContent = S.discard.length;
}

function renderEnergyOrbs(){
  const wrap = document.querySelector("#energy .energy-orbs");
  if(!wrap) return;
  wrap.innerHTML = "";
  for(let i=0; i<ENERGY_SLOT_COUNT; i++){
    const orb = document.createElement("span");
    let state = "empty";
    if(i < MAX_ENERGY) state = i < S.energy ? "active" : "used";
    orb.className = "energy-slot "+state;
    wrap.appendChild(orb);
  }
}

function updateEndBtn(){ $("#endTurn").disabled = !!(S.busy || S.over); }

/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
function attachDrag(cardEl, index){
  let startX=0, startY=0, dragging=false, pid=null;
  cardEl.addEventListener("pointerdown", down);
  function down(ev){
    if(S.busy||S.over) return;
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
  clone.innerHTML = '<div class="card cost-'+c.type+'" style="width:100%;height:100%">'+
    '<div class="cost">'+c.cost+'</div><div class="cname">'+c.name+'</div>'+
    '<div class="art">'+c.emoji+'</div><div class="type '+c.type+'">'+typeLabel(c.type)+'</div>'+
    '<div class="desc">'+c.desc+'</div></div>';
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
  const mx=(x1+x2)/2, my=Math.min(y1,y2)-60;
  $("#aim").innerHTML =
    '<svg width="100%" height="100%" style="position:absolute;inset:0">'+
    '<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">'+
    '<path d="M2 2 L10 6 L2 10 Z" fill="#e7b54a"/></marker></defs>'+
    '<path d="M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2+'" fill="none" '+
    'stroke="#e7b54a" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" '+
    'marker-end="url(#ah)" opacity="0.9"/></svg>';
}

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

let toastT;
function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 1200);
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
  `;
  document.head.appendChild(style);
}

/* =========================================================================
   버튼 바인딩
   ========================================================================= */
$("#endTurn").addEventListener("click", endTurn);
$("#restart").addEventListener("click", () => { $("#over").classList.remove("show"); newGame(); });

injectRewardStyles();
