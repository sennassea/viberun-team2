"use strict";
/* =========================================================================
   이벤트 노드 화면 (eventNode.js)
   기획서: ACT1 이벤트 세부 기획서 밸런스조정안 / 이벤트 데이터 입력 1차 개발 지시서

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

const EVENT_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];
const EVENT_BALANCE = window.BOHYUN_BALANCE || {};
const EVENT_RELIC_FALLBACK_GOLD = EVENT_BALANCE.eventRelicFallbackGold || 70;
const EVENT_CHOICE_ICONS = ["❤️", "🔍", "🌙", "✨"];

let eventOverlayEl = null;
let eventState = null; // { event, step, resultDetails, cardCandidates, cardSelected }

/* 이벤트 중 "여정 보기"에서 다음 노드 선택을 막기 위한 임시 함수 백업 */
let eventMapStartStageBackup = null;
let eventMapCloseMapBackup = null;

/* ── 진입점 (cheatEvent.js의 CHEAT.event.open()이 호출) ─────────────────── */
function openEventNode(eventId){
  const ev = (window.EVENT_DB || []).find(e => e.id === eventId);
  if(!ev){
    console.warn("[eventNode] 이벤트를 찾을 수 없습니다: " + eventId);
    return;
  }
  ensureEventOverlay();
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
}

function getEventAutoChoice(ev){
  if(!ev || ev.type !== "combat") return null;
  const choices = Array.isArray(ev.choices) ? ev.choices : [];
  return choices.find(choice => choice && choice.id === "AUTO") || null;
}

function closeEventOverlayOnly(){
  if(!eventOverlayEl) return;
  eventOverlayEl.classList.remove("show");
  eventOverlayEl.setAttribute("aria-hidden", "true");
  showEventChrome();
}

/* 이벤트 종료 → 맵으로 복귀 (기도터/상점과 동일 패턴) */
function finishEventNode(){
  restoreEventMapOverrides();
  closeEventOverlayOnly();
  eventState = null;
  if(typeof renderHud === "function" && typeof S !== "undefined" && S) renderHud();
  if(window.MAP_STATE) window.MAP_STATE.proceedMode = true;
  if(typeof openMap === "function") openMap();
}

function hideEventChrome(){
  EVENT_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.eventPrevDisplay === undefined) el.dataset.eventPrevDisplay = el.style.display || "";
      el.style.display = "none";
    });
  });
}

function showEventChrome(){
  EVENT_HIDE_SELECTORS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      if(el.dataset.eventPrevDisplay !== undefined){
        el.style.display = el.dataset.eventPrevDisplay;
        delete el.dataset.eventPrevDisplay;
      }
    });
  });
}

/* ── DOM 뼈대 ────────────────────────────────────────────────────────────── */
function ensureEventOverlay(){
  if(eventOverlayEl) return eventOverlayEl;

  const overlay = document.createElement("div");
  overlay.id = "eventOverlay";
  overlay.className = "event-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = eventShellHtml();

  overlay.addEventListener("click", onEventOverlayClick);

  (document.querySelector("#game") || document.body).appendChild(overlay);
  eventOverlayEl = overlay;
  return overlay;
}

function eventShellHtml(){
  return (
    '<div class="event-topbar">' +
      '<div class="event-player-card">' +
        '<div class="event-portrait" id="eventPortrait">👼</div>' +
        '<div class="event-player-body">' +
          '<div class="event-player-name"><b id="eventName"></b></div>' +
          '<div class="event-hp-row"><span>정신력</span><span id="eventHpText"></span></div>' +
          '<div class="event-hp-bar"><div class="event-hp-fill" id="eventHpFill"></div></div>' +
          '<div class="event-resource-row">' +
            '<span class="event-resource">🏺<b id="eventRelicCount">0</b></span>' +
            '<span class="event-resource">🧪<b id="eventPotionCount">0</b></span>' +
            '<span class="event-resource">🪙<b id="eventGold">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="event-topbar-spacer"></div>' +
      '<div class="event-menu" aria-label="이벤트 중 공통 메뉴">' +
        '<button type="button" class="event-menu-btn" id="eventMapBtn"><span class="ico">🗺️</span><span>여정</span></button>' +
        '<button type="button" class="event-menu-btn" id="eventDeckBtn"><span class="ico">📖</span><span>보유 의식</span></button>' +
        '<button type="button" class="event-menu-btn" id="eventBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="event-menu-btn" id="eventSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="event-stage">' +
      '<div class="event-panel-wrap">' +
        '<div class="event-body" id="eventBody"></div>' +
      '</div>' +
    '</div>'
  );
}

