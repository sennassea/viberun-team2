"use strict";
/* =========================================================================
   이벤트 노드 로직 (eventNode.js)
   기획서: ACT1 이벤트 세부 기획서 밸런스조정안 / 이벤트 데이터 입력 1차 개발 지시서

   효과 적용(정신력/골드/법구/카드/약병 지급 등), 선택지 처리, 전투 전환,
   맵 진입 흐름을 담당한다. 화면 렌더링(오버레이 DOM, 카드/약병 카드 HTML)은
   eventNodeUI.js로 분리되어 있으며 이 파일은 함수 이름으로만 그 UI 함수들을
   호출한다(같은 전역 스코프). 유니티 이식 시 이 파일의 효과 계산 로직은
   C#으로 그대로 옮길 수 있다.

   이 파일은 characterData.js / monsterData.js / lifeSystem.js / equipment.js /
   potion.js / cardData.js / eventData.js / script.js / mapSystem.js /
   mapNodeLogic.js / encounterPackages.js / restNode.js / shopNode.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고 window.EVENT_DB를 읽어
   전용 화면을 그립니다.

   진입 경로:
   - 실제 맵에서 event 노드를 클릭하면 파일 하단의 startStage() 감싸기를 통해
     현재 층 phaseTags/weight 기준으로 이벤트 하나를 뽑아 자동으로 연다.
   - CHEAT.event.open(1~16)으로도 동일한 화면을 직접 열 수 있다 (QA용).

   EVENT_DB에 쓰이는 모든 effect.type에는 핸들러가 연결되어 있다:
   spirit / spiritMin1 / gold / goldOrSpiritPenalty / relicRandom / relicRare /
   addStatusCard / cardRemove / cardDuplicate / potionRandom / potionSpecific
   (applyEventEffect 스위치) + cardReward / cardRewardOptional /
   cardRewardTagged / cardRewardDominantAttr / cardRewardRare / cardTransform /
   potionChoice / combat / combatEvent (selectEventChoice에서 특수 처리).
   ========================================================================= */

const EVENT_BALANCE = window.BOHYUN_BALANCE || {};
const EVENT_RELIC_FALLBACK_GOLD = EVENT_BALANCE.eventRelicFallbackGold || 70;

let eventState = null; // { event, step, resultDetails, cardCandidates, cardSelected }

/* ── 진입점 (cheatEvent.js의 CHEAT.event.open()이 호출) ─────────────────── */
function openEventNode(eventId){
  const ev = (window.EVENT_DB || []).find(e => e.id === eventId);
  if(!ev){
    console.warn("[eventNode] 이벤트를 찾을 수 없습니다: " + eventId);
    return;
  }
  ensureEventOverlay();
  applyEventBackground(ev);
  hideEventChrome();
  eventState = {
    event: ev, step: "choices", locked: false, resultDetails: [],
    cardCandidates: [], cardSelected: null,
    potionCandidates: [], potionSelected: null
  };
  const autoChoice = getEventAutoChoice(ev);
  if(autoChoice){
    selectEventChoice(autoChoice.id);
    return;
  }
  renderEventOverlay();
  eventOverlayEl.classList.add("show");
  eventOverlayEl.setAttribute("aria-hidden", "false");
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmEvent");
  }
}

function getEventAutoChoice(ev){
  if(!ev || ev.type !== "combat") return null;
  const choices = Array.isArray(ev.choices) ? ev.choices : [];
  return choices.find(choice => choice && choice.id === "AUTO") || null;
}

/* 이벤트 종료 → 맵으로 복귀 (기도터/상점과 동일 패턴) */
function finishEventNode(){
  const completedEvent = eventState && eventState.event;
  const resultDetails = eventState && Array.isArray(eventState.resultDetails)
    ? eventState.resultDetails
    : [];

  if(typeof recordCompletedNodeScore === "function"){
    recordCompletedNodeScore("event", {
      reason: "이벤트 완료"
    });
  }

  const isHighRiskSuccess =
    completedEvent &&
    completedEvent.category === "high_risk_high_reward" &&
    resultDetails.some(detail => detail && detail.kind === "positive");

  if(isHighRiskSuccess && typeof recordJourneyActionScore === "function"){
    recordJourneyActionScore("highRiskEventSuccess", {
      type: "event",
      reason: "고위험 이벤트 성공"
    });
  }

  restoreEventMapOverrides();
  closeEventOverlayOnly();
  eventState = null;
  if(typeof renderHud === "function" && typeof S !== "undefined" && S) renderHud();
  if(window.MAP_STATE) window.MAP_STATE.proceedMode = true;
  if(typeof openMap === "function") openMap();
}

