"use strict";
/* =========================================================================
   battleRewards UI 레이어 — battleRewards.js에서 분리된 순수 DOM 렌더링 함수.
   게임 상태(S.*)를 직접 변경하지 않고, 데이터를 받아 그리기만 한다.
   상태 변경/흐름 제어는 battleRewards.js(로직)에 남아있으며 여기 함수를
   호출한다. 유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

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

function randomItemResultSourceItem(item){
  if(!item || !item.key) return null;
  if(item.type === "relic"){
    const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
    return db.find(relic => relic && relic.id === item.key) || null;
  }
  if(item.type === "potion"){
    const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : (typeof POTION_DB !== "undefined" ? POTION_DB : []);
    return db.find(potion => potion && potion.id === item.key) || null;
  }
  return null;
}

function randomItemResultFramePath(item){
  const source = randomItemResultSourceItem(item);
  const rarity = String((item && item.rarity) || (source && source.rarity) || "common").toLowerCase();
  if(rarity === "blessing" || rarity === "starter" || rarity === "start") return "assets/ui_panels/relic_potion_frame_start.png";
  if(rarity === "rare" || rarity === "special" || rarity === "legendary") return "assets/ui_panels/relic_potion_frame_legendary.png";
  if(rarity === "uncommon") return "assets/ui_panels/relic_potion_frame_rare.png";
  return "assets/ui_panels/relic_potion_frame_common.png";
}

function randomItemResultFaceHtml(item){
  const source = randomItemResultSourceItem(item);
  const icon = (item && item.icon) || (source && (source.iconImage || source.icon || source.emoji)) || (item && item.type === "relic" ? "🏺" : item && item.type === "potion" ? "🧪" : "?");
  const name = (item && item.name) || (source && source.name) || "";
  // 법구/약병 획득 제거 결과 팝업은 아이콘+이름만 보여주고 설명 텍스트는 표시하지 않는다.
  // 상세 설명은 globalTooltip.js가 이름으로 RELIC_DB/POTION_DB를 조회해 툴팁으로 보여준다.
  return '<div class="item-art-layer">' + randomItemResultIconHtml(icon, name) + '</div>' +
    '<img class="item-frame-layer" src="' + escapeHtml(randomItemResultFramePath(item)) + '" alt="" aria-hidden="true" draggable="false">' +
    '<div class="item-text-layer">' +
      '<div class="item-name-text">' + escapeHtml(name) + '</div>' +
    '</div>' +
    '<div class="item-hit-layer" aria-hidden="true"></div>';
}

function randomItemResultCardHtml(item){
  const actionText = item.action === "remove" ? "제거됨" : "획득";

  /* 주문(카드) 결과는 카드 선택 화면과 동일한 실제 카드 프레임 이미지로 표시 */
  if(item.type === "card"){
    const card = (typeof CARD_DB !== "undefined") ? CARD_DB[item.key] : null;
    if(card && typeof cardFaceHtml === "function"){
      return (
        '<div class="random-item-result-card random-item-result-card-frame ' + escapeHtml(item.action || "gain") + '">' +
          '<div class="random-item-result-card-face card-frame-card">' + cardFaceHtml(card) + '</div>' +
          '<div class="random-item-result-tag">' + escapeHtml(actionText) + '</div>' +
        '</div>'
      );
    }
  }

  if(item.type === "relic" || item.type === "potion"){
    return (
      '<div class="random-item-result-card random-item-result-card-frame ' + escapeHtml(item.action || "gain") + '">' +
        '<div class="random-item-result-card-face item-frame-card">' + randomItemResultFaceHtml(item) + '</div>' +
        '<div class="random-item-result-tag">' + escapeHtml(actionText) + '</div>' +
      '</div>'
    );
  }

  const icon = item.icon || (item.type === "relic" ? "🏺" : item.type === "potion" ? "🧪" : "?");
  const name = item.name || "";
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
      'width:max-content;max-width:min(92cqw,100cqh);max-height:82cqh;padding:2.6cqh 2.6cqw;' +
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
    /* 아이템이 몇 개든 한 줄(가로)로만 늘어서야 하므로 줄바꿈을 금지하고,
       박스의 최대 너비를 넘어서는 경우에만 가로 스크롤로 대응한다. */
    '#randomItemResultPopup .random-item-result-list{' +
      'display:flex;flex-wrap:nowrap;justify-content:center;gap:1.4cqh;' +
      'width:max-content;max-width:100%;overflow-x:auto;overflow-y:hidden;padding:.2cqh;' +
    '}' +
    '#randomItemResultPopup .random-item-result-card{' +
      'flex-shrink:0;width:13cqh;min-height:15cqh;padding:1.1cqh;border-radius:1.4cqh;' +
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
      'font-size:1.9cqh;font-weight:900;color:#8a5c2b;text-align:center;' +
    '}' +
    '#randomItemResultPopup .random-item-result-card.remove .random-item-result-tag{color:#a3402f;}' +
    /* 주문(카드) 결과: 실제 카드 프레임 이미지 표시용
       (일반 아이콘 박스보다 카드 자체가 훨씬 커야 카드 프레임 글자 크기와
       비율이 맞아 이름/비용 텍스트가 겹치지 않는다 — 정화 보상 카드와 동일한 스케일) */
    '#randomItemResultPopup .random-item-result-card.random-item-result-card-frame{' +
      'width:21cqh;min-height:0;padding:0;border:0;background:transparent;box-shadow:none;' +
    '}' +
    '#randomItemResultPopup .random-item-result-card-face{' +
      'position:relative;width:100%;box-shadow:0 .45cqh 1.2cqh rgba(65,45,25,.16);' +
    '}' +
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

