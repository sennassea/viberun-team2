"use strict";
/* =========================================================================
   신령의 은혜 로직 (startBlessing.js)
   기획서: 신령의 은혜 시작 UI 기획서

   은혜 데이터, 효과 적용(덱/법구/약병 지급, 전투 예약 효과), 화면 진입/
   흐름 제어를 담당한다. 화면 렌더링(오버레이 DOM, 카드 HTML, 스타일)은
   startBlessingUI.js로 분리되어 있으며 이 파일은 함수 이름으로만 그 UI
   함수들을 호출한다(같은 전역 스코프). 유니티 이식 시 이 파일의 효과 계산
   로직은 C#으로 그대로 옮길 수 있다.

   이 파일은 mapNodeLogic.js / mapSystem.js / mapUI.js / script.js /
   bagUI.js 이후에 로드되어야 합니다. 기존 코드를 직접 수정하지 않고,
   window 훅과 함수 재정의(override)를 통해 통합합니다.
   (restNode.js가 startStage()를 재정의하는 것과 동일한 패턴)

   새 게임 시작 시 로비 자리에서 신령이 시작 은혜 3개 중 1개를 선택하게
   하고, 선택 후에는 기존 노드 선택 화면(openMap)을 그대로 열어 1층 진입을
   플레이어가 직접 고르게 한다.
   ========================================================================= */

/* ── 신령 3종 (화면을 열 때마다 랜덤 출현) ─────────────────────────────────
   엔딩 지시서의 선택 신령 ID/대사와 동일한 데이터 원본을 사용한다. */
const START_BLESSING_ENDING_DATA = window.BOHYUN_RUN_RESULT_DATA && window.BOHYUN_RUN_RESULT_DATA.ending;
const START_BLESSING_SPIRITS = (START_BLESSING_ENDING_DATA && Array.isArray(START_BLESSING_ENDING_DATA.spirits))
  ? START_BLESSING_ENDING_DATA.spirits.map(spirit => ({
      id: spirit.id,
      image: spirit.image,
      emoji: spirit.emoji,
      name: spirit.name,
      dialogue: spirit.blessingDialogue,
      victoryLines: spirit.lines
    }))
  : [
      { emoji: "👻", name: "수호 신령",   dialogue: "기특하구나, 빈손으로 들여보낼 수는 없지." },
      { emoji: "🧿", name: "인연 신령",   dialogue: "얽힌 것은 풀고, 필요한 것은 이어주마." },
      { emoji: "🏮", name: "길잡이 신령", dialogue: "길은 어둡지만, 네 손엔 아직 빛이 남아 있구나." },
    ];