/* ── 선택지 처리 ─────────────────────────────────────────────────────────── */
function getEventChoiceRequiredGold(choice){
  const outcomes = Array.isArray(choice && choice.outcomes) ? choice.outcomes : [];
  if(outcomes.length !== 1) return 0;
  const outcome = outcomes[0];
  if(typeof outcome.chance === "number" && outcome.chance !== 100) return 0;
  const effects = Array.isArray(outcome.effects) ? outcome.effects : [];
  const costEffect = effects.find(effect => effect && effect.type === "gold" && effect.value < 0);
  return costEffect ? Math.abs(costEffect.value) : 0;
}

function getEventChoiceDisabledReason(choice){
  const requiredGold = getEventChoiceRequiredGold(choice);
  if(!requiredGold) return "";
  const currentGold = (typeof S !== "undefined" && S && typeof S.gold === "number") ? S.gold : 0;
  return currentGold >= requiredGold ? "" : "복채 " + requiredGold + " 필요";
}

function rollEventOutcomes(outcomes){
  if(!outcomes || !outcomes.length) return [];

  /* 기획서 11-1: chance:100인 outcome이 2개 이상이면 확률 분기가 아니라
     동시 적용 결과이므로 전부 적용한다. */
  const fullChanceOutcomes = outcomes.filter(o => (o.chance || 0) >= 100);
  if(fullChanceOutcomes.length > 1) return fullChanceOutcomes;

  const total = outcomes.reduce((sum, o) => sum + (o.chance || 0), 0) || 100;
  let roll = Math.random() * total;
  for(const o of outcomes){
    roll -= (o.chance || 0);
    if(roll <= 0) return [o];
  }
  return [outcomes[outcomes.length - 1]];
}

/* cardReward 계열: 3장(혹은 지정 개수) 후보를 보여주고 1장 선택/건너뛰기하는
   공통 흐름을 타는 효과 타입들. */
const EVENT_CARD_PICK_TYPES = [
  "cardReward", "cardRewardOptional", "cardRewardTagged",
  "cardRewardDominantAttr", "cardRewardRare", "cardTransform"
];

function selectEventChoice(choiceId){
  if(!eventState || eventState.step !== "choices" || eventState.locked) return;
  const choice = (eventState.event.choices || []).find(c => c.id === choiceId);
  if(!choice) return;

  /* 더블클릭/빠른 연타로 인한 보상 중복 지급을 막는다. 이 시점 이후로는
     같은 선택지에 대해 다시 진입할 수 없다 (eventState는 매 이벤트 진입마다
     새로 생성되므로 다음 이벤트에서는 자동으로 초기화된다). */
  eventState.locked = true;

  const outcomes = Array.isArray(choice.outcomes) ? choice.outcomes : [];
  if(!outcomes.length){
    finishEventNode();
    return;
  }

  const picked = rollEventOutcomes(outcomes);
  const effects = picked.reduce((acc, o) => acc.concat(Array.isArray(o.effects) ? o.effects : []), []);
  const combatEffect = effects.find(e => e.type === "combat" || e.type === "combatEvent");
  const cardRewardEffect = effects.find(e => EVENT_CARD_PICK_TYPES.includes(e.type));
  const potionChoiceEffect = effects.find(e => e.type === "potionChoice");
  const specialEffects = [combatEffect, cardRewardEffect, potionChoiceEffect].filter(Boolean);
  const immediateEffects = effects.filter(e => !specialEffects.includes(e));

  eventState.resultDetails = picked.map(o => ({ kind: o.kind, text: o.text }));
  immediateEffects.forEach(applyEventEffect);

  /* 정신력이 0 이하가 되면 이벤트를 즉시 종료하고 패배 처리한다. */
  if(checkEventPlayerDeath()) return;

  if(cardRewardEffect){
    openEventCardPick(cardRewardEffect);
    return;
  }
  if(potionChoiceEffect){
    openEventPotionPick(potionChoiceEffect);
    return;
  }
  if(combatEffect){
    triggerEventCombat(combatEffect);
    return;
  }

  eventState.step = "result";
  renderEventOverlay();
}

