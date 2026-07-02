(function () {
  "use strict";

  /**
   * ACT1 이벤트 DB
   *
   * 주의:
   * - 현재 단계에서는 샘플 이벤트 3개만 입력한다 (이벤트 1, 10, 16).
   * - 전체 16개 이벤트 입력은 UI와 효과 연결 검증 후 진행한다.
   * - UI는 이 데이터를 읽어서 제목, 스토리, 선택지, 결과 칩을 자동 렌더링해야 한다.
   * - 확률/수치는 ACT1_이벤트_세부기획서_밸런스조정안 기준으로 반영되었다.
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
            {
              kind: "positive",
              icon: "sparkle",
              text: "카드 보상",
              chance: 65,
              effects: [
                { type: "cardReward", count: 3, pick: 1 }
              ]
            },
            {
              kind: "negative",
              icon: "minus",
              text: "정신력 -10",
              chance: 35,
              effects: [
                { type: "spirit", value: -10 }
              ]
            }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "기척을 살피고 주변을 조사한다.",
          outcomes: [
            {
              kind: "positive",
              icon: "coin",
              text: "골드 +35",
              chance: 55,
              effects: [
                { type: "gold", value: 35 }
              ]
            },
            {
              kind: "negative",
              icon: "sword",
              text: "일반 전투",
              chance: 45,
              effects: [
                { type: "combat", combatType: "normal" }
              ]
            }
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
            {
              kind: "positive",
              icon: "relic",
              text: "이벤트 법구 1개",
              chance: 55,
              effects: [
                { type: "relicRandom", source: "event" }
              ]
            },
            {
              kind: "negative",
              icon: "sword",
              text: "엘리트급 전투",
              chance: 45,
              effects: [
                { type: "combat", combatType: "elite" }
              ]
            }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "정신력을 소모해 법구의 기운을 안정시킨다.",
          outcomes: [
            {
              kind: "positive",
              icon: "relic",
              text: "이벤트 법구 1개",
              chance: 100,
              effects: [
                { type: "relicRandom", source: "event" }
              ]
            },
            {
              kind: "negative",
              icon: "minus",
              text: "정신력 -22",
              chance: 100,
              effects: [
                { type: "spirit", value: -22 }
              ]
            }
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
            {
              kind: "negative",
              icon: "minus",
              text: "정신력 -10",
              chance: 100,
              effects: [
                { type: "spiritMin1", value: -10 }
              ]
            }
          ]
        },
        {
          id: "B",
          label: "선택지 B",
          desc: "가지고 있던 것을 내어주고 지나간다.",
          outcomes: [
            {
              kind: "negative",
              icon: "coin",
              text: "골드 -35 / 부족 시 정신력 -5",
              chance: 100,
              effects: [
                { type: "goldOrSpiritPenalty", goldValue: -35, fallbackSpirit: -5 }
              ]
            }
          ]
        },
        {
          id: "C",
          label: "선택지 C",
          desc: "불길한 생각을 애써 외면한다.",
          outcomes: [
            {
              kind: "negative",
              icon: "status",
              text: "상태 카드 1장 추가",
              chance: 100,
              effects: [
                {
                  type: "addStatusCard",
                  candidates: ["intrusive_thought", "regret"],
                  count: 1
                }
              ]
            }
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
