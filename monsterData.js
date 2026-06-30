"use strict";
/* =========================================================================
   Monster Data
   - Ghost data for memorial combat: lingering attachment, not extermination.
   - Map designers should call monsters by id/stage key instead of redefining data.
   ========================================================================= */
(function attachMonsterData(global){
  const data = global.BOHYUN_COMBAT_DATA = global.BOHYUN_COMBAT_DATA || {};

  const MONSTER_DEFS = [
    {
      id: "child_spirit",
      name: "이름을 잊은 아이",
      family: "튜토리얼",
      emoji: "👼",
      grade: "tutorial",
      roles: ["tutorial", "allRounder"],
      maxHp: 30,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 4, name: "작은 울음", role: "normalAttack" },
        { t: "debuff", v: 1, name: "낯선 시선", role: "debuff" },
        { t: "defend", v: 4, name: "이불 속 숨기", role: "defense" },
        { t: "attack", v: 7, name: "손 내밀기", role: "specialAttack" }
      ]
    },
    {
      id: "child_spirit_lost",
      name: "병동을 헤매는 아이",
      family: "아이",
      emoji: "👼",
      grade: "normal",
      roles: ["attacker"],
      maxHp: 30,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 5, name: "작은 울음", role: "normalAttack" },
        { t: "attack", v: 5, name: "손 내밀기", role: "normalAttack" },
        { t: "defend", v: 4, name: "이불 속 숨기", role: "defense" }
      ]
    },
    {
      id: "child_spirit_night",
      name: "밤 복도를 걷는 아이",
      family: "아이",
      emoji: "👼",
      grade: "normal",
      roles: ["attacker", "debuffer"],
      maxHp: 28,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 4, name: "작은 울음", role: "normalAttack" },
        { t: "debuff", v: 1, name: "어두운 복도", role: "anxiety" },
        { t: "attack", v: 6, name: "손 내밀기", role: "normalAttack" },
        { t: "defend", v: 3, name: "이불 속 숨기", role: "defense" }
      ]
    },
    {
      id: "child_spirit_underbed",
      name: "침대 밑에 숨은 아이",
      family: "아이",
      emoji: "👼",
      grade: "normal",
      roles: ["protector"],
      maxHp: 34,
      x: 72,
      first: 0,
      moves: [
        { t: "defend", v: 7, name: "침대 밑 숨기", role: "defense" },
        { t: "attack", v: 4, name: "작은 발소리", role: "normalAttack" },
        { t: "attack", v: 7, name: "갑작스런 울음", role: "specialAttack" },
        { t: "defend", v: 5, name: "담요 끌어당기기", role: "defense" }
      ]
    },
    {
      id: "child_spirit_swallowed",
      name: "울음을 삼킨 아이",
      family: "아이",
      emoji: "👼",
      grade: "normal",
      roles: ["slowScaler"],
      maxHp: 31,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 4, name: "참은 훌쩍임", role: "normalAttack" },
        { t: "defend", v: 4, name: "입술 깨물기", role: "defense" },
        { t: "attack", v: 8, name: "터져 나온 울음", role: "specialAttack" }
      ]
    },
    {
      id: "child_spirit_window",
      name: "창가 침대의 아이",
      family: "아이",
      emoji: "👼",
      grade: "elite",
      roles: ["burst", "attacker"],
      maxHp: 48,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 8, name: "작은 울음", role: "normalAttack" },
        { t: "attack", v: 9, name: "손 내밀기", role: "normalAttack" },
        { t: "attack", v: 13, name: "창밖을 부르는 손", role: "specialAttack" },
        { t: "defend", v: 7, name: "이불 속 숨기", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit",
      name: "기억을 붙든 노인",
      family: "노인",
      emoji: "👵",
      grade: "normal",
      roles: ["tank", "debuffer"],
      maxHp: 46,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "debuff" },
        { t: "attack", v: 6, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 9, name: "그리움의 빛", role: "specialAttack" },
        { t: "defend", v: 7, name: "빛바랜 사진", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit_memory",
      name: "사진을 품은 노인",
      family: "노인",
      emoji: "👵",
      grade: "normal",
      roles: ["debuffer"],
      maxHp: 42,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "낡은 사진 건네기", role: "anxiety" },
        { t: "attack", v: 5, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 8, name: "잊힌 장면", role: "specialAttack" },
        { t: "defend", v: 6, name: "사진 속으로 숨기", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit_dream",
      name: "퇴원을 기다린 노인",
      family: "노인",
      emoji: "👵",
      grade: "normal",
      roles: ["debuffer"],
      maxHp: 43,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "debuff" },
        { t: "attack", v: 6, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 9, name: "그리움의 빛", role: "specialAttack" },
        { t: "defend", v: 6, name: "빛바랜 사진", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit_visit",
      name: "병문안을 기다린 노인",
      family: "노인",
      emoji: "👵",
      grade: "normal",
      roles: ["debuffer"],
      maxHp: 41,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "오지 않는 발걸음", role: "anxiety" },
        { t: "attack", v: 5, name: "낮은 한숨", role: "normalAttack" },
        { t: "attack", v: 8, name: "외로운 손짓", role: "specialAttack" },
        { t: "defend", v: 5, name: "문가에 기대기", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit_echo",
      name: "자장가를 흥얼대는 노인",
      family: "노인",
      emoji: "👵",
      grade: "elite",
      roles: ["tank", "debuffer"],
      maxHp: 60,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "debuff" },
        { t: "attack", v: 8, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 12, name: "그리움의 빛", role: "specialAttack" },
        { t: "defend", v: 10, name: "빛바랜 사진", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit",
      name: "야간 병동 간호사",
      family: "간호사",
      emoji: "👩‍⚕️",
      grade: "normal",
      roles: ["attacker"],
      maxHp: 38,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 7, name: "분주한 호출", role: "normalAttack" },
        { t: "attack", v: 6, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 9, name: "긴급 돌봄", role: "specialAttack" },
        { t: "defend", v: 6, name: "차트 정리", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit_lamp",
      name: "스테이션의 간호사",
      family: "간호사",
      emoji: "👩‍⚕️",
      grade: "normal",
      roles: ["support"],
      maxHp: 42,
      x: 72,
      first: 0,
      moves: [
        { t: "defend", v: 7, name: "차트 정리", role: "defense" },
        { t: "attack", v: 6, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 9, name: "긴급 돌봄", role: "specialAttack" },
        { t: "defend", v: 7, name: "스테이션 정비", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit_soft",
      name: "처치를 망설이는 간호사",
      family: "간호사",
      emoji: "👩‍⚕️",
      grade: "normal",
      roles: ["debuffer", "support"],
      maxHp: 38,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "망설이는 손길", role: "anxiety" },
        { t: "attack", v: 6, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 9, name: "긴급 돌봄", role: "specialAttack" },
        { t: "defend", v: 6, name: "차트 정리", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit_callbell",
      name: "호출벨을 든 간호사",
      family: "간호사",
      emoji: "👩‍⚕️",
      grade: "normal",
      roles: ["summoner", "support"],
      maxHp: 36,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "호출벨 울리기", role: "anxiety" },
        { t: "defend", v: 6, name: "급히 둘러보기", role: "defense" },
        { t: "attack", v: 6, name: "분주한 발걸음", role: "normalAttack" },
        { t: "attack", v: 9, name: "응급 호출", role: "specialAttack" }
      ]
    },
    {
      id: "nurse_spirit_watch",
      name: "마지막 순찰의 간호사",
      family: "간호사",
      emoji: "👩‍⚕️",
      grade: "elite",
      roles: ["support", "attacker"],
      maxHp: 56,
      x: 72,
      first: 0,
      moves: [
        { t: "defend", v: 9, name: "차트 정리", role: "defense" },
        { t: "attack", v: 9, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 13, name: "긴급 돌봄", role: "specialAttack" },
        { t: "debuff", v: 1, name: "야간 호출", role: "debuff" }
      ]
    },
    {
      id: "patient_spirit_waiting",
      name: "진료를 기다리던 환자",
      family: "환자",
      emoji: "😷",
      grade: "normal",
      roles: ["debuffer", "attacker"],
      maxHp: 40,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 6, name: "불안한 중얼거림", role: "normalAttack" },
        { t: "debuff", v: 1, name: "번지는 불안", role: "anxiety" },
        { t: "attack", v: 9, name: "떨리는 손짓", role: "specialAttack" },
        { t: "defend", v: 6, name: "담요 끌어안기", role: "defense" }
      ]
    },
    {
      id: "patient_spirit_iv",
      name: "링거를 끌던 환자",
      family: "환자",
      emoji: "😷",
      grade: "normal",
      roles: ["debuffer"],
      maxHp: 39,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "엉킨 링거줄", role: "anxiety" },
        { t: "attack", v: 6, name: "흔들리는 걸음", role: "normalAttack" },
        { t: "attack", v: 9, name: "차가운 수액", role: "specialAttack" },
        { t: "defend", v: 5, name: "링거대 붙잡기", role: "defense" }
      ]
    },
    {
      id: "mother_spirit",
      name: "아이를 기다린 환자",
      family: "환자",
      emoji: "👩",
      grade: "elite",
      roles: ["burst", "attacker"],
      maxHp: 54,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 9, name: "애타는 부름", role: "normalAttack" },
        { t: "attack", v: 10, name: "놓지 못한 손", role: "normalAttack" },
        { t: "attack", v: 14, name: "못다 한 약속", role: "specialAttack" },
        { t: "defend", v: 6, name: "품 안의 기억", role: "defense" }
      ]
    },
    {
      id: "grandfather_spirit",
      name: "약속을 남긴 환자",
      family: "환자",
      emoji: "👴",
      grade: "elite",
      roles: ["tank", "attacker"],
      maxHp: 62,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 9, name: "추억의 메아리", role: "normalAttack" },
        { t: "attack", v: 8, name: "오래된 이야기", role: "normalAttack" },
        { t: "attack", v: 12, name: "가족을 부르는 주문", role: "specialAttack" },
        { t: "defend", v: 10, name: "낡은 약속", role: "defense" }
      ]
    },
    {
      id: "doctor_spirit_intern",
      name: "기록을 놓친 의사",
      family: "의사",
      emoji: "👨‍⚕️",
      grade: "normal",
      roles: ["attacker"],
      maxHp: 37,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 7, name: "서툰 진찰", role: "normalAttack" },
        { t: "attack", v: 7, name: "빠른 문진", role: "normalAttack" },
        { t: "attack", v: 10, name: "급한 처방", role: "specialAttack" },
        { t: "defend", v: 6, name: "차트 확인", role: "defense" }
      ]
    },
    {
      id: "doctor_spirit",
      name: "회진을 멈추지 못한 의사",
      family: "의사",
      emoji: "👨‍⚕️",
      grade: "elite",
      roles: ["burst", "attacker"],
      maxHp: 52,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 10, name: "다급한 회진", role: "normalAttack" },
        { t: "attack", v: 9, name: "살피는 손길", role: "normalAttack" },
        { t: "attack", v: 13, name: "집중 진료", role: "specialAttack" },
        { t: "defend", v: 7, name: "진료 준비", role: "defense" }
      ]
    },
    {
      id: "ward_wraith",
      name: "비어 있는 404호",
      family: "공간",
      emoji: "🚪",
      grade: "boss",
      roles: ["boss", "debuffer", "tank"],
      maxHp: 80,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "꺼지지 않는 형광등", role: "anxiety" },
        { t: "defend", v: 10, name: "빈 침대의 그림자", role: "defense" },
        { t: "attack", v: 11, name: "커튼 뒤의 인기척", role: "normalAttack" },
        { t: "attack", v: 16, name: "병실이 닫히는 소리", role: "specialAttack" }
      ]
    },
    {
      id: "runner_spirit",
      name: "복도를 달리던 환자",
      family: "환자",
      emoji: "🏃",
      grade: "boss",
      roles: ["boss", "burst", "attacker"],
      maxHp: 76,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 10, name: "멈추지 못한 출발", role: "normalAttack" },
        { t: "defend", v: 8, name: "숨 고르기", role: "charge" },
        { t: "attack", v: 14, name: "복도 끝 질주", role: "specialAttack" }
      ],
      nextPhase: {
        name: "복도를 달리던 환자",
        maxHp: 82,
        x: 72,
        first: 0,
        moves: [
          { t: "attack", v: 11, name: "멈추지 못한 출발", role: "normalAttack" },
          { t: "attack", v: 12, name: "비틀린 보폭", role: "normalAttack" },
          { t: "debuff", v: 1, name: "잃어버린 트랙", role: "anxiety" },
          { t: "defend", v: 9, name: "다시 서려는 마음", role: "charge" },
          { t: "attack", v: 19, name: "마지막 질주", role: "burst", requiresPrevious: "defend" }
        ]
      }
    },
    {
      id: "surgery_doctor_spirit",
      name: "닫힌 수술실의 의사",
      family: "의사",
      emoji: "👨‍⚕️",
      grade: "boss",
      roles: ["boss", "counter", "attacker"],
      maxHp: 84,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 11, name: "차가운 지시", role: "normalAttack" },
        { t: "debuff", v: 1, name: "마취의 압박", role: "counter" },
        { t: "defend", v: 10, name: "수술 준비", role: "defense" },
        { t: "attack", v: 17, name: "닫힌 수술등", role: "specialAttack" }
      ]
    }
  ];

  const ENCOUNTERS = [
    { id: "stage_tutorial_child_spirit", label: "튜토리얼 - 이름을 잊은 아이", monsterIds: ["child_spirit"] },
    { id: "stage_grandmother_spirit", label: "기억을 붙든 노인", monsterIds: ["grandmother_spirit"] },
    { id: "stage_nurse_spirit", label: "야간 병동 간호사", monsterIds: ["nurse_spirit"] },
    { id: "stage_mother_spirit", label: "아이를 기다린 환자", monsterIds: ["mother_spirit"] },
    { id: "stage_grandfather_spirit", label: "약속을 남긴 환자", monsterIds: ["grandfather_spirit"] },
    { id: "stage_doctor_spirit", label: "회진을 멈추지 못한 의사", monsterIds: ["doctor_spirit"] },
    { id: "stage_ward_wraith", label: "비어 있는 404호", monsterIds: ["ward_wraith"] },
    { id: "stage_runner_spirit", label: "복도를 달리던 환자", monsterIds: ["runner_spirit"] },
    { id: "stage_surgery_doctor_spirit", label: "닫힌 수술실의 의사", monsterIds: ["surgery_doctor_spirit"] }
  ];

  const cloneMoveList = moves => Array.isArray(moves) ? moves.map(move => ({ ...move })) : [];
  const clonePhase = phase => phase ? ({
    ...phase,
    moves: cloneMoveList(phase.moves)
  }) : null;
  const cloneMonster = monster => ({
    ...monster,
    roles: Array.isArray(monster.roles) ? [...monster.roles] : undefined,
    moves: cloneMoveList(monster.moves),
    phases: Array.isArray(monster.phases) ? monster.phases.map(clonePhase) : undefined,
    nextPhase: clonePhase(monster.nextPhase)
  });

  data.monsterCatalog = MONSTER_DEFS.reduce((catalog, monster) => {
    catalog[monster.id] = cloneMonster(monster);
    return catalog;
  }, {});

  data.monsterGroups = MONSTER_DEFS.reduce((groups, monster) => {
    groups[monster.grade] = groups[monster.grade] || [];
    groups[monster.grade].push(monster.id);
    return groups;
  }, { tutorial: [], normal: [], elite: [], boss: [] });

  data.monsterEncounters = ENCOUNTERS.reduce((encounters, encounter) => {
    encounters[encounter.id] = {
      ...encounter,
      monsterIds: [...encounter.monsterIds]
    };
    return encounters;
  }, {});
  data.monsterEncounters.stage_child_spirit = {
    ...data.monsterEncounters.stage_tutorial_child_spirit,
    id: "stage_child_spirit"
  };

  data.monsterStageIds = ENCOUNTERS.map(encounter => [...encounter.monsterIds]);
  data.monsterStages = ENCOUNTERS.map(encounter => ({
    id: encounter.id,
    label: encounter.label,
    monsterIds: [...encounter.monsterIds],
    getMonsters(){
      return data.getEncounterMonsters(encounter.id);
    }
  }));

  data.getMonsterById = function getMonsterById(id){
    const monster = this.monsterCatalog[id];
    return monster ? cloneMonster(monster) : null;
  };

  data.getMonstersByIds = function getMonstersByIds(ids){
    if(!Array.isArray(ids)) return [];
    return ids.map(id => this.getMonsterById(id)).filter(Boolean);
  };

  data.getMonstersByGrade = function getMonstersByGrade(grade){
    return this.getMonstersByIds(this.monsterGroups[grade] || []);
  };

  data.getEncounterMonsters = function getEncounterMonsters(encounterId){
    const encounter = this.monsterEncounters[encounterId];
    return encounter ? this.getMonstersByIds(encounter.monsterIds) : [];
  };

  data.getStageMonsters = function getStageMonsters(stageKey){
    if(typeof stageKey === "string"){
      return this.getEncounterMonsters(stageKey);
    }
    return this.getMonstersByIds(this.monsterStageIds[stageKey] || []);
  };

  data.monsters = MONSTER_DEFS.map(cloneMonster);

  data.monsterPatternSystem = {
    countResolvedIntent(monster){
      if(!monster || !monster.intent) return;

      const intentType = monster.intent.t;
      if(monster.lastIntentType === intentType){
        monster.intentRepeatCount = (monster.intentRepeatCount || 1) + 1;
      }
      else {
        monster.lastIntentType = intentType;
        monster.intentRepeatCount = 1;
      }
    },

    pickNextIntent(monster){
      if(!monster || monster.hp <= 0 || !Array.isArray(monster.moves) || monster.moves.length === 0){
        return null;
      }

      const isBoss = monster.grade === "boss";
      const burstMoves = monster.moves.filter(move => move.role === "burst");
      if(isBoss && monster.lastIntentType === "defend" && burstMoves.length > 0){
        return burstMoves[Math.floor(Math.random() * burstMoves.length)];
      }

      const limitedGrades = ["tutorial", "normal", "elite"];
      const shouldLimitRepeat = limitedGrades.includes(monster.grade);
      const blockedTypes = new Set();

      if(monster.lastIntentType === "defend"){
        blockedTypes.add("defend");
      }
      if(shouldLimitRepeat && monster.lastIntentType && (monster.intentRepeatCount || 0) >= 2){
        blockedTypes.add(monster.lastIntentType);
      }

      const candidates = monster.moves.filter(move => {
        if(blockedTypes.has(move.t)) return false;
        if(isBoss && move.role === "burst") return false;
        if(move.requiresPrevious && move.requiresPrevious !== monster.lastIntentType) return false;
        return true;
      });
      const pool = candidates.length > 0 ? candidates : monster.moves;

      return pool[Math.floor(Math.random() * pool.length)];
    },

    planNextIntent(monster){
      if(!monster) return null;
      this.countResolvedIntent(monster);
      monster.intent = this.pickNextIntent(monster);
      return monster.intent;
    }
  };
})(window);
