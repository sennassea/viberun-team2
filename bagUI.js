"use strict";
/* =========================================================================
   가방 UI (bagUI.js)
   기획서: 기도터 UI 통합 기획서 - 7장 가방 UI

   기도터(restNode.js) 화면의 "가방" 버튼을 눌렀을 때, 화면 위로 오버되는
   팝업으로 보유 법구와 약병 슬롯을 확인한다. (기획서 2장 "공통 팝업" 규칙:
   반투명 오버레이 + 배경 블러 + 우측 상단 X 닫기 버튼)

   기존 파일(restNode.js 등)은 최소한으로만 수정한다. 이 파일은 window.BAG_UI_OPEN
   전역 함수만 노출하고, restNode.js의 "가방" 버튼에서 이를 호출하도록 연결한다.
   ========================================================================= */

(function () {
  const RELIC_PAGE_SIZE   = 8;  // 4개 x 2열 (기획서 7-3)
  const POTION_SLOT_COUNT = 3;  // 기본 슬롯 3개 (기획서 7-4)

  let els = null;
  let relicPage        = 0;
  let selectedRelicIdx = null;
  let selectedPotionIdx = null;

  function getRelics() {
    if (typeof S !== "undefined" && S && Array.isArray(S.relics)) return S.relics;
    // 신령의 은혜 화면 등 첫 전투 진입 전(S 미생성 상태)에도 보유 법구를 보여준다.
    if (typeof RUN_STATE !== "undefined" && RUN_STATE && Array.isArray(RUN_STATE.relics)) return RUN_STATE.relics;
    return [];
  }
  function getPotions() {
    return (typeof S !== "undefined" && S && Array.isArray(S.potions)) ? S.potions : [];
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function bagItemIconHtml(icon) {
    if (typeof icon === "string" && icon.indexOf("assets/") === 0) {
      return '<img src="' + escapeHtml(icon) + '" alt="" aria-hidden="true">';
    }
    return escapeHtml(icon || "");
  }

  function getBagRelicIcon(relic) {
    if (!relic) return "🏺";
    return relic.iconImage || relic.icon || relic.emoji || "🏺";
  }

  /* ── 스타일 주입 ────────────────────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById("bagUIStyles")) return;

    const style = document.createElement("style");
    style.id = "bagUIStyles";
    style.textContent =
      ".bag-ui-overlay{--bg-cream:#faf2e2;--bg-beige:#ece0c6;--bg-beige-deep:#cbb480;--bg-gold:#dba53f;--bg-gold-deep:#a97a1f;--bg-ink:#4a3a26;--bg-ink-soft:#8a765a;" +
        "position:absolute;inset:0;z-index:95;display:none;place-items:center;" +
        "background:rgba(30,20,10,.45);backdrop-filter:blur(3px);opacity:0;transition:opacity .2s ease;}" +
      ".bag-ui-overlay.show{display:grid;opacity:1;}" +
      ".bag-ui-overlay.map-mode{top:0;z-index:300!important;}" +
      ".bag-ui-panel{position:relative;width:min(84cqw,106cqh);aspect-ratio:720/585;max-height:78cqh;box-sizing:border-box;display:flex;flex-direction:column;gap:1.3cqh;padding:2.5cqh 2.4cqw 2.8cqh;" +
        "background:transparent url(\"assets/ui_panels/codex_section_panel.png\") center/100% 100% no-repeat;" +
        "border:0;border-radius:0;box-shadow:0 1.2cqh 2.4cqh rgba(0,0,0,.22);color:var(--bg-ink);}" +
      ".bag-ui-head{flex:none;display:flex;align-items:center;justify-content:center;position:relative;}" +
      ".bag-ui-title{font-size:2.6cqh;font-weight:900;}" +
      ".bag-ui-close{position:absolute;right:.3cqw;top:50%;transform:translateY(-50%);width:4cqh;height:4cqh;" +
        "border:0;border-radius:0;background:transparent url(\"assets/ui_buttons/close.png\") center/100% 100% no-repeat;color:transparent;font-size:0;font-weight:900;cursor:pointer;line-height:1;}" +
      ".bag-ui-body{flex:1;min-height:0;display:grid;grid-template-columns:1.6fr 1fr;gap:1.4cqw;}" +
      ".bag-ui-col{min-height:0;display:flex;flex-direction:column;gap:.8cqh;background:rgba(255,255,255,.36);" +
        "border:0.14cqh solid rgba(178,140,80,.36);border-radius:1cqh;padding:1.2cqh 1cqw;}" +
      ".bag-ui-col-title{font-size:1.7cqh;font-weight:900;}" +
      ".bag-relic-grid{flex:1;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(2,1fr);gap:.8cqh;min-height:0;}" +
      ".bag-relic-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.4cqh;padding:.5cqh;" +
        "background:rgba(255,255,255,.7);border:0.18cqh solid var(--bg-beige-deep);border-radius:1cqh;cursor:pointer;font:inherit;color:var(--bg-ink);}" +
      ".bag-relic-card:hover{border-color:var(--bg-gold);}" +
      ".bag-relic-card.selected{border-color:var(--bg-gold-deep);box-shadow:0 0 0 0.18cqh var(--bg-gold);background:rgba(255,250,235,.95);}" +
      ".bag-relic-card.empty{cursor:default;background:rgba(255,255,255,.28);border-style:dashed;}" +
      ".bag-relic-card.empty:hover{border-color:var(--bg-beige-deep);}" +
      ".bag-relic-icon{font-size:3cqh;line-height:1;flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;}" +
      ".bag-potion-icon img,.bag-detail-name img{width:1.25em;height:1.25em;object-fit:contain;vertical-align:-.22em;}" +
      ".bag-relic-icon img{width:100%;height:100%;object-fit:contain;display:block;}" +
      ".bag-relic-name{font-size:1.15cqh;font-weight:800;text-align:center;}" +
      ".bag-empty-msg{flex:1;display:flex;align-items:center;justify-content:center;text-align:center;color:var(--bg-ink-soft);font-size:1.4cqh;font-weight:700;}" +
      ".bag-page-nav{flex:none;display:flex;align-items:center;justify-content:center;gap:.8cqw;font-size:1.3cqh;font-weight:800;}" +
      ".bag-page-nav button{width:3.4cqh;height:3.4cqh;border:0;border-radius:0;background:transparent url(\"assets/ui/event_choice_panel.png\") center/100% 100% no-repeat;cursor:pointer;font-weight:900;color:#6b4a20;filter:drop-shadow(0 .18cqh .28cqh rgba(90,65,25,.16));}" +
      ".bag-page-nav button:disabled{opacity:.4;cursor:default;filter:grayscale(.4);}" +
      ".bag-detail{flex:none;min-height:6.4cqh;background:rgba(255,255,255,.48);border:0.14cqh solid rgba(178,140,80,.36);" +
        "border-radius:1cqh;padding:.8cqh 1cqw;display:flex;flex-direction:column;gap:.3cqh;}" +
      ".bag-detail-name{font-size:1.5cqh;font-weight:900;}" +
      ".bag-detail-desc{font-size:1.25cqh;color:var(--bg-ink-soft);font-weight:700;white-space:pre-line;line-height:1.4;}" +
      ".bag-detail-placeholder{font-size:1.25cqh;color:var(--bg-ink-soft);font-weight:700;margin:auto;}" +
      ".bag-potion-slots{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:.7cqw;}" +
      ".bag-potion-card{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.35cqh;" +
        "min-height:9cqh;background:rgba(255,255,255,.7);border:0.18cqh solid var(--bg-beige-deep);border-radius:1cqh;cursor:pointer;font:inherit;color:var(--bg-ink);}" +
      ".bag-potion-card:hover{border-color:var(--bg-gold);}" +
      ".bag-potion-card.selected{border-color:var(--bg-gold-deep);box-shadow:0 0 0 0.18cqh var(--bg-gold);background:rgba(255,250,235,.95);}" +
      ".bag-potion-card.empty{cursor:default;background:rgba(255,255,255,.28);border-style:dashed;}" +
      ".bag-potion-num{position:absolute;top:.3cqh;left:.5cqw;font-size:1cqh;font-weight:900;color:var(--bg-ink-soft);}" +
      ".bag-potion-icon{font-size:3cqh;line-height:1;}" +
      ".bag-potion-name{font-size:1.1cqh;font-weight:800;text-align:center;padding:0 .3cqw;}" +
      ".bag-flavor{flex:none;font-size:1.2cqh;color:var(--bg-ink-soft);font-weight:700;line-height:1.4;background:rgba(255,255,255,.4);" +
        "border-radius:1cqh;padding:.7cqh .8cqw;border:0.14cqh dashed var(--bg-beige-deep);}";
    document.head.appendChild(style);
  }

  /* ── DOM 생성 ──────────────────────────────────────────────────────── */
  function ensureUI() {
    if (els) return els;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.id = "bagUIOverlay";
    overlay.className = "bag-ui-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="bag-ui-panel" role="dialog" aria-modal="true" aria-labelledby="bagUITitle">' +
        '<div class="bag-ui-head">' +
          '<div class="bag-ui-title" id="bagUITitle">가방</div>' +
          '<button type="button" class="bag-ui-close" aria-label="닫기">✕</button>' +
        '</div>' +
        '<div class="bag-ui-body">' +
          '<div class="bag-ui-col">' +
            '<div class="bag-ui-col-title">보유 법구</div>' +
            '<div class="bag-relic-grid" id="bagRelicGrid"></div>' +
            '<div class="bag-page-nav" id="bagRelicNav"></div>' +
            '<div class="bag-detail" id="bagRelicDetail"></div>' +
          '</div>' +
          '<div class="bag-ui-col">' +
            '<div class="bag-ui-col-title" id="bagPotionTitle">약병 슬롯</div>' +
            '<div class="bag-potion-slots" id="bagPotionSlots"></div>' +
            '<div class="bag-detail" id="bagPotionDetail"></div>' +
            '<div class="bag-flavor">법구는 보유하면 자동으로 적용돼요. 약병은 전투 중 소모품으로 사용할 수 있어요.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeBagUI();
    });
    overlay.querySelector(".bag-ui-close").addEventListener("click", closeBagUI);

    (document.querySelector("#game") || document.body).appendChild(overlay);

    els = {
      overlay,
      relicGrid: overlay.querySelector("#bagRelicGrid"),
      relicNav: overlay.querySelector("#bagRelicNav"),
      relicDetail: overlay.querySelector("#bagRelicDetail"),
      potionTitle: overlay.querySelector("#bagPotionTitle"),
      potionSlots: overlay.querySelector("#bagPotionSlots"),
      potionDetail: overlay.querySelector("#bagPotionDetail"),
    };
    return els;
  }

  /* ── 렌더링 ────────────────────────────────────────────────────────── */
  function render() {
    if (!els) return;
    renderRelics();
    renderPotions();
  }

  function renderRelics() {
    const relics = getRelics();

    if (relics.length === 0) {
      els.relicGrid.innerHTML = '<div class="bag-empty-msg">보유한 법구가 없습니다.</div>';
      els.relicGrid.style.gridTemplateColumns = "1fr";
      els.relicGrid.style.gridTemplateRows = "1fr";
      els.relicNav.innerHTML = "";
      els.relicDetail.innerHTML = '<div class="bag-detail-placeholder">법구를 얻으면 이곳에서 확인할 수 있어요.</div>';
      return;
    }
    els.relicGrid.style.gridTemplateColumns = "";
    els.relicGrid.style.gridTemplateRows = "";

    const totalPages = Math.max(1, Math.ceil(relics.length / RELIC_PAGE_SIZE));
    relicPage = Math.max(0, Math.min(relicPage, totalPages - 1));
    const start = relicPage * RELIC_PAGE_SIZE;
    const pageItems = relics.slice(start, start + RELIC_PAGE_SIZE);

    let html = "";
    for (let i = 0; i < RELIC_PAGE_SIZE; i++) {
      const relic = pageItems[i];
      if (!relic) { html += '<div class="bag-relic-card empty"></div>'; continue; }
      const idx = start + i;
      html +=
        '<button type="button" class="bag-relic-card' + (idx === selectedRelicIdx ? " selected" : "") + '" data-relic-idx="' + idx + '">' +
          '<div class="bag-relic-icon">' + bagItemIconHtml(getBagRelicIcon(relic)) + '</div>' +
          '<div class="bag-relic-name">' + escapeHtml(relic.name || "") + '</div>' +
        '</button>';
    }
    els.relicGrid.innerHTML = html;
    els.relicGrid.querySelectorAll(".bag-relic-card[data-relic-idx]").forEach((card) => {
      card.addEventListener("click", () => {
        selectedRelicIdx = Number(card.dataset.relicIdx);
        render();
      });
    });

    els.relicNav.innerHTML =
      '<button type="button" id="bagRelicPrev"' + (relicPage <= 0 ? " disabled" : "") + '>‹</button>' +
      '<span>' + (relicPage + 1) + ' / ' + totalPages + '</span>' +
      '<button type="button" id="bagRelicNext"' + (relicPage >= totalPages - 1 ? " disabled" : "") + '>›</button>';
    const prevBtn = els.relicNav.querySelector("#bagRelicPrev");
    const nextBtn = els.relicNav.querySelector("#bagRelicNext");
    if (prevBtn) prevBtn.addEventListener("click", () => { relicPage--; render(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { relicPage++; render(); });

    if (selectedRelicIdx !== null && relics[selectedRelicIdx]) {
      const relic = relics[selectedRelicIdx];
      els.relicDetail.innerHTML =
        '<div class="bag-detail-name">' + escapeHtml(relic.name || "") + '</div>' +
        '<div class="bag-detail-desc">' + escapeHtml(relic.desc || relic.effectText || relic.valueText || "") + '</div>';
    } else {
      els.relicDetail.innerHTML = '<div class="bag-detail-placeholder">법구를 선택하면 효과를 확인할 수 있어요.</div>';
    }
  }

  function renderPotions() {
    const potions = getPotions();
    els.potionTitle.textContent = "약병 슬롯 " + potions.length + " / " + POTION_SLOT_COUNT;

    let html = "";
    for (let i = 0; i < POTION_SLOT_COUNT; i++) {
      const potion = potions[i];
      if (!potion) {
        html += '<div class="bag-potion-card empty"><span class="bag-potion-num">' + (i + 1) + '</span><div class="bag-potion-icon">·</div><div class="bag-potion-name">빈 슬롯</div></div>';
        continue;
      }
      html +=
        '<button type="button" class="bag-potion-card' + (i === selectedPotionIdx ? " selected" : "") + '" data-potion-idx="' + i + '">' +
          '<span class="bag-potion-num">' + (i + 1) + '</span>' +
          '<div class="bag-potion-icon">' + bagItemIconHtml(potion.emoji || "🧪") + '</div>' +
          '<div class="bag-potion-name">' + escapeHtml(potion.name || "") + '</div>' +
        '</button>';
    }
    els.potionSlots.innerHTML = html;
    els.potionSlots.querySelectorAll(".bag-potion-card[data-potion-idx]").forEach((card) => {
      card.addEventListener("click", () => {
        selectedPotionIdx = Number(card.dataset.potionIdx);
        render();
      });
    });

    if (selectedPotionIdx !== null && potions[selectedPotionIdx]) {
      const potion = potions[selectedPotionIdx];
      els.potionDetail.innerHTML =
        '<div class="bag-detail-name">' + bagItemIconHtml(potion.emoji || "🧪") + ' ' + escapeHtml(potion.name || "") + '</div>' +
        '<div class="bag-detail-desc">' + escapeHtml(potion.desc || potion.effectText || potion.valueText || "") + '</div>';
    } else {
      els.potionDetail.innerHTML = '<div class="bag-detail-placeholder">약병을 선택하면 효과를 확인할 수 있어요.</div>';
    }
  }

  /* ── 열기/닫기 ─────────────────────────────────────────────────────── */
  function openBagUI(options) {
    ensureUI();
    // 호출 화면 구분: 맵에서 열 때만 map-mode 적용
    const mode = options && options.mode ? options.mode : "";
    const isMapMode = mode === "map";
    relicPage = 0;
    selectedRelicIdx = null;
    selectedPotionIdx = null;
    // 맵에서 열릴 때는 맵 오버레이보다 위에 표시
    els.overlay.classList.toggle("map-mode", isMapMode);
    render();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
  }

  function closeBagUI() {
    if (!els) return;
    els.overlay.classList.remove("show");
    els.overlay.classList.remove("map-mode");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  window.BAG_UI_OPEN = openBagUI;
  window.BAG_UI_CLOSE = closeBagUI;
})();
