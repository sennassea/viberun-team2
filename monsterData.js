"use strict";
/* =========================================================================
   몬스터 데이터
   - 아이 → 할머니 → 간호사 → 육상선수 순차 전투
   - 몬스터 이름, 체력, 행동 후보만 이 파일에서 관리
   ========================================================================= */
(function attachMonsterData(global){
  global.BOHYUN_COMBAT_DATA = global.BOHYUN_COMBAT_DATA || {};

  global.BOHYUN_COMBAT_DATA.monsters = [
    {
      id: "child_spirit",
      name: "아이 영혼",
      emoji: "🧒",
      maxHp: 32,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 6, name: "울음" },
        { t: "defend", v: 5, name: "웅크리기" }
      ]
    },
    {
      id: "grandmother_spirit",
      name: "할머니 영혼",
      emoji: "👵",
      maxHp: 48,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "깊은 한숨" },
        { t: "attack", v: 8, name: "그리움" }
      ]
    },
    {
      id: "nurse_spirit",
      name: "간호사 영혼",
      emoji: "👩‍⚕️",
      maxHp: 40,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 9, name: "호출음" },
        { t: "defend", v: 6, name: "차트 정리" }
      ]
    },
    {
      id: "runner_spirit",
      name: "육상선수 영혼",
      emoji: "🏃",
      maxHp: 64,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 10, name: "불안한 질주" },
        { t: "defend", v: 8, name: "출발선에 멈춤" },
        { t: "attack", v: 14, name: "전력 질주" }
      ]
    }
  ];
})(window);
