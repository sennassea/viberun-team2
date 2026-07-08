"use strict";
/* =========================================================================
   렌더링
   ========================================================================= */
function renderAll(){ renderHud(); renderEffects(); renderIntents(); renderField(); renderHand(); renderDock(); updateEndBtn(); }

function renderHud(){
  normalizeRunResources();
  renderHudPortrait();
  renderHudName();
  $("#hudTitle").textContent    = S.player.title || "";
  $("#hudHp").textContent       = S.player.hp+"/"+S.player.maxHp;
  $("#hudHpFill").style.width   = Math.max(0, Math.min(100, (S.player.hp/S.player.maxHp)*100))+"%";
  $("#hudRelicCount").textContent  = resourceCount(S.relics);
  $("#hudPotionCount").textContent = resourceCount(S.potions);
  $("#hudGold").textContent        = S.gold;
  $("#hudMoonShard").textContent   = S.moonShards;
  $("#hudDeck").textContent        = STARTER_DECK.length;
  $("#hudTurnNum").textContent     = S.turn;
  renderBattleProgressHud();
  renderSideItemSlots();
  renderProfileStatuses();
  if(typeof window.renderDepthButtonState === "function") window.renderDepthButtonState();
}

function renderHudPortrait(){
  renderPlayerPortraitIcon($("#hudPortrait"));
}

/* 전투화면 좌상단 닉네임(#hudName) 표시 전용입니다. 닉네임 변경은 표시 텍스트만 바꾸며,
   S.player.name(전투 상태)는 건드리지 않습니다. */
function renderHudName(){
  const nameEl = $("#hudName");
  if(!nameEl) return;

  bindHudNicknameClick(nameEl);

  const nickname = (window.VIBERUN_NICKNAME_UI && typeof window.VIBERUN_NICKNAME_UI.getCachedNickname === "function")
    ? window.VIBERUN_NICKNAME_UI.getCachedNickname()
    : null;
  nameEl.textContent = nickname || S.player.name;
}

function bindHudNicknameClick(nameEl){
  if(!nameEl || nameEl.dataset.nicknameBound) return;

  nameEl.dataset.nicknameBound = "true";
  nameEl.classList.add("hud-name-clickable");
  nameEl.setAttribute("role", "button");
  nameEl.setAttribute("tabindex", "0");
  nameEl.title = "닉네임 변경";

  const openNicknameUI = () => {
    if(window.VIBERUN_NICKNAME_UI && typeof window.VIBERUN_NICKNAME_UI.open === "function"){
      window.VIBERUN_NICKNAME_UI.open();
    }
  };

  nameEl.addEventListener("click", openNicknameUI);
  nameEl.addEventListener("keydown", event => {
    if(event.key === "Enter" || event.key === " "){
      event.preventDefault();
      openNicknameUI();
    }
  });
}

window.addEventListener("viberun:profile-nickname-changed", event => {
  const nickname = event.detail && event.detail.nickname;
  const nameEl = document.getElementById("hudName");
  if(nameEl && nickname) nameEl.textContent = nickname;
});

function renderBattleProgressHud(){
  const act = document.getElementById("hudAct");
  const region = document.querySelector(".progress-region");
  const floor = document.getElementById("hudFloor");
  const turn = document.getElementById("hudTurn");
  if(S && S.tutorialMode){
    if(act) act.style.display = "none";
    if(act && act.nextElementSibling && act.nextElementSibling.classList.contains("progress-separator")){
      act.nextElementSibling.style.display = "none";
    }
    if(region) region.innerHTML = '<span>튜토리얼 구역</span>';
    if(floor) floor.style.display = "none";
    if(turn && turn.previousElementSibling && turn.previousElementSibling.classList.contains("progress-separator")){
      turn.previousElementSibling.style.display = "none";
    }
    return;
  }
  const game = document.querySelector("#game");
  const battleTheme = (game && game.dataset && game.dataset.battleTheme) ||
    (S && S.battleBackground && S.battleBackground.theme) ||
    (S && S.battleStage && S.battleStage.packageTheme) ||
    "hospital";
  const themeLabel = BATTLE_THEME_LABELS[battleTheme] ||
    (S && S.battleStage && S.battleStage.packageThemeLabel) ||
    BATTLE_THEME_LABELS.hospital;
  const labels = typeof getHudProgressLabels === "function"
    ? getHudProgressLabels()
    : { actName: "최초의 여정", area: "1구역" };
  if(act){
    act.style.display = "";
    act.textContent = labels.actName;
  }
  if(act && act.nextElementSibling && act.nextElementSibling.classList.contains("progress-separator")){
    act.nextElementSibling.style.display = "";
  }
  if(region) region.innerHTML = '<span class="progress-icon">🏥</span><span>' + themeLabel + '</span>';
  if(floor){
    floor.style.display = "";
    floor.textContent = labels.area;
  }
  if(turn && turn.previousElementSibling && turn.previousElementSibling.classList.contains("progress-separator")){
    turn.previousElementSibling.style.display = "";
  }
}

