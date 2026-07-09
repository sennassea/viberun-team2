"use strict";
/* =========================================================================
   Endless Journey Effects
   - Applies ENDLESS_JOURNEY_DEBUFFS to runtime combat/reward/shop values.
   - Never mutates monster/card/relic/potion base data; only scales runtime
     numbers derived from that data.
   ========================================================================= */

function isEndlessJourneyActive(){
  const journey = (typeof S !== "undefined" && S && S.journey)
    ? S.journey
    : (typeof RUN_STATE !== "undefined" && RUN_STATE ? RUN_STATE.journey : null);
  if(!journey || journey.mode !== "endless") return false;
  if(typeof S !== "undefined" && S && S.tutorialMode) return false;
  return true;
}

function getActiveEndlessJourneyDebuffs(){
  if(!isEndlessJourneyActive()) return [];
  const journey = (typeof S !== "undefined" && S && S.journey) ? S.journey : RUN_STATE.journey;
  const ids = Array.isArray(journey.activeDebuffIds) ? journey.activeDebuffIds : [];
  const db = window.ENDLESS_JOURNEY_DEBUFFS || [];
  return ids
    .map(id => db.find(debuff => debuff && debuff.id === id))
    .filter(Boolean);
}

/* 심도 id 목록으로부터 실제 effects({effectType, value}) 배열을 평탄화한다.
   전투 컨텍스트(S.journey)에 묶이지 않아 맵 생성/여정 진입 시점처럼
   S가 아직 없는 상황에서도 동일하게 사용할 수 있다. */
function getEndlessJourneyEffectsForIds(ids){
  const db = window.ENDLESS_JOURNEY_DEBUFFS || [];
  const list = Array.isArray(ids) ? ids : [];
  const effects = [];
  list.forEach(id => {
    const debuff = db.find(d => d && d.id === id);
    if(debuff && Array.isArray(debuff.effects)){
      debuff.effects.forEach(effect => effects.push(effect));
    }
  });
  return effects;
}

function getActiveEndlessJourneyEffects(){
  if(!isEndlessJourneyActive()) return [];
  const journey = (typeof S !== "undefined" && S && S.journey) ? S.journey : RUN_STATE.journey;
  return getEndlessJourneyEffectsForIds(journey.activeDebuffIds);
}

function getEndlessDebuffValue(effectType){
  return getActiveEndlessJourneyEffects()
    .filter(effect => effect.effectType === effectType)
    .reduce((sum, effect) => sum + (Number.isFinite(effect.value) ? effect.value : 0), 0);
}

function getEndlessMultiplier(effectType, options = {}){
  let total = getEndlessDebuffValue(effectType);
  if(Array.isArray(options.extraEffectTypes)){
    options.extraEffectTypes.forEach(extraType => {
      total += getEndlessDebuffValue(extraType);
    });
  }
  return Math.max(0, 1 + total);
}

function scaleEndlessNumber(value, effectType, options = {}){
  const numeric = Number.isFinite(value) ? value : 0;
  if(numeric <= 0) return numeric;
  const multiplier = getEndlessMultiplier(effectType, options);
  return Math.max(0, Math.floor(numeric * multiplier));
}

function isEndlessEliteContext(enemy){
  if(enemy && enemy.grade === "elite") return true;
  return !!(typeof S !== "undefined" && S && S.battleNodeType === "elite");
}

function isEndlessBossContext(enemy){
  if(enemy && enemy.grade === "boss") return true;
  return !!(typeof S !== "undefined" && S && S.battleNodeType === "boss");
}

function isEndlessNormalContext(enemy){
  return !isEndlessEliteContext(enemy) && !isEndlessBossContext(enemy);
}

function scaleEndlessEnemyDamage(enemy, value){
  const extraEffectTypes = [];
  if(isEndlessEliteContext(enemy)) extraEffectTypes.push("eliteDamageMultiplier");
  if(isEndlessBossContext(enemy)) extraEffectTypes.push("bossDamageMultiplier");
  if(!extraEffectTypes.length) extraEffectTypes.push("normalDamageMultiplier");
  return scaleEndlessNumber(value, "enemyDamageMultiplier", { extraEffectTypes });
}

function scaleEndlessEnemyMaxHp(enemy, value){
  const extraEffectTypes = [];
  if(isEndlessEliteContext(enemy)) extraEffectTypes.push("eliteHpMultiplier");
  if(isEndlessBossContext(enemy)) extraEffectTypes.push("bossHpMultiplier");
  if(!extraEffectTypes.length) extraEffectTypes.push("normalHpMultiplier");
  return scaleEndlessNumber(value, "enemyHpMultiplier", { extraEffectTypes });
}

function scaleEndlessEnemyBlock(enemy, value){
  return scaleEndlessNumber(value, "enemyBlockMultiplier");
}

function scaleEndlessPlayerHeal(value){
  return scaleEndlessNumber(value, "playerHealMultiplier");
}

function scaleEndlessBattleGold(value){
  return scaleEndlessNumber(value, "battleGoldMultiplier");
}

function getEndlessCardRewardChoiceDelta(){
  return Math.round(getEndlessDebuffValue("cardRewardChoiceDelta"));
}

function scaleEndlessShopPrice(value){
  return scaleEndlessNumber(value, "shopPriceMultiplier");
}

function scaleEndlessPlayerStartBlock(value){
  return scaleEndlessNumber(value, "playerStartBlockMultiplier");
}

/* ── 엘리트 노드 가중치: 심도 2/16은 더하지 않고 곱한다 (x1.35 * x1.20) ── */
function getEndlessEliteNodeWeightMultiplierForIds(ids){
  return getEndlessJourneyEffectsForIds(ids)
    .filter(effect => effect.effectType === "eliteNodeWeightMultiplier")
    .reduce((mult, effect) => mult * (1 + (Number.isFinite(effect.value) ? effect.value : 0)), 1);
}

