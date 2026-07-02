"use strict";
/* =========================================================================
   StatusData.js
   적 상태이상/표식 UI 통합 데이터
   - script.js보다 먼저 로드하면 window.STATUS_DATA로 자동 연결됩니다.
   - 핵심 매핑 고정: 동요=🌀, 성불 표식=🌸
   ========================================================================= */
(function(){
  const STATUS_DATA = {
    agitation: {
      id: "agitation",
      legacyKey: "weak",
      name: "동요",
      shortName: "동요",
      icon: "🌀",
      iconImage: "",
      color: "#5577ff",
      description: "적의 공격 피해가 25% 감소합니다.",
      decayTiming: "afterEnemyAction",
      decayAmount: 1,
      decayTimingText: "행동 종료 시 1 감소합니다.",
      maxStack: 99,
      showOnEnemy: true
    },
    mark: {
      id: "mark",
      legacyKey: "mark",
      name: "성불 표식",
      shortName: "성불 표식",
      icon: "🌸",
      iconImage: "",
      color: "#ff6fb1",
      description: "일부 성불 주문이 추가 효과를 얻습니다. 표식을 소모하는 주문에 의해 제거됩니다.",
      maxStack: 99,
      showOnEnemy: true
    },
    anxiety: {
      id: "anxiety",
      legacyKey: "anxiety",
      name: "불안",
      shortName: "불안",
      icon: "💭",
      iconImage: "",
      color: "#7c93d6",
      description: "다음 턴 주문 뽑기에 영향을 줍니다.",
      maxStack: 99,
      showOnEnemy: false
    },
    lethargy: {
      id: "lethargy",
      legacyKey: "lethargy",
      name: "무기력",
      shortName: "무기력",
      icon: "🌫️",
      iconImage: "",
      color: "#8fa0aa",
      description: "다음 턴 정신력에 영향을 줍니다.",
      maxStack: 99,
      showOnEnemy: false
    },
    burn: {
      id: "burn",
      name: "화상",
      shortName: "화상",
      icon: "🔥",
      iconImage: "",
      color: "#e85d3f",
      description: "턴 종료 시 피해를 받습니다.",
      maxStack: 99,
      showOnEnemy: true
    },
    poison: {
      id: "poison",
      name: "독",
      shortName: "독",
      icon: "☠️",
      iconImage: "",
      color: "#56a64b",
      description: "턴 종료 시 피해를 받습니다.",
      maxStack: 99,
      showOnEnemy: true
    }
  };

  window.STATUS_DATA = STATUS_DATA;
  window.BOHYUN_STATUS_DATA = STATUS_DATA;
})();
