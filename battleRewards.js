"use strict";
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

/* ── 무작위 주문/법구/약병 획득·제거 결과 팝업 (공통) ─────────────────────────
   신령의 은혜 / 이벤트 / 전투 중 법구 발동 등 무작위 처리 결과를 플레이어가
   인지할 수 있도록 이름과 에셋을 보여주는 확인 팝업이다. 선택 획득/선택
   제거 UI(카드 보상 선택, 약병 선택 등)에는 사용하지 않는다. */
function randomItemResultIconHtml(icon, name){
  if(typeof icon === "string" && icon.indexOf("assets/") === 0){
    return '<img src="' + escapeHtml(icon) + '" alt="' + escapeHtml(name || "") + '">';
  }
  return escapeHtml(icon || "?");
}

function randomItemResultCardHtml(item){
  const icon = item.icon || (item.type === "relic" ? "🏺" : item.type === "potion" ? "🧪" : "?");
  const name = item.name || "";
  const actionText = item.action === "remove" ? "제거됨" : "획득";
  return (
    '<div class="random-item-result-card ' + escapeHtml(item.action || "gain") + '">' +
      '<div class="random-item-result-icon">' + randomItemResultIconHtml(icon, name) + '</div>' +
      '<div class="random-item-result-name">' + escapeHtml(name) + '</div>' +
      '<div class="random-item-result-tag">' + escapeHtml(actionText) + '</div>' +
    '</div>'
  );
}

function ensureRandomItemResultPopupStyle(){
  if(document.querySelector("#randomItemResultPopupStyle")) return;
  const style = document.createElement("style");
  style.id = "randomItemResultPopupStyle";
  style.textContent =
    '#randomItemResultPopup{' +
      'position:absolute;inset:0;z-index:320;display:none;align-items:center;justify-content:center;' +
      'background:rgba(24,18,12,.42);pointer-events:auto;' +
    '}' +
    '#randomItemResultPopup.show{display:flex;}' +
    '#randomItemResultPopup .random-item-result-box{' +
      'width:min(64cqw,760px);max-height:82cqh;padding:2.6cqh 2.6cqw;' +
      'border-radius:2cqh;border:.22cqh solid rgba(183,146,82,.72);' +
      'background:linear-gradient(180deg,rgba(255,250,235,.98),rgba(239,224,193,.98));' +
      'box-shadow:0 1.2cqh 3cqh rgba(0,0,0,.38);' +
      'display:flex;flex-direction:column;align-items:center;gap:1.8cqh;' +
      'overflow-y:auto;' +
    '}' +
    '#randomItemResultPopup .random-item-result-title{' +
      'font-size:2.6cqh;font-weight:900;color:#3b2818;text-align:center;' +
    '}' +
    '#randomItemResultPopup .random-item-result-message{' +
      'font-size:1.55cqh;font-weight:800;color:#6a4a2d;text-align:center;' +
    '}' +
    '#randomItemResultPopup .random-item-result-list{' +
      'display:flex;flex-wrap:wrap;justify-content:center;gap:1.4cqh;max-width:100%;' +
    '}' +
    '#randomItemResultPopup .random-item-result-card{' +
      'width:13cqh;min-height:15cqh;padding:1.1cqh;border-radius:1.4cqh;' +
      'border:.18cqh solid rgba(174,137,80,.55);background:rgba(255,253,244,.86);' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.8cqh;' +
      'box-shadow:0 .45cqh 1.2cqh rgba(65,45,25,.16);' +
    '}' +
    '#randomItemResultPopup .random-item-result-icon{' +
      'width:7.5cqh;height:7.5cqh;display:flex;align-items:center;justify-content:center;' +
      'font-size:5.4cqh;line-height:1;' +
    '}' +
    '#randomItemResultPopup .random-item-result-icon img{' +
      'width:100%;height:100%;object-fit:contain;display:block;' +
    '}' +
    '#randomItemResultPopup .random-item-result-name{' +
      'font-size:1.35cqh;font-weight:900;color:#332115;text-align:center;line-height:1.25;' +
    '}' +
    '#randomItemResultPopup .random-item-result-tag{' +
      'font-size:1.1cqh;font-weight:900;color:#8a5c2b;text-align:center;' +
    '}' +
    '#randomItemResultPopup .random-item-result-card.remove .random-item-result-tag{color:#a3402f;}' +
    '#randomItemResultPopup .random-item-result-ok{' +
      'margin-top:.8cqh;min-width:12cqw;padding:1.1cqh 2.4cqw;border-radius:999px;' +
      'border:.18cqh solid rgba(132,91,45,.55);background:linear-gradient(180deg,#f8dfa6,#c8913d);' +
      'font-size:1.55cqh;font-weight:900;color:#2d1d10;cursor:pointer;' +
    '}';
  document.head.appendChild(style);
}

let randomItemResultPopupEl = null;

function ensureRandomItemResultPopup(){
  ensureRandomItemResultPopupStyle();
  if(randomItemResultPopupEl) return randomItemResultPopupEl;

  const popup = document.createElement("div");
  popup.id = "randomItemResultPopup";
  popup.setAttribute("aria-hidden", "true");
  popup.innerHTML =
    '<div class="random-item-result-box" role="dialog" aria-modal="true">' +
      '<div class="random-item-result-title"></div>' +
      '<div class="random-item-result-message"></div>' +
      '<div class="random-item-result-list"></div>' +
      '<button type="button" class="random-item-result-ok">확인</button>' +
    '</div>';

  (document.querySelector("#game") || document.body).appendChild(popup);
  randomItemResultPopupEl = popup;
  return popup;
}

function openRandomItemResultPopup(options = {}){
  const items = Array.isArray(options.items) ? options.items.filter(Boolean) : [];
  if(!items.length) return Promise.resolve();

  const popup = ensureRandomItemResultPopup();

  popup.querySelector(".random-item-result-title").textContent = options.title || "결과 확인";
  popup.querySelector(".random-item-result-message").textContent = options.message || "";

  const list = popup.querySelector(".random-item-result-list");
  list.innerHTML = items.map(randomItemResultCardHtml).join("");

  const okButton = popup.querySelector(".random-item-result-ok");
  okButton.textContent = options.confirmText || "확인";

  popup.classList.add("show");
  popup.setAttribute("aria-hidden", "false");

  return new Promise(resolve => {
    okButton.onclick = () => {
      popup.classList.remove("show");
      popup.setAttribute("aria-hidden", "true");
      resolve();
    };
  });
}

window.OPEN_RANDOM_ITEM_RESULT_POPUP = openRandomItemResultPopup;
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
  if(typeof window.OPEN_RANDOM_ITEM_RESULT_POPUP === "function"){
    window.OPEN_RANDOM_ITEM_RESULT_POPUP({
      title: "법구 획득",
      items: [{
        type: "relic", action: "gain", key: relic.id, name: relic.name,
        icon: relic.iconImage || relic.icon || relic.emoji || "🏺"
      }]
    });
  }
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

