"use strict";
/* =========================================================================
   Combat Controller – ACT 1 패키지 다중 적 전투
   패키지 내 모든 몬스터를 전투 시작 시 동시 배치, 전멸 시 노드 클리어
   ========================================================================= */

const COMBAT_DATA    = window.BOHYUN_COMBAT_DATA || {};
const LIFE           = window.BOHYUN_LIFE_SYSTEM;
const MONSTER_PATTERN = COMBAT_DATA.monsterPatternSystem;

if(
  !COMBAT_DATA.character ||
  !Array.isArray(COMBAT_DATA.monsters) ||
  !LIFE ||
  !MONSTER_PATTERN ||
  typeof CARD_DB          === "undefined" ||
  typeof BASE_STARTER_DECK === "undefined" ||
  typeof STARTER_DECK      === "undefined" ||
  typeof CARD_REWARD_POOL  === "undefined" ||
  typeof RELIC_DB          === "undefined" ||
  typeof typeLabel         === "undefined"
){
  throw new Error("캐릭터/몬스터/라이프/주문 데이터 파일이 먼저 로드되어야 합니다.");
}

const PLAYER_DEF   = COMBAT_DATA.character;
const MONSTER_DEFS = COMBAT_DATA.monsters; // loadStageMonsters()가 패키지 몬스터로 채운다
const STATUS_DATA  = window.BOHYUN_STATUS_DATA || window.STATUS_DATA || {
  agitation:{ id:"agitation", legacyKey:"weak", name:"동요", shortName:"동요", icon:"🌀", color:"#5577ff", description:"적의 공격 피해가 25% 감소합니다.", decayTiming:"afterEnemyAction", decayAmount:1, decayTimingText:"행동 종료 시 1 감소합니다.", maxStack:99, showOnEnemy:true },
  mark:{ id:"mark", legacyKey:"mark", name:"성불 표식", shortName:"성불 표식", icon:"🌸", color:"#ff6fb1", description:"일부 성불 주문이 추가 효과를 얻습니다. 표식을 소모하는 주문에 의해 제거됩니다.", maxStack:99, showOnEnemy:true },
  fracture:{ id:"fracture", legacyKey:"fracture", name:"균열", shortName:"균열", icon:"💔", color:"#d94a68", description:"받는 정화 피해가 25% 증가합니다.", decayTiming:"afterEnemyAction", decayAmount:1, decayTimingText:"대상 턴 종료 시 1 감소합니다.", maxStack:99, showOnEnemy:true },
  recollection:{ id:"recollection", name:"회상", shortName:"회상", icon:"🕯️", color:"#b58cff", description:"해제되기 전까지 매 턴마다 수치만큼 정화 피해를 받습니다.", decayTiming:"afterEnemyAction", decayAmount:1, decayTimingText:"대상 턴 종료 시 1 감소합니다.", maxStack:99, showOnEnemy:true }
};

// 상태 아이콘/이름 고정 매핑
// - 동요: 🌀
// - 성불 표식: 🌸
// StatusData.js가 캐시되거나 이전 버전이 섞여도 여기서 최종 보정합니다.
function normalizeStatusDataFixedMapping(){
  if(!STATUS_DATA || typeof STATUS_DATA !== "object") return;
  STATUS_DATA.agitation = {
    ...(STATUS_DATA.agitation || {}),
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
  };
  STATUS_DATA.mark = {
    ...(STATUS_DATA.mark || {}),
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
  };
  STATUS_DATA.fracture = {
    ...(STATUS_DATA.fracture || {}),
    id: "fracture",
    legacyKey: "fracture",
    name: "균열",
    shortName: "균열",
    icon: "💔",
    iconImage: "",
    color: "#d94a68",
    description: "받는 정화 피해가 25% 증가합니다.",
    decayTiming: "afterEnemyAction",
    decayAmount: 1,
    decayTimingText: "대상 턴 종료 시 1 감소합니다.",
    maxStack: 99,
    showOnEnemy: true
  };
  STATUS_DATA.recollection = {
    ...(STATUS_DATA.recollection || {}),
    id: "recollection",
    name: "회상",
    shortName: "회상",
    icon: "🕯️",
    iconImage: "",
    color: "#b58cff",
    description: "해제되기 전까지 매 턴마다 수치만큼 정화 피해를 받습니다.",
    decayTiming: "afterEnemyAction",
    decayAmount: 1,
    decayTimingText: "대상 턴 종료 시 1 감소합니다.",
    maxStack: 99,
    showOnEnemy: true
  };
}
normalizeStatusDataFixedMapping();
Object.assign(STATUS_DATA.agitation, { iconImage: "assets/status_icons/agitation.png" });
Object.assign(STATUS_DATA.mark, { iconImage: "assets/status_icons/mark.png" });
Object.assign(STATUS_DATA.fracture, { iconImage: "assets/status_icons/fracture.png" });
Object.assign(STATUS_DATA.recollection, { iconImage: "assets/status_icons/recollection.png" });
if(STATUS_DATA.anxiety) Object.assign(STATUS_DATA.anxiety, { iconImage: "assets/status_icons/anxiety.png" });
if(STATUS_DATA.lethargy) Object.assign(STATUS_DATA.lethargy, { iconImage: "assets/status_icons/lethargy.png" });

const MAX_ENERGY        = 3;
const ENERGY_SLOT_COUNT = 8;
const DRAW_PER_TURN     = 5;
const BALANCE_CONFIG     = window.BOHYUN_BALANCE || {};
const STARTING_GOLD     = Number.isFinite(BALANCE_CONFIG.startGold) ? BALANCE_CONFIG.startGold : 100;
const STARTING_MOON_SHARDS = 0;
const BASIC_SUMMON_MONSTER_BY_THEME = {
  hospital: "nurse_spirit",
  park: "child_spirit_lost",
  school: "cafeteria_spirit"
};
const BATTLE_BACKGROUND_BY_THEME = {
  hospital: [
    "assets/background/hospital_01_station.jpg",
    "assets/background/hospital_02_ward.jpg",
    "assets/background/hospital_03_corridor_night.jpg"
  ],
  park: [
    "assets/background/park_01_playground_day.jpg",
    "assets/background/park_02_fountain_sunset.jpg",
    "assets/background/park_03_court_night.jpg"
  ],
  school: [
    "assets/background/school_01_classroom_day.jpg",
    "assets/background/school_02_hallway_sunset.jpg",
    "assets/background/school_03_music_room_night.jpg"
  ]
};
const BATTLE_THEME_LABELS = {
  hospital: "병원",
  park: "공원",
  school: "학교",
  tutorial: "튜토리얼"
};
const TUTORIAL_BATTLE_BACKGROUND = {
  theme: "tutorial",
  url: "assets/background/shrine_01_main.jpg"
};

let S;
let RUN_STATE = null;

function cloneRunArray(list){
  return Array.isArray(list) ? list.map(item => (item && typeof item === "object") ? { ...item } : item) : [];
}

function createFreshRunState(){
  const player = LIFE.createPlayer(PLAYER_DEF);
  player.block = 0;
  return {
    player,
    deck: [...BASE_STARTER_DECK],
    relics: [],
    potions: [],
    gold: STARTING_GOLD,
    moonShards: STARTING_MOON_SHARDS,
    // 기도터 "정리하기"(주문 제거)를 이번 런에서 사용한 횟수 - 새 런 시작 시 0으로 초기화
    cleanseCount: 0,
    // 전투 요약/상세 화면(runResult.js)에서 사용하는 이번 여정 누적 기록 (기획서 §5-1)
    runStats: {
      startedAt: Date.now(),
      cleared: { enemy: 0, elite: 0, boss: 0 },
      usedPotionCount: 0,
      usedPotions: [],
      route: [{ stageIndex: -1, type: "start" }]
    }
  };
}

function recordBattleClear(nodeType){
  if(!RUN_STATE || !RUN_STATE.runStats || !RUN_STATE.runStats.cleared) return;
  if(nodeType !== "enemy" && nodeType !== "elite" && nodeType !== "boss") return;
  RUN_STATE.runStats.cleared[nodeType] += 1;
}

function recordPotionUsed(potion){
  if(!RUN_STATE || !RUN_STATE.runStats) return;
  RUN_STATE.runStats.usedPotionCount = (RUN_STATE.runStats.usedPotionCount || 0) + 1;
  if(potion && potion.id){
    if(!Array.isArray(RUN_STATE.runStats.usedPotions)) RUN_STATE.runStats.usedPotions = [];
    RUN_STATE.runStats.usedPotions.push({ id: potion.id, name: potion.name, emoji: potion.emoji });
  }
}

function beginNewRun(){
  RUN_STATE = createFreshRunState();
  STARTER_DECK = [...RUN_STATE.deck];
  S = null;
  return RUN_STATE;
}

function syncRunStateFromCombat(){
  if(!S || !S.player) return;
  if(!RUN_STATE) RUN_STATE = createFreshRunState();
  RUN_STATE.player = {
    ...RUN_STATE.player,
    hp: S.player.hp,
    maxHp: S.player.maxHp
  };
  RUN_STATE.deck       = [...STARTER_DECK];
  RUN_STATE.relics     = cloneRunArray(S.relics);
  RUN_STATE.potions    = cloneRunArray(S.potions);
  RUN_STATE.gold       = typeof S.gold === "number" ? S.gold : STARTING_GOLD;
  RUN_STATE.moonShards = typeof S.moonShards === "number" ? S.moonShards : STARTING_MOON_SHARDS;
  RUN_STATE.cleanseCount = typeof S.cleanseCount === "number" ? S.cleanseCount : 0;
}

function hasRelic(id){
  return !!(S && Array.isArray(S.relics) && S.relics.some(r => r && r.id === id));
}

function getMaxEnergy(){
  return MAX_ENERGY + (hasRelic("charm_box") ? 1 : 0);
}

function getPlayerAttackDamage(rawDamage, targetEnemy){
  let amount = rawDamage;
  if(S && S.nextAttackMultiplier){
    amount = Math.floor(amount * S.nextAttackMultiplier);
    S.nextAttackMultiplier = null;
  }
  if(S && Array.isArray(S.relics)){
    S.relics = S.relics.map(hydrateRelicData);
    S.relics.forEach(relic => {
      if(!relic || !Array.isArray(relic.fx)) return;
      relic.fx.forEach(effect => {
        if(!effect) return;
        if(effect.timing === "firstAttack" && effect.t === "damagePlus" && !S.firstAttackUsed){
          amount += effect.v || 0;
          S.firstAttackUsed = true;
        }
        if(effect.timing !== "damage") return;
        if(effect.t === "damagePlus") amount += effect.v || 0;
        if(effect.t === "damagePlusVsAgitated" && targetEnemy && (targetEnemy.weak || 0) > 0) amount += effect.v || 0;
        if(effect.t === "damagePlusVsMarked" && targetEnemy && (targetEnemy.mark || 0) > 0) amount += effect.v || 0;
      });
    });
  }
  return Math.max(0, amount);
}

function gainPlayerBlock(value){
  const requested = Math.max(0, value || 0);
  const before = S && S.player ? (S.player.block || 0) : 0;
  LIFE.addBlock(S.player, requested);
  const gained = Math.max(0, (S.player.block || 0) - before);
  if(requested > 0){
    S.blockGainedThisTurn = (S.blockGainedThisTurn || 0) + requested;
  }
  if(gained > 0){
    spawnFloat('.player', '+'+gained, 'blk');
    applyRelicTrigger("onBlockGain", { amount: gained });
  }
  return gained;
}

function getRelicMasterData(id){
  if(!id || typeof RELIC_DB === "undefined" || !Array.isArray(RELIC_DB)) return null;
  return RELIC_DB.find(item => item && item.id === id) || null;
}

function hydrateRelicData(relic){
  if(!relic || !relic.id) return relic;
  const master = getRelicMasterData(relic.id);
  if(!master) return relic;
  // 상점/저장/이전 세이브에서 id·name·desc만 남은 법구도 실제 효과가 발동되도록 원본 DB 데이터를 병합합니다.
  return { ...master, ...relic, fx: Array.isArray(relic.fx) ? relic.fx : master.fx };
}

function applyRelicTrigger(trigger, context={}){
  if(!S || !Array.isArray(S.relics)) return;
  S.relics = S.relics.map(hydrateRelicData);
  S.relics.forEach(relic => {
    if(!relic || !Array.isArray(relic.fx)) return;
    relic.fx.forEach(effect => {
      if(effect.timing !== trigger) return;
      applyRelicEffect(relic, effect, context);
    });
  });
}

function applyRelicEffect(relic, effect, context={}){
  switch(effect.t){
    case "draw":
      if(effect.oncePerTurn){
        S.relicTurnFlags = S.relicTurnFlags || {};
        const key = relic.id + ":" + effect.t + ":" + S.turn;
        if(S.relicTurnFlags[key]) return;
        S.relicTurnFlags[key] = true;
      }
      drawCards(effect.v || 1);
      toast(relic.name+" 발동");
      break;
    case "heal": {
      const healed = LIFE.heal(S.player, effect.v || 0);
      if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
      toast(relic.name+" 발동");
      break;
    }
    case "block":
      gainPlayerBlock(effect.v || 0);
      toast(relic.name+" 발동");
      break;
    case "damageRandomEnemy": {
      const targets = livingEnemies();
      if(targets.length){
        const target = targets[Math.floor(Math.random()*targets.length)];
        applyDamageWithFeedback(target, effect.v || 0, 0);
      }
      break;
    }
    case "gainRandomPotion": {
      const potion = getRandomPotionReward();
      const limit = typeof POTION_SLOT_LIMIT === "number" ? POTION_SLOT_LIMIT : 3;
      if(potion && Array.isArray(S.potions) && S.potions.length < limit){
        S.potions.push({ ...potion });
        toast(relic.name+" 발동: "+potion.name+" 획득");
      }
      break;
    }
    case "applyAgitation": {
      const target = effect.target === "frontEnemy" ? livingEnemies()[0] : getSelectedLivingEnemy();
      if(target){
        addStatus(target, "agitation", effect.v || 1);
        applyRelicTrigger("onAgitationApply", { target, amount: effect.v || 1 });
      }
      break;
    }
    case "applyMark": {
      const target = effect.target === "frontEnemy" ? livingEnemies()[0] : getSelectedLivingEnemy();
      if(target){
        addStatus(target, "mark", effect.v || 1);
        applyRelicTrigger("onMarkApply", { target, amount: effect.v || 1 });
      }
      break;
    }
    case "markPlus": {
      const target = context.target || getSelectedLivingEnemy();
      if(target) addStatus(target, "mark", effect.v || 1);
      break;
    }
    case "retainBlockRatio":
      S.retainedBlockFromRelic = Math.floor((S.player.block || 0) * (effect.v || 0));
      break;
  }
}

function tryApplyFatalRelic(){
  if(!S || !S.player || S.player.hp > 0 || !Array.isArray(S.relics)) return false;
  S.relics = S.relics.map(hydrateRelicData);
  const relicIndex = S.relics.findIndex(relic =>
    relic && Array.isArray(relic.fx) && relic.fx.some(effect =>
      effect && effect.timing === "fatalDamage" && effect.t === "revive"
    )
  );
  if(relicIndex < 0) return false;

  const relic = S.relics[relicIndex];
  const effect = relic.fx.find(fx => fx && fx.timing === "fatalDamage" && fx.t === "revive");
  const ratio = typeof effect.v === "number" ? effect.v : 0.5;
  const healValue = Math.max(1, Math.floor((S.player.maxHp || 1) * ratio));
  S.player.hp = 0;
  const healed = LIFE.heal(S.player, healValue);
  if(effect.consume) S.relics.splice(relicIndex, 1);
  if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
  toast(relic.name+" 발동");
  renderAll();
  return S.player.hp > 0;
}

/**
 * 약병 후보를 획득처 기준으로 필터링합니다.
 * source 예시: "battle", "shop", "event"
 */
function getPotionCandidatesBySource(source, options = {}) {
  const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : [];
  return db.filter(item => {
    if (!item) return false;
    if (source && Array.isArray(item.obtainFrom) && !item.obtainFrom.includes(source)) {
      return false;
    }
    if (options.rarity && item.rarity !== options.rarity) {
      return false;
    }
    return true;
  });
}

