"use strict";

(function () {
  const SELECTOR = "[data-tooltip], [data-global-tooltip], [data-tooltip-title]";
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
    const anchor = target.closest(SELECTOR);
    if (!anchor || anchor.dataset.tooltipDisabled === "true") return null;
    return anchor;
  }

  function getTooltipData(anchor) {
    const title = anchor.dataset.tooltipTitle || "";
    const body = anchor.dataset.tooltip || anchor.dataset.globalTooltip || "";
    if (!title && !body) return null;
    return { title, body };
  }

  function buildHtml(data) {
    const title = data.title
      ? '<span class="global-tooltip-title">' + escapeHtml(data.title) + "</span>"
      : "";
    const body = data.body
      ? '<span class="global-tooltip-body">' + escapeHtml(data.body) + "</span>"
      : "";
    return title + body;
  }

  function positionTooltip(anchor) {
    const tip = ensureTooltip();
    const anchorRect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;

    let left = anchorRect.left + (anchorRect.width - tipRect.width) / 2;
    let top = anchorRect.bottom + GAP;

    if (top + tipRect.height > vh - GAP) {
      top = anchorRect.top - tipRect.height - GAP;
    }

    left = Math.max(GAP, Math.min(left, vw - tipRect.width - GAP));
    top = Math.max(GAP, Math.min(top, vh - tipRect.height - GAP));

    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }

  function show(anchor) {
    const data = getTooltipData(anchor);
    if (!data) return;
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
    const anchor = findAnchor(event.target);
    if (anchor) show(anchor);
    else hide();
  }, true);

  document.addEventListener("scroll", refresh, true);
  window.addEventListener("resize", refresh);
  window.addEventListener("blur", hide);

  window.GlobalTooltip = {
    hide,
    refresh,
    showForElement: show
  };
})();
