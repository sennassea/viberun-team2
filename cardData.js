"use strict";
/* =========================================================================
   Card Data - 56-card first migration
   - This file only owns card data.
   - New mechanics from the migration sheet are intentionally not implemented here.
   ========================================================================= */

const CARD_DB = {
  // -----------------------------------------------------------------------
  // 범용 보조 덱
  // -----------------------------------------------------------------------
  rosary_throw:{name:"염주 던지기", cost:1, type:"attack", emoji:"📿", target:"enemy", attr:"범용 보조 덱", rarity:"starter",
          desc:"유령의 미련을 6만큼 정화합니다.", fx:[{t:"damage",v:6}]},
  bell_shake:{name:"방울 흔들기", cost:1, type:"attack", emoji:"🔔", target:"enemy", attr:"범용 보조 덱", rarity:"starter",
          desc:"유령의 미련을 4만큼 정화합니다.\n주문을 1장 뽑습니다.", fx:[{t:"damage",v:4},{t:"draw",v:1}]},
  calm_breath:{name:"심호흡", cost:1, type:"skill", emoji:"🌬️", target:"self", attr:"범용 보조 덱", rarity:"starter",
          desc:"정신력을 6 회복합니다.", fx:[{t:"heal",v:6}]},
  breath_order:{name:"호흡 정리", cost:0, type:"skill", emoji:"🫁", target:"self", attr:"범용 보조 덱", rarity:"common",
          desc:"주문을 1장 뽑습니다.", fx:[{t:"draw",v:1}]},
  short_meditation:{name:"향 피우기", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"범용 보조 덱", rarity:"common",
          desc:"치유의 향기 1을 얻습니다. 치유의 향기가 유지되는 동안 턴 종료 시 정신력을 1 회복합니다.\n사용 후 소멸.", fx:[{t:"gainBlessing",key:"healingFragrance",v:1}], exhaust:true},
  purifying_talisman:{name:"정화부", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"범용 보조 덱", rarity:"common",
          desc:"유령의 미련을 6만큼 정화합니다.", fx:[{t:"damage",v:6}]},
  mind_training:{name:"정신 수련", cost:0, type:"skill", emoji:"🧘", target:"self", attr:"범용 보조 덱", rarity:"uncommon",
          desc:"이번 턴 신통력을 1 회복합니다.\n소멸.", fx:[{t:"energy",v:1}], exhaust:true},
  fast_chanting:{name:"속전염송", cost:1, type:"skill", emoji:"📜", target:"self", attr:"범용 보조 덱", rarity:"common",
          desc:"주문을 2장 뽑습니다.", fx:[{t:"draw",v:2}]},
  altar_preparation:{name:"제단 준비", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"범용 보조 덱", rarity:"uncommon",
          desc:"제단의 기운 1을 얻습니다. 이 위령 동안 매 턴 처음으로 복 주문을 사용하면 마음의 결계를 1 얻습니다.\n사용 후 소멸.", fx:[{t:"gainBlessing",key:"altarEnergy",v:1}], exhaust:true},
  last_struggle:{name:"마지막 발버둥", cost:2, type:"attack", emoji:"💥", target:"enemy", attr:"범용 보조 덱", rarity:"rare",
          desc:"모든 유령의 미련을 5만큼 정화합니다.\n사용 후 소멸.", fx:[{t:"damageAll",v:5}], exhaust:true},
  memory_doll:{name:"기억 인형", cost:1, type:"attack", emoji:"🧸", target:"enemy", attr:"범용 보조 덱", rarity:"starter",
          desc:"유령의 미련을 4만큼 정화합니다. 동요를 1 부여합니다.", fx:[{t:"damage",v:4},{t:"applyWeak",v:1}]},

  // -----------------------------------------------------------------------
  // 결계 덱
  // -----------------------------------------------------------------------
  guardian_talisman:{name:"수호부", cost:1, type:"defense", emoji:"🧿", target:"self", attr:"결계 덱", rarity:"common",
          desc:"마음의 결계를 7 얻습니다.", fx:[{t:"block",v:7}]},
  quiet_steps:{name:"조용한 발걸음", cost:1, type:"defense", emoji:"👣", target:"self", attr:"결계 덱", rarity:"common",
          desc:"마음의 결계를 5 얻습니다.\n주문을 1장 뽑습니다.", fx:[{t:"block",v:5},{t:"draw",v:1}]},
  folded_ward:{name:"접어둔 방위부", cost:0, type:"defense", emoji:"📄", target:"self", attr:"결계 덱", rarity:"common",
          desc:"마음의 결계를 4 얻습니다.", fx:[{t:"block",v:4}]},
  clear_mind_art:{name:"맑은 마음법", cost:1, type:"skill", emoji:"💧", target:"self", attr:"결계 덱", rarity:"common",
          desc:"마음의 결계를 4 얻습니다.\n신통력을 1 회복합니다.", fx:[{t:"block",v:4},{t:"energy",v:1}]},
  guardian_script:{name:"수호경", cost:1, type:"defense", emoji:"📖", target:"self", attr:"결계 덱", rarity:"starter",
          desc:"마음의 결계를 7 얻습니다.", fx:[{t:"block",v:7}]},
  five_direction_barrier:{name:"오방결계", cost:1, type:"defense", emoji:"🧭", target:"self", attr:"결계 덱", rarity:"starter",
          desc:"마음의 결계를 6 얻습니다.\n동요를 1 제거합니다.", fx:[{t:"block",v:6},{t:"removeWeak",v:1}]},
  reverse_barrier:{name:"역결계", cost:2, type:"defense", emoji:"↩️", target:"enemy", attr:"결계 덱", rarity:"uncommon",
          desc:"마음의 결계를 5 얻습니다. 그 후 현재 결계의 135%만큼 유령 하나를 정화합니다.", fx:[{t:"block",v:5},{t:"damageByBlockRatio",v:1.35}]},
  silent_ward:{name:"정적의 방", cost:1, type:"skill", emoji:"🚪", target:"self", attr:"결계 덱", rarity:"uncommon",
          desc:"고요한 결계 1을 얻습니다. 이 위령 동안 턴 종료 시 결계가 1 이상 남아 있으면 다음 턴 시작 시 결계를 3 얻습니다.\n사용 후 소멸.", fx:[{t:"gainBlessing",key:"quietBarrier",v:1}], exhaust:true},
  barrier_charge:{name:"결계 충전", cost:1, type:"skill", emoji:"🔋", target:"self", attr:"결계 덱", rarity:"uncommon",
          desc:"마음의 결계를 8 얻습니다.", fx:[{t:"block",v:8}]},
  returning_wall:{name:"되돌리는 벽", cost:2, type:"attack", emoji:"🧱", target:"enemy", attr:"결계 덱", rarity:"rare",
          desc:"현재 결계의 185%만큼 유령 하나를 정화합니다. 그 후 결계를 전부 소모합니다.", fx:[{t:"damageByBlockRatioConsume",v:1.85,consumeRatio:1}]},

  // -----------------------------------------------------------------------
  // 회상 덱
  // -----------------------------------------------------------------------
  lullaby_chant:{name:"자장 염송", cost:1, type:"skill", emoji:"🎵", target:"enemy", attr:"회상 덱", rarity:"common",
          desc:"회상을 1 부여합니다. 주문을 1장 뽑습니다.", fx:[{t:"applyRecollection",v:1},{t:"draw",v:1}]},
  shaking_heart:{name:"흔들리는 마음", cost:1, type:"skill", emoji:"💓", target:"enemy", attr:"회상 덱", rarity:"common",
          desc:"회상과 균열을 1씩 부여합니다. 대상의 회상이 3 이상이면 주문을 1장 뽑습니다.", fx:[{t:"applyRecollection",v:1},{t:"applyFracture",v:1},{t:"ifRecollectionAtLeastDraw",threshold:3,v:1}]},
  unread_letter:{name:"읽지 못한 편지", cost:1, type:"attack", emoji:"✉️", target:"enemy", attr:"회상 덱", rarity:"common",
          desc:"유령의 미련을 4만큼 정화합니다. 회상을 1 부여합니다.", fx:[{t:"damage",v:4},{t:"applyRecollection",v:1}]},
  uneasy_silence:{name:"불편한 침묵", cost:1, type:"skill", emoji:"🤫", target:"self", attr:"회상 덱", rarity:"common",
          desc:"회상의 메아리 1을 얻습니다. 이 위령 동안 매 턴 처음 회상이 있는 유령을 정화하면 그 유령에게 회상 1을 추가 부여합니다. 사용 후 소멸.", fx:[{t:"gainBlessing",key:"recollectionEcho",v:1}], exhaust:true},
  deep_sigh:{name:"깊은 한숨", cost:0, type:"skill", emoji:"💨", target:"enemy", attr:"회상 덱", rarity:"common",
          desc:"회상을 1 부여합니다. 사용 후 소멸.", fx:[{t:"applyRecollection",v:1}], exhaust:true},
  tearful_memory:{name:"눈물 젖은 기억", cost:1, type:"attack", emoji:"💧", target:"enemy", attr:"회상 덱", rarity:"uncommon",
          desc:"유령의 미련을 5만큼 정화합니다. 대상이 살아 있으면 회상 1을 부여합니다. 이 정화로 성불시키면 다른 유령에게 회상 2를 전이합니다.", fx:[{t:"damage",v:5},{t:"transferRecollectionOnKill",v:2},{t:"applyRecollection",v:1}]},
  collapsed_ward:{name:"무너진 병실", cost:2, type:"skill", emoji:"🏥", target:"enemy", attr:"회상 덱", rarity:"uncommon",
          desc:"모든 유령에게 회상과 균열을 1씩 부여합니다.", fx:[{t:"applyRecollectionAll",v:1},{t:"applyFractureAll",v:1}]},
  unsent_words:{name:"전하지 못한 말", cost:2, type:"attack", emoji:"💬", target:"enemy", attr:"회상 덱", rarity:"rare",
          desc:"대상의 현재 회상 수치의 50%만큼 회상을 추가 부여합니다. 추가 수치는 최소 1, 최대 2입니다. 사용 후 소멸.", fx:[{t:"applyRecollectionByCurrentRatio",ratio:0.5,min:1,max:2}], exhaust:true},
  mind_collapse:{name:"마음 붕괴", cost:3, type:"attack", emoji:"🧠", target:"enemy", attr:"회상 덱", rarity:"rare",
          desc:"대상에게 회상 2와 균열 1을 부여합니다. 적용 후 대상의 회상이 6 이상이면 다른 모든 유령에게 회상 2를 부여합니다.", fx:[{t:"applyRecollection",v:2},{t:"applyFracture",v:1},{t:"ifRecollectionAtLeastApplyRecollectionAll",threshold:6,v:2}]},

  // -----------------------------------------------------------------------
  // 성불 표식 덱
  // -----------------------------------------------------------------------
  exorcism_talisman:{name:"퇴마부", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"성불 표식 덱", rarity:"common",
          desc:"유령의 미련을 5만큼 정화합니다. 성불 표식을 1 부여합니다.", fx:[{t:"damage",v:5},{t:"applyMark",v:1}]},
  requiem_script:{name:"진혼경", cost:1, type:"attack", emoji:"📜", target:"enemy", attr:"성불 표식 덱", rarity:"common",
          desc:"유령의 미련을 6만큼 정화합니다. 성불 표식이 있으면 추가로 4 정화합니다.", fx:[{t:"damage",v:6},{t:"ifMarkedDamage",v:4}]},
  small_passing_rite:{name:"작은 천도", cost:1, type:"skill", emoji:"🪷", target:"enemy", attr:"성불 표식 덱", rarity:"common",
          desc:"성불 표식을 2 부여합니다.\n주문을 1장 뽑습니다.", fx:[{t:"applyMark",v:2},{t:"draw",v:1}]},
  release_touch:{name:"성불의 손짓", cost:1, type:"skill", emoji:"🤲", target:"self", attr:"성불 표식 덱", rarity:"common",
          desc:"인도의 손길 1을 얻습니다. 이 위령 동안 매 턴 처음으로 성불 표식을 부여하면 주문을 1장 뽑습니다.\n사용 후 소멸.", fx:[{t:"gainBlessing",key:"guidingHand",v:1}], exhaust:true},
  spirit_guidance:{name:"혼백 인도", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"성불 표식 덱", rarity:"common",
          desc:"신통력을 1 회복합니다.\n주문을 1장 뽑습니다.\n소멸.", fx:[{t:"energy",v:1},{t:"draw",v:1}], exhaust:true},
  path_of_light:{name:"빛길 열기", cost:2, type:"attack", emoji:"✨", target:"enemy", attr:"성불 표식 덱", rarity:"common",
          desc:"모든 유령의 미련을 4만큼 정화합니다.", fx:[{t:"damageAll",v:4}]},
  guiding_rite:{name:"천도재", cost:2, type:"attack", emoji:"🕯️", target:"enemy", attr:"성불 표식 덱", rarity:"uncommon",
          desc:"유령의 미련을 9만큼 정화합니다. 성불 표식이 있으면 추가로 6 정화합니다.", fx:[{t:"damage",v:9},{t:"ifMarkedDamage",v:6}]},
  purification_wave:{name:"정화의 파동", cost:2, type:"attack", emoji:"🌊", target:"enemy", attr:"성불 표식 덱", rarity:"uncommon",
          desc:"모든 유령의 미련을 5만큼 정화합니다.", fx:[{t:"damageAll",v:5}]},
  soul_passing:{name:"혼백천도", cost:3, type:"attack", emoji:"🪷", target:"enemy", attr:"성불 표식 덱", rarity:"rare",
          desc:"유령의 미련을 16만큼 정화합니다. 대상의 성불 표식을 전부 소모하고, 소모한 표식 1마다 5 추가 정화합니다. 사용 후 소멸.", fx:[{t:"consumeAllMarksDamage",base:16,per:5}], exhaust:true},
  lotus_crossing:{name:"연화길", cost:3, type:"attack", emoji:"🪷", target:"enemy", attr:"성불 표식 덱", rarity:"rare",
          desc:"모든 유령의 미련을 9만큼 정화합니다.\n사용 후 소멸.", fx:[{t:"damageAll",v:9}], exhaust:true},

  // -----------------------------------------------------------------------
  // 한풀이 덱
  // -----------------------------------------------------------------------
  unsaid_words_han:{name:"못다 한 말", cost:1, type:"attack", emoji:"💬", target:"enemy", attr:"한풀이 덱", rarity:"common",
          desc:"유령의 미련을 7만큼 정화합니다. 턴 종료 시 사용되지 않은 채 버려지면 이번 위령 동안 이 주문의 정화량이 3 증가합니다. 최대 3회.", fx:[{t:"damage",v:7,growthStat:"damage"}], hanpuriGrowth:{stat:"damage",perGrowth:3,maxGrowth:3}},
  swallowed_cry:{name:"삼킨 울음", cost:1, type:"defense", emoji:"😶", target:"self", attr:"한풀이 덱", rarity:"common",
          desc:"마음의 결계를 6 얻습니다. 턴 종료 시 사용되지 않은 채 버려지면 이번 위령 동안 이 주문의 결계량이 2 증가합니다. 최대 3회.", fx:[{t:"block",v:6,growthStat:"block"}], hanpuriGrowth:{stat:"block",perGrowth:2,maxGrowth:3}},
  unfinished_confession:{name:"끝내 못한 고백", cost:2, type:"attack", emoji:"💌", target:"enemy", attr:"한풀이 덱", rarity:"uncommon",
          desc:"유령의 미련을 13만큼 정화합니다. 턴 종료 시 사용되지 않은 채 버려지면 이번 위령 동안 정화량이 5 증가합니다. 최대 2회.", fx:[{t:"damage",v:13,growthStat:"damage"}], hanpuriGrowth:{stat:"damage",perGrowth:5,maxGrowth:2}},
  recollecting_night:{name:"되새기는 밤", cost:1, type:"skill", emoji:"🌙", target:"self", attr:"한풀이 덱", rarity:"common",
          desc:"버림 더미에서 이번 위령 중 수치가 증가한 주문 1장을 선택해 손패로 가져옵니다. 주문을 1장 뽑습니다.", fx:[{t:"recoverGrownHanpuri",costZero:false},{t:"draw",v:1}]},
  cannot_let_go:{name:"놓지 못한 손", cost:0, type:"skill", emoji:"🤝", target:"self", attr:"한풀이 덱", rarity:"uncommon",
          desc:"손패의 다른 한풀이 주문 1장을 선택해 버립니다. 그 주문의 미사용 성장 효과를 즉시 1회 발동합니다. 주문을 1장 뽑습니다. 사용 후 소멸.", fx:[{t:"discardOtherHanpuriGrow"},{t:"draw",v:1}], exhaust:true},
  returned_grudge:{name:"되돌아온 응어리", cost:1, type:"attack", emoji:"↩️", target:"enemy", attr:"한풀이 덱", rarity:"common",
          desc:"유령의 미련을 7만큼 정화합니다. 이번 턴 버림 더미에서 한풀이 주문을 가져왔다면 추가로 7 정화합니다.", fx:[{t:"damage",v:7},{t:"ifHanpuriRecoveredDamage",v:7}]},
  deepened_grudge:{name:"깊어진 응어리", cost:1, type:"skill", emoji:"🪨", target:"self", attr:"한풀이 덱", rarity:"uncommon",
          desc:"응어리 복을 얻습니다. 이 위령 동안 한풀이 주문의 수치가 증가할 때마다 마음의 결계를 2 얻습니다. 사용 후 소멸.", fx:[{t:"gainBlessing",key:"grudgeBlessing",v:1}], exhaust:true},
  release_grudge:{name:"한을 풀다", cost:1, type:"skill", emoji:"🧵", target:"self", attr:"한풀이 덱", rarity:"rare",
          desc:"버림 더미에서 수치가 증가한 한풀이 주문 1장을 선택해 손패로 가져옵니다. 그 주문의 비용은 이번 턴 0이 됩니다. 주문을 1장 뽑습니다. 사용 후 소멸.", fx:[{t:"recoverGrownHanpuri",costZero:true},{t:"draw",v:1}], exhaust:true},

  // -----------------------------------------------------------------------
  // 굿판 덱
  // -----------------------------------------------------------------------
  awaken_bell:{name:"방울 깨우기", cost:1, type:"skill", emoji:"🔔", target:"self", attr:"굿판 덱", rarity:"common",
          desc:"방울치기 2장을 손패에 생성합니다.", fx:[{t:"createCardToHand",key:"bell_strike",v:2}]},
  sevenstar_bell:{name:"칠성 방울", cost:1, type:"skill", emoji:"🌟", target:"self", attr:"굿판 덱", rarity:"common",
          desc:"주문을 1장 뽑고 방울치기 1장을 손패에 생성합니다.", fx:[{t:"draw",v:1},{t:"createCardToHand",key:"bell_strike",v:1}]},
  warding_dance:{name:"액막이 춤", cost:1, type:"defense", emoji:"💃", target:"self", attr:"굿판 덱", rarity:"common",
          desc:"마음의 결계를 4 얻고 방울치기 1장을 손패에 생성합니다.", fx:[{t:"block",v:4},{t:"createCardToHand",key:"bell_strike",v:1}]},
  whirlwind_gut:{name:"휘몰이굿", cost:1, type:"skill", emoji:"🌀", target:"self", attr:"굿판 덱", rarity:"uncommon",
          desc:"방울치기 3장을 손패에 생성합니다. 사용 후 소멸.", fx:[{t:"createCardToHand",key:"bell_strike",v:3}], exhaust:true},
  raise_divine_spirit:{name:"신명 돋우기", cost:1, type:"skill", emoji:"🔥", target:"self", attr:"굿판 덱", rarity:"uncommon",
          desc:"신명 복을 얻습니다. 이 위령 동안 방울치기의 정화량이 3 증가합니다. 사용 후 소멸.", fx:[{t:"gainBlessing",key:"divineSpirit",v:1}], exhaust:true},
  heating_ritual:{name:"판이 달아오른다", cost:1, type:"skill", emoji:"🥁", target:"self", attr:"굿판 덱", rarity:"rare",
          desc:"열기 복을 얻습니다. 이 위령 동안 매 턴 4번째 주문을 사용하면 모든 유령의 미련을 2만큼 정화합니다. 사용 후 소멸.", fx:[{t:"gainBlessing",key:"heat",v:1}], exhaust:true},
  step_together:{name:"발맞춤", cost:1, type:"skill", emoji:"👣", target:"self", attr:"굿판 덱", rarity:"common",
          desc:"주문을 2장 뽑고 손패 1장을 버립니다. 이번 턴 방울치기를 사용했다면 버리지 않습니다.", fx:[{t:"draw",v:2},{t:"discardHandUnlessBellUsed",v:1}]},
  bell_strike:{name:"방울치기", cost:0, type:"attack", emoji:"🔔", target:"enemy", attr:"굿판 덱", rarity:"common",
          desc:"유령의 미련을 5만큼 정화합니다. 사용 후 소멸. 이 주문은 일반 주문 보상에 등장하지 않습니다.", fx:[{t:"damage",v:5,gutpanBonus:"divineSpirit",gutpanBonusMultiplier:3}], exhaust:true, generatedOnly:true, excludeFromRewards:true}
};