/**
 * 법구 후보를 획득처 기준으로 필터링합니다.
 * 이미 보유한 법구는 제외합니다.
 */
function getRelicCandidatesBySource(source, options = {}) {
  const db = Array.isArray(window.RELIC_DB)
    ? window.RELIC_DB
    : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  const ownedIds = new Set(
    (S && Array.isArray(S.relics) ? S.relics : [])
      .map(relic => relic && relic.id)
      .filter(Boolean)
  );
  return db.filter(item => {
    if (!item || ownedIds.has(item.id)) return false;
    if (item.category === "blessingRelic" || item.source === "startBlessing") return false;
    if (source && Array.isArray(item.obtainFrom) && !item.obtainFrom.includes(source)) {
      return false;
    }
    if (options.rarity && item.rarity !== options.rarity) {
      return false;
    }
    if (options.attr && item.attr !== options.attr) {
      return false;
    }
    return true;
  });
}
window.getPotionCandidatesBySource = getPotionCandidatesBySource;
window.getRelicCandidatesBySource = getRelicCandidatesBySource;

function getRandomPotionReward(){
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("battle")
    : (typeof window.POTION_DB !== "undefined" ? window.POTION_DB : BATTLE_VICTORY_POTION_CANDIDATES);
  return pickBattleVictoryCandidate(db);
}

function getSelectedLivingEnemy(){
  return livingEnemies().find(e => e.id === S.selectedId) || livingEnemies()[0] || null;
}

function cloneMonsterRuntimeData(data){
  if(!data || typeof data !== "object") return data;
  return {
    ...data,
    roles: Array.isArray(data.roles) ? [...data.roles] : data.roles,
    moves: Array.isArray(data.moves) ? data.moves.map(move => ({ ...move })) : data.moves,
    nextPhase: data.nextPhase ? cloneMonsterRuntimeData(data.nextPhase) : null
  };
}

function applyBattleStartRelics(){
  // 전투 데이터가 아직 준비되지 않았으면 처리하지 않는다.
  if(!S || !S.player) return;

  // 전투 시작 효과 중복 적용 방지
  // 실수로 applyBattleStartRelics()가 여러 번 호출되어도
  // 법구/은혜 전투 시작 효과는 전투당 1회만 적용한다.
  if(S.battleStartApplied){
    console.warn("[BattleStart] 전투 시작 효과가 이미 적용되어 중복 호출을 무시합니다.");
    return;
  }
  S.battleStartApplied = true;

  // 1. 기존 법구 전투 시작 효과 처리
  // 예: 청동 향로, 도깨비 주머니, 봉마패 등 battleStart 트리거 법구
  if(typeof applyRelicTrigger === "function"){
    applyRelicTrigger("battleStart");
  }else{
    console.warn("[BattleStart] applyRelicTrigger 함수가 없어 법구 전투 시작 효과를 적용하지 못했습니다.");
  }

  // 2. 신령의 은혜 전투 시작 효과 처리
  // 선택 화면에서 예약된 시작 전용 법구 효과만 여기서 소모한다.
  const run = typeof RUN_STATE !== "undefined" ? RUN_STATE : null;
  const effects = (run && run.startBlessingEffects) || {};
  const legacyBlock = run && run.startBlessingEffect;

  const anxietyEffect = effects.firstBattleAnxiety;
  if(anxietyEffect && !anxietyEffect.used){
    S.player.anxiety = (S.player.anxiety || 0) + Number(anxietyEffect.value || 1);
    anxietyEffect.used = true;
    toast("은혜4 발동: 불안 1");
  }

  const hpOneEffect = effects.nextThreeNormalFirstEnemyHpOne;
  if(hpOneEffect && (hpOneEffect.remaining || 0) > 0 && S.battleNodeType === "enemy"){
    const target = livingEnemies()[0];
    if(target){
      target.hp = Math.min(target.hp, 1);
      hpOneEffect.remaining -= 1;
      toast("은혜11 발동: 첫 번째 적 정신력 1");
    }
  }

  const blockEffect = effects.firstBattleBlock || legacyBlock;
  if(blockEffect && !blockEffect.used && blockEffect.type === "firstBattleBlock"){
    const blockValue = Number(blockEffect.value || 10);
    if(typeof LIFE !== "undefined" && LIFE && typeof LIFE.addBlock === "function"){
      LIFE.addBlock(S.player, blockValue);
      blockEffect.used = true;
      toast("은혜12 발동: 결계 " + blockValue);
    }else{
      console.warn("[BattleStart] LIFE.addBlock 함수가 없어 신령의 은혜 결계 효과를 적용하지 못했습니다.");
    }
  }
}

/* =========================================================================
   전투 초기화
   ========================================================================= */
function newGame(options={}){
  if(options.resetRun || !RUN_STATE) beginNewRun();
  else syncRunStateFromCombat();

  const stageIdx = window.MAP_STATE ? window.MAP_STATE.currentStage : 0;
  const curStage = window.ACT1_MAP_STAGES && window.ACT1_MAP_STAGES[stageIdx];
  const runPlayer = RUN_STATE.player || LIFE.createPlayer(PLAYER_DEF);
  const player = LIFE.createPlayer(PLAYER_DEF);
  player.maxHp = runPlayer.maxHp || player.maxHp;
  player.hp = Math.max(0, Math.min(player.maxHp, runPlayer.hp));
  STARTER_DECK = [...RUN_STATE.deck];

  S = {
    player,
    enemies:  [],       // 패키지 전체 몬스터 (동시 배치)
    selectedId: null,   // 현재 선택된 적 ID
    energy:   getMaxEnergy(),
    hand: [], draw: [], discard: [],
    busy: false, over: null, rewardOpen: false,
    relics: cloneRunArray(RUN_STATE.relics), potions: cloneRunArray(RUN_STATE.potions),
    gold: RUN_STATE.gold, moonShards: RUN_STATE.moonShards,
    cleanseCount: typeof RUN_STATE.cleanseCount === "number" ? RUN_STATE.cleanseCount : 0,
    turn: 1,
    // 전투 시작 효과 중복 적용 방지 플래그
    battleStartApplied: false,
    // 노드 컨텍스트 (기획서 §2)
    battleStage: curStage || null,
    tutorialMode: !!options.tutorial,
    battleNodeType:  options.tutorial ? "tutorial" : (curStage ? (curStage.type      || "enemy") : "enemy"),
    battlePackageId: options.tutorial ? (options.tutorialEncounterId || "stage_tutorial_child_spirit") : (curStage ? (curStage.packageId || null)    : null),
    battleBackground: null,
    encounterCleared: false,
    firstAttackUsed: false,
    nextAttackMultiplier: null,
    blockGainedThisTurn: 0,
    summonCount: 0,
    relicTurnFlags: {},
    retainedBlockFromRelic: 0,
  };

  // 패키지 몬스터 전체 동시 배치 (기획서 §8-3)
  spawnPackageEnemies();
  applyBattleBackground();

  S.draw = shuffle([...STARTER_DECK]);
  drawCards(DRAW_PER_TURN);
  // 전투 시작 효과는 전투당 1회만 적용한다.
  // 드로우 이후에 호출하여 "전투 시작 시 드로우 +1" 계열 법구도 자연스럽게 처리한다.
  applyBattleStartRelics();
  renderAll();
}

// MONSTER_DEFS(패키지 몬스터 전체)를 한 번에 전장에 배치
function spawnPackageEnemies(){
  const tutorialMonsters = S.tutorialMode ? getTutorialEncounterMonsters(S.battlePackageId) : null;
  const stageMonsters = S.battleStage && typeof S.battleStage.getMonsters === "function"
    ? S.battleStage.getMonsters()
    : null;
  const defs = Array.isArray(tutorialMonsters) && tutorialMonsters.length
    ? tutorialMonsters
    : (Array.isArray(stageMonsters) && stageMonsters.length ? stageMonsters : MONSTER_DEFS);
  if(!defs.length){ S.enemies = []; S.selectedId = null; return; }
  S.enemies = defs.map((def, i) => {
    return createCombatEnemy(def, i);
  });
  S.selectedId = S.enemies[0]?.id || null;
}

function getTutorialEncounterMonsters(encounterId){
  const data = window.BOHYUN_COMBAT_DATA;
  if(data && typeof data.getEncounterMonsters === "function"){
    const encounterMonsters = data.getEncounterMonsters(encounterId || "stage_tutorial_child_spirit");
    if(encounterMonsters.length) return encounterMonsters;
  }
  if(data && typeof data.getMonsterById === "function"){
    const fallbackMonster = data.getMonsterById("child_spirit");
    if(fallbackMonster) return [fallbackMonster];
  }
  return [];
}

function pickBattleTheme(enemies){
  const counts = {};
  (enemies || []).forEach(enemy => {
    const theme = enemy && enemy.theme;
    if(BATTLE_BACKGROUND_BY_THEME[theme]){
      counts[theme] = (counts[theme] || 0) + 1;
    }
  });
  const themes = Object.keys(counts);
  if(!themes.length) return "hospital";
  const max = Math.max(...themes.map(theme => counts[theme]));
  const candidates = themes.filter(theme => counts[theme] === max);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickBattleBackground(enemies){
  const theme = pickBattleTheme(enemies);
  const list = BATTLE_BACKGROUND_BY_THEME[theme] || BATTLE_BACKGROUND_BY_THEME.hospital;
  return {
    theme,
    url: list[Math.floor(Math.random() * list.length)]
  };
}

function applyBattleBackground(){
  const game = document.querySelector("#game");
  if(!game) return;
  const bg = S && S.tutorialMode
    ? (S.battleBackground || { ...TUTORIAL_BATTLE_BACKGROUND })
    : pickBattleBackground(S.enemies);
  S.battleBackground = bg;
  game.style.setProperty("--battle-bg-image", 'url("' + bg.url + '")');
  game.dataset.battleTheme = bg.theme;
  game.classList.add("battle-bg-active");
}

function clearBattleBackground(){
  const game = document.querySelector("#game");
  if(!game) return;
  game.classList.remove("battle-bg-active");
  game.style.removeProperty("--battle-bg-image");
  delete game.dataset.battleTheme;
}

function createCombatEnemy(def, index, options = {}){
  const e = LIFE.createMonster(def, index);
  e.baseId = def.id || e.id;
  if(options.idSuffix) e.id = e.baseId + "_" + options.idSuffix;
  e.spawnIndex = index;
  e.summoned = !!options.summoned;
  ensureEnemyStatus(e);
  return e;
}

function getBasicSummonMonsterDef(summoner){
  const theme = summoner && summoner.theme;
  const monsterId = BASIC_SUMMON_MONSTER_BY_THEME[theme] || BASIC_SUMMON_MONSTER_BY_THEME.park;
  if(typeof COMBAT_DATA.getMonsterById === "function"){
    const monster = COMBAT_DATA.getMonsterById(monsterId);
    if(monster) return monster;
  }
  return MONSTER_DEFS.find(monster => monster.id === monsterId)
    || MONSTER_DEFS.find(monster => monster.grade === "normal")
    || null;
}

function getSummonCountByGrade(summoner){
  return summoner && summoner.grade === "boss" ? 2 : 1;
}

function summonEnemy(summoner){
  if(!S || !summoner) return 0;
  const maxLivingEnemies = 4;
  const count = getSummonCountByGrade(summoner);
  const def = getBasicSummonMonsterDef(summoner);
  if(!def) return 0;

  let summoned = 0;
  for(let i = 0; i < count && livingEnemies().length < maxLivingEnemies; i++){
    S.summonCount = (S.summonCount || 0) + 1;
    const enemy = createCombatEnemy(def, S.enemies.length, {
      summoned: true,
      idSuffix: "summon" + S.summonCount
    });
    S.enemies.push(enemy);
    summoned += 1;
  }
  if(summoned > 0) autoSelectTarget();
  return summoned;
}

function applyNextPhaseIfNeeded(enemy){
  if(!enemy || enemy.phaseChanged || !enemy.nextPhase) return false;
  if(enemy.hp > Math.ceil(enemy.maxHp / 2)) return false;

  const phase = cloneMonsterRuntimeData(enemy.nextPhase);
  const previousId = enemy.id;
  const previousBaseId = enemy.baseId || enemy.id;
  const previousImage = enemy.image;
  const previousTheme = enemy.theme;
  const previousThemeLabel = enemy.themeLabel;
  const previousFamily = enemy.family;
  const previousSpawnIndex = enemy.spawnIndex;
  const previousSummoned = enemy.summoned;
  const preservedWeak = enemy.weak || 0;
  const preservedFracture = enemy.fracture || 0;
  const preservedAnxiety = enemy.anxiety || 0;
  const preservedLethargy = enemy.lethargy || 0;
  const preservedStatus = enemy.status ? { ...enemy.status } : {};
  const preservedMark = enemy.mark || 0;

  Object.assign(enemy, phase);
  enemy.id = previousId;
  enemy.baseId = previousBaseId;
  enemy.image = phase.image || previousImage;
  enemy.theme = phase.theme || previousTheme;
  enemy.themeLabel = phase.themeLabel || previousThemeLabel;
  enemy.family = phase.family || previousFamily;
  enemy.spawnIndex = previousSpawnIndex;
  enemy.summoned = previousSummoned;
  enemy.maxHp = phase.maxHp || enemy.maxHp;
  enemy.hp = enemy.maxHp;
  enemy.block = 0;
  enemy.weak = preservedWeak;
  enemy.fracture = preservedFracture;
  enemy.anxiety = preservedAnxiety;
  enemy.lethargy = preservedLethargy;
  enemy.mark = preservedMark;
  enemy.status = preservedStatus;
  enemy.moves = Array.isArray(phase.moves) ? phase.moves : enemy.moves;
  enemy.intent = enemy.moves[phase.first || 0] || enemy.moves[0] || null;
  enemy.nextPhase = null;
  enemy.phaseChanged = true;
  enemy.lastIntentType = null;
  enemy.intentRepeatCount = 0;
  ensureEnemyStatus(enemy);
  spawnFloat('[data-id="'+enemy.id+'"]', '페이즈 전환', 'heal');
  return true;
}

/* =========================================================================
   유틸
   ========================================================================= */
const $ = s => document.querySelector(s);
const livingEnemies = () => S.enemies.filter(e => e.hp > 0);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

function ensureEnemyStatus(enemy){
  if(!enemy) return {};
  if(!enemy.status || typeof enemy.status !== "object") enemy.status = {};
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    const legacyKey = data.legacyKey;
    if(legacyKey && typeof enemy[legacyKey] === "number"){
      enemy.status[statusId] = Math.max(enemy.status[statusId] || 0, enemy[legacyKey] || 0);
    } else if(typeof enemy.status[statusId] !== "number"){
      enemy.status[statusId] = 0;
    }
  });
  syncLegacyStatusFields(enemy);
  return enemy.status;
}

function syncLegacyStatusFields(enemy){
  if(!enemy || !enemy.status) return;
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    if(!data.legacyKey) return;
    enemy[data.legacyKey] = Math.max(0, enemy.status[statusId] || 0);
  });
}

function addStatus(enemy, statusId, amount){
  if(!enemy || !statusId || !amount) return 0;
  const data = STATUS_DATA[statusId] || { maxStack: 99 };
  ensureEnemyStatus(enemy);
  const before = enemy.status[statusId] || 0;
  const next = Math.min(data.maxStack || 99, before + amount);
  enemy.status[statusId] = Math.max(0, next);
  syncLegacyStatusFields(enemy);
  return Math.max(0, enemy.status[statusId] - before);
}

function removeStatus(enemy, statusId, amount){
  if(!enemy || !statusId || !enemy.status) return 0;
  ensureEnemyStatus(enemy);
  const before = enemy.status[statusId] || 0;
  enemy.status[statusId] = Math.max(0, before - (amount || before));
  syncLegacyStatusFields(enemy);
  return before - enemy.status[statusId];
}

function setStatus(enemy, statusId, amount){
  if(!enemy || !statusId) return;
  ensureEnemyStatus(enemy);
  enemy.status[statusId] = Math.max(0, amount || 0);
  syncLegacyStatusFields(enemy);
}

