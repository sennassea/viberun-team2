"use strict";
function getBasicSummonMonsterDef(summoner){
  const theme = summoner && summoner.theme;
  const monsterId = BASIC_SUMMON_MONSTER_BY_THEME[theme] || BASIC_SUMMON_MONSTER_BY_THEME.park;
  if(typeof COMBAT_DATA.getMonsterById === "function"){
    const monster = COMBAT_DATA.getMonsterById(monsterId);
    if(monster) return monster;
  }
  return MONSTER_DEFS.find(monster => monster.id === monsterId)
    || MONSTER_DEFS.find(monster => monster.grade === "normal")
    || null;
}

function getSummonCountByGrade(summoner){
  return summoner && summoner.grade === "boss" ? 2 : 1;
}

function summonEnemy(summoner){
  if(!S || !summoner) return 0;
  const maxLivingEnemies = 4;
  const config = summoner.summonConfig || null;
  const count = Number.isFinite(config && config.count) ? config.count : getSummonCountByGrade(summoner);
  const summonGroup = config && config.summonGroup ? config.summonGroup : null;
  if(config && Number.isFinite(config.maxLivingSummons)){
    const livingOwned = livingEnemies().filter(enemy =>
      enemy.ownerId === summoner.id && (!summonGroup || enemy.summonGroup === summonGroup)
    ).length;
    if(livingOwned >= config.maxLivingSummons) return 0;
  }
  const def = config && config.summonMonsterId && typeof COMBAT_DATA.getMonsterById === "function"
    ? COMBAT_DATA.getMonsterById(config.summonMonsterId)
    : getBasicSummonMonsterDef(summoner);
  if(!def) return 0;

  let summoned = 0;
  for(let i = 0; i < count && livingEnemies().length < maxLivingEnemies; i++){
    if(config && Number.isFinite(config.maxLivingSummons)){
      const livingOwned = livingEnemies().filter(enemy =>
        enemy.ownerId === summoner.id && (!summonGroup || enemy.summonGroup === summonGroup)
      ).length;
      if(livingOwned >= config.maxLivingSummons) break;
    }
    S.summonCount = (S.summonCount || 0) + 1;
    const enemy = createCombatEnemy(def, S.enemies.length, {
      summoned: true,
      idSuffix: "summon" + S.summonCount,
      ownerId: summoner.id,
      summonGroup,
      expireAfterActions: config && Number.isFinite(config.expireAfterActions) ? config.expireAfterActions : null
    });
    planEnemyIntentTarget(enemy);
    S.enemies.push(enemy);
    summoned += 1;
  }
  if(summoned > 0) autoSelectTarget();
  return summoned;
}

function applyNextPhaseIfNeeded(enemy){
  if(!enemy || enemy.phaseChanged || !enemy.nextPhase) return false;
  if(enemy.hp > Math.ceil(enemy.maxHp / 2)) return false;

  const phase = cloneMonsterRuntimeData(enemy.nextPhase);
  const previousId = enemy.id;
  const previousBaseId = enemy.baseId || enemy.id;
  const previousImage = enemy.image;
  const previousTheme = enemy.theme;
  const previousThemeLabel = enemy.themeLabel;
  const previousFamily = enemy.family;
  const previousSpawnIndex = enemy.spawnIndex;
  const previousSummoned = enemy.summoned;
  const preservedWeak = enemy.weak || 0;
  const preservedFracture = enemy.fracture || 0;
  const preservedAnxiety = enemy.anxiety || 0;
  const preservedLethargy = enemy.lethargy || 0;
  const preservedStatus = enemy.status ? { ...enemy.status } : {};
  const preservedMark = enemy.mark || 0;

  Object.assign(enemy, phase);
  enemy.id = previousId;
  enemy.baseId = previousBaseId;
  enemy.image = phase.image || previousImage;
  enemy.theme = phase.theme || previousTheme;
  enemy.themeLabel = phase.themeLabel || previousThemeLabel;
  enemy.family = phase.family || previousFamily;
  enemy.spawnIndex = previousSpawnIndex;
  enemy.summoned = previousSummoned;
  enemy.maxHp = phase.maxHp
    ? (typeof scaleEndlessEnemyMaxHp === "function" ? scaleEndlessEnemyMaxHp(enemy, phase.maxHp) : phase.maxHp)
    : enemy.maxHp;
  enemy.hp = enemy.maxHp;
  enemy.block = 0;
  enemy.weak = preservedWeak;
  enemy.fracture = preservedFracture;
  enemy.anxiety = preservedAnxiety;
  enemy.lethargy = preservedLethargy;
  enemy.mark = preservedMark;
  enemy.status = preservedStatus;
  enemy.moves = Array.isArray(phase.moves) ? phase.moves : enemy.moves;
  enemy.intent = enemy.moves[phase.first || 0] || enemy.moves[0] || null;
  enemy.nextPhase = null;
  enemy.phaseChanged = true;
  enemy.lastIntentType = null;
  enemy.intentRepeatCount = 0;
  ensureEnemyStatus(enemy);
  spawnFloat('[data-id="'+enemy.id+'"]', '페이즈 전환', 'heal');
  return true;
}