function checkEventPlayerDeath(){
  const player = eventPlayer();
  if(!player || player.hp > 0) return false;
  restoreEventMapOverrides();
  closeEventOverlayOnly();
  eventState = null;
  if(typeof endGame === "function") endGame("lose");
  return true;
}

/* ── 효과 적용 ───────────────────────────────────────────────────────────── */
function eventPlayer(){
  return (typeof S !== "undefined" && S && S.player) ? S.player : null;
}

function applyEventEffect(effect){
  if(!effect || !effect.type) return;
  switch(effect.type){
    case "spirit": return applyEventSpirit(effect.value);
    case "spiritMin1": return applyEventSpiritMin1(effect.value);
    case "gold": return applyEventGold(effect.value);
    case "goldOrSpiritPenalty": return applyEventGoldOrSpiritPenalty(effect);
    case "relicRandom": return applyEventRelicGrant(null, "");
    case "relicRare": return applyEventRelicGrant("rare", "유일 ");
    case "addStatusCard": return applyEventAddStatusCard(effect);
    case "cardRemove": return applyEventCardRemove(effect);
    case "cardDuplicate": return applyEventCardDuplicate(effect);
    case "potionRandom": return applyEventPotionRandom(effect);
    case "potionSpecific": return applyEventPotionSpecific(effect);
    case "none": return;
    /* cardReward 계열(cardReward/cardRewardOptional/cardRewardTagged/
       cardRewardDominantAttr/cardRewardRare/cardTransform), potionChoice,
       combat/combatEvent는 selectEventChoice()에서 특수 처리되어 이 스위치까지
       내려오지 않는다. */
    default:
      console.warn("[eventNode] 아직 연결되지 않은 효과 타입: " + effect.type);
  }
}

function applyEventSpirit(value){
  const player = eventPlayer();
  if(!player || typeof LIFE === "undefined" || !LIFE) return;
  if(value >= 0) LIFE.heal(player, value);
  else LIFE.applyDamage(player, -value, 0);
}

function applyEventSpiritMin1(value){
  const player = eventPlayer();
  if(!player || typeof LIFE === "undefined" || !LIFE) return;
  if(value >= 0){ LIFE.heal(player, value); return; }
  LIFE.applyDamage(player, -value, 0);
  if(player.hp < 1) player.hp = 1;
}

function applyEventGold(value){
  if(typeof S === "undefined" || !S) return;
  S.gold = Math.max(0, (S.gold || 0) + value);
}

function applyEventGoldOrSpiritPenalty(effect){
  if(typeof S === "undefined" || !S) return;
  const cost = Math.abs(effect.goldValue || 0);
  if((S.gold || 0) >= cost){
    S.gold = Math.max(0, S.gold - cost);
    return;
  }
  S.gold = 0;
  applyEventSpirit(effect.fallbackSpirit || 0);
}

/* rarityFilter가 없으면 전체 후보, 있으면 해당 rarity(예: "rare")만 대상으로
   미보유 법구 중 dropWeight 가중치로 1개를 뽑는다 (법구 중복 지급 방지). */
function pickEventRelic(rarityFilter){
  if(typeof S === "undefined" || !S) return null;
  const ownedIds = Array.isArray(S.relics) ? S.relics.map(r => r && r.id).filter(Boolean) : [];
  const candidates = typeof window.getRelicCandidatesBySource === "function"
    ? window.getRelicCandidatesBySource("event")
    : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  const pool = (candidates || []).filter(r => r && !ownedIds.includes(r.id));
  if(!pool.length) return null;
  const picked = typeof window.pickRewardItemByRarity === "function"
    ? window.pickRewardItemByRarity(pool, rarityFilter ? { rarity:rarityFilter } : { context:"event" })
    : pool[Math.floor(Math.random() * pool.length)];
  return picked ? { ...picked } : null;
}

function applyEventRelicGrant(rarityFilter, labelPrefix){
  if(typeof S === "undefined" || !S) return;
  if(!Array.isArray(S.relics)) S.relics = [];
  const relic = pickEventRelic(rarityFilter);
  if(!relic){
    /* 후보가 없으면 골드로 대체해 이벤트 정지를 방지한다 (문서 QA) */
    applyEventGold(EVENT_RELIC_FALLBACK_GOLD);
    eventState.resultDetails.push({
      kind: "neutral",
      text: "미보유 " + labelPrefix + "법구가 없어 복채 " + EVENT_RELIC_FALLBACK_GOLD + "로 대체 지급되었습니다."
    });
    return;
  }
  S.relics.push(relic);
  eventState.resultDetails.push({
    kind: "positive",
    text: labelPrefix + "법구 획득: " + (relic.emoji || "🏺") + " " + relic.name
  });
  openEventRandomResultPopup(
    [eventPopupRelicItem(relic, "gain")],
    labelPrefix + "법구 획득"
  );
}

