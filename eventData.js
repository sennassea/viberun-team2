(function () {
  "use strict";

  /**
   * ACT1 이벤트 DB
   *
   * - 이벤트 16종 전체 입력 완료.
   * - UI는 이 데이터를 읽어서 제목, 스토리, 선택지, 결과 칩을 자동 렌더링한다.
   * - 확률/수치는 ACT1_이벤트_세부기획서_밸런스조정안 기준으로 반영되었다.
   * - 스토리 문구는 임시 문구이며, 기획 확정 문구로 추후 교체 가능하다.
   * - effects에 쓰이는 모든 type은 eventNode.js에 핸들러가 연결되어 있다.
   */
  const EVENT_DB = [
    {
      id: "event_01_card_low_risk",
      title: "이벤트 1",
      type: "random",
      category: "reward",
      phaseTags: ["early", "mid"],
      weight: 10,
      story: [
        "조용한 복도 끝에서 희미한 기척이 느껴진다.",
        "작은 영혼이 당신을 바라보며 도움을 청한다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "아이의 이야기를 듣고 치료를 돕는다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주문 보상", chance: 65,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] },
            { kind: "negative", icon: "minus", text: "정신력 -10", chance: 35,
              effects: [{ type: "spirit", value: -10 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "기척을 살피고 주변을 조사한다.",
          outcomes: [
            { kind: "positive", icon: "coin", text: "골드 +35", chance: 55,
              effects: [{ type: "gold", value: 35 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 45,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "아무 일도 하지 않고 지나간다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_02_recovery_potion",
      title: "이벤트 2",
      type: "random",
      category: "reward",
      phaseTags: ["early"],
      weight: 10,
      story: [
        "작은 병실 앞에 놓인 약장이 은은한 빛을 낸다.",
        "몸을 추스르거나, 위험을 감수하고 약병을 챙길 수 있을 것 같다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "안전하게 몸과 마음을 추스른다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +10", chance: 100,
              effects: [{ type: "spirit", value: 10 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "약장 속 약병에 손을 뻗어본다.",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 약병 1개", chance: 70,
              effects: [{ type: "potionRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -8", chance: 30,
              effects: [{ type: "spirit", value: -8 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "약장 주변을 살펴 소액을 챙긴다.",
          outcomes: [
            { kind: "positive", icon: "coin", text: "골드 +30", chance: 100,
              effects: [{ type: "gold", value: 30 }] }
          ]
        }
      ]
    },
    {
      id: "event_03_reward_or_combat",
      title: "이벤트 3",
      type: "random",
      category: "reward",
      phaseTags: ["early", "mid"],
      weight: 8,
      story: [
        "복도 저편에서 인기척과 함께 낯선 그림자가 어른거린다.",
        "다가가면 무언가를 얻을 수 있지만, 위험이 함께할지도 모른다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "적극적으로 다가가 본다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주문 보상", chance: 55,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 45,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "주문 후보를 확인한 뒤 신중하게 고른다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주문 후보 확인 후 선택 또는 포기", chance: 100,
              effects: [{ type: "cardRewardOptional", count: 3 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "위험 없이 주변을 탐색한다.",
          outcomes: [
            { kind: "positive", icon: "coin", text: "골드 +30", chance: 65,
              effects: [{ type: "gold", value: 30 }] },
            { kind: "negative", icon: "minus", text: "정신력 -6", chance: 35,
              effects: [{ type: "spirit", value: -6 }] }
          ]
        }
      ]
    },
    {
      id: "event_04_gold_for_potion",
      title: "이벤트 4",
      type: "random",
      category: "trade",
      phaseTags: ["early", "mid", "late"],
      weight: 8,
      story: [
        "약사 옷을 입은 영혼이 좌판을 펼쳐 놓고 있다.",
        "골드를 내고 원하는 약을 고르거나, 운에 맡겨볼 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "골드를 내고 원하는 약병을 고른다.",
          outcomes: [
            { kind: "neutral", icon: "potion", text: "골드 -45 / 이벤트 약병 2개 중 1개 선택", chance: 100,
              effects: [
                { type: "gold", value: -45 },
                { type: "potionChoice", count: 2, source: "event" }
              ] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "위험을 감수하고 약병에 손을 뻗는다.",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 약병 1개", chance: 50,
              effects: [{ type: "potionRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -10", chance: 50,
              effects: [{ type: "spirit", value: -10 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "위험 없이 주변을 탐색한다.",
          outcomes: [
            { kind: "positive", icon: "coin", text: "골드 +30", chance: 65,
              effects: [{ type: "gold", value: 30 }] },
            { kind: "negative", icon: "minus", text: "정신력 -5", chance: 35,
              effects: [{ type: "spirit", value: -5 }] }
          ]
        },
        {
          id: "D",
          label: "선택지 D",
          desc: "아무 일도 하지 않고 지나간다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_05_gold_spirit_remove",
      title: "이벤트 5",
      type: "random",
      category: "trade",
      phaseTags: ["mid", "late"],
      weight: 8,
      story: [
        "지친 기색의 영혼이 거래를 제안한다.",
        "무엇을 내주고 무엇을 얻을지는 당신의 선택에 달렸다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "골드를 내어주고 몸과 마음을 다독인다.",
          outcomes: [
            { kind: "neutral", icon: "coin", text: "골드 -50 / 정신력 +18", chance: 100,
              effects: [
                { type: "gold", value: -50 },
                { type: "spirit", value: 18 }
              ] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "정신력을 소모해 덱을 정리한다.",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "주문 삭제 1장 / 정신력 -10", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -10 }
              ] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "위험을 감수하고 큰 골드를 노린다.",
          outcomes: [
            { kind: "positive", icon: "coin", text: "골드 +60", chance: 60,
              effects: [{ type: "gold", value: 60 }] },
            { kind: "negative", icon: "status", text: "상태 주문 1장 추가", chance: 40,
              effects: [{ type: "addStatusCard", candidates: ["intrusive_thought", "regret"], count: 1 }] }
          ]
        }
      ]
    },
    {
      id: "event_06_potion_choice",
      title: "이벤트 6",
      type: "random",
      category: "trade",
      phaseTags: ["mid", "late"],
      weight: 8,
      story: [
        "약병이 가득한 진열장 앞에 낯선 기운이 감돈다.",
        "안전한 약을 고르거나, 강력한 약병에 손을 뻗어볼 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "안전하게 약병을 고른다.",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 Common 약병 2개 중 1개 선택", chance: 100,
              effects: [{ type: "potionChoice", count: 2, source: "event", rarity: "common" }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "귀문부에 손을 뻗어본다.",
          outcomes: [
            { kind: "positive", icon: "potion", text: "귀문부 획득", chance: 55,
              effects: [{ type: "potionSpecific", potionId: "ghost_gate_talisman" }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 45,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "안전하게 정신을 가다듬는다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +12", chance: 100,
              effects: [{ type: "spirit", value: 12 }] }
          ]
        },
        {
          id: "D",
          label: "선택지 D",
          desc: "아무 일도 하지 않고 지나간다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_07_deck_edit_basic",
      title: "이벤트 7",
      type: "random",
      category: "deck",
      phaseTags: ["early", "mid"],
      weight: 8,
      story: [
        "빛바랜 방명록이 펼쳐진 채 놓여 있다.",
        "새로운 인연을 맞이하거나, 묵은 인연을 정리할 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "새로운 인연을 덱에 맞이한다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주문 보상", chance: 100,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "정신력을 소모해 묵은 주문을 정리한다.",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "주문 삭제 1장 / 정신력 -8", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -8 }
              ] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "주문 한 장을 정리하고 새 인연을 맞이한다.",
          outcomes: [
            { kind: "neutral", icon: "sparkle", text: "주문 1장 삭제 후 주문 보상", chance: 100,
              effects: [{ type: "cardTransform", removeCount: 1, rewardCount: 3, pick: 1 }] }
          ]
        }
      ]
    },
    {
      id: "event_08_duplicate_or_attr",
      title: "이벤트 8",
      type: "random",
      category: "deck",
      phaseTags: ["mid", "late"],
      weight: 7,
      story: [
        "당신의 마음을 들여다보는 듯한 시선이 느껴진다.",
        "지금의 나와 어울리는 힘을 받거나, 가진 힘을 복제할 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "지금 나에게 가장 어울리는 힘을 받는다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주력 계열 주문 보상", chance: 100,
              effects: [{ type: "cardRewardDominantAttr", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "가진 힘을 복제하는 도박을 한다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "덱 주문 1장 복제", chance: 65,
              effects: [{ type: "cardDuplicate", excludeRarity: ["rare"] }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 35,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "안전하게 마음을 다독인다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +8", chance: 100,
              effects: [{ type: "spirit", value: 8 }] }
          ]
        }
      ]
    },
    {
      id: "event_09_archetype_choice",
      title: "이벤트 9",
      type: "random",
      category: "archetype",
      phaseTags: ["early", "mid", "late"],
      weight: 8,
      story: [
        "세 갈래 길 앞에서 서로 다른 기운이 당신을 부른다.",
        "동요, 결계, 성불 중 나아갈 방향을 골라야 한다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "동요의 힘을 받아들인다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "동요 주문 보상", chance: 100,
              effects: [{ type: "cardRewardTagged", attr: "동요", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "결계의 힘을 받아들인다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "결계 주문 보상", chance: 100,
              effects: [{ type: "cardRewardTagged", attr: "결계", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "성불의 힘을 받아들인다.",
          outcomes: [
            { kind: "neutral", icon: "sparkle", text: "성불 주문 보상 / 정신력 -8", chance: 100,
              effects: [
                { type: "cardRewardTagged", attr: "성불", count: 3, pick: 1 },
                { type: "spirit", value: -8 }
              ] }
          ]
        }
      ]
    },
    {
      id: "event_10_risky_relic",
      title: "이벤트 10",
      type: "random",
      category: "high_risk_high_reward",
      phaseTags: ["mid", "late"],
      weight: 6,
      story: [
        "낡은 진열장 안에서 강한 기운을 품은 법구가 빛난다.",
        "손을 뻗으면 얻을 수 있을 것 같지만, 주변의 공기가 불길하게 흔들린다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "위험을 감수하고 법구에 손을 뻗는다.",
          outcomes: [
            { kind: "positive", icon: "relic", text: "이벤트 법구 1개", chance: 55,
              effects: [{ type: "relicRandom", source: "event" }] },
            { kind: "negative", icon: "sword", text: "엘리트급 전투", chance: 45,
              effects: [{ type: "combat", combatType: "elite" }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "정신력을 소모해 법구의 기운을 안정시킨다.",
          outcomes: [
            { kind: "positive", icon: "relic", text: "이벤트 법구 1개", chance: 100,
              effects: [{ type: "relicRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -22", chance: 100,
              effects: [{ type: "spirit", value: -22 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "불길한 기운을 무시하지 않고 물러난다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_11_late_high_risk",
      title: "이벤트 11",
      type: "random",
      category: "high_risk_high_reward",
      phaseTags: ["late"],
      weight: 5,
      story: [
        "깊은 곳에서 강한 기운이 요동친다.",
        "큰 보상을 노릴 수 있지만, 그만큼 위험도 크다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "희귀한 주문을 노리고 위험을 감수한다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "Rare 주문 보상", chance: 65,
              effects: [{ type: "cardRewardRare", count: 3, pick: 1 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 35,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "희귀한 법구에 손을 뻗는다.",
          outcomes: [
            { kind: "positive", icon: "relic", text: "Rare 이벤트 법구 1개", chance: 45,
              effects: [{ type: "relicRare", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -25", chance: 55,
              effects: [{ type: "spirit", value: -25 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "안전하게 회복을 시도하지만 대가가 따른다.",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +18", chance: 55,
              effects: [{ type: "spirit", value: 18 }] },
            { kind: "negative", icon: "coin", text: "골드 -40", chance: 45,
              effects: [{ type: "gold", value: -40 }] }
          ]
        },
        {
          id: "D",
          label: "선택지 D",
          desc: "아무 일도 하지 않고 지나간다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_12_ambush_weak",
      title: "이벤트 12",
      type: "combat",
      category: "combat",
      phaseTags: ["early", "mid"],
      weight: 7,
      story: [
        "그림자 하나가 갑자기 앞을 가로막는다.",
        "미처 대비할 새도 없이 전투가 시작된다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "기습 전투",
          desc: "이벤트를 확인하자마자 전투가 시작된다.",
          outcomes: [
            { kind: "negative", icon: "sword", text: "일반 전투 / 승리 시 골드 +20", chance: 100,
              effects: [{ type: "combatEvent", combatType: "normal", victoryGold: 20 }] }
          ]
        }
      ]
    },
    {
      id: "event_13_multi_gold_combat",
      title: "이벤트 13",
      type: "combat",
      category: "combat",
      phaseTags: ["mid", "late"],
      weight: 6,
      story: [
        "여러 개의 기척이 동시에 다가온다.",
        "한꺼번에 몰려드는 무리를 상대해야 한다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "다수전",
          desc: "여러 상대가 한꺼번에 나타난다.",
          outcomes: [
            { kind: "negative", icon: "sword", text: "다수전 / 승리 시 골드 +60", chance: 100,
              effects: [{ type: "combatEvent", combatType: "normal", victoryGold: 60 }] }
          ]
        }
      ]
    },
    {
      id: "event_14_elite_relic_combat",
      title: "이벤트 14",
      type: "combat",
      category: "combat",
      phaseTags: ["late"],
      weight: 4,
      story: [
        "짙은 기운을 두른 존재가 길을 막아선다.",
        "만만치 않은 상대이지만, 이긴다면 값진 것을 얻을 수 있을 것이다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "엘리트 전투",
          desc: "강한 기운을 두른 상대가 나타난다.",
          outcomes: [
            { kind: "negative", icon: "sword", text: "엘리트급 전투 / 승리 시 이벤트 법구 1개, 주문 보상 없음", chance: 100,
              effects: [{ type: "combatEvent", combatType: "elite", victoryRelic: true, suppressCardReward: true }] }
          ]
        }
      ]
    },
    {
      id: "event_15_risky_bad_luck",
      title: "이벤트 15",
      type: "random",
      category: "bad_luck",
      phaseTags: ["mid", "late"],
      weight: 5,
      story: [
        "불길한 예감이 스치지만 돌아서기엔 늦었다.",
        "무언가를 얻으려면 위험을 감수해야 한다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "위험을 감수하고 법구에 손을 뻗는다.",
          outcomes: [
            { kind: "positive", icon: "relic", text: "이벤트 법구 1개", chance: 30,
              effects: [{ type: "relicRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 70,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "정신력을 소모해 덱을 정리한다.",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "주문 삭제 1장 / 정신력 -10", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -10 }
              ] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "안전하게 지나간다.",
          outcomes: []
        }
      ]
    },
    {
      id: "event_16_true_bad_luck",
      title: "이벤트 16",
      type: "random",
      category: "bad_luck",
      phaseTags: ["mid", "late"],
      weight: 3,
      story: [
        "병원 복도 전체가 갑자기 어둡게 가라앉는다.",
        "이미 늦었다. 이곳을 빠져나가려면 무언가를 잃어야 한다."
      ],
      choices: [
        {
          id: "A",
          label: "선택지 A",
          desc: "정신을 다잡고 억지로 길을 연다.",
          outcomes: [
            { kind: "negative", icon: "minus", text: "정신력 -10", chance: 100,
              effects: [{ type: "spiritMin1", value: -10 }] }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "가지고 있던 것을 내어주고 지나간다.",
          outcomes: [
            { kind: "negative", icon: "coin", text: "골드 -35 / 부족 시 정신력 -5", chance: 100,
              effects: [{ type: "goldOrSpiritPenalty", goldValue: -35, fallbackSpirit: -5 }] }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "불길한 생각을 애써 외면한다.",
          outcomes: [
            { kind: "negative", icon: "status", text: "상태 주문 1장 추가", chance: 100,
              effects: [{ type: "addStatusCard", candidates: ["intrusive_thought", "regret"], count: 1 }] }
          ]
        }
      ]
    }
  ];

  /**
   * 전역 런타임 DB로 등록한다.
   * 다른 파일에서는 window.EVENT_DB로 접근한다.
   */
  window.EVENT_DB = EVENT_DB;

  /**
   * 개발 확인용 로그.
   * 운영 빌드에서 로그가 거슬리면 추후 제거 가능하다.
   */
  console.info(`[eventData] EVENT_DB loaded: ${EVENT_DB.length} events`);
})();
