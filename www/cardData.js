"use strict";
/* =========================================================================
   Card Data – ACT1 1차 밸런스 안정 버전
   - 현재 프로젝트 script.js가 지원하는 효과 타입만 사용
   - 수정 파일은 cardData.js 1개만 교체하면 됩니다.
   - 범용 10 / 결계 10 / 동요 10 / 성불 10
   ========================================================================= */

const CARD_DB = {
  // -----------------------------------------------------------------------
  // 범용 카드 10장
  // -----------------------------------------------------------------------
  rosary_throw:{name:"염주 던지기", cost:1, type:"attack", emoji:"📿", target:"enemy", attr:"범용", rarity:"starter",
          desc:"적의 미련을 6만큼 정화합니다.", fx:[{t:"damage",v:6}]},
  bell_shake:{name:"방울 흔들기", cost:1, type:"attack", emoji:"🔔", target:"enemy", attr:"범용", rarity:"starter",
          desc:"적의 미련을 4만큼 정화합니다.\n카드를 1장 뽑습니다.", fx:[{t:"damage",v:4},{t:"draw",v:1}]},
  calm_breath:{name:"심호흡", cost:1, type:"skill", emoji:"🌬️", target:"self", attr:"범용", rarity:"starter",
          desc:"정신력을 5 회복합니다.", fx:[{t:"heal",v:5}]},
  breath_order:{name:"호흡 정리", cost:0, type:"skill", emoji:"🍃", target:"self", attr:"범용", rarity:"common",
          desc:"카드를 1장 뽑습니다.", fx:[{t:"draw",v:1}]},
  short_meditation:{name:"짧은 명상", cost:1, type:"skill", emoji:"🧘", target:"self", attr:"범용", rarity:"common",
          desc:"정신력을 6 회복합니다.", fx:[{t:"heal",v:6}]},
  purifying_talisman:{name:"정화부", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"범용", rarity:"common",
          desc:"적의 미련을 8만큼 정화합니다.", fx:[{t:"damage",v:8}]},
  mind_training:{name:"정신 수련", cost:0, type:"skill", emoji:"🫧", target:"self", attr:"범용", rarity:"uncommon",
          desc:"이번 턴 정신력을 1 회복합니다.\n소멸.", fx:[{t:"energy",v:1}], exhaust:true},
  fast_chanting:{name:"속전염송", cost:1, type:"skill", emoji:"📜", target:"self", attr:"범용", rarity:"common",
          desc:"카드를 2장 뽑습니다.", fx:[{t:"draw",v:2}]},
  altar_preparation:{name:"제단 준비", cost:0, type:"skill", emoji:"🪔", target:"self", attr:"범용", rarity:"uncommon",
          desc:"이번 턴 정신력을 1 회복합니다.\n소멸.", fx:[{t:"energy",v:1}], exhaust:true},
  last_struggle:{name:"마지막 발버둥", cost:1, type:"attack", emoji:"🔥", target:"enemy", attr:"범용", rarity:"rare",
          desc:"모든 적의 미련을 10만큼 정화합니다.\n사용 후 소멸.", fx:[{t:"damageAll",v:10}], exhaust:true},

  // -----------------------------------------------------------------------
  // 결계 카드 10장
  // -----------------------------------------------------------------------
  guardian_talisman:{name:"수호부", cost:1, type:"defense", emoji:"🧿", target:"self", attr:"결계", rarity:"common",
          desc:"마음의 결계를 8 얻습니다.", fx:[{t:"block",v:8}]},
  quiet_steps:{name:"조용한 발걸음", cost:1, type:"defense", emoji:"👣", target:"self", attr:"결계", rarity:"common",
          desc:"마음의 결계를 6 얻습니다.\n카드를 1장 뽑습니다.", fx:[{t:"block",v:6},{t:"draw",v:1}]},
  folded_ward:{name:"접어둔 방위부", cost:0, type:"defense", emoji:"📄", target:"self", attr:"결계", rarity:"common",
          desc:"마음의 결계를 4 얻습니다.", fx:[{t:"block",v:4}]},
  clear_mind_art:{name:"맑은 마음법", cost:1, type:"skill", emoji:"💧", target:"self", attr:"결계", rarity:"common",
          desc:"마음의 결계를 5 얻습니다.\n정신력을 1 회복합니다.", fx:[{t:"block",v:5},{t:"energy",v:1}]},
  guardian_script:{name:"수호경", cost:1, type:"defense", emoji:"📖", target:"self", attr:"결계", rarity:"starter",
          desc:"마음의 결계를 8 얻습니다.", fx:[{t:"block",v:8}]},
  five_direction_barrier:{name:"오방결계", cost:1, type:"defense", emoji:"🎐", target:"self", attr:"결계", rarity:"starter",
          desc:"마음의 결계를 6 얻습니다.\n동요를 1 제거합니다.", fx:[{t:"block",v:6},{t:"removeWeak",v:1}]},
  reverse_barrier:{name:"역결계", cost:2, type:"defense", emoji:"🪞", target:"enemy", attr:"결계", rarity:"uncommon",
          desc:"마음의 결계를 8 얻습니다.\n현재 마음의 결계 70%만큼 적의 미련을 정화합니다.", fx:[{t:"block",v:8},{t:"damageByBlockRatio",v:0.7}]},
  silent_ward:{name:"정적의 방", cost:1, type:"skill", emoji:"🏥", target:"self", attr:"결계", rarity:"uncommon",
          desc:"마음의 결계를 8 얻습니다.", fx:[{t:"block",v:8}]},
  barrier_charge:{name:"결계 충전", cost:1, type:"skill", emoji:"🔷", target:"self", attr:"결계", rarity:"uncommon",
          desc:"마음의 결계를 10 얻습니다.", fx:[{t:"block",v:10}]},
  returning_wall:{name:"되돌리는 벽", cost:2, type:"attack", emoji:"↩️", target:"enemy", attr:"결계", rarity:"rare",
          desc:"이번 턴 얻은 마음의 결계 150%만큼 적의 미련을 정화합니다.", fx:[{t:"damageByBlockGainedThisTurn",v:1.5}]},

  // -----------------------------------------------------------------------
  // 동요 카드 10장
  // -----------------------------------------------------------------------
  memory_doll:{name:"기억 인형", cost:1, type:"attack", emoji:"🧸", target:"enemy", attr:"동요", rarity:"starter",
          desc:"적의 미련을 5만큼 정화합니다.\n동요를 1 부여합니다.", fx:[{t:"damage",v:5},{t:"applyWeak",v:1}]},
  lullaby_chant:{name:"자장 염송", cost:1, type:"skill", emoji:"🎵", target:"enemy", attr:"동요", rarity:"common",
          desc:"동요를 1 부여합니다. 동요 1마다 적 공격 피해가 25% 감소합니다.\n카드를 1장 뽑습니다.", fx:[{t:"applyWeak",v:1},{t:"draw",v:1}]},
  shaking_heart:{name:"흔들리는 마음", cost:1, type:"skill", emoji:"💗", target:"enemy", attr:"동요", rarity:"common",
          desc:"동요를 2 부여합니다. 동요 1마다 적 공격 피해가 25% 감소합니다.", fx:[{t:"applyWeak",v:2}]},
  unread_letter:{name:"읽지 못한 편지", cost:1, type:"attack", emoji:"✉️", target:"enemy", attr:"동요", rarity:"common",
          desc:"적의 미련을 5만큼 정화합니다.\n동요를 1 부여합니다.", fx:[{t:"damage",v:5},{t:"applyWeak",v:1}]},
  uneasy_silence:{name:"불편한 침묵", cost:1, type:"skill", emoji:"🤫", target:"enemy", attr:"동요", rarity:"common",
          desc:"동요를 1 부여합니다.\n마음의 결계를 5 얻습니다.", fx:[{t:"applyWeak",v:1},{t:"block",v:5}]},
  deep_sigh:{name:"깊은 한숨", cost:0, type:"skill", emoji:"💨", target:"enemy", attr:"동요", rarity:"common",
          desc:"동요를 1 부여합니다. 동요 1마다 적 공격 피해가 25% 감소합니다.\n소멸.", fx:[{t:"applyWeak",v:1}], exhaust:true},
  tearful_memory:{name:"눈물 젖은 기억", cost:1, type:"attack", emoji:"💧", target:"enemy", attr:"동요", rarity:"uncommon",
          desc:"적의 미련을 6만큼 정화합니다.\n동요를 1 부여합니다.", fx:[{t:"damage",v:6},{t:"applyWeak",v:1}]},
  collapsed_ward:{name:"무너진 병실", cost:2, type:"skill", emoji:"🏚️", target:"enemy", attr:"동요", rarity:"uncommon",
          desc:"모든 적에게 동요를 1 부여합니다.", fx:[{t:"applyWeakAll",v:1}]},
  unsent_words:{name:"전하지 못한 말", cost:2, type:"attack", emoji:"💌", target:"enemy", attr:"동요", rarity:"rare",
          desc:"적의 미련을 13만큼 정화합니다.", fx:[{t:"damage",v:13}]},
  mind_collapse:{name:"마음 붕괴", cost:3, type:"attack", emoji:"💔", target:"enemy", attr:"동요", rarity:"rare",
          desc:"적의 미련을 20만큼 정화합니다.", fx:[{t:"damage",v:20}]},

  // -----------------------------------------------------------------------
  // 성불 카드 10장
  // -----------------------------------------------------------------------
  exorcism_talisman:{name:"퇴마부", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"성불", rarity:"common",
          desc:"적의 미련을 5만큼 정화합니다. 성불 표식을 1 부여합니다.", fx:[{t:"damage",v:5},{t:"applyMark",v:1}]},
  requiem_script:{name:"진혼경", cost:1, type:"attack", emoji:"📜", target:"enemy", attr:"성불", rarity:"common",
          desc:"적의 미련을 6만큼 정화합니다. 성불 표식이 있으면 추가로 4 정화합니다.", fx:[{t:"damage",v:6},{t:"ifMarkedDamage",v:4}]},
  small_passing_rite:{name:"작은 천도", cost:1, type:"skill", emoji:"🪷", target:"enemy", attr:"성불", rarity:"common",
          desc:"성불 표식을 2 부여합니다.\n카드를 1장 뽑습니다.", fx:[{t:"applyMark",v:2},{t:"draw",v:1}]},
  release_touch:{name:"성불의 손짓", cost:1, type:"attack", emoji:"🤲", target:"enemy", attr:"성불", rarity:"common",
          desc:"적의 미련을 5만큼 정화합니다.\n카드를 1장 뽑습니다.", fx:[{t:"damage",v:5},{t:"draw",v:1}]},
  spirit_guidance:{name:"혼백 인도", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"성불", rarity:"common",
          desc:"정신력을 1 회복합니다.\n카드를 1장 뽑습니다.", fx:[{t:"energy",v:1},{t:"draw",v:1}]},
  path_of_light:{name:"빛길 열기", cost:2, type:"attack", emoji:"✨", target:"enemy", attr:"성불", rarity:"common",
          desc:"모든 적의 미련을 6만큼 정화합니다.", fx:[{t:"damageAll",v:6}]},
  guiding_rite:{name:"천도재", cost:2, type:"attack", emoji:"🪔", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"적의 미련을 10만큼 정화합니다. 성불 표식이 있으면 추가로 8 정화합니다.", fx:[{t:"damage",v:10},{t:"ifMarkedDamage",v:8}]},
  purification_wave:{name:"정화의 파동", cost:2, type:"attack", emoji:"〰️", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"모든 적의 미련을 7만큼 정화합니다.", fx:[{t:"damageAll",v:7}]},
  soul_passing:{name:"혼백천도", cost:3, type:"attack", emoji:"🪷", target:"enemy", attr:"성불", rarity:"rare",
          desc:"적의 미련을 16만큼 정화합니다. 대상의 모든 성불 표식을 소모하고 표식 1당 3 추가 정화합니다.\n사용 후 소멸.", fx:[{t:"consumeAllMarksDamage",base:16,per:3}], exhaust:true},
  lotus_crossing:{name:"연화길", cost:3, type:"attack", emoji:"🌸", target:"enemy", attr:"성불", rarity:"rare",
          desc:"모든 적의 미련을 12만큼 정화합니다.\n사용 후 소멸.", fx:[{t:"damageAll",v:12}], exhaust:true}
};

if(window.BOHYUN_LIFE_SYSTEM && typeof window.BOHYUN_LIFE_SYSTEM.getStatusCardDb === "function"){
  Object.assign(CARD_DB, window.BOHYUN_LIFE_SYSTEM.getStatusCardDb());
}

const BASE_STARTER_DECK = [
  "rosary_throw","rosary_throw","rosary_throw","rosary_throw",
  "bell_shake","bell_shake",
  "memory_doll","memory_doll",
  "guardian_script","guardian_script","guardian_script",
  "five_direction_barrier","five_direction_barrier",
  "calm_breath"
];
let STARTER_DECK = [...BASE_STARTER_DECK];

const CARD_REWARD_POOL = Object.keys(CARD_DB).filter(key => !["starter", "status"].includes(CARD_DB[key].rarity));

// 법구/약병 데이터는 equipment.js / potion.js에서 관리합니다.
// cardData.js는 카드 데이터만 담당합니다.

const typeLabel = t => t==="attack" ? "정화" : t==="defense" ? "결계" : t==="status" ? "상태" : "스킬";
