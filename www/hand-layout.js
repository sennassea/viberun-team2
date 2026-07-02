/* ================================================================
   손패 팬(부채꼴) 레이아웃 엔진
   - MutationObserver로 renderHand() 후 자동 실행
   - script.js 변경 없이 작동
   ================================================================ */
(function () {
  'use strict';

  /* ── 상수 ─────────────────────────────────────────────────────── */
  /* 카드 간격은 .card-hand-area 폭을 기준으로 계산한다. */
  var AREA_PADDING_R  = 0.035;
  /* 카드 폭 fallback: 11.5cqw */
  var CARD_W_PCT      = 0.115;
  /* 카드당 최대 간격: 카드 폭의 82% */
  var MAX_SPACING_R   = 0.82;
  /* 최대 부채꼴 각도 (총 펼침, 도) */
  var MAX_FAN_ANGLE   = 12;
  /* 카드 1장당 추가 각도 */
  var ANGLE_PER_CARD  = 1.3;

  /* ── 레이아웃 적용 ────────────────────────────────────────────── */
  function applyLayout() {
    var hand = document.getElementById('hand');
    if (!hand) return;

    var cards = Array.prototype.slice.call(hand.querySelectorAll('.card'));
    var n = cards.length;
    if (n === 0) return;

    var game = document.getElementById('game');
    if (!game || game.offsetWidth === 0) return;

    var area = hand.closest('.card-hand-area') || game;
    var gameW  = game.offsetWidth;
    var measuredCardW = cards[0].getBoundingClientRect().width;
    var cardW  = measuredCardW || (CARD_W_PCT * gameW);          /* 카드 1장 픽셀 폭 */
    var areaW  = area.clientWidth || gameW;
    var edgePad = Math.max(12, areaW * AREA_PADDING_R);
    var availW = Math.max(cardW, areaW - edgePad * 2);        /* 허용 전체 폭 (px) */

    /* 카드 중심 간격: availW 안에 모든 카드가 들어오도록 */
    var maxStep  = n > 1 ? Math.max(0, (availW - cardW) / (n - 1)) : 0;
    var spacing  = Math.min(cardW * MAX_SPACING_R, maxStep);

    /* 부채꼴 각도: 카드 수에 비례, 최대값으로 제한 */
    var totalAng = Math.min(MAX_FAN_ANGLE, n * ANGLE_PER_CARD);
    var angStep  = n > 1 ? totalAng / (n - 1) : 0;

    cards.forEach(function (card, i) {
      /* t: 중앙 카드 = 0, 왼쪽 끝 = -(n-1)/2, 오른쪽 끝 = +(n-1)/2 */
      var t      = n > 1 ? i - (n - 1) / 2 : 0;
      var angle  = t * angStep;               /* 회전 각도 (도) */
      var xOff   = t * spacing;              /* 수평 오프셋 (px) */

      /* 절대 위치: #hand 왼쪽 기준(= 게임 폭 50% 지점), 하단 고정 */
      card.style.position      = 'absolute';
      card.style.margin        = '0';
      card.style.left          = (xOff - cardW / 2).toFixed(1) + 'px';
      card.style.bottom        = '0';
      card.style.transformOrigin = 'bottom center';
      card.style.zIndex        = i + 1;

      /* CSS 변수로 각도 저장 → hand-layout.css에서 transform 직접 적용 */
      card.style.setProperty('--card-angle', angle.toFixed(2) + 'deg');

      /* 이전 방식(마진/스케일 변수) 제거 */
      card.style.removeProperty('--hand-card-margin');
      card.style.removeProperty('--hand-card-scale');
    });

    hand.style.removeProperty('--hand-card-margin');
    hand.style.removeProperty('--hand-card-scale');
  }

  /* ── 초기화 ──────────────────────────────────────────────────── */
  function init() {
    var hand = document.getElementById('hand');
    if (!hand) return;

    /* 카드가 추가/제거될 때마다 재계산 */
    new MutationObserver(applyLayout).observe(hand, { childList: true });

    /* 창 크기 변경 시에도 재계산 */
    window.addEventListener('resize', applyLayout);

    applyLayout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }
}());
