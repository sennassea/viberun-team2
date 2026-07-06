"use strict";
function canUsePotionNow(){
  return !!(S && !S.busy && !S.over && !S.rewardOpen && !S.encounterCleared);
}

function isSelfUsePotion(item){
  if(!item) return false;
  if(item.target === "player") return true;
  if(item.target === "enemy") return false;
  if(Array.isArray(item.fx) && item.fx.some(fx => fx && ["heal","energy","block","draw","removeWeak","nextAttackDouble"].includes(fx.t))) return true;
  return ["heal","energy","block","blockCleanse","draw","nextAttackDouble"].includes(item.type);
}

function isHealPotion(item){
  return !!(item && (item.type === "heal" || item.effect === "healPlayerHp"));
}

function isAttackPotion(item){
  if(!item) return false;
  if(item.target === "enemy") return true;
  if(item.target === "player") return false;
  if(Array.isArray(item.fx) && item.fx.some(fx => fx && (potionFxTargetsEnemy(fx) || potionFxTargetsAnyEnemy(fx)))) return true;
  return ["attackSingle","attackAll","applyMark","applyWeak"].includes(item.type);
}

function onPotionSlotClick(item, index, slot){
  hidePotionUseButton();
  if(isSelfUsePotion(item)){
    if(!canUsePotionNow()){
      toast("전투 중 플레이어 턴에만 사용할 수 있습니다.");
      return;
    }
    showPotionUseButton(index, slot);
    showPotionDiscardButton(index, slot);
    refreshPotionTooltipPosition();
    return;
  }
  if(isAttackPotion(item)){
    showPotionDiscardButton(index, slot);
    refreshPotionTooltipPosition();
  }
}

function refreshPotionTooltipPosition(){
  if(window.refreshItemSlotTooltipPosition) window.refreshItemSlotTooltipPosition();
}

function ensurePotionActionPanel(){
  let panel = document.querySelector("#potionActionPanel");
  if(panel) return panel;
  panel = document.createElement("div");
  panel.id = "potionActionPanel";
  document.querySelector("#game").appendChild(panel);
  document.addEventListener("click", hidePotionActionPanel);
  return panel;
}

function updatePotionActionPanelVisibility(){
  const panel = document.querySelector("#potionActionPanel");
  if(!panel) return;
  const useBtn = document.querySelector("#potionUseButton");
  const discardBtn = document.querySelector("#potionDiscardButton");
  const visible = !!((useBtn && useBtn.classList.contains("show")) || (discardBtn && discardBtn.classList.contains("show")));
  panel.classList.toggle("show", visible);
}

function positionPotionActionPanel(slot){
  const panel = ensurePotionActionPanel();
  const game = document.querySelector("#game");
  if(!slot || !game) return;
  const anchorRect = slot.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();
  panel.style.left = (anchorRect.right - gameRect.left + 14) + "px";
  panel.style.top = (anchorRect.top - gameRect.top) + "px";
  panel.style.height = anchorRect.height + "px";
}

function hidePotionActionPanel(){
  hidePotionUseButton();
  hidePotionDiscardButton();
}

function ensurePotionUseButton(){
  let btn = document.querySelector("#potionUseButton");
  if(btn) return btn;
  const panel = ensurePotionActionPanel();
  btn = document.createElement("button");
  btn.id = "potionUseButton";
  btn.type = "button";
  btn.textContent = "사용";
  btn.addEventListener("click", ev => {
    ev.stopPropagation();
    if(btn.disabled) return;
    btn.disabled = true;
    const index = Number(btn.dataset.potionIndex);
    if(!useSelfPotion(index)) btn.disabled = false;
  });
  panel.appendChild(btn);
  return btn;
}

function showPotionUseButton(index, slot){
  const btn = ensurePotionUseButton();
  const anchor = slot || document.querySelector('#sidePotionSlots [data-potion-index="'+index+'"]');
  if(!anchor) return;
  btn.dataset.potionIndex = String(index);
  btn.disabled = false;
  btn.classList.add("show");
  positionPotionActionPanel(anchor);
  updatePotionActionPanelVisibility();
}

