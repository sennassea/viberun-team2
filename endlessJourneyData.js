"use strict";
/* =========================================================================
   Endless Journey Data
   - This file only owns endless journey debuff data.
   - Debuffs are applied through endlessJourneyEffects.js.
   - Each debuff can carry multiple effects (e.g. "전체 몬스터 성장"
     raises both HP and damage), so effectType/value live in an
     `effects` array instead of a single flat field.
   ========================================================================= */

/* 2026-07 밸런스 재조정(C안):
   - 심도 1: 기존 "엘리트 노드 가중치 x1.35"를 심도 2로 옮기고, 몬스터 체력/피해
     증가형 "진입 각성" 디버프로 교체 (몬스터 밸런스 재조정 이후 재검증 결과,
     보스전 위험이 "전체 몬스터 성장" 계열 및 보스 전용 계열에 과도하게 쏠려
     있었음 - 심도 3/6/9/12/15/17/19, 11, 14 계수를 함께 완화했다).
   - 심도 2: 엘리트 노드 가중치 x1.35 (심도 1에서 이동).
   - 심도 3: 일반 몬스터 최종 피해 +10% (심도 2에서 이동, 내용 변경 없음). */
const ENDLESS_JOURNEY_DEBUFFS = [
  { id: "endless_depth_1", level: 1, name: "심도 진입 각성", desc: "모든 몬스터 최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_2", level: 2, name: "엘리트 출현 증가 I", desc: "엘리트 노드 가중치 x1.35",
    effects: [{ effectType: "eliteNodeWeightMultiplier", value: 0.35 }] },
  { id: "endless_depth_3", level: 3, name: "일반 몬스터 공격 강화", desc: "일반 몬스터 최종 피해 +10%",
    effects: [{ effectType: "normalDamageMultiplier", value: 0.10 }] },
  { id: "endless_depth_4", level: 4, name: "엘리트 공격 강화", desc: "엘리트 몬스터 최종 피해 +10%",
    effects: [{ effectType: "eliteDamageMultiplier", value: 0.10 }] },
  { id: "endless_depth_5", level: 5, name: "보스 후 회복 감소 I", desc: "보스 처치 후 잃은 정신력의 75%만 회복",
    effects: [{ effectType: "bossAfterHealRatio", value: 0.75 }] },
  { id: "endless_depth_6", level: 6, name: "전체 몬스터 성장 I", desc: "최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_7", level: 7, name: "일반 몬스터 체력 강화", desc: "일반 몬스터 최대 체력 +10%",
    effects: [{ effectType: "normalHpMultiplier", value: 0.10 }] },
  { id: "endless_depth_8", level: 8, name: "정신력 압박", desc: "최초 도달 시 현재 정신력 10% 감소",
    effects: [{ effectType: "oneShotPlayerHpLossRatio", value: 0.10 }] },
  { id: "endless_depth_9", level: 9, name: "전체 몬스터 성장 II", desc: "최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_10", level: 10, name: "엘리트 체력 강화", desc: "엘리트 몬스터 최대 체력 +10%",
    effects: [{ effectType: "eliteHpMultiplier", value: 0.10 }] },
  { id: "endless_depth_11", level: 11, name: "보스 공격 강화", desc: "보스 최종 피해 +6%",
    effects: [{ effectType: "bossDamageMultiplier", value: 0.06 }] },
  { id: "endless_depth_12", level: 12, name: "전체 몬스터 성장 III", desc: "최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_13", level: 13, name: "잡념 침투 I", desc: "제거 불가 잡념 1장 추가",
    effects: [{ effectType: "unremovableIntrusiveThoughtCount", value: 1 }] },
  { id: "endless_depth_14", level: 14, name: "보스 체력 강화", desc: "보스 최대 체력 +6%",
    effects: [{ effectType: "bossHpMultiplier", value: 0.06 }] },
  { id: "endless_depth_15", level: 15, name: "전체 몬스터 성장 IV", desc: "최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_16", level: 16, name: "엘리트 출현 증가 II", desc: "현재 엘리트 가중치 x1.20 추가",
    effects: [{ effectType: "eliteNodeWeightMultiplier", value: 0.20 }] },
  { id: "endless_depth_17", level: 17, name: "전체 몬스터 성장 V", desc: "최대 체력 +5%, 최종 피해 +3%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.05 }, { effectType: "enemyDamageMultiplier", value: 0.03 }] },
  { id: "endless_depth_18", level: 18, name: "보스 후 회복 감소 II", desc: "보스 처치 후 잃은 정신력의 50%만 회복",
    effects: [{ effectType: "bossAfterHealRatio", value: 0.50 }] },
  { id: "endless_depth_19", level: 19, name: "전체 몬스터 성장 VI", desc: "최대 체력 +4%, 최종 피해 +2%",
    effects: [{ effectType: "enemyHpMultiplier", value: 0.04 }, { effectType: "enemyDamageMultiplier", value: 0.02 }] },
  { id: "endless_depth_20", level: 20, name: "잡념 침투 II", desc: "제거 불가 잡념 1장 추가",
    effects: [{ effectType: "unremovableIntrusiveThoughtCount", value: 1 }] }
];

window.ENDLESS_JOURNEY_DEBUFFS = ENDLESS_JOURNEY_DEBUFFS;