function renderProfileStatuses(){
  const host = $("#profileStatusEffects");
  if(!host) return;
  host.innerHTML = LIFE.renderStatuses(S.player, { includeBlock: true });
}

function renderSideItemSlots(){
  const relicSlotCount = Array.isArray(S.relics) ? S.relics.length : resourceCount(S.relics);
  renderItemSlots("#sideRelicSlots",  S.relics,  relicSlotCount, "🏺");
  setupRelicSlotDragScroll();
  updateRelicScrollHint();
  renderItemSlots("#sidePotionSlots", S.potions, 3, "🧪");
}

function updateRelicScrollHint(){
  const host = document.querySelector("#sideRelicSlots");
  const panel = host && host.closest(".top-relic-panel");
  if(!host || !panel) return;
  requestAnimationFrame(() => {
    panel.classList.toggle("relic-scrollable", host.scrollWidth > host.clientWidth + 1);
  });
}

function setupRelicSlotDragScroll(){
  const host = document.querySelector("#sideRelicSlots");
  if(!host || host.dataset.dragScrollReady === "1") return;
  host.dataset.dragScrollReady = "1";
  let dragging = false, startX = 0, startScrollLeft = 0, pointerId = null;
  host.addEventListener("pointerdown", ev => {
    if(host.scrollWidth <= host.clientWidth) return;
    dragging = true;
    pointerId = ev.pointerId;
    startX = ev.clientX;
    startScrollLeft = host.scrollLeft;
    host.classList.add("drag-scrolling");
    host.setPointerCapture(pointerId);
  });
  host.addEventListener("pointermove", ev => {
    if(!dragging) return;
    host.scrollLeft = startScrollLeft - (ev.clientX - startX);
  });
  function endDrag(){
    if(!dragging) return;
    dragging = false;
    host.classList.remove("drag-scrolling");
    try{ host.releasePointerCapture(pointerId); }catch(e){}
    pointerId = null;
  }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", updateRelicScrollHint);
}

function renderItemSlots(selector, items, maxSlots, fallbackIcon){
  const host = document.querySelector(selector);
  if(!host) return;
  const list  = Array.isArray(items) ? items : [];
  const count = Array.isArray(items) ? items.length : resourceCount(items);
  const isPotionSlots = selector === "#sidePotionSlots";
  if(isPotionSlots) hidePotionDiscardButton();
  host.innerHTML = "";
  for(let i=0; i<maxSlots; i++){
    const item   = list[i];
    const filled = i < count;
    const slot   = document.createElement("span");
    slot.className   = "side-item-slot "+(filled ? "filled" : "empty");
    if(isPotionSlots && !filled){
      slot.innerHTML = '<span class="side-empty-potion-icon" aria-hidden="true"></span>';
    } else if(filled && item && item.iconImage){
      slot.innerHTML = '<img class="side-item-icon" src="' + escapeHtml(item.iconImage) + '" alt="" aria-hidden="true" draggable="false">';
    } else {
      slot.textContent = filled && item && item.emoji ? item.emoji : fallbackIcon;
    }
    if(filled && item && item.name) slot.title = item.name;
    if(isPotionSlots && filled && item){
      slot.dataset.potionIndex = String(i);
      if(isAttackPotion(item)) attachPotionDrag(slot, item, i);
      slot.addEventListener("click", ev => {
        ev.stopPropagation();
        onPotionSlotClick(item, i, slot);
      });
    }
    host.appendChild(slot);
  }
}

