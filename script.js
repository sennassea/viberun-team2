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
    relicRuntime: {},
    nextBattleStartBlock: 0,
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
  RUN_STATE.relicRuntime = S.relicRuntime || RUN_STATE.relicRuntime || {};
  RUN_STATE.nextBattleStartBlock = S.nextBattleStartBlock || 0;
}

function hasRelic(id){
  return !!(S && Array.isArray(S.relics) && S.relics.some(r => r && r.id === id));
}

function getMaxEnergy(){
  return MAX_ENERGY + (hasRelic("charm_box") ? 1 : 0) + (hasRelic("inverted_bell") || hasRelic("cracked_divine_tablet") ? 1 : 0);
}

function ensureRelicRuntime(){
  if(!RUN_STATE) RUN_STATE = createFreshRunState();
  if(!RUN_STATE.relicRuntime || typeof RUN_STATE.relicRuntime !== "object") RUN_STATE.relicRuntime = {};
  if(S && (!S.relicRuntime || typeof S.relicRuntime !== "object")) S.relicRuntime = RUN_STATE.relicRuntime;
  return S ? S.relicRuntime : RUN_STATE.relicRuntime;
}

function relicFlag(scope, relicId, key){
  const rt = ensureRelicRuntime();
  const turn = S ? (S.turn || 0) : 0;
  const battle = S ? (S.battleRuntimeId || 0) : 0;
  if(scope === "turn") return "turn:" + battle + ":" + turn + ":" + relicId + ":" + key;
  if(scope === "battle") return "battle:" + battle + ":" + relicId + ":" + key;
  return "run:" + relicId + ":" + key;
}

function useRelicFlag(scope, relicId, key, limit=1){
  const rt = ensureRelicRuntime();
  const flag = relicFlag(scope, relicId, key);
  const used = rt[flag] || 0;
  if(used >= limit) return false;
  rt[flag] = used + 1;
  return true;
}

function addPermanentCard(key, options={}){
  if(!key || !CARD_DB[key]) return false;
  const card = CARD_DB[key];
  STARTER_DECK.push(key);
  if(S && Array.isArray(S.discard) && options.addToDiscard !== false) pushDiscardCard(key, createCardInstance(key));
  const isSpellCard = card && ["attack", "defense", "skill"].includes(card.type) && card.rarity !== "status" && !card.generatedOnly;
  if(S && isSpellCard && !options.skipRelicEvent){
    applyRelicTrigger("onPermanentCardAdded", { cardKey:key, source:options.source || "unknown", duplicateByRelic:!!options.duplicateByRelic });
  }
  if(typeof syncRunStateFromCombat === "function" && S) syncRunStateFromCombat();
  return true;
}
window.addPermanentCard = addPermanentCard;

function createCardInstance(key, existing={}){
  if(!S) return { uid:"card_prebattle_"+Math.random().toString(36).slice(2), key, runtime:{ hanpuriGrowth:0 } };
  S.nextCardUid = (S.nextCardUid || 1) + 1;
  return {
    uid: existing.uid || ("card_runtime_" + (S.nextCardUid - 1)),
    key,
    runtime: { hanpuriGrowth:0, ...existing.runtime }
  };
}

function createCardInstancesForKeys(keys){
  return (keys || []).map(key => createCardInstance(key));
}

function zipShuffleCards(keys, instances){
  const pairs = (keys || []).map((key, index) => ({ key, instance:instances && instances[index] ? instances[index] : createCardInstance(key) }));
  shuffle(pairs);
  return {
    keys: pairs.map(item => item.key),
    instances: pairs.map(item => item.instance)
  };
}

function ensureCardInstanceZones(){
  if(!S) return;
  if(!Array.isArray(S.handInstances)) S.handInstances = createCardInstancesForKeys(S.hand || []);
  if(!Array.isArray(S.drawInstances)) S.drawInstances = createCardInstancesForKeys(S.draw || []);
  if(!Array.isArray(S.discardInstances)) S.discardInstances = createCardInstancesForKeys(S.discard || []);
  if(S.handInstances.length !== (S.hand || []).length) S.handInstances = createCardInstancesForKeys(S.hand || []);
  if(S.drawInstances.length !== (S.draw || []).length) S.drawInstances = createCardInstancesForKeys(S.draw || []);
  if(S.discardInstances.length !== (S.discard || []).length) S.discardInstances = createCardInstancesForKeys(S.discard || []);
}

function pushDiscardCard(key, instance){
  if(!S || !Array.isArray(S.discard)) return;
  ensureCardInstanceZones();
  S.discard.push(key);
  S.discardInstances.push(instance || createCardInstance(key));
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
  return {
    ...master,
    ...relic,
    iconImage: relic.iconImage || master.iconImage || "",
    fx: Array.isArray(relic.fx) ? relic.fx : master.fx
  };
}

