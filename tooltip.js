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
    },
    recollection: {
      icon: "🕯️",
      name: "회상",
      desc: function (v) { return "상태 수치에 따라 추가 효과를 발생시키는 기억 상태입니다. (현재 수치: " + v + ")"; }
    }
  };

  /* ── 행동 의도 DB (새 행동 타입 추가 시 여기에 항목 추가) ────────────── */
  var INTENT_INFO = {
    attack: {
      icon: "💢",
      name: "공격",
      color: "#d14040",
            desc: function (m, weak, displayedStatusName, enemy) {
        var s = "적이 ";
        var rawDamage = m.v;
        var actualDamage = m.v;
        if (window.previewMonsterFinalDamage && enemy) {
          var preview = window.previewMonsterFinalDamage(enemy, m);
          rawDamage = preview.rawDamage;
          actualDamage = preview.finalDamage;
        } else if (weak > 0 && typeof m.v === "number") {
          actualDamage = Math.floor(m.v * 0.75);
        }
        s += "스트레스 " + actualDamage + " 피해로 공격하려고 합니다.";
        if (weak > 0 && typeof rawDamage === "number" && rawDamage !== actualDamage) {
          var reducedDamage = rawDamage - actualDamage;
          s += "\n동요 중이라 피해가 " + reducedDamage + " 감소합니다.";
          s += "\n실제 피해: " + actualDamage;
        }
        return s;
      }    },
    defend: {
      icon: "🛡️",
      name: "보호",
      color: "#3f8fe0",
            desc: function (m, weak, displayedStatusName, enemy) {
        var s = "적이 ";
        var target = window.getPlannedMonsterSupportTarget && enemy
          ? window.getPlannedMonsterSupportTarget(enemy, m)
          : enemy;
        var value = window.getMonsterDefendValue && enemy
          ? window.getMonsterDefendValue(enemy, m, target)
          : m.v;
        var targetText = target && enemy && target.id !== enemy.id ? " (" + target.name + ")" : "";
        return s + "결계 " + value + "를 얻으려고 합니다." + targetText;
      }    },
    drawPenalty: {
      icon: "💭",
      name: "손패 압박",
      color: "#8a5cc0",
      desc: function (m) {
        var s = "적이 ";
        return s + "다음 플레이어 턴 주문 뽑기를 " + (m.v || 1) + " 감소시키려 합니다.";
      }
    },
    lock: {
      icon: "🔒",
      name: "잠금",
      color: "#8a5cc0",
      desc: function (m) {
        var s = "적이 ";
        return s + "다음 손패에서 비용이 가장 높은 사용 가능 주문 1장을 잠그려 합니다.";
      }
    },
    exam: {
      icon: "📝",
      name: "문항",
      color: "#8a5cc0",
      desc: function (m) {
        var s = "적이 ";
        return s + "다음 턴의 주문 타입 규칙을 예고합니다.";
      }
    },
    debuff: {
      icon: "🌀",
      name: "동요",
      color: "#8a5cc0",
      desc: function (m, weak, displayedStatusName) {
        var statusName = getIntentTitleName(m, displayedStatusName) || "동요";
        var s = "이 적은 ";
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
    var intentStatusCard = window.getMonsterIntentStatusCardKey
      ? window.getMonsterIntentStatusCardKey(intent)
      : intent.statusCard;
    if (intentStatusCard && typeof CARD_DB !== "undefined" && CARD_DB[intentStatusCard]) {
      var cardName = CARD_DB[intentStatusCard].name || "";
      addIntentStatusName(names, used, cardName);
    }
    addIntentStatusName(names, used, intentStatusCard);
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

  /* 스킬명이 있으면 스킬명을, 없으면 부여 상태명/행동 타입명을 제목으로 사용한다 (아이콘은 makeRow가 제목 뒤에 붙임) */
  function getIntentDisplayTitle(intent, info, displayedStatusName) {
    if (!intent) return info.name;
    var statusName = getIntentTitleName(intent, displayedStatusName);
    return intent.name || statusName || info.name;
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

  function getCardPurifyDamage(descText) {
    var text = String(descText || "");
    var match = text.match(/(\d+)\s*만큼\s*정화/) || text.match(/(\d+)\s*정화/);
    if (!match) return null;
    var value = parseInt(match[1], 10);
    return isNaN(value) ? null : value;
  }

  function buildFractureCardTermDesc(descText) {
    var desc = "해당 대상이 받는 정화 피해가 25% 증가합니다.";
    var damage = getCardPurifyDamage(descText);
    if (typeof damage === "number") {
      desc += "\n실제 정화 피해: " + Math.floor(damage * 1.25);
    }
    return desc;
  }

  if (!cardTermInfoMatches("균열")) {
    CARD_TERM_INFO.push({
      test: function (d) { return /균열/.test(d); },
      icon: "",
      name: "균열",
      desc: buildFractureCardTermDesc
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

  addCardTermFallback("결계", "피해를 막아주는 보호 수치입니다.", function (d) {
    return /결계/.test(d) && !/마음의 결계/.test(d);
  });
  addCardTermFallback("보호", "피해를 막아주는 효과입니다.");
  addCardTermFallback("회복", "잃은 정신력을 되돌립니다.", function (d) {
    return /회복/.test(d) && !/스트레스.{0,6}회복/.test(d);
  });
  addCardTermFallback("회상", "매 턴 수치만큼 피해를 입습니다.");
  addCardTermFallback("후회", "사용할 수 없는 카드입니다. 버려지면 정신력에 3 피해를 주고 소멸합니다.");
  addCardTermFallback("잡념", "사용할 수 없는 방해 카드입니다.");
  addCardTermFallback("불안", "다음 턴 시작 시 주문 뽑기가 감소하는 상태입니다.");

  /* ══════════════════════════════════════════════════════════════════════
     III. DOM 공통 준비
     ══════════════════════════════════════════════════════════════════════ */

  var game   = document.getElementById("game");
  var field  = document.getElementById("field");
  var handEl = document.getElementById("hand");

  var tooltip = document.createElement("div");
  tooltip.id = "battle-tooltip";
  game.appendChild(tooltip);

  /* ── 서브카드(카드 사용 시 생성되는 카드) 미리보기 요소 ─────────────────── */
  var subCardPreview = document.createElement("div");
  subCardPreview.id = "battle-subcard-preview";
  game.appendChild(subCardPreview);

  /* ── 스타일 주입 ──────────────────────────────────────────────────────── */
  var styleEl = document.createElement("style");
  styleEl.id = "battle-tooltip-style";
  styleEl.textContent =
    /* 기존 사이드 패널 숨김 */
    "#effects,#intents{display:none!important}" +

    /* 툴팁 컨테이너 */
    "#battle-tooltip{" +
      "position:absolute;z-index:100000;pointer-events:none;display:none;" +
      "min-width:18cqw;max-width:26cqw;" +
      "background:rgba(14,22,38,.91);backdrop-filter:blur(5px);" +
      "border:.2cqh solid rgba(100,140,200,.4);border-radius:1.4cqh;" +
      "padding:1.1cqh 1.2cqw;" +
      "box-shadow:0 .6cqh 2.4cqh rgba(0,0,0,.55)}" +
    "#battle-tooltip.tt-show{display:block}" +

    /* 행 */
    ".btt-row{display:flex;align-items:flex-start;padding:.6cqh 0}" +
    ".btt-row+.btt-row{border-top:.12cqh solid rgba(255,255,255,.09)}" +

    /* 텍스트 */
    ".btt-body{flex:1;min-width:0}" +
    ".btt-name{display:block;font-size:1.6cqh;font-weight:800;color:#fff;line-height:1.3}" +
    ".btt-name-ico{font-size:1.4cqh;margin-left:.3cqw;vertical-align:middle}" +
    ".btt-name-ico img{width:1.5cqh;height:1.5cqh;object-fit:contain;display:inline-block;vertical-align:middle;margin-left:.3cqw}" +
    ".btt-desc{display:block;font-size:1.28cqh;color:rgba(190,210,235,.80);" +
      "margin-top:.15cqh;line-height:1.45;white-space:pre-wrap}" +

    /* 구분선 */
    ".btt-sep{border:none;border-top:.18cqh solid rgba(255,255,255,.14);margin:.35cqh 0}" +

    /* 효과 없음 */
    ".btt-empty{font-size:1.4cqh;color:rgba(180,200,225,.5);text-align:center;padding:.4cqh 0}" +

    /* 서브카드 미리보기 (메인 카드의 약 2/3 크기) */
    "#battle-subcard-preview{position:absolute;z-index:100001;pointer-events:none;display:none;}" +
    "#battle-subcard-preview.show{display:block;}" +
    ".bsp-face{position:relative;width:100%;aspect-ratio:2/3;border-radius:1cqh;overflow:hidden;" +
      "box-shadow:0 .6cqh 2cqh rgba(0,0,0,.5);background:#f5efe4;}" +
    ".bsp-face .card-art-layer{position:absolute;inset:0;z-index:0;display:grid;place-items:center;" +
      "overflow:hidden;background:linear-gradient(160deg,#eef6ff,#dcebfb);}" +
    ".bsp-face .card-art-layer img{width:100%;height:100%;object-fit:cover;display:block;}" +
    ".bsp-face .card-frame-layer{position:absolute;inset:0;z-index:2;width:100%;height:100%;object-fit:fill;}" +
    ".bsp-face .card-text-layer{position:absolute;inset:0;z-index:3;font-weight:900;color:#10243f;}" +
    ".bsp-face .card-cost-text{position:absolute;left:6.2%;top:2.4%;width:18.8%;height:13.9%;" +
      "display:grid;place-items:center;font-size:1.6cqh;line-height:1;}" +
    ".bsp-face .card-name-text{position:absolute;left:12%;right:8%;top:5.9%;height:10%;" +
      "display:grid;place-items:center;text-align:center;font-size:1cqh;line-height:1.05;overflow:hidden;}" +
    ".bsp-face .card-desc-text{position:absolute;left:8%;right:8%;top:77.8%;bottom:7.4%;" +
      "text-align:center;font-size:.85cqh;line-height:1.2;overflow:hidden;white-space:pre-line;}";

  document.head.appendChild(styleEl);

  /* ── HTML 빌더 헬퍼 ───────────────────────────────────────────────────── */
  function makeRow(icon, name, desc, nameColor) {
    var cs = nameColor ? ' style="color:' + nameColor + '"' : "";
    var nameIconHtml = "";
    if (icon) {
      nameIconHtml = (typeof icon === "string" && icon.indexOf("assets/") === 0)
        ? '<img class="btt-name-ico" src="' + icon + '" alt="" aria-hidden="true">'
        : '<span class="btt-name-ico">' + icon + '</span>';
    }
    return '<div class="btt-row">'
      + '<div class="btt-body">'
      + '<span class="btt-name"' + cs + '>' + name + nameIconHtml + '</span>'
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
      var intentDesc = info.desc(enemy.intent, enemy.weak || 0, displayedStatusName, enemy);
      intentStatusNames = getIntentAppliedStatusNames(enemy.intent, displayedStatusName);
      if (enemy.intent.t !== "debuff" && enemy.intent.t !== "attack") {
        intentDesc = appendIntentStatusEffects(intentDesc, intentStatusNames);
      }
      rows.push(makeRow(
        getIntentIcon(enemy.intent, info, displayedStatusName),
        getIntentDisplayTitle(enemy.intent, info, displayedStatusName),
        intentDesc,
        info.color
      ));
      if (enemy.intent.t === "attack" && intentStatusNames.length > 0) {
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
    var recollectionValue = (enemy.status && enemy.status.recollection) || enemy.recollection || 0;
    if (recollectionValue > 0 && intentStatusNames.indexOf("회상") < 0) {
      var rc = EFFECT_INFO.recollection;
      statusRows.push(makeRow(rc.icon, rc.name, rc.desc(recollectionValue)));
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
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionCombatantTooltip(cbEl, isPlayer);
  }

  function hideCombatantTooltip() {
    activeId = null;
    tooltip.classList.remove("tt-show");
  }

  /* ── 전투원 이벤트 위임 ───────────────────────────────────────────────── */
  function isEnemyTooltipHit(target, cbEl) {
    if (!target || !cbEl || !cbEl.contains(target)) return false;
    if (target.closest(".enemy-status-icons,.enemy-status-icon")) return false;
    var hitEl = target.closest(".avatar,.intent,.combatant-info");
    return !!(hitEl && cbEl.contains(hitEl));
  }

  field.addEventListener("mouseover", function (e) {
    var cb = e.target.closest(".combatant");
    if (!cb || cb.classList.contains("dead") || !cb.classList.contains("enemy") || !isEnemyTooltipHit(e.target, cb)) {
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
  var activeHudEl = null;
  var activeProgressEl = null;
  var activeMenuEl = null;
  var activeDockEl = null;

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
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
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
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
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
    return { item: item, type: isRelic ? "relic" : "potion", index: index };
  }

  /* 약병 슬롯 클릭 시 뜨는 사용/버리기 버튼이 열려 있으면 그 버튼들의 최상단 y좌표를 반환.
     열린 버튼이 없으면 null (약병 tooltip이 버튼을 가리지 않도록 위치 조정에 사용) */
  function getOpenPotionActionButtonsTop(index) {
    if (index == null || index < 0) return null;
    var tops = [];
    ["potionUseButton", "potionDiscardButton"].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn && btn.classList.contains("show") && Number(btn.dataset.potionIndex) === index) {
        tops.push(btn.getBoundingClientRect().top);
      }
    });
    return tops.length ? Math.min.apply(Math, tops) : null;
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
    return makeRow(icon, name, colorizeRarityLabels(desc));
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
      var actionTop = getOpenPotionActionButtonsTop(info.index);
      ty = actionTop !== null
        ? (actionTop - gRect.top) - tipRect.height - pad
        : (sRect.top - gRect.top) + (sRect.height - tipRect.height) * 0.5;
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
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
    activeItemSlotEl = slotEl;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionItemSlotTooltip(slotEl);
  }

  function hideItemSlotTooltip() {
    activeItemSlotEl = null;
    tooltip.classList.remove("tt-show");
  }

  /* 약병 사용/버리기 버튼이 열리거나 닫힐 때 script.js에서 호출.
     현재 표시 중인 약병/법구 슬롯 툴팁이 있으면 위치만 다시 계산한다. */
  window.refreshItemSlotTooltipPosition = function () {
    if (activeItemSlotEl) positionItemSlotTooltip(activeItemSlotEl);
  };

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

  function buildCardTermHtml(descText, extraDescText) {
    var seenNames = {};
    var rows = [];
    [descText, extraDescText].forEach(function (text) {
      if (!text) return;
      CARD_TERM_INFO.forEach(function (t) {
        if (!t || seenNames[t.name]) return;
        var matched = false;
        try { matched = t.test(text); } catch (e) { matched = false; }
        if (!matched) return;
        seenNames[t.name] = true;
        var desc = typeof t.desc === "function" ? t.desc(text) : t.desc;
        rows.push(makeRow(t.icon, t.name, desc, null));
      });
    });
    return rows.join("");
  }

  /* ── 카드 DOM 요소 → CARD_DB 데이터 매칭 (모든 카드 UI가 공통으로
     cardFaceHtml()을 사용해 .card-name-text를 렌더링하므로 이름 기준으로 매칭) ── */
  function findCardDbEntryByCardName(name) {
    if (!name || typeof CARD_DB !== "object" || !CARD_DB) return null;
    var foundKey = Object.keys(CARD_DB).find(function (k) {
      return CARD_DB[k] && CARD_DB[k].name === name;
    });
    return foundKey ? CARD_DB[foundKey] : null;
  }

  function getCardDbEntryFromCardEl(cardEl) {
    var nameEl = cardEl.querySelector(".card-name-text");
    var name = nameEl ? nameEl.textContent.trim() : "";
    return findCardDbEntryByCardName(name);
  }

  /* ── 서브카드(카드 효과로 생성되는 카드) 탐지 ────────────────────────────
     fx 항목 중 t가 "createCard"로 시작하고 key가 있는 항목을 범용으로 찾는다.
     (createCardToHand 외 향후 유사 타입이 추가되어도 하드코딩 없이 대응) */
  function getSubCardEntry(cardEntry) {
    if (!cardEntry || !Array.isArray(cardEntry.fx) || typeof CARD_DB !== "object" || !CARD_DB) return null;
    var fxItem = cardEntry.fx.find(function (f) {
      return f && typeof f.t === "string" && /^createCard/i.test(f.t) && f.key;
    });
    if (!fxItem) return null;
    return CARD_DB[fxItem.key] || null;
  }

  /* 서브카드는 메인 카드보다 살짝 작게(85%) 표시 */
  var SUBCARD_SCALE = 0.85;

  /* ── 서브카드 미리보기 표시/숨김/위치 ───────────────────────────────────── */
  /* 메인 카드 상단과 같은 줄에 정렬되고, 카드 오른쪽에 붙되 화면 밖으로
     나가면 왼쪽으로 뒤집힌다. 반환값은 뒤이어 툴팁을 이어붙이는 데 쓰인다. */
  function positionSubCardPreview(cardEl) {
    var gRect = game.getBoundingClientRect();
    var cRect = cardEl.getBoundingClientRect();
    var pad = 8;

    subCardPreview.style.width = (cRect.width * SUBCARD_SCALE) + "px";
    var pRect = subCardPreview.getBoundingClientRect();

    var cardLeft  = cRect.left  - gRect.left;
    var cardRight = cRect.right - gRect.left;

    var flippedLeft = false;
    var tx = cardRight + pad;
    if (tx + pRect.width > gRect.width - pad) {
      tx = cardLeft - pRect.width - pad;
      flippedLeft = true;
    }
    tx = Math.max(pad, Math.min(gRect.width - pRect.width - pad, tx));

    var ty = cRect.top - gRect.top; /* 메인 카드와 윗면 정렬 */
    ty = Math.max(pad, Math.min(gRect.height - pRect.height - pad, ty));

    subCardPreview.style.left = tx + "px";
    subCardPreview.style.top = ty + "px";

    return { left: tx, right: tx + pRect.width, flippedLeft: flippedLeft };
  }

  function showSubCardPreview(cardEl, subCardEntry) {
    if (typeof cardFaceHtml !== "function") return null;
    subCardPreview.innerHTML = '<div class="bsp-face">' + cardFaceHtml(subCardEntry) + '</div>';
    subCardPreview.classList.add("show");
    return positionSubCardPreview(cardEl);
  }

  function hideSubCardPreview() {
    subCardPreview.classList.remove("show");
  }

  /* ── 주문 툴팁 위치 ───────────────────────────────────────────────────── */
  /* 서브카드가 없으면: 카드가 화면 오른쪽 반이면 툴팁을 왼쪽에, 왼쪽 반이면 오른쪽에.
     서브카드가 있으면: "메인 카드 - 서브카드 - 툴팁" 순서로 겹치지 않게 서브카드
     바로 옆(서브카드가 뒤집혔으면 반대쪽)에 이어붙인다.                        */
  function positionCardTooltip(cardEl, subCardRect) {
    var gRect   = game.getBoundingClientRect();
    var cRect   = cardEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx, ty;

    if (cardEl.classList && cardEl.classList.contains("shop-detail-card-preview")) {
      /* 상점 상세 패널의 선택 카드: 다른 상점 상품(약병/법구) 툴팁과 동일하게
         카드 바로 아래에 표시하고, 화면 아래로 넘치면 위로 뒤집는다.          */
      tx = (cRect.left - gRect.left) + (cRect.width - tipRect.width) / 2;
      ty = (cRect.bottom - gRect.top) + pad;
      if (ty + tipRect.height > gRect.height - pad) {
        ty = (cRect.top - gRect.top) - tipRect.height - pad;
      }
    } else if (subCardRect) {
      tx = subCardRect.flippedLeft
        ? subCardRect.left - tipRect.width - pad
        : subCardRect.right + pad;
      ty = (cRect.top - gRect.top);
    } else {
      var cardMidX = (cRect.left + cRect.right) / 2;
      var gameMidX = gRect.left + gRect.width / 2;
      tx = cardMidX > gameMidX
        ? (cRect.left  - gRect.left) - tipRect.width - pad
        : (cRect.right - gRect.left) + pad;
      ty = (cRect.top - gRect.top);
    }

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

    var cardEntry = getCardDbEntryFromCardEl(cardEl);
    var subCardEntry = getSubCardEntry(cardEntry);

    var html = buildCardTermHtml(descEl.textContent.trim(), subCardEntry ? subCardEntry.desc : null);

    if (!html && !subCardEntry) {
      /* 설명할 용어도, 서브카드도 없는 주문은 상태만 추적하고 툴팁 미표시 */
      cardActiveEl = cardEl;
      hideSubCardPreview();
      return;
    }

    activeId = null;            /* 전투원 툴팁 상태 초기화 */
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
    cardActiveEl = cardEl;

    var subCardRect = subCardEntry ? showSubCardPreview(cardEl, subCardEntry) : null;
    if (!subCardEntry) hideSubCardPreview();

    if (html) {
      tooltip.innerHTML = html;
      tooltip.classList.add("tt-show");
      positionCardTooltip(cardEl, subCardRect);
    } else {
      tooltip.classList.remove("tt-show");
    }
  }

  /* ── 주문 툴팁 숨김 ───────────────────────────────────────────────────── */
  function hideCardTooltip() {
    cardActiveEl = null;
    tooltip.classList.remove("tt-show");
    hideSubCardPreview();
  }

  /* ── 손패 주문 이벤트 위임 ────────────────────────────────────────────── */
  handEl.addEventListener("mouseover", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    if (card === cardActiveEl) return;
    showCardTooltip(card);
  });

  handEl.addEventListener("mouseleave", hideCardTooltip);

  /* ── 덱 뷰어 / 카드 선택(보상·제거) 주문 이벤트 위임 ─────────────────── */
  /* 이 UI들은 모두 동적으로 열리므로 game 레벨에서 위임 처리             */
  /* 대상: 덱 보유 주문/뽑을 주문/버린 주문 탭의 .deck-viewer-card,       */
  /* 신령의 은혜·전투 보상 등 "카드 N장 중 1장 선택" 팝업의 .reward-card, */
  /* 상점의 주문 상품 카드(.shop-product-card-frame)와 상세 패널 카드     */
  /* 미리보기(.shop-detail-card-preview)                                 */
  var DECK_OR_REWARD_CARD_SELECTOR =
    ".deck-viewer-card,.reward-card,.shop-product-card-frame,.shop-detail-card-preview";

  game.addEventListener("mouseover", function (e) {
    var dvCard = e.target.closest(DECK_OR_REWARD_CARD_SELECTOR);
    if (!dvCard) return;
    if (dvCard === cardActiveEl) return;
    showCardTooltip(dvCard);
  });

  game.addEventListener("mouseout", function (e) {
    if (!cardActiveEl || !cardActiveEl.matches || !cardActiveEl.matches(DECK_OR_REWARD_CARD_SELECTOR)) return;
    var dvCard = e.target.closest(DECK_OR_REWARD_CARD_SELECTOR);
    if (!dvCard) return;
    var to = e.relatedTarget;
    if (to && dvCard.contains(to)) return; /* 주문 내부 이동 시 무시 */
    hideCardTooltip();
  });

  /* ══════════════════════════════════════════════════════════════════════
     VI. 프로필카드 재화/상태 숫자 툴팁
     ══════════════════════════════════════════════════════════════════════ */

  /* 전투/상점/신령의 은혜/휴식/이벤트 등 화면마다 접두사만 다른(hud-, shop-, prayer-, event-)
     프로필 카드 구조를 공통 선택자로 매칭한다. */
  var HP_BAR_SELECTOR = ".hud-hpbar,.shop-hp-bar,.prayer-hp-bar,.event-hp-bar";
  var RESOURCE_CONTAINER_SELECTOR = ".hud-resource,.shop-resource,.prayer-resource,.event-resource";

  var HUD_RESOURCE_TYPE_BY_ICON_CLASS = {
    "hud-resource-icon-relic":  { icon: "🏺", name: "법구",     desc: "전투와 탐험에 도움을 주는 보유 유물입니다." },
    "hud-resource-icon-potion": { icon: "🧪", name: "약병",     desc: "전투 중 사용할 수 있는 소모품입니다." },
    "hud-resource-icon-gold":   { icon: "🪙", name: "복채",     desc: "상점과 보상에서 사용하는 기본 재화입니다." },
    "hud-resource-icon-moon":   { icon: "🌙", name: "달빛 조각", desc: "희귀 보상 획득에 사용하는 특별 재화입니다." }
  };

  function findHudResourceMatch(target) {
    var containerEl = target && target.closest && target.closest(RESOURCE_CONTAINER_SELECTOR);
    if (!containerEl || !containerEl.querySelector) return null;
    var info = null;
    for (var cls in HUD_RESOURCE_TYPE_BY_ICON_CLASS) {
      if (!HUD_RESOURCE_TYPE_BY_ICON_CLASS.hasOwnProperty(cls)) continue;
      if (containerEl.querySelector("." + cls)) { info = HUD_RESOURCE_TYPE_BY_ICON_CLASS[cls]; break; }
    }
    if (!info) return null;
    var countEl = containerEl.querySelector("[id]");
    return { el: containerEl, info: info, countEl: countEl };
  }

  function buildHudResourceHtml(match) {
    if (!match || !match.info) return "";
    var desc = match.info.desc;
    var value = match.countEl ? match.countEl.textContent : "";
    if (value !== "" && value != null) desc += "\n현재: " + value;
    return makeRow(match.info.icon, match.info.name, desc);
  }

  function buildHudHpHtml(hpEl) {
    var desc = "0이 되면 전투에서 패배합니다.";
    var textEl = hpEl && hpEl.querySelector ? hpEl.querySelector("span") : null;
    if (textEl && textEl.textContent) desc += "\n현재: " + textEl.textContent;
    return makeRow("", "정신력", desc);
  }

  function positionHudTooltip(anchorEl) {
    var gRect   = game.getBoundingClientRect();
    var aRect   = anchorEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx = (aRect.left - gRect.left);
    var ty = (aRect.bottom - gRect.top) + pad;

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showHudTooltip(anchorEl, html) {
    if (!anchorEl || !html) return;
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = null;
    activeHudEl = anchorEl;
    tooltip.innerHTML = html;
    tooltip.classList.add("tt-show");
    positionHudTooltip(anchorEl);
  }

  function hideHudTooltip() {
    activeHudEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    var hpEl = target.closest(HP_BAR_SELECTOR);
    if (hpEl) {
      if (hpEl === activeHudEl) return;
      showHudTooltip(hpEl, buildHudHpHtml(hpEl));
      return;
    }

    var match = findHudResourceMatch(target);
    if (match) {
      if (match.el === activeHudEl) return;
      var html = buildHudResourceHtml(match);
      if (html) showHudTooltip(match.el, html);
    }
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeHudEl) return;
    var stillInside = e.target && e.target.closest
      && (e.target.closest(HP_BAR_SELECTOR) === activeHudEl || e.target.closest(RESOURCE_CONTAINER_SELECTOR) === activeHudEl);
    if (!stillInside) return;
    var to = e.relatedTarget;
    if (to && activeHudEl.contains && activeHudEl.contains(to)) return;
    hideHudTooltip();
  });

  /* ══════════════════════════════════════════════════════════════════════
     VII. 중앙 상단 진행(위치/턴) 정보 툴팁
     ══════════════════════════════════════════════════════════════════════ */

  function isProgressPartVisible(el) {
    if (!el) return false;
    if (el.hidden) return false;
    try {
      if (window.getComputedStyle && window.getComputedStyle(el).display === "none") return false;
    } catch (err) { /* 스타일 조회 실패 시 텍스트 존재 여부로만 판단 */ }
    return true;
  }

  /* 전투 화면은 위치/스테이지/턴 구조(.progress-region 등)를 쓰고,
     상점/신령의 은혜/휴식/이벤트 등 다른 화면은 제목+부제(-stage-title-main/-sub) 구조를 쓴다. */
  var PROGRESS_CONTAINER_SELECTOR = ".progress-center-hud,.shop-stage-info,.prayer-stage-info,.event-stage-info";

  function getProgressTurnText(progressEl) {
    if (!progressEl || !progressEl.querySelector) return "";
    var turnEl = progressEl.querySelector(".progress-turn");
    return turnEl ? (turnEl.textContent || "").trim() : "";
  }

  /* 전투 화면(위치+스테이지+턴)에서만 쓰는 상세 표시 텍스트 */
  function getProgressDisplayText(progressEl) {
    if (!progressEl || !progressEl.querySelector) return "";
    var regionEl = progressEl.querySelector(".progress-region");
    if (!regionEl) return "";
    var floorEl = progressEl.querySelector(".progress-floor");
    var spans = regionEl.querySelectorAll ? regionEl.querySelectorAll("span") : null;
    var lastSpan = spans && spans.length ? spans[spans.length - 1] : null;
    var locationText = ((lastSpan || regionEl).textContent || "").trim();
    var floorText = (floorEl && isProgressPartVisible(floorEl)) ? (floorEl.textContent || "").trim() : "";
    var turnText = getProgressTurnText(progressEl);
    var parts = [locationText, floorText, turnText].filter(function (t) { return t; });
    return parts.join(" | ");
  }

  /* 턴이 없는 화면(상점/신령의 은혜/휴식/이벤트 등)에서 쓰는 장소 이름만의 텍스트 */
  function getProgressPlaceText(progressEl) {
    if (!progressEl || !progressEl.querySelector) return "";
    var regionEl = progressEl.querySelector(".progress-region");
    if (regionEl) {
      var spans = regionEl.querySelectorAll ? regionEl.querySelectorAll("span") : null;
      var lastSpan = spans && spans.length ? spans[spans.length - 1] : null;
      return ((lastSpan || regionEl).textContent || "").trim();
    }
    var titleEl = progressEl.querySelector("[class$='-stage-title-main']");
    return titleEl ? (titleEl.textContent || "").trim() : "";
  }

  function buildProgressHtml(progressEl) {
    /* 전투 턴 정보가 실제로 존재할 때만 "현재 진행 정보"(위치+턴) 문구를 사용하고,
       그 외에는 항상 "현재 위치"(장소 안내) 기본 문구를 사용한다. */
    var turnText = getProgressTurnText(progressEl);
    if (turnText) {
      var desc = "현재 위치와 전투 턴 수를 표시합니다.";
      var displayText = getProgressDisplayText(progressEl);
      if (displayText) desc += "\n현재 표시: " + displayText;
      return makeRow("", "현재 진행 정보", desc);
    }

    var placeDesc = "현재 머무르고 있는 장소를 표시합니다.";
    var placeText = getProgressPlaceText(progressEl);
    if (placeText) placeDesc += "\n현재 장소: " + placeText;
    return makeRow("", "현재 위치", placeDesc);
  }

  function positionProgressTooltip(anchorEl) {
    var gRect   = game.getBoundingClientRect();
    var aRect   = anchorEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;

    var tx = (aRect.left - gRect.left) + (aRect.width - tipRect.width) * 0.5;
    var ty = (aRect.bottom - gRect.top) + pad;

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showProgressTooltip(progressEl) {
    if (!progressEl) return;
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeHudEl = null;
    activeMenuEl = null;
    activeDockEl = null;
    activeProgressEl = progressEl;
    tooltip.innerHTML = buildProgressHtml(progressEl);
    tooltip.classList.add("tt-show");
    positionProgressTooltip(progressEl);
  }

  function hideProgressTooltip() {
    activeProgressEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var progressEl = e.target && e.target.closest && e.target.closest(PROGRESS_CONTAINER_SELECTOR);
    if (!progressEl || progressEl === activeProgressEl) return;
    showProgressTooltip(progressEl);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeProgressEl) return;
    var progressEl = e.target && e.target.closest && e.target.closest(PROGRESS_CONTAINER_SELECTOR);
    if (!progressEl) return;
    var to = e.relatedTarget;
    if (to && progressEl.contains(to)) return;
    hideProgressTooltip();
  });

  /* ══════════════════════════════════════════════════════════════════════
     VIII. 우측 상단 메뉴 아이콘 툴팁
     ══════════════════════════════════════════════════════════════════════ */

  var TOP_MENU_INFO = [
    { cls: "ui-map-button",      name: "지도", desc: "현재 진행 경로를 확인합니다." },
    { cls: "ui-codex-button",    name: "주문", desc: "카드와 정보를 확인합니다." },
    { cls: "ui-bag-button",      name: "가방", desc: "보유 중인 법구와 약병을 확인합니다." },
    { cls: "ui-settings-button", name: "설정", desc: "게임 설정을 변경합니다." },
    { cls: "ui-menu-button",     name: "메뉴", desc: "게임 메뉴를 엽니다." }
  ];

  /* 전투 화면의 .top-menu-button 뿐 아니라 상점/신령의 은혜/휴식/이벤트/지도 화면의
     자체 버튼(.shop-header-btn, .sb-menu-btn, .prayer-header-btn, .dmap-action-btn 등)도
     모두 공통으로 ui-map-button/ui-codex-button/ui-bag-button/ui-settings-button 클래스를
     그대로 갖고 있으므로, 래퍼 클래스에 의존하지 않고 이 클래스들로 직접 매칭한다. */
  var TOP_MENU_SELECTOR = TOP_MENU_INFO.map(function (item) { return "." + item.cls; }).join(",");

  function findTopMenuButton(target) {
    var btnEl = target && target.closest && target.closest(TOP_MENU_SELECTOR);
    if (!btnEl || !btnEl.classList) return null;
    for (var i = 0; i < TOP_MENU_INFO.length; i++) {
      if (btnEl.classList.contains(TOP_MENU_INFO[i].cls)) return { el: btnEl, info: TOP_MENU_INFO[i] };
    }
    return null;
  }

  function positionTopMenuTooltip(anchorEl) {
    var gRect   = game.getBoundingClientRect();
    var aRect   = anchorEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;
    var gap = 10;

    /* 아이콘 중앙과 툴팁 중앙을 맞추고, 아이콘 바로 아래(간격 약 10px)에 배치 */
    var tx = (aRect.left - gRect.left) + (aRect.width - tipRect.width) * 0.5;
    var ty = (aRect.bottom - gRect.top) + gap;

    /* 화면(게임 영역) 밖으로 나가면 안쪽으로만 보정 (설정 등 우측 끝 아이콘 대응) */
    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showTopMenuTooltip(anchorEl, info) {
    if (!anchorEl || !info) return;
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeHudEl = null;
    activeProgressEl = null;
    activeDockEl = null;
    activeMenuEl = anchorEl;
    tooltip.innerHTML = makeRow("", info.name, info.desc);
    tooltip.classList.add("tt-show");
    positionTopMenuTooltip(anchorEl);
  }

  function hideTopMenuTooltip() {
    activeMenuEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var found = findTopMenuButton(e.target);
    if (!found || found.el === activeMenuEl) return;
    showTopMenuTooltip(found.el, found.info);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeMenuEl) return;
    var found = findTopMenuButton(e.target);
    if (!found || found.el !== activeMenuEl) return;
    var to = e.relatedTarget;
    if (to && activeMenuEl.contains && activeMenuEl.contains(to)) return;
    hideTopMenuTooltip();
  });

  /* ══════════════════════════════════════════════════════════════════════
     IX. 우측 하단 전투 아이콘(턴 종료/손패/버린 카드) 툴팁
     ══════════════════════════════════════════════════════════════════════ */

  var DOCK_ICON_INFO = [
    { sel: "#endTurn",     name: "턴 종료",   desc: "현재 턴을 종료하고 적의 행동을 진행합니다." },
    { sel: "#exhaustPile", name: "소멸 주문", desc: "이번 전투에서 소멸되어 다시 뽑을 수 없는 주문을 확인합니다." },
    { sel: "#deckPile",    name: "손패",     desc: "현재 손에 들고 있는 카드를 확인합니다." },
    { sel: "#discardPile", name: "버린 카드", desc: "이번 전투에서 사용했거나 버려진 카드를 확인합니다." }
  ];

  function findDockIcon(target) {
    if (!target || !target.closest) return null;
    for (var i = 0; i < DOCK_ICON_INFO.length; i++) {
      var item = DOCK_ICON_INFO[i];
      var el = target.closest(item.sel);
      if (el) return { el: el, info: item };
    }
    return null;
  }

  function positionDockTooltip(anchorEl) {
    var gRect   = game.getBoundingClientRect();
    var aRect   = anchorEl.getBoundingClientRect();
    var tipRect = tooltip.getBoundingClientRect();
    var pad = 8;
    var gap = 10;

    var tx = (aRect.left - gRect.left) + (aRect.width - tipRect.width) * 0.5;
    var ty = (aRect.top - gRect.top) - tipRect.height - gap;

    tx = Math.max(pad, Math.min(gRect.width  - tipRect.width  - pad, tx));
    ty = Math.max(pad, Math.min(gRect.height - tipRect.height - pad, ty));

    tooltip.style.left = tx + "px";
    tooltip.style.top  = ty + "px";
  }

  function showDockTooltip(anchorEl, info) {
    if (!anchorEl || !info) return;
    activeId = null;
    cardActiveEl = null;
    activeStatusEl = null;
    activeItemSlotEl = null;
    activeEnergyEl = null;
    activeHudEl = null;
    activeProgressEl = null;
    activeMenuEl = null;
    activeDockEl = anchorEl;
    tooltip.innerHTML = makeRow("", info.name, info.desc);
    tooltip.classList.add("tt-show");
    positionDockTooltip(anchorEl);
  }

  function hideDockTooltip() {
    activeDockEl = null;
    tooltip.classList.remove("tt-show");
  }

  game.addEventListener("mouseover", function (e) {
    var found = findDockIcon(e.target);
    if (!found || found.el === activeDockEl) return;
    showDockTooltip(found.el, found.info);
  });

  game.addEventListener("mouseout", function (e) {
    if (!activeDockEl) return;
    var found = findDockIcon(e.target);
    if (!found || found.el !== activeDockEl) return;
    var to = e.relatedTarget;
    if (to && activeDockEl.contains && activeDockEl.contains(to)) return;
    hideDockTooltip();
  });

})();