function resourceCount(value){
  if(Array.isArray(value)) return value.length;
  return typeof value==="number" ? value : 0;
}

function renderEffects(){
  const rows = [];
  if(S.player.block  > 0)        rows.push(eff("assets/status_icons/block.png","마음의 결계","결계 "+S.player.block));
  if(S.player.weak   > 0)        rows.push(eff("assets/status_icons/agitation.png","동요","정화 피해 25% 감소 ("+S.player.weak+"턴)"));
  if((S.player.fracture||0) > 0) rows.push(eff("assets/status_icons/fracture.png","균열","받는 정화 피해 25% 증가 ("+S.player.fracture+"턴)"));
  if((S.player.anxiety||0)  > 0) rows.push(eff("assets/status_icons/anxiety.png","불안","다음 턴 주문 뽑기 -1 ("+S.player.anxiety+"턴)"));
  if((S.player.lethargy||0) > 0) rows.push(eff("assets/status_icons/lethargy.png","무기력","다음 턴 신통력 -1 ("+S.player.lethargy+"턴)"));
  $("#effList").innerHTML = rows.join("") || '<div class="eff-empty">효과 없음</div>';
}
function eff(ico, name, sub){
  const iconHtml = typeof ico === "string" && ico.indexOf("assets/") === 0
    ? '<img src="'+escapeHtml(ico)+'" alt="'+escapeHtml(name)+'">'
    : ico;
  return '<div class="eff-row"><div class="eff-ico">'+iconHtml+'</div>'
       +'<div class="eff-txt"><b>'+name+'</b><span>'+sub+'</span></div></div>';
}

function renderIntents(){
  const html = S.enemies.filter(e => e.hp>0).map(e => {
    const m = e.intent;
    if(!m) return "";
    let ico, txt, cls;
    if(m.t==="attack"){
      const statusCardKey = getMonsterIntentStatusCardKey(m);
      const sn = statusCardKey && CARD_DB[statusCardKey] ? " + "+CARD_DB[statusCardKey].name : "";
      const preview = previewMonsterFinalDamage(e, m);
      ico="💢"; txt=(m.name ? m.name+" / " : "")+"정신력 "+preview.finalDamage+(e.weak>0?" (동요)":"")+sn; cls="atk";
    } else if(m.t==="defend"){
      const target = getPlannedMonsterSupportTarget(e, m);
      const value = getMonsterDefendValue(e, m, target);
      const targetName = target && target.id !== e.id ? " / "+target.name : "";
      ico="🛡️"; txt=(m.name ? m.name+" / " : "")+"결계 "+value+" 획득"+targetName; cls="def";
    } else if(m.t==="summon"){
      ico="🚪"; txt=(m.name ? m.name+" / " : "")+"소환"; cls="sum";
    } else if(m.t==="drawPenalty"){
      ico="💭"; txt=(m.name ? m.name+" / " : "")+"다음 턴 주문 뽑기 -"+(m.v || 1); cls="deb";
    } else if(m.t==="lock"){
      ico="🔒"; txt=(m.name ? m.name+" / " : "")+"주문 잠금"; cls="deb";
    } else if(m.t==="exam"){
      ico="📝"; txt=(m.name ? m.name+" / " : "")+challengeLabel(getActiveChallengeForEnemy(e)); cls="deb";
    } else {
      const isAnx = m.role==="anxiety", isLet = m.role==="counter", isFracture = m.role==="fracture";
      ico = isAnx ? "💭" : isLet ? "🌫️" : isFracture ? "💔" : "🌀";
      txt = (m.name ? m.name+" / " : "")+(isAnx ? "불안 " : isLet ? "무기력 " : isFracture ? "균열 " : "동요 ")+m.v+" 부여";
      cls = "deb";
    }
    return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
         +'<div class="eff-txt"><b style="color:'
         +(cls==="atk"?"var(--c-red-deep)":cls==="def"?"var(--c-blue-deep)":cls==="sum"?"#6a5270":"#8a5cc0")
         +'">'+e.name+'</b><span>'+txt+'</span></div></div>';
  }).join("");
  $("#intentList").innerHTML = html || '<div class="eff-empty">성불 완료</div>';
}
/* 플레이어 공격/피격 모션: idle → attack/damage 스탠딩 이미지로 잠깐 전환하고
   .motion-attack/.motion-damage 클래스로 살짝 확대+이동하는 CSS 애니메이션을 재생한 뒤
   지정 시간이 지나면 자동으로 idle 상태로 되돌린다(life-ui.css의 keyframes 참고). */
