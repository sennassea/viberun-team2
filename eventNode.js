"use strict";
/* =========================================================================
   이벤트 노드 화면 (eventNode.js)
   기획서: ACT1 이벤트 세부 기획서 밸런스조정안 / 이벤트 데이터 입력 1차 개발 지시서

   이 파일은 characterData.js / monsterData.js / lifeSystem.js / equipment.js /
   potion.js / cardData.js / eventData.js / script.js / mapSystem.js /
   mapNodeLogic.js / encounterPackages.js / restNode.js / shopNode.js 이후에
   로드되어야 합니다. 기존 코드를 직접 수정하지 않고 window.EVENT_DB를 읽어
   전용 화면을 그립니다.

   진입은 실제 맵 노드가 아니라 CHEAT.event.open()을 통해서만 이루어집니다
   (mapNodeLogic.js의 event 노드 딤드 해제는 이번 단계 범위 밖).
   ========================================================================= */

const EVENT_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];
const EVENT_RELIC_FALLBACK_GOLD = 80;
const EVENT_CHOICE_ICONS = ["❤️", "🔍", "🌙", "✨"];

let eventOverlayEl = null;
let eventState = null; // { event, step, resultDetails, cardCandidates, cardSelected }

/* ── 진입점 (cheatEvent.js의 CHEAT.event.open()이 호출) ─────────────────── */
function openEventNode(eventId){
  const ev = (window.EVENT_DB || []).find(e => e.id === eventId);
  if(!ev){
    console.warn("[eventNode] 이벤트를 찾을 수 없습니다: " + eventId);
    return;
  }
  ensureEventOverlay();
  hideEventChrome();
  eventState = { event: ev, step: "choices", resultDetails: [], cardCandidates: [], cardSelected: null };
  renderEventOverlay();
  eventOverlayEl.classList.add("show");
  eventOverlayEl.setAttribute("aria-hidden", "false");
}

function closeEventOverlayOnly(){
  if(!eventOverlayEl) return;
  eventOverlayEl.classList.remove("show");
  eventOverlayEl.setAttribute("aria-hidden", "true");
  showEventChrome();
}

/* 이벤트 종료 → 맵으로 복귀 (기도터/상점과 동일 패턴) */
function finishEventNode(){
  closeEventOverlayOnly();
  eventState = null;
  if(typeof renderHud === "function") renderHud();
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
    '<div class="event-header">' +
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
      '<div class="event-header-badge">이벤트</div>' +
    '</div>' +
    '<div class="event-body" id="eventBody"></div>'
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
  if(e.target.closest("#eventCardConfirm")){ confirmEventCard(); return; }
  if(e.target.closest("#eventCardSkip")){ skipEventCard(); return; }
  if(e.target.closest("#eventResultConfirm")){ finishEventNode(); return; }
}

/* ── 렌더링 ──────────────────────────────────────────────────────────────── */
function renderEventOverlay(){
  if(!eventOverlayEl || !eventState) return;
  renderEventHeader();
  const body = eventOverlayEl.querySelector("#eventBody");
  if(!body) return;
  if(eventState.step === "cardPick") body.innerHTML = eventCardPickHtml();
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
      '<div class="event-title">' + escapeEventHtml(ev.title || "") + '</div>' +
      '<div class="event-story">' + storyHtml + '</div>' +
      '<div class="event-choices">' + choicesHtml + '</div>' +
    '</div>'
  );
}

