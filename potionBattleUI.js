"use strict";
function canUsePotionNow(){
  return !!(S && !S.busy && !S.over && !S.rewardOpen && !S.encounterCleared && !S.pendingCardChoice);
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

/* 사용/버리기 버튼은 클릭 시점의 약병 아이콘 좌표를 px로 스냅샷해 배치한다.
   화면 비율(리사이즈/회전/모바일 주소창 접힘 등)이 바뀌면 아이콘은 cqh 기준으로
   즉시 다시 배치되지만 버튼은 그대로 남아 어긋나므로, 열려 있는 동안은
   실제 앵커 아이콘을 다시 찾아 위치/높이를 맞춘다. */
function getActivePotionActionAnchor(){
  const useBtn = document.querySelector("#potionUseButton");
  const discardBtn = document.querySelector("#potionDiscardButton");
  const activeBtn =
    (useBtn && useBtn.classList.contains("show")) ? useBtn :
    (discardBtn && discardBtn.classList.contains("show")) ? discardBtn : null;
  if(!activeBtn) return null;
  const index = Number(activeBtn.dataset.potionIndex);
  if(!Number.isFinite(index)) return null;
  return document.querySelector('#sidePotionSlots [data-potion-index="'+index+'"]');
}

function repositionPotionActionPanel(){
  const anchor = getActivePotionActionAnchor();
  if(!anchor) return;
  positionPotionActionPanel(anchor);
}

window.addEventListener("resize", repositionPotionActionPanel);
window.addEventListener("orientationchange", repositionPotionActionPanel);
if(window.visualViewport) window.visualViewport.addEventListener("resize", repositionPotionActionPanel);

function ensurePotionUseButton(){
  let btn = document.querySelector("#potionUseButton");
  if(btn) return btn;
  const panel = ensurePotionActionPanel();
  btn = document.createElement("button");
  btn.id = "potionUseButton";
  btn.type = "button";
  btn.textContent = "사용";
  btn.addEventListener("click", async ev => {
    ev.stopPropagation();
    if(btn.disabled) return;
    btn.disabled = true;
    const index = Number(btn.dataset.potionIndex);
    if(!(await useSelfPotion(index))) btn.disabled = false;
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
  return !!(fx && ["attackSingle","applyMark","applyWeak","applyRecollection","applyFracture","removeEnemyBlock"].includes(fx.t));
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
    "nextAttackDouble",
    "removePlayerStatus",
    "drawThenDiscardChoice",
    "nextHighCostCardCostDown",
    "exhaustStatusCardFromHandOrDraw",
    "nextTurnDraw",
    "removeEnemyBlock",
    "createBellStrike",
    "cleanseAllPlayerDebuffs",
    "discardAnyThenDrawSameCount",
    "blockGainMultiplierThisTurn",
    "recoverHandDiscard",
    "discardDrawTriggerGrowth",
    "bellStrikePurifyBonusThisTurn",
    "createTemporaryCopy",
    "fillEmptyPotionSlots"
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

async function executePotionFx(potion, context={}){
  const fxList = getPotionFxList(potion);
  if(!canExecutePotionFx(potion, context)) return false;
  for(const fx of fxList){
    if(!isSupportedPotionFx(fx)) return false;
    const result = await executeSinglePotionFx(fx, context);
    if(result === false) return false;
  }
  return true;
}

function getStatusCardHandCandidates(){
  ensureCardInstanceZones();
  return S.hand.map((key, index) => {
    const card = CARD_DB[key];
    const instance = S.handInstances && S.handInstances[index];
    if(!card || !instance) return null;
    if(card.rarity !== "status" && card.type !== "status") return null;
    return { key, index, instance, uid:instance.uid, zone:"hand" };
  }).filter(Boolean);
}

function getAnyHandCandidates(){
  ensureCardInstanceZones();
  return S.hand.map((key, index) => {
    const card = CARD_DB[key];
    const instance = S.handInstances && S.handInstances[index];
    if(!card || !instance) return null;
    return { key, index, instance, uid:instance.uid, zone:"hand", cost:getHandCardCost(index, key) };
  }).filter(Boolean);
}

function removeHandCardByUid(uid){
  ensureCardInstanceZones();
  const idx = S.handInstances.findIndex(instance => instance && instance.uid === uid);
  if(idx < 0) return null;
  const key = S.hand.splice(idx, 1)[0];
  const instance = S.handInstances.splice(idx, 1)[0];
  if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(idx, 1);
  if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(idx, 1);
  return { key, instance };
}

function getFillPotionSlotCandidates(selfPotion, fx){
  const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : [];
  return db.filter(item => {
    if(!item || !item.implemented) return false;
    if(fx.excludeSelf && selfPotion && item.id === selfPotion.id) return false;
    if(fx.allowRare === false && item.rarity === "rare") return false;
    return true;
  });
}

async function executeSinglePotionFx(fx, context={}){
  const amount = Number.isFinite(fx.v) ? fx.v : 0;
  const targetEnemy = context.targetEnemy;
  switch(fx.t){
    case "heal": {
      const healValue = typeof scaleEndlessPlayerHeal === "function" ? scaleEndlessPlayerHeal(amount) : amount;
      const healed = LIFE.heal(S.player, healValue);
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
    case "removePlayerStatus": {
      const value = amount || 1;
      if(fx.status === "anxiety") LIFE.reduceAnxiety(S.player, value);
      else if(fx.status === "lethargy") LIFE.reduceLethargy(S.player, value);
      return true;
    }
    case "cleanseAllPlayerDebuffs": {
      LIFE.reduceWeak(S.player, S.player.weak || 0);
      LIFE.reduceFracture(S.player, S.player.fracture || 0);
      LIFE.reduceAnxiety(S.player, S.player.anxiety || 0);
      LIFE.reduceLethargy(S.player, S.player.lethargy || 0);
      toast("해로운 상태 정화");
      return true;
    }
    case "nextTurnDraw":
      S.nextTurnDrawBonus = (S.nextTurnDrawBonus || 0) + amount;
      toast("다음 턴 주문 뽑기 +"+amount);
      return true;
    case "nextHighCostCardCostDown":
      S.nextHighCostCardCostDown = {
        minCost: Number.isFinite(fx.minCost) ? fx.minCost : 2,
        amount: amount || 1,
        minResultCost: Number.isFinite(fx.minResultCost) ? fx.minResultCost : 0
      };
      toast("다음 고비용 주문 비용 감소 예약");
      return true;
    case "removeEnemyBlock": {
      if(!targetEnemy) return false;
      const before = targetEnemy.block || 0;
      if(before <= 0){
        toast("제거할 결계가 없습니다.");
        return false;
      }
      const removed = Math.min(before, amount);
      targetEnemy.block = Math.max(0, before - amount);
      spawnFloat('[data-id="'+targetEnemy.id+'"]', '-'+removed, 'blk');
      return true;
    }
    case "createBellStrike":
      createCardToHand("bell_strike", amount || 1);
      return true;
    case "bellStrikePurifyBonusThisTurn":
      S.bellStrikePurifyBonusThisTurn = (S.bellStrikePurifyBonusThisTurn || 0) + amount;
      toast("이번 턴 방울치기 정화량 증가");
      return true;
    case "blockGainMultiplierThisTurn":
      S.blockGainMultiplierThisTurn = Math.max(S.blockGainMultiplierThisTurn || 1, amount || 1);
      toast("이번 턴 결계 획득량 증가");
      return true;
    case "createTemporaryCopy":
      S.nextCardTemporaryCopy = {
        count: fx.count || 1,
        keepOriginalCost: fx.keepOriginalCost !== false,
        exhaustAtTurnEnd: fx.exhaustAtTurnEnd !== false
      };
      toast("다음 주문 사용 시 임시 복사본 생성 예약");
      return true;
    case "exhaustStatusCardFromHandOrDraw": {
      const candidates = getStatusCardHandCandidates();
      if(!candidates.length){
        drawCards(fx.drawIfNone || 1, { source:"potion" });
        return true;
      }
      const uid = await chooseHandCardUidViaDeckViewer({
        title: context.potion?.name || "경문 잿물",
        desc: "소멸할 상태 주문을 선택하세요.",
        candidates
      });
      if(!uid) return false;
      const removed = removeHandCardByUid(uid);
      if(!removed) return false;
      if(Array.isArray(S.exhaust)) S.exhaust.push(removed.key);
      toast((CARD_DB[removed.key]?.name || removed.key) + " 소멸");
      return true;
    }
    case "drawThenDiscardChoice": {
      drawCards(fx.draw || 0, { source:"potion" });
      const candidates = getAnyHandCandidates();
      if(!candidates.length) return true;
      const uid = await chooseHandCardUidViaDeckViewer({
        title: context.potion?.name || "새벽 샘물",
        desc: "버릴 손패 1장을 선택하세요.",
        candidates
      });
      if(!uid) return false;
      const removed = removeHandCardByUid(uid);
      if(!removed) return false;
      discardCard(removed.key, { source:"potionDiscardChoice", instance:removed.instance });
      return true;
    }
    case "discardDrawTriggerGrowth": {
      const candidates = getAnyHandCandidates();
      if(!candidates.length){
        toast("버릴 손패가 없습니다.");
        return false;
      }
      const uid = await chooseHandCardUidViaDeckViewer({
        title: context.potion?.name || "응어리 먹물",
        desc: "버릴 손패 1장을 선택하세요.",
        candidates
      });
      if(!uid) return false;
      const removed = removeHandCardByUid(uid);
      if(!removed) return false;
      const removedCard = CARD_DB[removed.key];
      if(removedCard && removedCard.attr === "한풀이 덱"){
        applyHanpuriGrowth(removed.instance, fx.growthTrigger || 1, { source:"potion", cardKey:removed.key });
      }
      discardCard(removed.key, { source:"potionDiscardChoice", instance:removed.instance });
      drawCards(fx.draw || 0, { source:"potion" });
      return true;
    }
    case "discardAnyThenDrawSameCount": {
      const candidates = getAnyHandCandidates();
      if(!candidates.length){
        toast("버릴 손패가 없습니다.");
        return false;
      }
      const uids = await chooseHandCardUidsViaDeckViewer({
        title: context.potion?.name || "도깨비 거울물",
        desc: "버릴 주문을 원하는 만큼 선택한 뒤 확인을 누르세요.",
        candidates
      });
      if(!uids || !uids.length) return false;
      let discardedCount = 0;
      uids.forEach(uid => {
        const removed = removeHandCardByUid(uid);
        if(!removed) return;
        discardCard(removed.key, { source:"potionDiscardChoice", instance:removed.instance });
        discardedCount += 1;
      });
      if(discardedCount > 0) drawCards(discardedCount, { source:"potion" });
      return discardedCount > 0;
    }
    case "recoverHandDiscard": {
      const rec = S.lastHandDiscardedCard;
      if(!rec){
        toast("회수할 주문이 없습니다.");
        return false;
      }
      if(S.hand.length >= 10){
        toast("손패가 가득 차 있습니다.");
        return false;
      }
      ensureCardInstanceZones();
      const idx = S.discardInstances.findIndex(inst => inst && inst.uid === rec.instance.uid);
      if(idx < 0){
        S.lastHandDiscardedCard = null;
        toast("회수할 주문을 찾을 수 없습니다.");
        return false;
      }
      const recKey = S.discard.splice(idx, 1)[0];
      const recInstance = S.discardInstances.splice(idx, 1)[0];
      S.hand.push(recKey);
      S.handInstances.push(recInstance);
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
      const baseCost = CARD_DB[recKey] ? (CARD_DB[recKey].cost || 0) : 0;
      const minResultCost = Number.isFinite(fx.minResultCost) ? fx.minResultCost : 0;
      setHandCardCostOverride(S.hand.length - 1, Math.max(minResultCost, baseCost - (fx.costReduce || 1)));
      S.lastHandDiscardedCard = null;
      toast((CARD_DB[recKey]?.name || recKey) + " 회수");
      return true;
    }
    case "fillEmptyPotionSlots": {
      const limit = typeof window.POTION_SLOT_LIMIT === "number" ? window.POTION_SLOT_LIMIT : 3;
      const currentCount = Array.isArray(S.potions) ? S.potions.length : 0;
      const afterSelfRemoved = fx.removeSelfFirst ? Math.max(0, currentCount - 1) : currentCount;
      let emptySlots = Math.max(0, limit - afterSelfRemoved);
      emptySlots = Math.min(emptySlots, fx.maxSlots || 2);
      if(emptySlots <= 0) return true;
      const pool = getFillPotionSlotCandidates(context.potion, fx);
      if(!pool.length) return true;
      const usedIds = new Set();
      let filled = 0;
      for(let i = 0; i < emptySlots; i++){
        let candidatePool = pool;
        if(fx.noDuplicateInSameUse){
          candidatePool = pool.filter(p => !usedIds.has(p.id));
          if(!candidatePool.length) break;
        }
        const picked = pickRewardItemByRarity(candidatePool, { rarityWeights: fx.rarityWeights });
        if(!picked) break;
        usedIds.add(picked.id);
        S.potions.push({ ...picked });
        filled += 1;
      }
      if(filled > 0) toast("빈 약병 슬롯을 채웠습니다.");
      return true;
    }
    default:
      console.warn("[Potion FX] Unsupported FX:", fx);
      return false;
  }
}

async function useSelfPotion(index){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || !isSelfUsePotion(potion)) return false;
  if(!(await applySelfPotionEffect(potion, { potion, potionIndex:index }))) return false;
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
  return true;
}

async function applySelfPotionEffect(potion, context={}){
  return await executePotionFx(potion, context);
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
  if(S && S.pendingCardChoice) return;
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

async function useTargetPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || !isAttackPotion(potion)) return false;
  if(!(await executePotionFx(potion, { potion, potionIndex:index, targetEnemy }))) return false;
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