function updateRewardConfirmButton(ov){
  const btn = ov && ov.querySelector(".reward-confirm");
  if(!btn) return;
  btn.disabled = !selectedRewardCardKey;
  btn.classList.toggle("active", !!selectedRewardCardKey);
}

function ensureBattleVictoryOverlay(){
  let ov = document.querySelector("#battleVictoryOverlay");
  if(ov) return ov;
  ov = document.createElement("div");
  ov.id = "battleVictoryOverlay";
  ov.innerHTML =
    '<div class="victory-reward-panel">' +
      '<div class="victory-title-area">' +
        '<h2>위령 성공</h2>' +
        '<p>한풀이가 조금 더 깊어졌습니다.</p>' +
      '</div>' +
      '<div class="victory-section victory-reward-section">' +
        '<div class="victory-section-title">획득 보상</div>' +
        '<div class="victory-reward-row" aria-label="획득 보상 목록"></div>' +
      '</div>' +
      '<div class="victory-section victory-kill-section">' +
        '<div class="victory-section-title">전투 정보</div>' +
        '<div class="victory-battle-meta">' +
          '<span class="victory-meta-floor"></span>' +
          '<span class="victory-meta-turn"></span>' +
        '</div>' +
      '</div>' +
      '<div class="victory-button-area">' +
        '<button type="button" class="victory-next" aria-disabled="true">다음 여정으로</button>' +
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
    '</div>' +
    '<div class="victory-leave-confirm-modal" aria-hidden="true">' +
      '<div class="victory-confirm-box">' +
        '<div class="victory-confirm-title">아직 받지 않은 보상이 있습니다</div>' +
        '<div class="victory-confirm-desc">수령하지 않은 보상은 여정을 떠나면 사라집니다.<br>그래도 여정을 떠나시겠습니까?</div>' +
        '<div class="victory-confirm-actions">' +
          '<button type="button" class="victory-leave-confirm-go">이동</button>' +
          '<button type="button" class="victory-leave-confirm-cancel">취소</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.querySelector("#game").appendChild(ov);
  ov.querySelector(".victory-next").addEventListener("click", onBattleVictoryNextClick);
  ov.querySelector(".victory-leave-confirm-go").addEventListener("click", onBattleVictoryLeaveConfirmed);
  ov.querySelector(".victory-leave-confirm-cancel").addEventListener("click", closeBattleVictoryLeaveConfirm);
  return ov;
}

function renderBattleVictoryOverlay(){
  const ov = ensureBattleVictoryOverlay();
  const rewardRow = ov.querySelector(".victory-reward-row");
  const floor = ov.querySelector(".victory-meta-floor");
  const turn = ov.querySelector(".victory-meta-turn");
  const info = getBattleVictoryInfo();
  if(rewardRow) renderBattleVictoryRewardSlots(rewardRow);
  if(floor) floor.textContent = info.floor;
  if(turn) turn.textContent = info.turn;
  updateBattleVictoryNextButton(ov);
  ov.classList.add("show");
}

