"use strict";
/* =========================================================================
   Card Data
   - Card definitions, starter deck, reward pools, relic data, and card labels.
   - Loaded after lifeSystem.js so status cards can be merged into CARD_DB.
   ========================================================================= */

const CARD_DB = {
  rosary:{name:"염주", cost:1, type:"attack", emoji:"📿", target:"enemy", attr:"성불", rarity:"starter",
          desc:"정화 6\n가장 기본적인 정화 카드", fx:[{t:"damage",v:6}]},
  bell:{name:"방울", cost:1, type:"attack", emoji:"🔔", target:"enemy", attr:"희망", rarity:"starter",
          desc:"정화 5\n카드 1장 뽑기", fx:[{t:"damage",v:5},{t:"draw",v:1}]},
  doll:{name:"인형", cost:1, type:"attack", emoji:"🧸", target:"enemy", attr:"추억", rarity:"starter",
          desc:"정화 8\n동요 1 부여", fx:[{t:"damage",v:8},{t:"applyWeak",v:1}]},
  bible:{name:"성경", cost:1, type:"defense", emoji:"📖", target:"self", attr:"희망", rarity:"starter",
          desc:"마음의 결계 8\n카드 1장 뽑기", fx:[{t:"block",v:8},{t:"draw",v:1}]},
  charm:{name:"오색부적", cost:1, type:"defense", emoji:"🎀", target:"self", attr:"희망", rarity:"starter",
          desc:"마음의 결계 6\n동요 1 제거", fx:[{t:"block",v:6},{t:"removeWeak",v:1}]},
  pray:{name:"기도", cost:1, type:"skill", emoji:"🙏", target:"self", attr:"희망", rarity:"starter",
          desc:"스트레스 6 회복\n신통력 +1", fx:[{t:"heal",v:6},{t:"energy",v:1}]},

  reaching_hand:{name:"손 내밀기", cost:1, type:"attack", emoji:"🤝", target:"enemy", attr:"희망", rarity:"common",
          desc:"정화 7\n마음의 결계 5", fx:[{t:"damage",v:7},{t:"block",v:5}]},
  its_okay:{name:"괜찮아", cost:1, type:"skill", emoji:"🌱", target:"self", attr:"희망", rarity:"common",
          desc:"스트레스 6 회복\n카드 1장 뽑기", fx:[{t:"heal",v:6},{t:"draw",v:1}]},
  hope_lantern:{name:"희망의 등불", cost:2, type:"attack", emoji:"🏮", target:"enemy", attr:"희망", rarity:"common",
          desc:"모든 적에게 정화 6", fx:[{t:"damageAll",v:6}]},
  warm_word:{name:"따뜻한 말", cost:0, type:"skill", emoji:"💬", target:"self", attr:"희망", rarity:"common",
          desc:"마음의 결계 3\n카드 1장 뽑기", fx:[{t:"block",v:3},{t:"draw",v:1}]},
  steady_breath:{name:"고른 숨", cost:1, type:"defense", emoji:"🌬️", target:"self", attr:"희망", rarity:"common",
          desc:"마음의 결계 9", fx:[{t:"block",v:9}]},
  comforting_light:{name:"위로의 빛", cost:1, type:"skill", emoji:"✨", target:"self", attr:"희망", rarity:"common",
          desc:"스트레스 8 회복", fx:[{t:"heal",v:8}]},
  small_promise:{name:"작은 약속", cost:1, type:"skill", emoji:"🕯️", target:"self", attr:"희망", rarity:"uncommon",
          desc:"마음의 결계 4\n신통력 +1", fx:[{t:"block",v:4},{t:"energy",v:1}]},
  guardian_prayer:{name:"수호 기도", cost:2, type:"defense", emoji:"🛡️", target:"self", attr:"희망", rarity:"uncommon",
          desc:"마음의 결계 14\n동요 1 제거", fx:[{t:"block",v:14},{t:"removeWeak",v:1}]},
  dawn_of_hope:{name:"희망의 새벽", cost:2, type:"skill", emoji:"🌅", target:"self", attr:"희망", rarity:"rare",
          desc:"스트레스 10 회복\n신통력 +1\n카드 1장 뽑기", fx:[{t:"heal",v:10},{t:"energy",v:1},{t:"draw",v:1}]},

  photo_album:{name:"사진첩", cost:1, type:"attack", emoji:"📷", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 6\n카드 2장 뽑기", fx:[{t:"damage",v:6},{t:"draw",v:2}]},
  old_letter:{name:"오래된 편지", cost:1, type:"attack", emoji:"✉️", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 4\n동요 1 부여", fx:[{t:"damage",v:4},{t:"applyWeak",v:1}]},
  lullaby:{name:"자장가", cost:2, type:"skill", emoji:"🎵", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"모든 적에게 동요 1", fx:[{t:"applyWeakAll",v:1}]},
  old_clock:{name:"낡은 시계", cost:1, type:"skill", emoji:"⏰", target:"enemy", attr:"추억", rarity:"rare",
          desc:"동요 2 부여", fx:[{t:"applyWeak",v:2}]},
  faded_photo:{name:"빛바랜 사진", cost:1, type:"attack", emoji:"🖼️", target:"enemy", attr:"추억", rarity:"common",
          desc:"정화 5\n동요 1 부여\n카드 1장 뽑기", fx:[{t:"damage",v:5},{t:"applyWeak",v:1},{t:"draw",v:1}]},
  familiar_song:{name:"익숙한 노래", cost:1, type:"skill", emoji:"🎶", target:"enemy", attr:"추억", rarity:"common",
          desc:"동요 1 부여\n카드 2장 뽑기", fx:[{t:"applyWeak",v:1},{t:"draw",v:2}]},
  memory_fragment:{name:"기억 조각", cost:0, type:"skill", emoji:"🧩", target:"self", attr:"추억", rarity:"uncommon",
          desc:"카드 1장 뽑기\n신통력 +1", fx:[{t:"draw",v:1},{t:"energy",v:1}]},
  old_diary:{name:"낡은 일기장", cost:2, type:"attack", emoji:"📔", target:"enemy", attr:"추억", rarity:"uncommon",
          desc:"정화 8\n동요 2 부여", fx:[{t:"damage",v:8},{t:"applyWeak",v:2}]},
  day_we_met:{name:"처음 만난 날", cost:2, type:"attack", emoji:"🌸", target:"enemy", attr:"추억", rarity:"rare",
          desc:"정화 12\n카드 2장 뽑기", fx:[{t:"damage",v:12},{t:"draw",v:2}]},

  chant:{name:"염불", cost:1, type:"attack", emoji:"🪷", target:"enemy", attr:"성불", rarity:"common",
          desc:"정화 9", fx:[{t:"damage",v:9}]},
  guiding_rite:{name:"천도재", cost:2, type:"attack", emoji:"🕯️", target:"enemy", attr:"성불", rarity:"rare",
          desc:"모든 적에게 정화 10", fx:[{t:"damageAll",v:10}]},
  nirvana:{name:"극락왕생", cost:3, type:"attack", emoji:"🌸", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 22\n사용 후 소멸", fx:[{t:"damage",v:22}], exhaust:true},
  last_goodbye:{name:"마지막 인사", cost:2, type:"attack", emoji:"👋", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 12\n미련 절반 이하 추가 정화 10", fx:[{t:"damage",v:12},{t:"bonusLowHpDamage",v:10}]},
  talisman_strike:{name:"부적 던지기", cost:1, type:"attack", emoji:"🧧", target:"enemy", attr:"성불", rarity:"common",
          desc:"정화 8", fx:[{t:"damage",v:8}]},
  purification_wave:{name:"정화의 파동", cost:2, type:"attack", emoji:"〰️", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"모든 적에게 정화 8", fx:[{t:"damageAll",v:8}]},
  final_rite:{name:"마지막 의식", cost:2, type:"attack", emoji:"🕯️", target:"enemy", attr:"성불", rarity:"uncommon",
          desc:"정화 14", fx:[{t:"damage",v:14}]},
  soul_release:{name:"혼백 해방", cost:3, type:"attack", emoji:"🕊️", target:"enemy", attr:"성불", rarity:"rare",
          desc:"정화 18\n동요 2 부여", fx:[{t:"damage",v:18},{t:"applyWeak",v:2}]},
  lotus_path:{name:"연꽃길", cost:3, type:"attack", emoji:"🪷", target:"enemy", attr:"성불", rarity:"rare",
          desc:"모든 적에게 정화 14\n사용 후 소멸", fx:[{t:"damageAll",v:14}], exhaust:true}
};

if(!window.BOHYUN_LIFE_SYSTEM){
  throw new Error("lifeSystem.js must be loaded before cardData.js.");
}
Object.assign(CARD_DB, window.BOHYUN_LIFE_SYSTEM.getStatusCardDb());

const BASE_STARTER_DECK = [
  "rosary","rosary","rosary","rosary",
  "bell","bell","doll","doll",
  "bible","bible","bible","charm","charm","pray",
];
let STARTER_DECK = [...BASE_STARTER_DECK];

const CARD_REWARD_POOL = Object.keys(CARD_DB).filter(key => !["starter", "status"].includes(CARD_DB[key].rarity));

const RELIC_DB = [
  { id:"incense_burner", name:"향로", emoji:"🏺", desc:"전투 시작 시 마음의 결계 +6" },
  { id:"spirit_tablet", name:"위령패", emoji:"🪦", desc:"정화 카드 수치 +1 (표시용)" },
  { id:"charm_box", name:"부적함", emoji:"📦", desc:"첫 턴 신통력 +1 (표시용)" },
];

const typeLabel = t=> t==="attack"?"정화":t==="defense"?"결계":t==="status"?"상태":"스킬";