/* ── 보스 후 회복 비율: 심도 5/18은 합산하지 않고 가장 낮은(가혹한) 값을 채택한다 ── */
function getEndlessBossAfterHealRatioForIds(ids){
  const values = getEndlessJourneyEffectsForIds(ids)
    .filter(effect => effect.effectType === "bossAfterHealRatio")
    .map(effect => effect.value)
    .filter(value => Number.isFinite(value));
  if(!values.length) return 1;
  return Math.min(...values);
}

function getEndlessUnremovableIntrusiveThoughtCount(){
  const journey = (typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey)
    ? RUN_STATE.journey
    : (typeof S !== "undefined" && S && S.journey ? S.journey : null);
  return (journey && Number.isFinite(journey.unremovableIntrusiveThoughtCount))
    ? journey.unremovableIntrusiveThoughtCount
    : 0;
}

/* ── 심도 도달 시 1회만 적용되는 효과 (정신력 압박 / 잡념 침투) ──────────
   journey.activeDebuffIds에 새로 포함된 심도 중 아직 적용하지 않은 것만
   처리하고, journey.appliedOneShotDepthEffectIds에 기록해 중복 적용을
   막는다. S가 아직 없는 "여정 N 직접 시작" 흐름에서도 동작해야 하므로
   RUN_STATE를 직접 다룬다. */
function applyEndlessOneShotDepthEffects(journey){
  if(!journey || !Array.isArray(journey.activeDebuffIds)) return;
  if(!Array.isArray(journey.appliedOneShotDepthEffectIds)) journey.appliedOneShotDepthEffectIds = [];
  const db = window.ENDLESS_JOURNEY_DEBUFFS || [];

  journey.activeDebuffIds.forEach(id => {
    if(journey.appliedOneShotDepthEffectIds.indexOf(id) !== -1) return;
    const debuff = db.find(d => d && d.id === id);
    if(!debuff || !Array.isArray(debuff.effects)) return;

    let applied = false;
    debuff.effects.forEach(effect => {
      if(effect.effectType === "oneShotPlayerHpLossRatio"){
        applyEndlessMentalPressure(effect.value);
        applied = true;
      } else if(effect.effectType === "unremovableIntrusiveThoughtCount"){
        applyEndlessIntrusiveThoughtCurse(journey, effect.value);
        applied = true;
      }
    });
    if(applied) journey.appliedOneShotDepthEffectIds.push(id);
  });
}

function applyEndlessMentalPressure(ratio){
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  if(!run || !run.player || !Number.isFinite(ratio) || ratio <= 0) return;
  const loss = Math.round((run.player.hp || 0) * ratio);
  run.player.hp = Math.max(0, (run.player.hp || 0) - loss);
  if(typeof S !== "undefined" && S && S.player){
    S.player.hp = Math.max(0, Math.min(S.player.maxHp, run.player.hp));
  }
}

function applyEndlessIntrusiveThoughtCurse(journey, count){
  const n = Number.isFinite(count) ? count : 1;
  if(n <= 0) return;
  for(let i = 0; i < n; i++){
    if(typeof STARTER_DECK !== "undefined" && Array.isArray(STARTER_DECK)) STARTER_DECK.push("intrusive_thought");
  }
  journey.unremovableIntrusiveThoughtCount = (Number.isFinite(journey.unremovableIntrusiveThoughtCount) ? journey.unremovableIntrusiveThoughtCount : 0) + n;
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  if(run && typeof STARTER_DECK !== "undefined") run.deck = [...STARTER_DECK];
}

if(typeof window !== "undefined"){
  window.isEndlessJourneyActive = isEndlessJourneyActive;
  window.getActiveEndlessJourneyDebuffs = getActiveEndlessJourneyDebuffs;
  window.getEndlessJourneyEffectsForIds = getEndlessJourneyEffectsForIds;
  window.getActiveEndlessJourneyEffects = getActiveEndlessJourneyEffects;
  window.getEndlessDebuffValue = getEndlessDebuffValue;
  window.getEndlessMultiplier = getEndlessMultiplier;
  window.scaleEndlessNumber = scaleEndlessNumber;
  window.isEndlessEliteContext = isEndlessEliteContext;
  window.isEndlessBossContext = isEndlessBossContext;
  window.isEndlessNormalContext = isEndlessNormalContext;
  window.scaleEndlessEnemyDamage = scaleEndlessEnemyDamage;
  window.scaleEndlessEnemyMaxHp = scaleEndlessEnemyMaxHp;
  window.scaleEndlessEnemyBlock = scaleEndlessEnemyBlock;
  window.scaleEndlessPlayerHeal = scaleEndlessPlayerHeal;
  window.scaleEndlessBattleGold = scaleEndlessBattleGold;
  window.getEndlessCardRewardChoiceDelta = getEndlessCardRewardChoiceDelta;
  window.scaleEndlessShopPrice = scaleEndlessShopPrice;
  window.scaleEndlessPlayerStartBlock = scaleEndlessPlayerStartBlock;
  window.getEndlessEliteNodeWeightMultiplierForIds = getEndlessEliteNodeWeightMultiplierForIds;
  window.getEndlessBossAfterHealRatioForIds = getEndlessBossAfterHealRatioForIds;
  window.getEndlessUnremovableIntrusiveThoughtCount = getEndlessUnremovableIntrusiveThoughtCount;
  window.applyEndlessOneShotDepthEffects = applyEndlessOneShotDepthEffects;
}