function getStatus(enemy, statusId){
  if(!enemy || !statusId) return 0;
  ensureEnemyStatus(enemy);
  return enemy.status?.[statusId] || 0;
}

function decayEnemyStatuses(enemy, timing){
  if(!enemy) return;
  ensureEnemyStatus(enemy);
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    if(!data || !data.showOnEnemy) return;
    if(data.decayTiming && data.decayTiming !== timing) return;
    if(statusId === "recollection" && timing === "afterEnemyAction"){
      const damage = enemy.status[statusId] || 0;
      if(damage > 0) applyDamageWithFeedback(enemy, damage, 0);
    }
    const amount = data.decayAmount || 1;
    if(amount > 0) removeStatus(enemy, statusId, amount);
  });
}

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cardArtHtml(card){
  if(card && card.art){
    return '<img src="'+escapeHtml(card.art)+'" alt="'+escapeHtml(card.name || "")+'">';
  }
  return escapeHtml(card && card.emoji ? card.emoji : "?");
}

function cardFramePath(card){
  if(card && card.type === "status"){
    return "assets/card_frames/card-frame-status.png";
  }
  const type = card && ["attack", "defense", "skill"].includes(card.type) ? card.type : "skill";
  const rarity = card && card.rarity ? card.rarity : "common";
  return "assets/card_frames/card-frame-" + type + "-" + rarity + ".png";
}

function cardFaceHtml(card){
  const safeCard = card || {};
  return '<div class="card-art-layer">' + cardArtHtml(safeCard) + '</div>' +
    '<img class="card-frame-layer" src="' + escapeHtml(cardFramePath(safeCard)) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="card-text-layer">' +
      '<div class="card-cost-text">' + escapeHtml(safeCard.cost ?? "") + '</div>' +
      '<div class="card-name-text">' + escapeHtml(safeCard.name || "") + '</div>' +
      '<div class="card-desc-text">' + escapeHtml(safeCard.desc || "") + '</div>' +
    '</div>' +
    '<div class="card-hit-layer" aria-hidden="true"></div>';
}

function statusTooltipText(statusId, count){
  const data = STATUS_DATA[statusId] || {};
  const lines = [];
  lines.push(data.name || statusId);
  lines.push("현재 스택 : " + count);
  if(data.description) lines.push(data.description);
  if(data.decayTimingText) lines.push(data.decayTimingText);
  return lines.filter(Boolean).join("\n");
}

function statusIconHtml(statusId, count){
  const data = STATUS_DATA[statusId];
  if(!data || !data.showOnEnemy || count <= 0) return "";
  const name = data.name || statusId;
  const tooltip = statusTooltipText(statusId, count);
  const icon = data.iconImage
    ? '<img src="'+escapeHtml(data.iconImage)+'" alt="'+escapeHtml(name)+'">'
    : '<span>'+escapeHtml(data.icon || "•")+'</span>';
  return '<div class="enemy-status-icon status-'+escapeHtml(statusId)+'" data-status-id="'+escapeHtml(statusId)+'" data-status-name="'+escapeHtml(name)+'" data-status-tooltip="'+escapeHtml(tooltip)+'" style="--status-color:'+(data.color || '#7b61ff')+'">'
       + icon + '<b>'+count+'</b></div>';
}

function renderEnemyStatusIcons(enemyLike){
  if(!enemyLike || enemyLike.hideHud) return "";
  ensureEnemyStatus(enemyLike);
  const orderedStatusIds = ["agitation", "fracture", "recollection", "mark", ...Object.keys(STATUS_DATA).filter(id => !["agitation", "fracture", "recollection", "mark"].includes(id))];
  const html = orderedStatusIds
    .map(statusId => statusIconHtml(statusId, enemyLike.status?.[statusId] || 0))
    .join("");
  return html ? '<div class="enemy-status-icons">'+html+'</div>' : "";
}

// 선택 적이 죽으면 다음 생존 적으로 자동 전환 (기획서 §8-6)
function autoSelectTarget(){
  const alive = livingEnemies();
  if(!alive.length){ S.selectedId = null; return; }
  if(!alive.find(e => e.id === S.selectedId)) S.selectedId = alive[0].id;
}

/* =========================================================================
   주문 드로우
   ========================================================================= */
function drawCards(n){
  for(let i=0;i<n;i++){
    if(S.draw.length===0){
      if(S.discard.length===0) break;
      S.draw = shuffle(S.discard); S.discard = [];
    }
    const drawn = S.draw.pop();
    if(S.hand.length >= 10) discardCard(drawn, { source:"drawOverflow" });
    else S.hand.push(drawn);
  }
}

function discardCard(key, options={}){
  const card = CARD_DB[key];
  if(!card) return;
  const sr = LIFE.resolveStatusCardDiscard(card, S.player, options);
  if(sr.handled){
    if(sr.damage){
      if(sr.damage.absorbed > 0) spawnFloat('.player', '-'+sr.damage.absorbed, 'blk');
      if(sr.damage.hpLoss  > 0) spawnFloat('.player', '-'+sr.damage.hpLoss,   'dmg');
    }
    if(sr.message) toast(sr.message);
    if(sr.discard) S.discard.push(key);
    return;
  }
  if(card.exhaust){ toast(card.name+" 소멸"); return; }
  S.discard.push(key);
}

function addStatusCardToDiscard(cardKey, count=1){
  const card = CARD_DB[cardKey];
  if(!card || card.rarity!=="status") return 0;
  const amount = Math.max(1, count||1);
  for(let i=0;i<amount;i++) S.discard.push(cardKey);
  toast(card.name+" "+amount+"장 추가");
  return amount;
}

/* =========================================================================
   주문 사용
   ========================================================================= */
function playCard(handIndex, targetEnemy){
  const key  = S.hand[handIndex];
  const card = CARD_DB[key];
  if(!card) return false;
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.canUseCard === "function" &&
     !window.TUTORIAL_BATTLE.canUseCard(card, key, handIndex)){
    const message = typeof window.TUTORIAL_BATTLE.getTutorialRestrictionMessage === "function"
      ? window.TUTORIAL_BATTLE.getTutorialRestrictionMessage("card")
      : "";
    if(message && typeof toast === "function") toast(message);
    return false;
  }
  if(card.unplayable){ toast(card.name+"은 사용할 수 없습니다"); return false; }
  if(S.energy < card.cost){ flashEnergy(); toast("정신력이 부족합니다"); return false; }
  if(card.target==="enemy" && (!targetEnemy || targetEnemy.hp<=0)) return false;

  S.energy -= card.cost;

  for(const e of card.fx){
    switch(e.t){
      case "damage":
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v, targetEnemy), S.player.weak); break;
      case "bonusLowHpDamage":
        if(targetEnemy && targetEnemy.hp>0 && targetEnemy.hp<=Math.ceil(targetEnemy.maxHp/2))
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v, targetEnemy), S.player.weak);
        break;
      case "damageAll":
        livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(e.v, en), S.player.weak)); break;
      case "applyWeakAll":
        livingEnemies().forEach(en => addStatus(en, "agitation", e.v)); break;
      case "applyFracture":
        if(targetEnemy && targetEnemy.hp > 0) addStatus(targetEnemy, "fracture", e.v || 1);
        break;
      case "applyFractureAll":
        livingEnemies().forEach(en => addStatus(en, "fracture", e.v || 1));
        break;
      case "applyRecollection":
        if(targetEnemy && targetEnemy.hp > 0) addStatus(targetEnemy, "recollection", e.v || 1);
        break;
      case "applyRecollectionAll":
        livingEnemies().forEach(en => addStatus(en, "recollection", e.v || 1));
        break;
      case "block":
        gainPlayerBlock(e.v); break;
      case "damageByBlockRatio":
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(Math.floor((S.player.block || 0) * e.v), targetEnemy), S.player.weak); break;
      case "damageByBlockRatioConsume": {
        const currentBlock = Number.isFinite(S.player.block) ? Math.max(0, S.player.block) : 0;
        const ratio = Number.isFinite(e.v) ? e.v : 0;
        const damage = Math.floor(currentBlock * ratio);
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(damage, targetEnemy), S.player.weak);
        const consumeRatio = Number.isFinite(e.consumeRatio) ? e.consumeRatio : 0.5;
        const consumed = Math.ceil(currentBlock * consumeRatio);
        S.player.block = Math.max(0, currentBlock - consumed);
        break;
      }
      case "damageByBlockGainedThisTurn":
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(Math.floor((S.blockGainedThisTurn || 0) * e.v), targetEnemy), S.player.weak); break;
      case "damageByWeak": {
        const weak = targetEnemy ? Math.max(0, targetEnemy.weak || 0) : 0;
        const amount = Math.floor((e.base || 0) + weak * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak);
        break;
      }
      case "damageByRecollection": {
        const recollection = targetEnemy ? Math.max(0, getStatus(targetEnemy, "recollection")) : 0;
        const amount = Math.floor((e.base || 0) + recollection * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak);
        break;
      }
      case "consumeAllAgitationDamage": {
        if(targetEnemy){
          const agitation = Math.max(0, getStatus(targetEnemy, "agitation"));
          const amount = Math.floor((e.base || 0) + agitation * (e.per || 0));
          setStatus(targetEnemy, "agitation", 0);
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak);
        }
        break;
      }
      case "ifAgitationAtLeastDraw":
        if(targetEnemy && getStatus(targetEnemy, "agitation") >= (e.threshold || 0)) drawCards(e.v || 1);
        break;
      case "ifRecollectionAtLeastDraw":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)) drawCards(e.v || 1);
        break;
      case "ifAgitationAtLeastDamageAll":
        if(targetEnemy && getStatus(targetEnemy, "agitation") >= (e.threshold || 0)){
          livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(e.v || 0, en), S.player.weak));
        }
        break;
      case "ifRecollectionAtLeastDamageAll":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)){
          livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(e.v || 0, en), S.player.weak));
        }
        break;
      case "transferAgitationOnKill": {
        if(targetEnemy && targetEnemy.hp <= 0){
          const currentAgitation = getStatus(targetEnemy, "agitation");
          if(currentAgitation <= 0) break;
          const targets = livingEnemies().filter(en => en !== targetEnemy);
          const amount = Math.max(0, e.v || currentAgitation);
          if(targets.length && amount > 0){
            const target = targets[Math.floor(Math.random() * targets.length)];
            addStatus(target, "agitation", amount);
            spawnFloat('[data-id="'+target.id+'"]', '동요 '+amount, 'dmg');
          }
        }
        break;
      }
      case "transferRecollectionOnKill": {
        if(targetEnemy && targetEnemy.hp <= 0){
          const currentRecollection = getStatus(targetEnemy, "recollection");
          if(currentRecollection <= 0) break;
          const targets = livingEnemies().filter(en => en !== targetEnemy);
          const amount = Math.max(0, e.v || currentRecollection);
          if(targets.length && amount > 0){
            const target = targets[Math.floor(Math.random() * targets.length)];
            addStatus(target, "recollection", amount);
            spawnFloat('[data-id="'+target.id+'"]', '회상 '+amount, 'dmg');
          }
        }
        break;
      }
      case "blockGainPlusThisTurn":
        gainPlayerBlock((e.v || 0) + (S.blockGainedThisTurn || 0)); break;
      case "draw":
        drawCards(e.v); break;
      case "heal": {
        const healed = LIFE.heal(S.player, e.v);
        if(healed>0) spawnFloat('.player', '+'+healed, 'heal');
        break;
      }
      case "energy":
        S.energy += e.v; break;
      case "applyWeak":
        if(targetEnemy && targetEnemy.hp > 0){
          addStatus(targetEnemy, "agitation", e.v);
          applyRelicTrigger("onAgitationApply", { target: targetEnemy, amount: e.v });
        }
        break;
      case "applyMark":
        if(targetEnemy){
          const amount = e.v || 0;
          addStatus(targetEnemy, "mark", amount);
          applyRelicTrigger("onMarkApply", { target: targetEnemy, amount });
          spawnFloat('[data-id="'+targetEnemy.id+'"]', '표식 '+amount, 'heal');
        }
        break;
      case "ifMarkedDamage":
        if(targetEnemy && getStatus(targetEnemy, "mark") > 0)
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v, targetEnemy), S.player.weak);
        break;
      case "consumeAllMarksDamage":
        if(targetEnemy){
          const marks = getStatus(targetEnemy, "mark");
          const amount = (e.base || 0) + marks * (e.per || 0);
          setStatus(targetEnemy, "mark", 0);
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak);
        }
        break;
      case "removeWeak":
        LIFE.reduceWeak(S.player, e.v); break;
    }
  }

  S.hand.splice(handIndex, 1);
  discardCard(key, { source:"played" });
  autoSelectTarget();
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.onCardPlayed === "function"){
    window.TUTORIAL_BATTLE.onCardPlayed(key, card, handIndex);
  }

  // 생존 적 0명 = 패키지 전멸 = 노드 클리어 (기획서 §8-6)
  if(livingEnemies().length===0){
    nodeClear();
    renderAll();
    return true;
  }

  renderAll();
  return true;
}

function applyDamageWithFeedback(target, rawDamage, attackerWeak){
  const result = LIFE.applyDamage(target, rawDamage, attackerWeak);
  const sel = target===S.player ? '.player' : '[data-id="'+target.id+'"]';
  if(result.absorbed > 0)                          spawnFloat(sel, '-'+result.absorbed, 'blk');
  if(result.hpLoss   > 0)                          spawnFloat(sel, '-'+result.hpLoss,   'dmg');
  if(result.absorbed === 0 && result.hpLoss === 0) spawnFloat(sel, '0', 'blk');
  if(target !== S.player) applyNextPhaseIfNeeded(target);
}

/* =========================================================================
   노드 클리어 – 패키지 전체 몬스터 전멸 시 1회만 실행 (기획서 §10)
   ========================================================================= */
function nodeClear(){
  if(S.encounterCleared) return;
  S.encounterCleared = true;

  S.enemies.forEach(e => toast(e.name+" 성불 완료"));

  const nodeType = S.battleNodeType || "enemy";
  recordBattleClear(nodeType);
  applyRelicTrigger("battleEnd");
  if(nodeType==="boss"){
    grantBattleGoldReward();
    return endGame("win");
  }
  if(nodeType==="elite") grantRelic(S.battleVictoryRelicSource || "elite");             // 엘리트 → 유물 추가 (기획서 §10)
  openBattleVictoryReward();
}

/* =========================================================================
   보상
   ========================================================================= */
function getRandomRewardKeys(count){
  return shuffle([...CARD_REWARD_POOL]).slice(0, count);
}

let cardRewardPickMode = null;

function openCardReward(){
  S.busy = true; S.rewardOpen = true;
  renderRewardOverlay(getRandomRewardKeys(3));
  updateEndBtn();
}

function openBattleVictoryReward(){
  S.busy = true; S.rewardOpen = true;
  renderBattleVictoryOverlay();
  updateEndBtn();
}

function proceedToMap(){
  if(window.MAP_STATE) window.MAP_STATE.proceedMode = true;
  if(typeof openMap==="function") openMap();
}

function getBalanceBattleGold(nodeType){
  const table = (BALANCE_CONFIG && BALANCE_CONFIG.battleGold) || {};
  const key = nodeType === "boss" ? "boss" : (nodeType === "elite" ? "elite" : "enemy");
  const rule = table[key] || {};
  const fallback = key === "boss" ? 100 : (key === "elite" ? 45 : 20);
  const amount = Number.isFinite(rule.amount) ? rule.amount : fallback;
  const min = Number.isFinite(rule.min) ? rule.min : 0;
  const max = Number.isFinite(rule.max) ? rule.max : Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(max, Math.floor(amount)));
}

function getBattleVictoryGoldAmount(){
  const override = S && Number.isFinite(S.battleVictoryGoldOverride)
    ? Math.floor(S.battleVictoryGoldOverride)
    : null;
  if(override !== null) return Math.max(0, override);
  return getBalanceBattleGold(S && S.battleNodeType);
}

