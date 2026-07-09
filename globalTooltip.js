"use strict";

(function () {
  const SELECTOR = "[data-tooltip], [data-global-tooltip], [data-tooltip-title]";
  const SKIN_OPTION_SELECTOR = ".menu-profile-popup .menu-profile-option";
  const SPIRIT_PATH_CARD_PREVIEW_SELECTOR = ".spirit-path-preview-item";
  /* 카드형 결과 항목(.random-item-result-card-frame)은 카드 앞면이 이미 이름/설명을
     보여주므로 제외 — tooltip.js의 카드 용어 툴팁이 별도로 처리한다 */
  const RANDOM_ITEM_RESULT_CARD_SELECTOR = ".random-item-result-card:not(.random-item-result-card-frame)";
  /* 법구/약병 획득·제거 결과 카드(.random-item-result-card-face.item-frame-card)는
     아이콘+이름만 보여주고 하단 설명이 없어, 이름으로 RELIC_DB/POTION_DB를 조회해
     설명을 툴팁으로 보여준다 */
  const RANDOM_ITEM_RESULT_ITEM_FACE_SELECTOR = ".random-item-result-card-face.item-frame-card";
  /* 상점/가방의 법구·약병은 화면에 설명이 이미 보이므로 여기서는 처리하지 않는다.
     생소한 용어 보충 설명은 tooltip.js의 카드 용어 툴팁이 담당한다
     (.shop-product-item-frame, .shop-detail-item-preview, .bag-detail) */
  /* 월영당(BM 스토어) 스킨 프리뷰 대상: 스킨 탭 카드 + 추천 탭의 마법무녀 스킨(한정) 카드.
     추천 탭의 다른 카드에는 툴팁을 붙이지 않는다. 주문 팩(.bm-store-product)은
     덱 프리뷰 패널 전용 로직(하단)에서 별도로 처리하므로 여기 포함하지 않는다 */
  const BM_SKIN_CARD_SELECTOR = ".bm-store-skin-card, .bm-recommended-wide-card, .bm-recommended-small-card";
  /* 전투 요약(여정 요약) / 전투 상세(여정 상세) 화면 대상 */
  const RUN_SUMMARY_ROW_SELECTOR = ".rr-summary-row";
  const RUN_SCORE_BREAKDOWN_ITEM_SELECTOR = ".rr-score-breakdown-grid > div";
  const RUN_ITEM_CARD_SELECTOR = ".rr-item-card";
  /* 도감(코덱스) 법구/약병 그리드 타일: 아이콘+이름만 표시되고 설명이 없어
     hover 시 이름으로 RELIC_DB/POTION_DB를 조회해 설명을 보여준다 */
  const CODEX_ITEM_CARD_SELECTOR = ".codex-item-card";
  const GAP = 10;
  let tooltipEl = null;
  let activeAnchor = null;
  let hideTimer = null;

  function ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.id = "globalTooltip";
    tooltipEl.className = "global-tooltip";
    tooltipEl.setAttribute("role", "tooltip");
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function findAnchor(target) {
    if (!target || typeof target.closest !== "function") return null;
    const anchor = target.closest(SELECTOR) || target.closest(SKIN_OPTION_SELECTOR) || target.closest(SPIRIT_PATH_CARD_PREVIEW_SELECTOR) ||
      target.closest(RANDOM_ITEM_RESULT_CARD_SELECTOR) || target.closest(RANDOM_ITEM_RESULT_ITEM_FACE_SELECTOR) ||
      target.closest(BM_SKIN_CARD_SELECTOR) || target.closest(RUN_SUMMARY_ROW_SELECTOR) ||
      target.closest(RUN_SCORE_BREAKDOWN_ITEM_SELECTOR) || target.closest(RUN_ITEM_CARD_SELECTOR) ||
      target.closest(CODEX_ITEM_CARD_SELECTOR);
    if (!anchor || anchor.dataset.tooltipDisabled === "true") return null;
    return anchor;
  }

  function getCardDbEntryByName(name) {
    if (!name || typeof CARD_DB !== "object" || !CARD_DB) return null;
    const key = Object.keys(CARD_DB).find(k => CARD_DB[k] && CARD_DB[k].name === name);
    return key ? CARD_DB[key] : null;
  }

  function getRelicOrPotionDbEntryByName(name) {
    if (!name) return null;
    const relicDb = typeof RELIC_DB !== "undefined" && Array.isArray(RELIC_DB) ? RELIC_DB : null;
    const potionDb = typeof POTION_DB !== "undefined" && Array.isArray(POTION_DB) ? POTION_DB : null;
    const relic = relicDb && relicDb.find(item => item && item.name === name);
    if (relic) return relic;
    return potionDb && potionDb.find(item => item && item.name === name) || null;
  }

  /* tooltip.js의 CARD_TERM_INFO 용어 사전(주문 카드 호버 툴팁이 쓰는 것과 동일)을
     재사용해, 효과 설명 안의 어려운 용어(성불 표식/동요/균열 등)에 대한 부연 설명을
     본문 뒤에 이어붙인다. 새 UI 없이 기존 body(pre-wrap 텍스트) 안에서 처리한다. */
  function appendEffectKeywordExplanations(descText, includeIcon) {
    if (typeof window.getEffectKeywordTerms !== "function") return "";
    const terms = window.getEffectKeywordTerms(descText) || [];
    if (!terms.length) return "";
    return "\n\n" + terms.map(t => (includeIcon && t.icon ? t.icon + " " : "") + t.name + " — " + t.desc).join("\n");
  }

  function getItemDataByDisplayedName(anchor) {
    const nameEl = anchor.querySelector(".random-item-result-name, .card-name-text, .shop-product-name, .shop-detail-name, .rr-item-card-name, .item-name-text");
    const name = nameEl ? nameEl.textContent.trim() : "";
    if (!name) return null;

    const card = getCardDbEntryByName(name);
    if (card) {
      const icon = card.emoji ? " " + card.emoji : "";
      const desc = card.desc || "";
      return { title: card.name + icon, body: desc + appendEffectKeywordExplanations(desc, true) };
    }

    /* 법구/약병 툴팁에는 이모지를 붙이지 않는다 */
    const item = getRelicOrPotionDbEntryByName(name);
    if (item) {
      const desc = item.desc || "";
      return { title: item.name, body: desc + appendEffectKeywordExplanations(desc, false) };
    }

    return null;
  }

  /* 월영당 상품(BM 스토어) 데이터 조회 헬퍼. 카드 DOM은 카드 종류별로 마크업이 달라
     이미지/설명이 누락된 경우가 있어(예: 추천 탭 소형 카드는 큰 프리뷰 이미지 대신 프로필
     아이콘만 표시), data-product-id로 window.VIBERUN_BM_STORE_SERVICE의 원본 상품 데이터를
     읽기 전용으로 조회해 항상 완전한 이름/설명/이미지를 사용한다 */
  function findBmStoreProductById(productId) {
    if (!productId) return null;
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if (!service || typeof service.getProductsByTab !== "function") return null;
    const tabs = ["recommended", "package", "order_pack", "moon_charge"];
    for (let i = 0; i < tabs.length; i++) {
      const products = service.getProductsByTab(tabs[i]) || [];
      const found = products.find(p => p && p.id === productId);
      if (found) return found;
    }
    return null;
  }

  function getBmCardProductId(anchor) {
    const btn = anchor.querySelector(".bm-store-buy-btn");
    return btn && btn.dataset ? btn.dataset.productId : "";
  }

  /* 월영당 스킨 프리뷰 툴팁 데이터. 스킨 탭 카드/추천 탭의 마법무녀 스킨(한정)/월영학당
     전학생(프리미엄) 카드가 모두 대상이며, 상품 데이터를 그대로 써서 항상 스킨 탭과
     동일한 전신 프리뷰 이미지를 보여준다. 판매 기간(salePeriodText)이 있으면 별도 줄로 붙인다 */
  function getBmSkinCardData(anchor) {
    const product = findBmStoreProductById(getBmCardProductId(anchor));
    if (!product || product.rewardType !== "character_skin") return null;

    return {
      isBmPreview: true,
      title: product.name || "",
      grade: product.gradeLabel || product.badge || "",
      body: [product.skinTypeName || "", product.description || "", product.salePeriodText || ""].filter(Boolean).join("\n"),
      imageSrc: product.previewImage || ""
    };
  }

  /* 전투 요약("여정 요약") 화면 각 행 설명. ACT1_점수_달빛조각_통합기획서_v4.0 §1 기준 */
  const RUN_SUMMARY_TOOLTIPS = [
    { match: "최종 여정 점수", title: "최종 여정 점수",
      body: "구역 진행, ACT1 완주, 몬스터 처치, 전투 수행, 보스 종료 상태, 여정 행동 점수를 모두 합산한 이번 여정의 최종 점수입니다." },
    { match: "달빛 조각", title: "달빛 조각",
      body: "최종 여정 점수 구간에 따라 지급되는 달빛 조각 개수입니다. 평균적인 완주 기준 약 55개이며, 점수가 높을수록 더 많은 조각을 받습니다." },
    { match: "진행한 구역 수", title: "진행한 구역 수",
      body: "이번 여정에서 밟은 구역(노드) 수입니다. 일반 전투·엘리트·이벤트·상점·휴식/신당·보물 등을 모두 포함합니다." },
    { match: "클리어 보스 수", title: "클리어 보스 수",
      body: "처치한 ACT1 보스 수입니다. 보스 처치는 +150점으로 가장 큰 전투 성취 점수입니다." },
    { match: "클리어 노멀 수", title: "클리어 노멀 수",
      /* colorizeRarityLabels가 "일반"을 자동 강조하므로, 이 툴팁만 강조를 피하려고
         두 글자 사이에 폭 없는 문자(ZWSP)를 넣어 리터럴 매치를 깬다. */
      body: "클리어한 일​반 전투 수입니다. 일​반 전투 클리어 시 +25점의 기본 진행 점수를 얻습니다." },
    { match: "클리어 엘리트 수", title: "클리어 엘리트 수",
      body: "클리어한 엘리트 전투 수입니다. 위험한 경로를 선택한 만큼 +65점의 더 높은 점수가 반영됩니다." },
    { match: "수집한 법구 수", title: "수집한 법구 수",
      body: "이번 여정에서 획득한 법구의 총 개수입니다." },
    { match: "사용한 약병 수", title: "사용한 약병 수",
      body: "이번 여정에서 사용한 약병의 총 개수입니다." }
  ];

  /* 전투 상세("여정 상세") 화면의 "여정 점수 상세" 6개 항목 설명. 같은 기획서 §2 기준 */
  const RUN_SCORE_BREAKDOWN_TOOLTIPS = {
    "구역 진행": { title: "구역 진행",
      body: "일반 전투(+25), 엘리트(+65), 이벤트(+15), 상점(+5), 휴식/신당(+10), 보물/특수 노드(+20) 등 방문한 구역에서 얻는 점수의 합입니다." },
    "ACT1 완주": { title: "ACT1 완주",
      body: "여정을 끝까지 완주하면 지급되는 +100점의 완료 보상 점수입니다." },
    "몬스터 처치": { title: "몬스터 처치",
      body: "일반 적(+3), 강화 적(+6), 엘리트 개체(+15), 보스(+40) 처치 점수입니다. 전투별 상한이 있어 몬스터 수가 많다고 무조건 유리하지는 않습니다." },
    "전투 수행": { title: "전투 수행",
      body: "무피해 클리어(+12), 최대 정신력 10% 이하 피해(+7), 25% 이하 피해(+3) 등 안정적인 전투에 주어지는 점수입니다. (ACT1 전체 최대 +100점)" },
    "보스 종료 상태": { title: "보스 종료 상태",
      body: "보스 처치 시 남은 정신력에 따라 주어지는 점수입니다. 75% 이상 +25 / 50~74% +15 / 25~49% +8점 (각 1회 한정)" },
    "여정 행동": { title: "여정 행동",
      body: "진언 강화(+3, 최대 +12), 진언 제거(+4, 최대 +8), 고위험 이벤트 성공(+15, 최대 +30) 등 여정 중 선택한 행동에 대한 점수입니다." }
  };

  function getRunSummaryRowData(anchor) {
    const labelEl = anchor.querySelector(".rr-summary-row-label");
    const label = labelEl ? labelEl.textContent.trim() : "";
    if (!label) return null;
    const entry = RUN_SUMMARY_TOOLTIPS.find(item => label.indexOf(item.match) === 0);
    return entry ? { title: entry.title, body: entry.body } : null;
  }

  function getRunScoreBreakdownItemData(anchor) {
    const labelEl = anchor.querySelector("span");
    const label = labelEl ? labelEl.textContent.trim() : "";
    return RUN_SCORE_BREAKDOWN_TOOLTIPS[label] || null;
  }

  function getTooltipData(anchor) {
    const title = anchor.dataset.tooltipTitle || "";
    const body = anchor.dataset.tooltip || anchor.dataset.globalTooltip || "";
    if (title || body) return { title, body, wide: anchor.dataset.tooltipWide === "true" };

    if (anchor.classList && (anchor.classList.contains("bm-store-skin-card") ||
      anchor.classList.contains("bm-recommended-wide-card") || anchor.classList.contains("bm-recommended-small-card"))) {
      return getBmSkinCardData(anchor);
    }

    if (anchor.classList && anchor.classList.contains("menu-profile-option") && anchor.closest(".menu-profile-popup")) {
      return { title: "프로필", body: "보유 스킨에 따라 프로필 사진을 변경할 수 있습니다." };
    }

    if (anchor.classList && anchor.classList.contains("spirit-path-preview-item")) {
      if (!anchor.dataset.spiritPathCardName) {
        const rawName = anchor.getAttribute("title");
        if (rawName) anchor.dataset.spiritPathCardName = rawName;
      }
      const card = getCardDbEntryByName(anchor.dataset.spiritPathCardName);
      if (!card) return null;
      const icon = card.emoji ? " " + card.emoji : "";
      return { title: (card.name || "") + icon, body: card.desc || "" };
    }

    if (anchor.classList && anchor.classList.contains("random-item-result-card")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.classList && anchor.classList.contains("random-item-result-card-face") && anchor.classList.contains("item-frame-card")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.classList && anchor.classList.contains("rr-summary-row")) {
      return getRunSummaryRowData(anchor);
    }

    if (anchor.classList && anchor.classList.contains("rr-item-card")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.classList && anchor.classList.contains("codex-item-card")) {
      return getItemDataByDisplayedName(anchor);
    }

    if (anchor.parentElement && anchor.parentElement.classList &&
      anchor.parentElement.classList.contains("rr-score-breakdown-grid")) {
      return getRunScoreBreakdownItemData(anchor);
    }

    return null;
  }

  function buildHtml(data) {
    if (data.isBmPreview) return buildBmPreviewHtml(data);
    const title = data.title
      ? '<span class="global-tooltip-title">' + escapeHtml(data.title) + "</span>"
      : "";
    const body = data.body
      ? '<span class="global-tooltip-body">' + colorizeRarityLabels(escapeHtml(data.body)) + "</span>"
      : "";
    return title + body;
  }

  function buildBmPreviewHtml(data) {
    const imgHtml = data.imageSrc
      ? '<img class="global-tooltip-preview-img" src="' + escapeHtml(data.imageSrc) + '" alt="" onerror="this.remove()">'
      : "";
    const title = '<span class="global-tooltip-title">' + escapeHtml(data.title) +
      (data.grade ? " · " + escapeHtml(data.grade) : "") + "</span>";
    const body = data.body
      ? '<span class="global-tooltip-body">' + escapeHtml(data.body) + "</span>"
      : "";
    return imgHtml + title + body;
  }

  function getOpenProfileSkinPopup(anchor) {
    let popup = null;
    if (anchor.classList && anchor.classList.contains("menu-profile-avatar-btn")) {
      const profileRoot = anchor.closest(".menu-profile");
      popup = profileRoot ? profileRoot.querySelector(".menu-profile-popup") : null;
    } else {
      popup = anchor.closest(".menu-profile-popup");
    }
    if (!popup || popup.hidden) return null;
    return popup;
  }

  const LEFT_SIDE_SELECTOR = ".start-mailbox-button";

  function positionTooltip(anchor) {
    const tip = ensureTooltip();
    const tipRect = tip.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    const openPopup = getOpenProfileSkinPopup(anchor);
    const monthlyPassCard = anchor.closest ? anchor.closest(".monthly-pass-claim-card") : null;
    const leftSideTarget = !openPopup && !monthlyPassCard && anchor.closest
      ? anchor.closest(LEFT_SIDE_SELECTOR)
      : null;
    const randomItemResultCard = !openPopup && !monthlyPassCard && !leftSideTarget && anchor.closest
      ? anchor.closest(".random-item-result-card")
      : null;
    const bmSkinCard = !openPopup && !monthlyPassCard && !leftSideTarget && !randomItemResultCard && anchor.closest
      ? anchor.closest(".bm-store-skin-card, .bm-recommended-wide-card")
      : null;
    /* 추천 탭 소형 카드(월영학당 전학생 등)는 화면 오른쪽 여백이 좁아 항상 카드 왼쪽에 띄운다 */
    const bmSmallSkinCard = !openPopup && !monthlyPassCard && !leftSideTarget && !randomItemResultCard && !bmSkinCard && anchor.closest
      ? anchor.closest(".bm-recommended-small-card")
      : null;
    let left;
    let top;

    if (openPopup) {
      const popupRect = openPopup.getBoundingClientRect();
      left = popupRect.right + GAP;
      top = popupRect.top + (popupRect.height - tipRect.height) / 2;
    } else if (monthlyPassCard) {
      const cardRect = monthlyPassCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (leftSideTarget) {
      const targetRect = leftSideTarget.getBoundingClientRect();
      left = targetRect.left - tipRect.width - GAP;
      top = targetRect.top + (targetRect.height - tipRect.height) / 2;
    } else if (randomItemResultCard) {
      const cardRect = randomItemResultCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      if (left + tipRect.width > vw - GAP) {
        left = cardRect.left - tipRect.width - GAP;
      }
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (bmSkinCard) {
      const cardRect = bmSkinCard.getBoundingClientRect();
      left = cardRect.right + GAP;
      if (left + tipRect.width > vw - GAP) {
        left = cardRect.left - tipRect.width - GAP;
      }
      top = cardRect.top + (cardRect.height - tipRect.height) / 2;
    } else if (bmSmallSkinCard) {
      const cardRect = bmSmallSkinCard.getBoundingClientRect();
      left = cardRect.left - tipRect.width - GAP;
      if (left < GAP) {
        left = cardRect.right + GAP;
      }
      /* 이 카드는 화면 하단부에 있어 아래쪽 여백보다 위쪽 여백이 훨씬 넓다.
         카드 중앙/상단에 맞추면 큰 프리뷰 이미지가 아래로 한참 밀려나가 보이므로,
         카드 아래쪽 라인에 맞춰 옆으로 붙이고 위쪽으로 펼쳐지게 한다 */
      top = cardRect.bottom - tipRect.height;
    } else {
      const anchorRect = anchor.getBoundingClientRect();
      left = anchorRect.left + (anchorRect.width - tipRect.width) / 2;
      top = anchorRect.bottom + GAP;

      if (top + tipRect.height > vh - GAP) {
        top = anchorRect.top - tipRect.height - GAP;
      }
    }

    left = Math.max(GAP, Math.min(left, vw - tipRect.width - GAP));
    top = Math.max(GAP, Math.min(top, vh - tipRect.height - GAP));

    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function suppressNativeTooltip(anchor) {
    if (anchor.hasAttribute("title")) {
      anchor.removeAttribute("title");
    }
  }

  function show(anchor) {
    const data = getTooltipData(anchor);
    if (!data) return;
    suppressNativeTooltip(anchor);
    window.clearTimeout(hideTimer);
    activeAnchor = anchor;
    const tip = ensureTooltip();
    tip.innerHTML = buildHtml(data);
    tip.classList.toggle("is-preview", !!data.isBmPreview);
    tip.classList.toggle("is-wide", !!data.wide);
    tip.classList.add("is-show");
    positionTooltip(anchor);
  }

  function hide() {
    activeAnchor = null;
    if (!tooltipEl) return;
    tooltipEl.classList.remove("is-show");
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hide, 60);
  }

  function refresh() {
    if (activeAnchor && tooltipEl && tooltipEl.classList.contains("is-show")) {
      positionTooltip(activeAnchor);
    }
  }

  document.addEventListener("pointerover", event => {
    const nameEl = event.target && typeof event.target.closest === "function"
      ? event.target.closest(".menu-profile-name")
      : null;
    if (nameEl) suppressNativeTooltip(nameEl);

    const anchor = findAnchor(event.target);
    if (!anchor || anchor === activeAnchor) return;
    show(anchor);
  });

  document.addEventListener("pointerout", event => {
    if (!activeAnchor) return;
    const next = event.relatedTarget;
    if (next && activeAnchor.contains(next)) return;
    scheduleHide();
  });

  document.addEventListener("focusin", event => {
    const anchor = findAnchor(event.target);
    if (anchor) show(anchor);
  });

  document.addEventListener("focusout", event => {
    if (activeAnchor && activeAnchor.contains(event.target)) scheduleHide();
  });

  document.addEventListener("pointerdown", event => {
    /* 툴팁 내부를 탭한 경우(스크롤/읽기 등)에는 닫지 않는다 */
    if (tooltipEl && tooltipEl.contains(event.target)) return;

    const avatarBtn = event.target && typeof event.target.closest === "function"
      ? event.target.closest(".menu-profile-avatar-btn")
      : null;
    if (avatarBtn) {
      hide();
      return;
    }

    const anchor = findAnchor(event.target);
    if (anchor) show(anchor);
    else hide();
  }, true);

  document.addEventListener("scroll", refresh, true);
  window.addEventListener("resize", refresh);
  window.addEventListener("blur", hide);

  function applyStartMenuProfileTooltips() {
    const avatarBtn = document.querySelector(".menu-profile-avatar-btn");
    if (avatarBtn) {
      avatarBtn.dataset.tooltipTitle = "프로필";
      avatarBtn.dataset.tooltip = "보유 스킨에 따라 프로필 사진을 변경할 수 있습니다.";
    }

    const monthlyPassCard = document.querySelector(".monthly-pass-claim-card");
    if (monthlyPassCard) {
      monthlyPassCard.dataset.tooltipTitle = "월영의 약속";
      monthlyPassCard.dataset.tooltip = "매일 보상을 확인하고 받을 수 있는 월간 보상 영역입니다.";
    }

    const codexBtn = document.querySelector(".start-codex-button");
    if (codexBtn) {
      codexBtn.dataset.tooltipTitle = "도감";
      codexBtn.dataset.tooltip = "게임 내 모든 주문, 법구, 약병 정보를 확인할 수 있습니다.";
    }

    const recordBtn = document.querySelector(".start-record-button");
    if (recordBtn) {
      recordBtn.dataset.tooltipTitle = "기록";
      recordBtn.dataset.tooltip = "플레이 기록과 진행 내역을 확인할 수 있습니다.";
    }

    const moonWallet = document.querySelector(".start-moon-wallet");
    if (moonWallet) {
      moonWallet.dataset.tooltipTitle = "달빛 조각";
      /* colorizeRarityLabels(rarityLabelColor.js)가 "희귀"를 자동 강조하므로,
         이 툴팁만 강조를 피하려고 두 글자 사이에 폭 없는 문자(ZWSP)를 넣어 리터럴 매치를 깬다. */
      moonWallet.dataset.tooltip = "희​귀 보상과 특별한 보물함을 여는 데 사용하는 유료 재화입니다.";
    }

    const mailboxBtn = document.querySelector(".start-mailbox-button");
    if (mailboxBtn) {
      mailboxBtn.dataset.tooltipTitle = "선물함";
      mailboxBtn.dataset.tooltip = "지급된 보상과 선물을 확인하고 받을 수 있는 공간입니다.";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyStartMenuProfileTooltips);
  } else {
    applyStartMenuProfileTooltips();
  }

  /* ── 월영당 달빛 조각 툴팁 ─────────────────────────────────────────────
     #bmStoreOverlay는 최초 open() 시 1회만 생성되어 재사용되므로, 생성되는
     순간을 MutationObserver로 감지해 1회만 dataset을 부여한다. 4개 탭 공통 헤더라
     탭 전환과 무관하게 항상 표시된다 */
  function applyBmStoreWalletTooltip() {
    const wallet = document.querySelector(".bm-store-wallet");
    if (!wallet || wallet.dataset.tooltipTitle) return;
    wallet.dataset.tooltipTitle = "달빛 조각";
    wallet.dataset.tooltip = "월영당에서 특별한 인연과 물품을 얻는 데 사용하는 재화입니다.";
  }

  new MutationObserver(applyBmStoreWalletTooltip)
    .observe(document.body, { childList: true, subtree: true });
  applyBmStoreWalletTooltip();

  /* ══════════════════════════════════════════════════════════════════════
     월영당 주문 팩(덱) 구매 확인 팝업 – 덱 구성 미리보기
     - bmStoreUI.js가 만드는 .bm-purchase-confirm-panel이 생성될 때, 표시된 상품명이
       deck_pack 상품과 일치하면 팝업 맨 위에 "포함 주문/법구/약병" 목록을 주입한다.
     - 주문 카드 타일(.bm-deck-preview-card)은 data-tooltip을 쓰지 않는다 — 이름/설명에
       .card-name-text/.card-desc-text 클래스를 부여해 tooltip.js의 카드 용어(키워드)
       툴팁을 그대로 재사용한다(전투 손패·상점·도감 등과 동일한 툴팁 방식).
     - 법구/약병 타일(.bm-deck-preview-item)은 카드가 아니므로 기존처럼
       data-tooltip-title/data-tooltip으로 전역 툴팁 로직을 재사용한다.
     - CARD_DB/RELIC_MASTER_DB/POTION_DB는 읽기 전용으로만 참조하며 수정하지 않는다.
     - bmStoreUI.js는 구매 확인 팝업을 열 때마다 새 DOM을 만들므로, 패널 인스턴스마다
       1회만 검사/주입되도록 dataset 마커로 중복 실행(우리 자신의 삽입이 다시 관찰되는 것)을 막는다.
     ══════════════════════════════════════════════════════════════════════ */
  function getDeckCards(unlockKeyword) {
    if (!unlockKeyword || typeof CARD_DB !== "object" || !CARD_DB) return [];
    return Object.keys(CARD_DB)
      .map(key => CARD_DB[key])
      .filter(card => card && card.attr === unlockKeyword);
  }

  /* RELIC_MASTER_DB의 deck 필드는 "한풀이"/"굿판"처럼 접미사 "덱" 없이 저장돼 있어
     상품의 unlockKeyword("한풀이 덱"/"굿판 덱")와 그대로 비교하면 항상 매칭에 실패한다.
     끝의 "덱"을 떼어낸 기준 이름으로 비교한다 */
  function getDeckRelics(unlockKeyword) {
    const baseName = (unlockKeyword || "").replace(/\s*덱\s*$/, "").trim();
    if (!baseName || typeof RELIC_MASTER_DB === "undefined" || !Array.isArray(RELIC_MASTER_DB)) return [];
    return RELIC_MASTER_DB.filter(relic => relic && relic.deck === baseName);
  }

  function getDeckPotions(deckId) {
    if (!deckId || typeof POTION_DB === "undefined" || !Array.isArray(POTION_DB)) return [];
    return POTION_DB.filter(potion => potion && potion.deckId === deckId);
  }

  function findDeckPackProductByName(name) {
    if (!name) return null;
    const service = window.VIBERUN_BM_STORE_SERVICE;
    if (!service || typeof service.getProductsByTab !== "function") return null;
    const tabs = ["order_pack", "recommended"];
    for (let i = 0; i < tabs.length; i++) {
      const products = service.getProductsByTab(tabs[i]) || [];
      const found = products.find(p => p && p.rewardType === "deck_pack" && p.name === name);
      if (found) return found;
    }
    return null;
  }

  /* deckViewer.js의 카드 프레임 경로 규칙(assets/card_frames/card-frame-{type}-{rarity}.png)을
     그대로 참고해 실제 카드 에셋(프레임 + 원화/이모지)으로 미니 카드를 렌더링한다 */
  function getDeckCardFramePath(card) {
    if (card && card.type === "status") return "assets/card_frames/card-frame-status.png";
    const type = card && ["attack", "defense", "skill"].includes(card.type) ? card.type : "skill";
    const rarity = card && card.rarity ? card.rarity : "common";
    return "assets/card_frames/card-frame-" + type + "-" + rarity + ".png";
  }

  /* 카드 프레임 PNG 위에 비용/이름/설명을 전부 겹쳐 그린다. 설명이 길어 원래 카드 비율
     그대로는 하단 설명 영역이 너무 좁아 잘렸으므로, 설명 영역 자체를 훨씬 크게 잡고(카드
     높이의 절반 가까이) 그 뒤에 반투명 크림색 판을 깔아 원화 위에서도 잘 읽히게 했다.
     카드 자체도 2열로 키워 절대 크기를 키웠다. hover 시 뜨는 툴팁은 여기서 만들지 않는다
     — 이름/설명 텍스트에 .card-name-text/.card-desc-text 클래스를 얹어 전투 손패 등
     다른 화면과 동일하게 tooltip.js의 카드 용어(키워드) 툴팁을 그대로 재사용한다
     (tooltip.js의 DECK_OR_REWARD_CARD_SELECTOR에 .bm-deck-preview-card 등록됨) */
  function buildDeckCardTile(card) {
    const visualHtml = card.art
      ? '<img class="bm-deck-preview-card-art" src="' + escapeHtml(card.art) + '" alt="" onerror="this.remove()">'
      : '<span class="bm-deck-preview-card-emoji">' + escapeHtml(card.emoji || "🃏") + "</span>";
    return (
      '<div class="bm-deck-preview-card">' +
        '<div class="bm-deck-preview-card-visual">' +
          visualHtml +
          '<img class="bm-deck-preview-card-frame" src="' + escapeHtml(getDeckCardFramePath(card)) + '" alt="" onerror="this.style.display=&quot;none&quot;">' +
          '<div class="bm-deck-preview-card-cost">' + escapeHtml(card.cost != null ? card.cost : "") + "</div>" +
          '<div class="bm-deck-preview-card-title card-name-text">' + escapeHtml(card.name || "") + "</div>" +
          '<div class="bm-deck-preview-card-desc card-desc-text">' + escapeHtml(card.desc || "") + "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* 법구/약병 타일: 실제 아이콘 에셋(법구는 RELIC_ICON_PATHS, 약병은 POTION_ICON_PATHS/iconImage)을
     쓰고, 이미지가 없거나 로드에 실패하면 이모지로 자연스럽게 대체된다(이모지를 항상 배경에 깔고
     이미지가 로드되면 위에 덮는 방식) */
  function buildDeckItemTile(item, iconSrc) {
    const imgHtml = iconSrc
      ? '<img class="bm-deck-preview-item-icon" src="' + escapeHtml(iconSrc) + '" alt="" onerror="this.remove()">'
      : "";
    const tooltipTitle = escapeHtml(item.name || "");
    return (
      '<div class="bm-deck-preview-item" data-tooltip-title="' + tooltipTitle + '" data-tooltip="' + escapeHtml(item.desc || "") + '">' +
        '<div class="bm-deck-preview-item-visual">' +
          '<span class="bm-deck-preview-item-emoji">' + escapeHtml(item.emoji || "❔") + "</span>" +
          imgHtml +
        "</div>" +
        '<span class="bm-deck-preview-item-name">' + escapeHtml(item.name || "") + "</span>" +
      "</div>"
    );
  }

  function buildDeckSectionHtml(labelText, tilesHtml, gridModifier) {
    if (!tilesHtml) return "";
    return (
      '<div class="bm-purchase-deck-section">' +
        '<div class="bm-purchase-deck-section-title">' + escapeHtml(labelText) + "</div>" +
        '<div class="bm-purchase-deck-grid ' + gridModifier + '">' + tilesHtml + "</div>" +
      "</div>"
    );
  }

  function buildDeckCompositionHtml(product) {
    const cards = getDeckCards(product.unlockKeyword);
    const relics = getDeckRelics(product.unlockKeyword);
    const potions = getDeckPotions(product.deckPackId);

    if (!cards.length && !relics.length && !potions.length) {
      return (
        '<div class="bm-purchase-deck-preview">' +
          '<div class="bm-purchase-deck-scroll">' +
            '<div class="bm-deck-preview-empty">포함 구성 정보를 불러올 수 없습니다.</div>' +
          "</div>" +
        "</div>"
      );
    }

    const sections =
      buildDeckSectionHtml("포함 주문 (" + cards.length + ")", cards.map(buildDeckCardTile).join(""), "bm-purchase-deck-grid--cards") +
      buildDeckSectionHtml("포함 법구 (" + relics.length + ")",
        relics.map(relic => buildDeckItemTile(relic, typeof RELIC_ICON_PATHS === "object" && RELIC_ICON_PATHS ? RELIC_ICON_PATHS[relic.id] : "")).join(""),
        "bm-purchase-deck-grid--items") +
      buildDeckSectionHtml("포함 약병 (" + potions.length + ")",
        potions.map(potion => buildDeckItemTile(potion, potion.iconImage || (typeof POTION_ICON_PATHS === "object" && POTION_ICON_PATHS ? POTION_ICON_PATHS[potion.id] : "") || "")).join(""),
        "bm-purchase-deck-grid--items");

    return '<div class="bm-purchase-deck-preview"><div class="bm-purchase-deck-scroll">' + sections + "</div></div>";
  }

  function tryInjectDeckPreview() {
    const panel = document.querySelector(".bm-purchase-confirm-panel");
    if (!panel || panel.dataset.deckPreviewChecked === "true") return;
    panel.dataset.deckPreviewChecked = "true";

    const nameEl = panel.querySelector(".bm-purchase-confirm-message strong");
    const name = nameEl ? nameEl.textContent.trim() : "";
    const product = findDeckPackProductByName(name);
    if (!product) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildDeckCompositionHtml(product);
    const titleEl = panel.querySelector(".bm-purchase-confirm-title");
    if (titleEl) panel.insertBefore(wrapper.firstChild, titleEl);
    else panel.insertBefore(wrapper.firstChild, panel.firstChild);
    /* bmStore.css의 기본 팝업 폭(min(70cqw,44cqh,92vw))은 카드 목록이 들어가기엔 좁아
       전용 클래스로 이 팝업만 더 넓게 늘린다 */
    panel.classList.add("bm-has-deck-preview");
  }

  new MutationObserver(tryInjectDeckPreview)
    .observe(document.body, { childList: true, subtree: true });

  window.GlobalTooltip = {
    hide,
    refresh,
    showForElement: show
  };
})();
