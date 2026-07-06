"use strict";

window.BOHYUN_BALANCE = {
  startGold: 100,
  battleGold: {
    enemy: { amount: 20, min: 15, max: 25 },
    elite: { amount: 45, min: 35, max: 50 },
    boss: { amount: 100, min: 80, max: 120 }
  },
  shopCardPriceByRarity: {
    common: 60,
    uncommon: 90,
    rare: 120
  },
  shopDefaultCardPrice: 60,
  eventRelicFallbackGold: 70,
  rewardRarityWeights: {
    default: { common: 60, uncommon: 30, rare: 10 },
    battle: { common: 60, uncommon: 30, rare: 10 },
    enemy: { common: 60, uncommon: 30, rare: 10 },
    normal: { common: 60, uncommon: 30, rare: 10 },
    event: { common: 60, uncommon: 30, rare: 10 },
    shop: { common: 60, uncommon: 30, rare: 10 },
    blessing: { common: 60, uncommon: 30, rare: 10 },
    prayer: { common: 60, uncommon: 30, rare: 10 },
    elite: { common: 45, uncommon: 35, rare: 20 }
  }
};