function applyEventAddStatusCard(effect){
  const candidates = Array.isArray(effect.candidates) ? effect.candidates.filter(Boolean) : [];
  if(!candidates.length) return;
  const count = effect.count || 1;
  const addedKeys = [];
  for(let i = 0; i < count; i++){
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    if(typeof addPermanentCard === "function") addPermanentCard(key, { source:"eventStatus", addToDiscard:false });
    else if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(key);
    const card = (typeof CARD_DB !== "undefined" && CARD_DB[key]) ? CARD_DB[key] : null;
    eventState.resultDetails.push({ kind: "negative", text: "상태 주문 추가: " + (card ? card.name : key) });
    addedKeys.push(key);
  }
  openEventRandomResultPopup(
    addedKeys.map(key => eventPopupCardItem(key, "gain")),
    "상태 주문 추가"
  );
}

/* 덱에서 무작위 주문을 count장 삭제한다. 덱이 1장 이하로 남을 정도로는
   삭제하지 않는다 (전투 진행 불가 방지). */
function applyEventCardRemove(effect){
  if(typeof STARTER_DECK === "undefined" || STARTER_DECK.length <= 1){
    eventState.resultDetails.push({ kind: "neutral", text: "덱이 너무 적어 주문을 삭제하지 못했습니다." });
    return;
  }
  const count = Math.min(effect.count || 1, STARTER_DECK.length - 1);
  const removedKeys = [];
  for(let i = 0; i < count && STARTER_DECK.length > 1; i++){
    const removableIdxs = STARTER_DECK
      .map((_, idx) => idx)
      .filter(idx => typeof window.IS_CARD_REMOVABLE_FROM_DECK !== "function" || window.IS_CARD_REMOVABLE_FROM_DECK(STARTER_DECK[idx]));
    if(!removableIdxs.length) break;
    const idx = removableIdxs[Math.floor(Math.random() * removableIdxs.length)];
    const key = STARTER_DECK[idx];
    STARTER_DECK.splice(idx, 1);
    const card = (typeof CARD_DB !== "undefined" && CARD_DB[key]) ? CARD_DB[key] : null;
    eventState.resultDetails.push({ kind: "neutral", text: "주문 삭제: " + (card ? card.name : key) });
    removedKeys.push(key);
  }
  openEventRandomResultPopup(
    removedKeys.map(key => eventPopupCardItem(key, "remove")),
    "주문 제거"
  );
}

function applyEventCardDuplicate(effect){
  if(typeof STARTER_DECK === "undefined" || !STARTER_DECK.length) return;
  const exclude = Array.isArray(effect.excludeRarity) ? effect.excludeRarity : [];
  const pool = STARTER_DECK.filter(key => {
    const c = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
    return c && !exclude.includes(c.rarity);
  });
  if(!pool.length) return;
  const key = pool[Math.floor(Math.random() * pool.length)];
  if(typeof addPermanentCard === "function") addPermanentCard(key, { source:"eventDuplicate", addToDiscard:false });
  else STARTER_DECK.push(key);
  const card = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
  eventState.resultDetails.push({ kind: "positive", text: "주문 복제: " + (card ? card.name : key) });
  openEventRandomResultPopup(
    [eventPopupCardItem(key, "gain")],
    "주문 복제"
  );
}

/* ── 무작위 결과 팝업 연결 (선택 획득/선택 제거 UI에는 사용하지 않는다) ─── */
function eventPopupCardItem(key, action){
  if(!key) return null;
  const card = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
  return {
    type: "card", action, key,
    name: card ? card.name : key,
    icon: card && (card.art || card.emoji)
  };
}

function eventPopupRelicItem(relic, action){
  if(!relic) return null;
  return {
    type: "relic", action, key: relic.id, name: relic.name,
    icon: relic.iconImage || relic.icon || relic.emoji || "🏺",
    desc: relic.desc || relic.effectText || relic.valueText || "",
    rarity: relic.rarity || ""
  };
}

