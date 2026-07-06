"use strict";

window.BOHYUN_BALANCE = {
  startGold: 100,
  act1MonsterPackageOverrides: {
    HN01: {
      nurse_spirit: { maxHp: 20, moves: { 0: { v: 6 }, 1: { v: 6 }, 2: { v: 9 } } },
      patient_spirit_waiting: { maxHp: 19, moves: { 1: { v: 6 }, 2: { v: 7, conditionalDamage: { v: 9 } } } }
    },
    HN02: {
      child_spirit_underbed: { maxHp: 16, moves: { 0: { v: 5 }, 1: { v: 5 }, 2: { v: 3 }, 3: { v: 8 } } },
      nurse_spirit: { maxHp: 19, moves: { 0: { v: 8 }, 1: { v: 7 }, 2: { v: 11 } } }
    },
    HN03: {
      nurse_spirit_lamp: { maxHp: 20, moves: { 0: { v: 4 }, 1: { v: 7 }, 2: { v: 11 } } },
      patient_spirit_waiting: { maxHp: 23, moves: { 1: { v: 7 }, 2: { v: 10, conditionalDamage: { v: 12 } } } }
    },
    HN04: {
      visitor_spirit_flower: { maxHp: 22, moves: { 1: { v: 6 }, 2: { v: 9 } } },
      nurse_spirit: { maxHp: 23, moves: { 0: { v: 8 }, 1: { v: 7 }, 2: { v: 11 } } }
    },
    HN05: {
      child_spirit_underbed: { maxHp: 16, moves: { 0: { v: 6 }, 1: { v: 3 }, 2: { v: 4 }, 3: { v: 6 } } },
      nurse_spirit_lamp: { maxHp: 16, moves: { 0: { v: 5 }, 1: { v: 5 }, 2: { v: 7 } } },
      nurse_spirit: { maxHp: 19, moves: { 0: { v: 6 }, 1: { v: 5 }, 2: { v: 8 } } }
    },
    HN06: {
      grandmother_spirit_visit: { maxHp: 18, moves: { 1: { v: 4 }, 3: { v: 7, counterDamage: { per: 1 } } } },
      patient_spirit_waiting: { maxHp: 18, moves: { 1: { v: 5 }, 2: { v: 6, conditionalDamage: { v: 8 } } } },
      nurse_spirit: { maxHp: 19, moves: { 0: { v: 6 }, 1: { v: 5 }, 2: { v: 8 } } }
    },
    HN07: {
      nurse_spirit_lamp: { maxHp: 16, moves: { 0: { v: 5 }, 1: { v: 5 }, 2: { v: 7 } } },
      visitor_spirit_flower: { maxHp: 17, moves: { 1: { v: 4 }, 2: { v: 6 } } },
      nurse_spirit: { maxHp: 18, moves: { 0: { v: 6 }, 1: { v: 5 }, 2: { v: 8 } } }
    },
    HN08: {
      child_spirit_underbed: { maxHp: 16, moves: { 0: { v: 7 }, 1: { v: 3 }, 2: { v: 5 }, 3: { v: 5 } } },
      grandmother_spirit_visit: { maxHp: 18, moves: { 1: { v: 3 }, 3: { v: 6, counterDamage: { per: 1 } } } },
      patient_spirit_waiting: { maxHp: 18, moves: { 1: { v: 4 }, 2: { v: 5, conditionalDamage: { v: 7 } } } },
      nurse_spirit: { maxHp: 18, moves: { 0: { v: 5 }, 1: { v: 4 }, 2: { v: 7 } } }
    },
    HN09: {
      child_spirit_underbed: { maxHp: 15, moves: { 0: { v: 7 }, 1: { v: 3 }, 2: { v: 5 }, 3: { v: 5 } } },
      nurse_spirit_lamp: { maxHp: 15, moves: { 0: { v: 6 }, 1: { v: 4 }, 2: { v: 6 } } },
      visitor_spirit_flower: { maxHp: 17, moves: { 1: { v: 3 }, 2: { v: 5 } } },
      nurse_spirit: { maxHp: 18, moves: { 0: { v: 5 }, 1: { v: 4 }, 2: { v: 7 } } }
    },
    HE02: {
      doctor_spirit: { maxHp: 72, moves: { 0: { v: 8 }, 2: { v: 20, statusCardDamage: { per: 3, maxBonus: 8 } }, 3: { v: 12 } } }
    },
    HE04: {
      mother_spirit: { maxHp: 45, gimmick: { burstDamage: 16 }, moves: { 0: { v: 9 }, 2: { v: 10 } } },
      visitor_spirit_flower: { maxHp: 45, moves: { 1: { v: 5 }, 2: { v: 8 } } }
    },
    HE05: {
      doctor_spirit: { maxHp: 47, moves: { 0: { v: 6 }, 2: { v: 15, statusCardDamage: { per: 2 } }, 3: { v: 9 } } },
      patient_spirit_waiting: { maxHp: 44, moves: { 1: { v: 6 }, 2: { v: 8, conditionalDamage: { v: 10 } } } }
    },
    HE06: {
      surgery_light_spirit: { maxHp: 44, moves: { 1: { v: 10 }, 3: { v: 17 } } },
      nurse_spirit_lamp: { maxHp: 41, moves: { 0: { v: 5 }, 1: { v: 6 }, 2: { v: 9 } } }
    },
    HE08: {
      doctor_spirit: { maxHp: 57, moves: { 0: { v: 5 }, 2: { v: 11, statusCardDamage: { per: 2, maxBonus: 5 } }, 3: { v: 7 } } },
      surgery_light_spirit: { maxHp: 52, moves: { 1: { v: 8 }, 3: { v: 13 } } }
    },
    HB01: {
      ward_wraith: {
        maxHp: 140,
        moves: { 1: { v: 9 } },
        phaseConfig: {
          thresholds: [97, 55],
          phases: {
            0: { moves: { 1: { v: 9 } } },
            1: { moves: { 0: { v: 13 } } },
            2: { moves: { 0: { v: 17, summonDamage: { per: 1.5 } }, 1: { v: 9, summonDamage: { per: 2 } } } }
          }
        }
      },
      empty_bed_shadow: { maxHp: 12, moves: { 0: { v: 4 } } }
    }
  },
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
