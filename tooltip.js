"use strict";
/* =========================================================================
   Battle Tooltip System (tooltip.js)
   - 플레이어 위 마우스 오버 → 현재 효과 툴팁
   - 몬스터 위 마우스 오버 → 행동 의도 + 상태이상 툴팁
   - 새 상태이상 추가 시 EFFECT_INFO / INTENT_INFO 에만 항목 추가
   ========================================================================= */
(function () {

  /* ── 효과 정보 DB ─────────────────────────────────────────────────────── */
  /* 새로운 상태이상 추가 시 여기에 항목 추가 */
  var EFFECT_INFO = {
    block: {
      icon: "🛡️",
      name: "마음의 결계",
      desc: function (v) { return "피해를 " + v + " 만큼 막아줍니다."; }
    },
    weak: {
      icon: "🌀",
      name: "동요",
      desc: function (v) { return "정화 피해가 25% 감소합니다. (" + v + "턴 남음)"; }
    },
    healingAura: {
      icon: "💚",
      name: "치유의 향기",
      desc: function () { return "회복 카드를 보유하고 있습니다."; }
    }
    /* 예시 — 새 상태이상:
    poison: {
      icon: "🧪",
      name: "독",
      desc: function (v) { return "턴 종료 시 " + v + " 피해를 받습니다."; }
    } */
  };

  /* ── 행동 의도 DB ─────────────────────────────────────────────────────── */
  /* 새로운 행동 타입 추가 시 여기에 항목 추가 */
  var INTENT_INFO = {
    attack: {
      icon: "💢",
      name: "공격",
      color: "#d14040",
      desc: function (m, weak) {
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        s += "스트레스 " + m.v + " 의 피해로 공격하려고 합니다.";
        if (weak > 0) s += "\n※ 동요 중 — 피해가 감소합니다.";
        return s;
      }
    },
    defend: {
      icon: "🛡️",
      name: "강화",
      color: "#3f8fe0",
      desc: function (m) {
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        s += "결계 " + m.v + " 를 획득하려고 합니다.";
        return s;
      }
    },
    debuff: {
      icon: "🌀",
      name: "약화",
      color: "#8a5cc0",
      desc: function (m) {
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        s += "동요 " + m.v + " 를 부여하려고 합니다.";
        return s;
      }
    }
  };

  /* ── DOM 준비 ─────────────────────────────────────────────────────────── */
  var game  = document.getElementById("game");
  var field = document.getElementById("field");

  var tooltip = document.createElement("div");
  tooltip.id = "battle-tooltip";
  game.appendChild(tooltip);

  /* ── 스타일 주입 ──────────────────────────────────────────────────────── */
  var styleEl = document.createElement("style");
  styleEl.id = "battle-tooltip-style";
  styleEl.textContent =
    /* 기존 사이드 패널 숨김 */
    "#effects,#intents{display:none!important}" +

    /* 툴팁 컨테이너 */
    "#battle-tooltip{" +
      "position:absolute;z-index:80;pointer-events:none;display:none;" +
      "min-width:20cqw;max-width:26cqw;" +
      "background:rgba(14,22,38,.91);backdrop-filter:blur(5px);" +
      "border:.2cqh solid rgba(100,140,200,.4);border-radius:1.4cqh;" +
      "padding:1.1cqh 1.2cqw;" +
      "box-shadow:0 .6cqh 2.4cqh rgba(0,0,0,.55)}" +
    "#battle-tooltip.tt-show{display:block}" +

    /* 행 */
    ".btt-row{display:flex;align-items:flex-start;gap:.75cqw;padding:.6cqh 0}" +
    ".btt-row+.btt-row{border-top:.12cqh solid rgba(255,255,255,.09)}" +

    /* 아이콘 */
    ".btt-ico{font-size:2.1cqh;line-height:1.2;flex:none;width:2.7cqh;text-align:center}" +

    /* 텍스트 */
    ".btt-body{flex:1;min-width:0}" +
    ".btt-name{display:block;font-size:1.6cqh;font-weight:800;color:#fff;line-height:1.3}" +
    ".btt-desc{display:block;font-size:1.28cqh;color:rgba(190,210,235,.80);" +
      "margin-top:.15cqh;line-height:1.45;white-space:pre-wrap}" +

    /* 구분선 (의도 / 상태이상 사이) */
    ".btt-sep{border:none;border-top:.18cqh solid rgba(255,255,255,.14);margin:.35cqh 0}" +

    /* 효과 없음 */
    ".btt-empty{font-size:1.4cqh;color:rgba(180,200,225,.5);text-align:center;padding:.4cqh 0}";

  document.head.appendChild(styleEl);

  /* ── HTML 빌더 헬퍼 ───────────────────────────────────────────────────── */
  function makeRow(icon, name, desc, nameColor) {
    var cs = nameColor ? ' style="color:' + nameColor + '"' : "";
    return '<div class="btt-row">'
      + '<div class="btt-ico">' + icon + '</div>'
      + '<div class="btt-body">'
      + '<span class="btt-name"' + cs + '>' + name + '</span>'
      + '<span class="btt-desc">' + desc + '</span>'
      + '</div></div>';
  }

  /* ── 플레이어 툴팁 내용 ───────────────────────────────────────────────── */
  function buildPlayerHtml(player) {
    var rows = [];

    if ((player.block || 0) > 0) {
      var b = EFFECT_INFO.block;
      rows.push(makeRow(b.icon, b.name, b.desc(player.block)));
    }
    if ((player.weak || 0) > 0) {
      var w = EFFECT_INFO.weak;
      rows.push(makeRow(w.icon, w.name, w.desc(player.weak)));
    }
    if ((player.healingAura || 0) > 0) {
      var h = EFFECT_INFO.healingAura;
      rows.push(makeRow(h.icon, h.name, h.desc()));
    }
    /* 새 플레이어 상태이상 추가 시 위와 같은 패턴으로 push */

    return rows.length
      ? rows.join("")
      : '<div class="btt-empty">현재 효과 없음</div>';
  }

  /* ── 적 툴팁 내용 ─────────────────────────────────────────────────────── */
  function buildEnemyHtml(enemy) {
    var rows = [];

    /* 행동 의도 */
    if (enemy.intent) {
      var info = INTENT_INFO[enemy.intent.t] || INTENT_INFO.attack;
      rows.push(makeRow(
        info.icon, info.name,
        info.desc(enemy.intent, enemy.weak || 0),
        info.color
      ));
    }

    /* 적 상태이상 */
    var statusRows = [];
    if ((enemy.weak || 0) > 0) {
      var wk = EFFECT_INFO.weak;
      statusRows.push(makeRow(wk.icon, wk.name, wk.desc(enemy.weak)));
    }
    /* 새 적 상태이상 추가 시 위와 같은 패턴으로 statusRows.push */

    if (statusRows.length > 0) {
      if (rows.length > 0) rows.push('<hr class="btt-sep">');
      rows = rows.concat(statusRows);
    }

    return rows.length
      ? rows.join("")
      : '<div class="btt-empty">정보 없음</div>';
  }

  /* ── 툴팁 위치 계산 ───────────────────────────────────────────────────── */
  function positionTooltip(cbEl, isPlayer) {
    var gRect   = game.getBoundingClientRect();
    var cbRect  = cbEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var relLeft  = cbRect.left  - gRect.left;
    var relRight = cbRect.right - gRect.left;
    var relTop   = cbRect.top   - gRect.top;

    /* 플레이어(좌): 툴팁을 오른쪽에 / 적(우): 툴팁을 왼쪽에 */
    var tx = isPlayer
      ? relRight + pad
      : relLeft - tipRect.width - pad;
    var ty = relTop + cbRect.height * 0.1;

    /* 화면 밖으로 나가지 않도록 보정 */
    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  /* ── 핵심 show / hide ─────────────────────────────────────────────────── */
  var activeId = null;

  function showFor(cbEl) {
    /* script.js의 전역 S 참조 */
    if (typeof S === "undefined" || !S) return;

    var isPlayer = cbEl.classList.contains("player");
    var isEnemy  = cbEl.classList.contains("enemy");
    if (!isPlayer && !isEnemy) return;

    var html;
    if (isPlayer) {
      html = buildPlayerHtml(S.player);
    } else {
      var eid   = cbEl.dataset.id;
      var enemy = S.enemies.find(function (e) { return e.id === eid; });
      if (!enemy) return;
      html = buildEnemyHtml(enemy);
    }

    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionTooltip(cbEl, isPlayer);
  }

  function hideTooltip() {
    activeId = null;
    tooltip.classList.remove("tt-show");
  }

  /* ── 이벤트 위임 (#field) ─────────────────────────────────────────────── */
  field.addEventListener("mouseover", function (e) {
    var cb = e.target.closest(".combatant");
    if (!cb || cb.classList.contains("dead")) {
      if (activeId !== null) hideTooltip();
      return;
    }
    var newId = cb.dataset.id || "player";
    if (newId === activeId) return;   /* 같은 대상 위에서 재진입 방지 */
    activeId = newId;
    showFor(cb);
  });

  field.addEventListener("mouseleave", hideTooltip);

  /* ── renderField() 재렌더 시 실시간 갱신 ─────────────────────────────── */
  new MutationObserver(function () {
    if (activeId === null) return;

    var sel = activeId === "player"
      ? ".combatant.player"
      : '.combatant[data-id="' + activeId + '"]';
    var cb = field.querySelector(sel);

    if (!cb || cb.classList.contains("dead")) {
      hideTooltip();
      return;
    }
    showFor(cb);
  }).observe(field, { childList: true });

})();
