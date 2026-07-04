"use strict";
/* ACT1 법구 데이터 12종 */
const RELIC_MASTER_DB = [
  {
    "id": "bronze_incense_burner",
    "dataId": "RE001",
    "name": "청동 향로",
    "emoji": "🪔",
    "deck": "범용",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleStart",
    "target": "self",
    "desc": "첫 턴 주문을 1장 추가로 뽑습니다.\n은은한 향이 흔들리는 마음을 차분히 가라앉힌다.",
    "effectText": "첫 턴 주문을 1장 추가로 뽑습니다.",
    "valueText": "첫 턴 드로우 +1",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "draw",
        "v": 1,
        "timing": "battleStart"
      }
    ]
  },
  {
    "id": "ghost_gate_mirror",
    "dataId": "RE002",
    "name": "귀문경",
    "emoji": "🪞",
    "deck": "범용",
    "rarity": "uncommon",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleEnd",
    "target": "self",
    "desc": "전투 종료 시 정신력을 5 회복합니다.\n거울은 귀신보다 먼저, 잊혀진 마음을 비춘다.",
    "effectText": "전투 종료 시 정신력을 5 회복합니다.",
    "valueText": "전투 종료 정신력 +5",
    "dropWeight": 35,
    "price": 150,
    "shopPrice": 150,
    "fx": [
      {
        "t": "heal",
        "v": 5,
        "timing": "battleEnd"
      }
    ]
  },
  {
    "id": "moon_spirit_tablet",
    "dataId": "RE003",
    "name": "월령패",
    "emoji": "🌙",
    "deck": "범용",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "firstAttack",
    "target": "self",
    "desc": "전투마다 처음 사용하는 공격 주문의 정화량이 3 증가합니다.\n달빛이 깃든 나무패. 첫 마음가짐을 더욱 또렷하게 만든다.",
    "effectText": "전투마다 처음 사용하는 공격 주문의 정화량이 3 증가합니다.",
    "valueText": "첫 공격 정화 +3",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "damagePlus",
        "v": 3,
        "timing": "firstAttack"
      }
    ]
  },
  {
    "id": "goblin_pouch",
    "dataId": "RE004",
    "name": "도깨비 주머니",
    "emoji": "👝",
    "deck": "범용",
    "rarity": "uncommon",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleStart",
    "target": "self",
    "desc": "전투 시작 시 무작위 약병을 1개 얻습니다.\n무엇이 들어있는지는 도깨비도 모른다. 다만 급할 때는 늘 도움이 된다.",
    "effectText": "전투 시작 시 무작위 약병을 1개 얻습니다.",
    "valueText": "무작위 약병 +1",
    "dropWeight": 35,
    "price": 150,
    "shopPrice": 150,
    "fx": [
      {
        "t": "gainRandomPotion",
        "v": 1,
        "timing": "battleStart"
      }
    ]
  },
  {
    "id": "demon_sealing_tablet",
    "dataId": "RE005",
    "name": "봉마패",
    "emoji": "🧿",
    "deck": "결계",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleStart",
    "target": "self",
    "desc": "전투 시작 시 마음의 결계를 8 얻습니다.\n봉인은 힘이 아니라, 흔들리지 않겠다는 의지에서 시작된다.",
    "effectText": "전투 시작 시 마음의 결계를 8 얻습니다.",
    "valueText": "전투 시작 결계 +8",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "block",
        "v": 8,
        "timing": "battleStart"
      }
    ]
  },
  {
    "id": "red_golden_rope",
    "dataId": "RE006",
    "name": "붉은 금줄",
    "emoji": "🔴",
    "deck": "결계",
    "rarity": "uncommon",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "onBlockGain",
    "target": "randomEnemy",
    "desc": "결계를 얻을 때마다 무작위 적의 미련을 1 정화합니다.\n병실 문턱에 걸린 금줄은 들어오는 한기도, 남은 미련도 함께 막아낸다.",
    "effectText": "결계를 얻을 때마다 무작위 적의 미련을 1 정화합니다.",
    "valueText": "결계 획득 시 무작위 정화 +1",
    "dropWeight": 35,
    "price": 150,
    "shopPrice": 150,
    "fx": [
      {
        "t": "damageRandomEnemy",
        "v": 1,
        "timing": "onBlockGain"
      }
    ]
  },
  {
    "id": "bronze_shield_mirror",
    "dataId": "RE007",
    "name": "청동 방패경",
    "emoji": "🛡️",
    "deck": "결계",
    "rarity": "rare",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "turnEnd",
    "target": "self",
    "desc": "턴 종료 시 결계의 절반이 다음 턴까지 유지됩니다.\n오래된 청동경은 공격을 비추지 않는다. 버티려는 마음만을 되비춘다.",
    "effectText": "턴 종료 시 결계의 절반이 다음 턴까지 유지됩니다.",
    "valueText": "턴 종료 결계 50% 유지",
    "dropWeight": 10,
    "price": 220,
    "shopPrice": 220,
    "fx": [
      {
        "t": "retainBlockRatio",
        "v": 0.5,
        "timing": "turnEnd"
      }
    ]
  },
  {
    "id": "spirit_thread_doll",
    "dataId": "RE008",
    "name": "혼령매듭 인형",
    "emoji": "🧸",
    "deck": "동요",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "onAgitationApply",
    "target": "self",
    "desc": "동요를 부여하면 턴당 1회 주문을 1장 뽑습니다.\n붉은 실로 묶인 작은 인형. 흔들린 마음의 끝을 따라간다.",
    "effectText": "동요를 부여하면 턴당 1회 주문을 1장 뽑습니다.",
    "valueText": "턴당 1회, 동요 부여 시 드로우 +1",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "draw",
        "v": 1,
        "timing": "onAgitationApply",
        "oncePerTurn": true
      }
    ]
  },
  {
    "id": "soul_return_mirror",
    "dataId": "RE009",
    "name": "회혼경",
    "emoji": "🪞",
    "deck": "동요",
    "rarity": "uncommon",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "damageModifier",
    "target": "enemy",
    "desc": "동요 상태의 적에게 주는 정화량이 2 증가합니다.\n거울은 떠나지 못한 마음을 되돌려, 마침내 바라보게 만든다.",
    "effectText": "동요 상태의 적에게 주는 정화량이 2 증가합니다.",
    "valueText": "동요 대상 정화 +2",
    "dropWeight": 35,
    "price": 150,
    "shopPrice": 150,
    "fx": [
      {
        "t": "damagePlusVsAgitated",
        "v": 2,
        "timing": "damageModifier"
      }
    ]
  },
  {
    "id": "echoing_wind_chime",
    "dataId": "RE010",
    "name": "울림 풍경",
    "emoji": "🎐",
    "deck": "동요",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleStart",
    "target": "frontEnemy",
    "desc": "전투 시작 시 가장 앞의 적에게 동요를 2 부여합니다.\n맑은 소리는 귀신을 놀라게 하지 않는다. 다만 잊은 마음을 흔든다.",
    "effectText": "전투 시작 시 가장 앞의 적에게 동요를 2 부여합니다.",
    "valueText": "선두 적 동요 +2",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "applyAgitation",
        "v": 2,
        "timing": "battleStart",
        "target": "frontEnemy"
      }
    ]
  },
  {
    "id": "lotus_lamp",
    "dataId": "RE011",
    "name": "연화 등잔",
    "emoji": "🪷",
    "deck": "성불",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "onMarkApply",
    "target": "enemy",
    "desc": "성불 표식을 부여할 때 1 추가로 부여합니다.\n연꽃 모양 등잔이 길을 비추면, 남은 미련도 조금씩 길을 찾는다.",
    "effectText": "성불 표식을 부여할 때 1 추가로 부여합니다.",
    "valueText": "표식 부여량 +1",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "markBonus",
        "v": 1,
        "timing": "onMarkApply"
      }
    ]
  },
  {
    "id": "bronze_wooden_fish",
    "dataId": "RE012",
    "name": "청동 목탁",
    "emoji": "🪵",
    "deck": "성불",
    "rarity": "uncommon",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "damageModifier",
    "target": "enemy",
    "desc": "성불 표식이 있는 적에게 주는 정화량이 2 증가합니다.\n낮은 울림은 병실에 남은 미련을 천천히 가라앉힌다.",
    "effectText": "성불 표식이 있는 적에게 주는 정화량이 2 증가합니다.",
    "valueText": "표식 대상 정화 +2",
    "dropWeight": 35,
    "price": 150,
    "shopPrice": 150,
    "fx": [
      {
        "t": "damagePlusVsMarked",
        "v": 2,
        "timing": "damageModifier"
      }
    ]
  },
  {
    "id": "thunder_spirit_bell",
    "dataId": "RE013",
    "name": "뇌령방울",
    "emoji": "🔔",
    "deck": "범용",
    "rarity": "rare",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "damageModifier",
    "target": "enemy",
    "desc": "공격 주문의 정화량이 1 증가합니다.\n먼 천둥을 머금은 작은 방울. 흔들릴 때마다 망설임을 깨웁니다.",
    "effectText": "공격 주문의 정화량이 1 증가합니다.",
    "valueText": "공격 정화 +1",
    "dropWeight": 10,
    "price": 220,
    "shopPrice": 220,
    "fx": [
      {
        "t": "damagePlus",
        "v": 1,
        "timing": "damageModifier"
      }
    ]
  },
  {
    "id": "lotus_seed_bead",
    "dataId": "RE014",
    "name": "연씨 염주",
    "emoji": "📿",
    "deck": "성불",
    "rarity": "common",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "battleStart",
    "target": "frontEnemy",
    "desc": "전투 시작 시 가장 앞의 적에게 성불 표식을 1 부여합니다.\n아직 꽃피지 않은 씨앗을 꿰어 만든 염주. 첫 기도에 길이 열린다.",
    "effectText": "전투 시작 시 가장 앞의 적에게 성불 표식을 1 부여합니다.",
    "valueText": "선두 적 성불 표식 +1",
    "dropWeight": 55,
    "price": 120,
    "shopPrice": 120,
    "fx": [
      {
        "t": "applyMark",
        "v": 1,
        "timing": "battleStart",
        "target": "frontEnemy"
      }
    ]
  },
  {
    "id": "lizard_tail_charm",
    "dataId": "RE015",
    "name": "도마뱀 꼬리 부적",
    "emoji": "🦎",
    "deck": "범용",
    "rarity": "rare",
    "obtainFrom": [
      "elite",
      "shop",
      "event"
    ],
    "trigger": "fatalDamage",
    "target": "self",
    "desc": "쓰러질 때 이 법구를 소모하고 최대 정신력의 50%를 회복합니다.\n잘려도 다시 꿈틀대는 마지막 집념. 한 번만 죽음을 미룹니다.",
    "effectText": "쓰러질 때 이 법구를 소모하고 최대 정신력의 50%를 회복합니다.",
    "valueText": "1회 부활: 최대 정신력 50%",
    "dropWeight": 10,
    "price": 220,
    "shopPrice": 220,
    "fx": [
      {
        "t": "revive",
        "v": 0.5,
        "timing": "fatalDamage",
        "consume": true
      }
    ]
  },
  {
    "id": "sealed_talisman",
    "dataId": "RE016",
    "name": "봉인 부적",
    "emoji": "📿",
    "deck": "은혜",
    "rarity": "blessing",
    "obtainFrom": [],
    "trigger": "none",
    "target": "self",
    "desc": "희귀 부적 주문 1장을 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.",
    "effectText": "희귀 부적 주문 1장을 얻습니다.",
    "valueText": "신령의 은혜: 희귀 주문 획득",
    "dropWeight": 0,
    "price": 0,
    "shopPrice": 0,
    "fx": []
  },
  {
    "id": "red_thread",
    "dataId": "RE017",
    "name": "붉은 실 매듭",
    "emoji": "🪢",
    "deck": "은혜",
    "rarity": "blessing",
    "obtainFrom": [],
    "trigger": "none",
    "target": "self",
    "desc": "기본 주문 1장을 제거합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.",
    "effectText": "기본 주문 1장을 제거합니다.",
    "valueText": "신령의 은혜: 기본 주문 제거",
    "dropWeight": 0,
    "price": 0,
    "shopPrice": 0,
    "fx": []
  },
  {
    "id": "clear_bell",
    "dataId": "RE018",
    "name": "맑은 방울",
    "emoji": "🔔",
    "deck": "은혜",
    "rarity": "blessing",
    "obtainFrom": [],
    "trigger": "none",
    "target": "self",
    "desc": "첫 전투 시작 시 결계 8을 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.",
    "effectText": "첫 전투 시작 시 결계 8을 얻습니다.",
    "valueText": "신령의 은혜: 첫 전투 결계 +8",
    "dropWeight": 0,
    "price": 0,
    "shopPrice": 0,
    "fx": []
  }
];

