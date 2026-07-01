"use strict";
/* =========================================================================
   정리하기 - 카드 제거 UI (prayerCardRemove.js)
   기획서: 기도터 UI 통합 기획서 - 6장 카드 제거 UI

   기존 "보유 카드" UI(deckViewer.js)의 구도(타입/속성 필터, 검색, 정렬,
   카드 그리드)를 따르되, deckViewer.js는 건드리지 않고 전용 화면을 새로
   그린다. 대상 데이터는 전투 사이에 유지되는 STARTER_DECK(실제 보유 덱)이다.

   restNode.js의 "정리하기" 확정 시 window.PRAYER_CARD_REMOVE_OPEN()을 호출한다.
   카드 리세마라 방지를 위해 취소/뒤로가기는 제공하지 않는다 - 카드 1장을
   선택해 "제거 완료"를 눌러야만 닫히며, 닫히면 곧바로 맵 선택으로 돌아간다.
   ========================================================================= */

(function () {
  const TYPE_FILTERS = [
    { id: "all", label: "모든 타입" },
    { id: "attack", label: "정화(공격)" },
    { id: "defense", label: "결계(방어)" },
    { id: "skill", label: "스킬" },
  ];

  let els = null;
  let selectedKey = null;
  let typeFilter = "all";
  let attrFilter = "all";
  let searchTerm = "";
  let sortType = "order"; // order | name | cost
  let sortDir = "desc";

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function getDeck() {
    return typeof STARTER_DECK !== "undefined" ? STARTER_DECK : [];
  }

  /* 동일 카드ID를 묶어 보유 수량과 최초 등장 순서를 함께 기록한다 */
  function getUniqueEntries() {
    const deck = getDeck();
    const map = new Map();
    deck.forEach((key, idx) => {
      if (!map.has(key)) map.set(key, { key, count: 0, order: idx });
      map.get(key).count++;
    });
    return Array.from(map.values());
  }

  function getAttrOptions() {
    const attrs = new Set();
    getUniqueEntries().forEach((entry) => {
      const c = typeof CARD_DB !== "undefined" ? CARD_DB[entry.key] : null;
      if (c && c.attr) attrs.add(c.attr);
    });
    return ["all", ...Array.from(attrs)];
  }

  function applyFiltersAndSort(entries) {
    const term = searchTerm.trim().toLowerCase();
    let list = entries.filter((entry) => {
      const c = typeof CARD_DB !== "undefined" ? CARD_DB[entry.key] : null;
      if (!c) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (attrFilter !== "all" && c.attr !== attrFilter) return false;
      if (term && !c.name.toLowerCase().includes(term)) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = list.slice().sort((a, b) => {
      const ca = CARD_DB[a.key], cb = CARD_DB[b.key];
      if (sortType === "name") return dir * ca.name.localeCompare(cb.name, "ko");
      if (sortType === "cost") return dir * (ca.cost - cb.cost);
      return dir * (a.order - b.order);
    });
    return list;
  }

  /* ── 스타일 주입 ────────────────────────────────────────────────────── */
  function ensureStyles() {
    if (document.getElementById("prayerCardRemoveStyles")) return;
    const style = document.createElement("style");
    style.id = "prayerCardRemoveStyles";
    style.textContent =
      ".pcr-overlay{--pcr-cream:#faf2e2;--pcr-beige:#ece0c6;--pcr-beige-deep:#cbb480;--pcr-gold:#dba53f;--pcr-gold-deep:#a97a1f;--pcr-red:#c94a3d;--pcr-red-deep:#a82e2e;--pcr-green-deep:#357049;--pcr-ink:#4a3a26;--pcr-ink-soft:#8a765a;" +
        "position:absolute;left:0;right:0;top:12.9cqh;bottom:0;z-index:70;display:none;place-items:center;" +
        "background:rgba(30,20,10,.45);backdrop-filter:blur(3px);opacity:0;transition:opacity .2s ease;}" +
      ".pcr-overlay.show{display:grid;opacity:1;}" +
      ".pcr-panel{position:relative;width:min(88cqw,112cqh);max-height:80cqh;display:flex;flex-direction:column;gap:1cqh;padding:1.7cqh 1.9cqw;" +
        "background:radial-gradient(ellipse at 30% 15%,var(--pcr-cream) 0%,var(--pcr-beige) 62%,var(--pcr-beige-deep) 100%);" +
        "border:0.3cqh solid var(--pcr-gold);border-radius:1.6cqh;box-shadow:0 2cqh 4cqh rgba(30,20,10,.5),inset 0 0 3cqh rgba(255,250,230,.5);color:var(--pcr-ink);}" +
      ".pcr-title{font-size:2.6cqh;font-weight:900;}" +
      ".pcr-guide{font-size:1.4cqh;font-weight:700;color:var(--pcr-ink-soft);}" +
      ".pcr-toolbar{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:.8cqw;}" +
      ".pcr-toolbar select,.pcr-toolbar input{height:3.6cqh;border-radius:.8cqh;border:0.16cqh solid var(--pcr-beige-deep);" +
        "background:#fff;color:var(--pcr-ink);font:inherit;font-size:1.3cqh;padding:0 .6cqw;}" +
      ".pcr-toolbar input{flex:1;min-width:12cqw;}" +
      ".pcr-count{font-size:1.3cqh;font-weight:800;color:var(--pcr-ink-soft);flex:none;}" +
      ".pcr-body{flex:1;min-height:0;display:grid;grid-template-columns:1fr 20cqw;gap:1.2cqw;}" +
      ".pcr-grid{min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(4,1fr);gap:1cqh;align-content:start;padding-right:.3cqw;}" +
      ".pcr-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:.5cqh;padding:1.2cqh .7cqw;" +
        "background:rgba(255,255,255,.7);border:0.2cqh solid var(--pcr-beige-deep);border-radius:1.2cqh;" +
        "cursor:pointer;font:inherit;color:var(--pcr-ink);transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;}" +
      ".pcr-card:hover{transform:translateY(-.3cqh);border-color:var(--pcr-gold);}" +
      ".pcr-card.selected{border-color:var(--pcr-red);box-shadow:0 0 0 0.2cqh rgba(201,74,61,.35);background:rgba(255,245,244,.95);}" +
      ".pcr-card-cost{position:absolute;top:.4cqh;left:.5cqw;width:2.6cqh;height:2.6cqh;border-radius:50%;display:grid;place-items:center;" +
        "background:#3f8fe0;color:#fff;font-weight:900;font-size:1.15cqh;}" +
      ".pcr-card-count{position:absolute;top:.4cqh;right:.5cqw;font-size:1.1cqh;font-weight:900;color:var(--pcr-gold-deep);" +
        "background:rgba(255,255,255,.85);border-radius:.7cqh;padding:.1cqh .5cqw;}" +
      ".pcr-card-check{position:absolute;top:-.6cqh;right:-.6cqh;width:2.2cqh;height:2.2cqh;border-radius:50%;background:var(--pcr-red);" +
        "color:#fff;display:none;align-items:center;justify-content:center;font-size:1.3cqh;font-weight:900;}" +
      ".pcr-card.selected .pcr-card-check{display:flex;}" +
      ".pcr-card-name{margin-top:1.6cqh;font-size:1.45cqh;font-weight:900;text-align:center;}" +
      ".pcr-card-art{font-size:3cqh;line-height:1;}" +
      ".pcr-card-type{font-size:1.05cqh;font-weight:800;color:#fff;padding:.1cqh .7cqw;border-radius:.7cqh;}" +
      ".pcr-card-type.attack{background:#e3574e;} .pcr-card-type.defense{background:#3f8fe0;} .pcr-card-type.skill{background:#4bb07a;}" +
      ".pcr-card-desc{font-size:1.1cqh;color:var(--pcr-ink-soft);text-align:center;font-weight:700;line-height:1.3;white-space:pre-line;}" +
      ".pcr-empty{grid-column:1/-1;text-align:center;color:var(--pcr-ink-soft);font-size:1.4cqh;font-weight:700;padding:2cqh 0;}" +
      ".pcr-side{display:flex;flex-direction:column;gap:.9cqh;}" +
      ".pcr-side-box{background:rgba(255,255,255,.55);border:0.16cqh solid var(--pcr-beige-deep);border-radius:1.1cqh;padding:.9cqh .9cqw;display:flex;flex-direction:column;gap:.4cqh;}" +
      ".pcr-side-title{font-size:1.2cqh;font-weight:900;color:var(--pcr-gold-deep);}" +
      ".pcr-selected-name{font-size:1.5cqh;font-weight:900;}" +
      ".pcr-selected-desc{font-size:1.2cqh;color:var(--pcr-ink-soft);font-weight:700;white-space:pre-line;line-height:1.4;}" +
      ".pcr-selected-placeholder{font-size:1.2cqh;color:var(--pcr-ink-soft);font-weight:700;margin:auto;text-align:center;}" +
      ".pcr-deck-count{font-size:2.1cqh;font-weight:900;text-align:center;display:flex;align-items:center;justify-content:center;gap:.4cqw;}" +
      ".pcr-deck-count .arrow{color:var(--pcr-ink-soft);font-size:1.5cqh;}" +
      ".pcr-deck-count b{color:var(--pcr-red-deep);}" +
      ".pcr-warning{font-size:1.15cqh;font-weight:800;color:var(--pcr-red-deep);text-align:center;}" +
      ".pcr-actions{flex:none;display:flex;justify-content:center;}" +
      ".pcr-btn{min-width:18cqw;height:5cqh;border-radius:1.2cqh;font-size:1.9cqh;font-weight:900;cursor:pointer;font:inherit;" +
        "border:0.2cqh solid var(--pcr-green-deep);background:linear-gradient(180deg,#7fbf8a,#4f9c62);color:#fff;}" +
      ".pcr-btn:disabled{filter:grayscale(.5) brightness(.92);cursor:not-allowed;opacity:.7;}";
    document.head.appendChild(style);
  }

  /* ── DOM 생성 ──────────────────────────────────────────────────────── */
  function ensureUI() {
    if (els) return els;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.id = "prayerCardRemoveOverlay";
    overlay.className = "pcr-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const typeOptionsHtml = TYPE_FILTERS.map((t) => '<option value="' + t.id + '">' + t.label + '</option>').join("");

    overlay.innerHTML =
      '<div class="pcr-panel" role="dialog" aria-modal="true" aria-labelledby="pcrTitle">' +
        '<div class="pcr-title" id="pcrTitle">카드 제거</div>' +
        '<div class="pcr-guide">제거할 카드 1장을 선택하세요</div>' +
        '<div class="pcr-toolbar">' +
          '<span class="pcr-count" id="pcrCount"></span>' +
          '<select id="pcrTypeFilter">' + typeOptionsHtml + '</select>' +
          '<select id="pcrAttrFilter"></select>' +
          '<input type="text" id="pcrSearch" placeholder="카드 이름 검색">' +
          '<select id="pcrSortType">' +
            '<option value="order">최신순</option>' +
            '<option value="name">이름순</option>' +
            '<option value="cost">코스트순</option>' +
          '</select>' +
          '<select id="pcrSortDir">' +
            '<option value="desc">내림차순</option>' +
            '<option value="asc">오름차순</option>' +
          '</select>' +
        '</div>' +
        '<div class="pcr-body">' +
          '<div class="pcr-grid" id="pcrGrid"></div>' +
          '<div class="pcr-side">' +
            '<div class="pcr-side-box">' +
              '<div class="pcr-side-title">선택한 카드</div>' +
              '<div id="pcrSelectedInfo"></div>' +
            '</div>' +
            '<div class="pcr-side-box">' +
              '<div class="pcr-side-title">덱 카드 수</div>' +
              '<div class="pcr-deck-count" id="pcrDeckCount"></div>' +
            '</div>' +
            '<div class="pcr-warning">⚠ 제거 후 되돌릴 수 없어요.</div>' +
          '</div>' +
        '</div>' +
        '<div class="pcr-actions">' +
          '<button type="button" class="pcr-btn" id="pcrConfirm" disabled>제거 완료</button>' +
        '</div>' +
      '</div>';

    overlay.querySelector("#pcrTypeFilter").addEventListener("change", (e) => { typeFilter = e.target.value; render(); });
    overlay.querySelector("#pcrAttrFilter").addEventListener("change", (e) => { attrFilter = e.target.value; render(); });
    overlay.querySelector("#pcrSearch").addEventListener("input", (e) => { searchTerm = e.target.value; render(); });
    overlay.querySelector("#pcrSortType").addEventListener("change", (e) => { sortType = e.target.value; render(); });
    overlay.querySelector("#pcrSortDir").addEventListener("change", (e) => { sortDir = e.target.value; render(); });
    overlay.querySelector("#pcrConfirm").addEventListener("click", confirmRemove);

    (document.querySelector("#game") || document.body).appendChild(overlay);

    els = {
      overlay,
      grid: overlay.querySelector("#pcrGrid"),
      count: overlay.querySelector("#pcrCount"),
      attrFilterSelect: overlay.querySelector("#pcrAttrFilter"),
      selectedInfo: overlay.querySelector("#pcrSelectedInfo"),
      deckCount: overlay.querySelector("#pcrDeckCount"),
      confirm: overlay.querySelector("#pcrConfirm"),
    };
    return els;
  }

  function cardHtml(entry) {
    const c = CARD_DB[entry.key];
    const label = typeof typeLabel === "function" ? typeLabel(c.type) : c.type;
    return (
      '<button type="button" class="pcr-card' + (entry.key === selectedKey ? " selected" : "") + '" data-key="' + entry.key + '">' +
        '<div class="pcr-card-cost">' + c.cost + '</div>' +
        '<div class="pcr-card-count">x' + entry.count + '</div>' +
        '<div class="pcr-card-check">✓</div>' +
        '<div class="pcr-card-name">' + escapeHtml(c.name) + '</div>' +
        '<div class="pcr-card-art">' + escapeHtml(c.emoji) + '</div>' +
        '<div class="pcr-card-type ' + c.type + '">' + escapeHtml(label) + '</div>' +
        '<div class="pcr-card-desc">' + escapeHtml(c.desc) + '</div>' +
      '</button>'
    );
  }

  function renderAttrFilterOptions() {
    const options = getAttrOptions();
    els.attrFilterSelect.innerHTML = options.map((id) =>
      '<option value="' + id + '">' + (id === "all" ? "모든 속성" : escapeHtml(id)) + '</option>'
    ).join("");
    if (!options.includes(attrFilter)) attrFilter = "all";
    els.attrFilterSelect.value = attrFilter;
  }

  function render() {
    if (!els) return;
    const deck = getDeck();
    const allEntries = getUniqueEntries();
    renderAttrFilterOptions();

    els.count.textContent = "보유 카드 " + deck.length + "장 / " + allEntries.length + "종류";

    if (allEntries.length === 0) {
      els.grid.innerHTML = '<div class="pcr-empty">보유한 카드가 없습니다.</div>';
    } else {
      const list = applyFiltersAndSort(allEntries);
      els.grid.innerHTML = list.length
        ? list.map(cardHtml).join("")
        : '<div class="pcr-empty">조건에 맞는 카드가 없습니다.</div>';
      els.grid.querySelectorAll(".pcr-card[data-key]").forEach((btn) => {
        btn.addEventListener("click", () => selectCard(btn.dataset.key));
      });
    }

    updateSidePanels(deck.length);
  }

  function selectCard(key) {
    if (typeof CARD_DB === "undefined" || !CARD_DB[key]) return;
    selectedKey = key;
    els.confirm.disabled = false;
    render();
  }

  function updateSidePanels(deckLength) {
    const card = selectedKey && typeof CARD_DB !== "undefined" ? CARD_DB[selectedKey] : null;
    els.selectedInfo.innerHTML = card
      ? '<div class="pcr-selected-name">' + escapeHtml(card.emoji) + ' ' + escapeHtml(card.name) + '</div>' +
        '<div class="pcr-selected-desc">' + escapeHtml(card.desc) + '</div>'
      : '<div class="pcr-selected-placeholder">카드를 선택하면 상세 정보를 확인할 수 있어요.</div>';

    const next = card ? Math.max(0, deckLength - 1) : deckLength;
    els.deckCount.innerHTML = deckLength + ' <span class="arrow">→</span> <b>' + next + '</b>';
  }

  /* ── 확정 (취소 없음 - 반드시 카드를 제거해야 맵으로 복귀) ───────────── */
  function confirmRemove() {
    if (!selectedKey) return;
    const deck = getDeck();
    const idx = deck.indexOf(selectedKey);
    if (idx === -1) return;
    const card = typeof CARD_DB !== "undefined" ? CARD_DB[selectedKey] : null;
    deck.splice(idx, 1);
    if (typeof renderHud === "function") renderHud();
    if (typeof toast === "function" && card) toast(card.name + " 카드를 덱에서 제거했습니다.");

    if (els) {
      els.overlay.classList.remove("show");
      els.overlay.setAttribute("aria-hidden", "true");
    }
    if (typeof resolvePrayerNode === "function") resolvePrayerNode();
  }

  function openCardRemove() {
    ensureUI();
    selectedKey = null;
    typeFilter = "all";
    attrFilter = "all";
    searchTerm = "";
    sortType = "order";
    sortDir = "desc";
    els.overlay.querySelector("#pcrTypeFilter").value = "all";
    els.overlay.querySelector("#pcrSearch").value = "";
    els.overlay.querySelector("#pcrSortType").value = "order";
    els.overlay.querySelector("#pcrSortDir").value = "desc";
    els.confirm.disabled = true;
    render();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
  }

  window.PRAYER_CARD_REMOVE_OPEN = openCardRemove;
})();