/* =========================================================================
   유틸
   ========================================================================= */
function applyConfiguredPhaseIfNeeded(enemy){
  const config = enemy && enemy.phaseConfig;
  if(!enemy || !config) return false;
  const mode = config.mode || enemy.phaseMode;
  if(mode === "hpThresholdPatterns"){
    const thresholds = Array.isArray(config.thresholds) ? config.thresholds : [];
    const phases = Array.isArray(config.phases) ? config.phases : [];
    const current = enemy.phaseIndex || 0;
    let nextIndex = current;
    thresholds.forEach((threshold, index) => {
      if(enemy.hp <= threshold) nextIndex = Math.max(nextIndex, index + 1);
    });
    if(nextIndex === current) return false;
    const phase = phases[nextIndex] || phases[phases.length - 1];
    if(!phase) return false;
    enemy.phaseIndex = nextIndex;
    if(Array.isArray(phase.moves)){
      enemy.moves = cloneMonsterRuntimeData(phase.moves);
      enemy.patternIndex = 0;
    }
    if(phase.summonConfig !== undefined) enemy.summonConfig = cloneMonsterRuntimeData(phase.summonConfig);
    MONSTER_PATTERN.planNextIntent(enemy);
    planEnemyIntentTarget(enemy);
    return true;
  }
  if(mode !== "singleHpThreshold") return false;
  const phases = Array.isArray(config.phases) ? config.phases : [];
  const nextIndex = (enemy.phaseIndex || 0) + 1;
  const phase = phases[nextIndex - 1];
  if(!phase || phase.applied) return false;
  const thresholdRatio = Number.isFinite(phase.hpRatio) ? phase.hpRatio : config.hpRatio;
  const thresholdHp = Number.isFinite(phase.hp) ? phase.hp : Math.ceil(enemy.maxHp * (thresholdRatio || 0.5));
  if(enemy.hp > thresholdHp) return false;

  phase.applied = true;
  enemy.phaseIndex = nextIndex;
  if(Array.isArray(phase.moves)){
    enemy.moves = cloneMonsterRuntimeData(phase.moves);
    if(phase.resetPattern !== false) enemy.patternIndex = 0;
    enemy.intent = enemy.moves[0] || enemy.intent;
    planEnemyIntentTarget(enemy);
  }
  return true;
}

const $ = s => document.querySelector(s);
const livingEnemies = () => S.enemies.filter(e => e.hp > 0);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

function notifyMonsterBattleEvent(type, context={}){
  if(!S) return;
  S.lastMonsterBattleEvent = { type, context, turn:S.turn || 0 };
  handleMonsterBattleEvent(type, context);
}

function clampCounter(enemy, id, maxStack){
  const value = getMonsterCounter(enemy, id);
  updateMonsterCounter(enemy, id, "set", value, { min:0, max:Number.isFinite(maxStack) ? maxStack : 99 });
}