function onEventOverlayClick(e){
  const choiceBtn = e.target.closest(".event-choice");
  if(choiceBtn && !choiceBtn.disabled){
    selectEventChoice(choiceBtn.dataset.choiceId);
    return;
  }
  const cardBtn = e.target.closest(".event-card[data-key]");
  if(cardBtn){
    selectEventCard(cardBtn.dataset.key);
    return;
  }
  const potionBtn = e.target.closest(".event-card[data-potion-id]");
  if(potionBtn){
    selectEventPotion(potionBtn.dataset.potionId);
    return;
  }
  if(e.target.closest("#eventCardConfirm")){ confirmEventCard(); return; }
  if(e.target.closest("#eventCardSkip")){ skipEventCard(); return; }
  if(e.target.closest("#eventPotionConfirm")){ confirmEventPotion(); return; }
  if(e.target.closest("#eventPotionSkip")){ skipEventPotion(); return; }
  if(e.target.closest("#eventResultConfirm")){ finishEventNode(); return; }
  if(e.target.closest("#eventMapBtn")){ openEventMapPreview(); return; }
  if(e.target.closest("#eventDeckBtn")){ openEventDeckPreview(); return; }
  if(e.target.closest("#eventBagBtn")){ openEventBagPreview(); return; }
  if(e.target.closest("#eventSettingsBtn")){ openEventSettingsPreview(); return; }
}

/* ── 우상단 공통 메뉴 (여정/보유주문/가방/설정) ────────────────────────────
   여정은 열람만 가능하다. 이벤트 선택 전에는 다음 노드로 진행할 수 없도록
   startStage()/closeMap()을 이벤트가 여정을 보여주는 동안만 임시로 감싼다. */
function openEventMapPreview(){
  if(typeof openMap !== "function"){
    if(typeof toast === "function") toast("여정을 열 수 없습니다.");
    return;
  }
  if(eventMapStartStageBackup === null && typeof startStage === "function"){
    eventMapStartStageBackup = startStage;
    startStage = function eventBlockedStartStage(){
      if(typeof toast === "function") toast("이벤트를 먼저 선택해 주세요.");
    };
  }
  if(eventMapCloseMapBackup === null && typeof closeMap === "function"){
    eventMapCloseMapBackup = closeMap;
    closeMap = function eventWrappedCloseMap(){
      eventMapCloseMapBackup();
      restoreEventMapOverrides();
    };
  }
  openMap();
}

function restoreEventMapOverrides(){
  if(eventMapStartStageBackup !== null){ startStage = eventMapStartStageBackup; eventMapStartStageBackup = null; }
  if(eventMapCloseMapBackup !== null){ closeMap = eventMapCloseMapBackup; eventMapCloseMapBackup = null; }
}

function openEventDeckPreview(){
  const deckBtn = document.getElementById("deckViewerButton");
  if(deckBtn){ deckBtn.click(); return; }
  if(typeof toast === "function") toast("보유 의식 확인 기능을 불러올 수 없습니다.");
}

function openEventBagPreview(){
  if(typeof window.BAG_UI_OPEN === "function"){ window.BAG_UI_OPEN(); return; }
  if(typeof toast === "function") toast("가방 확인 기능을 불러올 수 없습니다.");
}

function openEventSettingsPreview(){
  alert("설정 기능은 준비 중입니다.");
}

/* ── 렌더링 ──────────────────────────────────────────────────────────────── */
function renderEventOverlay(){
  if(!eventOverlayEl || !eventState) return;
  renderEventHeader();
  const body = eventOverlayEl.querySelector("#eventBody");
  if(!body) return;
  if(eventState.step === "cardPick") body.innerHTML = eventCardPickHtml();
  else if(eventState.step === "potionPick") body.innerHTML = eventPotionPickHtml();
  else if(eventState.step === "result") body.innerHTML = eventResultHtml();
  else body.innerHTML = eventChoicesHtml();
}

