"use strict";
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
      '<div class="card-desc-text">' + colorizeRarityLabels(escapeHtml(safeCard.desc || "")) + '</div>' +
    '</div>' +
    '<div class="card-hit-layer" aria-hidden="true"></div>';
}

function chooseCardFromCandidates(options={}){
  const candidates = options.candidates || [];
  if(!candidates.length) return Promise.resolve(null);
  if(options.autoPickSingle === true && candidates.length === 1) return Promise.resolve(candidates[0]);
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
    (document.querySelector("#game") || document.body).appendChild(ov);
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

/* 손패/버림더미 등에서 카드 1장을 선택해 버리거나 되찾는 전투 중 효과들이
   기존 보유 카드 UI(deckViewer.js)를 공용으로 재사용하기 위한 래퍼.
   반환값은 선택된 카드의 uid(문자열) 또는 취소 시 null. */
function chooseHandCardUidViaDeckViewer(options={}){
  const candidates = options.candidates || [];
  if(!candidates.length) return Promise.resolve(null);
  if(typeof window.OPEN_DECK_VIEWER_CARD_PICK !== "function"){
    return chooseCardFromCandidates(options).then(picked => picked ? picked.uid : null);
  }
  if(S) S.pendingCardChoice = true;
  updateEndBtn();
  return window.OPEN_DECK_VIEWER_CARD_PICK({
    title: options.title || "카드 선택",
    helpText: options.desc || "",
    confirmText: options.confirmText || "선택 완료",
    candidates
  }).then(uid => {
    if(S) S.pendingCardChoice = false;
    updateEndBtn();
    return uid || null;
  });
}

/* 손패에서 카드를 원하는 만큼 골라 버리는 등 다중 선택 전투 효과들이
   기존 보유 카드 UI(deckViewer.js)를 공용으로 재사용하기 위한 래퍼.
   반환값은 선택된 카드들의 uid 배열(취소 또는 미선택 확인 시 빈 배열). */
function chooseHandCardUidsViaDeckViewer(options={}){
  const candidates = options.candidates || [];
  if(!candidates.length) return Promise.resolve([]);
  if(typeof window.OPEN_DECK_VIEWER_CARD_PICK !== "function") return Promise.resolve([]);
  if(S) S.pendingCardChoice = true;
  updateEndBtn();
  return window.OPEN_DECK_VIEWER_CARD_PICK({
    title: options.title || "카드 선택",
    helpText: options.desc || "",
    confirmText: options.confirmText || "확인",
    candidates,
    multi: true
  }).then(uids => {
    if(S) S.pendingCardChoice = false;
    updateEndBtn();
    return Array.isArray(uids) ? uids : [];
  });
}

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
    const healValue = typeof scaleEndlessPlayerHeal === "function" ? scaleEndlessPlayerHeal(healingFragrance) : healingFragrance;
    const healed = LIFE.heal(S.player, healValue);
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
    gainPlayerBlock(altarEnergy);
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
  const uid = await chooseHandCardUidViaDeckViewer({
    title: options.costZero ? "한을 풀다" : "되새기는 밤",
    desc: "버림 더미에서 가져올 한풀이 주문을 선택하세요.",
    candidates
  });
  if(!uid) return false;
  const idx = S.discardInstances.findIndex(instance => instance && instance.uid === uid);
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
  const uid = await chooseHandCardUidViaDeckViewer({
    title: "놓지 못한 손",
    desc: "버릴 한풀이 주문을 선택하세요.",
    candidates
  });
  if(!uid) return -1;
  const idx = S.handInstances.findIndex(instance => instance && instance.uid === uid);
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
    const uid = await chooseHandCardUidViaDeckViewer({
      title: "발맞춤",
      desc: "버릴 손패 1장을 선택하세요.",
      candidates
    });
    if(!uid) break;
    const idx = S.handInstances.findIndex(instance => instance && instance.uid === uid);
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
      if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("cardDraw");
      applyRelicTrigger("onCardDrawnFromDrawPile", { cardUid:(drawnInstance && drawnInstance.uid) || null, cardKey:drawn, handIndex:S.hand.length - 1, source:options.source || "unknown" });
    }
  }
}

const CARD_RARITY_REWARD_WEIGHT = Object.freeze({
  common: 6,
  uncommon: 3,
  rare: 1
});

/* 등급 우선 추첨용 확률표. balanceData.js의 rewardRarityWeights를 컨텍스트별로
   조회하며, 없으면 default(60/30/10)로 대체한다. */
