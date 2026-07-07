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

/* =========================================================================
   전투화면 스킨 외형 (프로필 아이콘 / 기본 전투 스탠딩)
   - 전투 성능/스탯/판정/카드 효과에는 관여하지 않고, 표시용 이미지 경로만 결정합니다.
   - equippedSkinId는 메인메뉴 프로필 UI가 이미 캐시해 둔 값을 전투 시작 시점에 1회만 읽습니다.
   ========================================================================= */
function getEquippedSkinIdForBattle(){
  const menuProfileUI = window.VIBERUN_MENU_PROFILE_UI;
  if(menuProfileUI && typeof menuProfileUI.getEquippedSkinId === "function"){
    return menuProfileUI.getEquippedSkinId() || null;
  }
  return null;
}

function resolveBattleProfileIcon(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultProfileIcon === "function")
    ? storeData.getDefaultProfileIcon()
    : "assets/profile/profile_default.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleProfileIcon) || fallback;
}

function resolveBattleStandingImage(equippedSkinId){
  const storeData = window.VIBERUN_BM_STORE_DATA;
  const fallback = (storeData && typeof storeData.getDefaultBattleStandingImage === "function")
    ? storeData.getDefaultBattleStandingImage()
    : "assets/characters/player-temp-cutout.png";

  if(!equippedSkinId || !storeData || typeof storeData.getCharacterSkinBySkinId !== "function"){
    return fallback;
  }

  const skin = storeData.getCharacterSkinBySkinId(equippedSkinId);
  return (skin && skin.battleStandingImage) || fallback;
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
    playerAppearance: { equippedSkinId: getEquippedSkinIdForBattle() },
    enemies:  [],       // 패키지 전체 몬스터 (동시 배치)
    selectedId: null,   // 현재 선택된 적 ID
    energy:   getMaxEnergy(),
    hand: [], draw: [], discard: [], exhaust: [],
    busy: false, over: null, rewardOpen: false,
    relics: cloneRunArray(RUN_STATE.relics), potions: cloneRunArray(RUN_STATE.potions),
    gold: RUN_STATE.gold, moonShards: RUN_STATE.moonShards,
    relicRuntime: RUN_STATE.relicRuntime || {},
    selectedSpiritPathDeckIds: Array.isArray(RUN_STATE.selectedSpiritPathDeckIds)
      ? RUN_STATE.selectedSpiritPathDeckIds.slice()
      : ["barrier", "memory", "soul_mark"],
    alwaysIncludeGenericItems: true,
    battleRuntimeId: Date.now() + ":" + Math.random(),
    scoreRuntime: {
      startHp: player.hp,
      startMaxHp: player.maxHp,
      hpLoss: 0,
      battleScoreRecorded: false
    },
    cleanseCount: typeof RUN_STATE.cleanseCount === "number" ? RUN_STATE.cleanseCount : 0,
    turn: 1,
    // 전투 시작 효과 중복 적용 방지 플래그
    battleStartApplied: false,
    nextBattleStartBlock: RUN_STATE.nextBattleStartBlock || 0,
    // 노드 컨텍스트 (기획서 §2)
    battleStage: curStage || null,
    tutorialMode: !!options.tutorial || !!(curStage && curStage.type === "tutorial"),
    battleNodeType:  options.tutorial ? "tutorial" : (curStage ? (curStage.type      || "enemy") : "enemy"),
    battlePackageId: options.tutorial ? (options.tutorialEncounterId || "stage_tutorial_child_spirit") : (curStage ? (curStage.packageId || null)    : null),
    battleBackground: null,
    encounterCleared: false,
    firstAttackUsed: false,
    nextAttackMultiplier: null,
    blockGainedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    attackCardsPlayedThisTurn: 0,
    // Actual enemy HP loss this turn. Damage absorbed by block is excluded.
    damageDealtThisTurn: 0,
    pendingDrawPenalty: 0,
    pendingHandLock: 0,
    lockedHandCards: [],
    handInstances: [],
    drawInstances: [],
    discardInstances: [],
    handLockTokens: [],
    handCostOverrides: [],
    playerTurnActive: true,
    nextHandLockToken: 1,
    nextCardUid: 1,
    turnChallenges: [],
    summonCount: 0,
    relicTurnFlags: {},
    retainedBlockFromRelic: 0,
    blessings: {},
    blessingTurnFlags: {},
    nextTurnBlessingBlock: 0,
    hanpuriRecoveredThisTurn: false,
    bellStrikeUsedThisTurn: false,
    pendingCardChoice: false,
    nextTurnDrawBonus: 0,
    blockGainMultiplierThisTurn: 1,
    bellStrikePurifyBonusThisTurn: 0,
    nextHighCostCardCostDown: null,
    nextCardTemporaryCopy: null,
    lastHandDiscardedCard: null,
  };

  // 패키지 몬스터 전체 동시 배치 (기획서 §8-3)
  spawnPackageEnemies();
  applyBattleBackground();

  const initialDeck = zipShuffleCards([...STARTER_DECK], createCardInstancesForKeys(STARTER_DECK));
  S.draw = initialDeck.keys;
  S.drawInstances = initialDeck.instances;
  drawCards(DRAW_PER_TURN, { source:"turnStartBase" });
  // 전투 시작 효과는 전투당 1회만 적용한다.
  // 드로우 이후에 호출하여 "전투 시작 시 드로우 +1" 계열 법구도 자연스럽게 처리한다.
  applyBattleStartRelics();
  applyRelicTrigger("battleStartAfterDraw");
  if(S.nextBattleStartBlock > 0){
    gainPlayerBlock(S.nextBattleStartBlock);
    S.nextBattleStartBlock = 0;
    if(RUN_STATE) RUN_STATE.nextBattleStartBlock = 0;
  }
  applyRelicTrigger("turnStart");
  if(hasRelic("reversed_talisman_book")) drawCards(1, { source:"turnStartRelic" });
  applyPlayerTurnStartGimmicks();
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
  S.enemies.forEach(enemy => planEnemyIntentTarget(enemy));
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
  e.ownerId = options.ownerId || null;
  e.summonGroup = options.summonGroup || null;
  e.expireAfterActions = Number.isFinite(options.expireAfterActions)
    ? options.expireAfterActions
    : (e.runtimeFlags && Number.isFinite(e.runtimeFlags.expireAfterActions) ? e.runtimeFlags.expireAfterActions : null);
  ensureEnemyStatus(e);
  return e;
}

