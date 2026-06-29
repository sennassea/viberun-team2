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
  rosary:{name:"염주", cost:1, type:"attack", emoji:"📿", target:"enemy", attr:"성불", rarity:"starter",
          desc:"정화 6\n가장 기본적인 정화 카드", fx:[{t:"damage",v:6}]},
  bell:{name:"방울", cost:1, type:"attack", emoji:"🔔", target:"enemy", attr:"희망", rarity:"starter",
          desc:"정화 5\n카드 1장 뽑기", fx:[{t:"damage",v:5},{t:"draw",v:1}]},
  doll:{name:"인형", cost:1, type:"attack", emoji:"🧸", target:"enemy", attr:"추억", rarity:"starter",
          desc:"정화 8\n동요 1 부여", fx:[{t:"damage",v:8},{t:"applyWeak",v:1}]},
  bible:{name:"성경", cost:1, type:"defense", emoji:"📖", target:"self", attr:"희망", rarity:"starter",
          desc:"마음의 결계 8\n카드 1장 뽑기", fx:[{t:"block",v:8},{t:"draw",v:1}]},
  charm:{name:"오색부적", cost:1, type:"defense", emoji:"🎀", target:"self", attr:"희망", rarity:"starter",
          desc:"마음의 결계 6\n동요 1 제거", fx:[{t:"block",v:6},{t:"removeWeak",v:1}]},
  pray:{name:"기도", cost:1, type:"skill", emoji:"🙏", target:"self", attr:"희망", rarity:"starter",
          desc:"스트레스 6 회복\n정신력 +1", fx:[{t:"heal",v:6},{t:"energy",v:1}]},

  reaching_hand:{name:"손 내밀기", cost:1, type:"attack", emoji:"🤝", target:"enemy", attr:"희망", rarity:"common",
          desc:"정화 7\n마음의 결계 5", fx:[{t:"damage",v:7},{t:"block",v:5}]},
  its_okay:{name:"괜찮아", cost:1, type:"skill", emoji:"🌱", target:"self", attr:"희망", rarity:"common",
          desc:"스트레스 6 회복\n카드 1장 뽑기", fx:[{t:"heal",v:6},{t:"draw",v:1}]},
  hope_lantern:{name:"희망의 등불", cost:2, type:"attack", emoji:"🏮", target:"enemy", attr:"희망", rarity:"common",
          desc:"모든 적에게 정화 6", fx:[{t:"damageAll",v:6}]},
  warm_word:{name:"따뜻한 말", cost:0, type:"skill", emoji:"💬", target:"self", attr:"희망", rarity:"common",
          desc:"마음의 결계 3\n카드 1장 뽑기", fx:[{t:"block",v:3},{t:"draw",v:1}]},
  steady_breath:{name:"고른 숨", cost:1, type:"defense", emoji:"🌬️", target:"self", attr:"희망", rarity:"common",
          desc:"마음의 결계 9", fx:[{t:"block",v:9}]},
  comforting_light:{name:"위로의 빛", cost:1, type:"skill", emoji:"✨", target:"self", attr:"희망", rarity:"common",
          desc:"스트레스 8 회복", fx:[{t:"heal",v:8}]},
  small_promise:{name:"작은 약속", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"희망", rarity:"uncommon",
          desc:"마음의 결계 4\n정신력 +1", fx:[{t:"block",v:4},{t:"energy",v:1}]},
  guardian_prayer:{name:"수호 기도", cost:2, type:"defense", emoji:"🛡️", target:"self", attr:"희망", rarity:"uncommon",
          desc:"마음의 결계 14\n동요 1 제거", fx:[{t:"block",v:14},{t:"removeWeak",v:1}]},
  dawn_of_hope:{name:"희망의 새벽", cost:2, type:"skill", emoji:"🌅", target:"self", attr:"희망", rarity:"rare",
          desc:"스트레스 10 회복\n정신력 +1\n카드 1장 뽑기", fx:[{t:"heal",v:10},{t:"energy",v:1},{t:"draw",v:1}]},

  photo_album:{name:"사진첩", cost:1, type:"attack", emoji:"📷", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 6\n카드 2장 뽑기", fx:[{t:"damage",v:6},{t:"draw",v:2}]},
  old_letter:{name:"오래된 편지", cost:1, type:"attack", emoji:"✉️", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 4\n동요 1 부여", fx:[{t:"damage",v:4},{t:"applyWeak",v:1}]},
  lullaby:{name:"자장가", cost:2, type:"skill", emoji:"🎵", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"모든 적에게 동요 1", fx:[{t:"applyWeakAll",v:1}]},
  old_clock:{name:"낡은 시계", cost:1, type:"skill", emoji:"⏰", target:"enemy", attr:"추억", rarity:"rare",
          desc:"동요 2 부여", fx:[{t:"applyWeak",v:2}]},
  faded_photo:{name:"빛바랜 사진", cost:1, type:"attack", emoji:"🖼️", target:"enemy", attr:"추억", rarity:"common",
          desc:"정화 5\n동요 1 부여\n카드 1장 뽑기", fx:[{t:"damage",v:5},{t:"applyWeak",v:1},{t:"draw",v:1}]},
  familiar_song:{name:"익숙한 노래", cost:1, type:"skill", emoji:"🎶", target:"enemy", attr:"추억", rarity:"common",
          desc:"동요 1 부여\n카드 2장 뽑기", fx:[{t:"applyWeak",v:1},{t:"draw",v:2}]},
  memory_fragment:{name:"기억 조각", cost:0, type:"skill", emoji:"🧩", target:"self", attr:"추억", rarity:"uncommon",
          desc:"카드 1장 뽑기\n정신력 +1", fx:[{t:"draw",v:1},{t:"energy",v:1}]},
  old_diary:{name:"낡은 일기장", cost:2, type:"attack", emoji:"📔", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 8\n동요 2 부여", fx:[{t:"damage",v:8},{t:"applyWeak",v:2}]},
  day_we_met:{name:"처음 만난 날", cost:2, type:"attack", emoji:"🌸", target:"enemy", attr:"추억", rarity:"rare",
          desc:"정화 12\n카드 2장 뽑기", fx:[{t:"damage",v:12},{t:"draw",v:2}]},

  chant:{name:"염불", cost:1, type:"attack", emoji:"🪷", target:"enemy", attr:"성불", rarity:"common",
          desc:"정화 9", fx:[{t:"damage",v:9}]},
  guiding_rite:{name:"천도재", cost:2, type:"attack", emoji:"🕯️", target:"enemy", attr:"성불", rarity:"rare",
          desc:"모든 적에게 정화 10", fx:[{t:"damageAll",v:10}]},
  nirvana:{name:"극락왕생", cost:3, type:"attack", emoji:"🌸", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 22\n사용 후 소멸", fx:[{t:"damage",v:22}], exhaust:true},
  last_goodbye:{name:"마지막 인사", cost:2, type:"attack", emoji:"👋", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 12\n미련 절반 이하 추가 정화 10", fx:[{t:"damage",v:12},{t:"bonusLowHpDamage",v:10}]},
  talisman_strike:{name:"부적 던지기", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"성불", rarity:"common",
          desc:"정화 8", fx:[{t:"damage",v:8}]},
  purification_wave:{name:"정화의 파동", cost:2, type:"attack", emoji:"〰️", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"모든 적에게 정화 8", fx:[{t:"damageAll",v:8}]},
  final_rite:{name:"마지막 의식", cost:2, type:"attack", emoji:"🕯️", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"정화 14", fx:[{t:"damage",v:14}]},
  soul_release:{name:"혼백 해방", cost:3, type:"attack", emoji:"🕊️", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 18\n동요 2 부여", fx:[{t:"damage",v:18},{t:"applyWeak",v:2}]},
  lotus_path:{name:"연꽃길", cost:3, type:"attack", emoji:"🪷", target:"enemy", attr:"성불", rarity:"rare",
          desc:"모든 적에게 정화 14\n사용 후 소멸", fx:[{t:"damageAll",v:14}], exhaust:true},
};

/* 시작 덱(여러 장 복제) */
const BASE_STARTER_DECK = [
  "rosary","rosary","rosary","rosary",
  "bell","bell","doll","doll",
  "bible","bible","bible","charm","charm","pray",
];
let STARTER_DECK = [...BASE_STARTER_DECK];

const CARD_REWARD_POOL = Object.keys(CARD_DB).filter(key => CARD_DB[key].rarity !== "starter");

const RELIC_DB = [
  { id:"incense_burner", name:"향로", emoji:"🏺", desc:"전투 시작 시 마음의 결계 +6" },
  { id:"spirit_tablet", name:"위령패", emoji:"🪦", desc:"정화 카드 수치 +1 (표시용)" },
  { id:"charm_box", name:"부적함", emoji:"📦", desc:"첫 턴 정신력 +1 (표시용)" },
];

const MAX_ENERGY = 3;
const DRAW_PER_TURN = 5;

/* 전역 상태 */
let S;

function newGame(){
  STARTER_DECK = [...BASE_STARTER_DECK];
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
    rewardOpen: false,
    relics: [],
    turn: 1,
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
      case "bonusLowHpDamage":
        if(targetEnemy && targetEnemy.hp > 0 && targetEnemy.hp <= Math.ceil(targetEnemy.maxHp / 2)){
          applyDamageWithFeedback(targetEnemy, e.v, S.player.weak);
        }
        break;
      case "damageAll":
        livingEnemies().forEach(enemy => applyDamageWithFeedback(enemy, e.v, S.player.weak));
        break;
      case "applyWeakAll":
        livingEnemies().forEach(enemy => LIFE.addWeak(enemy, e.v));
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

  // 손패 → 버린 더미. 소멸 카드는 이번 전투에서 제거
  S.hand.splice(handIndex,1);
  if(!card.exhaust){
    S.discard.push(key);
  } else {
    toast(card.name + " 소멸");
  }

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
  const defeatedGrade = defeated ? (defeated.grade || "normal") : "normal";

  if(defeated){
    toast(defeated.name + " 성불 완료");
  }

  S.enemyIndex += 1;

  if(S.enemyIndex >= MONSTER_DEFS.length){
    return endGame("win");
  }

  if(defeatedGrade === "normal"){
    return openCardReward();
  }

  if(defeatedGrade === "elite"){
    grantRelic();
  }

  const nextEnemy = spawnCurrentEnemy();
  if(nextEnemy){
    toast(nextEnemy.name + " 등장");
  }
}

function getRandomRewardKeys(count){
  const pool = shuffle([...CARD_REWARD_POOL]);
  return pool.slice(0, count);
}

function openCardReward(){
  S.busy = true;
  S.rewardOpen = true;
  renderRewardOverlay(getRandomRewardKeys(3));
  updateEndBtn();
}

function chooseRewardCard(key){
  if(!S || !S.rewardOpen) return;
  const card = CARD_DB[key];
  if(!card) return;

  STARTER_DECK.push(key);
  S.discard.push(key);
  S.rewardOpen = false;
  S.busy = false;
  closeRewardOverlay();

  const nextEnemy = spawnCurrentEnemy();
  if(nextEnemy){
    toast(card.name + " 획득 / " + nextEnemy.name + " 등장");
  }
  renderAll();
}

function skipRewardCard(){
  if(!S || !S.rewardOpen) return;
  S.rewardOpen = false;
  S.busy = false;
  closeRewardOverlay();
  const nextEnemy = spawnCurrentEnemy();
  if(nextEnemy){
    toast(nextEnemy.name + " 등장");
  }
  renderAll();
}

function grantRelic(){
  if(!S.relics) S.relics = [];
  const relic = RELIC_DB[Math.floor(Math.random() * RELIC_DB.length)];
  S.relics.push(relic);
  toast("유물 획득: " + relic.emoji + " " + relic.name);
}

function ensureRewardOverlay(){
  let overlay = document.querySelector("#cardRewardOverlay");
  if(overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "cardRewardOverlay";
  overlay.innerHTML =
    '<div class="reward-panel">' +
      '<h2>정화 보상</h2>' +
      '<p>새로운 카드 1장을 선택해 덱에 추가하세요.</p>' +
      '<div class="reward-cards"></div>' +
      '<button type="button" class="reward-skip">건너뛰기</button>' +
    '</div>';
  document.querySelector("#game").appendChild(overlay);
  overlay.querySelector(".reward-skip").addEventListener("click", skipRewardCard);
  return overlay;
}

function renderRewardOverlay(keys){
  if(typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED === "function"){
    window.BOHYUN_MARK_CARDS_ENCOUNTERED(keys);
  }
  const overlay = ensureRewardOverlay();
  const wrap = overlay.querySelector(".reward-cards");
  wrap.innerHTML = keys.map(key => rewardCardHtml(key)).join("");
  wrap.querySelectorAll(".reward-card").forEach(button => {
    button.addEventListener("click", () => chooseRewardCard(button.dataset.card));
  });
  overlay.classList.add("show");
}

function rewardCardHtml(key){
  const c = CARD_DB[key];
  if(!c) return "";
  return '<button type="button" class="reward-card cost-' + c.type + '" data-card="' + key + '">' +
    '<div class="cost">' + c.cost + '</div>' +
    '<div class="cname">' + c.name + '</div>' +
    '<div class="art">' + c.emoji + '</div>' +
    '<div class="type ' + c.type + '">' + typeLabel(c.type) + '</div>' +
    '<div class="reward-meta">' + (c.attr || "-") + ' · ' + (c.rarity || "common") + '</div>' +
    '<div class="desc">' + c.desc + '</div>' +
  '</button>';
}

function closeRewardOverlay(){
  const overlay = document.querySelector("#cardRewardOverlay");
  if(overlay) overlay.classList.remove("show");
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
  S.turn += 1;
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
  $("#returnStart").style.display = result==="lose" ? "block" : "none";
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
  $("#hudTurnNum").textContent = S.turn;
  const relics = document.querySelector(".relics");
  if(relics){
    relics.textContent = S.relics && S.relics.length ? S.relics.map(r => r.emoji).join(" ") : "🍀 ✝️ 🧸";
  }
}

function renderEffects(){
  const rows=[];
  if(S.player.block>0) rows.push(eff("🛡️","마음의 결계","결계 "+S.player.block));
  if(S.player.weak>0)  rows.push(eff("🌀","동요","정화 피해 25% 감소 ("+S.player.weak+"턴)"));
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
    if(m.t==="attack"){ico="💢";txt=(m.name ? m.name+" / " : "")+"스트레스 "+m.v+(e.weak>0?" (동요)":"");cls="atk";}
    else if(m.t==="defend"){ico="🛡️";txt=(m.name ? m.name+" / " : "")+"결계 "+m.v+" 획득";cls="def";}
    else {ico="🌀";txt=(m.name ? m.name+" / " : "")+"동요 "+m.v+" 부여";cls="deb";}
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
  if(m.t==="attack") return '<div class="intent atk">💢 '+m.v+(weak>0?'↓':'')+'</div>';
  if(m.t==="defend") return '<div class="intent def">🛡️ 보호</div>';
  return '<div class="intent deb">🌀 동요</div>';
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
const typeLabel = t=> t==="attack"?"정화":t==="defense"?"결계":"스킬";

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
  const clone=$("#dragClone");
  clone.innerHTML='<div class="card cost-'+c.type+'" style="width:100%;height:100%">'
    +'<div class="cost">'+c.cost+'</div><div class="cname">'+c.name+'</div>'
    +'<div class="art">'+c.emoji+'</div><div class="type '+c.type+'">'+typeLabel(c.type)+'</div>'
    +'<div class="desc">'+c.desc+'</div></div>';
  if(c.target==="enemy"){
    cardEl.classList.add("targeting");
  } else {
    cardEl.classList.add("dragging");
    clone.style.display="block";
  }
  dragState={cardEl, card:c, index, origin:cardEl.getBoundingClientRect()};
  if(c.target==="enemy") document.querySelectorAll(".enemy").forEach(e=>{
    if(!e.classList.contains("dead")) e.classList.add("targetable");
  });
}
function updateDrag(x,y,index){
  if(!dragState) return;
  if(dragState.card.target !== "enemy"){
    const clone=$("#dragClone");
    clone.style.left=x+"px";
    clone.style.top=y+"px";
  }
  const en=enemyUnder(x,y);
  document.querySelectorAll(".enemy.hovered").forEach(e=>e.classList.remove("hovered"));
  if(dragState.card.target==="enemy" && en) en.el.classList.add("hovered");
  if(dragState.card.target==="enemy"){
    const o=dragState.cardEl.getBoundingClientRect();
    drawAim(o.left+o.width/2, o.top+o.height/2, x, y);
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
  if(dragState && dragState.cardEl) dragState.cardEl.classList.remove("dragging", "targeting");
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

function startNewGameFromMenu(){
  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  if(typeof generateMap === "function") generateMap();
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = 0;
    window.MAP_STATE.proceedMode = false;
  }
  if(typeof loadStageMonsters === "function") loadStageMonsters(0);
  if(typeof updateHudFloor === "function") updateHudFloor();
  $("#over").classList.remove("show");
  newGame();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  updateContinueButtonInfo();
}

function returnToStartScreen(){
  try {
    if(typeof localStorage !== "undefined") localStorage.removeItem("viberunSaveState");
  } catch(error) {}

  STARTER_DECK = [...BASE_STARTER_DECK];
  if(typeof generateMap === "function") generateMap();
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = 0;
    window.MAP_STATE.proceedMode = false;
  }
  if(typeof loadStageMonsters === "function") loadStageMonsters(0);
  if(typeof updateHudFloor === "function") updateHudFloor();

  closeRewardOverlay();
  $("#over").classList.remove("show");
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
  updateContinueButtonInfo();
}

function continueGameFromMenu(){
  const saved = readSavedProgress();
  if(!saved){
    showStartNotice("저장 지점이 없습니다.");
    return;
  }

  S = saved.state;
  STARTER_DECK = [...saved.starterDeck];
  S.busy = false;
  if(window.MAP_STATE && saved.mapState){
    window.MAP_STATE.currentStage = saved.mapState.currentStage || 0;
    window.MAP_STATE.proceedMode = !!saved.mapState.proceedMode;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  $("#over").classList.remove("show");
  closeRewardOverlay();
  renderAll();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.add("hidden");
  updateContinueButtonInfo();
}

function readSavedProgress(){
  if(typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem("viberunSaveState");
    if(!raw) return null;
    const saved = JSON.parse(raw);
    if(!isUsableSavedProgress(saved)) return null;
    return saved;
  } catch(error) {
    localStorage.removeItem("viberunSaveState");
    return null;
  }
}

function isUsableSavedProgress(saved){
  return !!(
    saved &&
    saved.state &&
    saved.state.player &&
    typeof saved.state.player.hp === "number" &&
    typeof saved.state.player.maxHp === "number" &&
    Array.isArray(saved.state.hand) &&
    Array.isArray(saved.state.draw) &&
    Array.isArray(saved.state.discard) &&
    Array.isArray(saved.starterDeck) &&
    saved.starterDeck.length > 0
  );
}

function showStartNotice(message){
  let notice = document.querySelector("#startNotice");
  if(!notice){
    notice = document.createElement("div");
    notice.id = "startNotice";
    notice.className = "start-notice";
    notice.innerHTML =
      '<div class="start-notice-panel">' +
        '<p></p>' +
      '</div>';
  }
  const host = document.querySelector("#startScreen") || document.querySelector(".start-continue-game");
  if(notice.parentNode !== host) host.appendChild(notice);
  notice.querySelector("p").textContent = message;
  notice.classList.add("show");
  clearTimeout(notice._hideTimer);
  notice._hideTimer = setTimeout(() => notice.classList.remove("show"), 1500);
}

function showStartScreenAfterSave(){
  $("#over").classList.remove("show");
  closeRewardOverlay();
  updateContinueButtonInfo();
  const startScreen = $("#startScreen");
  if(startScreen) startScreen.classList.remove("hidden");
}

function updateContinueButtonInfo(){
  const button = document.querySelector(".start-continue-game");
  if(!button) return;
  const status = button.querySelector(".continue-status");
  if(!status) return;

  const saved = readSavedProgress();
  if(!saved){
    button.classList.remove("has-save");
    status.textContent = "메인 로비";
    return;
  }

  button.classList.add("has-save");
  const floor = formatSavedFloor(saved);
  const turn = saved.state && saved.state.turn ? saved.state.turn : 1;
  status.innerHTML = "<b>현재 위치</b><span>" + floor + " " + turn + "턴</span>";
}

function formatSavedFloor(saved){
  const label = saved.mapState && saved.mapState.floorLabel ? saved.mapState.floorLabel : "";
  const match = label.match(/(\d+)\s*F/i);
  if(match) return match[1] + "층";
  return "메인 로비";
}

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

/* ----- 버튼 바인딩 ----- */
$("#endTurn").addEventListener("click", endTurn);
$("#restart").addEventListener("click", ()=>{ $("#over").classList.remove("show"); newGame(); });
$("#returnStart").addEventListener("click", returnToStartScreen);
document.querySelectorAll(".start-new-game").forEach(button => {
  button.addEventListener("click", startNewGameFromMenu);
});
document.querySelectorAll(".start-continue-game").forEach(button => {
  button.addEventListener("click", continueGameFromMenu);
});

/* 시작 */
injectRewardStyles();
updateContinueButtonInfo();