if(window.BOHYUN_LIFE_SYSTEM && typeof window.BOHYUN_LIFE_SYSTEM.getStatusCardDb === "function"){
  Object.assign(CARD_DB, window.BOHYUN_LIFE_SYSTEM.getStatusCardDb());
}

const CARD_ART_BASE = "assets/card_art/";
const CARD_ART_FILES = {
  altar_preparation: "altar_preparation.jpg",
  awaken_bell: "awaken_bell.jpg",
  barrier_charge: "barrier_charge.jpg",
  bell_strike: "bell_strike.jpg",
  bell_shake: "bell_shake.jpg",
  breath_order: "breath_order.jpg",
  calm_breath: "calm_breath.jpg",
  clear_mind_art: "clear_mind_art.jpg",
  collapsed_ward: "collapsed_ward.jpg",
  cannot_let_go: "cannot_let_go.jpg",
  deepened_grudge: "deepened_grudge.jpg",
  deep_sigh: "deep_sigh.jpg",
  exorcism_talisman: "exorcism_talisman.jpg",
  fast_chanting: "fast_chanting.jpg",
  five_direction_barrier: "five_direction_barrier.jpg",
  folded_ward: "folded_ward.jpg",
  guardian_script: "guardian_script.jpg",
  guardian_talisman: "guardian_talisman.jpg",
  guiding_rite: "guiding_rite.jpg",
  heating_ritual: "heating_ritual.jpg",
  hesitation: "hesitation.jpg",
  intrusive_accident: "intrusive_accident.jpg",
  intrusive_thought: "intrusive_thought.jpg",
  regret: "regret.jpg",
  last_struggle: "last_struggle.jpg",
  lotus_crossing: "lotus_crossing.jpg",
  lullaby_chant: "lullaby_chant.jpg",
  memory_doll: "memory_doll.jpg",
  mind_collapse: "mind_collapse.jpg",
  mind_training: "mind_training.jpg",
  path_of_light: "path_of_light.jpg",
  purification_wave: "purification_wave.jpg",
  purifying_talisman: "purifying_talisman.jpg",
  quiet_steps: "quiet_steps.jpg",
  raise_divine_spirit: "raise_divine_spirit.jpg",
  recollecting_night: "recollecting_night.jpg",
  release_grudge: "release_grudge.jpg",
  release_touch: "release_touch.jpg",
  requiem_script: "requiem_script.jpg",
  returned_grudge: "returned_grudge.jpg",
  returning_wall: "returning_wall.jpg",
  reverse_barrier: "reverse_barrier.jpg",
  rosary_throw: "rosary_throw.jpg",
  sevenstar_bell: "sevenstar_bell.jpg",
  shaking_heart: "shaking_heart.jpg",
  short_meditation: "short_meditation.jpg",
  silent_ward: "silent_ward.jpg",
  small_passing_rite: "small_passing_rite.jpg",
  soul_passing: "soul_passing.jpg",
  spirit_guidance: "spirit_guidance.jpg",
  step_together: "step_together.jpg",
  swallowed_cry: "swallowed_cry.jpg",
  tearful_memory: "tearful_memory.jpg",
  uneasy_silence: "uneasy_silence.jpg",
  unfinished_confession: "unfinished_confession.jpg",
  unread_letter: "unread_letter.jpg",
  unsaid_words_han: "unsaid_words_han.jpg",
  warding_dance: "warding_dance.jpg",
  whirlwind_gut: "whirlwind_gut.jpg",
  unsent_words: "unsent_words.jpg"
};

Object.entries(CARD_ART_FILES).forEach(([key, file]) => {
  if(CARD_DB[key]){
    CARD_DB[key].art = CARD_ART_BASE + file;
  }
});

const BASE_STARTER_DECK = [
  "rosary_throw","rosary_throw","rosary_throw","rosary_throw",
  "bell_shake","bell_shake",
  "calm_breath",
  "guardian_script","guardian_script","guardian_script",
  "five_direction_barrier","five_direction_barrier",
  "memory_doll","memory_doll"
];
let STARTER_DECK = [...BASE_STARTER_DECK];

const CARD_REWARD_POOL = Object.keys(CARD_DB).filter(key => {
  const card = CARD_DB[key];
  return card && !card.excludeFromRewards && !card.generatedOnly && !["starter", "status"].includes(card.rarity);
});

// 법구/영맥 데이터는 equipment.js / potion.js에서 관리합니다.
// cardData.js는 주문 데이터만 담당합니다.

const typeLabel = t => t==="attack" ? "정화" : t==="defense" ? "결계" : t==="skill" ? "복" : t==="status" ? "상태" : "주문";
