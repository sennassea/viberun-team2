"use strict";
/* =========================================================================
   Endless Journey Data
   - This file only owns endless journey debuff data.
   - Debuffs are applied through endlessJourneyEffects.js.
   ========================================================================= */

// 임시 밸런스 수치: 추후 기획 이미지/시트 기준으로 name, desc, value를 교체한다.
const ENDLESS_JOURNEY_DEBUFFS = [
  { id: "endless_enemy_damage_1", level: 1, name: "요괴의 기세 I", desc: "모든 적의 피해량이 증가합니다.", effectType: "enemyDamageMultiplier", value: 0.05 },
  { id: "endless_enemy_hp_2", level: 2, name: "질긴 원념 I", desc: "모든 적의 최대 체력이 증가합니다.", effectType: "enemyHpMultiplier", value: 0.05 },
  { id: "endless_player_heal_3", level: 3, name: "흐려진 축원 I", desc: "플레이어가 받는 회복량이 감소합니다.", effectType: "playerHealMultiplier", value: -0.05 },
  { id: "endless_enemy_block_4", level: 4, name: "굳은 집착 I", desc: "적이 얻는 방어량이 증가합니다.", effectType: "enemyBlockMultiplier", value: 0.05 },
  { id: "endless_shop_price_5", level: 5, name: "비싼 공물 I", desc: "상점 가격이 증가합니다.", effectType: "shopPriceMultiplier", value: 0.05 },
  { id: "endless_enemy_damage_6", level: 6, name: "요괴의 기세 II", desc: "모든 적의 피해량이 추가로 증가합니다.", effectType: "enemyDamageMultiplier", value: 0.07 },
  { id: "endless_enemy_hp_7", level: 7, name: "질긴 원념 II", desc: "모든 적의 최대 체력이 추가로 증가합니다.", effectType: "enemyHpMultiplier", value: 0.07 },
  { id: "endless_reward_gold_8", level: 8, name: "마른 복채 I", desc: "전투 보상 금화가 감소합니다.", effectType: "battleGoldMultiplier", value: -0.05 },
  { id: "endless_start_block_9", level: 9, name: "무거운 첫걸음 I", desc: "전투 시작 시 얻는 방어 효과가 감소합니다.", effectType: "playerStartBlockMultiplier", value: -0.05 },
  { id: "endless_elite_damage_10", level: 10, name: "정예의 살기 I", desc: "정예 적의 피해량이 증가합니다.", effectType: "eliteDamageMultiplier", value: 0.08 },
  { id: "endless_enemy_damage_11", level: 11, name: "요괴의 기세 III", desc: "모든 적의 피해량이 추가로 증가합니다.", effectType: "enemyDamageMultiplier", value: 0.08 },
  { id: "endless_enemy_hp_12", level: 12, name: "질긴 원념 III", desc: "모든 적의 최대 체력이 추가로 증가합니다.", effectType: "enemyHpMultiplier", value: 0.08 },
  { id: "endless_player_heal_13", level: 13, name: "흐려진 축원 II", desc: "플레이어가 받는 회복량이 추가로 감소합니다.", effectType: "playerHealMultiplier", value: -0.07 },
  { id: "endless_card_reward_14", level: 14, name: "희미한 인연 I", desc: "카드 보상 선택지가 감소할 수 있습니다.", effectType: "cardRewardChoiceDelta", value: -1 },
  { id: "endless_boss_hp_15", level: 15, name: "보스의 원한 I", desc: "보스의 최대 체력이 증가합니다.", effectType: "bossHpMultiplier", value: 0.10 },
  { id: "endless_enemy_damage_16", level: 16, name: "요괴의 기세 IV", desc: "모든 적의 피해량이 추가로 증가합니다.", effectType: "enemyDamageMultiplier", value: 0.10 },
  { id: "endless_enemy_hp_17", level: 17, name: "질긴 원념 IV", desc: "모든 적의 최대 체력이 추가로 증가합니다.", effectType: "enemyHpMultiplier", value: 0.10 },
  { id: "endless_shop_price_18", level: 18, name: "비싼 공물 II", desc: "상점 가격이 추가로 증가합니다.", effectType: "shopPriceMultiplier", value: 0.08 },
  { id: "endless_reward_gold_19", level: 19, name: "마른 복채 II", desc: "전투 보상 금화가 추가로 감소합니다.", effectType: "battleGoldMultiplier", value: -0.08 },
  { id: "endless_boss_damage_20", level: 20, name: "보스의 원한 II", desc: "보스의 피해량이 증가합니다.", effectType: "bossDamageMultiplier", value: 0.12 }
];

window.ENDLESS_JOURNEY_DEBUFFS = ENDLESS_JOURNEY_DEBUFFS;