function eventChoiceRowHtml(choice, idx){
  const icon = EVENT_CHOICE_ICONS[idx] || "❓";
  const outcomes = Array.isArray(choice.outcomes) ? choice.outcomes : [];
  const outcomesHtml = outcomes.length
    ? '<div class="event-outcomes">' + outcomes.map(eventOutcomeChipHtml).join("") + '</div>'
    : '';
  return (
    '<button type="button" class="event-choice" data-choice-id="' + escapeEventHtml(choice.id) + '">' +
      '<div class="event-choice-icon">' + icon + '</div>' +
      '<div class="event-choice-body">' +
        '<div class="event-choice-label">' + escapeEventHtml(choice.label || "") + '</div>' +
        '<div class="event-choice-desc">' + escapeEventHtml(choice.desc || "") + '</div>' +
      '</div>' +
      outcomesHtml +
    '</button>'
  );
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
      '<div class="event-title">카드 보상</div>' +
      '<div class="event-guide">추가할 카드 1장을 선택하세요.</div>' +
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

function selectEventChoice(choiceId){
  if(!eventState || eventState.step !== "choices") return;
  const choice = (eventState.event.choices || []).find(c => c.id === choiceId);
  if(!choice) return;

  const outcomes = Array.isArray(choice.outcomes) ? choice.outcomes : [];
  if(!outcomes.length){
    finishEventNode();
    return;
  }

  const picked = rollEventOutcomes(outcomes);
  const effects = picked.reduce((acc, o) => acc.concat(Array.isArray(o.effects) ? o.effects : []), []);
  const combatEffect = effects.find(e => e.type === "combat");
  const cardRewardEffect = effects.find(e => e.type === "cardReward");
  const immediateEffects = effects.filter(e => e.type !== "combat" && e.type !== "cardReward");

  eventState.resultDetails = picked.map(o => ({ kind: o.kind, text: o.text }));
  immediateEffects.forEach(applyEventEffect);

  if(cardRewardEffect){
    openEventCardPick(cardRewardEffect);
    return;
  }
  if(combatEffect){
    triggerEventCombat(combatEffect.combatType);
    return;
  }

  eventState.step = "result";
  renderEventOverlay();
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
    case "relicRandom": return applyEventRelicRandom();
    case "addStatusCard": return applyEventAddStatusCard(effect);
    case "none": return;
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

function pickEventRelic(){
  if(typeof S === "undefined" || !S) return null;
  const ownedIds = Array.isArray(S.relics) ? S.relics.map(r => r && r.id).filter(Boolean) : [];
  const candidates = typeof window.getRelicCandidatesBySource === "function"
    ? window.getRelicCandidatesBySource("event")
    : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
  const pool = (candidates || []).filter(r => r && !ownedIds.includes(r.id));
  if(!pool.length) return null;
  const total = pool.reduce((sum, r) => sum + (r.dropWeight || 1), 0);
  let roll = Math.random() * total;
  for(const r of pool){
    roll -= (r.dropWeight || 1);
    if(roll <= 0) return { ...r };
  }
  return { ...pool[0] };
}

function applyEventRelicRandom(){
  if(typeof S === "undefined" || !S) return;
  if(!Array.isArray(S.relics)) S.relics = [];
  const relic = pickEventRelic();
  if(!relic){
    /* 법구 후보가 없으면 골드로 대체해 이벤트 정지를 방지한다 (문서 QA) */
    applyEventGold(EVENT_RELIC_FALLBACK_GOLD);
    eventState.resultDetails.push({
      kind: "neutral",
      text: "미보유 법구가 없어 골드 " + EVENT_RELIC_FALLBACK_GOLD + "로 대체 지급되었습니다."
    });
    return;
  }
  S.relics.push(relic);
  eventState.resultDetails.push({ kind: "positive", text: "법구 획득: " + (relic.emoji || "🏺") + " " + relic.name });
}

function applyEventAddStatusCard(effect){
  const candidates = Array.isArray(effect.candidates) ? effect.candidates.filter(Boolean) : [];
  if(!candidates.length) return;
  const count = effect.count || 1;
  for(let i = 0; i < count; i++){
    const key = candidates[Math.floor(Math.random() * candidates.length)];
    if(typeof STARTER_DECK !== "undefined") STARTER_DECK.push(key);
    const card = (typeof CARD_DB !== "undefined" && CARD_DB[key]) ? CARD_DB[key] : null;
    eventState.resultDetails.push({ kind: "negative", text: "상태 카드 추가: " + (card ? card.name : key) });
  }
}

/* ── 카드 보상 단계 ──────────────────────────────────────────────────────── */
function openEventCardPick(effect){
  const count = effect.count || 3;
  const candidates = typeof getRandomRewardKeys === "function"
    ? getRandomRewardKeys(count)
    : (typeof CARD_REWARD_POOL !== "undefined" && typeof shuffle === "function"
        ? shuffle([...CARD_REWARD_POOL]).slice(0, count)
        : []);
  eventState.step = "cardPick";
  eventState.cardCandidates = candidates;
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
    if(typeof toast === "function") toast(card.name + " 카드를 덱에 추가했습니다.");
  }
  finishEventNode();
}

function skipEventCard(){
  if(typeof toast === "function") toast("카드 보상을 건너뛰었습니다.");
  finishEventNode();
}

/* ── 전투 전환 ───────────────────────────────────────────────────────────── */
function triggerEventCombat(combatType){
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
  const pkg = typeof window.ACT1_PICK_PACKAGE === "function"
    ? window.ACT1_PICK_PACKAGE(nodeType, floor, new Set())
    : null;

  let mons = (pkg && typeof d.getMonstersByIds === "function") ? d.getMonstersByIds(pkg.monsterIds) : null;
  if(!mons || !mons.length){
    const normalIds = (d.monsterGroups && d.monsterGroups.normal) || [];
    mons = normalIds.slice(0, 1).map(id => d.getMonsterById(id)).filter(Boolean);
  }
  if(!mons || !mons.length){
    if(typeof toast === "function") toast("전투를 시작할 몬스터를 찾을 수 없습니다.");
    finishEventNode();
    return;
  }

  d.monsters.splice(0, d.monsters.length, ...mons);
  if(typeof newGame === "function") newGame();
  if(typeof S !== "undefined" && S) S.battleNodeType = nodeType;
}

window.EVENT_NODE_OPEN = openEventNode;