function eventPopupPotionItem(potion, action){
  if(!potion) return null;
  return {
    type: "potion", action, key: potion.id, name: potion.name,
    icon: potion.iconImage || potion.icon || potion.emoji || "🧪",
    desc: potion.desc || potion.effectText || potion.valueText || "",
    rarity: potion.rarity || ""
  };
}

function openEventRandomResultPopup(items, title){
  const safeItems = (items || []).filter(Boolean);
  if(!safeItems.length) return;
  if(typeof window.OPEN_RANDOM_ITEM_RESULT_POPUP !== "function") return;
  window.OPEN_RANDOM_ITEM_RESULT_POPUP({
    title: title || "결과 확인",
    items: safeItems
  });
}

/* eventData.js의 attr 표기(예: "동요")는 CARD_DB의 실제 덱 속성 문자열과 다를 수 있어
   여기서 실제 덱 속성으로 정규화한다. */
function normalizeEventCardAttr(attr){
  const aliases = {
    "동요": "회상 덱",
    "회상": "회상 덱",
    "결계": "결계 덱",
    "성불": "성불 표식 덱",
    "성불 표식": "성불 표식 덱",
    "한풀이": "한풀이 덱",
    "굿판": "굿판 덱"
  };
  return aliases[attr] || attr;
}

function buildTaggedCardPool(attr){
  if(typeof CARD_DB === "undefined") return [];
  const normalizedAttr = normalizeEventCardAttr(attr);
  return Object.keys(CARD_DB).filter(k => {
    const card = CARD_DB[k];
    if(!card || card.excludeFromRewards || card.generatedOnly) return false;
    if(["starter", "status"].includes(card.rarity)) return false;
    const cardAttr = card.attr || "";
    const attrMatches = cardAttr === normalizedAttr ||
      cardAttr === attr ||
      cardAttr.includes(normalizedAttr) ||
      (attr && cardAttr.includes(attr));
    if(!attrMatches) return false;
    const allowedBySpiritPath =
      !window.VIBERUN_SPIRIT_PATH_FILTER ||
      typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath !== "function" ||
      window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(card);
    return allowedBySpiritPath;
  });
}

function buildRareCardPool(){
  if(typeof CARD_DB === "undefined") return [];
  return Object.keys(CARD_DB).filter(k => {
    const card = CARD_DB[k];
    if(!card || card.rarity !== "rare" || card.excludeFromRewards || card.generatedOnly) return false;
    const allowedBySpiritPath =
      !window.VIBERUN_SPIRIT_PATH_FILTER ||
      typeof window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath !== "function" ||
      window.VIBERUN_SPIRIT_PATH_FILTER.isItemAllowedBySpiritPath(card);
    return allowedBySpiritPath;
  });
}

/* 현재 덱(STARTER_DECK)에서 가장 많이 보유한 attr 계열을 계산한다.
   동률이면 그중 하나를 무작위로 고른다 (문서: "동률 시 랜덤"). */
function computeDominantDeckAttr(){
  const counts = {};
  const deck = typeof STARTER_DECK !== "undefined" ? STARTER_DECK : [];
  deck.forEach(key => {
    const c = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
    if(!c || c.rarity === "status") return;
    const attr = c.attr || "범용";
    counts[attr] = (counts[attr] || 0) + 1;
  });
  let bestCount = -1, ties = [];
  Object.keys(counts).forEach(attr => {
    const n = counts[attr];
    if(n > bestCount){ bestCount = n; ties = [attr]; }
    else if(n === bestCount){ ties.push(attr); }
  });
  return ties.length ? ties[Math.floor(Math.random() * ties.length)] : "범용";
}

/* ── 약병 효과 ───────────────────────────────────────────────────────────── */
function pickEventPotion(rarityFilter){
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("event")
    : (typeof POTION_DB !== "undefined" ? POTION_DB : []);
  const pool = (db || []).filter(Boolean);
  if(!pool.length) return null;
  const picked = typeof window.pickRewardItemByRarity === "function"
    ? window.pickRewardItemByRarity(pool, rarityFilter ? { rarity:rarityFilter } : { context:"event" })
    : pool[Math.floor(Math.random() * pool.length)];
  return picked ? { ...picked } : null;
}

