"use strict";
/* =========================================================================
   battleRewards 로직 레이어 — 보상 계산/지급, 상태 변경, 흐름 제어.
   DOM 렌더링(팝업/오버레이 그리기)은 battleRewardsUI.js로 분리되어 있으며
   이 파일은 함수 이름으로만 그 UI 함수들을 호출한다(같은 전역 스코프).
   유니티 이식 시 이 파일의 계산/상태 로직은 C#으로 그대로 옮길 수 있다.
   ========================================================================= */

/* =========================================================================
   노드 클리어 – 패키지 전체 몬스터 전멸 시 1회만 실행 (기획서 §10)
   ========================================================================= */
function nodeClear(){
  if(S.encounterCleared) return;
  S.encounterCleared = true;

  const nodeType = S.battleNodeType || "enemy";
  recordBattleClear(nodeType);

  if(typeof recordBattleScoreFromCombat === "function"){
    recordBattleScoreFromCombat(nodeType);
  }

  applyRelicTrigger("battleEnd");
  // ACT 확장 이후 보스도 다른 스테이지와 동일하게 승리 보상을 먼저 받는다(기획서 §10).
  // 골드는 보상 UI의 "복채" 슬롯이 지급하므로 여기서 별도로 지급하지 않는다.
  openBattleVictoryReward();
}

/* =========================================================================
   보상
   ========================================================================= */
function getRandomRewardKeys(count, context){
  const resolvedContext = context || (S && S.battleNodeType === "elite" ? "elite" : "battle");
  const delta = typeof getEndlessCardRewardChoiceDelta === "function" ? getEndlessCardRewardChoiceDelta() : 0;
  const finalCount = Math.max(1, count + delta);
  return getWeightedCardRewardKeys(finalCount, undefined, { context: resolvedContext });
}

let cardRewardPickMode = null;

function openCardReward(){
  S.busy = true; S.rewardOpen = true;
  renderRewardOverlay(getRandomRewardKeys(3));
  updateEndBtn();
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function"){
    window.VIBERUN_SOUND.play("rewardOpen");
  }
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmReward");
  }
}

function openBattleVictoryReward(){
  S.busy = true; S.rewardOpen = true;
  renderBattleVictoryOverlay();
  updateEndBtn();
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function"){
    window.VIBERUN_SOUND.play("battleVictory");
  }
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.playBgm === "function"){
    window.VIBERUN_SOUND.playBgm("bgmReward");
  }
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
  const amount = getBalanceBattleGold(S && S.battleNodeType);
  return typeof scaleEndlessBattleGold === "function" ? scaleEndlessBattleGold(amount) : amount;
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
    rewards.push({ id:"card", name:"주문 보상", icon:"札", value:"1개 선택", doneText:"선택 완료" });
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

let selectedRewardCardKey = null;

/* 카드를 탭/클릭하면 즉시 지급하지 않고 "선택" 상태만 표시한다.
   실제 지급은 confirmRewardCard()(하단 "받기" 버튼)에서만 처리한다. */
function selectRewardCard(key){
  selectedRewardCardKey = key;
  const ov = document.querySelector("#cardRewardOverlay");
  if(!ov) return;
  ov.querySelectorAll(".reward-card").forEach(btn =>
    btn.classList.toggle("selected", btn.dataset.card === key)
  );
  updateRewardConfirmButton(ov);
}

function confirmRewardCard(){
  if(!selectedRewardCardKey) return;
  const key = selectedRewardCardKey;
  if(cardRewardPickMode){
    resolveCardRewardPick(key);
    return;
  }
  if(!S || !S.rewardOpen) return;
  const card = CARD_DB[key];
  if(!card) return;
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") window.VIBERUN_SOUND.play("rewardPick");
  addPermanentCard(key, { source:"battleReward" });
  if(S.victoryCardRewardOpen){
    finishBattleVictoryCardReward();
    return;
  }
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
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

function getBattleVictoryRewards(){
  if(!S.victoryRewards){
    S.victoryRewards = createBattleVictoryBaseRewards();
    if(!S.battleSuppressOptionalRewards){
      const isEliteStage = S && S.battleNodeType === "elite";
      const relicChance = isEliteStage ? 1 : BATTLE_VICTORY_RELIC_CHANCE;             // 엘리트 → 유물 확정 지급 (기획서 §10)
      const relicReward = buildBattleVictoryOptionalReward("relic", relicChance);
      const potionReward = buildBattleVictoryOptionalReward("potion", getBattleVictoryPotionChance());
      if(relicReward) S.victoryRewards.push(relicReward);
      if(potionReward) S.victoryRewards.push(potionReward);
    }
  }
  return S.victoryRewards;
}

function buildBattleVictoryOptionalReward(type, chance){
  if(Math.random() >= chance) return null;
  const isEliteStage = S && S.battleNodeType === "elite";
  const rewardContext = isEliteStage ? "elite" : "battle";
  if(type === "relic"){
    const relicSource = isEliteStage ? (S.battleVictoryRelicSource || "elite") : "battle";
    const relicCandidates = typeof window.getRelicCandidatesBySource === "function"
      ? window.getRelicCandidatesBySource(relicSource)
      : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
    const relic = pickRewardItemByRarity(relicCandidates, { context:rewardContext });
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
    const potion = pickRewardItemByRarity(potionDb, { context:rewardContext });
    if(!potion) return null;
    return {
      id:"potion", itemId:potion.id, name:potion.name, icon:potion.iconImage || potion.icon || potion.emoji || "藥",
      iconImage:potion.iconImage || "",
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
  const floor = (stage && Number.isFinite(stage.floor) && typeof formatDisplayAreaByFloorIndex === "function")
    ? formatDisplayAreaByFloorIndex(stage.floor)
    : (typeof formatCurrentDisplayArea === "function" ? formatCurrentDisplayArea() : "1구역");
  return {
    floor,
    turn: "TURN " + (S.turn || 1),
  };
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

function onBattleVictoryNextClick(){
  if(!areBattleVictoryRewardsDone()){
    openBattleVictoryLeaveConfirm();
    return;
  }
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  if(S.battleNodeType === "boss"){ endGame("win"); return; }
  proceedToMap();
}

function onBattleVictoryLeaveConfirmed(){
  closeBattleVictoryLeaveConfirm();
  S.rewardOpen = false; S.busy = false;
  closeRewardOverlay();
  if(S.battleNodeType === "boss"){ endGame("win"); return; }
  proceedToMap();
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
    if(desc) desc.innerHTML = colorizeRarityLabels(escapeHtml(cardRewardPickMode.desc));
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
  mode.resolve(key);
}

window.OPEN_CARD_REWARD_PICK = openCardRewardPick;