const PLAYER_BATTLE_MOTION_DURATION = { attack:750, damage:650 };
let playerBattleMotionTimer = null;
function triggerPlayerBattleMotion(type){
  if(!S || !S.player || !PLAYER_BATTLE_MOTION_DURATION[type]) return;
  S.playerBattleMotion = type;
  if(playerBattleMotionTimer) clearTimeout(playerBattleMotionTimer);
  playerBattleMotionTimer = setTimeout(() => {
    playerBattleMotionTimer = null;
    if(S) S.playerBattleMotion = null;
    renderField();
  }, PLAYER_BATTLE_MOTION_DURATION[type]);
  renderField();
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
  const equippedSkinId = S.playerAppearance ? S.playerAppearance.equippedSkinId : null;
  const playerMotion = S.playerBattleMotion || null;
  const playerSprite = playerMotion === "attack" ? resolveBattleStandingImageAttack(equippedSkinId)
    : playerMotion === "damage" ? resolveBattleStandingImageDamage(equippedSkinId)
    : resolveBattleStandingImage(equippedSkinId);
  const playerSpriteFallback = playerMotion === "attack" ? resolveBattleStandingImageAttack(null)
    : playerMotion === "damage" ? resolveBattleStandingImageDamage(null)
    : resolveBattleStandingImage(null);
  playerLayer.appendChild(combatantEl({
    cls:"player"+(playerMotion ? " motion-"+playerMotion : ""), emoji:S.player.emoji||"👼",
    sprite:playerSprite,
    spriteFallback:playerSpriteFallback,
    name:S.player.name, hp:S.player.hp, maxHp:S.player.maxHp,
    block:S.player.block, weak:S.player.weak,
    anxiety:S.player.anxiety, lethargy:S.player.lethargy,
    x:18, bottom:"0", intent:null, hideHud:true,
  }));

  // 몬스터 수별 X 배치 (기획서 §9-1)
  const X_POS = { 1:[55], 2:[42,68], 3:[33,55,78], 4:[24,45,66,87] };
  const xList = X_POS[Math.min(livingEnemies().length, 4)] || X_POS[4];
  let liveIndex = 0;

  S.enemies.forEach((e, i) => {
    const positionIndex = e.hp > 0 ? liveIndex++ : i;
    const el = combatantEl({
      cls:"enemy ghost"+(e.grade==="elite" ? " elite" : e.grade==="boss" ? " boss" : "")+(e.id===S.selectedId ? " selected" : ""),
      sprite:e.image, name:e.name,
      hp:e.hp, maxHp:e.maxHp, block:e.block, weak:e.weak, mark:e.mark, status:e.status,
      anxiety:e.anxiety, lethargy:e.lethargy,
      x: xList[positionIndex] ?? 55, bottom:"4cqh",
      intent:e.intent, id:e.id, runtimeEnemy:e,
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
  const intentHtml = o.intent ? intentBubble(o.intent, o.runtimeEnemy || o) : "";
  const avatarHtml = o.sprite
    ? '<div class="avatar sprite-avatar"><img src="'+o.sprite+'" alt=""></div>'
    : '<div class="avatar">'+(o.emoji || "")+'</div>';
  const statusHtml = renderEnemyStatusIcons(o);
  // LIFE.renderCombatantStats()의 기존 동요/표식/균열 표시와 새 StatusData 표시가 중복되지 않도록
  // 전투 계산용 원본 값은 유지하고, 렌더링용 객체에서만 상태값을 숨깁니다.
  const statsRenderObj = o.hideHud ? o : { ...o, weak:0, mark:0, fracture:0, status:{} };
  const infoHtml = o.hideHud
    ? ""
    : '<div class="combatant-info">'+LIFE.renderCombatantStats(statsRenderObj, { reserveBlockSpace:false })+statusHtml+'</div>';
  el.innerHTML = intentHtml + avatarHtml + infoHtml + '<div class="hit"></div>';
  if(o.sprite && o.spriteFallback && o.spriteFallback !== o.sprite){
    const spriteImgEl = el.querySelector(".sprite-avatar img");
    if(spriteImgEl){
      spriteImgEl.addEventListener("error", () => {
        if(spriteImgEl.getAttribute("src") !== o.spriteFallback) spriteImgEl.src = o.spriteFallback;
      });
    }
  }
  return el;
}

const INTENT_STATUS_CARD_ICON = {
  hesitation: "⏳",
  regret: "💧",
  intrusive_thought: "💭",
  intrusive_accident: "💭"
};

// life-ui.css의 .intent 배경(--c-panel, 거의 흰색)이 밝은 배경에서 잘 안 보여서 인라인으로 덮어씌움
// 숫자가 검정 글씨라 너무 어두운 배경은 피하고, 이모지가 있어 완전 흰색도 피한 밝은 톤
const INTENT_BUBBLE_BG_STYLE = 'style="background:rgba(214,226,250,.93)"';

function intentBubble(m, enemy){
  // 머리 위 의도 표시: 기본은 이모지만, 공격/결계(defend)만 예외로 이모지+수치. 디버프가 겹치면 디버프 이모지 + 공격/결계 이모지 + 숫자 순서.
  if(m.t==="attack"){
    const statusCardKey = getMonsterIntentStatusCardKey(m);
    const debuffIcon = statusCardKey && INTENT_STATUS_CARD_ICON[statusCardKey] ? INTENT_STATUS_CARD_ICON[statusCardKey] : '';
    const preview = previewMonsterFinalDamage(enemy, m);
    return '<div class="intent atk" '+INTENT_BUBBLE_BG_STYLE+'>'+debuffIcon+'💢 '+preview.finalDamage+((enemy && enemy.weak>0)?'↓':'')+'</div>';
  }
  if(m.t==="defend"){
    const target = getPlannedMonsterSupportTarget(enemy, m);
    const value = getMonsterDefendValue(enemy, m, target);
    return '<div class="intent def" '+INTENT_BUBBLE_BG_STYLE+'>🛡️ '+value+'</div>';
  }
  if(m.t==="summon")     return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>🚪</div>';
  if(m.t==="drawPenalty") return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>💭</div>';
  if(m.t==="lock")       return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>🔒</div>';
  if(m.t==="exam")       return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>📝</div>';
  if(m.role==="anxiety") return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>💭</div>';
  if(m.role==="counter") return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>🌫️</div>';
  if(m.role==="fracture") return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>💔</div>';
  return '<div class="intent deb" '+INTENT_BUBBLE_BG_STYLE+'>🌀</div>';
}
function renderHand(){
  const h = $("#hand");
  h.innerHTML = "";
  S.hand.forEach((key, i) => {
    const c  = CARD_DB[key];
    const displayCard = c ? { ...c, cost:getHandCardCost(i, key) } : c;
    const el = document.createElement("div");
    el.className     = "card card-frame-card cost-"+c.type;
    el.dataset.index = i;
    el.innerHTML = cardFaceHtml(displayCard);
    attachDrag(el, i);
    h.appendChild(el);
  });
}

function renderDock(){
  $("#energy .val").textContent  = S.energy+"/"+getMaxEnergy();
  renderEnergyOrbs();
  $("#deckCount").textContent    = S.draw.length;
  $("#discardCount").textContent = S.discard.length;
  $("#exhaustCount").textContent = (S.exhaust || []).length;
}

function renderEnergyOrbs(){
  const wrap = document.querySelector("#energy .energy-orbs");
  if(!wrap) return;
  wrap.innerHTML = "";
  for(let i=0; i<ENERGY_SLOT_COUNT; i++){
    const orb = document.createElement("span");
    const state = i < S.energy ? "active" : "used";
    orb.className = "energy-slot "+state;
    wrap.appendChild(orb);
  }
}

function updateEndBtn(){
  const tutorialEndTurnStepActive = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.isEndTurnStepActive === "function" &&
    window.TUTORIAL_BATTLE.isEndTurnStepActive();
  const tutorialBlocksEndTurn = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.canEndTurn === "function" &&
    !window.TUTORIAL_BATTLE.canEndTurn();
  $("#endTurn").disabled = !!((S.busy && !tutorialEndTurnStepActive) || S.pendingCardChoice || S.over || tutorialBlocksEndTurn);
}

