"use strict";
/* =========================================================================
   카드/아이템 얼굴에 그림 위로 직접 인쇄되는 설명 텍스트(.card-desc-text /
   .item-desc-text)는 절대좌표로 고정된 좁은 영역이라, 설명이 길면 잘린다.
   폰트를 키운 만큼 더 자주 넘치므로, 실제로 내용이 넘칠 때만 스크롤을 열어
   드래그(마우스)/스와이프(터치)로 나머지를 확인할 수 있게 한다.

   짧은 설명(대부분의 카드)에서는 아무 것도 붙이지 않아 기존처럼 클릭이
   그 아래 card-hit-layer(전투 손패 드래그 등)로 그대로 통과한다 — 넘칠 때만
   .desc-scrollable 클래스를 붙여 pointer-events를 열고 자체 드래그 스크롤을
   활성화한다(font-theme.css 참고).

   #battle-subcard-preview(.bsp-face) 안의 설명은 마우스 호버로 잠깐 떴다
   사라지는 비인터랙션 미리보기라 스크롤 대상에서 제외한다.
   ========================================================================= */
(function () {
  const DESC_SELECTOR = ".card-desc-text, .item-desc-text";

  function isExcluded(el) {
    return !!el.closest(".bsp-face");
  }

  function refreshScrollable(el) {
    if (isExcluded(el)) return;
    const overflowing = el.scrollHeight - el.clientHeight > 1;
    el.classList.toggle("desc-scrollable", overflowing);
  }

  function refreshAll(root) {
    root.querySelectorAll(DESC_SELECTOR).forEach(refreshScrollable);
  }

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches(DESC_SELECTOR)) refreshScrollable(node);
        if (node.querySelectorAll) refreshAll(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener("load", () => refreshAll(document));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => refreshAll(document));
  }
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => refreshAll(document), 150);
  });

  /* 드래그 스크롤: 그림 위 절대좌표 레이어라 overflow-y:auto만으로는 마우스
     클릭-드래그로 스크롤되지 않고, 손패 카드의 touch-action:none 때문에
     터치 스와이프도 브라우저가 기본으로 처리해주지 않는다. 마우스/터치를
     포인터 이벤트 하나로 통일해 직접 scrollTop을 옮긴다. */
  let drag = null;
  document.addEventListener(
    "pointerdown",
    (e) => {
      const el = e.target.closest(DESC_SELECTOR);
      if (!el || !el.classList.contains("desc-scrollable")) return;
      // 카드 드래그(전투 중 카드 사용 등)로 이벤트가 넘어가지 않도록 여기서 막는다.
      e.stopPropagation();
      drag = { el, startY: e.clientY, startScroll: el.scrollTop };
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {}
    },
    true
  );

  document.addEventListener(
    "pointermove",
    (e) => {
      if (!drag) return;
      e.stopPropagation();
      e.preventDefault();
      const dy = e.clientY - drag.startY;
      drag.el.scrollTop = drag.startScroll - dy;
    },
    true
  );

  function endDrag(e) {
    if (!drag) return;
    try {
      drag.el.releasePointerCapture(e.pointerId);
    } catch (_) {}
    drag = null;
  }
  document.addEventListener("pointerup", endDrag, true);
  document.addEventListener("pointercancel", endDrag, true);

  // 데스크톱 휠 스크롤 보조.
  document.addEventListener(
    "wheel",
    (e) => {
      const el = e.target.closest(DESC_SELECTOR);
      if (!el || !el.classList.contains("desc-scrollable")) return;
      el.scrollTop += e.deltaY;
      e.stopPropagation();
      e.preventDefault();
    },
    { capture: true, passive: false }
  );
})();