function addMonsterCounter(enemy, id, value, maxStack){
  updateMonsterCounter(enemy, id, "add", value, { min:0, max:Number.isFinite(maxStack) ? maxStack : 99 });
}

function reduceMonsterCounter(enemy, id, value){
  updateMonsterCounter(enemy, id, "reduce", value, { min:0 });
}

function resetMonsterCounter(enemy, id){
  updateMonsterCounter(enemy, id, "set", 0, { min:0 });
}

function handleMonsterBattleEvent(type, context={}){
  if(!S || !Array.isArray(S.enemies)) return;
  if(type === "successfulAttackCardPlayed") handleSuccessfulAttackCard(context);
  if(type === "enemyHit") handleEnemyHit(context);
  if(type === "enemyBlockBroken") handleEnemyBlockBroken(context);
  if(type === "enemyDied") handleEnemyDied(context);
}

function handleSuccessfulAttackCard(context){
}

function handleEnemyHit(context){
  const enemy = context.enemy || context.target;
  const result = context.result || {};
  if(!enemy || !(result.hpLoss > 0)) return;
  enemy.hitThisPlayerTurn = true;
}

function applyPreAttackCardGimmicks(target){
  if(!target || target.hp <= 0) return;
  const gimmick = target.gimmick || {};
  if(gimmick.type === "reflection" && !target.reflectionUsedThisPlayerTurn){
    const blockValue = gimmick.block || 0;
    if(blockValue > 0){
      grantEnemyBlock(target, blockValue);
      spawnFloat('[data-id="'+target.id+'"]', '+'+blockValue, 'blk');
    }
    target.reflectionUsedThisPlayerTurn = true;
  }
}

function handleEnemyBlockBroken(context){
  const enemy = context.enemy;
  const gimmick = enemy && enemy.gimmick;
  if(!enemy || !gimmick) return;
  if((gimmick.type === "charge" || gimmick.type === "scaling") && gimmick.counterId && gimmick.blockBreakReduction){
    reduceMonsterCounter(enemy, gimmick.counterId, gimmick.blockBreakReduction);
  }
}

function handleEnemyDied(context){
  const dead = context.enemy;
  if(!dead) return;
  livingEnemies().forEach(enemy => {
    const gimmick = enemy.gimmick || {};
    if(gimmick.type === "emptySeat" && enemy !== dead && gimmick.counterId){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
  });
}

function emitEnemyDiedOnce(enemy, context={}){
  if(!enemy || enemy.deathEventEmitted) return;
  const hadRecollection = getStatus(enemy, "recollection") > 0;
  enemy.deathEventEmitted = true;
  notifyMonsterBattleEvent("enemyDied", { ...context, enemy });
  applyRelicTrigger("onEnemyDefeated", { ...context, enemy, hadRecollection });
}

function hasPlayerStatus(statusId){
  if(!S || !S.player || !statusId) return false;
  if(statusId === "weak") return (S.player.weak || 0) > 0;
  if(statusId === "anxiety") return (S.player.anxiety || 0) > 0;
  if(statusId === "lethargy") return (S.player.lethargy || 0) > 0;
  if(statusId === "fracture") return (S.player.fracture || 0) > 0;
  return S.player.status && (S.player.status[statusId] || 0) > 0;
}

function ensureMonsterCounters(enemy){
  if(!enemy.counters || typeof enemy.counters !== "object") enemy.counters = {};
  return enemy.counters;
}

function getMonsterCounter(enemy, id){
  return (ensureMonsterCounters(enemy)[id] || 0);
}

function updateMonsterCounter(enemy, id, op, value=1, options={}){
  const counters = ensureMonsterCounters(enemy);
  const before = counters[id] || 0;
  let next = before;
  if(op === "add") next += value;
  else if(op === "reduce") next -= value;
  else if(op === "reset") next = Number.isFinite(options.resetTo) ? options.resetTo : 0;
  else if(op === "consume") next = Math.max(0, next - value);
  else if(op === "set") next = value;
  if(Number.isFinite(options.min)) next = Math.max(options.min, next);
  if(Number.isFinite(options.max)) next = Math.min(options.max, next);
  counters[id] = Math.max(0, next);
  return counters[id] - before;
}

function countStatusCards(statusId, zones=["hand","draw","discard"]){
  if(!S || !statusId) return 0;
  return zones.reduce((sum, zone) => {
    const cards = Array.isArray(S[zone]) ? S[zone] : [];
    return sum + cards.filter(key => key === statusId).length;
  }, 0);
}

function countAnyStatusCards(statusIds, zones=["hand","draw","discard"]){
  const ids = Array.isArray(statusIds) ? statusIds : [statusIds];
  return ids.reduce((sum, id) => sum + countStatusCards(id, zones), 0);
}

function countLivingSummons(group){
  return livingEnemies().filter(enemy => enemy.summoned && (!group || enemy.summonGroup === group || enemy.baseId === group)).length;
}

function getMoveTargetPolicy(actor, move){
  const conditional = move && move.conditionalTargetPolicy;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus)){
    return conditional.targetPolicy || move.targetPolicy || "self";
  }
  return move && move.targetPolicy || "self";
}