function renderEventHeader(){
  const overlay = eventOverlayEl;
  const player = (typeof S !== "undefined" && S && S.player) ? S.player : null;
  if(!player){
    overlay.querySelector("#eventName").textContent = "";
    overlay.querySelector("#eventHpText").textContent = "";
    return;
  }
  overlay.querySelector("#eventPortrait").textContent = player.emoji || "👼";
  overlay.querySelector("#eventName").textContent = player.name || "";
  overlay.querySelector("#eventHpText").textContent = player.hp + "/" + player.maxHp;
  const pct = player.maxHp ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  overlay.querySelector("#eventHpFill").style.width = pct + "%";

  const count = typeof resourceCount === "function" ? resourceCount : (v => Array.isArray(v) ? v.length : (v || 0));
  const s = (typeof S !== "undefined" && S) ? S : { relics: [], potions: [], gold: 0 };
  overlay.querySelector("#eventRelicCount").textContent = count(s.relics);
  overlay.querySelector("#eventPotionCount").textContent = count(s.potions);
  overlay.querySelector("#eventGold").textContent = s.gold || 0;
}

function escapeEventHtml(str){
  return String(str == null ? "" : str).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function eventChoicesHtml(){
  const ev = eventState.event;
  const storyHtml = (ev.story || []).map(line => "<p>" + escapeEventHtml(line) + "</p>").join("");
  const choicesHtml = (ev.choices || []).map((choice, idx) => eventChoiceRowHtml(choice, idx)).join("");
  return (
    '<div class="event-panel">' +
      '<div class="event-kicker">이벤트</div>' +
      '<div class="event-title">' + escapeEventHtml(ev.title || "") + '</div>' +
      '<div class="event-story">' + storyHtml + '</div>' +
      '<div class="event-choices">' + choicesHtml + '</div>' +
    '</div>'
  );
}

function eventChoiceRowHtml(choice, idx){
  const icon = EVENT_CHOICE_ICONS[idx] || "❓";
  const outcomes = Array.isArray(choice.outcomes) ? choice.outcomes : [];
  const disabledReason = getEventChoiceDisabledReason(choice);
  const lockHtml = disabledReason
    ? '<div class="event-choice-lock">' + escapeEventHtml(disabledReason) + '</div>'
    : '';
  const outcomesHtml = outcomes.length
    ? '<div class="event-outcomes">' + outcomes.map(eventOutcomeChipHtml).join("") + '</div>'
    : '';
  return (
    '<button type="button" class="event-choice' + (disabledReason ? ' disabled' : '') + '" data-choice-id="' + escapeEventHtml(choice.id) + '"' +
      (disabledReason ? ' disabled aria-disabled="true" title="' + escapeEventHtml(disabledReason) + '"' : '') + '>' +
      '<div class="event-choice-icon">' + icon + '</div>' +
      '<div class="event-choice-body">' +
        '<div class="event-choice-label">' + escapeEventHtml(choice.label || "") + '</div>' +
        '<div class="event-choice-desc">' + escapeEventHtml(choice.desc || "") + '</div>' +
        lockHtml +
      '</div>' +
      outcomesHtml +
    '</button>'
  );
}

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

function eventOutcomeChipHtml(outcome){
  const kind = outcome.kind === "positive" ? "positive" : (outcome.kind === "negative" ? "negative" : "neutral");
  const symbol = kind === "positive" ? "✦" : (kind === "negative" ? "⊖" : "◇");
  const chance = typeof outcome.chance === "number" ? " (확률 " + outcome.chance + "%)" : "";
  return '<span class="event-outcome-chip ' + kind + '">' + symbol + ' ' + escapeEventHtml(outcome.text || "") + chance + '</span>';
}

function eventResultHtml(){
  const rows = (eventState.resultDetails || []).map(detail =>
    '<div class="event-result-row ' + (detail.kind || "neutral") + '">' + escapeEventHtml(detail.text) + '</div>'
  ).join("");
  return (
    '<div class="event-panel event-panel-result">' +
      '<div class="event-title">결과</div>' +
      '<div class="event-result-list">' +
        (rows || '<div class="event-result-row neutral">특별한 일이 일어나지 않았습니다.</div>') +
      '</div>' +
      '<div class="event-actions">' +
        '<button type="button" class="event-btn event-btn-confirm" id="eventResultConfirm">확인</button>' +
      '</div>' +
    '</div>'
  );
}

function eventCardPickHtml(){
  const cards = (eventState.cardCandidates || []).map(eventCardHtml).join("");
  return (
    '<div class="event-panel event-panel-cardpick">' +
      '<div class="event-title">의식 보상</div>' +
      '<div class="event-guide">추가할 의식 1장을 선택하세요.</div>' +
      '<div class="event-cards">' + cards + '</div>' +
      '<div class="event-actions">' +
        '<button type="button" class="event-btn event-btn-skip" id="eventCardSkip">건너뛰기</button>' +
        '<button type="button" class="event-btn event-btn-confirm" id="eventCardConfirm"' +
          (eventState.cardSelected ? '' : ' disabled') + '>선택 완료</button>' +
      '</div>' +
    '</div>'
  );
}

function eventCardHtml(key){
  const c = (typeof CARD_DB !== "undefined" && CARD_DB[key]) || null;
  if(!c) return "";
  const label = typeof typeLabel === "function" ? typeLabel(c.type) : c.type;
  const selected = eventState.cardSelected === key ? " selected" : "";
  if(typeof cardFaceHtml === "function"){
    return (
      '<button type="button" class="event-card event-card-frame card-frame-card cost-' + escapeEventHtml(c.type) + selected + '" data-key="' + escapeEventHtml(key) + '">' +
        cardFaceHtml(c) +
      '</button>'
    );
  }
  return (
    '<button type="button" class="event-card' + selected + '" data-key="' + key + '">' +
      '<div class="event-card-cost">' + c.cost + '</div>' +
      '<div class="event-card-name">' + escapeEventHtml(c.name) + '</div>' +
      '<div class="event-card-art">' + escapeEventHtml(c.emoji) + '</div>' +
      '<div class="event-card-type ' + c.type + '">' + escapeEventHtml(label) + '</div>' +
      '<div class="event-card-desc">' + escapeEventHtml(c.desc) + '</div>' +
    '</button>'
  );
}

function eventPotionPickHtml(){
  const potions = (eventState.potionCandidates || []).map(eventPotionHtml).join("");
  return (
    '<div class="event-panel event-panel-cardpick">' +
      '<div class="event-title">약병 선택</div>' +
      '<div class="event-guide">받을 약병 1개를 선택하세요.</div>' +
      '<div class="event-cards">' + potions + '</div>' +
      '<div class="event-actions">' +
        '<button type="button" class="event-btn event-btn-skip" id="eventPotionSkip">건너뛰기</button>' +
        '<button type="button" class="event-btn event-btn-confirm" id="eventPotionConfirm"' +
          (eventState.potionSelected ? '' : ' disabled') + '>선택 완료</button>' +
      '</div>' +
    '</div>'
  );
}

function eventPotionHtml(potion){
  if(!potion) return "";
  const selected = eventState.potionSelected === potion.id ? " selected" : "";
  return (
    '<button type="button" class="event-card' + selected + '" data-potion-id="' + escapeEventHtml(potion.id) + '">' +
      '<div class="event-card-art">' + escapeEventHtml(potion.emoji || "🧪") + '</div>' +
      '<div class="event-card-name">' + escapeEventHtml(potion.name) + '</div>' +
      '<div class="event-card-desc">' + escapeEventHtml(potion.desc || "") + '</div>' +
    '</button>'
  );
}

/* ── 선택지 처리 ─────────────────────────────────────────────────────────── */
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
    case "relicRare": return applyEventRelicGrant("rare", "Rare ");
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
  const pool = (candidates || []).filter(r =>
    r && !ownedIds.includes(r.id) && (!rarityFilter || r.rarity === rarityFilter)
  );
  if(!pool.length) return null;
  const total = pool.reduce((sum, r) => sum + (r.dropWeight || 1), 0);
  let roll = Math.random() * total;
  for(const r of pool){
    roll -= (r.dropWeight || 1);
    if(roll <= 0) return { ...r };
  }
  return { ...pool[0] };
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
}

