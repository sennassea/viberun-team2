"use strict";
/* =========================================================================
   PotionData.js – 약병 데이터 전용 파일
   - 약병은 이 파일의 POTION_DB만 수정하면 상점/보상/가방/전투 사용에 반영됩니다.
   - effect는 script.js의 usePotionEffect에서 처리합니다.
   ========================================================================= */

var POTION_SLOT_LIMIT = 3;

var POTION_DB = [
  { id:"cheongsim_pill", name:"청심환", emoji:"💊", type:"heal", effect:"healPlayerHp", value:18, target:"player", rarity:"common", price:35, dropWeight:3, desc:"정신력을 18 회복합니다." },
  { id:"focus_talisman", name:"집중부", emoji:"🔖", type:"energy", effect:"gainEnergy", value:1, target:"player", rarity:"common", price:30, dropWeight:3, desc:"이번 턴 정신력을 1 회복합니다." },
  { id:"protective_talisman", name:"호신부", emoji:"🧿", type:"block", effect:"gainBlock", value:12, target:"player", rarity:"common", price:35, dropWeight:3, desc:"마음의 결계를 12 얻습니다." },
  { id:"five_direction_water", name:"오방수", emoji:"🌊", type:"blockCleanse", effect:"blockAndRemoveAgitation", value:8, removeWeak:1, target:"player", rarity:"common", price:40, dropWeight:3, desc:"마음의 결계를 8 얻고 동요를 1 제거합니다." },
  { id:"lotus_incense", name:"연꽃 향", emoji:"🪷", type:"applyMark", effect:"applyMark", value:3, target:"enemy", rarity:"common", price:40, dropWeight:3, desc:"대상에게 성불 표식을 3 부여합니다." },
  { id:"unsaid_letter", name:"말하지 못한 편지", emoji:"💌", type:"applyWeak", effect:"applyAgitation", value:3, target:"enemy", rarity:"common", price:40, dropWeight:3, desc:"대상에게 동요를 3 부여합니다." },
  { id:"spirit_eye_water", name:"영안수", emoji:"👁️", type:"draw", effect:"drawCards", value:3, target:"player", rarity:"uncommon", price:55, dropWeight:2, desc:"주문을 3장 뽑습니다." },
  { id:"ghost_gate_talisman", name:"귀문부", emoji:"符", type:"nextAttackDouble", effect:"nextAttackDouble", value:2, target:"player", rarity:"rare", price:85, dropWeight:1, desc:"이번 턴 다음 공격 주문의 정화량이 2배가 됩니다." }
];

window.POTION_SLOT_LIMIT = POTION_SLOT_LIMIT;
window.POTION_DB = POTION_DB;