/* potionChoice 후보 count개를 등급 우선 추첨(context:"event")으로 중복 없이 뽑는다. */
function pickEventPotionCandidatesByRarity(pool, count){
  const remaining = (pool || []).slice();
  const picked = [];
  const amount = Math.max(0, count || 0);
  for(let i = 0; i < amount && remaining.length; i++){
    const item = typeof window.pickRewardItemByRarity === "function"
      ? window.pickRewardItemByRarity(remaining, { context:"event" })
      : remaining[Math.floor(Math.random() * remaining.length)];
    if(!item) break;
    const idx = remaining.indexOf(item);
    if(idx >= 0) remaining.splice(idx, 1);
    picked.push(item);
  }
  return picked;
}

/* 약병 슬롯(POTION_SLOT_LIMIT, 기본 3개) 초과 시 지급하지 않고 결과에만 남긴다. */
function grantEventPotion(potion){
  if(!potion || typeof S === "undefined" || !S) return false;
  if(!Array.isArray(S.potions)) S.potions = [];
  const canAdd = typeof canAddPotion === "function"
    ? canAddPotion(S.potions)
    : S.potions.length < (window.POTION_SLOT_LIMIT || 3);
  if(!canAdd){
    eventState.resultDetails.push({
      kind: "neutral",
      text: "약병 슬롯이 가득 차 " + (potion.emoji || "🧪") + " " + potion.name + "을(를) 받지 못했습니다."
    });
    return false;
  }
  S.potions.push(potion);
  eventState.resultDetails.push({ kind: "positive", text: "약병 획득: " + (potion.emoji || "🧪") + " " + potion.name });
  openEventRandomResultPopup(
    [eventPopupPotionItem(potion, "gain")],
    "약병 획득"
  );
  return true;
}

function applyEventPotionRandom(effect){
  const potion = pickEventPotion(effect.rarity);
  if(!potion){
    eventState.resultDetails.push({ kind: "neutral", text: "지급할 약병 후보가 없습니다." });
    return;
  }
  grantEventPotion(potion);
}

function applyEventPotionSpecific(effect){
  const db = typeof POTION_DB !== "undefined" ? POTION_DB : [];
  const found = db.find(p => p.id === effect.potionId);
  if(!found){
    eventState.resultDetails.push({ kind: "neutral", text: "약병 데이터를 찾을 수 없습니다." });
    return;
  }
  grantEventPotion({ ...found });
}

/* ── 주문 보상 단계 ──────────────────────────────────────────────────────── */
function buildEventCardCandidates(effect){
  const count = effect.count || effect.rewardCount || 3;
  if(effect.type === "cardRewardTagged"){
    const pool = buildTaggedCardPool(effect.attr);
    if(!pool.length){
      console.warn("[Event] cardRewardTagged 후보가 없어 일반 카드 보상으로 대체합니다.", effect.attr);
      return typeof getRandomRewardKeys === "function" ? getRandomRewardKeys(count, "event") : [];
    }
    return typeof getWeightedCardRewardKeys === "function"
      ? getWeightedCardRewardKeys(count, pool, { context:"event" })
      : shuffle([...pool]).slice(0, count);
  }
  if(effect.type === "cardRewardDominantAttr"){
    const pool = buildTaggedCardPool(computeDominantDeckAttr());
    return typeof getWeightedCardRewardKeys === "function"
      ? getWeightedCardRewardKeys(count, pool, { context:"event" })
      : shuffle([...pool]).slice(0, count);
  }
  if(effect.type === "cardRewardRare"){
    return shuffle([...buildRareCardPool()]).slice(0, count);
  }
  /* cardReward / cardRewardOptional / cardTransform */
  return typeof getRandomRewardKeys === "function"
    ? getRandomRewardKeys(count, "event")
    : (typeof CARD_REWARD_POOL !== "undefined" && typeof shuffle === "function"
        ? shuffle([...CARD_REWARD_POOL]).slice(0, count)
        : []);
}

function openEventCardPick(effect){
  if(effect.type === "cardTransform"){
    applyEventCardRemove({ count: effect.removeCount || 1 });
  }
  eventState.step = "cardPick";
  eventState.cardCandidates = buildEventCardCandidates(effect);
  eventState.cardSelected = null;
  renderEventOverlay();
}

function selectEventCard(key){
  if(!eventState || eventState.step !== "cardPick") return;
  eventState.cardSelected = key;
  renderEventOverlay();
}