const BATTLE_VICTORY_REWARD_CATEGORY_LABELS = { gold:"복채", card:"주문", relic:"법구", potion:"약병" };
function getBattleVictoryRewardCategoryLabel(id){
  return BATTLE_VICTORY_REWARD_CATEGORY_LABELS[id] || "";
}

function renderBattleVictoryRewardSlots(host){
  const rewardState = ensureVictoryRewardState();
  host.innerHTML = getBattleVictoryRewards().map(item => {
    const done = !!rewardState.done[item.id];
    const doneText = rewardState.doneText[item.id] || item.doneText;
    return '<button type="button" class="victory-reward-slot' + (done ? ' done' : '') + '" data-reward-id="' + item.id + '">' +
      '<div class="victory-reward-category">' + escapeHtml(getBattleVictoryRewardCategoryLabel(item.id)) + '</div>' +
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

function openBattleVictoryConfirm(id, host){
  const item = getBattleVictoryRewards().find(reward => reward.id === id);
  const ov = host.closest("#battleVictoryOverlay");
  if(!item || !ov) return;
  const modal = ov.querySelector(".victory-confirm-modal");
  if(!modal) return;
  modal.dataset.rewardId = id;
  modal.querySelector(".victory-confirm-title").textContent = item.name;
  modal.querySelector(".victory-confirm-desc").innerHTML = colorizeRarityLabels(escapeHtml(item.desc || item.value || ""));
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
      '<span class="victory-potion-replace-icon">' + resourceIconHtml(potion.iconImage || potion.icon || potion.emoji || "藥") + '</span>' +
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
  detail.querySelector(".victory-potion-detail-desc.old").innerHTML = colorizeRarityLabels(escapeHtml(oldPotion.desc || oldPotion.value || "임시 약병 효과 설명입니다."));
  detail.querySelector(".victory-potion-detail-name.new").textContent = (newPotion && newPotion.name) || "새 약병";
  detail.querySelector(".victory-potion-detail-desc.new").innerHTML = colorizeRarityLabels(escapeHtml((newPotion && (newPotion.desc || newPotion.value)) || "임시 약병 효과 설명입니다."));
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

function updateBattleVictoryNextButton(ov){
  if(!ov) return;
  const btn = ov.querySelector(".victory-next");
  if(!btn) return;
  btn.classList.add("active");
  btn.setAttribute("aria-disabled", "false");
}

function openBattleVictoryLeaveConfirm(){
  const ov = document.querySelector("#battleVictoryOverlay");
  const modal = ov && ov.querySelector(".victory-leave-confirm-modal");
  if(!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

function closeBattleVictoryLeaveConfirm(){
  const ov = document.querySelector("#battleVictoryOverlay");
  const modal = ov && ov.querySelector(".victory-leave-confirm-modal");
  if(!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
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
      '<div class="reward-actions">' +
        '<button type="button" class="reward-skip">건너뛰기</button>' +
        '<button type="button" class="reward-confirm" disabled>받기</button>' +
      '</div>' +
    '</div>';
  document.querySelector("#game").appendChild(ov);
  ov.querySelector(".reward-skip").addEventListener("click", skipRewardCard);
  ov.querySelector(".reward-confirm").addEventListener("click", confirmRewardCard);
  return ov;
}

function renderRewardOverlay(keys){
  if(typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED==="function")
    window.BOHYUN_MARK_CARDS_ENCOUNTERED(keys);
  const ov   = ensureRewardOverlay();
  const wrap = ov.querySelector(".reward-cards");
  wrap.innerHTML = keys.map(rewardCardHtml).join("");
  selectedRewardCardKey = null;
  updateRewardConfirmButton(ov);
  wrap.querySelectorAll(".reward-card").forEach(btn =>
    btn.addEventListener("click", () => selectRewardCard(btn.dataset.card))
  );
  ov.classList.add("show");
}

function rewardCardHtml(key){
  const c = CARD_DB[key];
  if(!c) return "";
  return '<button type="button" class="reward-card card-frame-card cost-'+c.type+'" data-card="'+key+'">' +
    cardFaceHtml(c) +
  '</button>';
}

function closeRewardOverlay(){
  selectedRewardCardKey = null;
  const ov = document.querySelector("#cardRewardOverlay");
  if(ov) ov.classList.remove("show", "blessing-card-reward");
  const victoryOv = document.querySelector("#battleVictoryOverlay");
  if(victoryOv) victoryOv.classList.remove("show");
}