function grantBattleGoldReward(){
  const amount = getBattleVictoryGoldAmount();
  if(amount <= 0) return 0;
  S.gold = (typeof S.gold === "number" ? S.gold : STARTING_GOLD) + amount;
  syncRunStateFromCombat();
  renderHud();
  toast("복채 +" + amount);
  return amount;
}

function getPotionSlotLimit(){
  if(typeof window.POTION_SLOT_LIMIT === "number") return window.POTION_SLOT_LIMIT;
  if(typeof POTION_SLOT_LIMIT === "number") return POTION_SLOT_LIMIT;
  return 3;
}

function ensureVictoryRewardState(){
  if(!S.victoryRewardDone) S.victoryRewardDone = {};
  if(!S.victoryRewardDoneText) S.victoryRewardDoneText = {};
  return {
    done: S.victoryRewardDone,
    doneText: S.victoryRewardDoneText
  };
}

function markVictoryRewardDone(id, doneText){
  const rewardState = ensureVictoryRewardState();
  rewardState.done[id] = true;
  rewardState.doneText[id] = doneText;
}

function isVictoryRewardDone(id){
  return !!(S && S.victoryRewardDone && S.victoryRewardDone[id]);
}

const BATTLE_VICTORY_RELIC_CHANCE = 0.5;
const BATTLE_VICTORY_POTION_CHANCE = 0.25;
const ELITE_VICTORY_POTION_CHANCE = 0.5;
function getBattleVictoryPotionChance(){
  return S && S.battleNodeType === "elite" ? ELITE_VICTORY_POTION_CHANCE : BATTLE_VICTORY_POTION_CHANCE;
}
function createBattleVictoryBaseRewards(){
  const gold = getBattleVictoryGoldAmount();
  const rewards = [];
  if(!S || !S.battleSuppressGoldReward){
    rewards.push({ id:"gold", name:"복채", icon:"복", value:"+" + gold, amount:gold, doneText:"수령 완료" });
  }
  if(!S || !S.battleSuppressCardReward){
    rewards.push({ id:"card", name:"의식 보상", icon:"札", value:"1개 선택", doneText:"선택 완료" });
  }
  return rewards;
}
const BATTLE_VICTORY_POTION_CANDIDATES = (typeof window.POTION_DB !== "undefined") ? window.POTION_DB : [
  { id:"cheongsim_pill", name:"청심환", icon:"藥", emoji:"💊", desc:"정신력을 18 회복합니다.", type:"heal", effect:"healPlayerHp", value:18, target:"player" },
  { id:"focus_talisman", name:"집중부", icon:"符", emoji:"🔖", desc:"이번 턴 정신력을 1 회복합니다.", type:"energy", effect:"gainEnergy", value:1, target:"player" },
  { id:"protective_talisman", name:"호신부", icon:"護", emoji:"🧿", desc:"마음의 결계를 12 얻습니다.", type:"block", effect:"gainBlock", value:12, target:"player" },
  { id:"five_direction_water", name:"오방수", icon:"水", emoji:"🌊", desc:"마음의 결계를 8 얻고 동요를 1 제거합니다.", type:"blockCleanse", effect:"blockAndRemoveAgitation", value:8, removeWeak:1, target:"player" },
  { id:"lotus_incense", name:"연꽃 향", icon:"香", emoji:"🪷", desc:"대상에게 성불 표식을 3 부여합니다.", type:"applyMark", effect:"applyMark", value:3, target:"enemy" },
  { id:"unsaid_letter", name:"말하지 못한 편지", icon:"文", emoji:"💌", desc:"대상에게 동요를 3 부여합니다.", type:"applyWeak", effect:"applyAgitation", value:3, target:"enemy" },
  { id:"spirit_eye_water", name:"영안수", icon:"眼", emoji:"👁️", desc:"주문을 3장 뽑습니다.", type:"draw", effect:"drawCards", value:3, target:"player" },
  { id:"ghost_gate_talisman", name:"귀문부", icon:"符", emoji:"符", desc:"이번 턴 다음 공격 주문의 정화량이 2배가 됩니다.", type:"nextAttackDouble", effect:"nextAttackDouble", value:2, target:"player" },
];

function chooseRewardCard(key){
  if(cardRewardPickMode){
    resolveCardRewardPick(key);
    return;
  }
  if(!S || !S.rewardOpen) return;
  const card = CARD_DB[key];
  if(!card) return;
  STARTER_DECK.push(key);
  S.discard.push(key);
  if(S.victoryCardRewardOpen){
    toast(card.name+" 획득");
    finishBattleVictoryCardReward();
    return;
  }
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  toast(card.name+" 획득");
  proceedToMap();
}

function skipRewardCard(){
  if(cardRewardPickMode){
    if(typeof toast === "function") toast("카드를 선택해야 은혜를 완료할 수 있습니다.");
    return;
  }
  if(!S || !S.rewardOpen) return;
  if(S.victoryCardRewardOpen){
    finishBattleVictoryCardReward();
    return;
  }
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  proceedToMap();
}

function grantRelic(source = "elite"){
  if(!S.relics) S.relics = [];
  // 이벤트 전투는 source를 "event"로 넘겨 일반 엘리트 법구 풀을 건드리지 않는다.
  const pool = RELIC_DB.filter(item => Array.isArray(item.obtainFrom) && item.obtainFrom.includes(source));
  const list = (pool.length ? pool : RELIC_DB).filter(item => item && item.category !== "blessingRelic" && item.source !== "startBlessing");
  const relic = list[Math.floor(Math.random()*list.length)];
  if(!relic) return;
  S.relics.push(relic);
  toast("법구 획득: "+relic.emoji+" "+relic.name);
  renderHud();
}

function ensureBattleVictoryOverlay(){
  let ov = document.querySelector("#battleVictoryOverlay");
  if(ov) return ov;
  ov = document.createElement("div");
  ov.id = "battleVictoryOverlay";
  ov.innerHTML =
    '<div class="victory-reward-panel">' +
      '<div class="victory-title-area">' +
        '<h2>전투 승리</h2>' +
        '<p>한풀이가 조금 더 깊어졌습니다.</p>' +
      '</div>' +
      '<div class="victory-section victory-reward-section">' +
        '<div class="victory-section-title">획득 보상</div>' +
        '<div class="victory-reward-row" aria-label="획득 보상 목록"></div>' +
      '</div>' +
      '<div class="victory-section victory-kill-section">' +
        '<div class="victory-section-title">처치한 악령</div>' +
        '<div class="victory-enemy-name"></div>' +
        '<div class="victory-battle-meta">' +
          '<span class="victory-meta-location"></span>' +
          '<span class="victory-meta-floor"></span>' +
          '<span class="victory-meta-turn"></span>' +
        '</div>' +
      '</div>' +
      '<div class="victory-button-area">' +
        '<button type="button" class="victory-next" aria-disabled="true">다음층으로</button>' +
      '</div>' +
    '</div>' +
    '<div class="victory-confirm-modal" aria-hidden="true">' +
      '<div class="victory-confirm-box">' +
        '<div class="victory-confirm-title"></div>' +
        '<div class="victory-confirm-desc"></div>' +
        '<div class="victory-confirm-actions">' +
          '<button type="button" class="victory-confirm-take">받기</button>' +
          '<button type="button" class="victory-confirm-skip">건너뛰기</button>' +
        '</div>' +
      '</div>' +
      '<div class="victory-potion-replace-panel" aria-hidden="true"></div>' +
    '</div>';
  document.querySelector("#game").appendChild(ov);
  ov.querySelector(".victory-next").addEventListener("click", onBattleVictoryNextClick);
  return ov;
}

function renderBattleVictoryOverlay(){
  const ov = ensureBattleVictoryOverlay();
  const rewardRow = ov.querySelector(".victory-reward-row");
  const enemyName = ov.querySelector(".victory-enemy-name");
  const location = ov.querySelector(".victory-meta-location");
  const floor = ov.querySelector(".victory-meta-floor");
  const turn = ov.querySelector(".victory-meta-turn");
  const info = getBattleVictoryInfo();
  if(rewardRow) renderBattleVictoryRewardSlots(rewardRow);
  if(enemyName) enemyName.textContent = info.enemyNames;
  if(location) location.textContent = info.location;
  if(floor) floor.textContent = info.floor;
  if(turn) turn.textContent = info.turn;
  updateBattleVictoryNextButton(ov);
  ov.classList.add("show");
}

function getBattleVictoryRewards(){
  if(!S.victoryRewards){
    S.victoryRewards = createBattleVictoryBaseRewards();
    if(!S.battleSuppressOptionalRewards){
      const relicReward = buildBattleVictoryOptionalReward("relic", BATTLE_VICTORY_RELIC_CHANCE);
      const potionReward = buildBattleVictoryOptionalReward("potion", getBattleVictoryPotionChance());
      if(relicReward) S.victoryRewards.push(relicReward);
      if(potionReward) S.victoryRewards.push(potionReward);
    }
  }
  return S.victoryRewards;
}

function buildBattleVictoryOptionalReward(type, chance){
  if(Math.random() >= chance) return null;
  if(type === "relic"){
    const isEliteStage = S && S.battleNodeType === "elite";
    const relicCandidates = typeof window.getRelicCandidatesBySource === "function"
      ? window.getRelicCandidatesBySource(isEliteStage ? "elite" : "battle")
      : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
    const relic = pickBattleVictoryCandidate(relicCandidates);
    if(!relic) return null;
    return {
      id:"relic", itemId:relic.id, name:relic.name, icon:relic.emoji || "具",
      value:relic.name, doneText:"선택 완료", desc:relic.desc || "임시 법구 보상입니다."
    };
  }
  if(type === "potion"){
    const potionDb = typeof window.getPotionCandidatesBySource === "function"
      ? window.getPotionCandidatesBySource("battle")
      : (typeof window.POTION_DB !== "undefined" ? window.POTION_DB : BATTLE_VICTORY_POTION_CANDIDATES);
    const potion = pickBattleVictoryCandidate(potionDb);
    if(!potion) return null;
    return {
      id:"potion", itemId:potion.id, name:potion.name, icon:potion.emoji || potion.icon || "藥",
      value:potion.name, doneText:"선택 완료", desc:potion.desc || "임시 약병 보상입니다."
    };
  }
  return null;
}