function selectMonsterSupportTarget(actor, move){
  const policy = getMoveTargetPolicy(actor, move);
  if(policy === "self") return actor;
  const others = livingEnemies().filter(enemy => enemy !== actor);
  let target = null;
  if(policy === "lowestHpAlly"){
    target = others.sort((a,b) => (a.hp - b.hp) || ((a.spawnIndex || 0) - (b.spawnIndex || 0)))[0] || null;
  } else if(policy === "lowestHpRatioAlly"){
    target = others.sort((a,b) => {
      const ar = a.maxHp ? a.hp / a.maxHp : 1;
      const br = b.maxHp ? b.hp / b.maxHp : 1;
      return (ar - br) || ((a.spawnIndex || 0) - (b.spawnIndex || 0));
    })[0] || null;
  } else if(policy === "randomOtherAlly"){
    target = others.length ? others[Math.floor(Math.random() * others.length)] : null;
  }
  if(target) return target;
  return (move && move.fallbackTarget === "self") ? actor : actor;
}

function planEnemyIntentTarget(enemy){
  if(!enemy || !enemy.intent || enemy.intent.t !== "defend"){
    if(enemy) enemy.plannedTargetId = null;
    return null;
  }
  const target = selectMonsterSupportTarget(enemy, enemy.intent);
  enemy.plannedTargetId = target ? target.id : null;
  return target;
}

function getPlannedMonsterSupportTarget(actor, move){
  if(!actor || !move) return actor;
  const planned = actor.plannedTargetId ? livingEnemies().find(enemy => enemy.id === actor.plannedTargetId) : null;
  return planned || selectMonsterSupportTarget(actor, move);
}

function getMonsterDefendValue(actor, move, target){
  if(!move) return 0;
  const usingFallback = target === actor && move.fallbackTarget === "self" && Number.isFinite(move.fallbackValue);
  let value = usingFallback ? move.fallbackValue : (move.v || 0);
  const bonus = move.conditionalValueBonus;
  if(bonus && hasPlayerStatus(bonus.ifPlayerStatus)) value += bonus.v || 0;
  if(move.counterBlock && move.counterBlock.id){
    value += getMonsterCounter(actor, move.counterBlock.id) * (move.counterBlock.per || 1);
  }
  if(move.statusCardBlock){
    const statusIds = move.statusCardBlock.statusCards || move.statusCardBlock.statusCard;
    const count = Math.min(move.statusCardBlock.maxCount || 99, countAnyStatusCards(statusIds));
    value += count * (move.statusCardBlock.per || 1);
  }
  return Math.max(0, value);
}

function grantEnemyBlock(target, value){
  if(!target || value <= 0) return 0;
  const scaledValue = typeof scaleEndlessEnemyBlock === "function" ? scaleEndlessEnemyBlock(target, value) : value;
  LIFE.addBlock(target, scaledValue);
  target.enemyBlockExpiresOnNextAction = true;
  target.enemyBlockGainedTurn = S.turn || 0;
  return scaledValue;
}

