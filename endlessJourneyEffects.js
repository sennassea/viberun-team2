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

function getEndlessDebuffValue(effectType){
  return getActiveEndlessJourneyDebuffs()
    .filter(debuff => debuff.effectType === effectType)
    .reduce((sum, debuff) => sum + (Number.isFinite(debuff.value) ? debuff.value : 0), 0);
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

function scaleEndlessEnemyDamage(enemy, value){
  const extraEffectTypes = [];
  if(isEndlessEliteContext(enemy)) extraEffectTypes.push("eliteDamageMultiplier");
  if(isEndlessBossContext(enemy)) extraEffectTypes.push("bossDamageMultiplier");
  return scaleEndlessNumber(value, "enemyDamageMultiplier", { extraEffectTypes });
}

function scaleEndlessEnemyMaxHp(enemy, value){
  const extraEffectTypes = [];
  if(isEndlessBossContext(enemy)) extraEffectTypes.push("bossHpMultiplier");
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

if(typeof window !== "undefined"){
  window.isEndlessJourneyActive = isEndlessJourneyActive;
  window.getActiveEndlessJourneyDebuffs = getActiveEndlessJourneyDebuffs;
  window.getEndlessDebuffValue = getEndlessDebuffValue;
  window.getEndlessMultiplier = getEndlessMultiplier;
  window.scaleEndlessNumber = scaleEndlessNumber;
  window.scaleEndlessEnemyDamage = scaleEndlessEnemyDamage;
  window.scaleEndlessEnemyMaxHp = scaleEndlessEnemyMaxHp;
  window.scaleEndlessEnemyBlock = scaleEndlessEnemyBlock;
  window.scaleEndlessPlayerHeal = scaleEndlessPlayerHeal;
  window.scaleEndlessBattleGold = scaleEndlessBattleGold;
  window.getEndlessCardRewardChoiceDelta = getEndlessCardRewardChoiceDelta;
  window.scaleEndlessShopPrice = scaleEndlessShopPrice;
  window.scaleEndlessPlayerStartBlock = scaleEndlessPlayerStartBlock;
}
