"use strict";
/* =========================================================================
   카드 플레이 UI 레이어 — cardPlaySystem.js에서 분리된 카드 HTML 템플릿과
   범용 카드 선택 모달. 카드 판정/효과 적용 같은 규칙 로직은
   cardPlaySystem.js에 남아있고 이 파일은 화면에 그리기만 한다.
   escapeHtml/cardFaceHtml은 전투 밖 다른 화면(상점/이벤트/보상 등)에서도
   전역으로 재사용되는 공용 HTML 템플릿 함수다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

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

/* 범용 카드 선택 모달: 후보 카드 목록을 보여주고 클릭한 카드(혹은 취소)를
   Promise로 반환한다. deckViewer.js의 OPEN_DECK_VIEWER_CARD_PICK을 쓸 수
   없는 상황(예: 아직 로드 전)의 폴백으로도 쓰인다. */
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
