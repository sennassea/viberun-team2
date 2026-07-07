"use strict";
function hasRelic(id){
  return !!(S && Array.isArray(S.relics) && S.relics.some(r => r && r.id === id));
}

function getMaxEnergy(){
  return MAX_ENERGY + (hasRelic("charm_box") ? 1 : 0) + (hasRelic("inverted_bell") || hasRelic("cracked_divine_tablet") ? 1 : 0);
}

function ensureRelicRuntime(){
  if(!RUN_STATE) RUN_STATE = createFreshRunState();
  if(!RUN_STATE.relicRuntime || typeof RUN_STATE.relicRuntime !== "object") RUN_STATE.relicRuntime = {};
  if(S && (!S.relicRuntime || typeof S.relicRuntime !== "object")) S.relicRuntime = RUN_STATE.relicRuntime;
  return S ? S.relicRuntime : RUN_STATE.relicRuntime;
}

function relicFlag(scope, relicId, key){
  const rt = ensureRelicRuntime();
  const turn = S ? (S.turn || 0) : 0;
  const battle = S ? (S.battleRuntimeId || 0) : 0;
  if(scope === "turn") return "turn:" + battle + ":" + turn + ":" + relicId + ":" + key;
  if(scope === "battle") return "battle:" + battle + ":" + relicId + ":" + key;
  return "run:" + relicId + ":" + key;
}

function useRelicFlag(scope, relicId, key, limit=1){
  const rt = ensureRelicRuntime();
  const flag = relicFlag(scope, relicId, key);
  const used = rt[flag] || 0;
  if(used >= limit) return false;
  rt[flag] = used + 1;
  return true;
}

function addPermanentCard(key, options={}){
  if(!key || !CARD_DB[key]) return false;
  const card = CARD_DB[key];
  STARTER_DECK.push(key);
  if(S && Array.isArray(S.discard) && options.addToDiscard !== false) pushDiscardCard(key, createCardInstance(key));
  const isSpellCard = card && ["attack", "defense", "skill"].includes(card.type) && card.rarity !== "status" && !card.generatedOnly;
  if(S && isSpellCard && !options.skipRelicEvent){
    applyRelicTrigger("onPermanentCardAdded", { cardKey:key, source:options.source || "unknown", duplicateByRelic:!!options.duplicateByRelic });
  }
  if(typeof syncRunStateFromCombat === "function" && S) syncRunStateFromCombat();
  return true;
}
window.addPermanentCard = addPermanentCard;

function createCardInstance(key, existing={}){
  if(!S) return { uid:"card_prebattle_"+Math.random().toString(36).slice(2), key, runtime:{ hanpuriGrowth:0 } };
  S.nextCardUid = (S.nextCardUid || 1) + 1;
  return {
    uid: existing.uid || ("card_runtime_" + (S.nextCardUid - 1)),
    key,
    runtime: { hanpuriGrowth:0, ...existing.runtime }
  };
}

function createCardInstancesForKeys(keys){
  return (keys || []).map(key => createCardInstance(key));
}

function zipShuffleCards(keys, instances){
  const pairs = (keys || []).map((key, index) => ({ key, instance:instances && instances[index] ? instances[index] : createCardInstance(key) }));
  shuffle(pairs);
  return {
    keys: pairs.map(item => item.key),
    instances: pairs.map(item => item.instance)
  };
}

function ensureCardInstanceZones(){
  if(!S) return;
  if(!Array.isArray(S.handInstances)) S.handInstances = createCardInstancesForKeys(S.hand || []);
  if(!Array.isArray(S.drawInstances)) S.drawInstances = createCardInstancesForKeys(S.draw || []);
  if(!Array.isArray(S.discardInstances)) S.discardInstances = createCardInstancesForKeys(S.discard || []);
  if(S.handInstances.length !== (S.hand || []).length) S.handInstances = createCardInstancesForKeys(S.hand || []);
  if(S.drawInstances.length !== (S.draw || []).length) S.drawInstances = createCardInstancesForKeys(S.draw || []);
  if(S.discardInstances.length !== (S.discard || []).length) S.discardInstances = createCardInstancesForKeys(S.discard || []);
}

