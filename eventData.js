(function () {
  "use strict";

  /**
   * ACT1 이벤트 DB
   *
   * - 데이터 출처: ACT1_이벤트_컨셉_데이터테이블_복채용어최종수정 (1).xlsx
   * - 카드/주문 표시 용어는 지시서 기준에 맞춰 "의식"으로 표기한다.
   * - 플레이어 자원 gold는 기존 effect_type 호환을 위해 유지하되, UI 텍스트는 "복채"로 표기한다.
   * - effect.type 구현명은 기존 eventNode.js 핸들러와의 연결을 보호하기 위해 변경하지 않는다.
   */
  const EVENT_DB = [
    {
      id: "event_01_card_low_risk",
      backgroundImage: "assets/event_background/park_playground.jpg",
      title: "놀이터의 작은 목소리",
      type: "random",
      category: "reward",
      phaseTags: ["early", "mid"],
      weight: 10,
      story: [
        "빈 놀이터 한쪽에서 아이의 목소리가 들린다.",
        "보이지 않는 아이가 \"내 이야기 들어줄래?\" 하고 묻는다."
      ],
      choices: [
        {
          id: "A",
          label: "이야기를 들어준다",
          desc: "새 의식 보상 65% / 정신력 -10 35%",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "새 의식 보상", chance: 65,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] },
            { kind: "negative", icon: "minus", text: "정신력 -10", chance: 35,
              effects: [{ type: "spirit", value: -10 }] }
          ]
        },
        {
          id: "B",
          label: "주변을 살핀다",
          desc: "복채 +35 55% / 일반 전투 45%",
          outcomes: [
            { kind: "positive", icon: "coin", text: "복채 +35", chance: 55,
              effects: [{ type: "gold", value: 35 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 45,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "C",
          label: "지나간다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_02_recovery_potion",
      backgroundImage: "assets/event_background/hospital_hallway.jpg",
      title: "간호 스테이션의 남은 처방",
      type: "random",
      category: "reward",
      phaseTags: ["early"],
      weight: 10,
      story: [
        "아무도 없는 간호 스테이션에 이름이 지워진 처방 기록과 작은 약병이 남아 있다.",
        "처방 기록은 아직 체온이 남은 듯 희미하게 빛난다."
      ],
      choices: [
        {
          id: "A",
          label: "처방대로 쉰다",
          desc: "정신력 +10",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +10", chance: 100,
              effects: [{ type: "spirit", value: 10 }] }
          ]
        },
        {
          id: "B",
          label: "약병을 챙긴다",
          desc: "이벤트 일반 약병 1개 70% / 정신력 -8 30%",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 일반 약병 1개", chance: 70,
              effects: [{ type: "potionRandom", source: "event", rarity: "common" }] },
            { kind: "negative", icon: "minus", text: "정신력 -8", chance: 30,
              effects: [{ type: "spirit", value: -8 }] }
          ]
        },
        {
          id: "C",
          label: "접수대 잔돈을 챙긴다",
          desc: "복채 +18",
          outcomes: [
            { kind: "positive", icon: "coin", text: "복채 +18", chance: 100,
              effects: [{ type: "gold", value: 18 }] }
          ]
        }
      ]
    },
    {
      id: "event_03_reward_or_combat",
      backgroundImage: "assets/event_background/school_classroom.jpg",
      title: "이름 없는 공책",
      type: "random",
      category: "reward",
      phaseTags: ["early", "mid"],
      weight: 8,
      story: [
        "빈 교실 책상 위에 이름 없는 공책이 펼쳐져 있다.",
        "글씨는 아직도 천천히 적히고 있다."
      ],
      choices: [
        {
          id: "A",
          label: "공책을 읽는다",
          desc: "새 의식 보상 55% / 일반 전투 45%",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "새 의식 보상", chance: 55,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 45,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "B",
          label: "필요한 구절만 베낀다",
          desc: "의식 후보 확인 후 1장 선택 또는 포기",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "의식 후보 확인 후 선택/포기", chance: 100,
              effects: [{ type: "cardRewardOptional", count: 3 }] }
          ]
        },
        {
          id: "C",
          label: "책상 서랍을 뒤진다",
          desc: "복채 +30 65% / 정신력 -6 35%",
          outcomes: [
            { kind: "positive", icon: "coin", text: "복채 +30", chance: 65,
              effects: [{ type: "gold", value: 30 }] },
            { kind: "negative", icon: "minus", text: "정신력 -6", chance: 35,
              effects: [{ type: "spirit", value: -6 }] }
          ]
        }
      ]
    },
    {
      id: "event_04_gold_for_potion",
      backgroundImage: "assets/event_background/hospital_hallway.jpg",
      title: "잠긴 약품 보관함",
      type: "random",
      category: "trade",
      phaseTags: ["early", "mid", "late"],
      weight: 8,
      story: [
        "병원 복도 한쪽, 잠긴 약품 보관함 안에서 약병들이 서로 부딪히는 소리가 난다.",
        "복채를 내고 원하는 약병을 고르거나, 대가를 모른 채 손을 넣어볼 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "복채를 내고 약병을 고른다",
          desc: "복채 -45 / 이벤트 약병 2개 중 1개 선택",
          outcomes: [
            { kind: "neutral", icon: "potion", text: "복채 -45 / 이벤트 약병 2개 중 1개 선택", chance: 100,
              effects: [
                { type: "gold", value: -45 },
                { type: "potionChoice", count: 2, source: "event" }
              ] }
          ]
        },
        {
          id: "B",
          label: "아무 약병이나 꺼낸다",
          desc: "이벤트 약병 1개 50% / 정신력 -10 50%",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 약병 1개", chance: 50,
              effects: [{ type: "potionRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -10", chance: 50,
              effects: [{ type: "spirit", value: -10 }] }
          ]
        },
        {
          id: "C",
          label: "주변을 살핀다",
          desc: "복채 +22 65% / 정신력 -5 35%",
          outcomes: [
            { kind: "positive", icon: "coin", text: "복채 +22", chance: 65,
              effects: [{ type: "gold", value: 22 }] },
            { kind: "negative", icon: "minus", text: "정신력 -5", chance: 35,
              effects: [{ type: "spirit", value: -5 }] }
          ]
        },
        {
          id: "D",
          label: "지나간다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_05_gold_spirit_remove",
      backgroundImage: "assets/event_background/park_bench_path.jpg",
      title: "벤치 아래 분실물 상자",
      type: "random",
      category: "trade",
      phaseTags: ["mid", "late"],
      weight: 8,
      story: [
        "공원 벤치 아래에 오래된 분실물 상자가 놓여 있다.",
        "누군가 두고 간 물건들이 조용히 흔들린다."
      ],
      choices: [
        {
          id: "A",
          label: "값을 치르고 마음을 달랜다",
          desc: "복채 -50 / 정신력 +18",
          outcomes: [
            { kind: "neutral", icon: "coin", text: "복채 -50 / 정신력 +18", chance: 100,
              effects: [
                { type: "gold", value: -50 },
                { type: "spirit", value: 18 }
              ] }
          ]
        },
        {
          id: "B",
          label: "의식 하나를 덜어낸다",
          desc: "의식 삭제 1장 / 정신력 -10",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "의식 삭제 1장 / 정신력 -10", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -10 }
              ] }
          ]
        },
        {
          id: "C",
          label: "상자 속 복채를 가져간다",
          desc: "복채 +60 60% / 상태 의식 1장 추가 40%",
          outcomes: [
            { kind: "positive", icon: "coin", text: "복채 +60", chance: 60,
              effects: [{ type: "gold", value: 60 }] },
            { kind: "negative", icon: "status", text: "상태 의식 1장 추가", chance: 40,
              effects: [{ type: "addStatusCard", candidates: ["intrusive_thought", "regret"], count: 1 }] }
          ]
        }
      ]
    },
    {
      id: "event_06_potion_choice",
      backgroundImage: "assets/event_background/school_infirmary.jpg",
      title: "보건실의 약봉투",
      type: "random",
      category: "trade",
      phaseTags: ["mid", "late"],
      weight: 8,
      story: [
        "학교 보건실 책상 위에 약봉투 여러 개가 놓여 있다.",
        "그중 하나에는 붉은 실로 봉인이 묶여 있다."
      ],
      choices: [
        {
          id: "A",
          label: "안전한 약봉투를 고른다",
          desc: "이벤트 일반 약병 2개 중 1개 선택",
          outcomes: [
            { kind: "positive", icon: "potion", text: "이벤트 일반 약병 2개 중 1개 선택", chance: 100,
              effects: [{ type: "potionChoice", count: 2, source: "event", rarity: "common" }] }
          ]
        },
        {
          id: "B",
          label: "봉인된 약봉투를 연다",
          desc: "귀문부 55% / 정신력 -15 45%",
          outcomes: [
            { kind: "positive", icon: "potion", text: "귀문부", chance: 55,
              effects: [{ type: "potionSpecific", potionId: "ghost_gate_talisman" }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 45,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "C",
          label: "잠깐 숨을 고른다",
          desc: "정신력 +12",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +12", chance: 100,
              effects: [{ type: "spirit", value: 12 }] }
          ]
        },
        {
          id: "D",
          label: "지나간다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_07_deck_edit_basic",
      backgroundImage: "assets/event_background/school_classroom.jpg",
      title: "찢어진 노트 정리",
      type: "random",
      category: "deck",
      phaseTags: ["early", "mid"],
      weight: 8,
      story: [
        "찢어진 노트에 지금까지의 의식들이 어지럽게 적혀 있다.",
        "다시 적거나, 지우거나, 바꿀 수 있을 것 같다."
      ],
      choices: [
        {
          id: "A",
          label: "새 의식을 적는다",
          desc: "새 의식 보상 3장 중 1장",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "새 의식 보상", chance: 100,
              effects: [{ type: "cardReward", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "의식 하나를 지운다",
          desc: "의식 삭제 1장 / 정신력 -8",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "의식 삭제 1장 / 정신력 -8", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -8 }
              ] }
          ]
        },
        {
          id: "C",
          label: "하나를 지우고 새로 적는다",
          desc: "의식 1장 삭제 후 새 의식 보상 3장 중 1장",
          outcomes: [
            { kind: "neutral", icon: "sparkle", text: "의식 1장 삭제 후 새 의식 보상", chance: 100,
              effects: [{ type: "cardTransform", removeCount: 1, rewardCount: 3, pick: 1 }] }
          ]
        }
      ]
    },
    {
      id: "event_08_duplicate_or_attr",
      backgroundImage: "assets/event_background/school_blackboard.jpg",
      title: "칠판 위 반복문",
      type: "random",
      category: "deck",
      phaseTags: ["mid", "late"],
      weight: 7,
      story: [
        "칠판에 같은 문장이 계속 반복되어 있다.",
        "가장 익숙한 의식의 방향이 선명하게 드러난다."
      ],
      choices: [
        {
          id: "A",
          label: "가장 많이 쓴 계열을 따른다",
          desc: "현재 덱에서 가장 많은 계열 의식 보상",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "주력 계열 의식 보상", chance: 100,
              effects: [{ type: "cardRewardDominantAttr", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "익숙한 의식을 다시 베낀다",
          desc: "현재 덱 의식 1장 복제 65% / 정신력 -15 35%",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "의식 1장 복제", chance: 65,
              effects: [{ type: "cardDuplicate", excludeRarity: ["rare"] }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 35,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "C",
          label: "잠깐 물러난다",
          desc: "정신력 +8",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +8", chance: 100,
              effects: [{ type: "spirit", value: 8 }] }
          ]
        }
      ]
    },
    {
      id: "event_09_archetype_choice",
      backgroundImage: "assets/event_background/school_blackboard.jpg",
      title: "세 갈래 낙서",
      type: "random",
      category: "archetype",
      phaseTags: ["early", "mid", "late"],
      weight: 8,
      story: [
        "칠판에는 세 갈래 낙서가 있다.",
        "하나는 흔들리고, 하나는 둘러싸고, 하나는 떠나보낸다."
      ],
      choices: [
        {
          id: "A",
          label: "동요 의식을 고른다",
          desc: "동요 의식 3장 중 1장",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "동요 의식 보상", chance: 100,
              effects: [{ type: "cardRewardTagged", attr: "동요", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "B",
          label: "결계 의식을 고른다",
          desc: "결계 의식 3장 중 1장",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "결계 의식 보상", chance: 100,
              effects: [{ type: "cardRewardTagged", attr: "결계", count: 3, pick: 1 }] }
          ]
        },
        {
          id: "C",
          label: "성불 의식을 고른다",
          desc: "성불 의식 3장 중 1장 / 정신력 -8",
          outcomes: [
            { kind: "neutral", icon: "sparkle", text: "성불 의식 보상 / 정신력 -8", chance: 100,
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
      backgroundImage: "assets/event_background/hospital_ward.jpg",
      title: "열면 안 되는 병실 서랍",
      type: "random",
      category: "high_risk_high_reward",
      phaseTags: ["mid", "late"],
      weight: 6,
      story: [
        "병실 침대 옆 서랍에 금줄이 감겨 있다.",
        "안쪽에서 희미한 법구의 기운이 새어 나온다."
      ],
      choices: [
        {
          id: "A",
          label: "조심히 열어본다",
          desc: "이벤트 법구 1개 55% / 엘리트급 전투 45%",
          outcomes: [
            { kind: "positive", icon: "relic", text: "이벤트 법구 1개", chance: 55,
              effects: [{ type: "relicRandom", source: "event" }] },
            { kind: "negative", icon: "sword", text: "엘리트급 전투", chance: 45,
              effects: [{ type: "combat", combatType: "elite" }] }
          ]
        },
        {
          id: "B",
          label: "대가를 치르고 연다",
          desc: "이벤트 법구 1개 / 정신력 -22",
          outcomes: [
            { kind: "neutral", icon: "relic", text: "이벤트 법구 1개 / 정신력 -22", chance: 100,
              effects: [
                { type: "relicRandom", source: "event" },
                { type: "spirit", value: -22 }
              ] }
          ]
        },
        {
          id: "C",
          label: "지나간다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_11_late_high_risk",
      backgroundImage: "assets/event_background/hospital_operating_room.jpg",
      title: "폐쇄 수술실의 봉인 물품",
      type: "random",
      category: "high_risk_high_reward",
      phaseTags: ["late"],
      weight: 5,
      story: [
        "폐쇄된 수술실 안, 수술대 위에 천으로 덮인 물건이 놓여 있다.",
        "가까이 갈수록 수술등이 켜진다."
      ],
      choices: [
        {
          id: "A",
          label: "기록을 확인한다",
          desc: "유일 의식 보상 65% / 일반 전투 35%",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "유일 의식 보상", chance: 65,
              effects: [{ type: "cardRewardRare", count: 3, pick: 1 }] },
            { kind: "negative", icon: "sword", text: "일반 전투", chance: 35,
              effects: [{ type: "combat", combatType: "normal" }] }
          ]
        },
        {
          id: "B",
          label: "봉인 물품을 가져간다",
          desc: "유일 이벤트 법구 1개 45% / 정신력 -25 55%",
          outcomes: [
            { kind: "positive", icon: "relic", text: "유일 이벤트 법구 1개", chance: 45,
              effects: [{ type: "relicRare", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -25", chance: 55,
              effects: [{ type: "spirit", value: -25 }] }
          ]
        },
        {
          id: "C",
          label: "숨을 고른다",
          desc: "정신력 +18 55% / 복채 -40 45%",
          outcomes: [
            { kind: "positive", icon: "sparkle", text: "정신력 +18", chance: 55,
              effects: [{ type: "spirit", value: 18 }] },
            { kind: "negative", icon: "coin", text: "복채 -40", chance: 45,
              effects: [{ type: "gold", value: -40 }] }
          ]
        },
        {
          id: "D",
          label: "지나간다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_12_ambush_weak",
      backgroundImage: "assets/event_background/park_playground.jpg",
      title: "혼자 흔들리는 그네",
      type: "combat",
      category: "combat",
      phaseTags: ["early", "mid"],
      weight: 7,
      story: [
        "아무도 없는 그네가 혼자 흔들린다.",
        "가까이 다가가는 순간, 그네 아래 그림자가 일어난다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "다가간다",
          desc: "일반 전투 / 승리 시 복채 +10",
          outcomes: [
            { kind: "negative", icon: "sword", text: "일반 전투 / 승리 시 복채 +10", chance: 100,
              effects: [{ type: "combatEvent", combatType: "normal", victoryGold: 10 }] }
          ]
        }
      ]
    },
    {
      id: "event_13_multi_gold_combat",
      backgroundImage: "assets/event_background/school_hallway.jpg",
      title: "종례 후 복도",
      type: "combat",
      category: "combat",
      phaseTags: ["mid", "late"],
      weight: 6,
      story: [
        "종례가 끝난 듯한 학교 복도에 발소리가 겹쳐 들린다.",
        "뒤돌아보면 원혼들이 줄지어 다가온다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "뒤돌아본다",
          desc: "다수전 / 승리 시 복채 +60",
          outcomes: [
            { kind: "negative", icon: "sword", text: "다수전 / 승리 시 복채 +60", chance: 100,
              effects: [{ type: "combatEvent", combatType: "normal", victoryGold: 60 }] }
          ]
        }
      ]
    },
    {
      id: "event_14_elite_relic_combat",
      backgroundImage: "assets/event_background/hospital_operating_room.jpg",
      title: "봉인 병동의 호출벨",
      type: "combat",
      category: "combat",
      phaseTags: ["late"],
      weight: 4,
      story: [
        "출입 금지된 병동 앞에서 호출벨이 울린다.",
        "문 너머의 존재는 법구를 지키고 있다."
      ],
      choices: [
        {
          id: "AUTO",
          label: "문을 연다",
          desc: "엘리트급 전투 / 승리 시 이벤트 법구 1개 / 의식 보상 없음",
          outcomes: [
            { kind: "negative", icon: "sword", text: "엘리트급 전투 / 승리 시 이벤트 법구 1개 / 의식 보상 없음", chance: 100,
              effects: [{
                type: "combatEvent",
                combatType: "elite",
                victoryRelic: true,
                victoryRelicSource: "event",
                suppressCardReward: true,
                suppressGoldReward: true,
                suppressOptionalRewards: true
              }] }
          ]
        }
      ]
    },
    {
      id: "event_15_risky_bad_luck",
      backgroundImage: "assets/event_background/park_sand_carousel.jpg",
      title: "모래밭의 반짝임",
      type: "random",
      category: "bad_luck",
      phaseTags: ["mid", "late"],
      weight: 5,
      story: [
        "모래밭 속에 무언가 반짝인다.",
        "꺼내면 도움이 될 수도 있지만, 손끝에 찝찝한 기운이 감긴다."
      ],
      choices: [
        {
          id: "A",
          label: "파내본다",
          desc: "이벤트 법구 1개 30% / 정신력 -15 70%",
          outcomes: [
            { kind: "positive", icon: "relic", text: "이벤트 법구 1개", chance: 30,
              effects: [{ type: "relicRandom", source: "event" }] },
            { kind: "negative", icon: "minus", text: "정신력 -15", chance: 70,
              effects: [{ type: "spirit", value: -15 }] }
          ]
        },
        {
          id: "B",
          label: "미련 하나를 묻는다",
          desc: "의식 삭제 1장 / 정신력 -10",
          outcomes: [
            { kind: "neutral", icon: "minus", text: "의식 삭제 1장 / 정신력 -10", chance: 100,
              effects: [
                { type: "cardRemove", count: 1 },
                { type: "spirit", value: -10 }
              ] }
          ]
        },
        {
          id: "C",
          label: "그냥 둔다",
          desc: "결과 없음",
          outcomes: []
        }
      ]
    },
    {
      id: "event_16_true_bad_luck",
      backgroundImage: "assets/event_background/park_sand_carousel.jpg",
      title: "멈추지 않는 회전놀이",
      type: "random",
      category: "bad_luck",
      phaseTags: ["mid", "late"],
      weight: 3,
      story: [
        "낡은 회전놀이가 혼자 천천히 돈다.",
        "발을 들인 순간 멈추지 않고, 무언가를 잃어야만 내려올 수 있다."
      ],
      choices: [
        {
          id: "A",
          label: "정신력을 잃고 버틴다",
          desc: "정신력 -10, 단 최소 1은 남김",
          outcomes: [
            { kind: "negative", icon: "minus", text: "정신력 -10, 단 최소 1은 남김", chance: 100,
              effects: [{ type: "spiritMin1", value: -10 }] }
          ]
        },
        {
          id: "B",
          label: "복채를 잃고 빠져나온다",
          desc: "복채 -35, 부족 시 보유 복채 전부 제거 + 정신력 -5",
          outcomes: [
            { kind: "negative", icon: "coin", text: "복채 -35 / 부족 시 정신력 -5", chance: 100,
              effects: [{ type: "goldOrSpiritPenalty", goldValue: -35, fallbackSpirit: -5 }] }
          ]
        },
        {
          id: "C",
          label: "나쁜 기억을 떠안는다",
          desc: "상태 의식 1장 추가",
          outcomes: [
            { kind: "negative", icon: "status", text: "상태 의식 1장 추가", chance: 100,
              effects: [{ type: "addStatusCard", candidates: ["intrusive_thought", "regret"], count: 1 }] }
          ]
        }
      ]
    }
  ];

  window.EVENT_DB = EVENT_DB;
  console.info(`[eventData] EVENT_DB loaded: ${EVENT_DB.length} events`);
})();