/* ── 시작 전용 은혜 법구 15종 (엑셀 지시서 기준) ───────────────────────── */
const START_BLESSINGS = [
  { id:"blessing_relic_01", icon:"🌒", name:"길잃은 방울",  spirit:"길잡이 신령", desc:"무작위 법구 1개를 얻습니다. 대신 정신력 12를 잃습니다.", effect:"gainRandomRelicLoseHp" },
  { id:"blessing_relic_02", icon:"🃏", name:"금단의 서낭부",  spirit:"길잡이 신령", desc:"유일 카드 3장 중 1장을 선택합니다. 대신 상태 카드 1장을 덱에 추가합니다.", effect:"chooseRareCardAddStatus" },
  { id:"blessing_relic_03", icon:"assets/ui/resource_icons/gold.png", name:"깨진 복주머니",  spirit:"길잡이 신령", desc:"복채 120을 얻습니다. 대신 최대 정신력 8을 잃습니다.", effect:"gainGoldLoseMaxHp" },
  { id:"blessing_relic_04", icon:"⚗️", name:"흔들리는 약향로",  spirit:"길잡이 신령", desc:"무작위 약병 2개를 얻습니다. 대신 첫 전투 시작 시 플레이어에게 불안 1을 부여합니다.", effect:"gainPotionsFirstBattleAnxiety" },
  { id:"blessing_relic_05", icon:"🏺", name:"빈 복채함",  spirit:"길잡이 신령", desc:"무작위 법구 1개를 얻습니다. 대신 보유 복채를 모두 잃습니다.", effect:"gainRandomRelicLoseAllGold" },
  { id:"blessing_relic_06", icon:"✂️", name:"인연 끊는 가위",  spirit:"인연 신령", desc:"기본 카드 1장을 선택하여 제거합니다.", effect:"chooseRemoveStarterCard" },
  { id:"blessing_relic_07", icon:"🔀", name:"뒤섞인 인연패",  spirit:"인연 신령", desc:"기본 카드 1장을 무작위로 제거하고, 무작위 일반 카드 1장을 얻습니다.", effect:"randomRemoveStarterGainCommon" },
  { id:"blessing_relic_08", icon:"🧹", name:"망각의 매듭",  spirit:"인연 신령", desc:"카드 2장을 제거합니다. 대신 보유 복채를 모두 잃습니다.", effect:"removeTwoCardsLoseAllGold" },
  { id:"blessing_relic_09", icon:"📜", name:"새 인연의 부적",  spirit:"인연 신령", desc:"일반 카드 3장 중 1장을 선택해 얻습니다.", effect:"chooseCommonCard" },
  { id:"blessing_relic_10", icon:"🍃", name:"가벼운 첫 매듭", spirit:"인연 신령", desc:"무작위 일반 카드 1장을 얻습니다. 그 카드는 이번 런 동안 비용이 1 감소합니다.", effect:"gainRandomCommonCostDownRun" },
  { id:"blessing_relic_11", icon:"🕯️", name:"수호의 첫 종소리", spirit:"수호 신령", desc:"다음 3번의 일반 전투에서 첫 번째 적의 정신력을 1로 만듭니다.", effect:"nextThreeNormalFirstEnemyHpOne" },
  { id:"blessing_relic_12", icon:"🛡️", name:"첫 결계의 연꽃", spirit:"수호 신령", desc:"첫 전투 시작 시 결계 10을 얻습니다.", effect:"firstBattleBlock", value:10 },
  { id:"blessing_relic_13", icon:"💗", name:"맑은 혼의 옥패", spirit:"수호 신령", desc:"최대 정신력이 8 증가하고, 현재 정신력도 8 회복합니다.", effect:"gainMaxHpAndHeal", value:8 },
  { id:"blessing_relic_14", icon:"assets/ui/resource_icons/gold.png", name:"수호 복주머니", spirit:"수호 신령", desc:"복채 80을 얻습니다.", effect:"gainGold", value:80 },
  { id:"blessing_relic_15", icon:"🧪", name:"은혜의 약병", spirit:"수호 신령", desc:"무작위 약병 1개를 얻습니다.", effect:"gainRandomPotion" },
];

const START_BLESSING_ICON_PATHS = {
  blessing_relic_01: "assets/relic_icons/blessing_relic_01.png",
  blessing_relic_02: "assets/relic_icons/blessing_relic_02.png",
  blessing_relic_03: "assets/relic_icons/blessing_relic_03.png",
  blessing_relic_04: "assets/relic_icons/blessing_relic_04.png",
  blessing_relic_05: "assets/relic_icons/blessing_relic_05.png",
  blessing_relic_06: "assets/relic_icons/blessing_relic_06.png",
  blessing_relic_07: "assets/relic_icons/blessing_relic_07.png",
  blessing_relic_08: "assets/relic_icons/blessing_relic_08.png",
  blessing_relic_09: "assets/relic_icons/blessing_relic_09.png",
  blessing_relic_10: "assets/relic_icons/blessing_relic_10.png",
  blessing_relic_11: "assets/relic_icons/blessing_relic_11.png",
  blessing_relic_12: "assets/relic_icons/blessing_relic_12.png",
  blessing_relic_13: "assets/relic_icons/blessing_relic_13.png",
  blessing_relic_14: "assets/relic_icons/blessing_relic_14.png",
  blessing_relic_15: "assets/relic_icons/blessing_relic_15.png"
};

START_BLESSINGS.forEach(blessing => {
  if (!blessing || !START_BLESSING_ICON_PATHS[blessing.id]) return;
  blessing.icon = START_BLESSING_ICON_PATHS[blessing.id];
});

let sbOverlayEl = null;
let sbResolved  = false;
let sbSpirit    = null;

/* ── 화면 열기 ────────────────────────────────────────────────────────────── */
window.OPEN_START_BLESSING = function(){
  sbResolved = false;
  sbSpirit = START_BLESSING_SPIRITS[Math.floor(Math.random() * START_BLESSING_SPIRITS.length)];

  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;   // 로비(신령의 은혜) 위치
    window.MAP_STATE.proceedMode  = false;
    window.MAP_STATE.startMapMode = false;
  }

  ensureSbOverlay();
  hideSbChrome();
  renderSbOverlay();
  sbOverlayEl.classList.add("show");
  sbOverlayEl.setAttribute("aria-hidden", "false");
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmSpiritBlessing");
  }
};