function pushDiscardCard(key, instance){
  if(!S || !Array.isArray(S.discard)) return;
  ensureCardInstanceZones();
  S.discard.push(key);
  S.discardInstances.push(instance || createCardInstance(key));
}

function getPlayerAttackDamage(rawDamage, targetEnemy){
  let amount = rawDamage;
  if(S && S.nextAttackMultiplier){
    amount = Math.floor(amount * S.nextAttackMultiplier);
    S.nextAttackMultiplier = null;
  }
  if(S && Array.isArray(S.relics)){
    S.relics = S.relics.map(hydrateRelicData);
    S.relics.forEach(relic => {
      if(!relic || !Array.isArray(relic.fx)) return;
      relic.fx.forEach(effect => {
        if(!effect) return;
        if(effect.timing === "firstAttack" && effect.t === "damagePlus" && !S.firstAttackUsed){
          amount += effect.v || 0;
          S.firstAttackUsed = true;
        }
        if(effect.timing !== "damage") return;
        if(effect.t === "damagePlus") amount += effect.v || 0;
        if(effect.t === "damagePlusVsAgitated" && targetEnemy && (targetEnemy.weak || 0) > 0) amount += effect.v || 0;
        if(effect.t === "damagePlusVsMarked" && targetEnemy && (targetEnemy.mark || 0) > 0) amount += effect.v || 0;
      });
    });
  }
  return Math.max(0, amount);
}

function gainPlayerBlock(value){
  const multiplier = (S && S.blockGainMultiplierThisTurn) || 1;
  let requested = Math.max(0, Math.floor((value || 0) * multiplier));
  if(S && S.endlessBattleStartPhase && typeof scaleEndlessPlayerStartBlock === "function"){
    requested = scaleEndlessPlayerStartBlock(requested);
  }
  const before = S && S.player ? (S.player.block || 0) : 0;
  LIFE.addBlock(S.player, requested);
  const gained = Math.max(0, (S.player.block || 0) - before);
  if(requested > 0){
    S.blockGainedThisTurn = (S.blockGainedThisTurn || 0) + requested;
  }
  if(gained > 0){
    spawnFloat('.player', '+'+gained, 'blk');
    applyRelicTrigger("onBlockGain", { amount: gained });
  }
  return gained;
}

function getRelicMasterData(id){
  if(!id || typeof RELIC_DB === "undefined" || !Array.isArray(RELIC_DB)) return null;
  return RELIC_DB.find(item => item && item.id === id) || null;
}

function hydrateRelicData(relic){
  if(!relic || !relic.id) return relic;
  const master = getRelicMasterData(relic.id);
  if(!master) return relic;
  // 상점/저장/이전 세이브에서 id·name·desc만 남은 법구도 실제 효과가 발동되도록 원본 DB 데이터를 병합합니다.
  return {
    ...master,
    ...relic,
    iconImage: relic.iconImage || master.iconImage || "",
    fx: Array.isArray(relic.fx) ? relic.fx : master.fx
  };
}

function applyRelicTrigger(trigger, context={}){
  if(!S || !Array.isArray(S.relics)) return;
  S.relics = S.relics.map(hydrateRelicData);
  S.relics.forEach(relic => {
    if(!relic) return;
    if(Array.isArray(relic.fx)){
      relic.fx.forEach(effect => {
        if(effect.timing !== trigger) return;
        applyRelicEffect(relic, effect, context);
      });
    }
    if(relic.plannedTrigger === trigger) applyRelicPlannedEffect(relic, context);
  });
}