function pickBattleVictoryCandidate(list){
  if(!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function getBattleVictoryInfo(){
  const stageIdx = window.MAP_STATE ? window.MAP_STATE.currentStage : -1;
  const stage = window.ACT1_MAP_STAGES && stageIdx >= 0 ? window.ACT1_MAP_STAGES[stageIdx] : null;
  const stageLabel = stage && stage.label ? stage.label : "";
  const floorMatch = stageLabel.match(/(\d+)\s*층/);
  const hudFloor = $("#hudFloor") ? $("#hudFloor").textContent.trim() : "";
  const floor = floorMatch ? floorMatch[1] + "층" : hudFloor.replace(/F$/, "층") || "1층";
  return {
    enemyNames: S.enemies.map(e => e.name).join(", ") || "악령",
    location: stageLabel ? "병원 " + stageLabel : "병원 " + floor,
    floor,
    turn: "TURN " + (S.turn || 1),
  };
}

function renderBattleVictoryRewardSlots(host){
  const rewardState = ensureVictoryRewardState();
  host.innerHTML = getBattleVictoryRewards().map(item => {
    const done = !!rewardState.done[item.id];
    const doneText = rewardState.doneText[item.id] || item.doneText;
    return '<button type="button" class="victory-reward-slot' + (done ? ' done' : '') + '" data-reward-id="' + item.id + '">' +
      '<div class="victory-reward-icon">' + item.icon + '</div>' +
      '<div class="victory-reward-name">' + item.name + '</div>' +
      '<div class="victory-reward-state">' + (done ? doneText : item.value) + '</div>' +
      '<div class="victory-reward-check">✓</div>' +
    '</button>';
  }).join("");
  host.querySelectorAll(".victory-reward-slot").forEach(slot => {
    slot.addEventListener("click", () => completeBattleVictoryReward(slot.dataset.rewardId, host));
  });
}

function completeBattleVictoryReward(id, host){
  if(isVictoryRewardDone(id)) return;
  if(id === "card" && !isVictoryRewardDone("card")){
    openBattleVictoryCardReward(host);
    return;
  }
  if((id === "relic" || id === "potion") && !isVictoryRewardDone(id)){
    openBattleVictoryConfirm(id, host);
    return;
  }
  if(id === "gold"){
    const reward = getBattleVictoryRewards().find(item => item.id === "gold");
    S.gold = (typeof S.gold === "number" ? S.gold : STARTING_GOLD) + ((reward && reward.amount) || 0);
    syncRunStateFromCombat();
    renderHud();
  }
  markVictoryRewardDone(id, "수령 완료");
  renderBattleVictoryRewardSlots(host);
  updateBattleVictoryNextButton(host.closest("#battleVictoryOverlay"));
}

function openBattleVictoryConfirm(id, host){
  const item = getBattleVictoryRewards().find(reward => reward.id === id);
  const ov = host.closest("#battleVictoryOverlay");
  if(!item || !ov) return;
  const modal = ov.querySelector(".victory-confirm-modal");
  if(!modal) return;
  modal.dataset.rewardId = id;
  modal.querySelector(".victory-confirm-title").textContent = item.name;
  modal.querySelector(".victory-confirm-desc").textContent = item.desc || item.value || "";
  closeBattleVictoryPotionReplacePanel(modal);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  modal.querySelector(".victory-confirm-take").onclick = () => finishBattleVictoryOptionalReward(id, host, "수령 완료");
  modal.querySelector(".victory-confirm-skip").onclick = () => finishBattleVictoryOptionalReward(id, host, "선택 완료");
}

function closeBattleVictoryConfirm(ov){
  if(!ov) return;
  const modal = ov.querySelector(".victory-confirm-modal");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  modal.dataset.rewardId = "";
  closeBattleVictoryPotionReplacePanel(modal);
}

function closeBattleVictoryPotionReplacePanel(modal){
  if(!modal) return;
  const panel = modal.querySelector(".victory-potion-replace-panel");
  modal.classList.remove("replace-mode");
  if(!panel) return;
  panel.classList.remove("show");
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = "";
}

function openBattleVictoryPotionReplacePanel(host){
  const ov = host && host.closest("#battleVictoryOverlay");
  const modal = ov && ov.querySelector(".victory-confirm-modal");
  const panel = modal && modal.querySelector(".victory-potion-replace-panel");
  if(!panel) return;
  const potions = Array.isArray(S.potions) ? S.potions.slice(0, getPotionSlotLimit()) : [];
  panel.innerHTML =
    '<div class="victory-potion-replace-title">교체할 약병 선택</div>' +
    '<div class="victory-potion-replace-desc">약병은 최대 3개까지 보유할 수 있습니다. 교체할 약병을 선택해주세요.</div>' +
    '<div class="victory-potion-replace-slots"></div>' +
    '<div class="victory-potion-replace-detail" aria-hidden="true"></div>' +
    '<div class="victory-potion-replace-footer">' +
      '<button type="button" class="victory-potion-replace-back">취소</button>' +
    '</div>';
  const slots = panel.querySelector(".victory-potion-replace-slots");
  const newPotion = getBattleVictoryRewards().find(item => item.id === "potion");
  panel.querySelector(".victory-potion-replace-back").addEventListener("click", () => {
    closeBattleVictoryPotionReplacePanel(modal);
  });
  potions.forEach((potion, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "victory-potion-replace-slot";
    slot.innerHTML =
      '<span class="victory-potion-replace-icon">' + (potion.emoji || potion.icon || "藥") + '</span>' +
      '<span class="victory-potion-replace-name"></span>';
    slot.querySelector(".victory-potion-replace-name").textContent = potion.name || ("약병 " + (index + 1));
    slot.addEventListener("click", () => {
      slots.querySelectorAll(".victory-potion-replace-slot").forEach(item => item.classList.remove("selected"));
      slot.classList.add("selected");
      renderBattleVictoryPotionReplaceDetail(panel, slots, slot, potion, newPotion, index, host);
    });
    slots.appendChild(slot);
  });
  modal.classList.add("replace-mode");
  panel.classList.add("show");
  panel.setAttribute("aria-hidden", "false");
}

function renderBattleVictoryPotionReplaceDetail(panel, slots, selectedSlot, oldPotion, newPotion, potionIndex, host){
  const detail = panel && panel.querySelector(".victory-potion-replace-detail");
  if(!detail) return;
  detail.innerHTML =
    '<div class="victory-potion-detail-row">' +
      '<div class="victory-potion-detail-label">보유 약병</div>' +
      '<div class="victory-potion-detail-name old"></div>' +
      '<div class="victory-potion-detail-desc old"></div>' +
    '</div>' +
    '<div class="victory-potion-detail-row">' +
      '<div class="victory-potion-detail-label">새 약병</div>' +
      '<div class="victory-potion-detail-name new"></div>' +
      '<div class="victory-potion-detail-desc new"></div>' +
    '</div>' +
    '<div class="victory-potion-detail-question">이 약병을 새 약병으로 교체하시겠습니까?</div>' +
    '<div class="victory-potion-detail-actions">' +
      '<button type="button" class="victory-potion-replace-confirm">교체</button>' +
      '<button type="button" class="victory-potion-replace-cancel">취소</button>' +
    '</div>';
  detail.querySelector(".victory-potion-detail-name.old").textContent = oldPotion.name || "약병";
  detail.querySelector(".victory-potion-detail-desc.old").textContent = oldPotion.desc || oldPotion.value || "임시 약병 효과 설명입니다.";
  detail.querySelector(".victory-potion-detail-name.new").textContent = (newPotion && newPotion.name) || "새 약병";
  detail.querySelector(".victory-potion-detail-desc.new").textContent = (newPotion && (newPotion.desc || newPotion.value)) || "임시 약병 효과 설명입니다.";
  detail.querySelector(".victory-potion-replace-confirm").addEventListener("click", (ev) => {
    finishBattleVictoryPotionReplace(host, potionIndex, newPotion, ev.currentTarget);
  });
  detail.querySelector(".victory-potion-replace-cancel").addEventListener("click", () => {
    if(selectedSlot) selectedSlot.classList.remove("selected");
    if(slots) slots.querySelectorAll(".victory-potion-replace-slot").forEach(item => item.classList.remove("selected"));
    detail.classList.remove("show");
    detail.setAttribute("aria-hidden", "true");
    detail.innerHTML = "";
  });
  detail.classList.add("show");
  detail.setAttribute("aria-hidden", "false");
}

function finishBattleVictoryPotionReplace(host, potionIndex, reward, button){
  if(isVictoryRewardDone("potion")) return;
  if(!S.potions) S.potions = [];
  if(potionIndex < 0 || potionIndex >= S.potions.length) return;
  if(button){
    if(button.disabled) return;
    button.disabled = true;
  }
  const potionId = reward && reward.itemId;
  const potion = potionId
    ? ((typeof window.POTION_DB !== "undefined" ? window.POTION_DB : BATTLE_VICTORY_POTION_CANDIDATES).find(item => item && item.id === potionId) || {
        id: potionId, name: reward.name, emoji: reward.icon, desc: reward.desc
      })
    : { name:(reward && reward.name) || "새 약병", emoji:reward && reward.icon, desc:reward && reward.desc };
  S.potions[potionIndex] = { ...potion };
  const potionLimit = getPotionSlotLimit();
  if(S.potions.length > potionLimit) S.potions = S.potions.slice(0, potionLimit);
  markVictoryRewardDone("potion", "수령 완료");
  renderHud();
  const ov = host && host.closest("#battleVictoryOverlay");
  closeBattleVictoryConfirm(ov);
  if(host) renderBattleVictoryRewardSlots(host);
  updateBattleVictoryNextButton(ov);
}

function finishBattleVictoryOptionalReward(id, host, doneText){
  const rewardState = ensureVictoryRewardState();
  if(rewardState.done[id]) return;
  const reward = getBattleVictoryRewards().find(item => item.id === id);
  if(id === "relic" && doneText === "수령 완료"){
    if(!S.relics) S.relics = [];
    const relicId = reward && reward.itemId;
    const alreadyOwned = relicId && S.relics.some(relic => relic && relic.id === relicId);
    if(alreadyOwned){
      toast("이미 보유 중인 법구입니다.");
      doneText = "선택 완료";
    } else if(relicId){
      const relic = (typeof RELIC_DB !== "undefined" ? RELIC_DB : []).find(item => item && item.id === relicId) || {
        id: relicId, name: reward.name, emoji: reward.icon, desc: reward.desc
      };
      S.relics.push({ ...relic });
      renderHud();
    }
  }
  if(id === "potion" && doneText === "수령 완료"){
    if(!S.potions) S.potions = [];
    if(S.potions.length >= getPotionSlotLimit()){
      openBattleVictoryPotionReplacePanel(host);
      return;
    }
    const potionId = reward && reward.itemId;
    if(potionId){
      const potion = (typeof window.POTION_DB !== "undefined" ? window.POTION_DB : BATTLE_VICTORY_POTION_CANDIDATES).find(item => item && item.id === potionId) || {
        id: potionId, name: reward.name, emoji: reward.icon, desc: reward.desc
      };
      S.potions.push({ ...potion });
      renderHud();
    }
  }
  markVictoryRewardDone(id, doneText);
  const ov = host.closest("#battleVictoryOverlay");
  closeBattleVictoryConfirm(ov);
  renderBattleVictoryRewardSlots(host);
  updateBattleVictoryNextButton(ov);
}

function openBattleVictoryCardReward(host){
  S.victoryCardRewardOpen = true;
  const ov = host.closest("#battleVictoryOverlay");
  if(ov) ov.classList.remove("show");
  renderRewardOverlay(getRandomRewardKeys(3));
  updateEndBtn();
}

function finishBattleVictoryCardReward(){
  S.victoryCardRewardOpen = false;
  S.rewardOpen = true; S.busy = true;
  markVictoryRewardDone("card", "선택 완료");
  closeRewardOverlay();
  renderBattleVictoryOverlay();
  updateEndBtn();
}

function areBattleVictoryRewardsDone(){
  return !!(S && getBattleVictoryRewards().every(item => isVictoryRewardDone(item.id)));
}

function updateBattleVictoryNextButton(ov){
  if(!ov) return;
  const btn = ov.querySelector(".victory-next");
  if(!btn) return;
  const ready = areBattleVictoryRewardsDone();
  btn.classList.toggle("active", ready);
  btn.setAttribute("aria-disabled", ready ? "false" : "true");
}

function onBattleVictoryNextClick(){
  if(!areBattleVictoryRewardsDone()){
    toast("모든 보상을 확인해주세요.");
    return;
  }
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  proceedToMap();
}

function ensureRewardOverlay(){
  let ov = document.querySelector("#cardRewardOverlay");
  if(ov) return ov;
  ov = document.createElement("div");
  ov.id = "cardRewardOverlay";
  ov.innerHTML =
    '<div class="reward-panel">' +
      '<h2>정화 보상</h2>' +
      '<p>새로운 주문 1장을 선택해 덱에 추가하세요.</p>' +
      '<div class="reward-cards"></div>' +
      '<button type="button" class="reward-skip">건너뛰기</button>' +
    '</div>';
  document.querySelector("#game").appendChild(ov);
  ov.querySelector(".reward-skip").addEventListener("click", skipRewardCard);
  return ov;
}

function renderRewardOverlay(keys){
  if(typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED==="function")
    window.BOHYUN_MARK_CARDS_ENCOUNTERED(keys);
  const ov   = ensureRewardOverlay();
  const wrap = ov.querySelector(".reward-cards");
  wrap.innerHTML = keys.map(rewardCardHtml).join("");
  wrap.querySelectorAll(".reward-card").forEach(btn =>
    btn.addEventListener("click", () => chooseRewardCard(btn.dataset.card))
  );
  ov.classList.add("show");
}

function openCardRewardPick(options = {}){
  const keys = Array.isArray(options.keys) ? options.keys.filter(key => CARD_DB[key]) : [];
  if(keys.length === 0) return Promise.resolve(null);

  return new Promise(resolve => {
    cardRewardPickMode = {
      resolve,
      onChoose: typeof options.onChoose === "function" ? options.onChoose : null,
      title: options.title || "정화 보상",
      desc: options.desc || "새로운 주문 1장을 선택해 덱에 추가하세요."
    };

    const ov = ensureRewardOverlay();
    const title = ov.querySelector(".reward-panel h2");
    const desc = ov.querySelector(".reward-panel p");
    const skip = ov.querySelector(".reward-skip");
    if(title) title.textContent = cardRewardPickMode.title;
    if(desc) desc.textContent = cardRewardPickMode.desc;
    if(skip) skip.style.display = "none";
    renderRewardOverlay(keys);
  });
}

function resolveCardRewardPick(key){
  const mode = cardRewardPickMode;
  const card = CARD_DB[key];
  if(!mode || !card) return;
  try {
    if(mode.onChoose) mode.onChoose(key);
  } catch(error) {
    console.warn("[CardReward] 선택 보상 처리 중 오류가 발생했습니다.", error);
  }
  cardRewardPickMode = null;
  const ov = ensureRewardOverlay();
  const title = ov.querySelector(".reward-panel h2");
  const desc = ov.querySelector(".reward-panel p");
  const skip = ov.querySelector(".reward-skip");
  if(title) title.textContent = "정화 보상";
  if(desc) desc.textContent = "새로운 주문 1장을 선택해 덱에 추가하세요.";
  if(skip) skip.style.display = "";
  closeRewardOverlay();
  if(typeof toast === "function") toast(card.name + " 획득");
  mode.resolve(key);
}

window.OPEN_CARD_REWARD_PICK = openCardRewardPick;

function rewardCardHtml(key){
  const c = CARD_DB[key];
  if(!c) return "";
  return '<button type="button" class="reward-card card-frame-card cost-'+c.type+'" data-card="'+key+'">' +
    cardFaceHtml(c) +
  '</button>';
}

function closeRewardOverlay(){
  const ov = document.querySelector("#cardRewardOverlay");
  if(ov) ov.classList.remove("show");
  const victoryOv = document.querySelector("#battleVictoryOverlay");
  if(victoryOv) victoryOv.classList.remove("show");
}

/* =========================================================================
   턴 종료 → 생존 적 행동(spawnIndex 순) → 새 플레이어 턴
   ========================================================================= */
async function endTurn(){
  const tutorialEndTurnStepActive = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.isEndTurnStepActive === "function" &&
    window.TUTORIAL_BATTLE.isEndTurnStepActive();
  if((S.busy && !tutorialEndTurnStepActive) || S.over) return;
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.canEndTurn === "function" &&
     !window.TUTORIAL_BATTLE.canEndTurn()){
    const message = typeof window.TUTORIAL_BATTLE.getTutorialRestrictionMessage === "function"
      ? window.TUTORIAL_BATTLE.getTutorialRestrictionMessage("endTurn")
      : "";
    if(message && typeof toast === "function") toast(message);
    return;
  }
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.onEndTurnClicked === "function"){
    window.TUTORIAL_BATTLE.onEndTurnClicked();
  }
  S.busy = true;
  updateEndBtn();

  applyRelicTrigger("turnEnd");

  LIFE.reduceWeak(S.player, 1);
  LIFE.reduceFracture(S.player, 1);
  LIFE.reduceAnxiety(S.player, 1);
  LIFE.reduceLethargy(S.player, 1);

  S.hand.forEach(key => discardCard(key, { source:"turnEnd" }));
  S.hand = [];
  renderAll();
  await wait(250);

  if(S.player.hp<=0 && !tryApplyFatalRelic()) return endGame("lose");

  // 생존 적을 spawnIndex 순서대로 행동 (기획서 §8-5)
  const actingEnemies = livingEnemies().sort((a,b) => (a.spawnIndex||0)-(b.spawnIndex||0));
  for(const e of actingEnemies){
    const mv = e.intent;
    if(!mv) continue;

    if(mv.t==="attack"){
      applyDamageWithFeedback(S.player, mv.v, e.weak);
      if(mv.statusCard){
        const added = addStatusCardToDiscard(mv.statusCard, mv.statusCount||1);
        if(added>0) spawnFloat('.player', CARD_DB[mv.statusCard].name, 'dmg');
      }
    } else if(mv.t==="defend"){
      LIFE.addBlock(e, mv.v);
      spawnFloat('[data-id="'+e.id+'"]', '+'+mv.v, 'blk');
    } else if(mv.t==="summon"){
      const summoned = summonEnemy(e);
      spawnFloat('[data-id="'+e.id+'"]', summoned > 0 ? '소환' : '소환 실패', summoned > 0 ? 'heal' : 'blk');
    } else if(mv.t==="debuff"){
      if(mv.role==="anxiety"){
        LIFE.addAnxiety(S.player, mv.v);
        spawnFloat('.player', '불안', 'dmg');
      } else if(mv.role==="counter"){
        LIFE.addLethargy(S.player, mv.v);
        spawnFloat('.player', '무기력', 'dmg');
      } else if(mv.role==="fracture"){
        LIFE.addFracture(S.player, mv.v);
        spawnFloat('.player', '균열', 'dmg');
      } else {
        LIFE.addWeak(S.player, mv.v);
        spawnFloat('.player', '동요', 'dmg');
      }
    }

    decayEnemyStatuses(e, "afterEnemyAction");
    renderAll();
    if(S.player.hp<=0 && !tryApplyFatalRelic()) return endGame("lose");
    await wait(450);
  }

  // 새 플레이어 턴 준비
  const retainedBlock = S.retainedBlockFromRelic || 0;
  LIFE.prepareNextPlayerTurn(S.player);
  if(retainedBlock > 0){
    LIFE.addBlock(S.player, retainedBlock);
    spawnFloat('.player', '+'+retainedBlock, 'blk');
  }
  S.retainedBlockFromRelic = 0;
  S.blockGainedThisTurn = 0;
  const anxietyPenalty  = (S.player.anxiety||0)  > 0 ? 1 : 0;
  const lethargyPenalty = (S.player.lethargy||0) > 0 ? 1 : 0;
  S.energy    = Math.max(0, getMaxEnergy() - lethargyPenalty);
  const drawCount = Math.max(0, DRAW_PER_TURN - anxietyPenalty);
  if(anxietyPenalty>0)  toast("불안으로 주문 뽑기 -1");
  if(lethargyPenalty>0) toast("무기력으로 정신력 -1");
  S.turn += 1;
  drawCards(drawCount);
  // 생존 적 다음 행동 의도 계획
  livingEnemies().forEach(e => MONSTER_PATTERN.planNextIntent(e));
  S.busy = false;
  renderAll();
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.onEnemyTurnCompleted === "function"){
    window.TUTORIAL_BATTLE.onEnemyTurnCompleted();
  }
}

function endGame(result){
  const giveUpToStartOnly = !!(S && S.giveUpToStartOnly);
  S.over = result; S.busy = false;
  if(S) S.giveUpToStartOnly = false;
  saveCompletedRunRecord(result);

  // 보스 처치(승리) 시 신령의 은혜 신령 출현 연출을 먼저 보여준다.
  // runResult.js가 처리하지 못하는 결과(패배 등)는 기존 종료 UI로 폴백한다.
  if(window.RUN_RESULT_UI && typeof window.RUN_RESULT_UI.open === "function" &&
     window.RUN_RESULT_UI.open(result, () => showLegacyEndOverlay(result, giveUpToStartOnly))){
    return true;
  }

  showLegacyEndOverlay(result, giveUpToStartOnly);
  return true;
}

function showLegacyEndOverlay(result, giveUpToStartOnly){
  $("#overTitle").textContent = result==="win" ? "🎉 승리!" : "💀 패배...";
  $("#overDesc").textContent  = result==="win" ? "모든 영혼을 성불시켰습니다." : PLAYER_DEF.name+"이 쓰러졌습니다.";
  updateRestartButtonForEndGame(result === "lose" || giveUpToStartOnly);
  $("#returnStart").style.display = result==="lose" ? "block" : "none";
  $("#over").classList.add("show");
}

