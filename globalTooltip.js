"use strict";

(function () {
  const SELECTOR = "[data-tooltip], [data-global-tooltip], [data-tooltip-title]";
  const SKIN_OPTION_SELECTOR = ".menu-profile-popup .menu-profile-option";
  const SPIRIT_PATH_CARD_PREVIEW_SELECTOR = ".spirit-path-preview-item";
  const RANDOM_ITEM_RESULT_CARD_SELECTOR = ".random-item-result-card";
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
    const anchor = target.closest(SELECTOR) || target.closest(SKIN_OPTION_SELECTOR) || target.closest(SPIRIT_PATH_CARD_PREVIEW_SELECTOR) || target.closest(RANDOM_ITEM_RESULT_CARD_SELECTOR);
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

  function getRandomItemResultCardData(anchor) {
    const nameEl = anchor.querySelector(".random-item-result-name");
    const name = nameEl ? nameEl.textContent.trim() : "";
    if (!name) return null;

    const card = getCardDbEntryByName(name);
    if (card) {
      const icon = card.emoji ? card.emoji + " " : "";
      return { title: icon + card.name, body: card.desc || "" };
    }

    const item = getRelicOrPotionDbEntryByName(name);
    if (item) {
      const icon = item.emoji ? item.emoji + " " : "";
      return { title: icon + item.name, body: item.desc || "" };
    }

    return null;
  }

  function getTooltipData(anchor) {
    const title = anchor.dataset.tooltipTitle || "";
    const body = anchor.dataset.tooltip || anchor.dataset.globalTooltip || "";
    if (title || body) return { title, body };

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
      const icon = card.emoji ? card.emoji + " " : "";
      return { title: icon + (card.name || ""), body: card.desc || "" };
    }

    if (anchor.classList && anchor.classList.contains("random-item-result-card")) {
      return getRandomItemResultCardData(anchor);
    }

    return null;
  }

  function buildHtml(data) {
    const title = data.title
      ? '<span class="global-tooltip-title">' + escapeHtml(data.title) + "</span>"
      : "";
    const body = data.body
      ? '<span class="global-tooltip-body">' + colorizeRarityLabels(escapeHtml(data.body)) + "</span>"
      : "";
    return title + body;
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
      moonWallet.dataset.tooltip = "희귀 보상과 특별한 보물함을 여는 데 사용하는 유료 재화입니다.";
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

  window.GlobalTooltip = {
    hide,
    refresh,
    showForElement: show
  };
})();
