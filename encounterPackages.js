"use strict";
/* =========================================================================
   ACT 1 전투 패키지 시스템 (encounterPackages.js)
   - 병원(hospital) / 공원(park) / 학교(school) 3테마 분리형 전투 패키지
   - 일반 27개(테마별 9) + 엘리트 15개(테마별 5) + 보스 3개(테마별 1)
     + 튜토리얼 1개 = 총 46개 패키지
   - 같은 전투 안에서 서로 다른 테마의 몬스터가 섞이지 않도록,
     패키지 선택은 반드시 stageTheme으로 필터링된 풀 안에서만 이루어진다.
   - window.ACT1_PICK_STAGE_THEME(nodeType, floor, themeCounts) 함수 노출
   - window.ACT1_PICK_PACKAGE(nodeType, floor, usedIds, stageTheme) 함수 노출
   ========================================================================= */
(function(global){

  const THEME_LABELS = { hospital: "병원", park: "공원", school: "학교" };

  /* ── 패키지 메타데이터(이름/태그/설명) 생성 헬퍼 ───────────────────────
     monsterData.js가 먼저 로드되어 BOHYUN_COMBAT_DATA가 준비되어 있다는
     전제 하에, 몬스터 한글 이름/계열을 그대로 재사용해 패키지 이름과
     태그를 자동 생성한다. (이름/태그를 패키지마다 수기로 중복 관리하지
     않기 위함) */
  function getCombatData(){ return global.BOHYUN_COMBAT_DATA || null; }

  function buildName(monsterIds){
    const d = getCombatData();
    return monsterIds.map(id => {
      const mon = d && typeof d.getMonsterById === "function" ? d.getMonsterById(id) : null;
      return mon ? mon.name : id;
    }).join(" + ");
  }

  function buildTags(monsterIds){
    const d = getCombatData();
    const seen = new Set();
    const tags = [];
    monsterIds.forEach(id => {
      const mon = d && typeof d.getMonsterById === "function" ? d.getMonsterById(id) : null;
      const fam = mon && mon.family;
      if(fam && !seen.has(fam)){ seen.add(fam); tags.push(fam); }
    });
    return tags;
  }

  const DIFFICULTY_PHRASE = {
    easy: "기본 전투",
    medium: "중간 압박 전투",
    high: "고강도 전투",
    extreme: "초고강도 전투",
  };

  function buildIntent(themeLabel, difficulty, tags, opts){
    opts = opts || {};
    const phrase = DIFFICULTY_PHRASE[difficulty] || "전투";
    const tagPhrase = tags.length ? `${tags.join("와 ")} 압박을 체감한다` : "다양한 위협을 마주한다";
    if(opts.boss) return `${themeLabel} 보스 전투. ${tagPhrase}. 최종 위협과 마주한다.`;
    if(opts.elite) return `${themeLabel} 엘리트 ${phrase}. ${tagPhrase}.`;
    if(opts.tutorial) return `${themeLabel} 튜토리얼 전투. 기본 조작을 익힌다.`;
    return `${themeLabel} ${phrase}. ${tagPhrase}.`;
  }

  /* ── 구간 태그 규칙 (지시서 6장) ────────────────────────────────────── */
  const NORMAL_PHASE_TAGS = {
    easy:   ["early_low", "early_high"],
    medium: ["early_low", "early_high", "mid", "late_low"],
    high:   ["mid", "late_low", "late_high"],
  };
  const ELITE_PHASE_TAGS = {
    solo:        ["early_high", "mid", "late_low"],
    plus_normal: ["mid", "late_low"],
    plus_elite:  ["late_low", "late_high"],
  };
  const BOSS_PHASE_TAGS = ["boss"];
  const TUTORIAL_PHASE_TAGS = ["tutorial"];

  /* ── danger(1~5)는 실제 출현 확률 계산에는 쓰이지 않는 설명용 지표.
     실제 출현 빈도 제어는 difficulty 기반 getDangerWeight()가 담당한다. */
  const NORMAL_DANGER = { easy: 1, medium: 2, high: 3 };
  const ELITE_DANGER  = { solo: 3, plus_normal: 4, plus_elite: 5 };

  function buildNormalPackage(theme, id, difficulty, monsterIds){
    const themeLabel = THEME_LABELS[theme];
    const tags = buildTags(monsterIds);
    return {
      id, nodeType: "enemy", grade: "normal",
      theme, themeLabel,
      name: buildName(monsterIds),
      monsterIds: monsterIds.slice(),
      size: monsterIds.length,
      difficulty,
      danger: NORMAL_DANGER[difficulty] || 1,
      phaseTags: NORMAL_PHASE_TAGS[difficulty] || NORMAL_PHASE_TAGS.medium,
      tags,
      intent: buildIntent(themeLabel, difficulty, tags),
      maxAppearPerRun: 1,
    };
  }

  function buildElitePackage(theme, id, difficulty, eliteType, monsterIds){
    const themeLabel = THEME_LABELS[theme];
    const tags = buildTags(monsterIds);
    return {
      id, nodeType: "elite", grade: "elite",
      theme, themeLabel,
      name: buildName(monsterIds),
      monsterIds: monsterIds.slice(),
      size: monsterIds.length,
      difficulty,
      eliteType,
      danger: ELITE_DANGER[eliteType] || 3,
      phaseTags: ELITE_PHASE_TAGS[eliteType] || ELITE_PHASE_TAGS.plus_normal,
      tags,
      intent: buildIntent(themeLabel, difficulty, tags, { elite: true }),
      maxAppearPerRun: 1,
    };
  }

  function buildBossPackage(theme, id, monsterIds){
    const themeLabel = THEME_LABELS[theme];
    const tags = buildTags(monsterIds);
    return {
      id, nodeType: "boss", grade: "boss",
      theme, themeLabel,
      name: buildName(monsterIds),
      monsterIds: monsterIds.slice(),
      size: monsterIds.length,
      difficulty: "boss",
      danger: 5,
      phaseTags: BOSS_PHASE_TAGS.slice(),
      tags,
      intent: buildIntent(themeLabel, "boss", tags, { boss: true }),
      maxAppearPerRun: 1,
    };
  }

  function buildTutorialPackage(theme, id, difficulty, monsterIds){
    const themeLabel = THEME_LABELS[theme];
    const tags = buildTags(monsterIds);
    return {
      id, nodeType: "tutorial", grade: "tutorial",
      theme, themeLabel,
      name: buildName(monsterIds),
      monsterIds: monsterIds.slice(),
      size: monsterIds.length,
      difficulty,
      danger: 1,
      phaseTags: TUTORIAL_PHASE_TAGS.slice(),
      tags,
      intent: buildIntent(themeLabel, difficulty, tags, { tutorial: true }),
      maxAppearPerRun: 1,
    };
  }

  /* ── 5-2 / 5-4 / 5-6: 테마별 일반 전투 9개 ─────────────────────────── */
  const NORMAL_ROWS = {
    hospital: [
      ["HN01", "easy",   ["nurse_spirit", "patient_spirit_waiting"]],
      ["HN02", "easy",   ["child_spirit_underbed", "nurse_spirit"]],
      ["HN03", "medium", ["nurse_spirit_lamp", "patient_spirit_waiting"]],
      ["HN04", "medium", ["visitor_spirit_flower", "nurse_spirit"]],
      ["HN05", "medium", ["child_spirit_underbed", "nurse_spirit_lamp", "nurse_spirit"]],
      ["HN06", "medium", ["grandmother_spirit_visit", "patient_spirit_waiting", "nurse_spirit"]],
      ["HN07", "medium", ["nurse_spirit_lamp", "visitor_spirit_flower", "nurse_spirit"]],
      ["HN08", "high",   ["child_spirit_underbed", "grandmother_spirit_visit", "patient_spirit_waiting", "nurse_spirit"]],
      ["HN09", "high",   ["child_spirit_underbed", "nurse_spirit_lamp", "visitor_spirit_flower", "nurse_spirit"]],
    ],
    park: [
      ["PN01", "medium", ["child_spirit_lost", "child_spirit_swallowed"]],
      ["PN02", "easy",   ["grandmother_spirit", "child_spirit_lost"]],
      ["PN03", "medium", ["grandmother_spirit_memory", "child_spirit_lost"]],
      ["PN04", "medium", ["nurse_spirit_callbell", "child_spirit_lost"]],
      ["PN05", "medium", ["grandmother_spirit", "grandmother_spirit_memory", "child_spirit_lost"]],
      ["PN06", "high",   ["child_spirit_swallowed", "nurse_spirit_callbell", "patient_spirit_iv"]],
      ["PN07", "high",   ["grandmother_spirit", "patient_spirit_iv", "child_spirit_swallowed"]],
      ["PN08", "high",   ["child_spirit_lost", "child_spirit_swallowed", "nurse_spirit_callbell", "grandmother_spirit"]],
      ["PN09", "high",   ["grandmother_spirit_memory", "nurse_spirit_callbell", "child_spirit_swallowed", "child_spirit_lost"]],
    ],
    school: [
      ["SN01", "easy",   ["child_spirit_night", "cafeteria_spirit"]],
      ["SN02", "medium", ["doctor_spirit_intern", "child_spirit_night"]],
      ["SN03", "medium", ["grandmother_spirit_dream", "doctor_spirit_intern"]],
      ["SN04", "medium", ["locker_spirit", "nurse_spirit_soft"]],
      ["SN05", "medium", ["locker_spirit", "cafeteria_spirit", "doctor_spirit_intern"]],
      ["SN06", "high",   ["doctor_spirit_intern", "nurse_spirit_soft", "grandmother_spirit_dream"]],
      ["SN07", "high",   ["locker_spirit", "doctor_spirit_intern", "cafeteria_spirit"]],
      ["SN08", "high",   ["child_spirit_night", "grandmother_spirit_dream", "locker_spirit", "cafeteria_spirit"]],
      ["SN09", "high",   ["doctor_spirit_intern", "nurse_spirit_soft", "locker_spirit", "child_spirit_night"]],
    ],
  };

  /* ── 5-3 / 5-5 / 5-7: 테마별 엘리트 5개 ────────────────────────────── */
  const ELITE_ROWS = {
    hospital: [
      ["HE02", "medium",  "solo",        ["doctor_spirit"]],
      ["HE04", "high",    "plus_normal", ["mother_spirit", "visitor_spirit_flower"]],
      ["HE05", "high",    "plus_normal", ["doctor_spirit", "patient_spirit_waiting"]],
      ["HE06", "high",    "plus_normal", ["surgery_light_spirit", "nurse_spirit_lamp"]],
      ["HE08", "extreme", "plus_elite",  ["doctor_spirit", "surgery_light_spirit"]],
    ],
    park: [
      ["PE02", "medium",  "solo",        ["fountain_reflection_spirit"]],
      ["PE04", "high",    "plus_normal", ["grandfather_spirit", "grandmother_spirit_memory"]],
      ["PE06", "high",    "plus_normal", ["lost_picnic_spirit", "nurse_spirit_callbell"]],
      ["PE07", "high",    "plus_normal", ["lost_picnic_spirit", "child_spirit_swallowed"]],
      ["PE08", "extreme", "plus_elite",  ["grandfather_spirit", "fountain_reflection_spirit"]],
    ],
    school: [
      ["SE01", "medium",  "solo",        ["child_spirit_window"]],
      ["SE04", "high",    "plus_normal", ["child_spirit_window", "child_spirit_night", "grandmother_spirit_dream"]],
      ["SE06", "high",    "plus_normal", ["nurse_spirit_watch", "nurse_spirit_soft"]],
      ["SE07", "extreme", "plus_normal", ["nurse_spirit_watch", "doctor_spirit_intern", "cafeteria_spirit"]],
      ["SE08", "extreme", "plus_elite",  ["grandmother_spirit_echo", "nurse_spirit_watch"]],
    ],
  };

  /* ── 5-3 / 5-5 / 5-7: 테마별 보스 1개 ──────────────────────────────── */
  const BOSS_ROWS = {
    hospital: ["HB01", ["ward_wraith"]],
    park:     ["PB01", ["runner_spirit"]],
    school:   ["SB01", ["blank_exam_wraith"]],
  };

  /* ── 5-1: 학교 튜토리얼 1개 ────────────────────────────────────────── */
  const TUTORIAL_ROW = ["ST01", "school", "easy", ["child_spirit"]];

  const THEMES = ["hospital", "park", "school"];

  const PACKAGES = [
    buildTutorialPackage(TUTORIAL_ROW[1], TUTORIAL_ROW[0], TUTORIAL_ROW[2], TUTORIAL_ROW[3]),
  ];

  THEMES.forEach(theme => {
    NORMAL_ROWS[theme].forEach(([id, difficulty, monsterIds]) => {
      PACKAGES.push(buildNormalPackage(theme, id, difficulty, monsterIds));
    });
    ELITE_ROWS[theme].forEach(([id, difficulty, eliteType, monsterIds]) => {
      PACKAGES.push(buildElitePackage(theme, id, difficulty, eliteType, monsterIds));
    });
    const [bossId, bossMonsterIds] = BOSS_ROWS[theme];
    PACKAGES.push(buildBossPackage(theme, bossId, bossMonsterIds));
  });

  /* ── 구간 태그 (floor 기준) ─────────────────────────────────────────── */
  function getPhaseTag(floor){
    if(floor <= 3)  return "early_low";
    if(floor <= 5)  return "early_high";
    if(floor <= 10) return "mid";
    if(floor <= 13) return "late_low";
    if(floor <= 15) return "late_high";
    return "boss";
  }

  /* ── 일반 적 크기 가중치 (지시서 9장) : 2~4체 중심으로 조정 ─────────── */
  const ENEMY_SIZE_WEIGHTS = {
    early_low:  { 2:70, 3:30, 4:0  },
    early_high: { 2:45, 3:45, 4:10 },
    mid:        { 2:15, 3:55, 4:30 },
    late_low:   { 2:0,  3:45, 4:55 },
    late_high:  { 2:0,  3:30, 4:70 },
  };

  /* ── 엘리트 유형 가중치 ─────────────────────────────────────────────── */
  const ELITE_TYPE_WEIGHTS = {
    early_high: { solo:100, plus_normal:0,  plus_elite:0   },
    mid:        { solo:50,  plus_normal:40, plus_elite:10  },
    late_low:   { solo:20,  plus_normal:50, plus_elite:30  },
    late_high:  { solo:0,   plus_normal:0,  plus_elite:100 },
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

  /* ── danger 기반 가중치 (지시서 9장) : 고위험/초고위험 패키지 과다 출현 방지 ── */
  function getDangerWeight(pkg, phase){
    if(pkg.difficulty === "extreme") return phase === "late_high" ? 20 : 5;
    if(pkg.difficulty === "high")    return phase === "late_high" ? 60 : 35;
    if(pkg.difficulty === "medium")  return 70;
    return 90;
  }

  function weightedPackagePick(candidates, phase){
    const total = candidates.reduce((sum, pkg) => sum + getDangerWeight(pkg, phase), 0);
    if(total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
    let r = Math.random() * total;
    for(const pkg of candidates){
      r -= getDangerWeight(pkg, phase);
      if(r <= 0) return pkg;
    }
    return candidates[candidates.length - 1];
  }

  /* ── stageTheme 자동 선택 함수 (지시서 8장) ─────────────────────────────
     한 런 안에서 병원/공원/학교 패키지가 한쪽으로 몰리지 않도록,
     지금까지 가장 적게 나온 테마를 우선 선택한다. */
  global.ACT1_PICK_STAGE_THEME = function(nodeType, floor, themeCounts){
    themeCounts = themeCounts || {};
    const minCount = Math.min(...THEMES.map(t => themeCounts[t] || 0));
    const candidates = THEMES.filter(t => (themeCounts[t] || 0) === minCount);
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    themeCounts[picked] = (themeCounts[picked] || 0) + 1;
    return picked;
  };

  /* ── 패키지 선택 함수 (지시서 7장) ───────────────────────────────────────
    nodeType    : "enemy" | "elite" | "boss"
    floor       : 현재 층 번호 (1~16)
    usedIds     : 이번 맵 생성에서 이미 사용된 패키지 ID Set (in-place 업데이트)
    stageTheme  : "hospital" | "park" | "school" - 이 테마의 패키지 풀만 사용한다.
                  절대 다른 테마 몬스터를 섞지 않는다. */
  global.ACT1_PICK_PACKAGE = function(nodeType, floor, usedIds, stageTheme){
    usedIds = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
    const phase = getPhaseTag(floor);

    /* 후보 필터: 노드타입 + 구간태그 + 테마 일치 + 미사용 */
    let candidates = PACKAGES.filter(pkg =>
      pkg.nodeType === nodeType &&
      pkg.phaseTags.includes(phase) &&
      pkg.theme === stageTheme &&
      !usedIds.has(pkg.id)
    );

    /* 후보가 없을 때만 반복 제한을 완화한다. 테마 조건은 절대 풀지 않는다. */
    if(!candidates.length){
      candidates = PACKAGES.filter(pkg =>
        pkg.nodeType === nodeType &&
        pkg.phaseTags.includes(phase) &&
        pkg.theme === stageTheme
      );
    }
    if(!candidates.length) return null;

    let pick;

    if(nodeType === "enemy"){
      const sizeMap = ENEMY_SIZE_WEIGHTS[phase] || ENEMY_SIZE_WEIGHTS.mid;
      const targetSize = parseInt(weightedPick(sizeMap), 10);
      let pool = candidates.filter(p => p.size === targetSize);
      if(!pool.length) pool = candidates;
      pick = weightedPackagePick(pool, phase);
    }
    else if(nodeType === "elite"){
      const typeMap = ELITE_TYPE_WEIGHTS[phase] || ELITE_TYPE_WEIGHTS.mid;
      const targetType = weightedPick(typeMap);
      let pool = candidates.filter(p => p.eliteType === targetType);
      if(!pool.length) pool = candidates;
      pick = weightedPackagePick(pool, phase);
    }
    else {
      /* boss / tutorial: 테마당 1개뿐이므로 단순 랜덤 */
      pick = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if(pick) usedIds.add(pick.id);
    return pick || null;
  };

  global.ACT1_ENCOUNTER_PACKAGES = PACKAGES;

})(window);