function updateRestartButtonForEndGame(removeRestart){
  const restartButton = document.getElementById("restart");
  if(removeRestart){
    if(restartButton) restartButton.remove();
    return;
  }
  if(restartButton){
    restartButton.hidden = false;
    restartButton.disabled = false;
    restartButton.style.display = "";
    return;
  }
  const returnStartButton = document.getElementById("returnStart");
  if(!returnStartButton || !returnStartButton.parentNode) return;
  const restoredButton = document.createElement("button");
  restoredButton.id = "restart";
  restoredButton.textContent = "다시 시작";
  restoredButton.addEventListener("click", () => {
    const over = document.querySelector("#over");
    if(over) over.classList.remove("show");
    newGame({ resetRun:true });
  });
  returnStartButton.parentNode.insertBefore(restoredButton, returnStartButton);
}

/* =========================================================================
   렌더링
   ========================================================================= */
function renderAll(){ renderHud(); renderEffects(); renderIntents(); renderField(); renderHand(); renderDock(); updateEndBtn(); }

function renderHud(){
  normalizeRunResources();
  $("#hudPortrait").textContent = S.player.emoji || "👼";
  $("#hudName").textContent     = S.player.name;
  $("#hudTitle").textContent    = S.player.title || "";
  $("#hudHp").textContent       = S.player.hp+"/"+S.player.maxHp;
  $("#hudHpFill").style.width   = Math.max(0, Math.min(100, (S.player.hp/S.player.maxHp)*100))+"%";
  $("#hudRelicCount").textContent  = resourceCount(S.relics);
  $("#hudPotionCount").textContent = resourceCount(S.potions);
  $("#hudGold").textContent        = S.gold;
  $("#hudMoonShard").textContent   = S.moonShards;
  $("#hudDeck").textContent        = STARTER_DECK.length;
  $("#hudTurnNum").textContent     = S.turn;
  renderBattleProgressHud();
  renderSideItemSlots();
  renderProfileStatuses();
}

function renderBattleProgressHud(){
  const region = document.querySelector(".progress-region");
  const floor = document.getElementById("hudFloor");
  const turn = document.getElementById("hudTurn");
  if(S && S.tutorialMode){
    if(region) region.innerHTML = '<span>튜토리얼 구역</span>';
    if(floor) floor.style.display = "none";
    if(turn && turn.previousElementSibling && turn.previousElementSibling.classList.contains("progress-separator")){
      turn.previousElementSibling.style.display = "none";
    }
    return;
  }
  const game = document.querySelector("#game");
  const battleTheme = (game && game.dataset && game.dataset.battleTheme) ||
    (S && S.battleBackground && S.battleBackground.theme) ||
    (S && S.battleStage && S.battleStage.packageTheme) ||
    "hospital";
  const themeLabel = BATTLE_THEME_LABELS[battleTheme] ||
    (S && S.battleStage && S.battleStage.packageThemeLabel) ||
    BATTLE_THEME_LABELS.hospital;
  const currentFloor = (typeof nodeFloorIdx === "function" && typeof getCurrentNodeId === "function")
    ? nodeFloorIdx(getCurrentNodeId())
    : 1;
  const stageLabel = currentFloor > 0 ? currentFloor + "스테이지" : "1스테이지";
  if(region) region.innerHTML = '<span class="progress-icon">🏥</span><span>' + themeLabel + '</span>';
  if(floor){
    floor.style.display = "";
    floor.textContent = stageLabel;
  }
  if(turn && turn.previousElementSibling && turn.previousElementSibling.classList.contains("progress-separator")){
    turn.previousElementSibling.style.display = "";
  }
}

function renderProfileStatuses(){
  const host = $("#profileStatusEffects");
  if(!host) return;
  host.innerHTML = LIFE.renderStatuses(S.player, { includeBlock: true });
}

function renderSideItemSlots(){
  const relicSlotCount = Array.isArray(S.relics) ? S.relics.length : resourceCount(S.relics);
  renderItemSlots("#sideRelicSlots",  S.relics,  relicSlotCount, "🏺");
  setupRelicSlotDragScroll();
  updateRelicScrollHint();
  renderItemSlots("#sidePotionSlots", S.potions, 3, "🧪");
}

function updateRelicScrollHint(){
  const host = document.querySelector("#sideRelicSlots");
  const panel = host && host.closest(".top-relic-panel");
  if(!host || !panel) return;
  requestAnimationFrame(() => {
    panel.classList.toggle("relic-scrollable", host.scrollWidth > host.clientWidth + 1);
  });
}

function setupRelicSlotDragScroll(){
  const host = document.querySelector("#sideRelicSlots");
  if(!host || host.dataset.dragScrollReady === "1") return;
  host.dataset.dragScrollReady = "1";
  let dragging = false, startX = 0, startScrollLeft = 0, pointerId = null;
  host.addEventListener("pointerdown", ev => {
    if(host.scrollWidth <= host.clientWidth) return;
    dragging = true;
    pointerId = ev.pointerId;
    startX = ev.clientX;
    startScrollLeft = host.scrollLeft;
    host.classList.add("drag-scrolling");
    host.setPointerCapture(pointerId);
  });
  host.addEventListener("pointermove", ev => {
    if(!dragging) return;
    host.scrollLeft = startScrollLeft - (ev.clientX - startX);
  });
  function endDrag(){
    if(!dragging) return;
    dragging = false;
    host.classList.remove("drag-scrolling");
    try{ host.releasePointerCapture(pointerId); }catch(e){}
    pointerId = null;
  }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);
  window.addEventListener("resize", updateRelicScrollHint);
}

function renderItemSlots(selector, items, maxSlots, fallbackIcon){
  const host = document.querySelector(selector);
  if(!host) return;
  const list  = Array.isArray(items) ? items : [];
  const count = Array.isArray(items) ? items.length : resourceCount(items);
  const isPotionSlots = selector === "#sidePotionSlots";
  host.innerHTML = "";
  for(let i=0; i<maxSlots; i++){
    const item   = list[i];
    const filled = i < count;
    const slot   = document.createElement("span");
    slot.className   = "side-item-slot "+(filled ? "filled" : "empty");
    if(isPotionSlots && !filled){
      slot.innerHTML = '<span class="side-empty-potion-icon" aria-hidden="true"></span>';
    } else {
      slot.textContent = filled && item && item.emoji ? item.emoji : fallbackIcon;
    }
    if(filled && item && item.name) slot.title = item.name;
    if(isPotionSlots && filled && item){
      slot.dataset.potionIndex = String(i);
      if(isAttackPotion(item)) attachPotionDrag(slot, item, i);
      slot.addEventListener("click", ev => {
        ev.stopPropagation();
        onPotionSlotClick(item, i, slot);
      });
    }
    host.appendChild(slot);
  }
}

function canUsePotionNow(){
  return !!(S && !S.busy && !S.over && !S.rewardOpen && !S.encounterCleared);
}

function isSelfUsePotion(item){
  return !!(item && (item.target === "player" || ["heal","energy","block","blockCleanse","draw","nextAttackDouble"].includes(item.type)));
}

function isHealPotion(item){
  return !!(item && (item.type === "heal" || item.effect === "healPlayerHp"));
}

function isAttackPotion(item){
  return !!(item && ["attackSingle","attackAll","applyMark","applyWeak"].includes(item.type));
}

function onPotionSlotClick(item, index, slot){
  hidePotionUseButton();
  if(!isSelfUsePotion(item)) return;
  if(!canUsePotionNow()){
    toast("전투 중 플레이어 턴에만 사용할 수 있습니다.");
    return;
  }
  showPotionUseButton(index, slot);
}

function ensurePotionUseButton(){
  let btn = document.querySelector("#potionUseButton");
  if(btn) return btn;
  btn = document.createElement("button");
  btn.id = "potionUseButton";
  btn.type = "button";
  btn.textContent = "사용";
  btn.addEventListener("click", ev => {
    ev.stopPropagation();
    if(btn.disabled) return;
    btn.disabled = true;
    const index = Number(btn.dataset.potionIndex);
    useSelfPotion(index);
  });
  document.querySelector("#game").appendChild(btn);
  document.addEventListener("click", hidePotionUseButton);
  return btn;
}

function showPotionUseButton(index, slot){
  const btn = ensurePotionUseButton();
  const anchor = slot || document.querySelector('#sidePotionSlots [data-potion-index="'+index+'"]');
  const game = document.querySelector("#game");
  if(!anchor || !game) return;
  const anchorRect = anchor.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();
  btn.dataset.potionIndex = String(index);
  btn.disabled = false;
  btn.style.left = (anchorRect.right - gameRect.left + 6) + "px";
  btn.style.top = (anchorRect.top - gameRect.top) + "px";
  btn.style.height = anchorRect.height + "px";
  btn.classList.add("show");
}

function hidePotionUseButton(){
  const btn = document.querySelector("#potionUseButton");
  if(!btn) return;
  btn.classList.remove("show");
  btn.dataset.potionIndex = "";
  btn.disabled = false;
}

function useSelfPotion(index){
  if(!canUsePotionNow()) return;
  if(!Array.isArray(S.potions)) return;
  const potion = S.potions[index];
  if(!potion || !isSelfUsePotion(potion)) return;
  applySelfPotionEffect(potion);
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
}

function applySelfPotionEffect(potion){
  const amount = typeof potion.value === "number" ? potion.value : 0;
  switch(potion.type){
    case "heal": {
      const healed = LIFE.heal(S.player, amount);
      if(healed>0) spawnFloat(".player", "+"+healed, "heal");
      break;
    }
    case "energy":
      S.energy += amount;
      toast(potion.name+" 사용: 정신력 +"+amount);
      break;
    case "block":
      gainPlayerBlock(amount);
      break;
    case "blockCleanse":
      gainPlayerBlock(amount);
      LIFE.reduceWeak(S.player, potion.removeWeak || 1);
      break;
    case "draw":
      drawCards(amount);
      break;
    case "nextAttackDouble":
      S.nextAttackMultiplier = potion.value || 2;
      toast("다음 공격 정화량 2배");
      break;
  }
}


let potionDragState = null;
function attachPotionDrag(slot, item, index){
  let startX=0, startY=0, dragging=false, pid=null;
  slot.addEventListener("pointerdown", down);
  function down(ev){
    hidePotionUseButton();
    if(!canUsePotionNow()){
      toast("전투 중 플레이어 턴에만 사용할 수 있습니다.");
      return;
    }
    pid = ev.pointerId; startX = ev.clientX; startY = ev.clientY; dragging = false;
    slot.setPointerCapture(pid);
    slot.addEventListener("pointermove", move);
    slot.addEventListener("pointerup", up);
    slot.addEventListener("pointercancel", cancel);
  }
  function move(ev){
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if(!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD){
      dragging = true;
      beginPotionDrag(slot, item, index);
    }
    if(dragging) updatePotionDrag(ev.clientX, ev.clientY);
  }
  function up(ev){ cleanup(); if(dragging) dropPotionDrag(ev.clientX, ev.clientY); }
  function cancel(){ cleanup(); if(dragging) endPotionDrag(); }
  function cleanup(){
    try{ slot.releasePointerCapture(pid); }catch(e){}
    slot.removeEventListener("pointermove", move);
    slot.removeEventListener("pointerup", up);
    slot.removeEventListener("pointercancel", cancel);
  }
}

function beginPotionDrag(slot, item, index){
  slot.classList.add("potion-dragging");
  document.querySelectorAll(".enemy").forEach(enemyEl => {
    if(!enemyEl.classList.contains("dead")) enemyEl.classList.add("targetable");
  });
  potionDragState = { slot, item, index, type:item.type, effect:item.effect, origin:slot.getBoundingClientRect() };
}

function updatePotionDrag(x, y){
  if(!potionDragState) return;
  const en = enemyUnder(x, y);
  document.querySelectorAll(".enemy.hovered").forEach(enemyEl => enemyEl.classList.remove("hovered"));
  if(en) en.el.classList.add("hovered");
  const o = potionDragState.origin || potionDragState.slot.getBoundingClientRect();
  drawAim(o.left + o.width / 2, o.top + o.height / 2, x, y);
}

function dropPotionDrag(x, y){
  const state = potionDragState;
  if(state && isAttackPotion(state.item)){
    const en = enemyUnder(x, y);
    if(en){
      if(state.type === "attackSingle") useSingleAttackPotion(state.index, en.enemy);
      if(state.type === "attackAll") useAllAttackPotion(state.index, en.enemy);
      if(state.type === "applyMark") useMarkPotion(state.index, en.enemy);
      if(state.type === "applyWeak") useWeakPotion(state.index, en.enemy);
    }
  }
  endPotionDrag();
}

function useSingleAttackPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || potion.type !== "attackSingle") return false;
  if(!targetEnemy || targetEnemy.hp <= 0) return false;
  const damage = typeof potion.value === "number" ? potion.value : 5;
  applyDamageWithFeedback(targetEnemy, damage, S.player.weak);
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  autoSelectTarget();
  if(livingEnemies().length === 0){
    nodeClear();
    renderAll();
    return true;
  }
  renderAll();
  return true;
}

function useMarkPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || potion.type !== "applyMark") return false;
  if(!targetEnemy || targetEnemy.hp <= 0) return false;
  const amount = typeof potion.value === "number" ? potion.value : 3;
  addStatus(targetEnemy, "mark", amount);
  applyRelicTrigger("onMarkApply", { target: targetEnemy, amount });
  spawnFloat('[data-id="'+targetEnemy.id+'"]', '표식 '+amount, 'heal');
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  renderAll();
  return true;
}

function useWeakPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || potion.type !== "applyWeak") return false;
  if(!targetEnemy || targetEnemy.hp <= 0) return false;
  const amount = typeof potion.value === "number" ? potion.value : 3;
  addStatus(targetEnemy, "agitation", amount);
  applyRelicTrigger("onAgitationApply", { target: targetEnemy, amount });
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  renderAll();
  return true;
}

function useAllAttackPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || potion.type !== "attackAll") return false;
  if(!targetEnemy || targetEnemy.hp <= 0) return false;
  const damage = typeof potion.value === "number" ? potion.value : 3;
  livingEnemies().forEach(enemy => applyDamageWithFeedback(enemy, damage, S.player.weak));
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  autoSelectTarget();
  if(livingEnemies().length === 0){
    nodeClear();
    renderAll();
    return true;
  }
  renderAll();
  return true;
}

function endPotionDrag(){
  $("#aim").innerHTML = "";
  document.querySelectorAll(".targetable,.hovered").forEach(enemyEl => enemyEl.classList.remove("targetable","hovered"));
  if(potionDragState && potionDragState.slot) potionDragState.slot.classList.remove("potion-dragging");
  potionDragState = null;
}

function normalizeRunResources(){
  if(!S) return;
  if(!Array.isArray(S.relics))         S.relics     = [];
  if(S.potions === undefined)          S.potions    = [];
  if(typeof S.gold !== "number")       S.gold       = STARTING_GOLD;
  if(typeof S.moonShards !== "number") S.moonShards = STARTING_MOON_SHARDS;
  if(typeof S.cleanseCount !== "number") S.cleanseCount = 0;
}

function resourceCount(value){
  if(Array.isArray(value)) return value.length;
  return typeof value==="number" ? value : 0;
}

function renderEffects(){
  const rows = [];
  if(S.player.block  > 0)        rows.push(eff("assets/status_icons/block.png","마음의 결계","결계 "+S.player.block));
  if(S.player.weak   > 0)        rows.push(eff("assets/status_icons/agitation.png","동요","정화 피해 25% 감소 ("+S.player.weak+"턴)"));
  if((S.player.fracture||0) > 0) rows.push(eff("assets/status_icons/fracture.png","균열","받는 정화 피해 25% 증가 ("+S.player.fracture+"턴)"));
  if((S.player.anxiety||0)  > 0) rows.push(eff("assets/status_icons/anxiety.png","불안","다음 턴 주문 뽑기 -1 ("+S.player.anxiety+"턴)"));
  if((S.player.lethargy||0) > 0) rows.push(eff("assets/status_icons/lethargy.png","무기력","다음 턴 정신력 -1 ("+S.player.lethargy+"턴)"));
  $("#effList").innerHTML = rows.join("") || '<div class="eff-empty">효과 없음</div>';
}
function eff(ico, name, sub){
  const iconHtml = typeof ico === "string" && ico.indexOf("assets/") === 0
    ? '<img src="'+escapeHtml(ico)+'" alt="'+escapeHtml(name)+'">'
    : ico;
  return '<div class="eff-row"><div class="eff-ico">'+iconHtml+'</div>'
       +'<div class="eff-txt"><b>'+name+'</b><span>'+sub+'</span></div></div>';
}

