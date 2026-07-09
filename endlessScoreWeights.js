"use strict";
/* =========================================================================
   Endless Journey Score Weights
   - This file only owns the per-depth score weight table used by the
     endless-mode scoring formula:
       최종 점수 = ACT1 원점수(x1.00) + Σ(각 심도에서 새로 획득한 원점수 × 해당 심도 가중치)
   - Weights are looked up by depth level (1~20). ACT1 (depth 0) always
     uses a fixed x1.00 multiplier and is not part of this table.
   - Consumed by battleRunState.js (recomputeRunScoreTotal) and by
     runResult.js / runResultData.js's fallback estimators.
   - 2026-07 밸런스 재조정: endlessJourneyData.js의 심도 디버프 완화(C안)와
     짝을 맞춰 재산정한 값. 초반(1~8)은 기존 설계보다 완만하게, 후반(11~20)은
     실측 난이도 곡선(보스전 패배율 급등 구간)에 맞춰 더 가파르게 올린다.
   ========================================================================= */

const ENDLESS_SCORE_WEIGHTS = [
  { level: 1, weight: 1.04 },
  { level: 2, weight: 1.06 },
  { level: 3, weight: 1.09 },
  { level: 4, weight: 1.12 },
  { level: 5, weight: 1.15 },
  { level: 6, weight: 1.18 },
  { level: 7, weight: 1.20 },
  { level: 8, weight: 1.24 },
  { level: 9, weight: 1.27 },
  { level: 10, weight: 1.31 },
  { level: 11, weight: 1.36 },
  { level: 12, weight: 1.41 },
  { level: 13, weight: 1.46 },
  { level: 14, weight: 1.51 },
  { level: 15, weight: 1.57 },
  { level: 16, weight: 1.62 },
  { level: 17, weight: 1.68 },
  { level: 18, weight: 1.75 },
  { level: 19, weight: 1.83 },
  { level: 20, weight: 1.95 }
];

const ENDLESS_SCORE_ACT1_WEIGHT = 1.00;

function getEndlessScoreWeightForLevel(level){
  const numericLevel = Number(level);
  if(!Number.isFinite(numericLevel) || numericLevel <= 0) return ENDLESS_SCORE_ACT1_WEIGHT;
  const entry = ENDLESS_SCORE_WEIGHTS.find(w => w.level === numericLevel);
  return entry ? entry.weight : ENDLESS_SCORE_ACT1_WEIGHT;
}

window.ENDLESS_SCORE_WEIGHTS = ENDLESS_SCORE_WEIGHTS;
window.ENDLESS_SCORE_ACT1_WEIGHT = ENDLESS_SCORE_ACT1_WEIGHT;
window.getEndlessScoreWeightForLevel = getEndlessScoreWeightForLevel;