function confirmEventCard(){
  if(!eventState || !eventState.cardSelected) return;
  const card = (typeof CARD_DB !== "undefined") ? CARD_DB[eventState.cardSelected] : null;
  if(card){
    if(typeof addPermanentCard === "function") addPermanentCard(eventState.cardSelected, { source:"eventReward" });
    else {
      if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(eventState.cardSelected);
      if(typeof S !== "undefined" && S && Array.isArray(S.discard)){
        if(typeof pushDiscardCard === "function") pushDiscardCard(eventState.cardSelected, typeof createCardInstance === "function" ? createCardInstance(eventState.cardSelected) : undefined);
        else {
          S.discard.push(eventState.cardSelected);
          if(!Array.isArray(S.discardInstances)) S.discardInstances = [];
          S.discardInstances.push(typeof createCardInstance === "function"
            ? createCardInstance(eventState.cardSelected)
            : { key:eventState.cardSelected, runtime:{ hanpuriGrowth:0 } });
        }
      }
    }
  }
  finishEventNode();
}

function skipEventCard(){
  if(typeof toast === "function") toast("주문 보상을 건너뛰었습니다.");
  finishEventNode();
}

/* ── 약병 선택 단계 (potionChoice) ───────────────────────────────────────── */
function openEventPotionPick(effect){
  const count = effect.count || 2;
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("event")
    : (typeof POTION_DB !== "undefined" ? POTION_DB : []);
  const pool = (db || []).filter(Boolean);

  eventState.step = "potionPick";
  eventState.potionCandidates = effect.rarity
    ? shuffle(pool.filter(p => p.rarity === effect.rarity)).slice(0, count)
    : pickEventPotionCandidatesByRarity(pool, count);
  eventState.potionSelected = null;
  renderEventOverlay();
}

function selectEventPotion(potionId){
  if(!eventState || eventState.step !== "potionPick") return;
  eventState.potionSelected = potionId;
  renderEventOverlay();
}

function confirmEventPotion(){
  if(!eventState || !eventState.potionSelected) return;
  const potion = (eventState.potionCandidates || []).find(p => p.id === eventState.potionSelected);
  if(potion) grantEventPotion(potion);
  finishEventNode();
}

function skipEventPotion(){
  if(typeof toast === "function") toast("약병 선택을 건너뛰었습니다.");
  finishEventNode();
}

/* ── 전투 전환 ───────────────────────────────────────────────────────────── */
function triggerEventCombat(combatEffect){
  const combatType = combatEffect && combatEffect.combatType;
  const isHighRiskEvent = !!(eventState && eventState.event && eventState.event.category === "high_risk_high_reward");
  restoreEventMapOverrides();
  closeEventOverlayOnly();
  eventState = null;

  const d = window.BOHYUN_COMBAT_DATA;
  if(!d || !Array.isArray(d.monsters)){
    if(typeof toast === "function") toast("전투 데이터를 불러올 수 없습니다.");
    finishEventNode();
    return;
  }

  const nodeType = combatType === "elite" ? "elite" : "enemy";
  const floor = (typeof nodeFloorIdx === "function" && typeof getCurrentNodeId === "function")
    ? Math.max(1, nodeFloorIdx(getCurrentNodeId()))
    : 1;
  const stageTheme = typeof window.ACT1_PICK_STAGE_THEME === "function"
    ? window.ACT1_PICK_STAGE_THEME(nodeType, floor, {})
    : null;
  const recentHistory = typeof window.ACT1_GET_COMBAT_HISTORY === "function"
    ? window.ACT1_GET_COMBAT_HISTORY()
    : [];
  const pkg = typeof window.ACT1_PICK_PACKAGE === "function"
    ? window.ACT1_PICK_PACKAGE(nodeType, floor, new Set(), stageTheme, recentHistory)
    : null;

  let mons = (pkg && typeof d.getMonstersByIds === "function") ? d.getMonstersByIds(pkg.monsterIds) : null;
  if(!mons || !mons.length){
    const fallbackGrade = nodeType === "elite" ? "elite" : "normal";
    const themeIds = (d.monsterThemeGroups && stageTheme && d.monsterThemeGroups[stageTheme] && d.monsterThemeGroups[stageTheme][fallbackGrade]) || (d.monsterGroups && d.monsterGroups.normal) || [];
    mons = themeIds.slice(0, 1).map(id => d.getMonsterById(id)).filter(Boolean);
  }
  if(!mons || !mons.length){
    if(typeof toast === "function") toast("전투를 시작할 몬스터를 찾을 수 없습니다.");
    finishEventNode();
    return;
  }

  d.monsters.splice(0, d.monsters.length, ...mons);
  if(pkg && typeof window.ACT1_RECORD_PACKAGE_HISTORY === "function"){
    window.ACT1_RECORD_PACKAGE_HISTORY(pkg, nodeType);
  }
  if(typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.runStats){
    RUN_STATE.runStats.pendingEventCombat = {
      stageIndex: window.MAP_STATE && Number.isFinite(window.MAP_STATE.currentStage)
        ? window.MAP_STATE.currentStage
        : -1,
      highRisk: isHighRiskEvent
    };
  }
  if(typeof newGame === "function") newGame();
  if(typeof S !== "undefined" && S){
    S.battleNodeType = nodeType;
    if(Number.isFinite(combatEffect && combatEffect.victoryGold)){
      S.battleVictoryGoldOverride = Math.max(0, Math.floor(combatEffect.victoryGold));
    }
    if(combatEffect && combatEffect.victoryRelicSource){
      S.battleVictoryRelicSource = combatEffect.victoryRelicSource;
    }
    if(combatEffect && combatEffect.suppressCardReward){
      S.battleSuppressCardReward = true;
    }
    if(combatEffect && combatEffect.suppressGoldReward){
      S.battleSuppressGoldReward = true;
    }
    if(combatEffect && combatEffect.suppressOptionalRewards){
      S.battleSuppressOptionalRewards = true;
    }
  }
}

