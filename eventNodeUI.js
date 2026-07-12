"use strict";
/* =========================================================================
   이벤트 노드 UI 레이어 — eventNode.js에서 분리된 DOM 렌더링.
   효과 적용(정신력/골드/법구/카드/약병 지급 등)과 전투 전환 로직은
   eventNode.js에 남아있고 이 파일은 eventState를 화면에 그리기만 한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

const EVENT_HIDE_SELECTORS = [".top-hud", ".left-side-hud", ".battle-field", "#dock", "#hint"];
const EVENT_CHOICE_ICONS = ["❤️", "🔍", "🌙", "✨"];

let eventOverlayEl = null;

/* 이벤트 중 "여정 보기"에서 다음 노드 선택을 막기 위한 임시 함수 백업 */
let eventMapStartStageBackup = null;
let eventMapCloseMapBackup = null;

function applyEventBackground(ev){
  if(!eventOverlayEl) return;
  const image = ev && typeof ev.backgroundImage === "string" ? ev.backgroundImage : "";
  if(!image){
    eventOverlayEl.style.removeProperty("--event-bg-image");
    return;
  }
  eventOverlayEl.style.setProperty("--event-bg-image", 'url("' + image.replace(/"/g, '\\"') + '")');
}

function closeEventOverlayOnly(){
  if(!eventOverlayEl) return;
  eventOverlayEl.classList.remove("show");
  eventOverlayEl.setAttribute("aria-hidden", "true");
  showEventChrome();
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
          '<div class="event-hp-row">' +
            '<div class="event-hp-bar"><div class="event-hp-fill" id="eventHpFill"></div><span id="eventHpText"></span></div>' +
          '</div>' +
          '<div class="event-resource-row">' +
            '<span class="event-resource"><span class="hud-resource-icon hud-resource-icon-relic">🏺</span><b id="eventRelicCount">0</b></span>' +
            '<span class="event-resource"><span class="hud-resource-icon hud-resource-icon-potion">🧪</span><b id="eventPotionCount">0</b></span>' +
            '<span class="event-resource"><span class="hud-resource-icon hud-resource-icon-gold" aria-hidden="true"></span><b id="eventGold">0</b></span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="event-stage-info">' +
        '<div class="event-stage-title-main" id="eventStageTitle">이벤트</div>' +
        '<div class="event-stage-title-sub" id="eventStageSub"></div>' +
      '</div>' +
      '<div class="event-topbar-spacer"></div>' +
      '<div class="event-menu" aria-label="이벤트 중 공통 메뉴">' +
        '<button type="button" class="event-menu-btn ui-asset-button ui-map-button" id="eventMapBtn"><span class="ico">🗺️</span><span>여정</span></button>' +
        '<button type="button" class="event-menu-btn ui-asset-button ui-codex-button" id="eventDeckBtn"><span class="ico">📖</span><span>보유 주문</span></button>' +
        '<button type="button" class="event-menu-btn ui-asset-button ui-bag-button" id="eventBagBtn"><span class="ico">🎒</span><span>가방</span></button>' +
        '<button type="button" class="event-menu-btn ui-asset-button ui-settings-button" id="eventSettingsBtn"><span class="ico">⚙️</span><span>설정</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="event-stage" id="eventStage">' +
      '<div class="event-tip event-tip-left" id="eventTipLeft"></div>' +
      '<div class="event-panel-wrap">' +
        '<div class="event-body" id="eventBody"></div>' +
      '</div>' +
      '<div class="event-tip event-tip-right" id="eventTipRight"></div>' +
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
  if(typeof toast === "function") toast("보유 주문 확인 기능을 불러올 수 없습니다.");
}

function openEventBagPreview(){
  if(typeof window.BAG_UI_OPEN === "function"){ window.BAG_UI_OPEN(); return; }
  if(typeof toast === "function") toast("가방 확인 기능을 불러올 수 없습니다.");
}

function openEventSettingsPreview(){
  const settingsBtn = Array.from(document.querySelectorAll(".hud-btn"))
    .find(b => b.textContent.includes("⚙️") || b.textContent.includes("⚙"));
  if(settingsBtn) settingsBtn.click();
  else if(typeof toast === "function") toast("설정 기능을 열 수 없습니다.");
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
  renderEventPotionTip();
}

function renderEventHeader(){
  const overlay = eventOverlayEl;
  const run = (typeof S !== "undefined" && S)
    ? S
    : ((typeof RUN_STATE !== "undefined" && RUN_STATE) ? RUN_STATE : null);
  const player = run && run.player ? run.player : null;
  if(!player){
    overlay.querySelector("#eventName").textContent = "";
    overlay.querySelector("#eventHpText").textContent = "";
    return;
  }
  renderPlayerPortraitIcon(overlay.querySelector("#eventPortrait"));
  overlay.querySelector("#eventName").textContent = player.name || "";
  overlay.querySelector("#eventHpText").textContent = player.hp + "/" + player.maxHp;
  const pct = player.maxHp ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  overlay.querySelector("#eventHpFill").style.width = pct + "%";

  const count = typeof resourceCount === "function" ? resourceCount : (v => Array.isArray(v) ? v.length : (v || 0));
  overlay.querySelector("#eventRelicCount").textContent = count(run.relics);
  overlay.querySelector("#eventPotionCount").textContent = count(run.potions);
  overlay.querySelector("#eventGold").textContent = run.gold || 0;
  renderEventStageInfo();
}

function renderEventStageInfo(){
  const overlay = eventOverlayEl;
  if(!overlay) return;
  const outTitle = overlay.querySelector("#eventStageTitle");
  const outSub = overlay.querySelector("#eventStageSub");
  if(outTitle) outTitle.textContent = "이벤트";
  if(outSub) outSub.textContent = eventState && eventState.event ? (eventState.event.title || "") : "";
}

function escapeEventHtml(str){
  return String(str == null ? "" : str).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* 이벤트 선택지 중 약병을 얻을 수 있는 효과 타입 (고정 지급 potionSpecific,
   무작위 지급 potionRandom, 선택 지급 potionChoice 모두 포함) */
const EVENT_POTION_REWARD_TYPES = ["potionRandom", "potionSpecific", "potionChoice"];

function eventChoiceHasPotionReward(choice){
  const outcomes = Array.isArray(choice && choice.outcomes) ? choice.outcomes : [];
  return outcomes.some(o => (Array.isArray(o.effects) ? o.effects : []).some(e => e && EVENT_POTION_REWARD_TYPES.includes(e.type)));
}

function eventHasPotionReward(ev){
  return (ev && Array.isArray(ev.choices) ? ev.choices : []).some(eventChoiceHasPotionReward);
}

/* 휴식 노드 TIP 유령 UI(assets/prayer_icons/ghost_*.png)를 그대로 재사용한다.
   .event-stage 내부, .event-panel-wrap 바깥의 좌우 여백에 배치되므로
   이벤트 본문/선택지/결과 태그와는 겹치지 않는다. */
function renderEventPotionTip(){
  if(!eventOverlayEl || !eventState) return;
  const showTip = eventState.step === "choices" && eventHasPotionReward(eventState.event);
  const tipLeft = eventOverlayEl.querySelector("#eventTipLeft");
  const tipRight = eventOverlayEl.querySelector("#eventTipRight");
  if(!tipLeft || !tipRight) return;
  if(!showTip){
    tipLeft.innerHTML = "";
    tipRight.innerHTML = "";
    tipLeft.classList.remove("show");
    tipRight.classList.remove("show");
    return;
  }
  tipLeft.innerHTML =
    '<span class="event-tip-ghost" style="background-image:url(\'assets/prayer_icons/ghost_left.png\')"></span>' +
    '<span class="event-tip-text"><b>TIP</b> 약병을 이미 3개 보유하고 있다면<br>이벤트 보상 약병을 받을 수 없어요.</span>';
  tipRight.innerHTML =
    '<span class="event-tip-text">가방을 열어 미리 약병 칸을 비워두면<br>약병 보상을 받을 수 있어요.</span>' +
    '<span class="event-tip-ghost" style="background-image:url(\'assets/prayer_icons/ghost_right.png\')"></span>';
  tipLeft.classList.add("show");
  tipRight.classList.add("show");
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

/* potionSpecific 효과가 걸린 outcome이 있으면 POTION_DB에서 실제 효과 설명을
   찾아 choice.desc 아래 줄에 덧붙인다 (choice.desc 문자열 자체는 그대로 유지). */
function eventChoicePotionEffectDesc(choice){
  const outcomes = Array.isArray(choice && choice.outcomes) ? choice.outcomes : [];
  const db = typeof POTION_DB !== "undefined" ? POTION_DB : [];
  for(const o of outcomes){
    const effects = Array.isArray(o.effects) ? o.effects : [];
    const potionEffect = effects.find(e => e && e.type === "potionSpecific");
    if(!potionEffect) continue;
    const potion = db.find(p => p.id === potionEffect.potionId);
    if(potion && potion.desc) return potion.name + " 효과: " + potion.desc;
  }
  return "";
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
  const potionEffectDesc = eventChoicePotionEffectDesc(choice);
  const potionEffectHtml = potionEffectDesc
    ? '<div class="event-choice-effect">' + colorizeRarityLabels(escapeEventHtml(potionEffectDesc)) + '</div>'
    : '';
  return (
    '<button type="button" class="event-choice' + (disabledReason ? ' disabled' : '') + '" data-choice-id="' + escapeEventHtml(choice.id) + '"' +
      (disabledReason ? ' disabled aria-disabled="true" title="' + escapeEventHtml(disabledReason) + '"' : '') + '>' +
      '<div class="event-choice-icon">' + icon + '</div>' +
      '<div class="event-choice-body">' +
        '<div class="event-choice-label">' + escapeEventHtml(choice.label || "") + '</div>' +
        '<div class="event-choice-desc">' + colorizeRarityLabels(escapeEventHtml(choice.desc || "")) + '</div>' +
        potionEffectHtml +
        lockHtml +
      '</div>' +
      outcomesHtml +
    '</button>'
  );
}

function eventOutcomeChipHtml(outcome){
  const kind = outcome.kind === "positive" ? "positive" : (outcome.kind === "negative" ? "negative" : "neutral");
  const symbol = kind === "positive" ? "✦" : (kind === "negative" ? "⊖" : "◇");
  const chance = typeof outcome.chance === "number" ? " (확률 " + outcome.chance + "%)" : "";
  return '<span class="event-outcome-chip ' + kind + '">' + symbol + ' ' + colorizeRarityLabels(escapeEventHtml(outcome.text || "")) + chance + '</span>';
}

function eventResultHtml(){
  const rows = (eventState.resultDetails || []).map(detail =>
    '<div class="event-result-row ' + (detail.kind || "neutral") + '">' + colorizeRarityLabels(escapeEventHtml(detail.text)) + '</div>'
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
      '<div class="event-title">주문 보상</div>' +
      '<div class="event-guide">추가할 주문 1장을 선택하세요.</div>' +
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
      '<div class="event-card-desc">' + colorizeRarityLabels(escapeEventHtml(c.desc)) + '</div>' +
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

function eventPotionArtHtml(potion){
  const icon = potion.iconImage || potion.icon || potion.emoji || "🧪";
  if(typeof icon === "string" && icon.indexOf("assets/") === 0){
    return '<img src="' + escapeEventHtml(icon) + '" alt="" aria-hidden="true">';
  }
  return escapeEventHtml(icon);
}

function eventItemFramePath(item){
  const rarity = String(item && item.rarity ? item.rarity : "common").toLowerCase();
  if(rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
  if(rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
  if(rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
  return "assets/ui_panels/relic_potion_frame_common.png";
}

function eventPotionFaceHtml(potion){
  const safePotion = potion || {};
  return '<div class="item-art-layer">' + eventPotionArtHtml(safePotion) + '</div>' +
    '<img class="item-frame-layer" src="' + escapeEventHtml(eventItemFramePath(safePotion)) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="item-text-layer">' +
      '<div class="item-name-text">' + escapeEventHtml(safePotion.name || "") + '</div>' +
      '<div class="item-desc-text">' + colorizeRarityLabels(escapeEventHtml(safePotion.desc || "").replace(/\n/g, "<br>")) + '</div>' +
    '</div>' +
    '<div class="item-hit-layer" aria-hidden="true"></div>';
}

function eventPotionHtml(potion){
  if(!potion) return "";
  const selected = eventState.potionSelected === potion.id ? " selected" : "";
  return (
    '<button type="button" class="event-card event-card-frame event-item-frame item-frame-card' + selected + '" data-potion-id="' + escapeEventHtml(potion.id) + '">' +
      eventPotionFaceHtml(potion) +
    '</button>'
  );
}