/* ── 이어하기 복원 전용: 신령의 은혜 화면(로비)에서 저장된 진행 상황을 복원할 때
   호출된다(battleRunState.js의 restoreSavedRunState). resolved는 저장 당시
   은혜를 이미 골랐는지(MAP_STATE.proceedMode) 여부다. 이미 골랐다면 새로 선택
   화면을 보여주지 않고 completeSbBlessing()과 동일하게 바로 맵을 연다. */
window.RESUME_START_BLESSING = function(resolved){
  sbResolved = !!resolved;
  if(!sbSpirit){
    const run = getSbRunState();
    const savedSpirit = run && run.blessingSpirit;
    sbSpirit = savedSpirit
      ? {
          id: savedSpirit.id,
          name: savedSpirit.name,
          image: savedSpirit.image,
          emoji: savedSpirit.emoji,
          dialogue: (savedSpirit.appearanceLines && savedSpirit.appearanceLines[0]) || ""
        }
      : START_BLESSING_SPIRITS[Math.floor(Math.random() * START_BLESSING_SPIRITS.length)];
  }

  ensureSbOverlay();
  hideSbChrome();
  renderSbOverlay();
  sbOverlayEl.classList.add("show");
  sbOverlayEl.setAttribute("aria-hidden", "false");

  if(sbResolved) completeSbBlessing();
};

/* ── startStage 후킹 (restNode.js와 동일한 override 패턴) ─────────────────
   은혜 선택 직후에는 여정(맵) 오버레이가 신령의 은혜 화면 위에 반투명하게
   떠 있는 상태를 유지해야 한다(플레이어가 맵만 닫고 은혜 화면으로 돌아올
   수도 있으므로). 실제 전투/노드 진입이 확정되는 startStage 시점에만
   신령의 은혜 화면을 닫고 전투 크롬을 복원해, 맵이 열리는 순간 아직
   초기화되지 않은 전투 화면이 잠깐 노출되는 문제를 막는다. */
const SB_ORIGINAL_START_STAGE = window.startStage;
if(typeof SB_ORIGINAL_START_STAGE === "function"){
  window.startStage = function(stageIdx){
    if(sbOverlayEl && sbOverlayEl.classList.contains("show")) closeSbOverlay();
    return SB_ORIGINAL_START_STAGE(stageIdx);
  };
}

/* ── 은혜 선택 → 보상 적용 → 기존 노드 선택 화면 재사용 ─────────────────── */
function selectSbBlessing(blessing){
  if(sbResolved || !blessing) return;
  sbResolved = true;

  grantSbBlessingRelic(blessing);
  saveSbSpiritToRunState();
  const pending = applySbBlessing(blessing);
  if(pending && typeof pending.then === "function"){
    pending.then(() => completeSbBlessing(blessing)).catch(error => {
      console.warn("[StartBlessing] 은혜 적용 중 오류가 발생했습니다.", error);
      completeSbBlessing(blessing);
    });
    return;
  }
  completeSbBlessing(blessing);
}

function completeSbBlessing(blessing){
  /* 신령의 은혜 화면은 여기서 닫지 않는다. 여정(맵) 오버레이가 그 위에
     반투명하게 떠야 하므로(플레이어가 맵만 닫고 은혜 화면으로 돌아올 수도
     있음), 실제 전투 진입 시점(startStage 후킹)에서만 배경을 정리한다. */
  if(window.MAP_STATE){
    window.MAP_STATE.currentStage = -1;   // 현재 위치: 로비(신령의 은혜)
    window.MAP_STATE.proceedMode  = true; // 다음 노드(1층) 선택 가능
    window.MAP_STATE.startMapMode = false;
  }
  if(typeof updateHudFloor === "function") updateHudFloor();
  if(typeof openMap === "function") openMap();
}

function getSbRunState(){
  if(typeof RUN_STATE === "undefined") return null;
  if(!RUN_STATE && typeof beginNewRun === "function") beginNewRun();
  return RUN_STATE;
}