function clearExpiredEnemyBlockBeforeAction(enemy){
  if(!enemy || !enemy.enemyBlockExpiresOnNextAction) return false;
  if((enemy.enemyBlockGainedTurn || 0) >= (S.turn || 0)) return false;
  enemy.block = 0;
  enemy.enemyBlockExpiresOnNextAction = false;
  return true;
}

function getMonsterIntentRawDamage(enemy, move){
  if(!move) return 0;
  let damage = Number.isFinite(move.baseDamage) ? move.baseDamage : (move.v || 0);
  if(move.speedBurst && getMonsterCounter(enemy, "speed") >= (move.speedBurst.threshold || 3)){
    damage = move.speedBurst.damage || damage;
  }
  const attackRule = enemy && enemy.gimmick && (enemy.gimmick.type === "attackRule" || enemy.gimmick.type === "discipline") ? enemy.gimmick : null;
  const ruleMoveMatches = attackRule
    && move.role === attackRule.triggerMoveRole
    && (!attackRule.triggerMoveName || move.name === attackRule.triggerMoveName);
  if(ruleMoveMatches && getMonsterCounter(enemy, attackRule.counterId) >= (attackRule.maxStack || 2)){
    damage = attackRule.burstDamage || damage;
  }
  if(move.conditionalDamage && hasPlayerStatus(move.conditionalDamage.ifPlayerStatus)){
    damage = Number.isFinite(move.conditionalDamage.v) ? move.conditionalDamage.v : damage + (move.conditionalDamage.add || 0);
  }
  if(move.counterDamage && move.counterDamage.id){
    damage += getMonsterCounter(enemy, move.counterDamage.id) * (move.counterDamage.per || 1);
  }
  if(move.statusCardDamage){
    const statusIds = move.statusCardDamage.statusCards || move.statusCardDamage.statusCard;
    const count = Math.min(move.statusCardDamage.maxCount || 99, countAnyStatusCards(statusIds));
    const bonus = count * (move.statusCardDamage.per || 1);
    damage += Number.isFinite(move.statusCardDamage.maxBonus)
      ? Math.min(move.statusCardDamage.maxBonus, bonus)
      : bonus;
  }
  if(move.summonDamage){
    damage += countLivingSummons(move.summonDamage.group) * (move.summonDamage.per || 1);
  }
  if(typeof scaleEndlessEnemyDamage === "function") damage = scaleEndlessEnemyDamage(enemy, damage);
  return Math.max(0, Math.floor(damage));
}

function previewMonsterFinalDamage(enemy, move){
  const rawDamage = getMonsterIntentRawDamage(enemy, move);
  if(typeof LIFE.previewDamage === "function"){
    return LIFE.previewDamage(S.player, rawDamage, enemy && enemy.weak);
  }
  const finalDamage = Math.max(0, rawDamage - (enemy && enemy.weak > 0 ? 2 : 0));
  return { rawDamage, finalDamage };
}

function applyIntentStatusCard(move){
  if(!move) return 0;
  let added = 0;
  if(move.statusCard){
    added += addStatusCardToDiscard(move.statusCard, move.statusCount || 1);
    if(added > 0 && CARD_DB[move.statusCard]) spawnFloat('.player', CARD_DB[move.statusCard].name, 'dmg');
  }
  const conditional = move.conditionalStatusCard;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus) && conditional.statusCard){
    const amount = addStatusCardToDiscard(conditional.statusCard, conditional.statusCount || 1);
    added += amount;
    if(amount > 0 && CARD_DB[conditional.statusCard]) spawnFloat('.player', CARD_DB[conditional.statusCard].name, 'dmg');
  }
  return added;
}

