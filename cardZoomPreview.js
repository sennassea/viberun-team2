"use strict";
/* =========================================================================
   주문(카드) 꾹 눌러 확대 미리보기
   ───────────────────────────────────────────────────────────────────────
   전투 손패/카드 선택 모달/보상/도감/상점/이벤트/정령로 등, 실제 카드
   마크업(.card-frame-card) 또는 월영당 미리보기 카드(.bm-deck-preview-card)가
   쓰이는 모든 화면에서 공통으로 동작한다. document 레벨 이벤트 위임이라
   화면별 렌더링 함수를 건드릴 필요가 없고, 재렌더링으로 카드 DOM이
   새로 생겨도 그대로 적용된다.

   동작: 카드를 400ms 이상 누르고 있으면 서서히 커지다가(차징 연출) 화면
   중앙에 원본 카드를 복제해 크게 띄운다. 손을 떼도 유지되며(고정 방식),
   오버레이 바깥/카드 위 어디를 탭해도 닫힌다. 버튼형 카드(카드 선택
   모달 등)에서 확대가 열린 뒤 이어지는 클릭은 선택/구매가 함께
   발동하지 않도록 한 번 삼킨다.
   ========================================================================= */
(function () {
  var ZOOM_SELECTOR = ".card-frame-card,.bm-deck-preview-card";
  var HOLD_MS = 400;
  var MOVE_CANCEL_PX = 10;
  var ZOOM_WIDTH_RATIO = 0.20;   // #game 폭 대비 목표 크기(20%)
  var ZOOM_HEIGHT_RATIO = 0.55;  // 세로가 화면을 넘지 않게 하는 안전 상한

  /* 카드의 글씨(cost/name/desc)는 카드 자신이 아니라 #game 전체를 기준으로 하는
     cqh/cqw 단위로 그려진다(base.css의 #game{container-type:size} 참고). 그래서
     복제본의 폭만 늘리면 테두리/원화는 커져도 글씨는 그대로다. 대신 복제본을
     #game 안(같은 cq 기준)에 원래 크기 그대로 그린 뒤, 그 결과물 전체를
     transform:scale()로 통째로 확대하면 테두리든 글씨든 같은 비율로 커진다. */
  var gameHost = document.getElementById("game") || document.body;

  var overlay = document.createElement("div");
  overlay.id = "cardZoomOverlay";
  overlay.className = "card-zoom-overlay";
  overlay.innerHTML = '<div class="card-zoom-backdrop"></div><div class="card-zoom-stage"></div>';
  gameHost.appendChild(overlay);
  var stage = overlay.querySelector(".card-zoom-stage");

  function closeZoom() {
    if (!overlay.classList.contains("show")) return;
    overlay.classList.remove("show");
    stage.innerHTML = "";
  }
  overlay.addEventListener("pointerdown", closeZoom);

  function openZoom(cardEl) {
    /* offsetWidth는 transform(차징 스케일 등)의 영향을 받지 않는 순수 레이아웃
       폭이라, 차징 클래스 제거가 아직 트랜지션 중이어도 항상 정확한 원본
       크기를 준다 */
    var naturalWidth = cardEl.offsetWidth;
    cardEl.classList.remove("card-zoom-charging");
    stage.innerHTML = "";

    var wrapper = document.createElement("div");
    wrapper.className = "card-zoom-scale-wrapper";
    var clone = cardEl.cloneNode(true);
    wrapper.appendChild(clone);
    stage.appendChild(wrapper);

    var hostRect = gameHost.getBoundingClientRect();
    var targetWidth = Math.min(hostRect.width * ZOOM_WIDTH_RATIO, hostRect.height * ZOOM_HEIGHT_RATIO);
    var scale = naturalWidth > 0 ? targetWidth / naturalWidth : 1;
    wrapper.style.setProperty("--zoom-scale", scale);

    overlay.classList.add("show");
    if (window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function") {
      window.VIBERUN_SOUND.play("uiButtonClick");
    }
    suppressNextClick = true;
    clearTimeout(suppressResetTimer);
    suppressResetTimer = setTimeout(function () { suppressNextClick = false; }, 500);
  }

  /* 확대가 막 열린 직후 이어지는 클릭(선택/구매 등 카드의 원래 동작)을 한 번 삼킨다 */
  var suppressNextClick = false;
  var suppressResetTimer = null;
  document.addEventListener("click", function (e) {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  var activePointerId = null;
  var pressCardEl = null;
  var startX = 0, startY = 0;
  var holdTimer = null;

  function cancelPress() {
    clearTimeout(holdTimer);
    holdTimer = null;
    if (pressCardEl) pressCardEl.classList.remove("card-zoom-charging");
    pressCardEl = null;
    activePointerId = null;
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onRelease);
    document.removeEventListener("pointercancel", onRelease);
  }

  function onMove(e) {
    if (e.pointerId !== activePointerId) return;
    var dx = e.clientX - startX, dy = e.clientY - startY;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) cancelPress();
  }

  function onRelease(e) {
    if (e.pointerId !== activePointerId) return;
    cancelPress();
  }

  document.addEventListener("pointerdown", function (e) {
    if (activePointerId !== null) return;
    if (e.target.closest("#cardZoomOverlay,#dragClone")) return;
    var cardEl = e.target.closest(ZOOM_SELECTOR);
    if (!cardEl) return;

    activePointerId = e.pointerId;
    pressCardEl = cardEl;
    startX = e.clientX;
    startY = e.clientY;
    cardEl.classList.add("card-zoom-charging");
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onRelease);
    document.addEventListener("pointercancel", onRelease);
    holdTimer = setTimeout(function () {
      var el = pressCardEl;
      cancelPress();
      if (el) openZoom(el);
    }, HOLD_MS);
  });

  /* 알트탭 등으로 창 포커스를 잃으면 pointerup이 발생하지 않을 수 있으므로 정리 */
  window.addEventListener("blur", function () { cancelPress(); closeZoom(); });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { cancelPress(); closeZoom(); }
  });
})();
