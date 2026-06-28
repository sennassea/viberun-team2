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
      name: "이름없는 아이",
      emoji: "👼",
      grade: "normal",
      maxHp: 32,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 5, name: "작은 울음", role: "normalAttack" },
        { t: "attack", v: 6, name: "손 내밀기", role: "normalAttack" },
        { t: "defend", v: 5, name: "이불 속 숨기", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit",
      name: "회상자",
      emoji: "👵",
      grade: "normal",
      maxHp: 48,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "debuff" },
        { t: "attack", v: 7, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 10, name: "그리움의 빛", role: "specialAttack" },
        { t: "defend", v: 6, name: "빛바랜 사진", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit",
      name: "야간 간호사",
      emoji: "👩‍⚕️",
      grade: "normal",
      maxHp: 40,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 8, name: "분주한 호출", role: "normalAttack" },
        { t: "attack", v: 7, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 10, name: "긴급 돌봄", role: "specialAttack" },
        { t: "defend", v: 6, name: "차트 정리", role: "defense" }
      ]
    },
    {
      id: "mother_spirit",
      name: "보호자",
      emoji: "👩",
      grade: "elite",
      maxHp: 52,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 9, name: "애타는 부름", role: "normalAttack" },
        { t: "attack", v: 10, name: "놓지 못한 손", role: "normalAttack" },
        { t: "attack", v: 12, name: "못다 한 약속", role: "specialAttack" },
        { t: "defend", v: 7, name: "품 안의 기억", role: "defense" }
      ]
    },
    {
      id: "grandfather_spirit",
      name: "낡은 약속",
      emoji: "👴",
      grade: "elite",
      maxHp: 58,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 10, name: "추억의 메아리", role: "normalAttack" },
        { t: "attack", v: 9, name: "오래된 이야기", role: "normalAttack" },
        { t: "attack", v: 12, name: "가족을 부르는 주문", role: "specialAttack" },
        { t: "defend", v: 8, name: "낡은 약속", role: "defense" }
      ]
    },
    {
      id: "doctor_spirit",
      name: "미련의 의사",
      emoji: "👨‍⚕️",
      grade: "elite",
      maxHp: 46,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 9, name: "다급한 회진", role: "normalAttack" },
        { t: "attack", v: 8, name: "살피는 손길", role: "normalAttack" },
        { t: "attack", v: 11, name: "집중 진료", role: "specialAttack" },
        { t: "defend", v: 7, name: "진료 준비", role: "defense" }
      ]
    },
    {
      id: "ward_wraith",
      name: "병실의 망령",
      emoji: "🛏️",
      grade: "elite",
      maxHp: 54,
      x: 72,
      first: 0,
      moves: [
        { t: "debuff", v: 1, name: "꺼지지 않는 형광등", role: "debuff" },
        { t: "attack", v: 9, name: "반복되는 신음", role: "normalAttack" },
        { t: "attack", v: 12, name: "닫힌 커튼", role: "specialAttack" },
        { t: "defend", v: 7, name: "빈 침대", role: "defense" }
      ]
    },
    {
      id: "runner_spirit",
      name: "마지막 주자",
      emoji: "🏃",
      grade: "boss",
      maxHp: 70,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 10, name: "멈추지 못한 출발", role: "normalAttack" },
        { t: "attack", v: 11, name: "비틀린 보폭", role: "normalAttack" },
        { t: "defend", v: 8, name: "다시 서려는 마음", role: "defense" },
        { t: "attack", v: 18, name: "마지막 질주", role: "burst", requiresPrevious: "defend" },
        { t: "debuff", v: 1, name: "잃어버린 트랙", role: "debuff" }
      ]
    }
  ];

  const ENCOUNTERS = [
    { id: "stage_child_spirit", label: "이름없는 아이", monsterIds: ["child_spirit"] },
    { id: "stage_grandmother_spirit", label: "회상자", monsterIds: ["grandmother_spirit"] },
    { id: "stage_nurse_spirit", label: "야간 간호사", monsterIds: ["nurse_spirit"] },
    { id: "stage_mother_spirit", label: "보호자", monsterIds: ["mother_spirit"] },
    { id: "stage_grandfather_spirit", label: "낡은 약속", monsterIds: ["grandfather_spirit"] },
    { id: "stage_doctor_spirit", label: "미련의 의사", monsterIds: ["doctor_spirit"] },
    { id: "stage_ward_wraith", label: "병실의 망령", monsterIds: ["ward_wraith"] },
    { id: "stage_runner_spirit", label: "마지막 주자", monsterIds: ["runner_spirit"] }
  ];

  const cloneMonster = monster => ({
    ...monster,
    moves: Array.isArray(monster.moves) ? monster.moves.map(move => ({ ...move })) : []
  });

  data.monsterCatalog = MONSTER_DEFS.reduce((catalog, monster) => {
    catalog[monster.id] = cloneMonster(monster);
    return catalog;
  }, {});

  data.monsterGroups = MONSTER_DEFS.reduce((groups, monster) => {
    groups[monster.grade] = groups[monster.grade] || [];
    groups[monster.grade].push(monster.id);
    return groups;
  }, { normal: [], elite: [], boss: [] });

  data.monsterEncounters = ENCOUNTERS.reduce((encounters, encounter) => {
    encounters[encounter.id] = {
      ...encounter,
      monsterIds: [...encounter.monsterIds]
    };
    return encounters;
  }, {});

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

  data.monsterPlacementRules = {
    normal: {
      label: "일반 몬스터 맵",
      grades: ["normal"]
    },
    elite: {
      label: "엘리트 몬스터 포함 맵",
      grades: ["normal", "elite"],
      defaultGradeCounts: {
        normal: 2,
        elite: 1
      }
    },
    boss: {
      label: "보스 맵",
      grades: ["normal", "elite", "boss"],
      defaultGradeCounts: {
        boss: 1
      }
    }
  };

  data.getMonsterPoolByStageType = function getMonsterPoolByStageType(stageType){
    const rule = this.monsterPlacementRules[stageType];
    if(!rule) return [];

    return rule.grades.flatMap(grade => this.getMonstersByGrade(grade));
  };

  data.getRandomMonsterByStageType = function getRandomMonsterByStageType(stageType){
    const pool = this.getMonsterPoolByStageType(stageType);
    if(pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)];
  };

  data.getRandomMonsterByGrade = function getRandomMonsterByGrade(grade){
    const pool = this.getMonstersByGrade(grade);
    if(pool.length === 0) return null;

    return pool[Math.floor(Math.random() * pool.length)];
  };

  data.getAutoStageMonstersByGradeCounts = function getAutoStageMonstersByGradeCounts(stageType, gradeCounts){
    const rule = this.monsterPlacementRules[stageType];
    if(!rule || !gradeCounts || typeof gradeCounts !== "object") return [];

    const allowedGrades = new Set(rule.grades);
    const monsters = [];

    Object.entries(gradeCounts).forEach(([grade, count]) => {
      if(!allowedGrades.has(grade)) return;

      const monsterCount = Math.max(0, Number(count) || 0);
      for(let i = 0; i < monsterCount; i += 1){
        const monster = this.getRandomMonsterByGrade(grade);
        if(monster) monsters.push(monster);
      }
    });

    return monsters;
  };

  data.getAutoStageMonsters = function getAutoStageMonsters(stageType, count){
    const rule = this.monsterPlacementRules[stageType];
    if(!rule) return [];

    if(count === undefined && rule.defaultGradeCounts){
      return this.getAutoStageMonstersByGradeCounts(stageType, rule.defaultGradeCounts);
    }

    if(count && typeof count === "object"){
      return this.getAutoStageMonstersByGradeCounts(stageType, count);
    }

    const monsterCount = Math.max(1, Number(count) || 1);
    const monsters = [];

    for(let i = 0; i < monsterCount; i += 1){
      const monster = this.getRandomMonsterByStageType(stageType);
      if(monster) monsters.push(monster);
    }

    return monsters;
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

      const limitedGrades = ["normal", "elite"];
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