function hidePotionUseButton(){
  const btn = document.querySelector("#potionUseButton");
  if(!btn) return;
  const wasShown = btn.classList.contains("show");
  btn.classList.remove("show");
  btn.dataset.potionIndex = "";
  btn.disabled = false;
  updatePotionActionPanelVisibility();
  if(wasShown) refreshPotionTooltipPosition();
}

function getPotionFxList(potion){
  if(potion && Array.isArray(potion.fx) && potion.fx.length) return potion.fx;
  if(!potion) return [];
  switch(potion.type){
    case "heal": return [{ t:"heal", v:potion.value || 0 }];
    case "energy": return [{ t:"energy", v:potion.value || 0 }];
    case "block": return [{ t:"block", v:potion.value || 0 }];
    case "blockCleanse": return [{ t:"block", v:potion.value || 0 }, { t:"removeWeak", v:potion.removeWeak || 1 }];
    case "draw": return [{ t:"draw", v:potion.value || 0 }];
    case "nextAttackDouble": return [{ t:"nextAttackDouble", v:potion.value || 2 }];
    case "attackSingle": return [{ t:"attackSingle", v:potion.value || 0 }];
    case "attackAll": return [{ t:"attackAll", v:potion.value || 0 }];
    case "applyMark": return [{ t:"applyMark", v:potion.value || 0 }];
    case "applyWeak": return [{ t:"applyWeak", v:potion.value || 0 }];
    default: return [];
  }
}

function potionFxTargetsEnemy(fx){
  return !!(fx && ["attackSingle","applyMark","applyWeak","applyRecollection","applyFracture"].includes(fx.t));
}

function potionFxTargetsAnyEnemy(fx){
  return !!(fx && ["attackAll","applyMarkAll"].includes(fx.t));
}

function isSupportedPotionFx(fx){
  return !!(fx && [
    "heal",
    "energy",
    "block",
    "draw",
    "removeWeak",
    "applyMark",
    "applyWeak",
    "applyRecollection",
    "applyFracture",
    "applyMarkAll",
    "attackSingle",
    "attackAll",
    "nextAttackDouble"
  ].includes(fx.t));
}

function canExecutePotionFx(potion, context={}){
  const fxList = getPotionFxList(potion);
  if(!fxList.length) return false;
  return fxList.every(fx => {
    if(!isSupportedPotionFx(fx)) return false;
    if(potionFxTargetsEnemy(fx)) return !!(context.targetEnemy && context.targetEnemy.hp > 0);
    if(potionFxTargetsAnyEnemy(fx)) return livingEnemies().length > 0;
    return true;
  });
}

function executePotionFx(potion, context={}){
  const fxList = getPotionFxList(potion);
  if(!canExecutePotionFx(potion, context)) return false;
  for(const fx of fxList){
    if(!isSupportedPotionFx(fx)) return false;
    if(executeSinglePotionFx(fx, context) === false) return false;
  }
  return true;
}

function executeSinglePotionFx(fx, context={}){
  const amount = Number.isFinite(fx.v) ? fx.v : 0;
  const targetEnemy = context.targetEnemy;
  switch(fx.t){
    case "heal": {
      const healed = LIFE.heal(S.player, amount);
      if(healed > 0) spawnFloat(".player", "+"+healed, "heal");
      return true;
    }
    case "energy":
      S.energy += amount;
      if(amount) toast((context.potion?.name || "약병")+" 사용: 신통력 +"+amount);
      return true;
    case "block":
      gainPlayerBlock(amount);
      return true;
    case "draw":
      drawCards(amount, { source:"potion" });
      return true;
    case "removeWeak":
      LIFE.reduceWeak(S.player, amount || 1);
      return true;
    case "applyMark": {
      const added = addStatus(targetEnemy, "mark", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '표식 '+added, 'heal');
      return true;
    }
    case "applyWeak": {
      const added = addStatus(targetEnemy, "agitation", amount);
      if(added > 0) applyRelicTrigger("onAgitationApply", { target: targetEnemy, amount: added });
      return true;
    }
    case "applyRecollection": {
      const added = addStatus(targetEnemy, "recollection", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '회상 '+added, 'heal');
      return true;
    }
    case "applyFracture": {
      const added = addStatus(targetEnemy, "fracture", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '균열 '+added, 'dmg');
      return true;
    }
    case "applyMarkAll":
      livingEnemies().forEach(enemy => {
        const added = addStatus(enemy, "mark", amount);
        if(added > 0) spawnFloat('[data-id="'+enemy.id+'"]', '표식 '+added, 'heal');
      });
      return true;
    case "attackSingle":
      applyDamageWithFeedback(targetEnemy, amount, S.player.weak);
      return true;
    case "attackAll":
      livingEnemies().forEach(enemy => applyDamageWithFeedback(enemy, amount, S.player.weak));
      return true;
    case "nextAttackDouble":
      S.nextAttackMultiplier = amount || 2;
      toast("다음 공격 정화량 증가");
      return true;
    default:
      console.warn("[Potion FX] Unsupported FX:", fx);
      return false;
  }
}

