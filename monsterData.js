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

  const cloneMonster = monster => ({
    ...monster,
    moves: Array.isArray(monster.moves) ? monster.moves.map(move => ({ ...move })) : []
  });

  global.BOHYUN_COMBAT_DATA.monsters.forEach(monster => {
    monster.grade = monster.id === "runner_spirit" ? "boss" : "normal";
  });

  const loreMoveDrafts = {
    child_spirit: [
      { t: "attack", v: 5, name: "간절한 울음", role: "normalAttack" },
      { t: "attack", v: 6, name: "손을 잡아끌기", role: "normalAttack" },
      { t: "defend", v: 5, name: "작은 기다림", role: "defense" }
    ],
    grandmother_spirit: [
      { t: "attack", v: 7, name: "따뜻한 회상", role: "normalAttack" },
      { t: "attack", v: 7, name: "오래된 자장가", role: "normalAttack" },
      { t: "attack", v: 10, name: "그리움의 빛", role: "specialAttack" },
      { t: "defend", v: 6, name: "빛바랜 사진", role: "defense" }
    ],
    nurse_spirit: [
      { t: "attack", v: 8, name: "분주한 호출", role: "normalAttack" },
      { t: "attack", v: 7, name: "조심스런 처치", role: "normalAttack" },
      { t: "attack", v: 10, name: "긴급 돌봄", role: "specialAttack" },
      { t: "defend", v: 6, name: "차트 정리", role: "defense" }
    ],
    runner_spirit: [
      { t: "attack", v: 10, name: "멈추지 못한 출발", role: "normalAttack" },
      { t: "attack", v: 11, name: "비틀린 보폭", role: "normalAttack" },
      { t: "defend", v: 8, name: "다시 서려는 마음", role: "defense" },
      { t: "attack", v: 18, name: "마지막 질주", role: "burst", requiresPrevious: "defend" },
      { t: "debuff", v: 1, name: "잃어버린 트랙", role: "debuff" }
    ]
  };

  global.BOHYUN_COMBAT_DATA.monsters.forEach(monster => {
    if(loreMoveDrafts[monster.id]){
      monster.moves = loreMoveDrafts[monster.id].map(move => ({ ...move }));
    }
  });

  const extraMonsters = [
    { id:"mother_spirit", name:"엄마 유령", emoji:"👩", maxHp:52, x:72, first:0,
      grade:"elite", moves:[{t:"attack",v:9,name:"애타는 손길",role:"normalAttack"},{t:"attack",v:10,name:"이름 부르기",role:"normalAttack"},{t:"attack",v:12,name:"못다 한 약속",role:"specialAttack"},{t:"defend",v:7,name:"품 안의 기억",role:"defense"}] },
    { id:"grandfather_spirit", name:"할아버지 유령", emoji:"👴", maxHp:58, x:72, first:0,
      grade:"elite", moves:[{t:"attack",v:10,name:"추억의 메아리",role:"normalAttack"},{t:"attack",v:9,name:"오래된 이야기",role:"normalAttack"},{t:"attack",v:12,name:"가족을 부르는 주문",role:"specialAttack"},{t:"defend",v:8,name:"오래된 약속",role:"defense"}] },
    { id:"doctor_spirit", name:"의사 유령", emoji:"👨‍⚕️", maxHp:44, x:72, first:0,
      grade:"elite", moves:[{t:"attack",v:9,name:"다급한 회진",role:"normalAttack"},{t:"attack",v:8,name:"살피는 손길",role:"normalAttack"},{t:"attack",v:11,name:"집중 진료",role:"specialAttack"},{t:"defend",v:6,name:"진료 준비",role:"defense"}] }
  ];

  global.BOHYUN_COMBAT_DATA.baseMonsters = global.BOHYUN_COMBAT_DATA.monsters.map(cloneMonster);
  global.BOHYUN_COMBAT_DATA.monsterCatalog = [
    ...global.BOHYUN_COMBAT_DATA.baseMonsters,
    ...extraMonsters
  ].reduce((catalog, monster) => {
    catalog[monster.id] = cloneMonster(monster);
    return catalog;
  }, {});

  global.BOHYUN_COMBAT_DATA.monsterGroups = {
    normal: ["child_spirit", "grandmother_spirit", "nurse_spirit"],
    elite: ["mother_spirit", "grandfather_spirit", "doctor_spirit"],
    boss: ["runner_spirit"]
  };

  const monsterEncounterList = [
    { id: "stage_child_spirit", label: "아이 유령", monsterIds: ["child_spirit"] },
    { id: "stage_grandmother_spirit", label: "할머니 유령", monsterIds: ["grandmother_spirit"] },
    { id: "stage_nurse_spirit", label: "간호사 유령", monsterIds: ["nurse_spirit"] },
    { id: "stage_mother_spirit", label: "엄마 유령", monsterIds: ["mother_spirit"] },
    { id: "stage_grandfather_spirit", label: "할아버지 유령", monsterIds: ["grandfather_spirit"] },
    { id: "stage_doctor_spirit", label: "의사 유령", monsterIds: ["doctor_spirit"] },
    { id: "stage_runner_spirit", label: "육상선수 유령", monsterIds: ["runner_spirit"] }
  ];

  global.BOHYUN_COMBAT_DATA.monsterEncounters = monsterEncounterList.reduce((encounters, encounter) => {
    encounters[encounter.id] = {
      ...encounter,
      monsterIds: [...encounter.monsterIds]
    };
    return encounters;
  }, {});

  global.BOHYUN_COMBAT_DATA.monsterStageIds = monsterEncounterList.map(encounter => [...encounter.monsterIds]);

  global.BOHYUN_COMBAT_DATA.getMonsterById = function getMonsterById(id){
    const monster = this.monsterCatalog[id];
    return monster ? cloneMonster(monster) : null;
  };

  global.BOHYUN_COMBAT_DATA.getMonstersByIds = function getMonstersByIds(ids){
    if(!Array.isArray(ids)) return [];
    return ids.map(id => this.getMonsterById(id)).filter(Boolean);
  };

  global.BOHYUN_COMBAT_DATA.getMonstersByGrade = function getMonstersByGrade(grade){
    return this.getMonstersByIds(this.monsterGroups[grade] || []);
  };

  global.BOHYUN_COMBAT_DATA.getEncounterMonsters = function getEncounterMonsters(encounterId){
    const encounter = this.monsterEncounters[encounterId];
    return encounter ? this.getMonstersByIds(encounter.monsterIds) : [];
  };

  global.BOHYUN_COMBAT_DATA.getStageMonsters = function getStageMonsters(stageKey){
    if(typeof stageKey === "string"){
      return this.getEncounterMonsters(stageKey);
    }
    return this.getMonstersByIds(this.monsterStageIds[stageKey] || []);
  };

  global.BOHYUN_COMBAT_DATA.monsterStages = monsterEncounterList.map(encounter => ({
    id: encounter.id,
    label: encounter.label,
    monsterIds: [...encounter.monsterIds],
    getMonsters(){
      return global.BOHYUN_COMBAT_DATA.getEncounterMonsters(encounter.id);
    }
  }));

  global.BOHYUN_COMBAT_DATA.monsters.splice(
    0,
    global.BOHYUN_COMBAT_DATA.monsters.length,
    ...global.BOHYUN_COMBAT_DATA.getMonstersByGrade("normal")
  );

  global.BOHYUN_COMBAT_DATA.monsterPatternSystem = {
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
