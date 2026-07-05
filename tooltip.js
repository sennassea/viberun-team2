"use strict";
/* =========================================================================
   Battle Tooltip System (tooltip.js)
   ─ 전투원 툴팁: 플레이어/몬스터 위 마우스 오버 → 효과·의도 툴팁
   ─ 주문 용어 툴팁: 주문 위 마우스 오버 → 용어 설명 툴팁
   ========================================================================= */
(function () {

  /* ══════════════════════════════════════════════════════════════════════
     I. 전투원 툴팁 데이터
     ══════════════════════════════════════════════════════════════════════ */

  /* ── 효과 정보 DB (새 상태이상 추가 시 여기에 항목 추가) ──────────────── */
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
    anxiety: {
      icon: "💭",
      name: "불안",
      desc: function (v) { return "다음 턴 시작 시 주문 뽑기가 1 감소합니다. (" + v + "턴 남음)"; }
    },
    lethargy: {
      icon: "🌫️",
      name: "무기력",
      desc: function (v) { return "다음 턴 시작 시 정신력이 1 감소합니다. (" + v + "턴 남음)"; }
    },
    healingAura: {
      icon: "💚",
      name: "치유의 향기",
      desc: function () { return "회복 주문을 보유하고 있습니다."; }
    }
  };

  /* ── 행동 의도 DB (새 행동 타입 추가 시 여기에 항목 추가) ────────────── */
  var INTENT_INFO = {
    attack: {
      icon: "💢",
      name: "공격",
      color: "#d14040",
      desc: function (m, weak) {
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        s += "스트레스 " + m.v + " 의 피해로 공격하려고 합니다.";
        if (weak > 0 && typeof m.v === "number") {
          var actualDamage = Math.floor(m.v * 0.75);
          var reducedDamage = m.v - actualDamage;
          s += "\n※ 동요 중 — 피해가 " + reducedDamage + " 감소합니다.";
          s += "\n실제 피해: " + actualDamage;
        }
        return s;
      }
    },
    defend: {
      icon: "🛡️",
      name: "보호",
      color: "#3f8fe0",
      desc: function (m) {
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        return s + "결계 " + m.v + " 를 획득하려고 합니다.";
      }
    },
    debuff: {
      icon: "🌀",
      name: "동요",
      color: "#8a5cc0",
      desc: function (m, weak, displayedStatusName) {
        var statusName = getIntentTitleName(m, displayedStatusName) || "동요";
        var s = "이 적은 ";
        if (m.name) s += '"' + m.name + '" / ';
        s += statusName + " " + m.v + "을 부여하려고 합니다.";
        return appendIntentStatusEffects(s, [statusName]);
      }
    }
  };

  var INTENT_STATUS_INFO = {
    "불안": {
      icon: "💭",
      desc: "불안 적용 시 다음 턴 드로우가 1 감소합니다."
    },
    "동요": {
      icon: "🌀",
      desc: "동요 적용 시 대상의 다음 공격 피해가 25% 감소합니다."
    },
    "무기력": {
      icon: "🌫️",
      desc: "무기력 적용 시 다음 턴 신통력이 1 감소합니다."
    },
    "균열": {
      icon: "💔",
      desc: "균열 적용 시 받는 정화 피해가 25% 증가합니다."
    },
    "회상": {
      icon: "🕯️",
      desc: "회상 적용 시 턴 종료 때 수치만큼 정화 피해를 받습니다."
    },
    "성불 표식": {
      icon: "🔖",
      desc: "성불 표식은 일부 카드의 추가 효과에 사용됩니다."
    },
    "잡념": {
      icon: "💭",
      desc: "덱 순환을 방해하는 사용 불가 카드를 얻습니다."
    },
    "망설임": {
      icon: "⏳",
      desc: "손패 자리를 차지하고 턴 종료 시 사라지는 사용 불가 카드를 얻습니다."
    },
    "후회": {
      icon: "💧",
      desc: "버려질 때 정신력 피해를 주는 사용 불가 카드를 얻습니다."
    },
    "침투 사고": {
      icon: "💭",
      desc: "덱과 손패 흐름을 방해하는 사용 불가 카드를 얻습니다."
    }
  };

  function normalizeIntentStatusName(value) {
    var statusById = {
      anxiety: "불안",
      intrusive_thought: "잡념",
      hesitation: "망설임",
      regret: "후회",
      intrusive_accident: "침투 사고",
      lethargy: "무기력",
      counter: "무기력",
      weak: "동요",
      agitation: "동요",
      mark: "성불 표식",
      fracture: "균열",
      recollection: "회상"
    };
    var knownNames = {
      "불안": "불안",
      "잡념": "잡념",
      "망설임": "망설임",
      "후회": "후회",
      "침투 사고": "침투 사고",
      "무기력": "무기력",
      "동요": "동요",
      "약화": "동요",
      "성불 표식": "성불 표식",
      "균열": "균열",
      "회상": "회상"
    };
    if (!value) return "";
    if (typeof value === "object") {
      return normalizeIntentStatusName(value.id || value.key || value.status || value.effect || value.debuff || value.applyStatus);
    }
    var text = String(value);
    return knownNames[text] || statusById[text] || "";
  }

  function addIntentStatusName(names, used, value) {
    var statusName = normalizeIntentStatusName(value);
    if (!statusName || used[statusName]) return;
    used[statusName] = true;
    names.push(statusName);
  }

  function getIntentAppliedStatusNames(intent, displayedStatusName) {
    if (!intent) return [];
    var names = [];
    var used = {};
    if (intent.statusCard && typeof CARD_DB !== "undefined" && CARD_DB[intent.statusCard]) {
      var cardName = CARD_DB[intent.statusCard].name || "";
      addIntentStatusName(names, used, cardName);
    }
    addIntentStatusName(names, used, intent.statusCard);
    ["status", "effect", "debuff", "applyStatus"].forEach(function (field) {
      var value = intent[field];
      if (Array.isArray(value)) {
        value.forEach(function (item) { addIntentStatusName(names, used, item); });
      } else {
        addIntentStatusName(names, used, value);
      }
    });
    if (names.length === 0 && intent.t === "debuff") addIntentStatusName(names, used, displayedStatusName);
    if (names.length === 0 && intent.t === "debuff") {
      addIntentStatusName(names, used, {
        anxiety: "anxiety",
        counter: "lethargy",
        lethargy: "lethargy",
        fracture: "fracture",
        weak: "weak",
        agitation: "agitation"
      }[intent.role]);
    }
    return names;
  }

  function getIntentAppliedStatusName(intent, displayedStatusName) {
    var names = getIntentAppliedStatusNames(intent, displayedStatusName);
    if (names.length > 0) return names[0];
    return "";
  }

  function getIntentTitleName(intent, displayedStatusName) {
    if (!intent || intent.t !== "debuff") return "";
    return getIntentAppliedStatusName(intent, displayedStatusName);
  }

  function getIntentIcon(intent, info, displayedStatusName) {
    var statusName = getIntentTitleName(intent, displayedStatusName);
    return (statusName && INTENT_STATUS_INFO[statusName] && INTENT_STATUS_INFO[statusName].icon) || info.icon;
  }

  function appendIntentStatusEffects(text, statusNames) {
    var used = {};
    statusNames.forEach(function (statusName) {
      var info = INTENT_STATUS_INFO[statusName];
      if (!info || used[statusName]) return;
      used[statusName] = true;
      text += "\n" + info.desc;
    });
    return text;
  }

  function buildIntentStatusRows(statusNames) {
    var used = {};
    return statusNames
      .filter(function (statusName) {
        if (!INTENT_STATUS_INFO[statusName] || used[statusName]) return false;
        used[statusName] = true;
        return true;
      })
      .map(function (statusName) {
        var info = INTENT_STATUS_INFO[statusName];
        return makeRow(info.icon, statusName, info.desc);
      });
  }

  function getDisplayedIntentStatusName(cbEl) {
    var intentEl = cbEl && cbEl.querySelector(".intent.deb");
    if (!intentEl) return "";
    var parts = intentEl.textContent.replace(/\s+/g, " ").trim().split(" ");
    return normalizeIntentStatusName(parts[parts.length - 1]);
  }

  /* ══════════════════════════════════════════════════════════════════════
     II. 주문 용어 툴팁 데이터
     ══════════════════════════════════════════════════════════════════════ */

  /* ── 주문 용어 DB (새 용어 추가 시 여기에 항목 추가) ─────────────────── */
  /* test: 주문 설명에서 용어를 감지하는 함수
     icon / name / desc: 툴팁에 표시할 정보                              */
  var CARD_TERM_INFO = [
    {
      test: function (d) { return /정화/.test(d); },
      icon: "✨",
      name: "정화",
      desc: "적에게 피해를 줍니다. 적의 결계를 먼저 깎은 후 나머지 피해가 체력을 감소시킵니다."
    },
    {
      test: function (d) { return /마음의 결계/.test(d); },
      icon: "🛡️",
      name: "마음의 결계",
      desc: "피해를 대신 받는 보호막입니다. 결계가 남아있으면 체력이 줄지 않습니다."
    },
    {
      test: function (d) { return /스트레스.{0,6}회복/.test(d); },
      icon: "❤️",
      name: "스트레스 회복",
      desc: "감소한 체력을 회복합니다. 최대 체력을 초과하여 회복할 수 없습니다."
    },
    {
      test: function (d) { return /동요/.test(d); },
      icon: "🌀",
      name: "동요",
      desc: "정화 피해를 25% 감소시키는 상태이상입니다. 매 턴 1씩 감소합니다."
    },
    {
      test: function (d) { return /뽑기/.test(d); },
      icon: "🃏",
      name: "주문 뽑기",
      desc: "덱에서 손패로 주문을 가져옵니다. 덱이 비면 버린 더미를 섞어 보충합니다. 손패는 최대 10장입니다."
    },
    {
      test: function (d) { return /신통력/.test(d); },
      icon: "⚡",
      name: "신통력",
      desc: "주문을 사용하는 데 필요한 자원입니다. 매 턴 시작 시 최대치(3)로 회복됩니다."
    },
    {
      test: function (d) { return /미련/.test(d); },
      icon: "🌫️",
      name: "미련",
      desc: "영혼이 이 세상에 남게 하는 집착입니다. 이 게임에서는 적의 체력을 가리킵니다."
    },
    {
      test: function (d) { return /소멸/.test(d); },
      icon: "💨",
      name: "소멸",
      desc: "사용 후 덱으로 돌아가지 않고 이번 전투에서 영구 제거됩니다."
    },
    {
      test: function (d) { return /모든 적/.test(d); },
      icon: "🎯",
      name: "전체 공격",
      desc: "전투 중인 모든 적에게 효과를 적용합니다."
    }
    /* 예시 — 새 용어 추가:
    {
      test: function (d) { return /독/.test(d); },
      icon: "🧪",
      name: "독",
      desc: "턴 종료 시 스택 수만큼 피해를 받습니다."
    } */
  ];

  function cardTermInfoMatches(keyword) {
    return CARD_TERM_INFO.some(function (term) {
      try {
        return term && typeof term.test === "function" && term.test(keyword);
      } catch (e) {
        return false;
      }
    });
  }

  if (!cardTermInfoMatches("화상")) {
    CARD_TERM_INFO.push({
      test: function (d) { return /화상/.test(d); },
      icon: "",
      name: "화상",
      desc: "턴이 지날 때 피해를 받는 상태입니다."
    });
  }

  if (!cardTermInfoMatches("균열")) {
    CARD_TERM_INFO.push({
      test: function (d) { return /균열/.test(d); },
      icon: "",
      name: "균열",
      desc: "받는 피해가 증가하는 상태입니다."
    });
  }

  function addCardTermFallback(keyword, desc, test) {
    if (cardTermInfoMatches(keyword)) return;
    CARD_TERM_INFO.push({
      test: test || function (d) { return d.indexOf(keyword) >= 0; },
      icon: "",
      name: keyword,
      desc: desc
    });
  }

  addCardTermFallback("주문", "손패에서 사용하는 카드입니다.", function (d) {
    return /주문/.test(d) && !/주문 뽑기/.test(d);
  });
  addCardTermFallback("결계", "피해를 막아주는 보호 수치입니다.", function (d) {
    return /결계/.test(d) && !/마음의 결계/.test(d);
  });
  addCardTermFallback("보호", "피해를 막아주는 효과입니다.");
  addCardTermFallback("회복", "잃은 정신력을 되돌립니다.", function (d) {
    return /회복/.test(d) && !/스트레스.{0,6}회복/.test(d);
  });
  addCardTermFallback("잡념", "사용할 수 없는 방해 카드입니다.");
  addCardTermFallback("불안", "다음 턴 시작 시 주문 뽑기가 감소하는 상태입니다.");
  addCardTermFallback("성불 표식", "일부 카드의 추가 효과에 사용되는 표식입니다.");

  /* ══════════════════════════════════════════════════════════════════════
     III. DOM 공통 준비
     ══════════════════════════════════════════════════════════════════════ */

  var game   = document.getElementById("game");
  var field  = document.getElementById("field");
  var handEl = document.getElementById("hand");

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
      "min-width:18cqw;max-width:26cqw;" +
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

    /* 구분선 */
    ".btt-sep{border:none;border-top:.18cqh solid rgba(255,255,255,.14);margin:.35cqh 0}" +

    /* 효과 없음 */
    ".btt-empty{font-size:1.4cqh;color:rgba(180,200,225,.5);text-align:center;padding:.4cqh 0}";

  document.head.appendChild(styleEl);

  /* ── HTML 빌더 헬퍼 ───────────────────────────────────────────────────── */
  function makeRow(icon, name, desc, nameColor) {
    var cs = nameColor ? ' style="color:' + nameColor + '"' : "";
    var ico = icon ? '<div class="btt-ico">' + icon + '</div>' : "";
    return '<div class="btt-row">'
      + ico
      + '<div class="btt-body">'
      + '<span class="btt-name"' + cs + '>' + name + '</span>'
      + '<span class="btt-desc">' + desc + '</span>'
      + '</div></div>';
  }

  /* ══════════════════════════════════════════════════════════════════════
     IV. 전투원 툴팁
     ══════════════════════════════════════════════════════════════════════ */

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
    if ((player.anxiety || 0) > 0) {
      var a = EFFECT_INFO.anxiety;
      rows.push(makeRow(a.icon, a.name, a.desc(player.anxiety)));
    }
    if ((player.lethargy || 0) > 0) {
      var l = EFFECT_INFO.lethargy;
      rows.push(makeRow(l.icon, l.name, l.desc(player.lethargy)));
    }
    if ((player.healingAura || 0) > 0) {
      var h = EFFECT_INFO.healingAura;
      rows.push(makeRow(h.icon, h.name, h.desc()));
    }
    /* 새 플레이어 상태이상 추가 시 여기에 push */
    return rows.length
      ? rows.join("")
      : '<div class="btt-empty">현재 효과 없음</div>';
  }

  /* ── 적 툴팁 내용 ─────────────────────────────────────────────────────── */
  function buildEnemyHtml(enemy, cbEl) {
    var rows = [];
    var intentStatusNames = [];
    if (enemy.intent) {
      var info = INTENT_INFO[enemy.intent.t] || INTENT_INFO.attack;
      var displayedStatusName = getDisplayedIntentStatusName(cbEl);
      var intentDesc = info.desc(enemy.intent, enemy.weak || 0, displayedStatusName);
      intentStatusNames = getIntentAppliedStatusNames(enemy.intent, displayedStatusName);
      if (enemy.intent.t !== "debuff" && enemy.intent.t !== "attack") {
        intentDesc = appendIntentStatusEffects(intentDesc, intentStatusNames);
      }
      rows.push(makeRow(
        getIntentIcon(enemy.intent, info, displayedStatusName),
        getIntentTitleName(enemy.intent, displayedStatusName) || info.name,
        intentDesc,
        info.color
      ));
      if (enemy.intent.t === "attack" && enemy.intent.statusCard && intentStatusNames.length > 0) {
        rows.push('<hr class="btt-sep">');
        rows = rows.concat(buildIntentStatusRows(intentStatusNames));
      }
    }
    var statusRows = [];
    if ((enemy.weak || 0) > 0 && intentStatusNames.indexOf("동요") < 0) {
      var wk = EFFECT_INFO.weak;
      statusRows.push(makeRow(wk.icon, wk.name, wk.desc(enemy.weak)));
    }
    if ((enemy.anxiety || 0) > 0 && intentStatusNames.indexOf("불안") < 0) {
      var ea = EFFECT_INFO.anxiety;
      statusRows.push(makeRow(ea.icon, ea.name, ea.desc(enemy.anxiety)));
    }
    if ((enemy.lethargy || 0) > 0 && intentStatusNames.indexOf("무기력") < 0) {
      var el = EFFECT_INFO.lethargy;
      statusRows.push(makeRow(el.icon, el.name, el.desc(enemy.lethargy)));
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

  /* ── 전투원 툴팁 위치 ─────────────────────────────────────────────────── */
  function positionCombatantTooltip(cbEl, isPlayer) {
    var gRect   = game.getBoundingClientRect();
    var cbRect  = cbEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;
    var relLeft  = cbRect.left  - gRect.left;
    var relRight = cbRect.right - gRect.left;
    var relTop   = cbRect.top   - gRect.top;
    var tx = isPlayer ? relRight + pad : relLeft - tipRect.width - pad;
    var ty = relTop + cbRect.height * 0.1;
    if (isPlayer) {
      var profileCard = document.querySelector(".player-info-card");
      if (profileCard) {
        var profileRect = profileCard.getBoundingClientRect();
        var profileRight = profileRect.right - gRect.left;
        var profileBottom = profileRect.bottom - gRect.top;
        var gapRight = relLeft + cbRect.width * 0.5;
        tx = (profileRight + gapRight - tipRect.width) * 0.5 + pad * 16;
        ty = (profileBottom + relTop - tipRect.height) * 0.5 + pad * 9;
      }
    }
    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));
    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  /* ── 전투원 툴팁 상태 ─────────────────────────────────────────────────── */
  var activeId = null;

  function showCombatantFor(cbEl) {
    if (typeof S === "undefined" || !S) return;
    var isPlayer = cbEl.classList.contains("player");
    var isEnemy  = cbEl.classList.contains("enemy");
    if (!isPlayer && !isEnemy) return;

    var html;
    if (isPlayer) {
      html = buildPlayerHtml(S.player);
    } else {
      var eid = cbEl.dataset.id;
      var enemy = S.enemies.find(function (e) { return e.id === eid; });
      if (!enemy) return;
      html = buildEnemyHtml(enemy, cbEl);
    }

    cardActiveEl = null;          /* 주문 툴팁 상태 초기화 */
    activeItemSlotEl = null;
    activeEnergyEl = null;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionCombatantTooltip(cbEl, isPlayer);
  }

  function hideCombatantTooltip() {
    activeId = null;
    tooltip.classList.remove("tt-show");
  }

  /* ── 전투원 이벤트 위임 ───────────────────────────────────────────────── */
  field.addEventListener("mouseover", function (e) {
    var cb = e.target.closest(".combatant");
    if (!cb || cb.classList.contains("dead") || !cb.classList.contains("enemy")) {
      if (activeId !== null) hideCombatantTooltip();
      return;
    }
    var newId = cb.dataset.id;
    if (newId === activeId) return;
    activeId = newId;
    showCombatantFor(cb);
  });

  field.addEventListener("mouseleave", hideCombatantTooltip);

  /* ── renderField() 재렌더 시 실시간 갱신 ─────────────────────────────── */
  new MutationObserver(function () {
    if (activeId === null) return;
    var sel = activeId === "player"
      ? ".combatant.player"
      : '.combatant[data-id="' + activeId + '"]';
    var cb = field.querySelector(sel);
    if (!cb || cb.classList.contains("dead")) { hideCombatantTooltip(); return; }
    showCombatantFor(cb);
  }).observe(field, { childList: true });

  /* ══════════════════════════════════════════════════════════════════════
     V. 주문 용어 툴팁
     ══════════════════════════════════════════════════════════════════════ */

  var cardActiveEl = null;
  var activeStatusEl = null;
  var activeItemSlotEl = null;
  var activeEnergyEl = null;

  function buildStatusIconHtml(statusEl) {
    var type = statusEl.dataset.status;
    var info = EFFECT_INFO[type];
    if (!info || typeof S === "undefined" || !S || !S.player) return "";
    var count = S.player[type] || 0;
    return makeRow(info.icon, info.name, info.desc(count));
  }

  function positionStatusIconTooltip(statusEl) {
    var gRect   = game.getBoundingClientRect();
    var sRect   = statusEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx = (sRect.left - gRect.left) + (sRect.width - tipRect.width) * 0.5;
    var ty = (sRect.bottom - gRect.top) + pad;

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showStatusIconTooltip(statusEl) {
    var html = buildStatusIconHtml(statusEl);
    if (!html) return;
    activeId = null;
    cardActiveEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeStatusEl = statusEl;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionStatusIconTooltip(statusEl);
  }

  function hideStatusIconTooltip() {
    activeStatusEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var statusEl = e.target.closest("#profileStatusEffects .status-icon");
    if (!statusEl || statusEl === activeStatusEl) return;
    showStatusIconTooltip(statusEl);
  });

  game.addEventListener("click", function (e) {
    var statusEl = e.target.closest("#profileStatusEffects .status-icon");
    if (!statusEl) return;
    showStatusIconTooltip(statusEl);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeStatusEl) return;
    var statusEl = e.target.closest("#profileStatusEffects .status-icon");
    if (!statusEl) return;
    var to = e.relatedTarget;
    if (to && statusEl.contains(to)) return;
    hideStatusIconTooltip();
  });

  var nativeTitleTargets = "#sideRelicSlots .side-item-slot,#sidePotionSlots .side-item-slot,#startBlessingOverlay .sb-card";

  function moveNativeTitle(el) {
    if (!el || !el.getAttribute || !el.hasAttribute("title")) return;
    if (!el.hasAttribute("data-title")) el.setAttribute("data-title", el.getAttribute("title") || "");
    el.removeAttribute("title");
  }

  function suppressNativeTitleTooltip(el) {
    if (!el) return;
    moveNativeTitle(el);
    if (el.querySelectorAll) {
      Array.prototype.forEach.call(el.querySelectorAll("[title]"), moveNativeTitle);
    }
  }

  document.addEventListener("mouseover", function (e) {
    var titleTarget = e.target.closest(nativeTitleTargets);
    if (titleTarget) suppressNativeTitleTooltip(titleTarget);
  }, true);

  /* ── 주문 설명에서 용어 추출 후 HTML 빌드 ────────────────────────────── */
  function buildEnergyHtml() {
    var desc = "카드를 사용할 때 소모되는 행동 자원입니다.";
    if (typeof S !== "undefined" && S && typeof S.energy === "number") {
      desc += "\n현재 신통력: " + S.energy;
    }
    return makeRow("", "신통력", desc);
  }

  function positionEnergyTooltip(energyEl) {
    var gRect   = game.getBoundingClientRect();
    var eRect   = energyEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx = (eRect.right - gRect.left) + pad;
    var ty = (eRect.top - gRect.top) + (eRect.height - tipRect.height) * 0.5;

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showEnergyTooltip(energyEl) {
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = energyEl;
    tooltip.innerHTML = buildEnergyHtml();
    tooltip.classList.add("tt-show");
    positionEnergyTooltip(energyEl);
  }

  function hideEnergyTooltip() {
    activeEnergyEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var energyEl = e.target.closest("#energy");
    if (!energyEl || energyEl === activeEnergyEl) return;
    showEnergyTooltip(energyEl);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeEnergyEl) return;
    var energyEl = e.target.closest("#energy");
    if (!energyEl) return;
    var to = e.relatedTarget;
    if (to && energyEl.contains(to)) return;
    hideEnergyTooltip();
  });

  function getItemSlotInfo(slotEl) {
    var host = slotEl && slotEl.closest("#sideRelicSlots,#sidePotionSlots");
    if (!host) return null;
    var slots = Array.prototype.slice.call(host.querySelectorAll(".side-item-slot"));
    var index = slots.indexOf(slotEl);
    if (index < 0) return null;
    var isRelic = host.id === "sideRelicSlots";
    var list = (typeof S !== "undefined" && S)
      ? (isRelic ? S.relics : S.potions)
      : null;
    var item = Array.isArray(list) ? list[index] : null;
    return { item: item, type: isRelic ? "relic" : "potion" };
  }

  function getMasterItemData(type, id) {
    if (!id) return null;
    var db = type === "relic"
      ? (typeof RELIC_DB !== "undefined" ? RELIC_DB : null)
      : (typeof POTION_DB !== "undefined" ? POTION_DB : null);
    if (!Array.isArray(db)) return null;
    return db.find(function (item) { return item && item.id === id; }) || null;
  }

  function getShortItemDesc(item, master) {
    var text = (item && (item.effectText || item.valueText || item.desc || item.effect))
      || (master && (master.effectText || master.valueText || master.desc || master.effect))
      || "";
    return String(text || "").split("\n")[0].trim();
  }

  function buildItemSlotHtml(slotEl) {
    var info = getItemSlotInfo(slotEl);
    if (!info) return "";
    if (!info.item) {
      return info.type === "relic"
        ? makeRow("", "법구 슬롯", "획득한 법구가 표시됩니다.")
        : makeRow("", "약병 슬롯", "전투 중 사용할 수 있는 약병이 표시됩니다.");
    }
    var master = getMasterItemData(info.type, info.item.id);
    var icon = (info.item && (info.item.emoji || info.item.icon))
      || (master && (master.emoji || master.icon))
      || (info.type === "relic" ? "🏺" : "🧪");
    var name = (info.item && info.item.name)
      || (master && master.name)
      || (info.type === "relic" ? "법구" : "약병");
    var desc = getShortItemDesc(info.item, master) || (info.type === "relic"
      ? "획득한 법구입니다."
      : "전투 중 사용할 수 있는 약병입니다.");
    return makeRow(icon, name, desc);
  }

  function positionItemSlotTooltip(slotEl) {
    var info = getItemSlotInfo(slotEl);
    var gRect   = game.getBoundingClientRect();
    var sRect   = slotEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx;
    var ty;
    if (info && info.type === "potion") {
      tx = (sRect.right - gRect.left) + 16;
      ty = (sRect.top - gRect.top) + (sRect.height - tipRect.height) * 0.5;
    } else {
      tx = (sRect.left - gRect.left) + (sRect.width - tipRect.width) * 0.5;
      ty = (sRect.bottom - gRect.top) + pad;
    }

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showItemSlotTooltip(slotEl) {
    suppressNativeTitleTooltip(slotEl);
    var html = buildItemSlotHtml(slotEl);
    if (!html) return;
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeEnergyEl = null;
    activeItemSlotEl = slotEl;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionItemSlotTooltip(slotEl);
  }

  function hideItemSlotTooltip() {
    activeItemSlotEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var slotEl = e.target.closest("#sideRelicSlots .side-item-slot,#sidePotionSlots .side-item-slot");
    if (!slotEl || slotEl === activeItemSlotEl) return;
    showItemSlotTooltip(slotEl);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeItemSlotEl) return;
    var slotEl = e.target.closest("#sideRelicSlots .side-item-slot,#sidePotionSlots .side-item-slot");
    if (!slotEl) return;
    var to = e.relatedTarget;
    if (to && slotEl.contains(to)) return;
    hideItemSlotTooltip();
  });

  function buildCardTermHtml(descText) {
    var rows = CARD_TERM_INFO
      .filter(function (t) { return t.test(descText); })
      .map(function (t) { return makeRow(t.icon, t.name, t.desc, null); });
    return rows.join("");
  }

  /* ── 주문 툴팁 위치 ───────────────────────────────────────────────────── */
  /* 주문이 화면 오른쪽 반에 있으면 툴팁을 왼쪽에, 왼쪽 반이면 오른쪽에 */
  function positionCardTooltip(cardEl) {
    var gRect   = game.getBoundingClientRect();
    var cRect   = cardEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var cardMidX = (cRect.left + cRect.right) / 2;
    var gameMidX = gRect.left + gRect.width / 2;

    var tx = cardMidX > gameMidX
      ? (cRect.left  - gRect.left) - tipRect.width - pad
      : (cRect.right - gRect.left) + pad;

    var ty = (cRect.top - gRect.top);

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  /* ── 주문 툴팁 표시 ───────────────────────────────────────────────────── */
  function showCardTooltip(cardEl) {
    /* 드래그 중에는 주문 용어 툴팁을 표시하지 않음 */
    if (typeof dragState !== "undefined" && dragState !== null) return;

    var descEl = cardEl.querySelector(".desc, .card-desc-text");
    if (!descEl) return;

    var html = buildCardTermHtml(descEl.textContent.trim());
    if (!html) {
      /* 설명할 용어가 없는 주문은 상태만 추적하고 툴팁 미표시 */
      cardActiveEl = cardEl;
      return;
    }

    activeId = null;            /* 전투원 툴팁 상태 초기화 */
    activeItemSlotEl = null;
    activeEnergyEl = null;
    cardActiveEl = cardEl;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionCardTooltip(cardEl);
  }

  /* ── 주문 툴팁 숨김 ───────────────────────────────────────────────────── */
  function hideCardTooltip() {
    cardActiveEl = null;
    tooltip.classList.remove("tt-show");
  }

  /* ── 손패 주문 이벤트 위임 ────────────────────────────────────────────── */
  handEl.addEventListener("mouseover", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    if (card === cardActiveEl) return;
    showCardTooltip(card);
  });

  handEl.addEventListener("mouseleave", hideCardTooltip);

  /* ── 덱 뷰어 주문 이벤트 위임 ────────────────────────────────────────── */
  /* 덱 뷰어는 동적으로 열리므로 game 레벨에서 위임 처리                  */
  /* 대상: 덱 보유 주문 / 뽑을 주문 / 버린 주문 탭의 .deck-viewer-card    */
  game.addEventListener("mouseover", function (e) {
    var dvCard = e.target.closest(".deck-viewer-card");
    if (!dvCard) return;
    if (dvCard === cardActiveEl) return;
    showCardTooltip(dvCard);
  });

  game.addEventListener("mouseout", function (e) {
    if (!cardActiveEl || !cardActiveEl.classList.contains("deck-viewer-card")) return;
    var dvCard = e.target.closest(".deck-viewer-card");
    if (!dvCard) return;
    var to = e.relatedTarget;
    if (to && dvCard.contains(to)) return; /* 주문 내부 이동 시 무시 */
    hideCardTooltip();
  });

})();
