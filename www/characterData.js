"use strict";
/* =========================================================================
   캐릭터 데이터
   - 플레이어 캐릭터 수치와 표시 정보를 이 파일에서만 관리
   - 다른 팀 코드와 충돌하지 않도록 window.BOHYUN_COMBAT_DATA 네임스페이스만 사용
   ========================================================================= */
(function attachCharacterData(global){
  global.BOHYUN_COMBAT_DATA = global.BOHYUN_COMBAT_DATA || {};

  global.BOHYUN_COMBAT_DATA.character = {
    id: "player_bitsol",
    name: "빛솔이",
    title: "신입 액소시스트",
    emoji: "👼",

    maxHp: 60,
    hp: 60,
    block: 0,
    weak: 0,

    // 필요하면 캐릭터 전용 기본값을 여기서 추가 관리
    startFloorLabel: "5층"
  };
})(window);