function sbSetDeck(deck){
  const run = getSbRunState();
  if(!run || typeof STARTER_DECK === "undefined") return;
  run.deck = [...deck];
  STARTER_DECK = [...run.deck];
  if(typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED === "function"){
    window.BOHYUN_MARK_CARDS_ENCOUNTERED(run.deck);
  }
}

function applySbBlessing(blessing){
  const run = getSbRunState();
  if(!run || typeof CARD_DB === "undefined") return;

  switch(blessing.effect){
    case "gainRandomRelicLoseHp": {
      const relic = addSbRandomRelic();
      run.player.hp = Math.max(1, (run.player.hp || 1) - 12);
      return openSbRandomResultPopup([sbPopupRelicItem(relic, "gain")], "법구 획득");
    }
    case "chooseRareCardAddStatus":
      return chooseSbCardRewardByRarity("rare", {
        title: "정화 보상",
        desc: "유일 카드 3장 중 1장을 선택해 덱에 추가하세요.",
        afterChoose: addSbRandomStatusCard
      });
    case "gainGoldLoseMaxHp":
      run.gold = (run.gold || 0) + 120;
      run.player.maxHp = Math.max(1, (run.player.maxHp || 1) - 8);
      run.player.hp = Math.max(1, Math.min(run.player.hp || 1, run.player.maxHp));
      break;
    case "gainPotionsFirstBattleAnxiety": {
      const potions = addSbRandomPotion(2);
      setSbBattleEffect("firstBattleAnxiety", { used:false, value:1 });
      return openSbRandomResultPopup(potions.map(p => sbPopupPotionItem(p, "gain")), "약병 획득");
    }
    case "gainRandomRelicLoseAllGold": {
      const relic = addSbRandomRelic();
      run.gold = 0;
      return openSbRandomResultPopup([sbPopupRelicItem(relic, "gain")], "법구 획득");
    }
    case "chooseRemoveStarterCard":
      return chooseSbStarterCardToRemove();
    case "randomRemoveStarterGainCommon": {
      const removedKey = removeSbRandomStarterCard();
      const gainedKey = addSbRandomCardByRarity("common");
      return openSbRandomResultPopup(
        [sbPopupCardItem(removedKey, "remove"), sbPopupCardItem(gainedKey, "gain")],
        "주문 변경"
      );
    }
    case "removeTwoCardsLoseAllGold": {
      const removedKeys = removeSbRandomCards(2);
      run.gold = 0;
      return openSbRandomResultPopup(
        removedKeys.map(key => sbPopupCardItem(key, "remove")),
        "주문 제거"
      );
    }
    case "chooseCommonCard":
      return chooseSbCardRewardByRarity("common", {
        title: "정화 보상",
        desc: "일반 카드 3장 중 1장을 선택해 덱에 추가하세요."
      });
    case "gainRandomCommonCostDownRun": {
      const gainedKey = addSbDiscountedCommonCard();
      return openSbRandomResultPopup([sbPopupCardItem(gainedKey, "gain")], "주문 획득");
    }
    case "nextThreeNormalFirstEnemyHpOne":
      setSbBattleEffect("nextThreeNormalFirstEnemyHpOne", { remaining:3 });
      break;
    case "firstBattleBlock":
      setSbBattleEffect("firstBattleBlock", { used:false, value:blessing.value || 10 });
      break;
    case "gainMaxHpAndHeal":
      run.player.maxHp = (run.player.maxHp || 1) + (blessing.value || 8);
      run.player.hp = Math.min(run.player.maxHp, (run.player.hp || 0) + (blessing.value || 8));
      break;
    case "gainGold":
      run.gold = (run.gold || 0) + (blessing.value || 80);
      break;
    case "gainRandomPotion": {
      const potions = addSbRandomPotion(1);
      return openSbRandomResultPopup(potions.map(p => sbPopupPotionItem(p, "gain")), "약병 획득");
    }
  }
}

function getSbStarterTargets(){
  const run = getSbRunState();
  if(!run || typeof CARD_DB === "undefined") return [];
  return run.deck
    .map((key, index) => ({ key, index, card: CARD_DB[key] }))
    .filter(item => item.card && (item.card.rarity === "starter" || item.card.rarity === "basic") && isSbDeckCardRemovable(item.key));
}

function isSbDeckCardRemovable(key){
  return typeof window.IS_CARD_REMOVABLE_FROM_DECK !== "function" ||
    window.IS_CARD_REMOVABLE_FROM_DECK(key);
}