function useSelfPotion(index){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || !isSelfUsePotion(potion)) return false;
  if(!applySelfPotionEffect(potion, { potion, potionIndex:index })) return false;
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
  return true;
}

function applySelfPotionEffect(potion, context={}){
  return executePotionFx(potion, context);
}

function ensurePotionDiscardButton(){
  let btn = document.querySelector("#potionDiscardButton");
  if(btn) return btn;
  const panel = ensurePotionActionPanel();
  btn = document.createElement("button");
  btn.id = "potionDiscardButton";
  btn.type = "button";
  btn.textContent = "버리기";
  btn.addEventListener("click", ev => {
    ev.stopPropagation();
    const index = Number(btn.dataset.potionIndex);
    discardPotion(index);
  });
  panel.appendChild(btn);
  return btn;
}

function showPotionDiscardButton(index, slot){
  const btn = ensurePotionDiscardButton();
  if(!slot) return;
  btn.dataset.potionIndex = String(index);
  btn.classList.add("show");
  positionPotionActionPanel(slot);
  updatePotionActionPanelVisibility();
}

function hidePotionDiscardButton(){
  const btn = document.querySelector("#potionDiscardButton");
  if(!btn) return;
  const wasShown = btn.classList.contains("show");
  btn.classList.remove("show");
  btn.dataset.potionIndex = "";
  updatePotionActionPanelVisibility();
  if(wasShown) refreshPotionTooltipPosition();
}

let pendingDiscardPotion = null;

function discardPotion(index){
  if(!Array.isArray(S.potions)) return;
  const potion = S.potions[index];
  if(!potion){
    hidePotionDiscardButton();
    return;
  }
  pendingDiscardPotion = potion;
  showPotionDiscardConfirm(index);
}

function ensurePotionDiscardConfirm(){
  let modal = document.querySelector("#potionDiscardConfirm");
  if(modal) return modal;
  modal = document.createElement("div");
  modal.id = "potionDiscardConfirm";
  modal.innerHTML =
    '<div class="potion-discard-confirm-backdrop"></div>' +
    '<div class="potion-discard-confirm-box">' +
      '<p class="potion-discard-confirm-text">이 약병을 버리시겠습니까?</p>' +
      '<div class="potion-discard-confirm-actions">' +
        '<button type="button" class="potion-discard-confirm-cancel">취소</button>' +
        '<button type="button" class="potion-discard-confirm-ok">버리기</button>' +
      '</div>' +
    '</div>';
  modal.addEventListener("click", ev => ev.stopPropagation());
  modal.querySelector(".potion-discard-confirm-backdrop").addEventListener("click", () => hidePotionDiscardConfirm());
  modal.querySelector(".potion-discard-confirm-cancel").addEventListener("click", () => hidePotionDiscardConfirm());
  modal.querySelector(".potion-discard-confirm-ok").addEventListener("click", () => {
    const index = Number(modal.dataset.potionIndex);
    const potion = pendingDiscardPotion;
    hidePotionDiscardConfirm();
    confirmDiscardPotion(index, potion);
  });
  document.querySelector("#game").appendChild(modal);
  return modal;
}

function showPotionDiscardConfirm(index){
  const modal = ensurePotionDiscardConfirm();
  modal.dataset.potionIndex = String(index);
  modal.classList.add("show");
}