function renderIntents(){
  const html = S.enemies.filter(e => e.hp>0).map(e => {
    const m = e.intent;
    if(!m) return "";
    let ico, txt, cls;
    if(m.t==="attack"){
      const sn = m.statusCard && CARD_DB[m.statusCard] ? " + "+CARD_DB[m.statusCard].name : "";
      ico="💢"; txt=(m.name ? m.name+" / " : "")+"정신력 "+m.v+(e.weak>0?" (동요)":"")+sn; cls="atk";
    } else if(m.t==="defend"){
      ico="🛡️"; txt=(m.name ? m.name+" / " : "")+"결계 "+m.v+" 획득"; cls="def";
    } else if(m.t==="summon"){
      ico="🚪"; txt=(m.name ? m.name+" / " : "")+"소환"; cls="sum";
    } else {
      const isAnx = m.role==="anxiety", isLet = m.role==="counter", isFracture = m.role==="fracture";
      ico = isAnx ? "💭" : isLet ? "🌫️" : isFracture ? "💔" : "🌀";
      txt = (m.name ? m.name+" / " : "")+(isAnx ? "불안 " : isLet ? "무기력 " : isFracture ? "균열 " : "동요 ")+m.v+" 부여";
      cls = "deb";
    }
    return '<div class="eff-row"><div class="eff-ico">'+ico+'</div>'
         +'<div class="eff-txt"><b style="color:'
         +(cls==="atk"?"var(--c-red-deep)":cls==="def"?"var(--c-blue-deep)":cls==="sum"?"#6a5270":"#8a5cc0")
         +'">'+e.name+'</b><span>'+txt+'</span></div></div>';
  }).join("");
  $("#intentList").innerHTML = html || '<div class="eff-empty">성불 완료</div>';
}

function renderField(){
  const f = $("#field");
  f.innerHTML = "";
  const playerLayer = document.createElement("div");
  playerLayer.className = "player-layer";
  const monsterField = document.createElement("div");
  monsterField.className = "monster-field";
  f.appendChild(playerLayer);
  f.appendChild(monsterField);

  // 플레이어 (좌측 고정)
  playerLayer.appendChild(combatantEl({
    cls:"player", emoji:S.player.emoji||"👼",
    sprite:"assets/characters/player-temp-cutout.png",
    name:S.player.name, hp:S.player.hp, maxHp:S.player.maxHp,
    block:S.player.block, weak:S.player.weak,
    anxiety:S.player.anxiety, lethargy:S.player.lethargy,
    x:18, bottom:"0", intent:null, hideHud:true,
  }));

  // 몬스터 수별 X 배치 (기획서 §9-1)
  const X_POS = { 1:[55], 2:[42,68], 3:[33,55,78], 4:[24,45,66,87] };
  const xList = X_POS[Math.min(livingEnemies().length, 4)] || X_POS[4];
  let liveIndex = 0;

  S.enemies.forEach((e, i) => {
    const positionIndex = e.hp > 0 ? liveIndex++ : i;
    const el = combatantEl({
      cls:"enemy ghost"+(e.id===S.selectedId ? " selected" : ""),
      sprite:e.image, name:e.name,
      hp:e.hp, maxHp:e.maxHp, block:e.block, weak:e.weak, mark:e.mark, status:e.status,
      anxiety:e.anxiety, lethargy:e.lethargy,
      x: xList[positionIndex] ?? 55, bottom:"4cqh",
      intent:e.intent, id:e.id,
    });
    if(e.hp<=0) el.classList.add("dead");
    el.addEventListener("pointerdown", () => { if(e.hp>0){ S.selectedId=e.id; renderField(); } });
    monsterField.appendChild(el);
  });
}

function combatantEl(o){
  const el = document.createElement("div");
  el.className    = "combatant "+o.cls;
  el.style.left   = o.x+"%";
  el.style.bottom = o.bottom || "2cqh";
  el.style.transform = "translateX(-50%)";
  if(o.id) el.dataset.id = o.id;
  const intentHtml = o.intent ? intentBubble(o.intent, o.weak) : "";
  const avatarHtml = o.sprite
    ? '<div class="avatar sprite-avatar"><img src="'+o.sprite+'" alt=""></div>'
    : '<div class="avatar">'+(o.emoji || "")+'</div>';
  const statusHtml = renderEnemyStatusIcons(o);
  // LIFE.renderCombatantStats()의 기존 동요/표식 표시와 새 StatusData 표시가 중복되지 않도록
  // 전투 계산용 원본 값은 유지하고, 렌더링용 객체에서만 상태값을 숨깁니다.
  const statsRenderObj = o.hideHud ? o : { ...o, weak:0, mark:0, status:{} };
  const infoHtml = o.hideHud
    ? ""
    : '<div class="combatant-info">'+LIFE.renderCombatantStats(statsRenderObj, { reserveBlockSpace:false })+statusHtml+'</div>';
  el.innerHTML = intentHtml + avatarHtml + infoHtml + '<div class="hit"></div>';
  return el;
}

function intentBubble(m, weak){
  if(m.t==="attack"){
    const sn = m.statusCard && CARD_DB[m.statusCard] ? ' +'+CARD_DB[m.statusCard].name : '';
    return '<div class="intent atk">💢 '+m.v+(weak>0?'↓':'')+sn+'</div>';
  }
  if(m.t==="defend")     return '<div class="intent def">🛡️ 보호</div>';
  if(m.t==="summon")     return '<div class="intent deb">🚪 소환</div>';
  if(m.role==="anxiety") return '<div class="intent deb">💭 불안</div>';
  if(m.role==="counter") return '<div class="intent deb">🌫️ 무기력</div>';
  if(m.role==="fracture") return '<div class="intent deb">💔 균열</div>';
  return '<div class="intent deb">🌀 동요</div>';
}

function renderHand(){
  const h = $("#hand");
  h.innerHTML = "";
  S.hand.forEach((key, i) => {
    const c  = CARD_DB[key];
    const el = document.createElement("div");
    el.className     = "card card-frame-card cost-"+c.type;
    el.dataset.index = i;
    el.innerHTML = cardFaceHtml(c);
    attachDrag(el, i);
    h.appendChild(el);
  });
}

function renderDock(){
  $("#energy .val").textContent  = S.energy+"/"+getMaxEnergy();
  renderEnergyOrbs();
  $("#deckCount").textContent    = S.draw.length;
  $("#discardCount").textContent = S.discard.length;
}

function renderEnergyOrbs(){
  const wrap = document.querySelector("#energy .energy-orbs");
  if(!wrap) return;
  wrap.innerHTML = "";
  for(let i=0; i<ENERGY_SLOT_COUNT; i++){
    const orb = document.createElement("span");
    let state = "empty";
    if(i < getMaxEnergy()) state = i < S.energy ? "active" : "used";
    orb.className = "energy-slot "+state;
    wrap.appendChild(orb);
  }
}

function updateEndBtn(){
  const tutorialEndTurnStepActive = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.isEndTurnStepActive === "function" &&
    window.TUTORIAL_BATTLE.isEndTurnStepActive();
  const tutorialBlocksEndTurn = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.canEndTurn === "function" &&
    !window.TUTORIAL_BATTLE.canEndTurn();
  $("#endTurn").disabled = !!((S.busy && !tutorialEndTurnStepActive) || S.over || tutorialBlocksEndTurn);
}

/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
function attachDrag(cardEl, index){
  let startX=0, startY=0, dragging=false, pid=null;
  cardEl.addEventListener("pointerdown", down);
  function down(ev){
    if(S.busy||S.over) return;
    const key = S.hand[index];
    const card = CARD_DB[key];
    if(window.TUTORIAL_BATTLE &&
       typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
       window.TUTORIAL_BATTLE.isTutorialBattle() &&
       typeof window.TUTORIAL_BATTLE.canUseCard === "function" &&
       !window.TUTORIAL_BATTLE.canUseCard(card, key, index)){
      const message = typeof window.TUTORIAL_BATTLE.getTutorialRestrictionMessage === "function"
        ? window.TUTORIAL_BATTLE.getTutorialRestrictionMessage("card")
        : "";
      if(message && typeof toast === "function") toast(message);
      return;
    }
    pid=ev.pointerId; startX=ev.clientX; startY=ev.clientY; dragging=false;
    cardEl.setPointerCapture(pid);
    cardEl.addEventListener("pointermove",   move);
    cardEl.addEventListener("pointerup",     up);
    cardEl.addEventListener("pointercancel", cancel);
  }
  function move(ev){
    const dx=ev.clientX-startX, dy=ev.clientY-startY;
    if(!dragging && Math.hypot(dx,dy)>DRAG_THRESHOLD){ dragging=true; beginDrag(cardEl, index); }
    if(dragging) updateDrag(ev.clientX, ev.clientY, index);
  }
  function up(ev){ cleanup(); if(dragging){ dragging=false; dropDrag(ev.clientX, ev.clientY, index); } }
  function cancel(){ cleanup(); if(dragging){ dragging=false; endDrag(); } }
  function cleanup(){
    try{ cardEl.releasePointerCapture(pid); }catch(e){}
    cardEl.removeEventListener("pointermove",   move);
    cardEl.removeEventListener("pointerup",     up);
    cardEl.removeEventListener("pointercancel", cancel);
  }
}

let dragState = null;
function beginDrag(cardEl, index){
  const c     = CARD_DB[S.hand[index]];
  const clone = $("#dragClone");
  clone.innerHTML = '<div class="card card-frame-card cost-'+c.type+'" style="width:100%;height:100%">'+
    cardFaceHtml(c) + '</div>';
  if(c.target==="enemy"){
    cardEl.classList.add("targeting");
  } else {
    cardEl.classList.add("dragging");
    clone.style.display = "block";
  }
  dragState = { cardEl, card:c, index, origin:cardEl.getBoundingClientRect() };
  if(c.target==="enemy") document.querySelectorAll(".enemy").forEach(e => {
    if(!e.classList.contains("dead")) e.classList.add("targetable");
  });
}

function updateDrag(x, y){
  if(!dragState) return;
  if(dragState.card.target!=="enemy"){
    const clone = $("#dragClone");
    clone.style.left = x+"px"; clone.style.top = y+"px";
  }
  const en = enemyUnder(x, y);
  document.querySelectorAll(".enemy.hovered").forEach(e => e.classList.remove("hovered"));
  if(dragState.card.target==="enemy" && en) en.el.classList.add("hovered");
  if(dragState.card.target==="enemy"){
    const o = dragState.cardEl.getBoundingClientRect();
    drawAim(o.left+o.width/2, o.top+o.height/2, x, y);
  }
}

function dropDrag(x, y, index){
  const c = dragState ? dragState.card : CARD_DB[S.hand[index]];
  if(c.target==="enemy"){
    const en = enemyUnder(x, y);
    if(en) playCard(index, en.enemy);
  } else {
    const dock = $("#dock").getBoundingClientRect();
    if(y < dock.top) playCard(index, null);
  }
  endDrag();
}

function endDrag(){
  $("#dragClone").style.display = "none";
  $("#aim").innerHTML = "";
  document.querySelectorAll(".targetable,.hovered").forEach(e => e.classList.remove("targetable","hovered"));
  if(dragState && dragState.cardEl) dragState.cardEl.classList.remove("dragging","targeting");
  dragState = null;
  renderHand();
}

function enemyUnder(x, y){
  const el = document.elementFromPoint(x, y);
  if(!el) return null;
  const ce = el.closest(".enemy");
  if(!ce || ce.classList.contains("dead")) return null;
  const enemy = S.enemies.find(e => e.id===ce.dataset.id);
  return enemy && enemy.hp>0 ? { el:ce, enemy } : null;
}

function drawAim(x1, y1, x2, y2){
  const mx=(x1+x2)/2, my=Math.min(y1,y2)-60;
  $("#aim").innerHTML =
    '<svg width="100%" height="100%" style="position:absolute;inset:0">'+
    '<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="6" refY="6" orient="auto">'+
    '<path d="M2 2 L10 6 L2 10 Z" fill="#e7b54a"/></marker></defs>'+
    '<path d="M'+x1+' '+y1+' Q'+mx+' '+my+' '+x2+' '+y2+'" fill="none" '+
    'stroke="#e7b54a" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" '+
    'marker-end="url(#ah)" opacity="0.9"/></svg>';
}

/* =========================================================================
   피드백 유틸
   ========================================================================= */