function getMonsterIntentStatusCardKey(move){
  if(!move) return null;
  if(move.statusCard) return move.statusCard;
  const actor = livingEnemies().find(enemy => enemy.intent === move);
  const rule = actor && actor.gimmick && (actor.gimmick.type === "attackRule" || actor.gimmick.type === "discipline") ? actor.gimmick : null;
  if(rule && rule.statusCard && move.role === rule.triggerMoveRole && (!rule.triggerMoveName || move.name === rule.triggerMoveName) && getMonsterCounter(actor, rule.counterId) >= (rule.maxStack || 2)){
    return rule.statusCard;
  }
  const conditional = move.conditionalStatusCard;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus)) return conditional.statusCard || null;
  return null;
}

function executeMonsterAttack(enemy, move){
  notifyMonsterBattleEvent("beforeMonsterDamage", { enemy, move });
  const result = applyDamageWithFeedback(S.player, getMonsterIntentRawDamage(enemy, move), enemy.weak);
  applyIntentStatusCard(move);
  if(move.conditionalStatus && move.conditionalStatus.role === "anxiety"){
    LIFE.addAnxiety(S.player, move.conditionalStatus.v || 1);
    spawnFloat('.player', '불안', 'dmg');
  }
  const rule = enemy && enemy.gimmick && (enemy.gimmick.type === "attackRule" || enemy.gimmick.type === "discipline") ? enemy.gimmick : null;
  const ruleMoveMatches = rule
    && move.role === rule.triggerMoveRole
    && (!rule.triggerMoveName || move.name === rule.triggerMoveName);
  if(ruleMoveMatches && getMonsterCounter(enemy, rule.counterId) >= (rule.maxStack || 2)){
    if(rule.statusCard) addStatusCardToDiscard(rule.statusCard, 1);
    resetMonsterCounter(enemy, rule.counterId);
  }
  if(move.counterDamage && move.counterDamage.resetAfterUse) resetMonsterCounter(enemy, move.counterDamage.id);
  if(move.speedBurst && move.speedBurst.reset && getMonsterCounter(enemy, "speed") >= (move.speedBurst.threshold || 3)) resetMonsterCounter(enemy, "speed");
  notifyMonsterBattleEvent("afterMonsterDamage", { enemy, move, result });
  return result;
}

function executeEchoMove(enemy){
  const echo = enemy && enemy.echoMove;
  if(!enemy || !echo) return;
  if(echo.t === "attack"){
    applyDamageWithFeedback(S.player, getMonsterIntentRawDamage(enemy, echo), enemy.weak);
  } else if(echo.t === "defend"){
    const value = getMonsterDefendValue(enemy, echo, enemy);
    grantEnemyBlock(enemy, value);
    spawnFloat('[data-id="'+enemy.id+'"]', '+'+value, 'blk');
  } else if(echo.t === "debuff"){
    if(echo.role === "anxiety") LIFE.addAnxiety(S.player, echo.v || 1);
    else if(echo.role === "counter") LIFE.addLethargy(S.player, echo.v || 1);
    else if(echo.role === "fracture") LIFE.addFracture(S.player, echo.v || 1);
    else LIFE.addWeak(S.player, echo.v || 1);
    spawnFloat('.player', '메아리', 'dmg');
  }
  enemy.echoMove = null;
}

function isCardTypeMatch(card, requirementType){
  if(!card) return false;
  if(requirementType === "attack") return card.type === "attack";
  if(requirementType === "nonAttack") return card.type !== "attack" && card.type !== "status";
  return card.type === requirementType;
}

function createHandLockToken(){
  S.nextHandLockToken = (S.nextHandLockToken || 1) + 1;
  return "hand_" + (S.nextHandLockToken - 1);
}

function ensureHandLockTokens(){
  if(!Array.isArray(S.handLockTokens)) S.handLockTokens = [];
  for(let i = 0; i < S.hand.length; i++){
    if(!S.handLockTokens[i]) S.handLockTokens[i] = createHandLockToken();
  }
  if(S.handLockTokens.length > S.hand.length) S.handLockTokens.length = S.hand.length;
}

function isHandCardLocked(handIndex, key){
  ensureHandLockTokens();
  const token = S.handLockTokens[handIndex];
  return (S.lockedHandCards || []).some(lock => lock.token === token && lock.key === key);
}

