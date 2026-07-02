"use strict";
/* ACT1 약병 데이터 8종 */
const POTION_SLOT_LIMIT = 3;
const POTION_DB = [
  {
    "id": "cheongsim_pill",
    "dataId": "IT001",
    "name": "청심환",
    "emoji": "🔴",
    "category": "회복",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "정신력을 18 회복합니다.\n불안한 마음을 가라앉히는 작은 환약. 병동에서 가장 흔히 쓰인다.",
    "effectText": "정신력을 18 회복합니다.",
    "valueText": "정신력 회복 +18",
    "dropWeight": 55,
    "price": 35,
    "shopPrice": 35,
    "fx": [
      {
        "t": "heal",
        "v": 18
      }
    ]
  },
  {
    "id": "focus_talisman",
    "dataId": "IT002",
    "name": "집중부",
    "emoji": "🧧",
    "category": "신통력",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "이번 턴 신통력을 1 회복합니다.\n한 글자만 또렷이 붙잡아도, 흐트러진 마음은 다시 모인다.",
    "effectText": "이번 턴 신통력을 1 회복합니다.",
    "valueText": "이번 턴 신통력 +1",
    "dropWeight": 55,
    "price": 30,
    "shopPrice": 30,
    "fx": [
      {
        "t": "energy",
        "v": 1
      }
    ]
  },
  {
    "id": "protective_talisman",
    "dataId": "IT003",
    "name": "호신부",
    "emoji": "🧿",
    "category": "결계",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "마음의 결계를 12 얻습니다.\n품 안에 접어둔 작은 부적 하나가 마음의 틈을 막아준다.",
    "effectText": "마음의 결계를 12 얻습니다.",
    "valueText": "결계 +12",
    "dropWeight": 55,
    "price": 35,
    "shopPrice": 35,
    "fx": [
      {
        "t": "block",
        "v": 12
      }
    ]
  },
  {
    "id": "five_direction_water",
    "dataId": "IT004",
    "name": "오방수",
    "emoji": "💧",
    "category": "결계",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "마음의 결계를 8 얻고 동요를 1 제거합니다.\n오방의 기운을 담은 맑은 물. 흔들린 마음을 제자리로 돌린다.",
    "effectText": "마음의 결계를 8 얻고 동요를 1 제거합니다.",
    "valueText": "결계 +8 / 동요 -1",
    "dropWeight": 55,
    "price": 40,
    "shopPrice": 40,
    "fx": [
      {
        "t": "block",
        "v": 8
      },
      {
        "t": "removeWeak",
        "v": 1
      }
    ]
  },
  {
    "id": "lotus_incense",
    "dataId": "IT005",
    "name": "연꽃 향",
    "emoji": "🪷",
    "category": "성불 표식",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "enemy",
    "desc": "대상에게 성불 표식을 3 부여합니다.\n연꽃 향이 피어오르면, 떠나지 못한 마음이 길을 알아본다.",
    "effectText": "대상에게 성불 표식을 3 부여합니다.",
    "valueText": "성불 표식 +3",
    "dropWeight": 55,
    "price": 40,
    "shopPrice": 40,
    "fx": [
      {
        "t": "applyMark",
        "v": 3
      }
    ]
  },
  {
    "id": "unsaid_letter",
    "dataId": "IT006",
    "name": "말하지 못한 편지",
    "emoji": "✉️",
    "category": "동요",
    "rarity": "common",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "enemy",
    "desc": "대상에게 동요를 3 부여합니다.\n끝내 전하지 못한 문장은, 읽는 순간 마음을 크게 흔든다.",
    "effectText": "대상에게 동요를 3 부여합니다.",
    "valueText": "동요 +3",
    "dropWeight": 55,
    "price": 40,
    "shopPrice": 40,
    "fx": [
      {
        "t": "applyWeak",
        "v": 3
      }
    ]
  },
  {
    "id": "spirit_eye_water",
    "dataId": "IT007",
    "name": "영안수",
    "emoji": "👁️",
    "category": "드로우",
    "rarity": "uncommon",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "카드를 3장 뽑습니다.\n잠시 보이지 않던 길을 보이게 해주는 맑은 물.",
    "effectText": "카드를 3장 뽑습니다.",
    "valueText": "드로우 +3",
    "dropWeight": 35,
    "price": 55,
    "shopPrice": 55,
    "fx": [
      {
        "t": "draw",
        "v": 3
      }
    ]
  },
  {
    "id": "ghost_gate_talisman",
    "dataId": "IT008",
    "name": "귀문부",
    "emoji": "🚪",
    "category": "특수",
    "rarity": "rare",
    "obtainFrom": [
      "battle",
      "shop",
      "event"
    ],
    "useTiming": "battle",
    "target": "self",
    "desc": "이번 턴 다음 공격 카드의 정화량이 2배가 됩니다.\n잠깐 열린 귀문 너머로, 미련을 단번에 씻어낼 힘이 흘러든다.",
    "effectText": "이번 턴 다음 공격 카드의 정화량이 2배가 됩니다.",
    "valueText": "다음 공격 정화량 x2",
    "dropWeight": 10,
    "price": 85,
    "shopPrice": 85,
    "fx": [
      {
        "t": "nextAttackDouble",
        "v": 2
      }
    ]
  }
];

const POTION_DROP_RATE = { common:55, uncommon:35, rare:10 };
function getRandomPotion(rng = Math.random){
  const list = Array.isArray(POTION_DB) ? POTION_DB : [];
  const total = list.reduce((sum, item) => sum + (item.dropWeight || 1), 0);
  let roll = rng() * total;
  for(const item of list){
    roll -= (item.dropWeight || 1);
    if(roll <= 0) return { ...item };
  }
  return list[0] ? { ...list[0] } : null;
}
function canAddPotion(currentPotions){
  return Array.isArray(currentPotions) && currentPotions.length < POTION_SLOT_LIMIT;
}
