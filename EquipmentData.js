"use strict";
/* =========================================================================
   EquipmentData.js – 법구 데이터 전용 파일
   - 법구는 이 파일의 RELIC_DB만 수정하면 상점/보상/가방/전투 효과에 반영됩니다.
   - 각 법구의 fx는 script.js의 applyRelicEffect에서 처리합니다.
   ========================================================================= */

var RELIC_DB = [
  { id:"bronze_incense_burner", name:"청동 향로", emoji:"🏺", attr:"범용", rarity:"common", price:70, dropWeight:3, desc:"첫 턴 주문을 1장 추가로 뽑습니다.", fx:[{timing:"battleStart", t:"draw", v:1}] },
  { id:"ghost_gate_mirror", name:"귀문경", emoji:"🪞", attr:"범용", rarity:"uncommon", price:100, dropWeight:2, desc:"전투 종료 시 정신력을 5 회복합니다.", fx:[{timing:"battleEnd", t:"heal", v:5}] },
  { id:"moon_spirit_tablet", name:"월령패", emoji:"🌙", attr:"범용", rarity:"common", price:75, dropWeight:3, desc:"전투마다 처음 사용하는 공격 주문의 정화량이 3 증가합니다.", fx:[{timing:"firstAttack", t:"damagePlus", v:3}] },
  { id:"goblin_pouch", name:"도깨비 주머니", emoji:"👝", attr:"범용", rarity:"uncommon", price:105, dropWeight:2, desc:"전투 시작 시 무작위 약병을 1개 얻습니다.", fx:[{timing:"battleStart", t:"gainRandomPotion", v:1}] },

  { id:"demon_sealing_tablet", name:"봉마패", emoji:"🧿", attr:"결계", rarity:"common", price:75, dropWeight:3, desc:"전투 시작 시 마음의 결계를 8 얻습니다.", fx:[{timing:"battleStart", t:"block", v:8}] },
  { id:"red_golden_rope", name:"붉은 금줄", emoji:"🪢", attr:"결계", rarity:"uncommon", price:110, dropWeight:2, desc:"결계를 얻을 때마다 무작위 적의 미련을 1 정화합니다.", fx:[{timing:"onBlockGain", t:"damageRandomEnemy", v:1}] },
  { id:"bronze_shield_mirror", name:"청동 방패경", emoji:"🛡️", attr:"결계", rarity:"rare", price:145, dropWeight:1, desc:"턴 종료 시 결계의 절반이 다음 턴까지 유지됩니다.", fx:[{timing:"turnEnd", t:"retainBlockRatio", v:0.5}] },

  { id:"spirit_thread_doll", name:"혼령매듭 인형", emoji:"🧸", attr:"동요", rarity:"common", price:75, dropWeight:3, desc:"동요를 부여하면 턴당 1회 주문을 1장 뽑습니다.", fx:[{timing:"onAgitationApply", t:"draw", v:1, oncePerTurn:true}] },
  { id:"soul_return_mirror", name:"회혼경", emoji:"🪞", attr:"동요", rarity:"uncommon", price:105, dropWeight:2, desc:"동요 상태의 적에게 주는 정화량이 2 증가합니다.", fx:[{timing:"damage", t:"damagePlusVsAgitated", v:2}] },
  { id:"echoing_wind_chime", name:"울림 풍경", emoji:"🎐", attr:"동요", rarity:"common", price:70, dropWeight:3, desc:"전투 시작 시 가장 앞의 적에게 동요를 2 부여합니다.", fx:[{timing:"battleStart", t:"applyAgitation", target:"frontEnemy", v:2}] },

  { id:"lotus_lamp", name:"연화 등잔", emoji:"🪷", attr:"성불", rarity:"common", price:80, dropWeight:3, desc:"성불 표식을 부여할 때 1 추가로 부여합니다.", fx:[{timing:"onMarkApply", t:"markPlus", v:1}] },
  { id:"bronze_wooden_fish", name:"청동 목탁", emoji:"🐟", attr:"성불", rarity:"uncommon", price:110, dropWeight:2, desc:"성불 표식이 있는 적에게 주는 정화량이 2 증가합니다.", fx:[{timing:"damage", t:"damagePlusVsMarked", v:2}] },
  { id:"thunder_spirit_bell", name:"뇌령방울", emoji:"🔔", attr:"범용", rarity:"rare", price:220, dropWeight:1, desc:"공격 주문의 정화량이 1 증가합니다.", fx:[{timing:"damage", t:"damagePlus", v:1}] },
  { id:"lotus_seed_bead", name:"연씨 염주", emoji:"📿", attr:"성불", rarity:"common", price:120, dropWeight:3, desc:"전투 시작 시 가장 앞의 적에게 성불 표식을 1 부여합니다.", fx:[{timing:"battleStart", t:"applyMark", target:"frontEnemy", v:1}] },
  { id:"lizard_tail_charm", name:"도마뱀 꼬리 부적", emoji:"🦎", attr:"범용", rarity:"rare", price:220, dropWeight:1, desc:"쓰러질 때 이 법구를 소모하고 최대 정신력의 50%를 회복합니다.", fx:[{timing:"fatalDamage", t:"revive", v:0.5, consume:true}] }
];

window.RELIC_DB = RELIC_DB;