window.EVENT_NODE_OPEN = openEventNode;

/* =========================================================================
   맵 연동: event 노드 선택 시 이벤트 UI 진입
   - mapNodeLogic.js의 event 노드는 이제 isDimmed:false이므로 맵에서 실제로
     클릭할 수 있다. 이 파일은 restNode.js/shopNode.js와 동일한 "startStage
     감싸기" 패턴으로 event 타입 스테이지만 가로챈다.
   - 현재 층(phase: early/mid/late) 기준으로 EVENT_DB를 필터링한 뒤,
     weight 가중치로 랜덤 이벤트 1개를 선택해 연다.
   ========================================================================= */
function eventFloorForStageIndex(stageIdx){
  if(typeof MAP_FLOORS === "undefined") return 1;
  for(let fi = 0; fi < MAP_FLOORS.length; fi++){
    if(MAP_FLOORS[fi].some(n => n.stageIndex === stageIdx)) return fi;
  }
  return 1;
}

/* mapNodeLogic.js의 act1GetWeights 구간 분류(1~5=early, 6~10=mid, 11~14=late)와
   동일한 경계를 사용해 EVENT_DB.phaseTags와 맞춘다. */
function eventPhaseForFloor(floor){
  if(floor <= 5) return "early";
  if(floor <= 10) return "mid";
  return "late";
}

function pickRandomEventForFloor(floor){
  const db = window.EVENT_DB || [];
  if(!db.length) return null;
  const phase = eventPhaseForFloor(floor);
  let pool = db.filter(e => Array.isArray(e.phaseTags) && e.phaseTags.includes(phase));
  if(!pool.length) pool = db; // 안전망: 해당 구간에 맞는 이벤트가 없으면 전체 중에서 선택

  const total = pool.reduce((sum, e) => sum + (e.weight || 1), 0);
  if(total <= 0) return pool[0];
  let roll = Math.random() * total;
  for(const e of pool){
    roll -= (e.weight || 1);
    if(roll <= 0) return e;
  }
  return pool[pool.length - 1];
}

(function initEventMapEntry(){
  const prevStartStage = window.startStage;
  window.startStage = function eventWrappedStartStage(stageIdx){
    const stage = typeof MAP_STAGES !== "undefined" ? MAP_STAGES[stageIdx] : null;

    if(stage && stage.type === "event"){
      window.MAP_STATE.currentStage = stageIdx;
      window.MAP_STATE.proceedMode  = false;
      window.MAP_STATE.startMapMode = false;
      if(typeof updateHudFloor === "function") updateHudFloor();
      if(typeof closeMap === "function") closeMap();

      const floor = eventFloorForStageIndex(stageIdx);
      const picked = pickRandomEventForFloor(floor);
      if(!picked){
        if(typeof toast === "function") toast("표시할 이벤트가 없습니다.");
        if(typeof openMap === "function") openMap();
        return;
      }
      openEventNode(picked.id);
      return;
    }

    if(typeof prevStartStage === "function") return prevStartStage(stageIdx);
  };
})();
