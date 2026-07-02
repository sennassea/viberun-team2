"use strict";
/* =========================================================================
   받아들이기 - 주문 추가 UI (prayerCardAdd.js)
   기획서: 기도터 UI 통합 기획서 - 5장 주문 추가 UI

   전투 승리 시 뜨는 "정화 보상"과 동일한 로직(주문 보상 풀에서 3장 추첨,
   1장 선택 또는 건너뛰기, STARTER_DECK에 추가)을 재사용하되, 기도터 톤에 맞는
   전용 화면으로 새로 그린다. (기존 openCardReward 관련 코드는 건드리지 않음)

   restNode.js의 "받아들이기" 확정 시 window.PRAYER_CARD_ADD_OPEN()을 호출한다.
   주문 리세마라 방지를 위해 취소/뒤로가기는 제공하지 않는다 - 건너뛰기 또는
   주문 선택 완료로만 닫히며, 닫히면 곧바로 맵 선택으로 돌아간다.
   ========================================================================= */

(function () {
  const CANDIDATE_COUNT = 3;

  let els = null;
  let candidates = [];
  let selectedKey = null;

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function pickCandidates() {
    if (typeof getRandomRewardKeys === "function") return getRandomRewardKeys(CANDIDATE_COUNT);
    if (typeof CARD_REWARD_POOL === "undefined") return [];
    return [...CARD_REWARD_POOL].sort(() => Math.random() - 0.5).slice(0, CANDIDATE_COUNT);
  }

  /* ── 스타일 주입 ────────────────────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById("prayerCardAddStyles")) return;
    const style = document.createElement("style");
    style.id = "prayerCardAddStyles";
    style.textContent =
      ".pca-overlay{--pca-cream:#faf2e2;--pca-beige:#ece0c6;--pca-beige-deep:#cbb480;--pca-gold:#dba53f;--pca-gold-deep:#a97a1f;--pca-green:#4f9d6c;--pca-green-deep:#357049;--pca-ink:#4a3a26;--pca-ink-soft:#8a765a;" +
        "position:absolute;left:0;right:0;top:12.9cqh;bottom:0;z-index:70;display:none;place-items:center;" +
        "background:rgba(30,20,10,.45);backdrop-filter:blur(3px);opacity:0;transition:opacity .2s ease;}" +
      ".pca-overlay.show{display:grid;opacity:1;}" +
      ".pca-panel{position:relative;width:min(84cqw,106cqh);max-height:78cqh;display:flex;flex-direction:column;gap:1.2cqh;padding:1.8cqh 2cqw;" +
        "background:radial-gradient(ellipse at 30% 15%,var(--pca-cream) 0%,var(--pca-beige) 62%,var(--pca-beige-deep) 100%);" +
        "border:0.3cqh solid var(--pca-gold);border-radius:1.6cqh;box-shadow:0 2cqh 4cqh rgba(30,20,10,.5),inset 0 0 3cqh rgba(255,250,230,.5);color:var(--pca-ink);}" +
      ".pca-title{text-align:center;font-size:2.6cqh;font-weight:900;}" +
      ".pca-guide{text-align:center;font-size:1.5cqh;font-weight:700;color:var(--pca-ink-soft);}" +
      ".pca-body{flex:1;min-height:0;display:grid;grid-template-columns:1fr 20cqw;gap:1.4cqw;}" +
      ".pca-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2cqw;}" +
      ".pca-card{display:flex;flex-direction:column;align-items:center;gap:.7cqh;padding:1.6cqh 1cqw;" +
        "background:rgba(255,255,255,.7);border:0.22cqh solid var(--pca-beige-deep);border-radius:1.4cqh;" +
        "cursor:pointer;font:inherit;color:var(--pca-ink);transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;}" +
      ".pca-card:hover{transform:translateY(-.4cqh);border-color:var(--pca-gold);}" +
      ".pca-card.selected{border-color:var(--pca-gold-deep);box-shadow:0 0 0 0.22cqh var(--pca-gold);background:rgba(255,250,235,.95);}" +
      ".pca-card-cost{width:3.4cqh;height:3.4cqh;border-radius:50%;display:grid;place-items:center;background:#3f8fe0;color:#fff;font-weight:900;font-size:1.5cqh;align-self:flex-start;}" +
      ".pca-card-name{font-size:1.85cqh;font-weight:900;}" +
      ".pca-card-art{font-size:4cqh;line-height:1;}" +
      ".pca-card-type{font-size:1.25cqh;font-weight:800;color:#fff;padding:.15cqh .8cqw;border-radius:.8cqh;}" +
      ".pca-card-type.attack{background:#e3574e;} .pca-card-type.defense{background:#3f8fe0;} .pca-card-type.skill{background:#4bb07a;}" +
      ".pca-card-desc{font-size:1.3cqh;color:var(--pca-ink-soft);text-align:center;font-weight:700;line-height:1.4;white-space:pre-line;}" +
      ".pca-side{display:flex;flex-direction:column;gap:1cqh;}" +
      ".pca-side-box{flex:1;background:rgba(255,255,255,.55);border:0.16cqh solid var(--pca-beige-deep);border-radius:1.1cqh;padding:1cqh .9cqw;display:flex;flex-direction:column;gap:.5cqh;}" +
      ".pca-side-title{font-size:1.25cqh;font-weight:900;color:var(--pca-gold-deep);text-align:center;}" +
      ".pca-effect-body{flex:1;font-size:1.3cqh;color:var(--pca-ink-soft);font-weight:700;text-align:center;display:flex;align-items:center;justify-content:center;white-space:pre-line;line-height:1.4;}" +
      ".pca-deck-count{flex:1;font-size:2.2cqh;font-weight:900;text-align:center;display:flex;align-items:center;justify-content:center;gap:.4cqw;}" +
      ".pca-deck-count .arrow{color:var(--pca-ink-soft);font-size:1.6cqh;}" +
      ".pca-deck-count b{color:var(--pca-green-deep);}" +
      ".pca-actions{flex:none;display:flex;justify-content:center;gap:1.2cqw;}" +
      ".pca-btn{min-width:16cqw;height:5cqh;border-radius:1.2cqh;font-size:1.9cqh;font-weight:900;cursor:pointer;font:inherit;border:0.2cqh solid var(--pca-beige-deep);}" +
      ".pca-skip{background:var(--pca-beige);color:var(--pca-ink-soft);}" +
      ".pca-confirm{background:var(--pca-green);border-color:var(--pca-green-deep);color:#fff;}" +
      ".pca-confirm:disabled{background:#cfd6cd;border-color:#b3bcae;color:#8a9284;cursor:not-allowed;}";
    document.head.appendChild(style);
  }

  /* ── DOM 생성 ──────────────────────────────────────────────────────── */
  function ensureUI() {
    if (els) return els;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.id = "prayerCardAddOverlay";
    overlay.className = "pca-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="pca-panel" role="dialog" aria-modal="true" aria-labelledby="pcaTitle">' +
        '<div class="pca-title" id="pcaTitle">주문 추가</div>' +
        '<div class="pca-guide">추가할 주문 1장을 선택하세요.</div>' +
        '<div class="pca-body">' +
          '<div class="pca-cards" id="pcaCards"></div>' +
          '<div class="pca-side">' +
            '<div class="pca-side-box">' +
              '<div class="pca-side-title">✦ 선택 효과 ✦</div>' +
              '<div class="pca-effect-body" id="pcaEffectBody">주문을 선택하면 효과를 확인할 수 있어요.</div>' +
            '</div>' +
            '<div class="pca-side-box">' +
              '<div class="pca-side-title">✦ 덱 주문 수 ✦</div>' +
              '<div class="pca-deck-count" id="pcaDeckCount"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="pca-actions">' +
          '<button type="button" class="pca-btn pca-skip" id="pcaSkip">건너뛰기</button>' +
          '<button type="button" class="pca-btn pca-confirm" id="pcaConfirm" disabled>선택 완료</button>' +
        '</div>' +
      '</div>';

    overlay.querySelector("#pcaSkip").addEventListener("click", skipAdd);
    overlay.querySelector("#pcaConfirm").addEventListener("click", confirmAdd);

    (document.querySelector("#game") || document.body).appendChild(overlay);

    els = {
      overlay,
      cards: overlay.querySelector("#pcaCards"),
      effectBody: overlay.querySelector("#pcaEffectBody"),
      deckCount: overlay.querySelector("#pcaDeckCount"),
      confirm: overlay.querySelector("#pcaConfirm"),
    };
    return els;
  }

  function cardHtml(key) {
    const c = (typeof CARD_DB !== "undefined" && CARD_DB[key]) || null;
    if (!c) return "";
    const label = typeof typeLabel === "function" ? typeLabel(c.type) : c.type;
    return (
      '<button type="button" class="pca-card" data-key="' + key + '">' +
        '<div class="pca-card-cost">' + c.cost + '</div>' +
        '<div class="pca-card-name">' + escapeHtml(c.name) + '</div>' +
        '<div class="pca-card-art">' + escapeHtml(c.emoji) + '</div>' +
        '<div class="pca-card-type ' + c.type + '">' + escapeHtml(label) + '</div>' +
        '<div class="pca-card-desc">' + escapeHtml(c.desc) + '</div>' +
      '</button>'
    );
  }

  function render() {
    if (!els) return;
    if (typeof window.BOHYUN_MARK_CARDS_ENCOUNTERED === "function") window.BOHYUN_MARK_CARDS_ENCOUNTERED(candidates);
    els.cards.innerHTML = candidates.map(cardHtml).join("");
    els.cards.querySelectorAll(".pca-card[data-key]").forEach((btn) => {
      btn.addEventListener("click", () => selectCandidate(btn.dataset.key));
    });
    updateSidePanels();
  }

  function selectCandidate(key) {
    selectedKey = key;
    els.cards.querySelectorAll(".pca-card").forEach((el) => el.classList.toggle("selected", el.dataset.key === key));
    els.confirm.disabled = false;
    updateSidePanels();
  }

  function updateSidePanels() {
    const card = selectedKey && typeof CARD_DB !== "undefined" ? CARD_DB[selectedKey] : null;
    els.effectBody.textContent = card ? card.desc : "주문을 선택하면 효과를 확인할 수 있어요.";

    const current = typeof STARTER_DECK !== "undefined" ? STARTER_DECK.length : 0;
    const next = card ? current + 1 : current;
    els.deckCount.innerHTML = current + ' <span class="arrow">→</span> <b>' + next + '</b>';
  }

  /* ── 확정/건너뛰기 (취소 없음 - 반드시 맵으로 복귀) ───────────────────── */
  function confirmAdd() {
    if (!selectedKey) return;
    const card = typeof CARD_DB !== "undefined" ? CARD_DB[selectedKey] : null;
    if (card) {
      if (typeof STARTER_DECK !== "undefined") STARTER_DECK.push(selectedKey);
      if (typeof S !== "undefined" && S && Array.isArray(S.discard)) S.discard.push(selectedKey);
      if (typeof renderHud === "function") renderHud();
      if (typeof toast === "function") toast(card.name + " 주문을 덱에 추가했습니다.");
    }
    finish();
  }

  function skipAdd() {
    if (typeof toast === "function") toast("주문 추가를 건너뛰었습니다.");
    finish();
  }

  function finish() {
    if (els) {
      els.overlay.classList.remove("show");
      els.overlay.setAttribute("aria-hidden", "true");
    }
    if (typeof resolvePrayerNode === "function") resolvePrayerNode();
  }

  function openCardAdd() {
    ensureUI();
    candidates = pickCandidates();
    selectedKey = null;
    render();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
  }

  window.PRAYER_CARD_ADD_OPEN = openCardAdd;
})();