function applyPendingHandLock(){
  if(!S.pendingHandLock) return;
  ensureHandLockTokens();
  const candidates = S.hand
    .map((key, index) => ({ key, index, token:S.handLockTokens[index], card:CARD_DB[key] }))
    .filter(info => info.card && info.card.type !== "status" && !info.card.unplayable);
  if(!candidates.length){ S.pendingHandLock = 0; return; }
  candidates.sort((a,b) => ((b.card.cost || 0) - (a.card.cost || 0)) || (a.index - b.index));
  const picked = candidates[0];
  S.lockedHandCards = [{ key:picked.key, token:picked.token, name:picked.card.name, untilTurnEnd:true }];
  S.pendingHandLock = 0;
  toast(picked.card.name+" 잠금");
}

function getExamPhaseIndex(enemy){
  const gimmick = enemy.gimmick || {};
  const thresholds = gimmick.thresholds || [];
  let index = 0;
  thresholds.forEach((threshold, i) => {
    if(enemy.hp <= threshold) index = i + 1;
  });
  return index;
}

function nextChallengeForEnemy(enemy){
  const gimmick = enemy.gimmick || {};
  if(gimmick.type === "question"){
    const sequence = gimmick.sequence || ["attack", "nonAttack"];
    const index = getMonsterCounter(enemy, "questionIndex") % sequence.length;
    addMonsterCounter(enemy, "questionIndex", 1, 999);
    return { enemyId:enemy.id, enemyName:enemy.name, mode:"require", types:[sequence[index]], failStatusCards:[gimmick.failStatusCard || "regret"], counterId:gimmick.burstCounterId, maxStack:gimmick.maxStack };
  }
  if(gimmick.type === "exam"){
    const phaseIndex = getExamPhaseIndex(enemy);
    const sequence = (gimmick.sequences && gimmick.sequences[phaseIndex]) || [];
    const index = getMonsterCounter(enemy, "examIndex") % Math.max(1, sequence.length);
    addMonsterCounter(enemy, "examIndex", 1, 999);
    const rule = sequence[index] || sequence[0];
    return { enemyId:enemy.id, enemyName:enemy.name, mode:rule.mode, types:rule.types || ["attack"], failStatusCards:rule.failStatusCards || ["hesitation"] };
  }
  return null;
}

function applyPlayerTurnStartGimmicks(){
  S.turnChallenges = [];
  S.lockedHandCards = [];
  livingEnemies().forEach(enemy => {
    enemy.reflectionUsedThisPlayerTurn = false;
    enemy.hitThisPlayerTurn = false;
    const challenge = nextChallengeForEnemy(enemy);
    if(challenge){
      challenge.satisfied = false;
      challenge.failed = false;
      S.turnChallenges.push(challenge);
      toast(enemy.name+" 요구: "+challenge.types.join("+"));
    }
  });
  applyPendingHandLock();
}

function applyPlayerTurnEndGimmicks(){
  livingEnemies().forEach(enemy => {
    const gimmick = enemy.gimmick || {};
    if(gimmick.type === "attention" && gimmick.counterId){
      if(enemy.hitThisPlayerTurn) reduceMonsterCounter(enemy, gimmick.counterId, 1);
      else addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "resourceRule" && gimmick.counterId && S.energy > 0){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "attackRule" && gimmick.counterId && (S.attackCardsPlayedThisTurn || 0) >= (gimmick.threshold || 3)){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "discipline" && gimmick.counterId && (S.cardsPlayedThisTurn || 0) >= (gimmick.threshold || 4)){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "lap" && gimmick.counterId){
      const phaseIndex = enemy.phaseIndex || 0;
      const interruptThreshold = Array.isArray(gimmick.phaseThresholds)
        ? (gimmick.phaseThresholds[phaseIndex] ?? gimmick.interruptThreshold ?? 0)
        : (gimmick.interruptThreshold || 0);
      if((S.damageDealtThisTurn || 0) < interruptThreshold) return;
      reduceMonsterCounter(enemy, gimmick.counterId, 1);
    }
  });
  (S.turnChallenges || []).forEach(challenge => {
    let failed = false;
    if(challenge.mode === "require" || challenge.mode === "requireAll"){
      failed = !challenge.satisfied;
    }
    if(challenge.mode === "forbid"){
      failed = challenge.failed;
    }
    if(failed){
      (challenge.failStatusCards || []).forEach(cardKey => addStatusCardToDiscard(cardKey, 1));
      const enemy = livingEnemies().find(item => item.id === challenge.enemyId);
      if(enemy && challenge.counterId) addMonsterCounter(enemy, challenge.counterId, 1, challenge.maxStack);
    }
  });
  S.lockedHandCards = [];
}