function applyRelicEffect(relic, effect, context={}){
  switch(effect.t){
    case "draw":
      if(effect.oncePerTurn){
        S.relicTurnFlags = S.relicTurnFlags || {};
        const key = relic.id + ":" + effect.t + ":" + S.turn;
        if(S.relicTurnFlags[key]) return;
        S.relicTurnFlags[key] = true;
      }
      drawCards(effect.v || 1, { source:"relic" });
      toast(relic.name+" 발동");
      break;
    case "heal": {
      const healValue = typeof scaleEndlessPlayerHeal === "function" ? scaleEndlessPlayerHeal(effect.v || 0) : (effect.v || 0);
      const healed = LIFE.heal(S.player, healValue);
      if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
      toast(relic.name+" 발동");
      break;
    }
    case "block":
      gainPlayerBlock(effect.v || 0);
      toast(relic.name+" 발동");
      break;
    case "damageRandomEnemy": {
      const targets = livingEnemies();
      if(targets.length){
        const target = targets[Math.floor(Math.random()*targets.length)];
        applyDamageWithFeedback(target, effect.v || 0, 0);
      }
      break;
    }
    case "gainRandomPotion": {
      const potion = getRandomPotionReward();
      const limit = typeof POTION_SLOT_LIMIT === "number" ? POTION_SLOT_LIMIT : 3;
      if(potion && Array.isArray(S.potions) && S.potions.length < limit){
        S.potions.push({ ...potion });
        toast(relic.name+" 발동: "+potion.name+" 획득");
        if(typeof window.OPEN_RANDOM_ITEM_RESULT_POPUP === "function"){
          window.OPEN_RANDOM_ITEM_RESULT_POPUP({
            title: "약병 획득",
            items: [{
              type: "potion", action: "gain", key: potion.id, name: potion.name,
              icon: potion.iconImage || potion.icon || potion.emoji || "🧪"
            }]
          });
        }
      }
      break;
    }
    case "applyAgitation": {
      const target = effect.target === "frontEnemy" ? livingEnemies()[0] : getSelectedLivingEnemy();
      if(target){
        addStatus(target, "agitation", effect.v || 1);
        applyRelicTrigger("onAgitationApply", { target, amount: effect.v || 1 });
      }
      break;
    }
    case "applyMark": {
      const target = effect.target === "frontEnemy" ? livingEnemies()[0] : getSelectedLivingEnemy();
      if(target){
        addStatus(target, "mark", effect.v || 1);
      }
      break;
    }
    case "markPlus": {
      const target = context.target || getSelectedLivingEnemy();
      if(target) addStatus(target, "mark", effect.v || 1);
      break;
    }
    case "retainBlockRatio":
      S.retainedBlockFromRelic = Math.floor((S.player.block || 0) * (effect.v || 0));
      break;
  }
}