function pickSbRandom(list){
  if(!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function removeSbDeckCardAt(index){
  const run = getSbRunState();
  if(!run || index < 0 || index >= run.deck.length) return null;
  const nextDeck = [...run.deck];
  const removed = nextDeck.splice(index, 1)[0];
  sbSetDeck(nextDeck);
  return removed;
}

function removeSbRandomStarterCard(){
  const target = pickSbRandom(getSbStarterTargets());
  if(!target) return null;
  return removeSbDeckCardAt(target.index);
}

function removeSbRandomCards(count){
  const run = getSbRunState();
  if(!run) return [];
  const nextDeck = [...run.deck];
  const removedKeys = [];
  for(let i = 0; i < count && nextDeck.length > 0; i++){
    const removableIndexes = nextDeck
      .map((key, index) => ({ key, index }))
      .filter(item => isSbDeckCardRemovable(item.key))
      .map(item => item.index);
    if(removableIndexes.length === 0) break;
    const index = pickSbRandom(removableIndexes);
    const removed = nextDeck.splice(index, 1)[0];
    if(removed) removedKeys.push(removed);
  }
  sbSetDeck(nextDeck);
  return removedKeys;
}

function chooseSbStarterCardToRemove(){
  const targets = getSbStarterTargets();
  if(targets.length === 0){
    return null;
  }
  if(typeof window.OPEN_DECK_VIEWER_CARD_PICK !== "function"){
    console.error("[StartBlessing] 카드 선택 제거 UI를 찾을 수 없습니다.");
    return Promise.resolve(null);
  }
  return window.OPEN_DECK_VIEWER_CARD_PICK({
    title: "제거할 카드 선택",
    confirmText: "제거",
    isSelectable: key => !!(CARD_DB[key] && (CARD_DB[key].rarity === "starter" || CARD_DB[key].rarity === "basic") && isSbDeckCardRemovable(key)),
    disabledText: "기본 카드만 제거할 수 있습니다.",
    onConfirm: key => {
      const run = getSbRunState();
      const index = run ? run.deck.findIndex(deckKey => deckKey === key && CARD_DB[deckKey] && (CARD_DB[deckKey].rarity === "starter" || CARD_DB[deckKey].rarity === "basic") && isSbDeckCardRemovable(deckKey)) : -1;
      removeSbDeckCardAt(index);
    }
  });
}

function isSbCardAllowedBySpiritPath(card){
  return !window.VIBERUN_SPIRIT_PATH_FILTER ||
    typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath !== "function" ||
    window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(card);
}

function addSbRandomCardByRarity(rarity){
  if(typeof CARD_DB === "undefined") return null;
  const keys = Object.keys(CARD_DB).filter(key => CARD_DB[key] && CARD_DB[key].rarity === rarity && isSbCardAllowedBySpiritPath(CARD_DB[key]));
  const key = pickSbRandom(keys);
  if(!key) return null;
  const run = getSbRunState();
  sbSetDeck([...(run.deck || []), key]);
  return key;
}

function chooseSbCardRewardByRarity(rarity, options = {}){
  if(typeof CARD_DB === "undefined") return null;
  const keys = shuffleSbList(Object.keys(CARD_DB).filter(key => CARD_DB[key] && CARD_DB[key].rarity === rarity && isSbCardAllowedBySpiritPath(CARD_DB[key]))).slice(0, 3);
  if(keys.length === 0){
    console.warn("[StartBlessing] 선택 가능한 " + rarity + " 카드가 없어 카드 보상을 건너뜁니다.");
    return null;
  }
  if(typeof window.OPEN_CARD_REWARD_PICK !== "function"){
    console.error("[StartBlessing] 카드 선택 보상 UI를 찾을 수 없습니다.", rarity);
    return Promise.resolve(null);
  }
  return window.OPEN_CARD_REWARD_PICK({
    keys,
    title: options.title || "정화 보상",
    desc: options.desc || "새로운 주문 1장을 선택해 덱에 추가하세요.",
    onChoose: key => {
      const run = getSbRunState();
      sbSetDeck([...(run.deck || []), key]);
      if(typeof options.afterChoose === "function") options.afterChoose();
    }
  });
}

function addSbRandomStatusCard(){
  if(typeof CARD_DB === "undefined") return null;
  const keys = Object.keys(CARD_DB).filter(key => CARD_DB[key] && CARD_DB[key].rarity === "status");
  const key = pickSbRandom(keys);
  if(!key) return null;
  const run = getSbRunState();
  sbSetDeck([...(run.deck || []), key]);
  return key;
}

function addSbDiscountedCommonCard(){
  const baseKey = addSbRandomCardByRarity("common");
  const run = getSbRunState();
  if(!baseKey || !run || typeof CARD_DB === "undefined") return null;
  const tempKey = baseKey + "_blessing_cost_down_" + Date.now();
  const baseCard = CARD_DB[baseKey];
  CARD_DB[tempKey] = {
    ...baseCard,
    name: baseCard.name + " - 은혜",
    cost: Math.max(0, (baseCard.cost || 0) - 1),
    blessingBaseCard: baseKey,
    temporaryRunCard: true
  };
  const nextDeck = [...run.deck];
  const addedIndex = nextDeck.lastIndexOf(baseKey);
  if(addedIndex >= 0) nextDeck[addedIndex] = tempKey;
  sbSetDeck(nextDeck);
  return tempKey;
}

function getSbRegularRelicPool(){
  const db = (typeof RELIC_DB !== "undefined" && Array.isArray(RELIC_DB)) ? RELIC_DB : [];
  const run = getSbRunState();

  const ownedIds = new Set(
    (run && Array.isArray(run.relics) ? run.relics : [])
      .map(relic => relic && relic.id)
      .filter(Boolean)
  );

  // 신령의 은혜 보상은 현재 런타임에 반영된 일반 법구(RELIC_DB) 전체에서 균등 랜덤으로 뽑는다.
  // 주의: 신령의 은혜 선택 결과로 지급되는 은혜 전용 법구는 여기서 다시 뽑히면 안 된다.
  // 현재 dropWeight는 최종 밸런스 조정 전이며 0으로 등록된 법구도 있으므로 후보 제외 조건으로 사용하지 않는다.
  return db.filter(relic => {
    if (!relic) return false;

    // 이미 보유 중인 법구는 중복 지급하지 않는다.
    if (ownedIds.has(relic.id)) return false;

    // 신령의 은혜 전용 법구는 무작위 법구 후보에서 제외한다.
    if (relic.category === "blessingRelic") return false;
    if (relic.source === "startBlessing") return false;
    if (typeof relic.id === "string" && relic.id.indexOf("blessing_relic_") === 0) return false;

    if (!isSbCardAllowedBySpiritPath(relic)) return false;

    return true;
  });
}

function addSbRandomRelic(){
  const run = getSbRunState();
  if(!run) return null;
  if(!Array.isArray(run.relics)) run.relics = [];
  const pool = getSbRegularRelicPool();
  const relic = typeof window.pickRewardItemByRarity === "function"
    ? window.pickRewardItemByRarity(pool, { context:"blessing" })
    : pickSbRandom(pool);
  if(!relic) return null;
  run.relics.push({ ...relic });
  return relic;
}

function addSbRandomPotion(count){
  const run = getSbRunState();
  if(!run || typeof POTION_DB === "undefined" || !Array.isArray(POTION_DB)) return [];
  if(!Array.isArray(run.potions)) run.potions = [];
  const limit = typeof POTION_SLOT_LIMIT === "number" ? POTION_SLOT_LIMIT : 3;
  const potionPool = POTION_DB.filter(potion => potion && isSbCardAllowedBySpiritPath(potion));
  const added = [];
  for(let i = 0; i < count && run.potions.length < limit; i++){
    const potion = typeof window.pickRewardItemByRarity === "function"
      ? window.pickRewardItemByRarity(potionPool, { context:"blessing" })
      : pickSbRandom(potionPool);
    if(potion){
      const cloned = { ...potion };
      run.potions.push(cloned);
      added.push(cloned);
    }
  }
  return added;
}

/* ── 무작위 결과 팝업 연결 (선택 획득/선택 제거에는 사용하지 않는다) ─────── */
function sbPopupCardItem(key, action){
  if(!key) return null;
  const card = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
  return {
    type: "card", action, key,
    name: card ? card.name : key,
    icon: card && (card.art || card.emoji)
  };
}

function sbPopupRelicItem(relic, action){
  if(!relic) return null;
  return {
    type: "relic", action, key: relic.id, name: relic.name,
    icon: relic.iconImage || relic.icon || relic.emoji || "🏺",
    desc: relic.desc || relic.effectText || relic.valueText || "",
    rarity: relic.rarity || ""
  };
}

function sbPopupPotionItem(potion, action){
  if(!potion) return null;
  return {
    type: "potion", action, key: potion.id, name: potion.name,
    icon: potion.iconImage || potion.icon || potion.emoji || "🧪",
    desc: potion.desc || potion.effectText || potion.valueText || "",
    rarity: potion.rarity || ""
  };
}

function openSbRandomResultPopup(items, title){
  const safeItems = (items || []).filter(Boolean);
  if(!safeItems.length) return Promise.resolve();
  if(typeof window.OPEN_RANDOM_ITEM_RESULT_POPUP !== "function") return Promise.resolve();
  return window.OPEN_RANDOM_ITEM_RESULT_POPUP({
    title: title || "결과 확인",
    items: safeItems
  });
}

function setSbBattleEffect(type, data){
  const run = getSbRunState();
  if(!run) return;
  if(!run.startBlessingEffects) run.startBlessingEffects = {};
  run.startBlessingEffects[type] = { type, ...data };
  if(type === "firstBattleBlock") run.startBlessingEffect = run.startBlessingEffects[type];
}

/* ── 고른 은혜를 동일한 이름의 법구로 가방에 지급 ─────────────────────────
   효과 자체는 위 applySbBlessing()에서 그대로 적용된다(덱 변경/전투 시작
   결계 예약 등). 여기서는 플레이어가 가방에서 확인할 수 있도록 같은 이름의
   법구 항목만 추가하며, fx는 비워두어 법구 전투 효과 시스템(applyRelicTrigger)과
   중복 적용되지 않게 한다. */
function grantSbBlessingRelic(blessing){
  const run = getSbRunState();
  if(!run || !blessing) return;
  if(!Array.isArray(run.relics)) run.relics = [];
  if(run.relics.some(relic => relic && relic.id === blessing.id)) return;
  // equipment.js의 RELIC_DB에 같은 id로 등록된 은혜 전용 법구 데이터를 그대로 사용한다
  // (법구 도감에도 노출되도록). DB를 찾지 못하는 예외 상황에서만 최소 데이터로 대체한다.
  const master = (typeof RELIC_DB !== "undefined" && Array.isArray(RELIC_DB))
    ? RELIC_DB.find(item => item && item.id === blessing.id)
    : null;
  run.relics.push(master ? { ...master } : {
    id: blessing.id,
    name: blessing.name,
    emoji: blessing.icon,
    desc: blessing.desc,
    fx: []
  });
}

/* ── 이번 런의 신령을 RUN_STATE에 저장 (승리 연출에서 동일한 신령을 재사용) ─
   기획서 §3-2, §5-2: 승리 연출은 별도 신령 이미지를 새로 지정하지 않고,
   신령의 은혜에서 사용한 신령 데이터(RUN_STATE.blessingSpirit)를 그대로 읽는다. */
function saveSbSpiritToRunState(){
  const run = getSbRunState();
  if(!run || !sbSpirit) return;
  run.blessingSpirit = {
    id: sbSpirit.id || sbSpirit.name,
    name: sbSpirit.name,
    image: sbSpirit.image,
    emoji: sbSpirit.emoji,
    appearanceTitle: "승리",
    appearanceLines: (sbSpirit.victoryLines && sbSpirit.victoryLines.length)
      ? sbSpirit.victoryLines
      : [sbSpirit.dialogue]
  };
}

/* ── mapSystem.js의 getCurrentNodeId() 재정의 ─────────────────────────────
   원본은 currentStage<0일 때 "start"를 반환하지만 ACT1 맵의 로비 노드 id는
   "lobby_0"이라 매치되지 않아 현재 위치가 표시되지 않는 문제가 있었다.
   신령의 은혜 화면에서 로비를 현재 위치로 정확히 표시하기 위해 재정의한다. */
function getCurrentNodeId(){
  if(window.MAP_STATE.currentStage < 0){
    const lobby = MAP_FLOORS[0] && MAP_FLOORS[0][0];
    return lobby ? lobby.id : "start";
  }
  for(const f of MAP_FLOORS) for(const n of f){
    if(n.stageIndex === window.MAP_STATE.currentStage) return n.id;
  }
  return MAP_FLOORS[1]?.[0]?.id || "start";
}

function shuffleSbList(list){
  const result = [...list];
  for(let i = result.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