/* =========================================================================
   equipment.js 공식 런타임 DB 변환부
   - RELIC_MASTER_DB: 기획 원본 데이터
   - RELIC_DB: 기존 전투/상점/가방 코드가 바로 사용할 수 있는 호환 데이터
   ========================================================================= */

/**
 * 기획 원본 법구 데이터를 기존 런타임 코드가 기대하는 형태로 변환합니다.
 * 기존 코드가 relic.attr / relic.price / relic.desc / relic.fx 를 참조하므로
 * deck, shopPrice, effectText 등을 호환 필드로 보강합니다.
 */
function normalizeRelicForRuntime(item) {
  const fx = Array.isArray(item.fx) ? item.fx.map(effect => {
    if (!effect) return effect;
    if (effect.t === "markBonus") {
      return { ...effect, t: "markPlus" };
    }
    if (effect.timing === "damageModifier") {
      return { ...effect, timing: "damage" };
    }
    return { ...effect };
  }) : [];

  return {
    ...item,
    attr: item.attr || item.deck || "범용",
    price: item.shopPrice || item.price || 0,
    desc: item.desc || item.effectText || item.valueText || "",
    fx,
    masterData: item
  };
}

var RELIC_DB = RELIC_MASTER_DB.map(normalizeRelicForRuntime);

const RELIC_DROP_RATE = { common: 55, uncommon: 35, rare: 10 };
function getRandomRelic(rng = Math.random, source = null, ownedIds = []) {
  const ownedSet = new Set(Array.isArray(ownedIds) ? ownedIds : []);
  const list = Array.isArray(RELIC_DB)
    ? RELIC_DB.filter(item => {
        if (!item || ownedSet.has(item.id)) return false;
        if (!source) return true;
        return Array.isArray(item.obtainFrom) && item.obtainFrom.includes(source);
      })
    : [];
  const total = list.reduce((sum, item) => sum + (item.dropWeight || 1), 0);
  if (total <= 0) return list[0] ? { ...list[0] } : null;
  let roll = rng() * total;
  for (const item of list) {
    roll -= (item.dropWeight || 1);
    if (roll <= 0) return { ...item };
  }
  return list[0] ? { ...list[0] } : null;
}

window.RELIC_MASTER_DB = RELIC_MASTER_DB;
window.RELIC_DB = RELIC_DB;
window.RELIC_DROP_RATE = RELIC_DROP_RATE;
window.getRandomRelic = getRandomRelic;
