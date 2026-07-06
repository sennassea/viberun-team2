"use strict";
/* 등급 명칭("일반"/"희귀"/"유일")이 설명 텍스트에 등장할 때 색상을 입히는 공용 유틸.
   escapeHtml류로 이스케이프된(혹은 이스케이프가 필요 없는) 텍스트에 적용한다. */
var RARITY_LABEL_COLOR = {
  "일반": "#1f7a3f",
  "희귀": "#1959c8",
  "유일": "#a8720a"
};

function colorizeRarityLabels(text){
  var str = String(text ?? "");
  return str.replace(/일반|희귀|유일/g, function(word){
    return '<span style="color:' + RARITY_LABEL_COLOR[word] + ';font-weight:700;">' + word + '</span>';
  });
}