function hidePotionDiscardConfirm(){
  const modal = document.querySelector("#potionDiscardConfirm");
  pendingDiscardPotion = null;
  if(!modal) return;
  modal.classList.remove("show");
  modal.dataset.potionIndex = "";
}

function confirmDiscardPotion(index, potion){
  if(!potion) return;
  if(!Array.isArray(S.potions) || S.potions[index] !== potion) return;
  S.potions.splice(index, 1);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
}

let potionDragState = null;
function attachPotionDrag(slot, item, index){
  let startX=0, startY=0, dragging=false, pid=null;
  slot.addEventListener("pointerdown", down);
  function down(ev){
    hidePotionUseButton();
    hidePotionDiscardButton();
    if(!canUsePotionNow()){
      toast("전투 중 플레이어 턴에만 사용할 수 있습니다.");
      return;
    }
    pid = ev.pointerId; startX = ev.clientX; startY = ev.clientY; dragging = false;
    slot.setPointerCapture(pid);
    slot.addEventListener("pointermove", move);
    slot.addEventListener("pointerup", up);
    slot.addEventListener("pointercancel", cancel);
  }
  function move(ev){
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if(!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD){
      dragging = true;
      beginPotionDrag(slot, item, index);
    }
    if(dragging) updatePotionDrag(ev.clientX, ev.clientY);
  }
  function up(ev){ cleanup(); if(dragging) dropPotionDrag(ev.clientX, ev.clientY); }
  function cancel(){ cleanup(); if(dragging) endPotionDrag(); }
  function cleanup(){
    try{ slot.releasePointerCapture(pid); }catch(e){}
    slot.removeEventListener("pointermove", move);
    slot.removeEventListener("pointerup", up);
    slot.removeEventListener("pointercancel", cancel);
  }
}

function beginPotionDrag(slot, item, index){
  slot.classList.add("potion-dragging");
  document.querySelectorAll(".enemy").forEach(enemyEl => {
    if(!enemyEl.classList.contains("dead")) enemyEl.classList.add("targetable");
  });
  potionDragState = { slot, item, index, type:item.type, effect:item.effect, origin:slot.getBoundingClientRect() };
}

function updatePotionDrag(x, y){
  if(!potionDragState) return;
  const en = enemyUnder(x, y);
  document.querySelectorAll(".enemy.hovered").forEach(enemyEl => enemyEl.classList.remove("hovered"));
  if(en) en.el.classList.add("hovered");
  const o = potionDragState.origin || potionDragState.slot.getBoundingClientRect();
  drawAim(o.left + o.width / 2, o.top + o.height / 2, x, y);
}

function dropPotionDrag(x, y){
  const state = potionDragState;
  if(state && isAttackPotion(state.item)){
    const en = enemyUnder(x, y);
    if(en){
      useTargetPotion(state.index, en.enemy);
    }
  }
  endPotionDrag();
}

function useTargetPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || !isAttackPotion(potion)) return false;
  if(!executePotionFx(potion, { potion, potionIndex:index, targetEnemy })) return false;
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  autoSelectTarget();
  if(livingEnemies().length === 0){
    nodeClear();
    renderAll();
    return true;
  }
  renderAll();
  return true;
}

function useSingleAttackPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useMarkPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useWeakPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useAllAttackPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function endPotionDrag(){
  $("#aim").innerHTML = "";
  document.querySelectorAll(".targetable,.hovered").forEach(enemyEl => enemyEl.classList.remove("targetable","hovered"));
  if(potionDragState && potionDragState.slot) potionDragState.slot.classList.remove("potion-dragging");
  potionDragState = null;
}

function normalizeRunResources(){
  if(!S) return;
  if(!Array.isArray(S.relics))         S.relics     = [];
  if(S.potions === undefined)          S.potions    = [];
  if(typeof S.gold !== "number")       S.gold       = STARTING_GOLD;
  if(typeof S.moonShards !== "number") S.moonShards = STARTING_MOON_SHARDS;
  if(typeof S.cleanseCount !== "number") S.cleanseCount = 0;
}