function applyRelicTrigger(trigger, context={}){
  if(!S || !Array.isArray(S.relics)) return;
  S.relics = S.relics.map(hydrateRelicData);
  S.relics.forEach(relic => {
    if(!relic) return;
    if(Array.isArray(relic.fx)){
      relic.fx.forEach(effect => {
        if(effect.timing !== trigger) return;
        applyRelicEffect(relic, effect, context);
      });
    }
    if(relic.plannedTrigger === trigger) applyRelicPlannedEffect(relic, context);
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
      drawCards(effect.v || 1, { source:"relic" });
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

function applyRelicPlannedEffect(relic, context={}){
  const c = relic.plannedConditions || {};
  const e = relic.plannedEffects || {};
  switch(relic.id){
    case "bronze_incense_burner":
      drawCards(e.draw || 1, { source:"relic" });
      toast(relic.name+" 발동");
      break;
    case "moon_spirit_tablet":
      if(context.card && context.card.type === "attack" && useRelicFlag("battle", relic.id, "firstPurify")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.purifyBonus || 0);
        toast(relic.name+" 발동");
      }
      break;
    case "broken_rosary":
      if(!context.generated && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "leftover_candle_wax": {
      const energy = Math.max(0, S.energy || 0);
      if(energy >= (c.remainingEnergyMin || 1)){
        const amount = Math.min(e.maxBlock || 999, energy * (e.blockPerRemainingEnergy || 0));
        if(amount > 0){ gainPlayerBlock(amount); toast(relic.name+" 발동"); }
      }
      break;
    }
    case "tricolor_cotton_fan":
      if((c.requiredTypes || []).every(type => S.spellTypesPlayedThisTurn && S.spellTypesPlayedThisTurn[type]) && useRelicFlag("turn", relic.id, "energy")){
        S.energy = Math.min(getMaxEnergy(), (S.energy || 0) + (e.restoreEnergy || 1));
        toast(relic.name+" 발동");
      }
      break;
    case "old_hairpin":
      applyRandomHandCostReduction(e.temporaryCostReduction || 1);
      toast(relic.name+" 발동");
      break;
    case "ash_smeared_mirror":
      if((context.hpLoss || 0) > 0 && useRelicFlag("battle", relic.id, "hit")){
        S.nextTurnEnergyBonus = (S.nextTurnEnergyBonus || 0) + (e.nextTurnEnergyBonus || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "paper_crane_bundle":
      if(S.playerTurnActive && Array.isArray(S.hand) && S.hand.length === 0 && useRelicFlag("battle", relic.id, "empty")){
        drawCards(e.draw || 2, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "threshold_salt":
      if((context.rawDamage || 0) <= 0) break;
      if(useRelicFlag("battle", relic.id, "reduce")){
        context.rawDamage = Math.max(0, (context.rawDamage || 0) - (e.reduceHpDamage || 0));
        toast(relic.name+" 발동");
      }
      break;
    case "demon_sealing_tablet":
      gainPlayerBlock(e.block || 8);
      toast(relic.name+" 발동");
      break;
    case "red_golden_rope":
      if(useRelicFlag("turn", relic.id, "damage")){
        damageRandomEnemy(e.damageRandomEnemy || 2);
        toast(relic.name+" 발동");
      }
      break;
    case "ink_line_spool":
      if((context.beforeBlock || 0) >= (c.minBarrierBeforeConsume || 15) && useRelicFlag("battle", relic.id, "reward")){
        drawCards(e.draw || 1, { source:"relic" });
        S.energy = Math.min(getMaxEnergy(), (S.energy || 0) + (e.restoreEnergy || 1));
        toast(relic.name+" 발동");
      }
      break;
    case "damp_letter_tie":
      if((context.before || 0) >= (c.targetRecollectionAtLeast || 3) && (context.added || 0) > 0 && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "ward_pocket_watch":
      if(useRelicFlag("turn", relic.id, "bonus")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.recollectionDamageBonus || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "tear_catcher_gourd":
      if(context.hadRecollection && useRelicFlag("battle", relic.id, "transfer")){
        const targets = livingEnemies().filter(enemy => enemy !== context.enemy);
        if(targets.length){
          const target = targets[Math.floor(Math.random() * targets.length)];
          addStatus(target, "recollection", e.transferRecollection || 2);
          toast(relic.name+" 발동");
        }
      }
      break;
    case "lotus_lamp":
      if((context.before || 0) === 0 && (context.added || 0) > 0 && context.target){
        const flagKey = "target:" + (context.target.id || context.target.spawnIndex || "unknown");
        if(useRelicFlag("battle", relic.id, flagKey)){
          addStatus(context.target, "mark", e.markBonus || 1, { skipRelic:true });
          toast(relic.name+" 발동");
        }
      }
      break;
    case "lotus_seed_bead": {
      const target = livingEnemies()[0];
      if(target){ addStatus(target, "mark", e.applyMark || 1); toast(relic.name+" 발동"); }
      break;
    }
    case "cheondo_bell":
      if((context.consumed || 0) >= (c.minMarksConsumed || 4) && useRelicFlag("battle", relic.id, "reserve")){
        S.nextTurnEnergyBonus = (S.nextTurnEnergyBonus || 0) + (e.nextTurnRestoreEnergy || 1);
        S.nextTurnDrawBonus = (S.nextTurnDrawBonus || 0) + (e.nextTurnDraw || 1);
        toast(relic.name+" 발동");
      }
      break;
    case "old_letter_box":
      markRandomHanpuriGrowth(e.applyGrowthCount || 1);
      break;
    case "broken_red_thread":
      if(useRelicFlag("turn", relic.id, "draw")){ drawCards(e.draw || 1, { source:"relic" }); toast(relic.name+" 발동"); }
      break;
    case "unsealed_letter":
      if(context.cardKey && context.cardUid && useRelicFlag("battle", relic.id, "return")){
        S.nextTurnReturnCard = { cardUid:context.cardUid, cardKey:context.cardKey, costReduction:e.temporaryCostReduction || 1 };
        toast(relic.name+" 발동");
      }
      break;
    case "gilt_bell_clapper":
      if(useRelicFlag("turn", relic.id, "bonus")){
        context.bonusDamage = (context.bonusDamage || 0) + (e.purifyBonus || 2);
        toast(relic.name+" 발동");
      }
      break;
    case "sevenstar_knot":
      if((S.cardsPlayedThisTurn || 0) + 1 === (c.spellCount || 5) && useRelicFlag("turn", relic.id, "draw")){
        drawCards(e.draw || 1, { source:"relic" });
        toast(relic.name+" 발동");
      }
      break;
    case "torn_gut_fan":
      if((S.exhaustedSpellCountThisTurn || 0) === (c.exhaustedSpellCount || 3) &&
         useRelicFlag("turn", relic.id, "block") &&
         useRelicFlag("battle", relic.id, "block", c.maxPerBattle || 2)){
        gainPlayerBlock(e.block || 5);
        toast(relic.name+" 발동");
      }
      break;
    case "prayer_knot":
      S.nextBattleStartBlock = (S.nextBattleStartBlock || 0) + (e.nextBattleStartBlock || 6);
      if(RUN_STATE) RUN_STATE.nextBattleStartBlock = S.nextBattleStartBlock;
      toast(relic.name+" 발동");
      break;
    case "empty_lucky_pouch":
      if(useRelicFlag("run", relic.id, "skip", c.maxPerRun || 4)){
        S.gold = (S.gold || 0) + (e.gold || 15);
        syncRunStateFromCombat();
        toast(relic.name+" 발동: 복채 +" + (e.gold || 15));
      }
      break;
    case "twin_marriage_tablet":
      if(context.cardKey && !context.duplicateByRelic){
        addPermanentCard(context.cardKey, { source:"relic", duplicateByRelic:true, skipRelicEvent:true });
        toast(relic.name+" 발동");
      }
      break;
    case "inverted_bell":
      if(S.turn === 1 && !S.invertedBellAutoPlayed){
        S.invertedBellAutoPlayed = true;
        setTimeout(autoPlayInvertedBellFirstTurn, 0);
      }
      break;
    case "closed_sutra_box":
      drawCards(e.draw || 1, { source:"turnStartRelic" });
      break;
    case "reversed_talisman_book":
      if(Number.isFinite(context.handIndex)){
        setHandCardCostOverride(context.handIndex, Math.floor(Math.random() * 4));
      }
      break;
  }
}

function damageRandomEnemy(amount){
  const targets = livingEnemies();
  if(!targets.length || amount <= 0) return 0;
  const target = targets[Math.floor(Math.random() * targets.length)];
  applyDamageWithFeedback(target, amount, 0);
  return amount;
}

function tryApplyFatalRelic(){
  if(!S || !S.player || S.player.hp > 0 || !Array.isArray(S.relics)) return false;
  S.relics = S.relics.map(hydrateRelicData);
  const relicIndex = S.relics.findIndex(relic =>
    relic && (
      (Array.isArray(relic.fx) && relic.fx.some(effect => effect && effect.timing === "fatalDamage" && effect.t === "revive")) ||
      relic.id === "lizard_tail_charm"
    )
  );
  if(relicIndex < 0) return false;

  const relic = S.relics[relicIndex];
  const effect = Array.isArray(relic.fx) ? relic.fx.find(fx => fx && fx.timing === "fatalDamage" && fx.t === "revive") : null;
  const planned = relic.plannedEffects || {};
  const ratio = typeof effect?.v === "number" ? effect.v : (planned.healByMaxHpRatio || 0.5);
  const healValue = Math.max(1, Math.floor((S.player.maxHp || 1) * ratio));
  S.player.hp = 0;
  const healed = LIFE.heal(S.player, healValue);
  if(!effect || effect.consume || (relic.plannedConditions && relic.plannedConditions.consumeRelic)) S.relics.splice(relicIndex, 1);
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
    if (source) {
      const sourceLabels = {
        battle: ["battle", "일반전"],
        enemy: ["enemy", "일반전"],
        elite: ["elite", "엘리트"],
        boss: ["boss", "보스"],
        shop: ["shop", "상점"],
        event: ["event", "이벤트"],
        prayer: ["prayer", "기도터"],
        rest: ["rest", "기도터"]
      }[source] || [source];
      const from = Array.isArray(item.obtainFrom) ? item.obtainFrom : [];
      const proposal = Array.isArray(item.obtainFromProposal) ? item.obtainFromProposal : [];
      if(!sourceLabels.some(label => from.includes(label) || proposal.includes(label))) return false;
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
  if(Array.isArray(data)) return data.map(cloneMonsterRuntimeData);
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, cloneMonsterRuntimeData(value)])
  );
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
    battleRuntimeId: Date.now() + ":" + Math.random(),
    cleanseCount: typeof RUN_STATE.cleanseCount === "number" ? RUN_STATE.cleanseCount : 0,
    turn: 1,
    // 전투 시작 효과 중복 적용 방지 플래그
    battleStartApplied: false,
    nextBattleStartBlock: RUN_STATE.nextBattleStartBlock || 0,
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
  const config = summoner.summonConfig || null;
  const count = Number.isFinite(config && config.count) ? config.count : getSummonCountByGrade(summoner);
  const summonGroup = config && config.summonGroup ? config.summonGroup : null;
  if(config && Number.isFinite(config.maxLivingSummons)){
    const livingOwned = livingEnemies().filter(enemy =>
      enemy.ownerId === summoner.id && (!summonGroup || enemy.summonGroup === summonGroup)
    ).length;
    if(livingOwned >= config.maxLivingSummons) return 0;
  }
  const def = config && config.summonMonsterId && typeof COMBAT_DATA.getMonsterById === "function"
    ? COMBAT_DATA.getMonsterById(config.summonMonsterId)
    : getBasicSummonMonsterDef(summoner);
  if(!def) return 0;

  let summoned = 0;
  for(let i = 0; i < count && livingEnemies().length < maxLivingEnemies; i++){
    if(config && Number.isFinite(config.maxLivingSummons)){
      const livingOwned = livingEnemies().filter(enemy =>
        enemy.ownerId === summoner.id && (!summonGroup || enemy.summonGroup === summonGroup)
      ).length;
      if(livingOwned >= config.maxLivingSummons) break;
    }
    S.summonCount = (S.summonCount || 0) + 1;
    const enemy = createCombatEnemy(def, S.enemies.length, {
      summoned: true,
      idSuffix: "summon" + S.summonCount,
      ownerId: summoner.id,
      summonGroup,
      expireAfterActions: config && Number.isFinite(config.expireAfterActions) ? config.expireAfterActions : null
    });
    planEnemyIntentTarget(enemy);
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
function applyConfiguredPhaseIfNeeded(enemy){
  const config = enemy && enemy.phaseConfig;
  if(!enemy || !config) return false;
  const mode = config.mode || enemy.phaseMode;
  if(mode === "hpThresholdPatterns"){
    const thresholds = Array.isArray(config.thresholds) ? config.thresholds : [];
    const phases = Array.isArray(config.phases) ? config.phases : [];
    const current = enemy.phaseIndex || 0;
    let nextIndex = current;
    thresholds.forEach((threshold, index) => {
      if(enemy.hp <= threshold) nextIndex = Math.max(nextIndex, index + 1);
    });
    if(nextIndex === current) return false;
    const phase = phases[nextIndex] || phases[phases.length - 1];
    if(!phase) return false;
    enemy.phaseIndex = nextIndex;
    if(Array.isArray(phase.moves)){
      enemy.moves = cloneMonsterRuntimeData(phase.moves);
      enemy.patternIndex = 0;
    }
    if(phase.summonConfig !== undefined) enemy.summonConfig = cloneMonsterRuntimeData(phase.summonConfig);
    MONSTER_PATTERN.planNextIntent(enemy);
    planEnemyIntentTarget(enemy);
    return true;
  }
  if(mode !== "singleHpThreshold") return false;
  const phases = Array.isArray(config.phases) ? config.phases : [];
  const nextIndex = (enemy.phaseIndex || 0) + 1;
  const phase = phases[nextIndex - 1];
  if(!phase || phase.applied) return false;
  const thresholdRatio = Number.isFinite(phase.hpRatio) ? phase.hpRatio : config.hpRatio;
  const thresholdHp = Number.isFinite(phase.hp) ? phase.hp : Math.ceil(enemy.maxHp * (thresholdRatio || 0.5));
  if(enemy.hp > thresholdHp) return false;

  phase.applied = true;
  enemy.phaseIndex = nextIndex;
  if(Array.isArray(phase.moves)){
    enemy.moves = cloneMonsterRuntimeData(phase.moves);
    if(phase.resetPattern !== false) enemy.patternIndex = 0;
    enemy.intent = enemy.moves[0] || enemy.intent;
    planEnemyIntentTarget(enemy);
  }
  return true;
}

const $ = s => document.querySelector(s);
const livingEnemies = () => S.enemies.filter(e => e.hp > 0);
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }

function notifyMonsterBattleEvent(type, context={}){
  if(!S) return;
  S.lastMonsterBattleEvent = { type, context, turn:S.turn || 0 };
  handleMonsterBattleEvent(type, context);
}

function clampCounter(enemy, id, maxStack){
  const value = getMonsterCounter(enemy, id);
  updateMonsterCounter(enemy, id, "set", value, { min:0, max:Number.isFinite(maxStack) ? maxStack : 99 });
}

function addMonsterCounter(enemy, id, value, maxStack){
  updateMonsterCounter(enemy, id, "add", value, { min:0, max:Number.isFinite(maxStack) ? maxStack : 99 });
}

function reduceMonsterCounter(enemy, id, value){
  updateMonsterCounter(enemy, id, "reduce", value, { min:0 });
}

function resetMonsterCounter(enemy, id){
  updateMonsterCounter(enemy, id, "set", 0, { min:0 });
}

function handleMonsterBattleEvent(type, context={}){
  if(!S || !Array.isArray(S.enemies)) return;
  if(type === "successfulAttackCardPlayed") handleSuccessfulAttackCard(context);
  if(type === "enemyHit") handleEnemyHit(context);
  if(type === "enemyBlockBroken") handleEnemyBlockBroken(context);
  if(type === "enemyDied") handleEnemyDied(context);
}

function handleSuccessfulAttackCard(context){
}

function handleEnemyHit(context){
  const enemy = context.enemy || context.target;
  const result = context.result || {};
  if(!enemy || !(result.hpLoss > 0)) return;
  enemy.hitThisPlayerTurn = true;
}

function applyPreAttackCardGimmicks(target){
  if(!target || target.hp <= 0) return;
  const gimmick = target.gimmick || {};
  if(gimmick.type === "reflection" && !target.reflectionUsedThisPlayerTurn){
    const blockValue = gimmick.block || 0;
    if(blockValue > 0){
      grantEnemyBlock(target, blockValue);
      spawnFloat('[data-id="'+target.id+'"]', '+'+blockValue, 'blk');
    }
    target.reflectionUsedThisPlayerTurn = true;
  }
}

function handleEnemyBlockBroken(context){
  const enemy = context.enemy;
  const gimmick = enemy && enemy.gimmick;
  if(!enemy || !gimmick) return;
  if((gimmick.type === "charge" || gimmick.type === "scaling") && gimmick.counterId && gimmick.blockBreakReduction){
    reduceMonsterCounter(enemy, gimmick.counterId, gimmick.blockBreakReduction);
  }
}

function handleEnemyDied(context){
  const dead = context.enemy;
  if(!dead) return;
  livingEnemies().forEach(enemy => {
    const gimmick = enemy.gimmick || {};
    if(gimmick.type === "emptySeat" && enemy !== dead && gimmick.counterId){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
  });
}

function emitEnemyDiedOnce(enemy, context={}){
  if(!enemy || enemy.deathEventEmitted) return;
  const hadRecollection = getStatus(enemy, "recollection") > 0;
  enemy.deathEventEmitted = true;
  notifyMonsterBattleEvent("enemyDied", { ...context, enemy });
  applyRelicTrigger("onEnemyDefeated", { ...context, enemy, hadRecollection });
}

function hasPlayerStatus(statusId){
  if(!S || !S.player || !statusId) return false;
  if(statusId === "weak") return (S.player.weak || 0) > 0;
  if(statusId === "anxiety") return (S.player.anxiety || 0) > 0;
  if(statusId === "lethargy") return (S.player.lethargy || 0) > 0;
  if(statusId === "fracture") return (S.player.fracture || 0) > 0;
  return S.player.status && (S.player.status[statusId] || 0) > 0;
}

function ensureMonsterCounters(enemy){
  if(!enemy.counters || typeof enemy.counters !== "object") enemy.counters = {};
  return enemy.counters;
}

function getMonsterCounter(enemy, id){
  return (ensureMonsterCounters(enemy)[id] || 0);
}

function updateMonsterCounter(enemy, id, op, value=1, options={}){
  const counters = ensureMonsterCounters(enemy);
  const before = counters[id] || 0;
  let next = before;
  if(op === "add") next += value;
  else if(op === "reduce") next -= value;
  else if(op === "reset") next = Number.isFinite(options.resetTo) ? options.resetTo : 0;
  else if(op === "consume") next = Math.max(0, next - value);
  else if(op === "set") next = value;
  if(Number.isFinite(options.min)) next = Math.max(options.min, next);
  if(Number.isFinite(options.max)) next = Math.min(options.max, next);
  counters[id] = Math.max(0, next);
  return counters[id] - before;
}

function countStatusCards(statusId, zones=["hand","draw","discard"]){
  if(!S || !statusId) return 0;
  return zones.reduce((sum, zone) => {
    const cards = Array.isArray(S[zone]) ? S[zone] : [];
    return sum + cards.filter(key => key === statusId).length;
  }, 0);
}

function countAnyStatusCards(statusIds, zones=["hand","draw","discard"]){
  const ids = Array.isArray(statusIds) ? statusIds : [statusIds];
  return ids.reduce((sum, id) => sum + countStatusCards(id, zones), 0);
}

function countLivingSummons(group){
  return livingEnemies().filter(enemy => enemy.summoned && (!group || enemy.summonGroup === group || enemy.baseId === group)).length;
}

function getMoveTargetPolicy(actor, move){
  const conditional = move && move.conditionalTargetPolicy;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus)){
    return conditional.targetPolicy || move.targetPolicy || "self";
  }
  return move && move.targetPolicy || "self";
}

function selectMonsterSupportTarget(actor, move){
  const policy = getMoveTargetPolicy(actor, move);
  if(policy === "self") return actor;
  const others = livingEnemies().filter(enemy => enemy !== actor);
  let target = null;
  if(policy === "lowestHpAlly"){
    target = others.sort((a,b) => (a.hp - b.hp) || ((a.spawnIndex || 0) - (b.spawnIndex || 0)))[0] || null;
  } else if(policy === "lowestHpRatioAlly"){
    target = others.sort((a,b) => {
      const ar = a.maxHp ? a.hp / a.maxHp : 1;
      const br = b.maxHp ? b.hp / b.maxHp : 1;
      return (ar - br) || ((a.spawnIndex || 0) - (b.spawnIndex || 0));
    })[0] || null;
  } else if(policy === "randomOtherAlly"){
    target = others.length ? others[Math.floor(Math.random() * others.length)] : null;
  }
  if(target) return target;
  return (move && move.fallbackTarget === "self") ? actor : actor;
}

function planEnemyIntentTarget(enemy){
  if(!enemy || !enemy.intent || enemy.intent.t !== "defend"){
    if(enemy) enemy.plannedTargetId = null;
    return null;
  }
  const target = selectMonsterSupportTarget(enemy, enemy.intent);
  enemy.plannedTargetId = target ? target.id : null;
  return target;
}

function getPlannedMonsterSupportTarget(actor, move){
  if(!actor || !move) return actor;
  const planned = actor.plannedTargetId ? livingEnemies().find(enemy => enemy.id === actor.plannedTargetId) : null;
  return planned || selectMonsterSupportTarget(actor, move);
}

function getMonsterDefendValue(actor, move, target){
  if(!move) return 0;
  const usingFallback = target === actor && move.fallbackTarget === "self" && Number.isFinite(move.fallbackValue);
  let value = usingFallback ? move.fallbackValue : (move.v || 0);
  const bonus = move.conditionalValueBonus;
  if(bonus && hasPlayerStatus(bonus.ifPlayerStatus)) value += bonus.v || 0;
  if(move.counterBlock && move.counterBlock.id){
    value += getMonsterCounter(actor, move.counterBlock.id) * (move.counterBlock.per || 1);
  }
  if(move.statusCardBlock){
    const statusIds = move.statusCardBlock.statusCards || move.statusCardBlock.statusCard;
    const count = Math.min(move.statusCardBlock.maxCount || 99, countAnyStatusCards(statusIds));
    value += count * (move.statusCardBlock.per || 1);
  }
  return Math.max(0, value);
}

function grantEnemyBlock(target, value){
  if(!target || value <= 0) return 0;
  LIFE.addBlock(target, value);
  target.enemyBlockExpiresOnNextAction = true;
  target.enemyBlockGainedTurn = S.turn || 0;
  return value;
}

function clearExpiredEnemyBlockBeforeAction(enemy){
  if(!enemy || !enemy.enemyBlockExpiresOnNextAction) return false;
  if((enemy.enemyBlockGainedTurn || 0) >= (S.turn || 0)) return false;
  enemy.block = 0;
  enemy.enemyBlockExpiresOnNextAction = false;
  return true;
}

function getMonsterIntentRawDamage(enemy, move){
  if(!move) return 0;
  let damage = Number.isFinite(move.baseDamage) ? move.baseDamage : (move.v || 0);
  if(move.speedBurst && getMonsterCounter(enemy, "speed") >= (move.speedBurst.threshold || 3)){
    damage = move.speedBurst.damage || damage;
  }
  const attackRule = enemy && enemy.gimmick && (enemy.gimmick.type === "attackRule" || enemy.gimmick.type === "discipline") ? enemy.gimmick : null;
  const ruleMoveMatches = attackRule
    && move.role === attackRule.triggerMoveRole
    && (!attackRule.triggerMoveName || move.name === attackRule.triggerMoveName);
  if(ruleMoveMatches && getMonsterCounter(enemy, attackRule.counterId) >= (attackRule.maxStack || 2)){
    damage = attackRule.burstDamage || damage;
  }
  if(move.conditionalDamage && hasPlayerStatus(move.conditionalDamage.ifPlayerStatus)){
    damage = Number.isFinite(move.conditionalDamage.v) ? move.conditionalDamage.v : damage + (move.conditionalDamage.add || 0);
  }
  if(move.counterDamage && move.counterDamage.id){
    damage += getMonsterCounter(enemy, move.counterDamage.id) * (move.counterDamage.per || 1);
  }
  if(move.statusCardDamage){
    const statusIds = move.statusCardDamage.statusCards || move.statusCardDamage.statusCard;
    const count = Math.min(move.statusCardDamage.maxCount || 99, countAnyStatusCards(statusIds));
    damage += count * (move.statusCardDamage.per || 1);
  }
  if(move.summonDamage){
    damage += countLivingSummons(move.summonDamage.group) * (move.summonDamage.per || 1);
  }
  return Math.max(0, Math.floor(damage));
}

function previewMonsterFinalDamage(enemy, move){
  const rawDamage = getMonsterIntentRawDamage(enemy, move);
  if(typeof LIFE.previewDamage === "function"){
    return LIFE.previewDamage(S.player, rawDamage, enemy && enemy.weak);
  }
  const finalDamage = Math.max(0, rawDamage - (enemy && enemy.weak > 0 ? 2 : 0));
  return { rawDamage, finalDamage };
}

function applyIntentStatusCard(move){
  if(!move) return 0;
  let added = 0;
  if(move.statusCard){
    added += addStatusCardToDiscard(move.statusCard, move.statusCount || 1);
    if(added > 0 && CARD_DB[move.statusCard]) spawnFloat('.player', CARD_DB[move.statusCard].name, 'dmg');
  }
  const conditional = move.conditionalStatusCard;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus) && conditional.statusCard){
    const amount = addStatusCardToDiscard(conditional.statusCard, conditional.statusCount || 1);
    added += amount;
    if(amount > 0 && CARD_DB[conditional.statusCard]) spawnFloat('.player', CARD_DB[conditional.statusCard].name, 'dmg');
  }
  return added;
}

function getMonsterIntentStatusCardKey(move){
  if(!move) return null;
  if(move.statusCard) return move.statusCard;
  const actor = livingEnemies().find(enemy => enemy.intent === move);
  const rule = actor && actor.gimmick && (actor.gimmick.type === "attackRule" || actor.gimmick.type === "discipline") ? actor.gimmick : null;
  if(rule && rule.statusCard && move.role === rule.triggerMoveRole && (!rule.triggerMoveName || move.name === rule.triggerMoveName) && getMonsterCounter(actor, rule.counterId) >= (rule.maxStack || 2)){
    return rule.statusCard;
  }
  const conditional = move.conditionalStatusCard;
  if(conditional && hasPlayerStatus(conditional.ifPlayerStatus)) return conditional.statusCard || null;
  return null;
}

function executeMonsterAttack(enemy, move){
  notifyMonsterBattleEvent("beforeMonsterDamage", { enemy, move });
  const result = applyDamageWithFeedback(S.player, getMonsterIntentRawDamage(enemy, move), enemy.weak);
  applyIntentStatusCard(move);
  if(move.conditionalStatus && move.conditionalStatus.role === "anxiety"){
    LIFE.addAnxiety(S.player, move.conditionalStatus.v || 1);
    spawnFloat('.player', '불안', 'dmg');
  }
  const rule = enemy && enemy.gimmick && (enemy.gimmick.type === "attackRule" || enemy.gimmick.type === "discipline") ? enemy.gimmick : null;
  const ruleMoveMatches = rule
    && move.role === rule.triggerMoveRole
    && (!rule.triggerMoveName || move.name === rule.triggerMoveName);
  if(ruleMoveMatches && getMonsterCounter(enemy, rule.counterId) >= (rule.maxStack || 2)){
    if(rule.statusCard) addStatusCardToDiscard(rule.statusCard, 1);
    resetMonsterCounter(enemy, rule.counterId);
  }
  if(move.counterDamage && move.counterDamage.resetAfterUse) resetMonsterCounter(enemy, move.counterDamage.id);
  if(move.speedBurst && move.speedBurst.reset && getMonsterCounter(enemy, "speed") >= (move.speedBurst.threshold || 3)) resetMonsterCounter(enemy, "speed");
  notifyMonsterBattleEvent("afterMonsterDamage", { enemy, move, result });
  return result;
}

function executeEchoMove(enemy){
  const echo = enemy && enemy.echoMove;
  if(!enemy || !echo) return;
  if(echo.t === "attack"){
    applyDamageWithFeedback(S.player, getMonsterIntentRawDamage(enemy, echo), enemy.weak);
  } else if(echo.t === "defend"){
    const value = getMonsterDefendValue(enemy, echo, enemy);
    grantEnemyBlock(enemy, value);
    spawnFloat('[data-id="'+enemy.id+'"]', '+'+value, 'blk');
  } else if(echo.t === "debuff"){
    if(echo.role === "anxiety") LIFE.addAnxiety(S.player, echo.v || 1);
    else if(echo.role === "counter") LIFE.addLethargy(S.player, echo.v || 1);
    else if(echo.role === "fracture") LIFE.addFracture(S.player, echo.v || 1);
    else LIFE.addWeak(S.player, echo.v || 1);
    spawnFloat('.player', '메아리', 'dmg');
  }
  enemy.echoMove = null;
}

function isCardTypeMatch(card, requirementType){
  if(!card) return false;
  if(requirementType === "attack") return card.type === "attack";
  if(requirementType === "nonAttack") return card.type !== "attack" && card.type !== "status";
  return card.type === requirementType;
}

function createHandLockToken(){
  S.nextHandLockToken = (S.nextHandLockToken || 1) + 1;
  return "hand_" + (S.nextHandLockToken - 1);
}

function ensureHandLockTokens(){
  if(!Array.isArray(S.handLockTokens)) S.handLockTokens = [];
  for(let i = 0; i < S.hand.length; i++){
    if(!S.handLockTokens[i]) S.handLockTokens[i] = createHandLockToken();
  }
  if(S.handLockTokens.length > S.hand.length) S.handLockTokens.length = S.hand.length;
}

function isHandCardLocked(handIndex, key){
  ensureHandLockTokens();
  const token = S.handLockTokens[handIndex];
  return (S.lockedHandCards || []).some(lock => lock.token === token && lock.key === key);
}

function applyPendingHandLock(){
  if(!S.pendingHandLock) return;
  ensureHandLockTokens();
  const candidates = S.hand
    .map((key, index) => ({ key, index, token:S.handLockTokens[index], card:CARD_DB[key] }))
    .filter(info => info.card && info.card.type !== "status" && !info.card.unplayable);
  if(!candidates.length){ S.pendingHandLock = 0; return; }
  candidates.sort((a,b) => ((b.card.cost || 0) - (a.card.cost || 0)) || (a.index - b.index));
  const picked = candidates[0];
  S.lockedHandCards = [{ key:picked.key, token:picked.token, name:picked.card.name, untilTurnEnd:true }];
  S.pendingHandLock = 0;
  toast(picked.card.name+" 잠금");
}

function getExamPhaseIndex(enemy){
  const gimmick = enemy.gimmick || {};
  const thresholds = gimmick.thresholds || [];
  let index = 0;
  thresholds.forEach((threshold, i) => {
    if(enemy.hp <= threshold) index = i + 1;
  });
  return index;
}

function nextChallengeForEnemy(enemy){
  const gimmick = enemy.gimmick || {};
  if(gimmick.type === "question"){
    const sequence = gimmick.sequence || ["attack", "nonAttack"];
    const index = getMonsterCounter(enemy, "questionIndex") % sequence.length;
    addMonsterCounter(enemy, "questionIndex", 1, 999);
    return { enemyId:enemy.id, enemyName:enemy.name, mode:"require", types:[sequence[index]], failStatusCards:[gimmick.failStatusCard || "regret"], counterId:gimmick.burstCounterId, maxStack:gimmick.maxStack };
  }
  if(gimmick.type === "exam"){
    const phaseIndex = getExamPhaseIndex(enemy);
    const sequence = (gimmick.sequences && gimmick.sequences[phaseIndex]) || [];
    const index = getMonsterCounter(enemy, "examIndex") % Math.max(1, sequence.length);
    addMonsterCounter(enemy, "examIndex", 1, 999);
    const rule = sequence[index] || sequence[0];
    return { enemyId:enemy.id, enemyName:enemy.name, mode:rule.mode, types:rule.types || ["attack"], failStatusCards:rule.failStatusCards || ["hesitation"] };
  }
  return null;
}

function applyPlayerTurnStartGimmicks(){
  S.turnChallenges = [];
  S.lockedHandCards = [];
  livingEnemies().forEach(enemy => {
    enemy.reflectionUsedThisPlayerTurn = false;
    enemy.hitThisPlayerTurn = false;
    const challenge = nextChallengeForEnemy(enemy);
    if(challenge){
      challenge.satisfied = false;
      challenge.failed = false;
      S.turnChallenges.push(challenge);
      toast(enemy.name+" 요구: "+challenge.types.join("+"));
    }
  });
  applyPendingHandLock();
}

function applyPlayerTurnEndGimmicks(){
  livingEnemies().forEach(enemy => {
    const gimmick = enemy.gimmick || {};
    if(gimmick.type === "attention" && gimmick.counterId){
      if(enemy.hitThisPlayerTurn) reduceMonsterCounter(enemy, gimmick.counterId, 1);
      else addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "resourceRule" && gimmick.counterId && S.energy > 0){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "attackRule" && gimmick.counterId && (S.attackCardsPlayedThisTurn || 0) >= (gimmick.threshold || 3)){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "discipline" && gimmick.counterId && (S.cardsPlayedThisTurn || 0) >= (gimmick.threshold || 4)){
      addMonsterCounter(enemy, gimmick.counterId, 1, gimmick.maxStack);
    }
    if(gimmick.type === "lap" && gimmick.counterId){
      const phaseIndex = enemy.phaseIndex || 0;
      const interruptThreshold = Array.isArray(gimmick.phaseThresholds)
        ? (gimmick.phaseThresholds[phaseIndex] ?? gimmick.interruptThreshold ?? 0)
        : (gimmick.interruptThreshold || 0);
      if((S.damageDealtThisTurn || 0) < interruptThreshold) return;
      reduceMonsterCounter(enemy, gimmick.counterId, 1);
    }
  });
  (S.turnChallenges || []).forEach(challenge => {
    let failed = false;
    if(challenge.mode === "require" || challenge.mode === "requireAll"){
      failed = !challenge.satisfied;
    }
    if(challenge.mode === "forbid"){
      failed = challenge.failed;
    }
    if(failed){
      (challenge.failStatusCards || []).forEach(cardKey => addStatusCardToDiscard(cardKey, 1));
      const enemy = livingEnemies().find(item => item.id === challenge.enemyId);
      if(enemy && challenge.counterId) addMonsterCounter(enemy, challenge.counterId, 1, challenge.maxStack);
    }
  });
  S.lockedHandCards = [];
}

function updateTurnChallengesForCard(card){
  (S.turnChallenges || []).forEach(challenge => {
    const matches = (challenge.types || []).filter(type => isCardTypeMatch(card, type));
    if(challenge.mode === "require"){
      if(matches.length > 0) challenge.satisfied = true;
    } else if(challenge.mode === "requireAll"){
      challenge.matchedTypes = challenge.matchedTypes || {};
      matches.forEach(type => { challenge.matchedTypes[type] = true; });
      challenge.satisfied = (challenge.types || []).every(type => challenge.matchedTypes[type]);
    } else if(challenge.mode === "forbid"){
      if(matches.length > 0) challenge.failed = true;
    }
  });
}

function getActiveChallengeForEnemy(enemy){
  if(!enemy || !Array.isArray(S.turnChallenges)) return null;
  return S.turnChallenges.find(challenge => challenge.enemyId === enemy.id) || null;
}

function challengeLabel(challenge){
  if(!challenge) return "문항";
  const typeLabel = (challenge.types || []).map(type => type === "attack" ? "공격" : type === "nonAttack" ? "비공격" : type).join("+");
  if(challenge.mode === "forbid") return "금지 "+typeLabel;
  return "요구 "+typeLabel;
}

function applyEnemyMoveAfterAction(enemy, move){
  if(!enemy || !move) return;
  if(move.afterActionCounter && move.afterActionCounter.id){
    const op = move.afterActionCounter.op || "add";
    updateMonsterCounter(enemy, move.afterActionCounter.id, op, move.afterActionCounter.v || 1, { min:0, max:enemy.gimmick && enemy.gimmick.maxStack });
  }
  if(enemy.gimmick && enemy.gimmick.type === "scaling" && enemy.gimmick.afterActionAdd && enemy.gimmick.counterId){
    addMonsterCounter(enemy, enemy.gimmick.counterId, enemy.gimmick.afterActionAdd, enemy.gimmick.maxStack);
  }
  if(enemy.gimmick && enemy.gimmick.type === "lap" && enemy.gimmick.counterId){
    addMonsterCounter(enemy, enemy.gimmick.counterId, 1, enemy.gimmick.maxStack);
  }
  if(move.t === "lock") S.pendingHandLock = Math.max(S.pendingHandLock || 0, move.v || 1);
  if(move.t === "drawPenalty") S.pendingDrawPenalty = Math.max(S.pendingDrawPenalty || 0, move.v || 1);
  if(enemy.gimmick && enemy.gimmick.type === "echo" && ["attack", "defend", "debuff"].includes(move.t)){
    const ratio = enemy.gimmick.ratio || 0.5;
    const minValue = enemy.gimmick.minValue || 1;
    const echoValue = Math.max(minValue, Math.floor((move.v || 0) * ratio));
    enemy.echoMove = { ...move, v:echoValue };
    if(enemy.gimmick.repeatStatusCard === false) delete enemy.echoMove.statusCard;
  }
}

if(typeof window !== "undefined"){
  window.countStatusCards = countStatusCards;
  window.getMonsterIntentRawDamage = getMonsterIntentRawDamage;
  window.previewMonsterFinalDamage = previewMonsterFinalDamage;
  window.getPlannedMonsterSupportTarget = getPlannedMonsterSupportTarget;
  window.getMonsterDefendValue = getMonsterDefendValue;
  window.getMonsterIntentStatusCardKey = getMonsterIntentStatusCardKey;
}

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

function addStatus(enemy, statusId, amount, options={}){
  if(!enemy || !statusId || !amount) return 0;
  const data = STATUS_DATA[statusId] || { maxStack: 99 };
  ensureEnemyStatus(enemy);
  const before = enemy.status[statusId] || 0;
  const next = Math.min(data.maxStack || 99, before + amount);
  enemy.status[statusId] = Math.max(0, next);
  syncLegacyStatusFields(enemy);
  const added = Math.max(0, enemy.status[statusId] - before);
  if(added > 0 && statusId === "mark") triggerBlessingOnMarkApplied();
  if(added > 0 && !options.skipRelic){
    if(statusId === "mark") applyRelicTrigger("onMarkApply", { target:enemy, before, added, amount });
    if(statusId === "recollection") applyRelicTrigger("onRecollectionApplied", { target:enemy, before, added, amount });
  }
  return added;
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
      let damage = enemy.status[statusId] || 0;
      if(damage > 0){
        const ctx = { enemy, damage, bonusDamage:0 };
        applyRelicTrigger("onRecollectionDamage", ctx);
        damage += ctx.bonusDamage || 0;
        applyDamageWithFeedback(enemy, damage, 0);
      }
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

function chooseCardFromCandidates(options={}){
  const candidates = options.candidates || [];
  if(!candidates.length) return Promise.resolve(null);
  if(candidates.length === 1) return Promise.resolve(candidates[0]);
  if(S) S.pendingCardChoice = true;
  updateEndBtn();
  let ov = document.querySelector("#battleCardChoiceOverlay");
  if(!ov){
    ov = document.createElement("div");
    ov.id = "battleCardChoiceOverlay";
    ov.innerHTML =
      '<div class="battle-card-choice-panel">' +
        '<h2></h2>' +
        '<p></p>' +
        '<div class="battle-card-choice-cards"></div>' +
        '<button type="button" class="battle-card-choice-cancel">취소</button>' +
      '</div>';
    document.body.appendChild(ov);
  }
  const title = ov.querySelector("h2");
  const desc = ov.querySelector("p");
  const wrap = ov.querySelector(".battle-card-choice-cards");
  title.textContent = options.title || "카드 선택";
  desc.textContent = options.desc || "";
  wrap.innerHTML = "";
  ov.classList.add("show");
  return new Promise(resolve => {
    let settled = false;
    const finish = picked => {
      if(settled) return;
      settled = true;
      ov.classList.remove("show");
      wrap.innerHTML = "";
      if(S) S.pendingCardChoice = false;
      updateEndBtn();
      resolve(picked || null);
    };
    candidates.forEach((item, choiceIndex) => {
      const card = CARD_DB[item.key];
      if(!card) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "battle-card-choice-card reward-card card-frame-card cost-"+card.type;
      button.innerHTML = cardFaceHtml({ ...card, cost:item.cost ?? card.cost });
      button.addEventListener("click", () => finish(candidates[choiceIndex]));
      wrap.appendChild(button);
    });
    const cancel = ov.querySelector(".battle-card-choice-cancel");
    cancel.onclick = () => finish(null);
  });
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

const MONSTER_COUNTER_LABELS = {
  waiting: "기다림",
  violation: "위반",
  neglect: "외면",
  patience: "참음",
  years: "세월",
  emptySeat: "빈자리",
  leftover: "잔반",
  discipline: "지적",
  speed: "속도",
  wrongAnswer: "오답"
};

function monsterCounterIconHtml(enemyLike, counterId, count){
  if(!count || count <= 0) return "";
  const label = MONSTER_COUNTER_LABELS[counterId] || counterId;
  const max = enemyLike.gimmick && enemyLike.gimmick.counterId === counterId ? enemyLike.gimmick.maxStack : null;
  const tooltip = label + "\n현재 스택 : " + count + (Number.isFinite(max) ? "/" + max : "");
  return '<div class="enemy-status-icon status-counter" data-status-id="counter-'+escapeHtml(counterId)+'" data-status-name="'+escapeHtml(label)+'" data-status-tooltip="'+escapeHtml(tooltip)+'" style="--status-color:#9b7a32">'
       + '<span>●</span><b>'+count+'</b></div>';
}

function renderEnemyStatusIcons(enemyLike){
  if(!enemyLike || enemyLike.hideHud) return "";
  ensureEnemyStatus(enemyLike);
  const orderedStatusIds = ["agitation", "fracture", "recollection", "mark", ...Object.keys(STATUS_DATA).filter(id => !["agitation", "fracture", "recollection", "mark"].includes(id))];
  const statusHtml = orderedStatusIds
    .map(statusId => statusIconHtml(statusId, enemyLike.status?.[statusId] || 0))
    .join("");
  const counterHtml = Object.entries(enemyLike.counters || {})
    .map(([counterId, count]) => monsterCounterIconHtml(enemyLike, counterId, count))
    .join("");
  const html = statusHtml + counterHtml;
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
function getHandCardCost(handIndex, key){
  const card = CARD_DB[key];
  const base = card ? (card.cost || 0) : 0;
  if(S && Array.isArray(S.handCostOverrides) && Number.isFinite(S.handCostOverrides[handIndex])){
    return Math.max(0, S.handCostOverrides[handIndex]);
  }
  return base;
}

function setHandCardCostOverride(handIndex, cost){
  if(!S || !Array.isArray(S.hand) || handIndex < 0 || handIndex >= S.hand.length) return false;
  if(!Array.isArray(S.handCostOverrides)) S.handCostOverrides = [];
  S.handCostOverrides[handIndex] = Math.max(0, cost || 0);
  return true;
}

function applyRandomHandCostReduction(amount){
  if(!S || !Array.isArray(S.hand) || !S.hand.length) return false;
  const candidates = S.hand
    .map((key, index) => ({ key, index, card:CARD_DB[key] }))
    .filter(item => item.card && !item.card.unplayable);
  if(!candidates.length) return false;
  const picked = candidates[Math.floor(Math.random() * candidates.length)];
  const current = getHandCardCost(picked.index, picked.key);
  return setHandCardCostOverride(picked.index, Math.max(0, current - (amount || 1)));
}

function markRandomHanpuriGrowth(amount){
  if(!S) return false;
  ensureCardInstanceZones();
  const instanceZones = ["hand", "draw", "discard"];
  const instanceCandidates = [];
  instanceZones.forEach(zone => {
    (S[zone] || []).forEach((key, index) => {
      const card = CARD_DB[key];
      const instance = S[zone + "Instances"] && S[zone + "Instances"][index];
      if(card && card.hanpuriGrowth && instance) instanceCandidates.push({ zone, key, index, instance });
    });
  });
  if(!instanceCandidates.length) return false;
  const pickedInstance = instanceCandidates[Math.floor(Math.random() * instanceCandidates.length)];
  return applyHanpuriGrowth(pickedInstance.instance, amount || 1, { source:"relic", cardKey:pickedInstance.key });
}

function getHanpuriGrowth(cardRef){
  if(cardRef && typeof cardRef === "object") return (cardRef.runtime && cardRef.runtime.hanpuriGrowth) || 0;
  return 0;
}

function applyHanpuriGrowth(cardRef, amount=1, options={}){
  const cardKey = (cardRef && typeof cardRef === "object") ? cardRef.key : (options.cardKey || cardRef);
  const card = CARD_DB[cardKey];
  const meta = card && card.hanpuriGrowth;
  if(!card || !meta || amount <= 0) return false;
  const instance = (cardRef && typeof cardRef === "object") ? cardRef : null;
  if(!instance) return false;
  instance.key = instance.key || cardKey;
  instance.runtime = instance.runtime || {};
  const beforeGrowth = getHanpuriGrowth(instance);
  const maxGrowth = Number.isFinite(meta.maxGrowth) ? meta.maxGrowth : 99;
  const afterGrowth = Math.min(maxGrowth, beforeGrowth + amount);
  if(afterGrowth <= beforeGrowth) return false;
  instance.runtime.hanpuriGrowth = afterGrowth;
  applyRelicTrigger("onHanpuriGrowth", { cardUid:instance.uid, cardKey, beforeGrowth, afterGrowth, amount:afterGrowth - beforeGrowth, maxGrowth, source:options.source || "unknown" });
  triggerBlessingOnHanpuriGrowth();
  if(beforeGrowth < maxGrowth && afterGrowth >= maxGrowth){
    applyRelicTrigger("onHanpuriReachMaxGrowth", { cardUid:instance.uid, cardKey, beforeGrowth, afterGrowth, amount:afterGrowth - beforeGrowth, maxGrowth, source:options.source || "unknown" });
  }
  return true;
}

function getGrowthAdjustedValue(cardRef, effect){
  const cardKey = (cardRef && typeof cardRef === "object") ? cardRef.key : cardRef;
  const card = CARD_DB[cardKey];
  const meta = card && card.hanpuriGrowth;
  const base = effect.v || 0;
  if(!meta || !effect.growthStat || effect.growthStat !== meta.stat) return base;
  return base + getHanpuriGrowth(cardRef) * (meta.perGrowth || 0);
}

function ensureBlessingState(){
  if(!S) return;
  if(!S.blessings || typeof S.blessings !== "object") S.blessings = {};
  if(!S.blessingTurnFlags || typeof S.blessingTurnFlags !== "object") S.blessingTurnFlags = {};
  if(typeof S.nextTurnBlessingBlock !== "number") S.nextTurnBlessingBlock = 0;
  if(typeof S.hanpuriRecoveredThisTurn !== "boolean") S.hanpuriRecoveredThisTurn = false;
  if(typeof S.bellStrikeUsedThisTurn !== "boolean") S.bellStrikeUsedThisTurn = false;
}

function getBlessingCount(key){
  ensureBlessingState();
  return Math.max(0, S && S.blessings ? (S.blessings[key] || 0) : 0);
}

function gainBlessing(key, amount=1){
  if(!key || !amount) return 0;
  ensureBlessingState();
  const before = S.blessings[key] || 0;
  S.blessings[key] = Math.max(0, before + amount);
  return S.blessings[key] - before;
}

function resetBlessingTurnFlags(){
  ensureBlessingState();
  S.blessingTurnFlags = {};
  S.hanpuriRecoveredThisTurn = false;
  S.bellStrikeUsedThisTurn = false;
}

function triggerBlessingOnTurnEnd(){
  ensureBlessingState();
  const healingFragrance = getBlessingCount("healingFragrance");
  if(healingFragrance > 0){
    const healed = LIFE.heal(S.player, healingFragrance);
    if(healed > 0) spawnFloat('.player', '+'+healed, 'heal');
  }
  const quietBarrier = getBlessingCount("quietBarrier");
  if(quietBarrier > 0 && (S.player.block || 0) > 0){
    S.nextTurnBlessingBlock = (S.nextTurnBlessingBlock || 0) + quietBarrier * 3;
  }
}

function triggerBlessingOnTurnStart(){
  ensureBlessingState();
  const block = Math.max(0, S.nextTurnBlessingBlock || 0);
  S.nextTurnBlessingBlock = 0;
  if(block > 0) gainPlayerBlock(block);
}

function triggerBlessingOnMarkApplied(){
  const guidingHand = getBlessingCount("guidingHand");
  if(guidingHand <= 0 || S.blessingTurnFlags.guidingHand) return;
  S.blessingTurnFlags.guidingHand = true;
  drawCards(guidingHand, { source:"blessing" });
}

function triggerBlessingOnDamageDealt(target, result, beforeRecollection, context={}){
  const recollectionEcho = getBlessingCount("recollectionEcho");
  if(recollectionEcho <= 0 || S.blessingTurnFlags.recollectionEcho) return;
  if(!S.playerTurnActive) return;
  if(context.source !== "card" || context.damageKind !== "purification") return;
  if(!target || target === S.player || target.hp <= 0 || !result || ((result.absorbed || 0) + (result.hpLoss || 0)) <= 0) return;
  if((beforeRecollection || 0) <= 0) return;
  S.blessingTurnFlags.recollectionEcho = true;
  addStatus(target, "recollection", recollectionEcho);
}

function triggerBlessingOnHanpuriGrowth(){
  const grudgeBlessing = getBlessingCount("grudgeBlessing");
  if(grudgeBlessing > 0) gainPlayerBlock(grudgeBlessing * 2);
}

function triggerBlessingOnCardPlayed(card, key, context={}){
  const altarEnergy = getBlessingCount("altarEnergy");
  if(altarEnergy > 0 && !S.blessingTurnFlags.altarEnergy && card && card.type === "skill" && key !== "altar_preparation"){
    S.blessingTurnFlags.altarEnergy = true;
    gainPlayerBlock(altarEnergy * 2);
  }
  const heat = Math.max(0, context.heatBeforePlay || 0);
  if(heat > 0 && !S.blessingTurnFlags.heat && (S.cardsPlayedThisTurn || 0) === 4){
    S.blessingTurnFlags.heat = true;
    livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(heat * 2, en), S.player.weak, { source:"blessing", blessingKey:"heat", damageKind:"purification" }));
  }
}

function createCardToHand(cardKey, count=1){
  if(!cardKey || !CARD_DB[cardKey]) return 0;
  ensureCardInstanceZones();
  let created = 0;
  const amount = Math.max(0, count || 0);
  for(let i=0;i<amount;i++){
    const instance = createCardInstance(cardKey);
    if(S.hand.length >= 10){
      discardCard(cardKey, { source:"generatedOverflow", instance, generated:true });
    } else {
      S.hand.push(cardKey);
      S.handInstances.push(instance);
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
    }
    created += 1;
  }
  return created;
}

function getGrownHanpuriDiscardCandidates(){
  ensureCardInstanceZones();
  return S.discard.map((cardKey, index) => {
    const card = CARD_DB[cardKey];
    const instance = S.discardInstances && S.discardInstances[index];
    if(!card || !card.hanpuriGrowth || !instance || getHanpuriGrowth(instance) <= 0) return null;
    return { key:cardKey, index, instance, uid:instance.uid, zone:"discard" };
  }).filter(Boolean);
}

async function recoverGrownHanpuriFromDiscard(options={}){
  ensureCardInstanceZones();
  const candidates = getGrownHanpuriDiscardCandidates();
  if(!candidates.length || S.hand.length >= 10) return false;
  const picked = await chooseCardFromCandidates({
    title: options.costZero ? "한을 풀다" : "되새기는 밤",
    desc: "버림 더미에서 가져올 한풀이 주문을 선택하세요.",
    candidates
  });
  if(!picked) return false;
  const idx = S.discardInstances.findIndex(instance => instance && instance.uid === picked.uid);
  if(idx < 0) return false;
  const key = S.discard.splice(idx, 1)[0];
  const instance = S.discardInstances.splice(idx, 1)[0];
  S.hand.push(key);
  S.handInstances.push(instance || createCardInstance(key));
  if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
  if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
  if(options.costZero) setHandCardCostOverride(S.hand.length - 1, 0);
  S.hanpuriRecoveredThisTurn = true;
  return true;
}

function getOtherHanpuriHandCandidates(currentCardUid){
  ensureCardInstanceZones();
  return S.hand.map((cardKey, index) => {
    const card = CARD_DB[cardKey];
    const instance = S.handInstances && S.handInstances[index];
    if(!card || !instance || instance.uid === currentCardUid) return null;
    if(card.attr !== "한풀이 덱") return null;
    return { key:cardKey, index, instance, uid:instance.uid, zone:"hand", cost:getHandCardCost(index, cardKey) };
  }).filter(Boolean);
}

async function discardOtherHanpuriAndGrow(currentCardUid){
  ensureCardInstanceZones();
  const candidates = getOtherHanpuriHandCandidates(currentCardUid);
  if(!candidates.length) return -1;
  const picked = await chooseCardFromCandidates({
    title: "놓지 못한 손",
    desc: "버릴 한풀이 주문을 선택하세요.",
    candidates
  });
  if(!picked) return -1;
  const idx = S.handInstances.findIndex(instance => instance && instance.uid === picked.uid);
  if(idx < 0) return -1;
  const key = S.hand.splice(idx, 1)[0];
  const instance = S.handInstances.splice(idx, 1)[0];
  if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(idx, 1);
  if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(idx, 1);
  applyHanpuriGrowth(instance, 1, { source:"cardEffect", cardKey:key });
  discardCard(key, { source:"cardEffectDiscard", instance });
  return idx;
}

function getOtherHandCandidates(currentCardUid){
  ensureCardInstanceZones();
  return S.hand.map((cardKey, index) => {
    const card = CARD_DB[cardKey];
    const instance = S.handInstances && S.handInstances[index];
    if(!card || !instance || instance.uid === currentCardUid) return null;
    return { key:cardKey, index, instance, uid:instance.uid, zone:"hand", cost:getHandCardCost(index, cardKey) };
  }).filter(Boolean);
}

async function discardHandUnlessBellUsed(count=1, currentCardUid){
  if(S.bellStrikeUsedThisTurn) return -1;
  ensureCardInstanceZones();
  const amount = Math.max(0, count || 0);
  let firstRemoved = -1;
  for(let i=0;i<amount;i++){
    const candidates = getOtherHandCandidates(currentCardUid);
    if(!candidates.length) break;
    const picked = await chooseCardFromCandidates({
      title: "발맞춤",
      desc: "버릴 손패 1장을 선택하세요.",
      candidates
    });
    if(!picked) break;
    const idx = S.handInstances.findIndex(instance => instance && instance.uid === picked.uid);
    if(idx < 0) break;
    const key = S.hand.splice(idx, 1)[0];
    const instance = S.handInstances.splice(idx, 1)[0];
    if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(idx, 1);
    if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(idx, 1);
    discardCard(key, { source:"cardEffectDiscard", instance });
    if(firstRemoved < 0) firstRemoved = idx;
  }
  return firstRemoved;
}

function removeCardFromBattleZones(cardKey){
  if(!S || !cardKey) return false;
  ensureCardInstanceZones();
  for(const zone of ["hand", "draw", "discard"]){
    const list = S[zone];
    if(!Array.isArray(list)) continue;
    const idx = list.indexOf(cardKey);
    if(idx < 0) continue;
    list.splice(idx, 1);
    const instances = S[zone + "Instances"];
    if(Array.isArray(instances)) instances.splice(idx, 1);
    if(zone === "hand"){
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(idx, 1);
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(idx, 1);
    }
    return true;
  }
  return false;
}

function removeCardFromBattleZonesByUid(cardUid){
  if(!S || !cardUid) return null;
  ensureCardInstanceZones();
  for(const zone of ["hand", "draw", "discard"]){
    const list = S[zone];
    const instances = S[zone + "Instances"];
    if(!Array.isArray(list) || !Array.isArray(instances)) continue;
    const idx = instances.findIndex(instance => instance && instance.uid === cardUid);
    if(idx < 0) continue;
    const key = list.splice(idx, 1)[0];
    const instance = instances.splice(idx, 1)[0];
    if(zone === "hand"){
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(idx, 1);
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(idx, 1);
    }
    return { key, instance, zone };
  }
  return null;
}

async function autoPlayInvertedBellFirstTurn(){
  if(!S || S.busy || S.over || !hasRelic("inverted_bell")) return;
  let guard = 0;
  while(S.hand && S.hand.length && guard < 20){
    guard += 1;
    const key = S.hand[0];
    const card = CARD_DB[key];
    if(!card || card.unplayable || S.energy < getHandCardCost(0, key)) break;
    const target = card.target === "enemy" ? getSelectedLivingEnemy() : null;
    if(card.target === "enemy" && !target) break;
    if(!await playCard(0, target)) break;
  }
}

function drawCards(n, options={}){
  if(hasRelic("closed_sutra_box") && S.playerTurnActive && options.source && !["turnStartBase","turnStartRelic"].includes(options.source)){
    return;
  }
  ensureCardInstanceZones();
  for(let i=0;i<n;i++){
    if(S.draw.length===0){
      if(S.discard.length===0) break;
      const reshuffled = zipShuffleCards(S.discard, S.discardInstances);
      S.draw = reshuffled.keys;
      S.drawInstances = reshuffled.instances;
      S.discard = [];
      S.discardInstances = [];
    }
    const drawn = S.draw.pop();
    const drawnInstance = S.drawInstances.pop();
    if(S.hand.length >= 10) discardCard(drawn, { source:"drawOverflow", instance:drawnInstance });
    else {
      S.hand.push(drawn);
      S.handInstances.push(drawnInstance || createCardInstance(drawn));
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
      applyRelicTrigger("onCardDrawnFromDrawPile", { cardUid:(drawnInstance && drawnInstance.uid) || null, cardKey:drawn, handIndex:S.hand.length - 1, source:options.source || "unknown" });
    }
  }
}

const CARD_RARITY_REWARD_WEIGHT = Object.freeze({
  common: 6,
  uncommon: 3,
  rare: 1
});

function getCardRewardWeight(key){
  const card = CARD_DB[key];
  return card ? (CARD_RARITY_REWARD_WEIGHT[card.rarity] || 0) : 0;
}

function getWeightedCardRewardKeys(count, sourcePool){
  const picked = [];
  const pool = (Array.isArray(sourcePool) ? sourcePool : CARD_REWARD_POOL)
    .filter(key => CARD_DB[key] && getCardRewardWeight(key) > 0);
  const candidates = [...new Set(pool)];
  const amount = Math.max(0, count || 0);
  while(picked.length < amount && candidates.length){
    const total = candidates.reduce((sum, key) => sum + getCardRewardWeight(key), 0);
    if(total <= 0) break;
    let roll = Math.random() * total;
    let index = 0;
    for(; index < candidates.length; index++){
      roll -= getCardRewardWeight(candidates[index]);
      if(roll <= 0) break;
    }
    const key = candidates.splice(Math.min(index, candidates.length - 1), 1)[0];
    picked.push(key);
  }
  return picked;
}

window.getWeightedCardRewardKeys = getWeightedCardRewardKeys;
window.CARD_RARITY_REWARD_WEIGHT = CARD_RARITY_REWARD_WEIGHT;

function discardCard(key, options={}){
  const card = CARD_DB[key];
  if(!card) return;
  ensureCardInstanceZones();
  const instance = options.instance || createCardInstance(key);
  if(options.source === "turnEnd") applyHanpuriGrowth(instance, 1, { source:"turnEndDiscard", cardKey:key });
  const sr = LIFE.resolveStatusCardDiscard(card, S.player, options);
  if(sr.handled){
    if(sr.damageAmount) applyDamageWithFeedback(S.player, sr.damageAmount, 0);
    if(sr.message) toast(sr.message);
    if(sr.discard) pushDiscardCard(key, instance);
    return;
  }
  if(card.exhaust){
    S.exhaustedSpellCountThisTurn = (S.exhaustedSpellCountThisTurn || 0) + 1;
    if(Array.isArray(S.exhaust)) S.exhaust.push(key);
    const generated = !!(card.generatedOnly || options.generated);
    applyRelicTrigger("onCardExhaust", { cardUid:instance.uid, cardKey:key, card, generated, source:options.source || "unknown" });
    applyRelicTrigger("onExhaustCountEachTurn", { count:S.exhaustedSpellCountThisTurn });
    toast(card.name+" 소멸");
    return;
  }
  pushDiscardCard(key, instance);
}

function addStatusCardToDiscard(cardKey, count=1){
  const card = CARD_DB[cardKey];
  if(!card || card.rarity!=="status") return 0;
  const amount = Math.max(1, count||1);
  for(let i=0;i<amount;i++) pushDiscardCard(cardKey, createCardInstance(cardKey));
  toast(card.name+" "+amount+"장 추가");
  return amount;
}

/* =========================================================================
   주문 사용
   ========================================================================= */
async function playCard(handIndex, targetEnemy){
  if(S.pendingCardChoice) return false;
  const key  = S.hand[handIndex];
  const card = CARD_DB[key];
  if(!card) return false;
  ensureCardInstanceZones();
  const cardInstance = S.handInstances && S.handInstances[handIndex] ? S.handInstances[handIndex] : createCardInstance(key);
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
  if(isHandCardLocked(handIndex, key)){ toast(card.name+"은 잠겨 있습니다"); return false; }
  if(hasRelic("cracked_divine_tablet") && (S.cardsPlayedThisTurn || 0) >= 3){
    toast("금 간 신통패: 한 턴에 주문은 최대 3장까지만 사용할 수 있습니다.");
    return false;
  }
  const cardCost = getHandCardCost(handIndex, key);
  if(S.energy < cardCost){ flashEnergy(); toast("정신력이 부족합니다"); return false; }
  if(card.target==="enemy" && (!targetEnemy || targetEnemy.hp<=0)) return false;

  const heatBeforePlay = getBlessingCount("heat");
  S.energy -= cardCost;
  if(card.type === "attack") applyPreAttackCardGimmicks(targetEnemy);
  const relicCardContext = { cardUid:cardInstance.uid, cardKey:key, card, handIndex, target:targetEnemy, bonusDamage:0 };
  S.spellTypesPlayedThisTurn = S.spellTypesPlayedThisTurn || {};
  S.spellTypesPlayedThisTurn[card.type] = true;
  applyRelicTrigger("onNthSpellPlayedEachTurn", relicCardContext);
  applyRelicTrigger("onSpellTypeSetCompleted", relicCardContext);
  if(card.type === "attack") applyRelicTrigger("onFirstPurifySpellEachBattle", relicCardContext);
  if(key === "bell_strike") applyRelicTrigger("onBellStrikePurify", relicCardContext);
  const relicDamageBonus = relicCardContext.bonusDamage || 0;

  for(const e of card.fx){
    switch(e.t){
      case "damage": {
        const gutpanBonus = e.gutpanBonus ? getBlessingCount(e.gutpanBonus) : 0;
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(getGrowthAdjustedValue(cardInstance, e) + relicDamageBonus + gutpanBonus, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "bonusLowHpDamage":
        if(targetEnemy && targetEnemy.hp>0 && targetEnemy.hp<=Math.ceil(targetEnemy.maxHp/2))
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      case "damageAll":
        livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(getGrowthAdjustedValue(cardInstance, e) + relicDamageBonus, en), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" })); break;
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
      case "applyRecollectionByCurrentRatio":
        if(targetEnemy && targetEnemy.hp > 0){
          const current = getStatus(targetEnemy, "recollection");
          const min = Number.isFinite(e.min) ? e.min : 0;
          const max = Number.isFinite(e.max) ? e.max : 99;
          const amount = Math.max(min, Math.min(max, Math.floor(current * (e.ratio || 0))));
          if(amount > 0) addStatus(targetEnemy, "recollection", amount);
        }
        break;
      case "applyRecollectionAll":
        livingEnemies().forEach(en => addStatus(en, "recollection", e.v || 1));
        break;
      case "block":
        gainPlayerBlock(getGrowthAdjustedValue(cardInstance, e)); break;
      case "damageByBlockRatio":
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(Math.floor((S.player.block || 0) * e.v), targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }); break;
      case "damageByBlockRatioConsume": {
        const currentBlock = Number.isFinite(S.player.block) ? Math.max(0, S.player.block) : 0;
        const ratio = Number.isFinite(e.v) ? e.v : 0;
        const damage = Math.floor(currentBlock * ratio);
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(damage, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        const consumeRatio = Number.isFinite(e.consumeRatio) ? e.consumeRatio : 1;
        const consumed = Math.ceil(currentBlock * consumeRatio);
        S.player.block = Math.max(0, currentBlock - consumed);
        if(currentBlock >= 15 && consumed >= currentBlock && S.player.block === 0){
          applyRelicTrigger("onBarrierFullyConsumed", { beforeBlock:currentBlock, consumed, cardKey:key });
        }
        break;
      }
      case "damageByBlockGainedThisTurn":
        applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(Math.floor((S.blockGainedThisTurn || 0) * e.v), targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }); break;
      case "damageByWeak": {
        const weak = targetEnemy ? Math.max(0, targetEnemy.weak || 0) : 0;
        const amount = Math.floor((e.base || 0) + weak * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "damageByRecollection": {
        const recollection = targetEnemy ? Math.max(0, getStatus(targetEnemy, "recollection")) : 0;
        const amount = Math.floor((e.base || 0) + recollection * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "consumeAllAgitationDamage": {
        if(targetEnemy){
          const agitation = Math.max(0, getStatus(targetEnemy, "agitation"));
          const amount = Math.floor((e.base || 0) + agitation * (e.per || 0));
          setStatus(targetEnemy, "agitation", 0);
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        }
        break;
      }
      case "ifAgitationAtLeastDraw":
        if(targetEnemy && getStatus(targetEnemy, "agitation") >= (e.threshold || 0)) drawCards(e.v || 1, { source:"cardEffect" });
        break;
      case "ifRecollectionAtLeastDraw":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)) drawCards(e.v || 1, { source:"cardEffect" });
        break;
      case "ifAgitationAtLeastDamageAll":
        if(targetEnemy && getStatus(targetEnemy, "agitation") >= (e.threshold || 0)){
          livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(e.v || 0, en), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }));
        }
        break;
      case "ifRecollectionAtLeastDamageAll":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)){
          livingEnemies().forEach(en => applyDamageWithFeedback(en, getPlayerAttackDamage(e.v || 0, en), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }));
        }
        break;
      case "ifRecollectionAtLeastApplyRecollectionAll":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)){
          livingEnemies().forEach(en => { if(en !== targetEnemy) addStatus(en, "recollection", e.v || 1); });
        }
        break;
      case "ifHanpuriRecoveredDamage":
        if(S.hanpuriRecoveredThisTurn && targetEnemy){
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v || 0, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
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
          if(currentRecollection <= 0 && !e.v) break;
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
        drawCards(e.v, { source:"cardEffect" }); break;
      case "createCardToHand":
        createCardToHand(e.key, e.v || 1); break;
      case "recoverGrownHanpuri":
        await recoverGrownHanpuriFromDiscard({ costZero:!!e.costZero }); break;
      case "discardOtherHanpuriGrow": {
        const removedIndex = await discardOtherHanpuriAndGrow(cardInstance.uid);
        if(removedIndex >= 0 && removedIndex < handIndex) handIndex -= 1;
        break;
      }
      case "discardHandUnlessBellUsed": {
        const removedIndex = await discardHandUnlessBellUsed(e.v || 1, cardInstance.uid);
        if(removedIndex >= 0 && removedIndex < handIndex) handIndex -= 1;
        break;
      }
      case "gainBlessing":
        gainBlessing(e.key, e.v || 1); break;
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
          spawnFloat('[data-id="'+targetEnemy.id+'"]', '표식 '+amount, 'heal');
        }
        break;
      case "ifMarkedDamage":
        if(targetEnemy && getStatus(targetEnemy, "mark") > 0)
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(e.v, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      case "consumeAllMarksDamage":
        if(targetEnemy){
          const marks = getStatus(targetEnemy, "mark");
          const amount = (e.base || 0) + relicDamageBonus + marks * (e.per || 0);
          setStatus(targetEnemy, "mark", 0);
          applyRelicTrigger("onMarksConsumed", { target:targetEnemy, consumed:marks });
          applyDamageWithFeedback(targetEnemy, getPlayerAttackDamage(amount, targetEnemy), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        }
        break;
      case "removeWeak":
        LIFE.reduceWeak(S.player, e.v); break;
      default:
        console.warn("[Card FX] Unsupported effect", e.t, key);
        break;
    }
  }

  S.hand.splice(handIndex, 1);
  if(Array.isArray(S.handInstances)) S.handInstances.splice(handIndex, 1);
  if(Array.isArray(S.handLockTokens)) S.handLockTokens.splice(handIndex, 1);
  if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.splice(handIndex, 1);
  discardCard(key, { source:"played", instance:cardInstance });
  if(S.hand.length === 0) applyRelicTrigger("onHandEmpty", { source:"playCard" });
  S.cardsPlayedThisTurn = (S.cardsPlayedThisTurn || 0) + 1;
  if(key === "bell_strike") S.bellStrikeUsedThisTurn = true;
  triggerBlessingOnCardPlayed(card, key, { heatBeforePlay });
  updateTurnChallengesForCard(card);
  notifyMonsterBattleEvent("successfulCardPlayed", { cardUid:cardInstance.uid, cardKey:key, card });
  if(card.type === "attack"){
    S.attackCardsPlayedThisTurn = (S.attackCardsPlayedThisTurn || 0) + 1;
    notifyMonsterBattleEvent("successfulAttackCardPlayed", { cardUid:cardInstance.uid, cardKey:key, card, target:targetEnemy });
  }
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

function applyDamageWithFeedback(target, rawDamage, attackerWeak, options={}){
  const beforeHp = target ? target.hp || 0 : 0;
  const beforeBlock = target ? target.block || 0 : 0;
  const beforeRecollection = target && target !== S.player ? getStatus(target, "recollection") : 0;
  const damageContext = { target, rawDamage, attackerWeak };
  if(target === S.player) applyRelicTrigger("beforePlayerHpDamage", damageContext);
  const result = LIFE.applyDamage(target, damageContext.rawDamage, attackerWeak);
  const sel = target===S.player ? '.player' : '[data-id="'+target.id+'"]';
  if(result.absorbed > 0)                          spawnFloat(sel, '-'+result.absorbed, 'blk');
  if(result.hpLoss   > 0)                          spawnFloat(sel, '-'+result.hpLoss,   'dmg');
  if(result.absorbed === 0 && result.hpLoss === 0) spawnFloat(sel, '0', 'blk');
  if(target !== S.player){
    S.damageDealtThisTurn = (S.damageDealtThisTurn || 0) + (result.hpLoss || 0);
    triggerBlessingOnDamageDealt(target, result, beforeRecollection, options);
    if((result.absorbed || result.hpLoss) > 0) notifyMonsterBattleEvent("enemyHit", { enemy:target, result });
    if(beforeBlock > 0 && (target.block || 0) === 0) notifyMonsterBattleEvent("enemyBlockBroken", { enemy:target, result });
    if(beforeHp > 0 && target.hp <= 0) emitEnemyDiedOnce(target, { result });
    applyConfiguredPhaseIfNeeded(target);
    applyNextPhaseIfNeeded(target);
  } else {
    if(result.hpLoss > 0) applyRelicTrigger("onPlayerHpDamage", { hpLoss:result.hpLoss, result });
  }
  return result;
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
  return getWeightedCardRewardKeys(count);
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
    rewards.push({ id:"gold", name:"복채", icon:"assets/ui/resource_icons/gold.png", value:"+" + gold, amount:gold, doneText:"수령 완료" });
  }
  if(!S || !S.battleSuppressCardReward){
    rewards.push({ id:"card", name:"의식 보상", icon:"札", value:"1개 선택", doneText:"선택 완료" });
  }
  return rewards;
}

function resourceIconHtml(icon){
  if(typeof icon === "string" && icon.indexOf("assets/") === 0){
    return '<img src="' + icon + '" alt="" aria-hidden="true">';
  }
  return icon || "";
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
  addPermanentCard(key, { source:"battleReward" });
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
    applyRelicTrigger("onCardRewardSkipped", { source:"battleVictory" });
    finishBattleVictoryCardReward();
    return;
  }
  applyRelicTrigger("onCardRewardSkipped", { source:"cardReward" });
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  proceedToMap();
}

function grantRelic(source = "elite"){
  if(!S.relics) S.relics = [];
  // 이벤트 전투는 source를 "event"로 넘겨 일반 엘리트 법구 풀을 건드리지 않는다.
  const pool = typeof window.getRelicCandidatesBySource === "function"
    ? window.getRelicCandidatesBySource(source)
    : RELIC_DB.filter(item => Array.isArray(item.obtainFrom) && item.obtainFrom.includes(source));
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
      id:"relic", itemId:relic.id, name:relic.name, icon:relic.iconImage || relic.emoji || "具",
      iconImage:relic.iconImage || "",
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
      '<div class="victory-reward-icon">' + resourceIconHtml(item.icon) + '</div>' +
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
        id: relicId, name: reward.name, emoji: reward.icon, iconImage: reward.iconImage, desc: reward.desc
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
  /* 저장/재접속으로 이 화면에 다시 들어와도 카드 후보가 재추첨되지 않도록,
     최초 생성된 3종을 S에 고정해 재사용한다 (무한 리롤 방지). */
  if(!Array.isArray(S.victoryCardRewardKeys) || S.victoryCardRewardKeys.length === 0){
    S.victoryCardRewardKeys = getRandomRewardKeys(3);
  }
  renderRewardOverlay(S.victoryCardRewardKeys);
  updateEndBtn();
}

function finishBattleVictoryCardReward(){
  S.victoryCardRewardOpen = false;
  S.victoryCardRewardKeys = null;
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
    ov.classList.add("blessing-card-reward");
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
  ov.classList.remove("blessing-card-reward");
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
  if(ov) ov.classList.remove("show", "blessing-card-reward");
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
  if((S.busy && !tutorialEndTurnStepActive) || S.pendingCardChoice || S.over) return;
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
  S.playerTurnActive = false;
  updateEndBtn();

  applyPlayerTurnEndGimmicks();
  applyRelicTrigger("turnEnd");
  notifyMonsterBattleEvent("playerTurnEnd");

  LIFE.reduceWeak(S.player, 1);
  LIFE.reduceFracture(S.player, 1);
  LIFE.reduceAnxiety(S.player, 1);
  LIFE.reduceLethargy(S.player, 1);

  ensureCardInstanceZones();
  S.hand.forEach((key, index) => discardCard(key, { source:"turnEnd", instance:S.handInstances && S.handInstances[index] }));
  S.hand = [];
  S.handInstances = [];
  S.handLockTokens = [];
  S.handCostOverrides = [];
  triggerBlessingOnTurnEnd();
  renderAll();
  await wait(250);

  if(S.player.hp<=0 && !tryApplyFatalRelic()) return endGame("lose");

  // 생존 적을 spawnIndex 순서대로 행동 (기획서 §8-5)
  const actingEnemies = livingEnemies().sort((a,b) => (a.spawnIndex||0)-(b.spawnIndex||0));
  for(const e of actingEnemies){
    const mv = e.intent;
    if(!mv) continue;
    clearExpiredEnemyBlockBeforeAction(e);
    notifyMonsterBattleEvent("enemyActionStart", { enemy:e, move:mv });
    executeEchoMove(e);

    if(mv.t==="attack"){
      executeMonsterAttack(e, mv);
    } else if(mv.t==="defend"){
      const target = getPlannedMonsterSupportTarget(e, mv);
      const value = getMonsterDefendValue(e, mv, target);
      grantEnemyBlock(target, value);
      spawnFloat('[data-id="'+target.id+'"]', '+'+value, 'blk');
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
    if(Number.isFinite(e.expireAfterActions)){
      e.expireAfterActions -= 1;
      if(e.expireAfterActions <= 0){
        const beforeHp = e.hp || 0;
        e.hp = 0;
        if(beforeHp > 0) emitEnemyDiedOnce(e, { move:mv, expired:true });
      }
    }
    applyEnemyMoveAfterAction(e, mv);

    notifyMonsterBattleEvent("enemyActionEnd", { enemy:e, move:mv });
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
  S.cardsPlayedThisTurn = 0;
  S.attackCardsPlayedThisTurn = 0;
  S.damageDealtThisTurn = 0;
  S.exhaustedSpellCountThisTurn = 0;
  S.spellTypesPlayedThisTurn = {};
  S.handCostOverrides = [];
  resetBlessingTurnFlags();
  const anxietyPenalty  = (S.player.anxiety||0)  > 0 ? 1 : 0;
  const lethargyPenalty = (S.player.lethargy||0) > 0 ? 1 : 0;
  S.energy    = Math.max(0, getMaxEnergy() - lethargyPenalty);
  const drawPenalty = S.pendingDrawPenalty || 0;
  const drawCount = Math.max(0, DRAW_PER_TURN - anxietyPenalty - drawPenalty);
  S.pendingDrawPenalty = 0;
  if(anxietyPenalty>0)  toast("불안으로 주문 뽑기 -1");
  if(drawPenalty>0)     toast("수술등 압박으로 주문 뽑기 -"+drawPenalty);
  if(lethargyPenalty>0) toast("무기력으로 정신력 -1");
  S.turn += 1;
  S.playerTurnActive = true;
  const bonusEnergy = S.nextTurnEnergyBonus || 0;
  const bonusDraw = S.nextTurnDrawBonus || 0;
  S.nextTurnEnergyBonus = 0;
  S.nextTurnDrawBonus = 0;
  if(S.nextTurnReturnCard && S.nextTurnReturnCard.cardUid){
    const returnedCard = removeCardFromBattleZonesByUid(S.nextTurnReturnCard.cardUid);
    if(returnedCard){
      const returnKey = returnedCard.key || S.nextTurnReturnCard.cardKey;
      S.hand.push(returnKey);
      S.handInstances.push(returnedCard.instance || createCardInstance(returnKey, { uid:S.nextTurnReturnCard.cardUid }));
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
      setHandCardCostOverride(S.hand.length - 1, Math.max(0, (CARD_DB[returnKey]?.cost || 0) - (S.nextTurnReturnCard.costReduction || 1)));
    }
    S.nextTurnReturnCard = null;
  }
  S.energy = Math.min(getMaxEnergy(), S.energy + bonusEnergy);
  triggerBlessingOnTurnStart();
  drawCards(drawCount, { source:"turnStartBase" });
  if(bonusDraw > 0) drawCards(bonusDraw, { source:"scheduledEffect" });
  applyRelicTrigger("turnStart");
  if(hasRelic("reversed_talisman_book")) drawCards(1, { source:"turnStartRelic" });
  notifyMonsterBattleEvent("playerTurnStart");
  // 생존 적 다음 행동 의도 계획
  livingEnemies().forEach(e => {
    MONSTER_PATTERN.planNextIntent(e);
    planEnemyIntentTarget(e);
  });
  applyPlayerTurnStartGimmicks();
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
  renderHudPortrait();
  renderHudName();
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

function renderHudPortrait(){
  const portraitEl = $("#hudPortrait");
  if(!portraitEl) return;

  const equippedSkinId = S.playerAppearance ? S.playerAppearance.equippedSkinId : null;
  const iconSrc = resolveBattleProfileIcon(equippedSkinId);

  let imgEl = portraitEl.querySelector("img");
  if(!imgEl){
    portraitEl.textContent = "";
    imgEl = document.createElement("img");
    imgEl.alt = "";
    imgEl.addEventListener("error", () => {
      const fallback = resolveBattleProfileIcon(null);
      if(imgEl.getAttribute("src") !== fallback) imgEl.src = fallback;
    });
    portraitEl.appendChild(imgEl);
  }
  if(imgEl.getAttribute("src") !== iconSrc) imgEl.src = iconSrc;
}

/* 전투화면 좌상단 닉네임(#hudName) 표시 전용입니다. 닉네임 변경은 표시 텍스트만 바꾸며,
   S.player.name(전투 상태)는 건드리지 않습니다. */
function renderHudName(){
  const nameEl = $("#hudName");
  if(!nameEl) return;

  bindHudNicknameClick(nameEl);

  const nickname = (window.VIBERUN_NICKNAME_UI && typeof window.VIBERUN_NICKNAME_UI.getCachedNickname === "function")
    ? window.VIBERUN_NICKNAME_UI.getCachedNickname()
    : null;
  nameEl.textContent = nickname || S.player.name;
}

function bindHudNicknameClick(nameEl){
  if(!nameEl || nameEl.dataset.nicknameBound) return;

  nameEl.dataset.nicknameBound = "true";
  nameEl.classList.add("hud-name-clickable");
  nameEl.setAttribute("role", "button");
  nameEl.setAttribute("tabindex", "0");
  nameEl.title = "닉네임 변경";

  const openNicknameUI = () => {
    if(window.VIBERUN_NICKNAME_UI && typeof window.VIBERUN_NICKNAME_UI.open === "function"){
      window.VIBERUN_NICKNAME_UI.open();
    }
  };

  nameEl.addEventListener("click", openNicknameUI);
  nameEl.addEventListener("keydown", event => {
    if(event.key === "Enter" || event.key === " "){
      event.preventDefault();
      openNicknameUI();
    }
  });
}

window.addEventListener("viberun:profile-nickname-changed", event => {
  const nickname = event.detail && event.detail.nickname;
  const nameEl = document.getElementById("hudName");
  if(nameEl && nickname) nameEl.textContent = nickname;
});

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
  if(isPotionSlots) hidePotionDiscardButton();
  host.innerHTML = "";
  for(let i=0; i<maxSlots; i++){
    const item   = list[i];
    const filled = i < count;
    const slot   = document.createElement("span");
    slot.className   = "side-item-slot "+(filled ? "filled" : "empty");
    if(isPotionSlots && !filled){
      slot.innerHTML = '<span class="side-empty-potion-icon" aria-hidden="true"></span>';
    } else if(filled && item && item.iconImage){
      slot.innerHTML = '<img class="side-item-icon" src="' + escapeHtml(item.iconImage) + '" alt="" aria-hidden="true">';
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
      slot.addEventListener("mouseenter", () => showPotionDiscardButton(i, slot));
      slot.addEventListener("mouseleave", ev => {
        if(ev.relatedTarget && ev.relatedTarget.id === "potionDiscardButton") return;
        hidePotionDiscardButton();
      });
    }
    host.appendChild(slot);
  }
}

function canUsePotionNow(){
  return !!(S && !S.busy && !S.over && !S.rewardOpen && !S.encounterCleared);
}

function isSelfUsePotion(item){
  if(!item) return false;
  if(item.target === "player") return true;
  if(item.target === "enemy") return false;
  if(Array.isArray(item.fx) && item.fx.some(fx => fx && ["heal","energy","block","draw","removeWeak","nextAttackDouble"].includes(fx.t))) return true;
  return ["heal","energy","block","blockCleanse","draw","nextAttackDouble"].includes(item.type);
}

function isHealPotion(item){
  return !!(item && (item.type === "heal" || item.effect === "healPlayerHp"));
}

function isAttackPotion(item){
  if(!item) return false;
  if(item.target === "enemy") return true;
  if(item.target === "player") return false;
  if(Array.isArray(item.fx) && item.fx.some(fx => fx && (potionFxTargetsEnemy(fx) || potionFxTargetsAnyEnemy(fx)))) return true;
  return ["attackSingle","attackAll","applyMark","applyWeak"].includes(item.type);
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

function getPotionFxList(potion){
  if(potion && Array.isArray(potion.fx) && potion.fx.length) return potion.fx;
  if(!potion) return [];
  switch(potion.type){
    case "heal": return [{ t:"heal", v:potion.value || 0 }];
    case "energy": return [{ t:"energy", v:potion.value || 0 }];
    case "block": return [{ t:"block", v:potion.value || 0 }];
    case "blockCleanse": return [{ t:"block", v:potion.value || 0 }, { t:"removeWeak", v:potion.removeWeak || 1 }];
    case "draw": return [{ t:"draw", v:potion.value || 0 }];
    case "nextAttackDouble": return [{ t:"nextAttackDouble", v:potion.value || 2 }];
    case "attackSingle": return [{ t:"attackSingle", v:potion.value || 0 }];
    case "attackAll": return [{ t:"attackAll", v:potion.value || 0 }];
    case "applyMark": return [{ t:"applyMark", v:potion.value || 0 }];
    case "applyWeak": return [{ t:"applyWeak", v:potion.value || 0 }];
    default: return [];
  }
}

function potionFxTargetsEnemy(fx){
  return !!(fx && ["attackSingle","applyMark","applyWeak","applyRecollection","applyFracture"].includes(fx.t));
}

function potionFxTargetsAnyEnemy(fx){
  return !!(fx && ["attackAll","applyMarkAll"].includes(fx.t));
}

function isSupportedPotionFx(fx){
  return !!(fx && [
    "heal",
    "energy",
    "block",
    "draw",
    "removeWeak",
    "applyMark",
    "applyWeak",
    "applyRecollection",
    "applyFracture",
    "applyMarkAll",
    "attackSingle",
    "attackAll",
    "nextAttackDouble"
  ].includes(fx.t));
}

function canExecutePotionFx(potion, context={}){
  const fxList = getPotionFxList(potion);
  if(!fxList.length) return false;
  return fxList.every(fx => {
    if(!isSupportedPotionFx(fx)) return false;
    if(potionFxTargetsEnemy(fx)) return !!(context.targetEnemy && context.targetEnemy.hp > 0);
    if(potionFxTargetsAnyEnemy(fx)) return livingEnemies().length > 0;
    return true;
  });
}

function executePotionFx(potion, context={}){
  const fxList = getPotionFxList(potion);
  if(!canExecutePotionFx(potion, context)) return false;
  for(const fx of fxList){
    if(!isSupportedPotionFx(fx)) return false;
    if(executeSinglePotionFx(fx, context) === false) return false;
  }
  return true;
}

function executeSinglePotionFx(fx, context={}){
  const amount = Number.isFinite(fx.v) ? fx.v : 0;
  const targetEnemy = context.targetEnemy;
  switch(fx.t){
    case "heal": {
      const healed = LIFE.heal(S.player, amount);
      if(healed > 0) spawnFloat(".player", "+"+healed, "heal");
      return true;
    }
    case "energy":
      S.energy += amount;
      if(amount) toast((context.potion?.name || "약병")+" 사용: 신통력 +"+amount);
      return true;
    case "block":
      gainPlayerBlock(amount);
      return true;
    case "draw":
      drawCards(amount, { source:"potion" });
      return true;
    case "removeWeak":
      LIFE.reduceWeak(S.player, amount || 1);
      return true;
    case "applyMark": {
      const added = addStatus(targetEnemy, "mark", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '표식 '+added, 'heal');
      return true;
    }
    case "applyWeak": {
      const added = addStatus(targetEnemy, "agitation", amount);
      if(added > 0) applyRelicTrigger("onAgitationApply", { target: targetEnemy, amount: added });
      return true;
    }
    case "applyRecollection": {
      const added = addStatus(targetEnemy, "recollection", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '회상 '+added, 'heal');
      return true;
    }
    case "applyFracture": {
      const added = addStatus(targetEnemy, "fracture", amount);
      if(added > 0) spawnFloat('[data-id="'+targetEnemy.id+'"]', '균열 '+added, 'dmg');
      return true;
    }
    case "applyMarkAll":
      livingEnemies().forEach(enemy => {
        const added = addStatus(enemy, "mark", amount);
        if(added > 0) spawnFloat('[data-id="'+enemy.id+'"]', '표식 '+added, 'heal');
      });
      return true;
    case "attackSingle":
      applyDamageWithFeedback(targetEnemy, amount, S.player.weak);
      return true;
    case "attackAll":
      livingEnemies().forEach(enemy => applyDamageWithFeedback(enemy, amount, S.player.weak));
      return true;
    case "nextAttackDouble":
      S.nextAttackMultiplier = amount || 2;
      toast("다음 공격 정화량 증가");
      return true;
    default:
      console.warn("[Potion FX] Unsupported FX:", fx);
      return false;
  }
}

function useSelfPotion(index){
  if(!canUsePotionNow()) return;
  if(!Array.isArray(S.potions)) return;
  const potion = S.potions[index];
  if(!potion || !isSelfUsePotion(potion)) return;
  if(!applySelfPotionEffect(potion, { potion, potionIndex:index })) return;
  S.potions.splice(index, 1);
  recordPotionUsed(potion);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
}

function applySelfPotionEffect(potion, context={}){
  return executePotionFx(potion, context);
}

function ensurePotionDiscardButton(){
  let btn = document.querySelector("#potionDiscardButton");
  if(btn) return btn;
  btn = document.createElement("button");
  btn.id = "potionDiscardButton";
  btn.type = "button";
  btn.textContent = "버리기";
  btn.addEventListener("click", ev => {
    ev.stopPropagation();
    const index = Number(btn.dataset.potionIndex);
    discardPotion(index);
  });
  btn.addEventListener("mouseleave", () => hidePotionDiscardButton());
  document.querySelector("#game").appendChild(btn);
  return btn;
}

function showPotionDiscardButton(index, slot){
  const btn = ensurePotionDiscardButton();
  const game = document.querySelector("#game");
  if(!slot || !game) return;
  const anchorRect = slot.getBoundingClientRect();
  const gameRect = game.getBoundingClientRect();
  btn.dataset.potionIndex = String(index);
  btn.style.left = (anchorRect.right - gameRect.left + 6) + "px";
  btn.style.top = (anchorRect.top - gameRect.top + anchorRect.height + 4) + "px";
  btn.classList.add("show");
}

function hidePotionDiscardButton(){
  const btn = document.querySelector("#potionDiscardButton");
  if(!btn) return;
  btn.classList.remove("show");
  btn.dataset.potionIndex = "";
}

function discardPotion(index){
  if(!Array.isArray(S.potions)) return;
  const potion = S.potions[index];
  hidePotionDiscardButton();
  if(!potion) return;
  if(!window.confirm("이 약병을 버리시겠습니까?")) return;
  if(!Array.isArray(S.potions) || S.potions[index] !== potion) return;
  S.potions.splice(index, 1);
  syncRunStateFromCombat();
  hidePotionUseButton();
  renderAll();
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
      useTargetPotion(state.index, en.enemy);
    }
  }
  endPotionDrag();
}

function useTargetPotion(index, targetEnemy){
  if(!canUsePotionNow()) return false;
  if(!Array.isArray(S.potions)) return false;
  const potion = S.potions[index];
  if(!potion || !isAttackPotion(potion)) return false;
  if(!executePotionFx(potion, { potion, potionIndex:index, targetEnemy })) return false;
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

function useSingleAttackPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useMarkPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useWeakPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
}

function useAllAttackPotion(index, targetEnemy){
  return useTargetPotion(index, targetEnemy);
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
      const statusCardKey = getMonsterIntentStatusCardKey(m);
      const sn = statusCardKey && CARD_DB[statusCardKey] ? " + "+CARD_DB[statusCardKey].name : "";
      const preview = previewMonsterFinalDamage(e, m);
      ico="💢"; txt=(m.name ? m.name+" / " : "")+"정신력 "+preview.finalDamage+(e.weak>0?" (동요)":"")+sn; cls="atk";
    } else if(m.t==="defend"){
      const target = getPlannedMonsterSupportTarget(e, m);
      const value = getMonsterDefendValue(e, m, target);
      const targetName = target && target.id !== e.id ? " / "+target.name : "";
      ico="🛡️"; txt=(m.name ? m.name+" / " : "")+"결계 "+value+" 획득"+targetName; cls="def";
    } else if(m.t==="summon"){
      ico="🚪"; txt=(m.name ? m.name+" / " : "")+"소환"; cls="sum";
    } else if(m.t==="drawPenalty"){
      ico="💭"; txt=(m.name ? m.name+" / " : "")+"다음 턴 주문 뽑기 -"+(m.v || 1); cls="deb";
    } else if(m.t==="lock"){
      ico="🔒"; txt=(m.name ? m.name+" / " : "")+"주문 잠금"; cls="deb";
    } else if(m.t==="exam"){
      ico="📝"; txt=(m.name ? m.name+" / " : "")+challengeLabel(getActiveChallengeForEnemy(e)); cls="deb";
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
  const equippedSkinId = S.playerAppearance ? S.playerAppearance.equippedSkinId : null;
  playerLayer.appendChild(combatantEl({
    cls:"player", emoji:S.player.emoji||"👼",
    sprite:resolveBattleStandingImage(equippedSkinId),
    spriteFallback:resolveBattleStandingImage(null),
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
      intent:e.intent, id:e.id, runtimeEnemy:e,
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
  const intentHtml = o.intent ? intentBubble(o.intent, o.runtimeEnemy || o) : "";
  const avatarHtml = o.sprite
    ? '<div class="avatar sprite-avatar"><img src="'+o.sprite+'" alt=""></div>'
    : '<div class="avatar">'+(o.emoji || "")+'</div>';
  const statusHtml = renderEnemyStatusIcons(o);
  // LIFE.renderCombatantStats()의 기존 동요/표식/균열 표시와 새 StatusData 표시가 중복되지 않도록
  // 전투 계산용 원본 값은 유지하고, 렌더링용 객체에서만 상태값을 숨깁니다.
  const statsRenderObj = o.hideHud ? o : { ...o, weak:0, mark:0, fracture:0, status:{} };
  const infoHtml = o.hideHud
    ? ""
    : '<div class="combatant-info">'+LIFE.renderCombatantStats(statsRenderObj, { reserveBlockSpace:false })+statusHtml+'</div>';
  el.innerHTML = intentHtml + avatarHtml + infoHtml + '<div class="hit"></div>';
  if(o.sprite && o.spriteFallback && o.spriteFallback !== o.sprite){
    const spriteImgEl = el.querySelector(".sprite-avatar img");
    if(spriteImgEl){
      spriteImgEl.addEventListener("error", () => {
        if(spriteImgEl.getAttribute("src") !== o.spriteFallback) spriteImgEl.src = o.spriteFallback;
      });
    }
  }
  return el;
}

function intentBubble(m, enemy){
  if(m.t==="attack"){
    const statusCardKey = getMonsterIntentStatusCardKey(m);
    const sn = statusCardKey && CARD_DB[statusCardKey] ? ' +'+CARD_DB[statusCardKey].name : '';
    const preview = previewMonsterFinalDamage(enemy, m);
    return '<div class="intent atk">💢 '+preview.finalDamage+((enemy && enemy.weak>0)?'↓':'')+sn+'</div>';
  }
  if(m.t==="defend"){
    const target = getPlannedMonsterSupportTarget(enemy, m);
    const ally = target && enemy && target.id !== enemy.id ? ' 아군' : '';
    return '<div class="intent def">🛡️ 보호'+ally+'</div>';
  }
  if(m.t==="summon")     return '<div class="intent deb">🚪 소환</div>';
  if(m.t==="drawPenalty") return '<div class="intent deb">💭 뽑기 -'+(m.v || 1)+'</div>';
  if(m.t==="lock")       return '<div class="intent deb">🔒 잠금</div>';
  if(m.t==="exam")       return '<div class="intent deb">📝 '+challengeLabel(getActiveChallengeForEnemy(enemy))+'</div>';
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
    const displayCard = c ? { ...c, cost:getHandCardCost(i, key) } : c;
    const el = document.createElement("div");
    el.className     = "card card-frame-card cost-"+c.type;
    el.dataset.index = i;
    el.innerHTML = cardFaceHtml(displayCard);
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
  $("#endTurn").disabled = !!((S.busy && !tutorialEndTurnStepActive) || S.pendingCardChoice || S.over || tutorialBlocksEndTurn);
}

/* =========================================================================
   드래그 & 드롭
   ========================================================================= */
const DRAG_THRESHOLD = 8;
function attachDrag(cardEl, index){
  let startX=0, startY=0, dragging=false, pid=null;
  cardEl.addEventListener("pointerdown", down);
  function down(ev){
    if(S.busy||S.pendingCardChoice||S.over) return;
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
    #cardRewardOverlay.blessing-card-reward .reward-panel{width:min(74cqw,98cqh);box-sizing:border-box;padding:5.6cqh 5.2cqw 5cqh;border:0;border-radius:0;background:transparent url("assets/ui_panels/codex_popup_frame.png") center/100% 100% no-repeat;box-shadow:none;}
    #cardRewardOverlay.blessing-card-reward .reward-panel h2{color:#3e2912;text-shadow:0 .08cqh 0 rgba(255,255,255,.85);}
    #cardRewardOverlay.blessing-card-reward .reward-panel p{color:#5c3c10;font-weight:800;text-shadow:0 .06cqh 0 rgba(255,255,255,.75);}
    #cardRewardOverlay.blessing-card-reward .reward-cards{margin-bottom:0;}
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
    #battleCardChoiceOverlay{position:absolute;inset:0;z-index:235;display:none;place-items:center;background:rgba(10,20,40,.48);backdrop-filter:blur(.35cqh);}
    #battleCardChoiceOverlay.show{display:grid;}
    .battle-card-choice-panel{width:min(72cqw,92cqh);padding:3cqh 3cqw;border-radius:2cqh;background:rgba(255,255,255,.95);border:.3cqh solid var(--c-panel-line);box-shadow:0 2cqh 6cqh rgba(0,0,0,.35);text-align:center;}
    .battle-card-choice-panel h2{font-size:3cqh;margin-bottom:.8cqh;color:var(--c-ink);}
    .battle-card-choice-panel p{font-size:1.65cqh;color:var(--c-ink-soft);margin-bottom:1.8cqh;}
    .battle-card-choice-cards{display:flex;justify-content:center;align-items:stretch;gap:1.4cqw;margin-bottom:1.6cqh;flex-wrap:wrap;}
    .battle-card-choice-card{font:inherit;}
    .battle-card-choice-cancel{font-size:1.8cqh;font-weight:800;padding:.9cqh 1.8cqw;border-radius:1.1cqh;border:.2cqh solid var(--c-panel-line);background:#fff;cursor:pointer;color:var(--c-ink-soft);}
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
    .victory-reward-icon img{width:100%;height:100%;object-fit:contain;display:block;}
    .victory-reward-icon img{width:3.6cqh;height:3.6cqh;object-fit:contain;display:block;}
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