function spawnFloat(sel, text, kind){
  const host = document.querySelector(sel);
  if(!host) return;
  const g  = $("#game").getBoundingClientRect();
  const r  = host.getBoundingClientRect();
  const el = document.createElement("div");
  el.className   = "float "+kind;
  el.textContent = text;
  el.style.left      = (r.left-g.left+r.width/2)+"px";
  el.style.top       = (r.top-g.top+r.height*0.25)+"px";
  el.style.transform = "translateX(-50%)";
  $("#fx").appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/* 전역 토스트는 모든 모달/오버레이보다 위에 떠야 하므로 toastService.js의 전역 레이어를 통해 표시합니다. */
function toast(msg, type){
  if(typeof window.showToast === "function") window.showToast(msg, type);
}
function flashEnergy(){ const e=$("#energy"); e.classList.add("flash"); setTimeout(()=>e.classList.remove("flash"),350); }
const wait = ms => new Promise(r => setTimeout(r, ms));

/* =========================================================================
   보상 오버레이 CSS
   ========================================================================= */
function injectRewardStyles(){
  if(document.querySelector("#rewardStyle")) return;
  const style = document.createElement("style");
  style.id = "rewardStyle";
  style.textContent = `
    #cardRewardOverlay{position:absolute;inset:0;z-index:220;display:none;place-items:center;background:rgba(10,20,40,.58);backdrop-filter:blur(.5cqh);}
    #cardRewardOverlay.show{display:grid;}
    .reward-panel{width:min(70cqw,90cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.94);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;}
    .reward-panel h2{font-size:3.2cqh;margin-bottom:.8cqh;color:var(--c-ink);}
    .reward-panel p{font-size:1.7cqh;color:var(--c-ink-soft);margin-bottom:2cqh;}
    .reward-cards{display:flex;justify-content:center;align-items:stretch;gap:1.4cqw;margin-bottom:1.6cqh;}
    .reward-card{position:relative;width:15cqw;min-height:28cqh;border-radius:1.4cqh;background:linear-gradient(180deg,#fbfcff,#eef4fb);border:.35cqh solid #cdddf0;box-shadow:0 .8cqh 1.6cqh rgba(40,70,120,.22);display:flex;flex-direction:column;align-items:center;padding:.8cqh .7cqw;cursor:pointer;font:inherit;color:var(--c-ink);transition:transform .14s, box-shadow .14s;}
    .reward-card:hover{transform:translateY(-1.4cqh) scale(1.03);box-shadow:0 1.2cqh 2.2cqh rgba(40,70,120,.34);}
    .reward-card .cost{position:absolute;top:-1cqh;left:-1cqw;width:4.6cqh;height:4.6cqh;border-radius:50%;display:grid;place-items:center;font-size:2.4cqh;font-weight:800;color:#fff;background:radial-gradient(circle at 35% 30%,#bfe6ff,#3f8fe0 70%);border:.25cqh solid #eaf6ff;}
    .reward-card .cname{font-size:2cqh;font-weight:900;margin-top:.4cqh;}
    .reward-card .art{width:100%;height:9cqh;margin:.6cqh 0;border-radius:1cqh;display:grid;place-items:center;font-size:6cqh;background:linear-gradient(160deg,#eef6ff,#dcebfb);border:.15cqh solid #d6e6f5;}
    .reward-card .type{font-size:1.4cqh;font-weight:800;color:#fff;padding:.15cqh .8cqw;border-radius:.7cqh;margin-bottom:.4cqh;}
    .reward-meta{font-size:1.25cqh;font-weight:800;color:var(--c-ink-soft);margin-bottom:.4cqh;}
    .reward-card .desc{font-size:1.45cqh;line-height:1.35;white-space:pre-line;}
    .reward-skip{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#fff;cursor:pointer;color:var(--c-ink-soft);}
    .reward-card.card-frame-card{aspect-ratio:2/3;min-height:0;height:32cqh;padding:0;border:0;overflow:hidden;background:#f5efe4;}
    .reward-card.card-frame-card .card-art-layer{position:absolute;inset:0;z-index:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(160deg,#eef6ff,#dcebfb);pointer-events:none;}
    .reward-card.card-frame-card .card-art-layer img{width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none;}
    .reward-card.card-frame-card .card-frame-layer{position:absolute;inset:0;z-index:2;width:100%;height:100%;object-fit:fill;pointer-events:none;}
    .reward-card.card-frame-card .card-text-layer{position:absolute;inset:0;z-index:3;pointer-events:none;font-weight:900;color:#10243f;}
    .reward-card.card-frame-card .card-cost-text{position:absolute;left:6.2%;top:2.4%;width:18.8%;height:13.9%;display:grid;place-items:center;color:#2b3848;font-size:3cqh;line-height:1;text-shadow:0 .08cqh 0 rgba(255,255,255,.95);}
    .reward-card.card-frame-card .card-name-text{position:absolute;left:12%;right:8%;top:5.9%;height:10%;display:grid;place-items:center;text-align:center;font-size:1.85cqh;line-height:1.05;overflow:hidden;text-shadow:0 .08cqh 0 rgba(255,255,255,.75);}
    .reward-card.card-frame-card .card-desc-text{position:absolute;left:8%;right:8%;top:77.8%;bottom:7.4%;display:block;text-align:center;font-size:1.25cqh;line-height:1.34;white-space:pre-line;overflow:hidden;}
    .reward-card.card-frame-card .card-hit-layer{position:absolute;inset:0;z-index:4;background:transparent;cursor:inherit;}
    #battleVictoryOverlay{position:absolute;inset:0;z-index:220;display:none;place-items:center;background:rgba(10,20,40,.64);backdrop-filter:blur(.5cqh);}
    #battleVictoryOverlay.show{display:grid;}
    .victory-reward-panel{width:min(62cqw,82cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.95);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;display:flex;flex-direction:column;gap:2cqh;}
    .victory-title-area h2{font-size:3.2cqh;margin-bottom:.6cqh;color:var(--c-ink);}
    .victory-title-area p{font-size:1.7cqh;color:var(--c-ink-soft);}
    .victory-section{border:.2cqh solid var(--c-panel-line);border-radius:1.4cqh;background:rgba(255,255,255,.55);padding:1.6cqh 1.5cqw;}
    .victory-section-title{font-size:1.8cqh;font-weight:900;color:var(--c-ink);margin-bottom:1.2cqh;}
    .victory-reward-row{min-height:15cqh;border:.25cqh dashed var(--c-panel-line);border-radius:1.2cqh;display:flex;align-items:center;justify-content:center;gap:1cqw;background:rgba(255,255,255,.45);}
    .victory-reward-slot{position:relative;flex:0 0 10cqw;width:10cqw;height:12.5cqh;border:.2cqh solid #d6e6f5;border-radius:1.1cqh;background:linear-gradient(180deg,#fbfcff,#eef4fb);box-shadow:0 .5cqh 1cqh rgba(40,70,120,.14);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.65cqh;color:var(--c-ink);font:inherit;cursor:pointer;}
    .victory-reward-slot.done{filter:saturate(.65) brightness(.9);border-color:#b8c6d4;background:linear-gradient(180deg,#edf1f5,#dfe6ee);color:#6f7d8a;}
    .victory-reward-check{position:absolute;top:.6cqh;right:.6cqw;width:2.3cqh;height:2.3cqh;border-radius:50%;display:none;place-items:center;background:#5d9f78;color:#fff;font-size:1.5cqh;font-weight:900;}
    .victory-reward-slot.done .victory-reward-check{display:grid;}
    .victory-reward-icon{width:4.8cqh;height:4.8cqh;border-radius:1cqh;display:grid;place-items:center;background:#fff;border:.18cqh solid var(--c-panel-line);font-size:2.3cqh;font-weight:900;color:var(--c-blue-deep);}
    .victory-reward-name{font-size:1.55cqh;font-weight:900;white-space:nowrap;}
    .victory-reward-state{min-height:1.6cqh;font-size:1.15cqh;font-weight:800;color:var(--c-ink-soft);}
    .victory-enemy-name{min-height:2.4cqh;font-size:1.85cqh;font-weight:900;color:var(--c-ink);margin-bottom:1cqh;}
    .victory-battle-meta{display:flex;justify-content:center;gap:.8cqw;flex-wrap:wrap;}
    .victory-battle-meta span{min-width:7cqw;padding:.55cqh .9cqw;border-radius:.8cqh;background:#eef4fb;border:.15cqh solid #d6e6f5;font-size:1.4cqh;font-weight:800;color:var(--c-ink-soft);}
    .victory-button-area{display:flex;justify-content:center;}
    .victory-next{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#f3f5f8;color:#9aa5b2;cursor:not-allowed;opacity:.72;}
    .victory-next.active{background:#fff;color:var(--c-ink);cursor:pointer;opacity:1;box-shadow:0 .45cqh 1cqh rgba(40,70,120,.15);}
    .victory-confirm-modal{position:absolute;inset:0;z-index:230;display:none;place-items:center;background:rgba(10,20,40,.18);}
    .victory-confirm-modal.show{display:flex;align-items:center;justify-content:center;gap:1cqw;}
    .victory-confirm-modal.replace-mode{background:rgba(10,20,40,.42);backdrop-filter:blur(.35cqh);}
    .victory-confirm-modal.replace-mode .victory-confirm-box{display:none;}
    .victory-confirm-box{width:min(28cqw,42cqh);padding:2cqh 2cqw;border-radius:1.4cqh;background:#fff;border:.25cqh solid var(--c-panel-line);box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.32);text-align:center;}
    .victory-confirm-title{font-size:2.1cqh;font-weight:900;color:var(--c-ink);margin-bottom:.8cqh;}
    .victory-confirm-desc{font-size:1.45cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.35;margin-bottom:1.6cqh;}
    .victory-confirm-actions{display:flex;justify-content:center;gap:.8cqw;}
    .victory-confirm-actions button{font:inherit;font-size:1.55cqh;font-weight:900;padding:.75cqh 1.2cqw;border-radius:.9cqh;border:.2cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);cursor:pointer;}
    .victory-confirm-take{box-shadow:0 .35cqh .8cqh rgba(40,70,120,.13);}
    .victory-potion-replace-panel{display:none;width:min(25cqw,38cqh);padding:1.6cqh 1.4cqw;border-radius:1.2cqh;background:#fff;border:.25cqh solid var(--c-panel-line);box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.28);text-align:left;}
    .victory-potion-replace-panel.show{display:block;}
    .victory-potion-replace-title{font-size:1.75cqh;font-weight:900;color:var(--c-ink);margin-bottom:.7cqh;text-align:center;}
    .victory-potion-replace-desc{font-size:1.25cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.35;margin-bottom:1.2cqh;text-align:center;}
    .victory-potion-replace-slots{display:flex;flex-direction:column;gap:.7cqh;}
    .victory-potion-replace-slot{width:100%;min-height:5.2cqh;padding:.75cqh .8cqw;border-radius:.9cqh;border:.2cqh solid #d6e6f5;background:linear-gradient(180deg,#fbfcff,#eef4fb);display:flex;align-items:center;gap:.7cqw;color:var(--c-ink);font:inherit;cursor:pointer;text-align:left;}
    .victory-potion-replace-slot.selected{border-color:#5d9f78;background:linear-gradient(180deg,#eef9f3,#dcefe6);box-shadow:0 0 0 .2cqh rgba(93,159,120,.18) inset;}
    .victory-potion-replace-icon{flex:0 0 3.2cqh;width:3.2cqh;height:3.2cqh;border-radius:.8cqh;display:grid;place-items:center;background:#fff;border:.16cqh solid var(--c-panel-line);font-size:1.65cqh;font-weight:900;color:var(--c-blue-deep);}
    .victory-potion-replace-name{font-size:1.35cqh;font-weight:900;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .victory-potion-replace-detail{display:none;margin-top:1cqh;padding:1cqh .9cqw;border-radius:.9cqh;border:.18cqh solid #d6e6f5;background:#f7fafc;}
    .victory-potion-replace-detail.show{display:block;}
    .victory-potion-detail-row{padding:.65cqh 0;border-bottom:.12cqh solid rgba(160,180,200,.45);}
    .victory-potion-detail-row:last-of-type{border-bottom:0;}
    .victory-potion-detail-label{font-size:1.05cqh;font-weight:900;color:#6f7d8a;margin-bottom:.25cqh;}
    .victory-potion-detail-name{font-size:1.35cqh;font-weight:900;color:var(--c-ink);margin-bottom:.2cqh;}
    .victory-potion-detail-desc{font-size:1.15cqh;font-weight:700;color:var(--c-ink-soft);line-height:1.3;}
    .victory-potion-detail-question{font-size:1.2cqh;font-weight:900;color:var(--c-ink);text-align:center;margin:1cqh 0 .8cqh;}
    .victory-potion-detail-actions{display:flex;justify-content:center;gap:.6cqw;}
    .victory-potion-detail-actions button{font:inherit;font-size:1.25cqh;font-weight:900;padding:.55cqh .9cqw;border-radius:.75cqh;border:.18cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink);cursor:pointer;}
    .victory-potion-replace-footer{display:flex;justify-content:center;margin-top:1.1cqh;}
    .victory-potion-replace-back{font:inherit;font-size:1.3cqh;font-weight:900;padding:.65cqh 1cqw;border-radius:.8cqh;border:.18cqh solid var(--c-panel-line);background:#fff;color:var(--c-ink-soft);cursor:pointer;}
  `;
  document.head.appendChild(style);
}

/* =========================================================================
   상태이상 아이콘 CSS
   ========================================================================= */
function injectStatusStyles(){
  if(document.querySelector("#statusStyle")) return;
  const style = document.createElement("style");
  style.id = "statusStyle";
  style.textContent = `
    .enemy-status-icons{display:flex !important;flex-direction:row !important;align-items:center;justify-content:center;gap:.65cqw;margin-top:.45cqh;min-height:4.5cqh;position:relative;z-index:20;}
    .enemy-status-icon{position:relative;width:4.1cqh;height:4.1cqh;border-radius:.85cqh;display:grid;place-items:center;background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(236,241,255,.86));border:.18cqh solid rgba(255,255,255,.75);box-shadow:0 .35cqh .9cqh rgba(40,50,90,.28), inset 0 0 0 .22cqh color-mix(in srgb, var(--status-color) 25%, transparent);font-size:2.15cqh;line-height:1;cursor:help;}
    .enemy-status-icon img{width:100%;height:100%;object-fit:contain;border-radius:.7cqh;}
    .enemy-status-icon span{filter:drop-shadow(0 .15cqh .2cqh rgba(0,0,0,.18));}
    .enemy-status-icon b{position:absolute;right:-.55cqh;bottom:-.55cqh;min-width:2cqh;height:2cqh;padding:0 .25cqh;border-radius:999px;display:grid;place-items:center;background:#1f2d45;color:#fff;border:.18cqh solid #fff;font-size:1.25cqh;font-weight:900;box-shadow:0 .2cqh .45cqh rgba(0,0,0,.25);}
    .enemy-status-icon.status-agitation{--status-color:#5577ff !important;}
    .enemy-status-icon.status-mark{--status-color:#ff6fb1 !important;}
    .enemy-status-icon.status-fracture{--status-color:#d94a68 !important;}
    #enemyStatusTooltip{position:fixed;left:0;top:0;z-index:99999;max-width:28cqw;min-width:17cqw;padding:1.2cqh 1.35cqw;border-radius:.9cqh;background:rgba(20,30,48,.96);color:#edf5ff;box-shadow:0 .55cqh 1.4cqh rgba(0,0,0,.32);border:.12cqh solid rgba(170,190,230,.25);pointer-events:none;opacity:0;transform:translate3d(-9999px,-9999px,0);transition:opacity .08s ease;white-space:pre-line;font-size:1.45cqh;line-height:1.45;text-align:left;}
    #enemyStatusTooltip.show{opacity:1;}
    #enemyStatusTooltip .status-tooltip-title{display:flex;align-items:center;gap:.5cqw;margin-bottom:.55cqh;font-weight:900;font-size:1.65cqh;color:#fff;}
    #enemyStatusTooltip .status-tooltip-body{font-weight:700;color:#dce8fa;}
  `;
  document.head.appendChild(style);
}

function ensureEnemyStatusTooltip(){
  let tip = document.querySelector("#enemyStatusTooltip");
  if(tip) return tip;
  tip = document.createElement("div");
  tip.id = "enemyStatusTooltip";
  document.body.appendChild(tip);
  return tip;
}

function showEnemyStatusTooltip(iconEl){
  if(!iconEl) return;
  const tip = ensureEnemyStatusTooltip();
  const statusId = iconEl.dataset.statusId;
  const data = STATUS_DATA[statusId] || {};
  const icon = data.icon || "•";
  const name = iconEl.dataset.statusName || data.name || statusId;
  const body = iconEl.dataset.statusTooltip || name;
  const bodyLines = body.split("\n").slice(1).join("\n");
  tip.innerHTML = '<div class="status-tooltip-title"><span>'+escapeHtml(icon)+'</span><b>'+escapeHtml(name)+'</b></div>'
    + '<div class="status-tooltip-body">'+escapeHtml(bodyLines || body)+'</div>';
  tip.classList.add("show");
  positionEnemyStatusTooltip(iconEl, tip);
}

function positionEnemyStatusTooltip(iconEl, tip){
  if(!iconEl || !tip) return;
  const r = iconEl.getBoundingClientRect();
  const pad = 8;
  const tw = tip.offsetWidth || 260;
  const th = tip.offsetHeight || 120;
  let left = r.left + r.width / 2 - tw / 2;
  let top = r.bottom + 10;
  if(left < pad) left = pad;
  if(left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
  if(top + th > window.innerHeight - pad) top = Math.max(pad, r.top - th - 10);
  tip.style.transform = "translate3d("+left+"px,"+top+"px,0)";
}

function hideEnemyStatusTooltip(){
  const tip = document.querySelector("#enemyStatusTooltip");
  if(!tip) return;
  tip.classList.remove("show");
  tip.style.transform = "translate3d(-9999px,-9999px,0)";
}

function bindEnemyStatusTooltipEvents(){
  document.addEventListener("mouseover", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon) showEnemyStatusTooltip(icon);
  });
  document.addEventListener("mousemove", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon) positionEnemyStatusTooltip(icon, ensureEnemyStatusTooltip());
  });
  document.addEventListener("mouseout", ev => {
    const icon = ev.target.closest && ev.target.closest(".enemy-status-icon");
    if(icon && (!ev.relatedTarget || !icon.contains(ev.relatedTarget))) hideEnemyStatusTooltip();
  });
}

function bindCombatButtonsOnce(){
  if(window.__BOHYUN_COMBAT_BUTTONS_BOUND__) return;
  window.__BOHYUN_COMBAT_BUTTONS_BOUND__ = true;
  const endTurnButton = document.querySelector("#endTurn");
  if(endTurnButton) endTurnButton.addEventListener("click", endTurn);
  const restartButton = document.querySelector("#restart");
  if(restartButton) restartButton.addEventListener("click", () => {
    const over = document.querySelector("#over");
    if(over) over.classList.remove("show");
    newGame({ resetRun:true });
  });
  const bagViewerButton = document.querySelector("#bagViewerButton");
  if(bagViewerButton){
    bagViewerButton.addEventListener("click", () => {
      if(typeof window.BAG_UI_OPEN === "function") window.BAG_UI_OPEN();
      else toast("가방을 불러올 수 없습니다.");
    });
  }
}

injectRewardStyles();
injectStatusStyles();
bindEnemyStatusTooltipEvents();
bindCombatButtonsOnce();
