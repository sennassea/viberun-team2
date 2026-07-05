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

  const QUESTION_TAGS_BY_ID = {
    HN01:["RHYTHM","STATUS_LINK"], HN02:["PROTECT","RHYTHM"], HN03:["SUPPORT","STATUS_LINK"],
    HN04:["STATUS_LINK","RHYTHM"], HN05:["PROTECT","SUPPORT","RHYTHM"], HN06:["SCALING","STATUS_LINK","RHYTHM"],
    HN07:["SUPPORT","STATUS_LINK","RHYTHM"], HN08:["PROTECT","SCALING","STATUS_LINK","RHYTHM"], HN09:["PROTECT","SUPPORT","STATUS_LINK","RHYTHM"],
    HE02:["STATUS_LINK","BURST"], HE04:["RULE","STATUS_LINK"], HE05:["STATUS_LINK","BURST"], HE06:["HAND_PRESSURE","SUPPORT","BURST"], HE08:["STATUS_LINK","HAND_PRESSURE","BURST"],
    HB01:["SUMMON","PHASE","STATUS_LINK"],
    PN01:["ATTENTION","CHARGE"], PN02:["WEAK_LINK","ATTENTION"], PN03:["MEMORY_CLOG","ATTENTION"], PN04:["SUMMON","ATTENTION"],
    PN05:["WEAK_LINK","MEMORY_CLOG","ATTENTION"], PN06:["CHARGE","SUMMON","MEMORY_LINK"], PN07:["WEAK_LINK","MEMORY_LINK","CHARGE"],
    PN08:["ATTENTION","CHARGE","SUMMON","WEAK_LINK"], PN09:["MEMORY_CLOG","SUMMON","CHARGE","ATTENTION"],
    PE02:["REFLECTION","BURST"], PE04:["SCALING","MEMORY_CLOG"], PE06:["EMPTY_SEAT","SUMMON","SUPPORT"], PE07:["EMPTY_SEAT","CHARGE","SUPPORT"], PE08:["SCALING","REFLECTION","BURST"],
    PB01:["LAP","INTERRUPT","PHASE"],
    SN01:["ANXIETY_LINK","RESOURCE_RULE"], SN02:["RHYTHM","ANXIETY_LINK"], SN03:["WEAK_LINK","RHYTHM"], SN04:["HAND_LOCK","SUPPORT"],
    SN05:["HAND_LOCK","RESOURCE_RULE","RHYTHM"], SN06:["RHYTHM","SUPPORT","WEAK_LINK"], SN07:["HAND_LOCK","RHYTHM","RESOURCE_RULE"],
    SN08:["ANXIETY_LINK","WEAK_LINK","HAND_LOCK","RESOURCE_RULE"], SN09:["RHYTHM","SUPPORT","HAND_LOCK","ANXIETY_LINK"],
    SE01:["QUESTION","REGRET","BURST"], SE04:["QUESTION","ANXIETY_LINK","WEAK_LINK"], SE06:["DISCIPLINE","SUPPORT"], SE07:["DISCIPLINE","RHYTHM","RESOURCE_RULE"], SE08:["ECHO","DISCIPLINE","WEAK_LINK"],
    SB01:["EXAM","PHASE","STATUS_PRESSURE"]
  };

  const DECK_CHECK_TAGS_BY_ID = {
    HE02:["STATUS_RESILIENCE","DECK_CYCLE","SPEED_CHECK"], HE04:["HIGH_ACTION","TYPE_DIVERSITY"], HE05:["STATUS_RESILIENCE","SPEED_CHECK"],
    HE06:["HAND_RESILIENCE","DECK_CYCLE"], HE08:["STATUS_RESILIENCE","HAND_RESILIENCE","LONG_FIGHT"],
    HB01:["MULTI_TARGET","SUMMON_CONTROL","STATUS_RESILIENCE","PHASE_PLANNING","LONG_FIGHT"],
    PE02:["ATTACK_ORDER","BURST_CHECK"], PE04:["SPEED_CHECK","STATUS_RESILIENCE","LONG_FIGHT"], PE06:["KILL_ORDER","SUMMON_CONTROL","MULTI_TARGET"],
    PE07:["KILL_ORDER","BURST_CHECK"], PE08:["ATTACK_ORDER","SPEED_CHECK","LONG_FIGHT"],
    PB01:["BURST_CHECK","SPEED_CHECK","PHASE_PLANNING","LONG_FIGHT"],
    SE01:["TYPE_DIVERSITY","DECK_CYCLE"], SE04:["TYPE_DIVERSITY","STATUS_RESILIENCE","MULTI_TARGET"], SE06:["HIGH_ACTION","KILL_ORDER"],
    SE07:["HIGH_ACTION","RESOURCE_EFFICIENCY","TYPE_DIVERSITY"], SE08:["HIGH_ACTION","LONG_FIGHT","HAND_RESILIENCE"],
    SB01:["TYPE_DIVERSITY","DECK_CYCLE","STATUS_RESILIENCE","PHASE_PLANNING","LONG_FIGHT"]
  };

  const PHASE_TAGS_BY_ID = {
    HN01:["early_low","early_high"], HN02:["early_low","early_high"], HN03:["early_low","early_high","mid"], HN04:["early_low","early_high","mid"],
    HN05:["mid","late_low"], HN06:["early_high","mid","late_low"], HN07:["early_high","mid","late_low"], HN08:["mid","late_low","late_high"], HN09:["late_low","late_high"],
    HE02:["early_high","mid","late_low"], HE04:["mid","late_low"], HE05:["mid","late_low"], HE06:["mid","late_low"], HE08:["late_low","late_high"], HB01:["boss"],
    PN01:["early_high","mid"], PN02:["early_low","early_high"], PN03:["early_high","mid"], PN04:["early_high","mid"], PN05:["mid","late_low"],
    PN06:["mid","late_low"], PN07:["mid","late_low"], PN08:["late_low","late_high"], PN09:["late_low","late_high"],
    PE02:["early_high","mid","late_low"], PE04:["mid","late_low"], PE06:["mid","late_low"], PE07:["mid","late_low"], PE08:["late_low","late_high"], PB01:["boss"],
    SN01:["early_low","early_high"], SN02:["early_high","mid"], SN03:["early_high","mid"], SN04:["early_high","mid"], SN05:["mid","late_low"],
    SN06:["mid","late_low"], SN07:["mid","late_low"], SN08:["late_low","late_high"], SN09:["late_low","late_high"],
    SE01:["early_high","mid","late_low"], SE04:["mid","late_low"], SE06:["mid","late_low"], SE07:["late_low","late_high"], SE08:["late_low","late_high"], SB01:["boss"]
  };

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

  PACKAGES.forEach(pkg => {
    pkg.baseWeight = 1;
    pkg.questionTags = (QUESTION_TAGS_BY_ID[pkg.id] || []).slice();
    pkg.deckCheckTags = (DECK_CHECK_TAGS_BY_ID[pkg.id] || []).slice();
    if(PHASE_TAGS_BY_ID[pkg.id]) pkg.phaseTags = PHASE_TAGS_BY_ID[pkg.id].slice();
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

  const NORMAL_DIFFICULTY_WEIGHTS = {
    early_low:  { easy:70, medium:30, high:0,  extreme:0  },
    early_high: { easy:35, medium:60, high:5,  extreme:0  },
    mid:        { easy:10, medium:55, high:35, extreme:0  },
    late_low:   { easy:0,  medium:25, high:65, extreme:10 },
    late_high:  { easy:0,  medium:0,  high:75, extreme:25 },
  };

  const SIZE_FIT_MULTIPLIERS = {
    early_low:  { 2:1.25, 3:0.65, 4:0    },
    early_high: { 2:1.10, 3:1.00, 4:0.35 },
    mid:        { 2:0.65, 3:1.20, 4:0.80 },
    late_low:   { 2:0.25, 3:1.05, 4:1.15 },
    late_high:  { 2:0,    3:0.85, 4:1.20 },
  };

  const ELITE_DIFFICULTY_WEIGHTS = {
    early_low:  { medium:0,   high:0,  extreme:0  },
    early_high: { medium:100, high:0,  extreme:0  },
    mid:        { medium:45,  high:50, extreme:5  },
    late_low:   { medium:15,  high:70, extreme:15 },
    late_high:  { medium:0,   high:60, extreme:40 },
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

  function intersects(a, b){
    if(!Array.isArray(a) || !Array.isArray(b)) return false;
    return a.some(item => b.includes(item));
  }

  function hasNewTag(candidateTags, recentEntries, key){
    if(!Array.isArray(candidateTags) || !candidateTags.length) return false;
    const recentTags = new Set();
    recentEntries.forEach(entry => (entry[key] || []).forEach(tag => recentTags.add(tag)));
    return candidateTags.some(tag => !recentTags.has(tag));
  }

  function normalizeRecentHistory(recentHistory){
    if(Array.isArray(recentHistory)) return recentHistory.slice(-3);
    return getActualCombatHistory();
  }

  function getActualCombatHistory(){
    global.ACT1_COMBAT_HISTORY = Array.isArray(global.ACT1_COMBAT_HISTORY) ? global.ACT1_COMBAT_HISTORY : [];
    return global.ACT1_COMBAT_HISTORY.slice(-3);
  }

  function packageHistoryEntry(pkg, nodeType){
    return {
      packageId: pkg.id,
      theme: pkg.theme,
      nodeType: nodeType || pkg.nodeType,
      questionTags: (pkg.questionTags || []).slice(),
      deckCheckTags: (pkg.deckCheckTags || []).slice()
    };
  }

  global.ACT1_RECORD_PACKAGE_HISTORY = function(pkgOrId, nodeType){
    const pkg = typeof pkgOrId === "string" ? PACKAGES.find(item => item.id === pkgOrId) : pkgOrId;
    if(!pkg || !pkg.id) return null;
    global.ACT1_COMBAT_HISTORY = Array.isArray(global.ACT1_COMBAT_HISTORY) ? global.ACT1_COMBAT_HISTORY : [];
    const last = global.ACT1_COMBAT_HISTORY[global.ACT1_COMBAT_HISTORY.length - 1];
    if(last && last.packageId === pkg.id && last.nodeType === (nodeType || pkg.nodeType)) return last;
    const entry = packageHistoryEntry(pkg, nodeType);
    global.ACT1_COMBAT_HISTORY.push(entry);
    if(global.ACT1_COMBAT_HISTORY.length > 3) global.ACT1_COMBAT_HISTORY = global.ACT1_COMBAT_HISTORY.slice(-3);
    return entry;
  };

  global.ACT1_RESET_COMBAT_HISTORY = function(){
    global.ACT1_COMBAT_HISTORY = [];
  };

  global.ACT1_GET_COMBAT_HISTORY = getActualCombatHistory;

  function getQuestionMultiplier(pkg, recent){
    const tags = pkg.questionTags || [];
    if(!tags.length) return 1;
    const prev1 = recent[recent.length - 1];
    const prev2 = recent[recent.length - 2];
    let value = 1;
    if(prev1 && intersects(tags, prev1.questionTags)) value *= 0.55;
    if(prev2 && intersects(tags, prev2.questionTags)) value *= 0.75;
    if(hasNewTag(tags, recent.slice(-2), "questionTags")) value *= 1.20;
    return value;
  }

  function getDeckCheckMultiplier(pkg, recent){
    const tags = pkg.deckCheckTags || [];
    if(!tags.length) return 1;
    const prev1 = recent[recent.length - 1];
    const prev2 = recent[recent.length - 2];
    let value = 1;
    if(prev1 && intersects(tags, prev1.deckCheckTags)) value *= 0.70;
    if(prev2 && intersects(tags, prev2.deckCheckTags)) value *= 0.85;
    if(hasNewTag(tags, recent.slice(-2), "deckCheckTags")) value *= 1.10;
    return value;
  }

  function getPackageWeight(pkg, phase, nodeType, recent, options){
    options = options || {};
    let weight = pkg.baseWeight || 1;
    if(!options.ignorePackageRepeat && recent.slice(-3).some(entry => entry.packageId === pkg.id)) return 0;
    if(nodeType === "enemy"){
      const diffMap = NORMAL_DIFFICULTY_WEIGHTS[phase] || NORMAL_DIFFICULTY_WEIGHTS.mid;
      const sizeMap = SIZE_FIT_MULTIPLIERS[phase] || SIZE_FIT_MULTIPLIERS.mid;
      weight *= diffMap[pkg.difficulty] || 0;
      weight *= sizeMap[pkg.size] === undefined ? 1 : sizeMap[pkg.size];
    } else if(nodeType === "elite"){
      const diffMap = ELITE_DIFFICULTY_WEIGHTS[phase] || ELITE_DIFFICULTY_WEIGHTS.mid;
      weight *= diffMap[pkg.difficulty] || 0;
    }
    if(!options.ignoreQuestion) weight *= getQuestionMultiplier(pkg, recent);
    if(!options.ignoreDeckCheck) weight *= getDeckCheckMultiplier(pkg, recent);
    return weight;
  }

  function weightedPackagePick(candidates, phase, nodeType, recent, options){
    const weights = candidates.map(pkg => getPackageWeight(pkg, phase, nodeType, recent, options));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if(total <= 0) return candidates[Math.floor(Math.random() * candidates.length)];
    let r = Math.random() * total;
    for(let i = 0; i < candidates.length; i++){
      r -= weights[i];
      if(r <= 0) return candidates[i];
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
  global.ACT1_PICK_PACKAGE = function(nodeType, floor, usedIds, stageTheme, recentHistory){
    usedIds = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
    const phase = getPhaseTag(floor);
    const recent = normalizeRecentHistory(recentHistory);

    /* 후보 필터: 노드타입 + 구간태그 + 테마 일치 */
    let candidates = PACKAGES.filter(pkg =>
      pkg.nodeType === nodeType &&
      pkg.phaseTags.includes(phase) &&
      pkg.theme === stageTheme
    );

    if(!candidates.length) return null;

    let pick = weightedPackagePick(candidates, phase, nodeType, recent, {});
    if(!pick || getPackageWeight(pick, phase, nodeType, recent, {}) <= 0){
      pick = weightedPackagePick(candidates, phase, nodeType, recent, { ignorePackageRepeat:true });
    }
    if(!pick || getPackageWeight(pick, phase, nodeType, recent, { ignorePackageRepeat:true }) <= 0){
      pick = weightedPackagePick(candidates, phase, nodeType, recent, { ignorePackageRepeat:true, ignoreQuestion:true, ignoreDeckCheck:true });
    }

    if(pick) usedIds.add(pick.id);
    return pick || null;
  };

  global.ACT1_ENCOUNTER_PACKAGES = PACKAGES;
  global.ACT1_GET_PACKAGE_WEIGHT = getPackageWeight;
  global.ACT1_GET_PHASE_TAG = getPhaseTag;

})(window);