function applyEventAddStatusCard(effect){
  const candidates = Array.isArray(effect.candidates) ? effect.candidates.filter(Boolean) : [];
  if(!candidates.length) return;
  const count = effect.count || 1;
  for(let i = 0; i < count; i++){
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(key);
    const card = (typeof CARD_DB !== "undefined" && CARD_DB[key]) ? CARD_DB[key] : null;
    eventState.resultDetails.push({ kind: "negative", text: "상태 의식 추가: " + (card ? card.name : key) });
  }
}

/* 덱에서 무작위 주문을 count장 삭제한다. 덱이 1장 이하로 남을 정도로는
   삭제하지 않는다 (전투 진행 불가 방지). */
function applyEventCardRemove(effect){
  if(typeof STARTER_DECK === "undefined" || STARTER_DECK.length <= 1){
    eventState.resultDetails.push({ kind: "neutral", text: "덱이 너무 적어 의식을 삭제하지 못했습니다." });
    return;
  }
  const count = Math.min(effect.count || 1, STARTER_DECK.length - 1);
  for(let i = 0; i < count && STARTER_DECK.length > 1; i++){
    const idx = Math.floor(Math.random() * STARTER_DECK.length);
    const key = STARTER_DECK[idx];
    STARTER_DECK.splice(idx, 1);
    const card = (typeof CARD_DB !== "undefined" && CARD_DB[key]) ? CARD_DB[key] : null;
    eventState.resultDetails.push({ kind: "neutral", text: "의식 삭제: " + (card ? card.name : key) });
  }
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
  STARTER_DECK.push(key);
  const card = (typeof CARD_DB !== "undefined") ? CARD_DB[key] : null;
  eventState.resultDetails.push({ kind: "positive", text: "의식 복제: " + (card ? card.name : key) });
}