function updateTurnChallengesForCard(card){
  (S.turnChallenges || []).forEach(challenge => {
    const matches = (challenge.types || []).filter(type => isCardTypeMatch(card, type));
    if(challenge.mode === "require"){
      if(matches.length > 0) challenge.satisfied = true;
    } else if(challenge.mode === "requireAll"){
      challenge.matchedTypes = challenge.matchedTypes || {};
      matches.forEach(type => { challenge.matchedTypes[type] = true; });
      challenge.satisfied = (challenge.types || []).every(type => challenge.matchedTypes[type]);
    } else if(challenge.mode === "forbid"){
      if(matches.length > 0) challenge.failed = true;
    }
  });
}

function getActiveChallengeForEnemy(enemy){
  if(!enemy || !Array.isArray(S.turnChallenges)) return null;
  return S.turnChallenges.find(challenge => challenge.enemyId === enemy.id) || null;
}

function challengeLabel(challenge){
  if(!challenge) return "문항";
  const typeLabel = (challenge.types || []).map(type => type === "attack" ? "공격" : type === "nonAttack" ? "비공격" : type).join("+");
  if(challenge.mode === "forbid") return "금지 "+typeLabel;
  return "요구 "+typeLabel;
}

function applyEnemyMoveAfterAction(enemy, move){
  if(!enemy || !move) return;
  if(move.afterActionCounter && move.afterActionCounter.id){
    const op = move.afterActionCounter.op || "add";
    updateMonsterCounter(enemy, move.afterActionCounter.id, op, move.afterActionCounter.v || 1, { min:0, max:enemy.gimmick && enemy.gimmick.maxStack });
  }
  if(enemy.gimmick && enemy.gimmick.type === "scaling" && enemy.gimmick.afterActionAdd && enemy.gimmick.counterId){
    addMonsterCounter(enemy, enemy.gimmick.counterId, enemy.gimmick.afterActionAdd, enemy.gimmick.maxStack);
  }
  if(enemy.gimmick && enemy.gimmick.type === "lap" && enemy.gimmick.counterId){
    addMonsterCounter(enemy, enemy.gimmick.counterId, 1, enemy.gimmick.maxStack);
  }
  if(move.t === "lock") S.pendingHandLock = Math.max(S.pendingHandLock || 0, move.v || 1);
  if(move.t === "drawPenalty") S.pendingDrawPenalty = Math.max(S.pendingDrawPenalty || 0, move.v || 1);
  if(enemy.gimmick && enemy.gimmick.type === "echo" && ["attack", "defend", "debuff"].includes(move.t)){
    const ratio = enemy.gimmick.ratio || 0.5;
    const minValue = enemy.gimmick.minValue || 1;
    const echoValue = Math.max(minValue, Math.floor((move.v || 0) * ratio));
    enemy.echoMove = { ...move, v:echoValue };
    if(enemy.gimmick.repeatStatusCard === false) delete enemy.echoMove.statusCard;
  }
}

if(typeof window !== "undefined"){
  window.countStatusCards = countStatusCards;
  window.getMonsterIntentRawDamage = getMonsterIntentRawDamage;
  window.previewMonsterFinalDamage = previewMonsterFinalDamage;
  window.getPlannedMonsterSupportTarget = getPlannedMonsterSupportTarget;
  window.getMonsterDefendValue = getMonsterDefendValue;
  window.getMonsterIntentStatusCardKey = getMonsterIntentStatusCardKey;
}
