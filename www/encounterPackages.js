"use strict";
/* =========================================================================
   ACT 1 전투 패키지 시스템 (encounterPackages.js)
   - G01~G25 일반, E01~E09 엘리트, B01~B02 보스 패키지 정의
   - 층·구간별 가중치 기반 패키지 선택 로직
   - window.ACT1_PICK_PACKAGE(nodeType, floor, usedIds) 함수 노출
   ========================================================================= */
(function(global){

  /* ── 패키지 정의 ────────────────────────────────────────────────────── */
  const PACKAGES = [

    // ── G01~G25: 일반 적 패키지 ─────────────────────────────────────────
    {
      id:"G01", nodeType:"enemy", grade:"normal",
      name:"병동을 헤매는 아이",
      monsterIds:["child_spirit_lost"],
      size:1, phaseTags:["early_low","early_high"],
      danger:1, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"G02", nodeType:"enemy", grade:"normal",
      name:"밤 복도를 걷는 아이",
      monsterIds:["child_spirit_night"],
      size:1, phaseTags:["early_low","early_high"],
      danger:1, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"G03", nodeType:"enemy", grade:"normal",
      name:"사진을 품은 노인",
      monsterIds:["grandmother_spirit_memory"],
      size:1, phaseTags:["early_low","early_high"],
      danger:1, tags:["노인"], maxAppearPerRun:1
    },
    {
      id:"G04", nodeType:"enemy", grade:"normal",
      name:"기록을 놓친 의사",
      monsterIds:["doctor_spirit_intern"],
      size:1, phaseTags:["early_low","early_high"],
      danger:1, tags:["의사"], maxAppearPerRun:1
    },
    {
      id:"G05", nodeType:"enemy", grade:"normal",
      name:"병동을 헤매는 아이 + 침대 밑에 숨은 아이",
      monsterIds:["child_spirit_lost","child_spirit_underbed"],
      size:2, phaseTags:["early_low","early_high","mid"],
      danger:2, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"G06", nodeType:"enemy", grade:"normal",
      name:"야간 병동 간호사 + 스테이션의 간호사",
      monsterIds:["nurse_spirit","nurse_spirit_lamp"],
      size:2, phaseTags:["early_low","early_high","mid"],
      danger:2, tags:["간호사"], maxAppearPerRun:1
    },
    {
      id:"G07", nodeType:"enemy", grade:"normal",
      name:"진료를 기다리던 환자 + 밤 복도를 걷는 아이",
      monsterIds:["patient_spirit_waiting","child_spirit_night"],
      size:2, phaseTags:["early_low","early_high","mid"],
      danger:2, tags:["환자","아이"], maxAppearPerRun:1
    },
    {
      id:"G08", nodeType:"enemy", grade:"normal",
      name:"링거를 끌던 환자 + 사진을 품은 노인",
      monsterIds:["patient_spirit_iv","grandmother_spirit_memory"],
      size:2, phaseTags:["early_low","early_high","mid"],
      danger:2, tags:["환자","노인"], maxAppearPerRun:1
    },
    {
      id:"G09", nodeType:"enemy", grade:"normal",
      name:"울음을 삼킨 아이 + 스테이션의 간호사",
      monsterIds:["child_spirit_swallowed","nurse_spirit_lamp"],
      size:2, phaseTags:["early_low","early_high","mid"],
      danger:2, tags:["아이","간호사"], maxAppearPerRun:1
    },
    {
      id:"G10", nodeType:"enemy", grade:"normal",
      name:"아이 3체 - 공격/불안/방어",
      monsterIds:["child_spirit_lost","child_spirit_night","child_spirit_underbed"],
      size:3, phaseTags:["mid","late_low"],
      danger:2, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"G11", nodeType:"enemy", grade:"normal",
      name:"간호사 3체 - 방어 지원+망설임",
      monsterIds:["nurse_spirit","nurse_spirit_lamp","nurse_spirit_soft"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["간호사"], maxAppearPerRun:1
    },
    {
      id:"G12", nodeType:"enemy", grade:"normal",
      name:"노인 3체 - 잡념/동요/불안",
      monsterIds:["grandmother_spirit_memory","grandmother_spirit_dream","grandmother_spirit_visit"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["노인"], maxAppearPerRun:1
    },
    {
      id:"G13", nodeType:"enemy", grade:"normal",
      name:"환자+의사 3체",
      monsterIds:["patient_spirit_waiting","patient_spirit_iv","doctor_spirit_intern"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["환자","의사"], maxAppearPerRun:1
    },
    {
      id:"G14", nodeType:"enemy", grade:"normal",
      name:"탱커 노인 + 간호사 3체",
      monsterIds:["grandmother_spirit","grandmother_spirit_memory","nurse_spirit"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["노인","간호사"], maxAppearPerRun:1
    },
    {
      id:"G15", nodeType:"enemy", grade:"normal",
      name:"호출 간호사 + 아이 3체",
      monsterIds:["nurse_spirit_callbell","child_spirit_lost","child_spirit_night"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["간호사","아이"], maxAppearPerRun:1
    },
    {
      id:"G16", nodeType:"enemy", grade:"normal",
      name:"폭딜+불안+방어 아이 3체",
      monsterIds:["child_spirit_swallowed","patient_spirit_waiting","child_spirit_underbed"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["아이","환자"], maxAppearPerRun:1
    },
    {
      id:"G17", nodeType:"enemy", grade:"normal",
      name:"방어 지원 3체",
      monsterIds:["nurse_spirit_soft","grandmother_spirit","grandmother_spirit_visit"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["간호사","노인"], maxAppearPerRun:1
    },
    {
      id:"G18", nodeType:"enemy", grade:"normal",
      name:"균형형 3체",
      monsterIds:["nurse_spirit_lamp","patient_spirit_iv","doctor_spirit_intern"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["간호사","환자","의사"], maxAppearPerRun:1
    },
    {
      id:"G19", nodeType:"enemy", grade:"normal",
      name:"운영 붕괴 3체",
      monsterIds:["nurse_spirit_callbell","grandmother_spirit_memory","grandmother_spirit_dream"],
      size:3, phaseTags:["mid","late_low"],
      danger:3, tags:["간호사","노인"], maxAppearPerRun:1
    },
    {
      id:"G20", nodeType:"enemy", grade:"normal",
      name:"아이 계열 총합 4체",
      monsterIds:["child_spirit_lost","child_spirit_night","child_spirit_underbed","child_spirit_swallowed"],
      size:4, phaseTags:["late_low","late_high"],
      danger:4, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"G21", nodeType:"enemy", grade:"normal",
      name:"간호사 계열 총합 4체",
      monsterIds:["nurse_spirit","nurse_spirit_lamp","nurse_spirit_soft","nurse_spirit_callbell"],
      size:4, phaseTags:["late_low","late_high"],
      danger:4, tags:["간호사"], maxAppearPerRun:1
    },
    {
      id:"G22", nodeType:"enemy", grade:"normal",
      name:"노인 계열 총합 4체",
      monsterIds:["grandmother_spirit","grandmother_spirit_memory","grandmother_spirit_dream","grandmother_spirit_visit"],
      size:4, phaseTags:["late_low","late_high"],
      danger:4, tags:["노인"], maxAppearPerRun:1
    },
    {
      id:"G23", nodeType:"enemy", grade:"normal",
      name:"공격+상태이상 4체",
      monsterIds:["patient_spirit_waiting","patient_spirit_iv","nurse_spirit","doctor_spirit_intern"],
      size:4, phaseTags:["late_low","late_high"],
      danger:4, tags:["환자","간호사","의사"], maxAppearPerRun:1
    },
    {
      id:"G24", nodeType:"enemy", grade:"normal",
      name:"방어 버티기 4체",
      monsterIds:["child_spirit_underbed","grandmother_spirit","nurse_spirit_lamp","grandmother_spirit_memory"],
      size:4, phaseTags:["late_low","late_high"],
      danger:4, tags:["아이","노인","간호사"], maxAppearPerRun:1
    },
    {
      id:"G25", nodeType:"enemy", grade:"normal",
      name:"고위험 일반 4체",
      monsterIds:["child_spirit_swallowed","nurse_spirit_callbell","patient_spirit_iv","grandmother_spirit_visit"],
      size:4, phaseTags:["late_low","late_high"],
      danger:5, tags:["아이","간호사","환자","노인"], maxAppearPerRun:1
    },

    // ── E01~E09: 엘리트 패키지 ──────────────────────────────────────────
    {
      id:"E01", nodeType:"elite", grade:"elite",
      name:"창가 침대의 아이",
      monsterIds:["child_spirit_window"],
      size:1, eliteType:"solo", phaseTags:["early_high"],
      danger:3, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"E02", nodeType:"elite", grade:"elite",
      name:"자장가를 흥얼대는 노인",
      monsterIds:["grandmother_spirit_echo"],
      size:1, eliteType:"solo", phaseTags:["early_high"],
      danger:3, tags:["노인"], maxAppearPerRun:1
    },
    {
      id:"E03", nodeType:"elite", grade:"elite",
      name:"마지막 순찰의 간호사",
      monsterIds:["nurse_spirit_watch"],
      size:1, eliteType:"solo", phaseTags:["early_high"],
      danger:3, tags:["간호사"], maxAppearPerRun:1
    },
    {
      id:"E04", nodeType:"elite", grade:"elite",
      name:"창가 침대의 아이 + 일반 2체",
      monsterIds:["child_spirit_window","child_spirit_underbed","child_spirit_night"],
      size:3, eliteType:"plus_normal", phaseTags:["mid","late_low"],
      danger:4, tags:["아이"], maxAppearPerRun:1
    },
    {
      id:"E05", nodeType:"elite", grade:"elite",
      name:"자장가를 흥얼대는 노인 + 일반 2체",
      monsterIds:["grandmother_spirit_echo","grandmother_spirit_memory","grandmother_spirit_visit"],
      size:3, eliteType:"plus_normal", phaseTags:["mid","late_low"],
      danger:4, tags:["노인"], maxAppearPerRun:1
    },
    {
      id:"E06", nodeType:"elite", grade:"elite",
      name:"마지막 순찰의 간호사 + 일반 2체",
      monsterIds:["nurse_spirit_watch","nurse_spirit_lamp","nurse_spirit_callbell"],
      size:3, eliteType:"plus_normal", phaseTags:["mid","late_low"],
      danger:4, tags:["간호사"], maxAppearPerRun:1
    },
    {
      id:"E07", nodeType:"elite", grade:"elite",
      name:"아이를 기다린 환자 + 일반 2체",
      monsterIds:["mother_spirit","patient_spirit_iv","patient_spirit_waiting"],
      size:3, eliteType:"plus_normal", phaseTags:["mid","late_low"],
      danger:4, tags:["환자"], maxAppearPerRun:1
    },
    {
      id:"E08", nodeType:"elite", grade:"elite",
      name:"창가 침대의 아이 + 회진을 멈추지 못한 의사",
      monsterIds:["child_spirit_window","doctor_spirit"],
      size:2, eliteType:"plus_elite", phaseTags:["late_low"],
      danger:5, tags:["아이","의사"], maxAppearPerRun:1
    },
    {
      id:"E09", nodeType:"elite", grade:"elite",
      name:"약속을 남긴 환자 + 아이를 기다린 환자",
      monsterIds:["grandfather_spirit","mother_spirit"],
      size:2, eliteType:"plus_elite", phaseTags:["late_low"],
      danger:5, tags:["환자"], maxAppearPerRun:1
    },

    // ── B01~B02: 보스 패키지 ────────────────────────────────────────────
    {
      id:"B01", nodeType:"boss", grade:"boss",
      name:"복도를 달리던 환자",
      monsterIds:["runner_spirit"],
      size:1, phaseTags:["boss"],
      danger:5, tags:["환자"], maxAppearPerRun:1
    },
    {
      id:"B02", nodeType:"boss", grade:"boss",
      name:"비어 있는 404호",
      monsterIds:["ward_wraith"],
      size:1, phaseTags:["boss"],
      danger:5, tags:["공간"], maxAppearPerRun:1
    },
  ];

  /* ── 구간 태그 ──────────────────────────────────────────────────────── */
  function getPhaseTag(floor){
    if(floor <= 3)  return "early_low";
    if(floor <= 5)  return "early_high";
    if(floor <= 10) return "mid";
    if(floor <= 13) return "late_low";
    if(floor <= 15) return "late_high";
    return "boss";
  }

  /* ── 일반 적 크기 가중치 (기획서 4-2) ──────────────────────────────── */
  const ENEMY_SIZE_WEIGHTS = {
    early_low:  { 1:50, 2:50, 3:0,  4:0  },
    early_high: { 1:20, 2:45, 3:35, 4:0  },
    mid:        { 1:0,  2:25, 3:55, 4:20 },
    late_low:   { 1:0,  2:10, 3:45, 4:45 },
    late_high:  { 1:0,  2:0,  3:50, 4:50 },
  };

  /* ── 엘리트 유형 가중치 (기획서 5-2) ───────────────────────────────── */
  const ELITE_TYPE_WEIGHTS = {
    early_high: { solo:100, plus_normal:0,  plus_elite:0  },
    mid:        { solo:50,  plus_normal:40, plus_elite:10 },
    late_low:   { solo:20,  plus_normal:50, plus_elite:30 },
  };

  /* ── 가중치 랜덤 선택 ───────────────────────────────────────────────── */
  function weightedPick(weights){
    const entries = Object.entries(weights);
    const total = entries.reduce((s,[,w])=>s+w, 0);
    if(total<=0) return entries[0][0];
    let r = Math.random() * total;
    for(const [key,w] of entries){ r-=w; if(r<=0) return key; }
    return entries[entries.length-1][0];
  }

  /* ── 패키지 선택 함수 ───────────────────────────────────────────────── */
  /*
    nodeType : "enemy" | "elite" | "boss"
    floor    : 현재 층 번호 (1~16)
    usedIds  : 이번 맵 생성에서 이미 사용된 패키지 ID Set (in-place 업데이트)
  */
  global.ACT1_PICK_PACKAGE = function(nodeType, floor, usedIds){
    usedIds = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
    const phase = getPhaseTag(floor);

    /* 후보 필터: 노드타입 + 구간태그 일치 + 미사용 */
    let candidates = PACKAGES.filter(pkg =>
      pkg.nodeType === nodeType &&
      pkg.phaseTags.includes(phase) &&
      !usedIds.has(pkg.id)
    );

    /* 후보 없으면 반복 제한 완화 */
    if(!candidates.length){
      candidates = PACKAGES.filter(pkg =>
        pkg.nodeType === nodeType && pkg.phaseTags.includes(phase)
      );
    }
    /* 그래도 없으면 null */
    if(!candidates.length) return null;

    let pick;

    if(nodeType === "enemy"){
      const sizeMap = ENEMY_SIZE_WEIGHTS[phase] || ENEMY_SIZE_WEIGHTS.mid;
      const targetSize = parseInt(weightedPick(sizeMap), 10);
      let pool = candidates.filter(p => p.size === targetSize);
      if(!pool.length) pool = candidates;
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    else if(nodeType === "elite"){
      const typeMap = ELITE_TYPE_WEIGHTS[phase] || ELITE_TYPE_WEIGHTS.mid;
      const targetType = weightedPick(typeMap);
      let pool = candidates.filter(p => p.eliteType === targetType);
      if(!pool.length) pool = candidates;
      pick = pool[Math.floor(Math.random() * pool.length)];
    }
    else {
      /* boss: 단순 랜덤 */
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if(pick) usedIds.add(pick.id);
    return pick || null;
  };

  global.ACT1_ENCOUNTER_PACKAGES = PACKAGES;

})(window);