function buildTaggedCardPool(attr){
  if(typeof CARD_DB === "undefined") return [];
  return Object.keys(CARD_DB).filter(k => CARD_DB[k].attr === attr && !["starter", "status"].includes(CARD_DB[k].rarity));
}

function buildRareCardPool(){
  if(typeof CARD_DB === "undefined") return [];
  return Object.keys(CARD_DB).filter(k => CARD_DB[k].rarity === "rare");
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
  let pool = (db || []).filter(Boolean);
  if(rarityFilter) pool = pool.filter(p => p.rarity === rarityFilter);
  if(!pool.length) return null;
  const total = pool.reduce((sum, p) => sum + (p.dropWeight || 1), 0);
  let roll = Math.random() * total;
  for(const p of pool){
    roll -= (p.dropWeight || 1);
    if(roll <= 0) return { ...p };
  }
  return { ...pool[0] };
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
    return shuffle([...buildTaggedCardPool(effect.attr)]).slice(0, count);
  }
  if(effect.type === "cardRewardDominantAttr"){
    return shuffle([...buildTaggedCardPool(computeDominantDeckAttr())]).slice(0, count);
  }
  if(effect.type === "cardRewardRare"){
    return shuffle([...buildRareCardPool()]).slice(0, count);
  }
  /* cardReward / cardRewardOptional / cardTransform */
  return typeof getRandomRewardKeys === "function"
    ? getRandomRewardKeys(count)
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
    if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(eventState.cardSelected);
    if(typeof S !== "undefined" && S && Array.isArray(S.discard)) S.discard.push(eventState.cardSelected);
    if(typeof toast === "function") toast(card.name + " 의식을 덱에 추가했습니다.");
  }
  finishEventNode();
}

function skipEventCard(){
  if(typeof toast === "function") toast("의식 보상을 건너뛰었습니다.");
  finishEventNode();
}

/* ── 약병 선택 단계 (potionChoice) ───────────────────────────────────────── */
function openEventPotionPick(effect){
  const count = effect.count || 2;
  const db = typeof window.getPotionCandidatesBySource === "function"
    ? window.getPotionCandidatesBySource("event")
    : (typeof POTION_DB !== "undefined" ? POTION_DB : []);
  let pool = (db || []).filter(Boolean);
  if(effect.rarity) pool = pool.filter(p => p.rarity === effect.rarity);

  eventState.step = "potionPick";
  eventState.potionCandidates = shuffle([...pool]).slice(0, count);
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
  const pkg = typeof window.ACT1_PICK_PACKAGE === "function"
    ? window.ACT1_PICK_PACKAGE(nodeType, floor, new Set(), stageTheme)
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
