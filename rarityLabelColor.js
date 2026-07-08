"use strict";
/* 등급 명칭("일반"/"희귀"/"유일")이 설명 텍스트에 등장할 때 색상을 입히는 공용 유틸.
   escapeHtml류로 이스케이프된(혹은 이스케이프가 필요 없는) 텍스트에 적용한다. */
var RARITY_LABEL_COLOR = {
  "일반": "#1f7a3f",
  "희귀": "#1959c8",
  "유일": "#a8720a"
};

/* 공격(정화)/결계/디버프(부여) 수치를 문맥으로 판별해 색을 입히는 공용 유틸.
   절(문장) 경계(마침표/줄바꿈)를 넘어가면 서로 다른 효과가 뒤섞여 오판하므로
   절 단위로 잘라 그 안에서만 앞뒤 문맥을 본다. */
var COMBAT_NUMBER_COLOR = {
  attack: "#c23b2e",
  ward: "#1f5fa5",
  debuff: "#7a3aa8"
};
var COMBAT_NUMBER_RE = /\d+(?:\.\d+)?%?/g;
var COMBAT_WARD_BEFORE_RE = /결계[를가량이]*\s*$/;
var COMBAT_WARD_AFTER_RE = /^\s*(을|를)?\s*(얻|증가|소모)/;
var COMBAT_ATTACK_BEFORE_RE = /정화량이\s*$/;

function classifyCombatNumber(before, after){
  if(/부여/.test(after)) return "debuff";
  if(/정화/.test(after)) return "attack";
  if(COMBAT_ATTACK_BEFORE_RE.test(before)) return "attack";
  if(COMBAT_WARD_BEFORE_RE.test(before) && COMBAT_WARD_AFTER_RE.test(after)) return "ward";
  return null;
}

/* 절 하나를 채색한다. forceCategory가 있으면(괄호 부연설명 등) 문맥 판정 없이
   그대로 적용하고, 없으면 숫자마다 절 내부 앞뒤 문맥으로 판정한다.
   반환값의 category는 이 절에서 마지막으로 판정된 카테고리(다음 괄호절 상속용). */
function colorizeClauseCombatNumbers(clause, forceCategory){
  var seenCategory = forceCategory || null;
  var html = clause.replace(COMBAT_NUMBER_RE, function(numStr, offset){
    var category = forceCategory || classifyCombatNumber(clause.slice(0, offset), clause.slice(offset + numStr.length));
    if(!category) return numStr;
    seenCategory = category;
    return '<span style="color:' + COMBAT_NUMBER_COLOR[category] + ';font-weight:700;">' + numStr + '</span>';
  });
  return { html: html, category: seenCategory };
}

function colorizeCombatNumbers(text){
  var str = String(text ?? "");
  var parts = str.split(/([.\n])/);
  var lastCategory = null;
  var out = "";
  for(var i = 0; i < parts.length; i++){
    var part = parts[i];
    if(part === "." || part === "\n" || part === ""){ out += part; continue; }
    var hasOwnKeyword = /부여|정화|결계/.test(part);
    var isParenthetical = !hasOwnKeyword && /^\s*[(（]/.test(part) && lastCategory;
    var result = colorizeClauseCombatNumbers(part, isParenthetical ? lastCategory : null);
    out += result.html;
    if(result.category) lastCategory = result.category;
  }
  return out;
}

/* "일반 전투"/"일반 몬스터"/"일반 적"처럼 등급이 아니라 전투 종류·대상을 가리키는
   관용구는 등급 명칭과 우연히 겹치는 단어일 뿐이므로 색을 입히지 않는다.
   "적"은 적립/적절 등 무관한 단어의 앞부분과도 겹치므로, 뒤에 다른 음절이
   이어지지 않고 끝나거나 공백/구두점으로 끊길 때만 "적(enemy)"으로 간주한다. */
var RARITY_LABEL_NON_GRADE_AFTER_RE = /^\s*(?:전투|몬스터|적(?=[\s.,()（）]|$))/;

function colorizeRarityLabels(text){
  var str = colorizeCombatNumbers(String(text ?? ""));
  return str.replace(/일반|희귀|유일/g, function(word, offset, whole){
    if(RARITY_LABEL_NON_GRADE_AFTER_RE.test(whole.slice(offset + word.length))) return word;
    return '<span style="color:' + RARITY_LABEL_COLOR[word] + ';font-weight:700;">' + word + '</span>';
  });
}