function applyRelicPlannedEffect(relic, context={}){
  const c = relic.plannedConditions || {};
  const e = relic.plannedEffects || {};
  switch(relic.id){
    case "bronze_incense_burner":
      drawCards(e.draw || 1, { source:"relic" });
      toast(relic.name+" 발동");
      break;
    case "moon_spirit_tablet":
      if(context.card && context.card.type === "attack" && useRelicFlag("battle", relic.id, "firstPurify")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.purifyBonus || 0);
        toast(relic.name+" 발동");
      }
      break;
    case "broken_rosary":
      if(!context.generated && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "leftover_candle_wax": {
      const energy = Math.max(0, S.energy || 0);
      if(energy >= (c.remainingEnergyMin || 1)){
        const amount = Math.min(e.maxBlock || 999, energy * (e.blockPerRemainingEnergy || 0));
        if(amount > 0){ gainPlayerBlock(amount); toast(relic.name+" 발동"); }
      }
      break;
    }
    case "tricolor_cotton_fan":
      if((c.requiredTypes || []).every(type => S.spellTypesPlayedThisTurn && S.spellTypesPlayedThisTurn[type]) && useRelicFlag("turn", relic.id, "energy")){
        S.energy = Math.min(getMaxEnergy(), (S.energy || 0) + (e.restoreEnergy || 1));
        toast(relic.name+" 발동");
      }
      break;
    case "old_hairpin":
      applyRandomHandCostReduction(e.temporaryCostReduction || 1);
      toast(relic.name+" 발동");
      break;
    case "ash_smeared_mirror":
      if((context.hpLoss || 0) > 0 && useRelicFlag("battle", relic.id, "hit")){
        S.nextTurnEnergyBonus = (S.nextTurnEnergyBonus || 0) + (e.nextTurnEnergyBonus || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "paper_crane_bundle":
      if(S.playerTurnActive && Array.isArray(S.hand) && S.hand.length === 0 && useRelicFlag("battle", relic.id, "empty")){
        drawCards(e.draw || 2, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "threshold_salt":
      if((context.rawDamage || 0) <= 0) break;
      if(useRelicFlag("battle", relic.id, "reduce")){
        context.rawDamage = Math.max(0, (context.rawDamage || 0) - (e.reduceHpDamage || 0));
        toast(relic.name+" 발동");
      }
      break;
    case "demon_sealing_tablet":
      gainPlayerBlock(e.block || 8);
      toast(relic.name+" 발동");
      break;
    case "red_golden_rope":
      if(useRelicFlag("turn", relic.id, "damage")){
        damageRandomEnemy(e.damageRandomEnemy || 2);
        toast(relic.name+" 발동");
      }
      break;
    case "ink_line_spool":
      if((context.beforeBlock || 0) >= (c.minBarrierBeforeConsume || 15) && useRelicFlag("battle", relic.id, "reward")){
        drawCards(e.draw || 1, { source:"relic" });
        S.energy = Math.min(getMaxEnergy(), (S.energy || 0) + (e.restoreEnergy || 1));
        toast(relic.name+" 발동");
      }
      break;
    case "damp_letter_tie":
      if((context.before || 0) >= (c.targetRecollectionAtLeast || 3) && (context.added || 0) > 0 && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "ward_pocket_watch":
      if(useRelicFlag("turn", relic.id, "bonus")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.recollectionDamageBonus || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "tear_catcher_gourd":
      if(context.hadRecollection && useRelicFlag("battle", relic.id, "transfer")){
        const targets = livingEnemies().filter(enemy => enemy !== context.enemy);
        if(targets.length){
          const target = targets[Math.floor(Math.random() * targets.length)];
          addStatus(target, "recollection", e.transferRecollection || 2);
          toast(relic.name+" 발동");
        }
      }
      break;
    case "lotus_lamp":
      if((context.before || 0) === 0 && (context.added || 0) > 0 && context.target){
        const flagKey = "target:" + (context.target.id || context.target.spawnIndex || "unknown");
        if(useRelicFlag("battle", relic.id, flagKey)){
          addStatus(context.target, "mark", e.markBonus || 1, { skipRelic:true });
          toast(relic.name+" 발동");
        }
      }
      break;
    case "lotus_seed_bead": {
      const target = livingEnemies()[0];
      if(target){ addStatus(target, "mark", e.applyMark || 1); toast(relic.name+" 발동"); }
      break;
    }
    case "cheondo_bell":
      if((context.consumed || 0) >= (c.minMarksConsumed || 4) && useRelicFlag("battle", relic.id, "reserve")){
        S.nextTurnEnergyBonus = (S.nextTurnEnergyBonus || 0) + (e.nextTurnRestoreEnergy || 1);
        S.nextTurnDrawBonus = (S.nextTurnDrawBonus || 0) + (e.nextTurnDraw || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "old_letter_box":
      markRandomHanpuriGrowth(e.applyGrowthCount || 1);
      break;
    case "broken_red_thread":
      if(useRelicFlag("turn", relic.id, "draw")){ drawCards(e.draw || 1, { source:"relic" }); toast(relic.name+" 발동"); }
      break;
    case "unsealed_letter":
      if(context.cardKey && context.cardUid && useRelicFlag("battle", relic.id, "return")){
        S.nextTurnReturnCard = { cardUid:context.cardUid, cardKey:context.cardKey, costReduction:e.temporaryCostReduction || 1 };
        toast(relic.name+" 발동");
      }
      break;
    case "gilt_bell_clapper":
      if(useRelicFlag("turn", relic.id, "bonus")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.purifyBonus || 2);
        toast(relic.name+" 발동");
      }
      break;
    case "sevenstar_knot":
      if((S.cardsPlayedThisTurn || 0) + 1 === (c.spellCount || 5) && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "torn_gut_fan":
      if((S.exhaustedSpellCountThisTurn || 0) === (c.exhaustedSpellCount || 3) &&
         useRelicFlag("turn", relic.id, "block") &&
         useRelicFlag("battle", relic.id, "block", c.maxPerBattle || 2)){
        gainPlayerBlock(e.block || 5);
        toast(relic.name+" 발동");
      }
      break;
    case "prayer_knot":
      S.nextBattleStartBlock = (S.nextBattleStartBlock || 0) + (e.nextBattleStartBlock || 6);
      if(RUN_STATE) RUN_STATE.nextBattleStartBlock = S.nextBattleStartBlock;
      toast(relic.name+" 발동");
      break;
    case "empty_lucky_pouch":
      if(useRelicFlag("run", relic.id, "skip", c.maxPerRun || 4)){
        S.gold = (S.gold || 0) + (e.gold || 15);
        syncRunStateFromCombat();
        toast(relic.name+" 발동: 복채 +" + (e.gold || 15));
      }
      break;
    case "twin_marriage_tablet":
      if(context.cardKey && !context.duplicateByRelic){
        addPermanentCard(context.cardKey, { source:"relic", duplicateByRelic:true, skipRelicEvent:true });
        toast(relic.name+" 발동");
      }
      break;
    case "inverted_bell":
      if(S.turn === 1 && !S.invertedBellAutoPlayed){
        S.invertedBellAutoPlayed = true;
        setTimeout(autoPlayInvertedBellFirstTurn, 0);
      }
      break;
    case "closed_sutra_box":
      drawCards(e.draw || 1, { source:"turnStartRelic" });
      break;
    case "reversed_talisman_book":
      if(Number.isFinite(context.handIndex)){
        setHandCardCostOverride(context.handIndex, Math.floor(Math.random() * 4));
      }
      break;
  }
}

function damageRandomEnemy(amount){
  const targets = livingEnemies();
  if(!targets.length || amount <= 0) return 0;
  const target = targets[Math.floor(Math.random() * targets.length)];
  applyDamageWithFeedback(target, amount, 0);
  return amount;
}

function tryApplyFatalRelic(){
  if(!S || !S.player || S.player.hp > 0 || !Array.isArray(S.relics)) return false;
  S.relics = S.relics.map(hydrateRelicData);
  const relicIndex = S.relics.findIndex(relic =>
    relic && (
      (Array.isArray(relic.fx) && relic.fx.some(effect => effect && effect.timing === "fatalDamage" && effect.t === "revive")) ||
      relic.id === "lizard_tail_charm"
    )
  );
  if(relicIndex < 0) return false;

  const relic = S.relics[relicIndex];
  const effect = Array.isArray(relic.fx) ? relic.fx.find(fx => fx && fx.timing === "fatalDamage" && fx.t === "revive") : null;
  const planned = relic.plannedEffects || {};
  const ratio = typeof effect?.v === "number" ? effect.v : (planned.healByMaxHpRatio || 0.5);
  const healValue = Math.max(1, Math.floor((S.player.maxHp || 1) * ratio));
  S.player.hp = 0;
  const scaledHealValue = typeof scaleEndlessPlayerHeal === "function" ? scaleEndlessPlayerHeal(healValue) : healValue;
  const healed = LIFE.heal(S.player, scaledHealValue);
  if(!effect || effect.consume || (relic.plannedConditions && relic.plannedConditions.consumeRelic)) S.relics.splice(relicIndex, 1);
  if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
  toast(relic.name+" 발동");
  renderAll();
  return S.player.hp > 0;
}

/**
 * 약병 후보를 획득처 기준으로 필터링합니다.
 * source 예시: "battle", "shop", "event"
 */
function getPotionCandidatesBySource(source, options = {}) {
  const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : [];
  return db.filter(item => {
    if (!item) return false;
    if (source && Array.isArray(item.obtainFrom) && !item.obtainFrom.includes(source)) {
      return false;
    }
    if (options.rarity && item.rarity !== options.rarity) {
      return false;
    }
    if (window.VIBERUN_SPIRIT_PATH_FILTER &&
        typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath === "function" &&
        !window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(item)) {
      return false;
    }
    return true;
  });
}

/**
 * 법구 후보를 획득처 기준으로 필터링합니다.
 * 이미 보유한 법구는 제외합니다.
 */
function getRelicCandidatesBySource(source, options = {}) {
  const db = Array.isArray(window.RELIC_DB)
    ? window.RELIC_DB
    : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  const ownedIds = new Set(
    (S && Array.isArray(S.relics) ? S.relics : [])
      .map(relic => relic && relic.id)
      .filter(Boolean)
  );
  return db.filter(item => {
    if (!item || ownedIds.has(item.id)) return false;
    if (item.category === "blessingRelic" || item.source === "startBlessing") return false;
    if (source) {
      const sourceLabels = {
        battle: ["battle", "일반전"],
        enemy: ["enemy", "일반전"],
        elite: ["elite", "엘리트"],
        boss: ["boss", "보스"],
        shop: ["shop", "상점"],
        event: ["event", "이벤트"],
        prayer: ["prayer", "기도터"],
        rest: ["rest", "기도터"]
      }[source] || [source];
      const from = Array.isArray(item.obtainFrom) ? item.obtainFrom : [];
      const proposal = Array.isArray(item.obtainFromProposal) ? item.obtainFromProposal : [];
      if(!sourceLabels.some(label => from.includes(label) || proposal.includes(label))) return false;
    }
    if (options.rarity && item.rarity !== options.rarity) {
      return false;
    }
    if (options.attr && item.attr !== options.attr) {
      return false;
    }
    if (window.VIBERUN_SPIRIT_PATH_FILTER &&
        typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath === "function" &&
        !window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(item)) {
      return false;
    }
    return true;
  });
}
window.getPotionCandidatesBySource = getPotionCandidatesBySource;
window.getRelicCandidatesBySource = getRelicCandidatesBySource;

function getRandomPotionReward(){
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("battle")
    : (typeof window.POTION_DB !== "undefined" ? window.POTION_DB : BATTLE_VICTORY_POTION_CANDIDATES);
  return pickBattleVictoryCandidate(db);
}

function getSelectedLivingEnemy(){
  return livingEnemies().find(e => e.id === S.selectedId) || livingEnemies()[0] || null;
}

function cloneMonsterRuntimeData(data){
  if(!data || typeof data !== "object") return data;
  if(Array.isArray(data)) return data.map(cloneMonsterRuntimeData);
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, cloneMonsterRuntimeData(value)])
  );
}

function applyBattleStartRelics(){
  // 전투 데이터가 아직 준비되지 않았으면 처리하지 않는다.
  if(!S || !S.player) return;

  // 전투 시작 효과 중복 적용 방지
  // 실수로 applyBattleStartRelics()가 여러 번 호출되어도
  // 법구/은혜 전투 시작 효과는 전투당 1회만 적용한다.
  if(S.battleStartApplied){
    console.warn("[BattleStart] 전투 시작 효과가 이미 적용되어 중복 호출을 무시합니다.");
    return;
  }
  S.battleStartApplied = true;

  // 1. 기존 법구 전투 시작 효과 처리
  // 예: 청동 향로, 도깨비 주머니, 봉마패 등 battleStart 트리거 법구
  if(typeof applyRelicTrigger === "function"){
    applyRelicTrigger("battleStart");
  }else{
    console.warn("[BattleStart] applyRelicTrigger 함수가 없어 법구 전투 시작 효과를 적용하지 못했습니다.");
  }

  // 2. 신령의 은혜 전투 시작 효과 처리
  // 선택 화면에서 예약된 시작 전용 법구 효과만 여기서 소모한다.
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const effects = (run && run.startBlessingEffects) || {};
  const legacyBlock = run && run.startBlessingEffect;

  const anxietyEffect = effects.firstBattleAnxiety;
  if(anxietyEffect && !anxietyEffect.used){
    S.player.anxiety = (S.player.anxiety || 0) + Number(anxietyEffect.value || 1);
    anxietyEffect.used = true;
    toast("은혜4 발동: 불안 1");
  }

  const hpOneEffect = effects.nextThreeNormalFirstEnemyHpOne;
  if(hpOneEffect && (hpOneEffect.remaining || 0) > 0 && S.battleNodeType === "enemy"){
    const target = livingEnemies()[0];
    if(target){
      target.hp = Math.min(target.hp, 1);
      hpOneEffect.remaining -= 1;
      toast("은혜11 발동: 첫 번째 적 정신력 1");
    }
  }

  const blockEffect = effects.firstBattleBlock || legacyBlock;
  if(blockEffect && !blockEffect.used && blockEffect.type === "firstBattleBlock"){
    const blockValue = Number(blockEffect.value || 10);
    if(typeof LIFE !== "undefined" && LIFE && typeof LIFE.addBlock === "function"){
      LIFE.addBlock(S.player, blockValue);
      blockEffect.used = true;
      toast("은혜12 발동: 결계 " + blockValue);
    }else{
      console.warn("[BattleStart] LIFE.addBlock 함수가 없어 신령의 은혜 결계 효과를 적용하지 못했습니다.");
    }
  }
}