function getRewardRarityWeights(context){
  const balance = window.BOHYUN_BALANCE || {};
  const table = balance.rewardRarityWeights || {};
  return table[context] || table.default || { common: 60, uncommon: 30, rare: 10 };
}

/* availableRarities로 후보가 있는 등급만 남겨 재정규화한 뒤 1개를 뽑는다.
   후보 있는 등급이 하나도 없으면 null을 반환한다. */
function pickRarityFromWeights(weights, availableRarities){
  const rarities = (Array.isArray(availableRarities) && availableRarities.length)
    ? availableRarities
    : Object.keys(weights || {});
  const entries = rarities
    .map(rarity => ({ rarity, weight: Math.max(0, (weights && weights[rarity]) || 0) }))
    .filter(entry => entry.weight > 0);
  if(!entries.length) return null;
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for(const entry of entries){
    roll -= entry.weight;
    if(roll <= 0) return entry.rarity;
  }
  return entries[entries.length - 1].rarity;
}

/* dropWeight는 등급 확률을 대체하지 않고, 같은 등급 안에서만 보조 가중치로 쓴다. */
function pickFromPoolByDropWeight(pool){
  if(!pool || !pool.length) return null;
  const total = pool.reduce((sum, item) => sum + (item.dropWeight || 1), 0);
  if(total <= 0) return pool[Math.floor(Math.random() * pool.length)];
  let roll = Math.random() * total;
  for(const item of pool){
    roll -= (item.dropWeight || 1);
    if(roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/* 법구/약병처럼 rarity 필드를 가진 후보 배열에서 등급 우선 추첨으로 1개를 뽑는다.
   options.rarity가 있으면 해당 등급으로 고정, options.rarityWeights가 있으면
   context 대신 그 확률표를 우선 사용한다. */
function pickRewardItemByRarity(candidates, options = {}){
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if(!list.length) return null;

  if(options.rarity){
    const fixedPool = list.filter(item => item.rarity === options.rarity);
    return pickFromPoolByDropWeight(fixedPool.length ? fixedPool : list);
  }

  const byRarity = { common: [], uncommon: [], rare: [] };
  const others = [];
  list.forEach(item => {
    if(item && byRarity[item.rarity]) byRarity[item.rarity].push(item);
    else others.push(item);
  });

  const availableRarities = Object.keys(byRarity).filter(r => byRarity[r].length > 0);
  if(!availableRarities.length) return pickFromPoolByDropWeight(others.length ? others : list);

  const rarityWeights = options.rarityWeights || getRewardRarityWeights(options.context || "default");
  const rarity = pickRarityFromWeights(rarityWeights, availableRarities);
  if(!rarity) return pickFromPoolByDropWeight(others.length ? others : list);
  return pickFromPoolByDropWeight(byRarity[rarity]);
}

function isCardRewardEligible(key){
  const card = CARD_DB[key];
  return !!card && !card.excludeFromRewards && !card.generatedOnly &&
    !["starter", "status"].includes(card.rarity) &&
    ["common", "uncommon", "rare"].includes(card.rarity);
}

/* 카드 보상 등급 우선 추첨: 먼저 등급을 뽑고(context 확률표), 그 등급 카드 중
   1장을 dropWeight 보조 가중치로 뽑는다. 후보가 없는 등급은 남은 등급끼리
   재정규화한다. 같은 보상 선택지 안에서는 중복 카드가 나오지 않는다. */
function getWeightedCardRewardKeys(count, sourcePool, options = {}){
  const rarityWeights = getRewardRarityWeights(options.context || "default");
  const rawPool = Array.isArray(sourcePool) ? sourcePool : CARD_REWARD_POOL;
  const pathFilteredPool =
    window.VIBERUN_SPIRIT_PATH_FILTER &&
    typeof window.VIBERUN_SPIRIT_PATH_FILTER.filterCardKeysBySpiritPath === "function"
      ? window.VIBERUN_SPIRIT_PATH_FILTER.filterCardKeysBySpiritPath(rawPool)
      : rawPool;
  const pool = pathFilteredPool.filter(isCardRewardEligible);
  const candidates = [...new Set(pool)];
  const picked = [];
  const amount = Math.max(0, count || 0);
  while(picked.length < amount && candidates.length){
    const byRarity = { common: [], uncommon: [], rare: [] };
    candidates.forEach(key => byRarity[CARD_DB[key].rarity].push(key));
    const availableRarities = Object.keys(byRarity).filter(r => byRarity[r].length > 0);
    const rarity = pickRarityFromWeights(rarityWeights, availableRarities);
    if(!rarity) break;
    const rarityCandidates = byRarity[rarity];
    const total = rarityCandidates.reduce((sum, key) => sum + (CARD_DB[key].dropWeight || 1), 0);
    let roll = Math.random() * total;
    let index = 0;
    for(; index < rarityCandidates.length; index++){
      roll -= (CARD_DB[rarityCandidates[index]].dropWeight || 1);
      if(roll <= 0) break;
    }
    const key = rarityCandidates[Math.min(index, rarityCandidates.length - 1)];
    candidates.splice(candidates.indexOf(key), 1);
    picked.push(key);
  }
  return picked;
}

window.getWeightedCardRewardKeys = getWeightedCardRewardKeys;
window.CARD_RARITY_REWARD_WEIGHT = CARD_RARITY_REWARD_WEIGHT;
window.getRewardRarityWeights = getRewardRarityWeights;
window.pickRarityFromWeights = pickRarityFromWeights;
window.pickRewardItemByRarity = pickRewardItemByRarity;

const HAND_DISCARD_TRACKED_SOURCES = ["turnEnd", "cardEffectDiscard", "potionDiscardChoice"];

function discardCard(key, options={}){
  const card = CARD_DB[key];
  if(!card) return;
  ensureCardInstanceZones();
  const instance = options.instance || createCardInstance(key);
  const trackAsHandDiscard = HAND_DISCARD_TRACKED_SOURCES.includes(options.source);
  if(options.source === "turnEnd") applyHanpuriGrowth(instance, 1, { source:"turnEndDiscard", cardKey:key });
  const sr = LIFE.resolveStatusCardDiscard(card, S.player, options);
  if(sr.handled){
    if(sr.damageAmount) applyDamageWithFeedback(S.player, sr.damageAmount, 0);
    if(sr.message) toast(sr.message);
    if(sr.discard){
      pushDiscardCard(key, instance);
      if(trackAsHandDiscard) S.lastHandDiscardedCard = { key, instance };
    }
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
  if(trackAsHandDiscard) S.lastHandDiscardedCard = { key, instance };
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
  if(S.nextHighCostCardCostDown){
    const pending = S.nextHighCostCardCostDown;
    const currentCost = getHandCardCost(handIndex, key);
    if(currentCost >= pending.minCost){
      setHandCardCostOverride(handIndex, Math.max(pending.minResultCost, currentCost - pending.amount));
      S.nextHighCostCardCostDown = null;
    }
  }
  const cardCost = getHandCardCost(handIndex, key);
  if(S.energy < cardCost){ flashEnergy(); toast("신통력이 부족합니다"); return false; }
  if(card.target==="enemy" && (!targetEnemy || targetEnemy.hp<=0)) return false;

  const heatBeforePlay = getBlessingCount("heat");
  S.energy -= cardCost;
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function"){
    const cardSoundKey = card.type === "attack" ? "cardUseAttack"
      : card.type === "defense" ? "cardUseDefense"
      : "cardUseSkill";
    window.VIBERUN_SOUND.play(cardSoundKey);
  }
  if(card.type === "attack"){
    applyPreAttackCardGimmicks(targetEnemy);
  }
  if(card.type !== "status" && typeof triggerPlayerBattleMotion === "function") triggerPlayerBattleMotion("attack");
  const relicCardContext = { cardUid:cardInstance.uid, cardKey:key, card, handIndex, target:targetEnemy, bonusDamage:0 };
  S.spellTypesPlayedThisTurn = S.spellTypesPlayedThisTurn || {};
  S.spellTypesPlayedThisTurn[card.type] = true;
  applyRelicTrigger("onNthSpellPlayedEachTurn", relicCardContext);
  applyRelicTrigger("onSpellTypeSetCompleted", relicCardContext);
  if(card.type === "attack") applyRelicTrigger("onFirstPurifySpellEachBattle", relicCardContext);
  if(key === "bell_strike") applyRelicTrigger("onBellStrikePurify", relicCardContext);
  const relicDamageBonus = relicCardContext.bonusDamage || 0;
  // 귀문부(nextAttackDouble)는 이 주문 1장이 처리되는 동안에만 유효해야 하며,
  // 광역 공격에서 첫 대상에게만 소모되지 않도록 카드 단위로 한 번만 캡처해 모든 피해 계산에 동일 배율을 적용한다.
  const cardAttackMultiplier = (card.type === "attack") ? (S.nextAttackMultiplier || null) : null;
  if(cardAttackMultiplier) S.nextAttackMultiplier = null;
  const applyCardAttackMultiplier = amount => cardAttackMultiplier ? Math.floor(amount * cardAttackMultiplier) : amount;

  for(const e of card.fx){
    switch(e.t){
      case "damage": {
        const gutpanBonus = e.gutpanBonus ? getBlessingCount(e.gutpanBonus) * (Number.isFinite(e.gutpanBonusMultiplier) ? e.gutpanBonusMultiplier : 1) : 0;
        const bellBonus = key === "bell_strike" ? (S.bellStrikePurifyBonusThisTurn || 0) : 0;
        applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(getGrowthAdjustedValue(cardInstance, e) + relicDamageBonus + gutpanBonus + bellBonus, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "bonusLowHpDamage":
        if(targetEnemy && targetEnemy.hp>0 && targetEnemy.hp<=Math.ceil(targetEnemy.maxHp/2))
          applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(e.v, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      case "damageAll":
        livingEnemies().forEach(en => applyDamageWithFeedback(en, applyCardAttackMultiplier(getPlayerAttackDamage(getGrowthAdjustedValue(cardInstance, e) + relicDamageBonus, en)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" })); break;
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
        applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(Math.floor((S.player.block || 0) * e.v), targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }); break;
      case "damageByBlockRatioConsume": {
        const currentBlock = Number.isFinite(S.player.block) ? Math.max(0, S.player.block) : 0;
        const ratio = Number.isFinite(e.v) ? e.v : 0;
        const damage = Math.floor(currentBlock * ratio);
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(damage, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        const consumeRatio = Number.isFinite(e.consumeRatio) ? e.consumeRatio : 1;
        const consumed = Math.ceil(currentBlock * consumeRatio);
        S.player.block = Math.max(0, currentBlock - consumed);
        if(currentBlock >= 15 && consumed >= currentBlock && S.player.block === 0){
          applyRelicTrigger("onBarrierFullyConsumed", { beforeBlock:currentBlock, consumed, cardKey:key });
        }
        break;
      }
      case "damageByBlockGainedThisTurn":
        applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(Math.floor((S.blockGainedThisTurn || 0) * e.v), targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }); break;
      case "damageByWeak": {
        const weak = targetEnemy ? Math.max(0, targetEnemy.weak || 0) : 0;
        const amount = Math.floor((e.base || 0) + weak * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(amount, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "damageByRecollection": {
        const recollection = targetEnemy ? Math.max(0, getStatus(targetEnemy, "recollection")) : 0;
        const amount = Math.floor((e.base || 0) + recollection * (e.per || 0));
        if(targetEnemy) applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(amount, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      }
      case "consumeAllAgitationDamage": {
        if(targetEnemy){
          const agitation = Math.max(0, getStatus(targetEnemy, "agitation"));
          const amount = Math.floor((e.base || 0) + agitation * (e.per || 0));
          setStatus(targetEnemy, "agitation", 0);
          applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(amount, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
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
          livingEnemies().forEach(en => applyDamageWithFeedback(en, applyCardAttackMultiplier(getPlayerAttackDamage(e.v || 0, en)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }));
        }
        break;
      case "ifRecollectionAtLeastDamageAll":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)){
          livingEnemies().forEach(en => applyDamageWithFeedback(en, applyCardAttackMultiplier(getPlayerAttackDamage(e.v || 0, en)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" }));
        }
        break;
      case "ifRecollectionAtLeastApplyRecollectionAll":
        if(targetEnemy && getStatus(targetEnemy, "recollection") >= (e.threshold || 0)){
          livingEnemies().forEach(en => { if(en !== targetEnemy) addStatus(en, "recollection", e.v || 1); });
        }
        break;
      case "ifHanpuriRecoveredDamage":
        if(S.hanpuriRecoveredThisTurn && targetEnemy){
          applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(e.v || 0, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
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
        const healValue = typeof scaleEndlessPlayerHeal === "function" ? scaleEndlessPlayerHeal(e.v) : e.v;
        const healed = LIFE.heal(S.player, healValue);
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
          applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(e.v, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
        break;
      case "consumeAllMarksDamage":
        if(targetEnemy){
          const marks = getStatus(targetEnemy, "mark");
          const amount = (e.base || 0) + relicDamageBonus + marks * (e.per || 0);
          setStatus(targetEnemy, "mark", 0);
          applyRelicTrigger("onMarksConsumed", { target:targetEnemy, consumed:marks });
          applyDamageWithFeedback(targetEnemy, applyCardAttackMultiplier(getPlayerAttackDamage(amount, targetEnemy)), S.player.weak, { source:"card", cardKey:key, damageKind:"purification" });
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
  if(S.nextCardTemporaryCopy && !card.unplayable && card.rarity !== "status"){
    const pending = S.nextCardTemporaryCopy;
    S.nextCardTemporaryCopy = null;
    const beforeLen = S.hand.length;
    createCardToHand(key, pending.count || 1);
    for(let i = beforeLen; i < S.hand.length; i++){
      const copyInstance = S.handInstances[i];
      if(copyInstance){
        copyInstance.runtime = copyInstance.runtime || {};
        copyInstance.runtime.temporaryCopy = true;
        copyInstance.runtime.exhaustOnTurnEnd = !!pending.exhaustAtTurnEnd;
      }
      if(pending.keepOriginalCost) setHandCardCostOverride(i, card.cost || 0);
    }
  }
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

/* 개발 전용 콘솔 검증 함수. 실제 유저 UI에는 노출되지 않으며, 콘솔에서 직접
   호출해 등급 우선 추첨이 의도한 확률에 수렴하는지 확인하는 용도다.
   예) BOHYUN_DEV_SIMULATE_REWARD_RARITY("card", "battle", 10000)
   예) BOHYUN_DEV_SIMULATE_REWARD_RARITY("potion", "elite", 10000) */
function BOHYUN_DEV_SIMULATE_REWARD_RARITY(kind, context, trials = 10000){
  const counts = { common:0, uncommon:0, rare:0, none:0 };
  for(let i = 0; i < trials; i++){
    let rarity = null;
    if(kind === "card"){
      const keys = getWeightedCardRewardKeys(1, typeof CARD_REWARD_POOL !== "undefined" ? CARD_REWARD_POOL : [], { context });
      rarity = keys[0] ? CARD_DB[keys[0]].rarity : null;
    } else if(kind === "potion"){
      const db = typeof POTION_DB !== "undefined" ? POTION_DB : [];
      const item = pickRewardItemByRarity(db, { context });
      rarity = item ? item.rarity : null;
    } else if(kind === "relic"){
      const db = typeof RELIC_DB !== "undefined" ? RELIC_DB : [];
      const item = pickRewardItemByRarity(db, { context });
      rarity = item ? item.rarity : null;
    }
    counts[rarity || "none"] += 1;
  }
  const pct = key => ((counts[key] / trials) * 100).toFixed(1) + "%";
  console.log("[BOHYUN][RewardRaritySim] kind=" + kind + " context=" + context + " trials=" + trials,
    { common:pct("common"), uncommon:pct("uncommon"), rare:pct("rare"), none:pct("none") });
  return counts;
}
window.BOHYUN_DEV_SIMULATE_REWARD_RARITY = BOHYUN_DEV_SIMULATE_REWARD_RARITY;

function applyDamageWithFeedback(target, rawDamage, attackerWeak, options={}){
  const beforeHp = target ? target.hp || 0 : 0;
  const beforeBlock = target ? target.block || 0 : 0;
  const beforeRecollection = target && target !== S.player ? getStatus(target, "recollection") : 0;
  const damageContext = { target, rawDamage, attackerWeak };
  if(target === S.player) applyRelicTrigger("beforePlayerHpDamage", damageContext);
  const result = (options.pierceRatio > 0 && typeof LIFE.applyPiercingDamage === "function")
    ? LIFE.applyPiercingDamage(target, damageContext.rawDamage, attackerWeak, options.pierceRatio)
    : LIFE.applyDamage(target, damageContext.rawDamage, attackerWeak);
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
    if((result.hpLoss || 0) > 0){
      if(typeof triggerPlayerBattleMotion === "function") triggerPlayerBattleMotion("damage");
    } else if((result.absorbed || 0) > 0){
      if(typeof triggerPlayerBattleMotion === "function") triggerPlayerBattleMotion("block");
    }
    if(result.hpLoss > 0){
      if(S && S.scoreRuntime){
        S.scoreRuntime.hpLoss = (S.scoreRuntime.hpLoss || 0) + result.hpLoss;
      }
      applyRelicTrigger("onPlayerHpDamage", { hpLoss:result.hpLoss, result });
    }
  }
  return result;
}
