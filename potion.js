"use strict";
/* ACT1 약병 데이터 30종 */
const POTION_SLOT_LIMIT = 3;
const POTION_MASTER_DB = [
  { id:"cheongsim_pill", dataId:"IT001", name:"청심환", emoji:"🔴", category:"회복", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"정신력을 12 회복합니다.", effectText:"정신력을 12 회복합니다.", valueText:"정신력 회복 +12", dropWeight:55, price:35, shopPrice:35, fx:[{ t:"heal", v:12 }] },
  { id:"focus_talisman", dataId:"IT002", name:"집중부", emoji:"🧧", category:"신통력", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"이번 턴 신통력을 1 회복합니다.", effectText:"이번 턴 신통력을 1 회복합니다.", valueText:"이번 턴 신통력 +1", dropWeight:55, price:30, shopPrice:30, fx:[{ t:"energy", v:1 }] },
  { id:"protective_talisman", dataId:"IT003", name:"호신부", emoji:"🧿", category:"결계", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"마음의 결계를 12 얻습니다.", effectText:"마음의 결계를 12 얻습니다.", valueText:"결계 +12", dropWeight:55, price:35, shopPrice:35, fx:[{ t:"block", v:12 }] },
  { id:"five_direction_water", dataId:"IT004", name:"오방수", emoji:"💧", category:"결계", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"마음의 결계를 8 얻고 플레이어의 동요를 1 제거합니다.", effectText:"마음의 결계를 8 얻고 플레이어의 동요를 1 제거합니다.", valueText:"결계 +8 / 동요 -1", dropWeight:55, price:40, shopPrice:40, fx:[{ t:"block", v:8 }, { t:"removeWeak", v:1 }] },
  { id:"lotus_incense", dataId:"IT005", name:"연꽃 향", emoji:"🪷", category:"성불 표식", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"enemy", desc:"대상에게 성불 표식을 2 부여합니다.", effectText:"대상에게 성불 표식을 2 부여합니다.", valueText:"성불 표식 +2", dropWeight:55, price:40, shopPrice:40, fx:[{ t:"applyMark", v:2 }] },
  { id:"unsaid_letter", dataId:"IT006", name:"말하지 못한 편지", emoji:"✉️", category:"회상", rarity:"common", obtainFrom:[], useTiming:"battle", target:"enemy", desc:"대상에게 회상 3을 부여합니다.", effectText:"대상에게 회상 3을 부여합니다.", valueText:"회상 +3", dropWeight:0, price:40, shopPrice:40, fx:[{ t:"applyRecollection", v:3 }] },
  { id:"warding_salt", dataId:"IT007", name:"액막이 소금", emoji:"🧂", category:"정화", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"enemy", desc:"대상의 미련을 12 정화합니다.", effectText:"대상의 미련을 12 정화합니다.", valueText:"대상 정화 12", dropWeight:55, price:40, shopPrice:40, fx:[{ t:"attackSingle", v:12 }] },
  { id:"salpuri_ash", dataId:"IT008", name:"살풀이 재", emoji:"⚱️", category:"정화", rarity:"common", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"enemy", desc:"모든 유령의 미련을 6 정화합니다.", effectText:"모든 유령의 미련을 6 정화합니다.", valueText:"전체 정화 6", dropWeight:55, price:45, shopPrice:45, fx:[{ t:"attackAll", v:6 }] },
  { id:"cracked_mirror_water", dataId:"IT009", name:"금이 간 경면수", emoji:"🪞", category:"균열", rarity:"common", obtainFrom:[], useTiming:"battle", target:"enemy", desc:"대상에게 균열 2를 부여합니다.", effectText:"대상에게 균열 2를 부여합니다.", valueText:"균열 +2", dropWeight:0, price:45, shopPrice:45, fx:[{ t:"applyFracture", v:2 }] },
  { id:"candlewax_seal_liquid", dataId:"IT010", name:"촛농 봉인액", emoji:"🕯️", category:"성불 표식", rarity:"common", obtainFrom:[], useTiming:"battle", target:"enemy", desc:"모든 유령에게 성불 표식을 1 부여합니다.", effectText:"모든 유령에게 성불 표식을 1 부여합니다.", valueText:"전체 성불 표식 +1", dropWeight:0, price:45, shopPrice:45, fx:[{ t:"applyMarkAll", v:1 }] },
  { id:"memory_dew", dataId:"IT011", name:"기억 이슬", emoji:"💠", category:"회상", rarity:"common", obtainFrom:[], useTiming:"battle", target:"enemy", desc:"대상에게 회상 1을 부여하고 주문을 1장 뽑습니다.", effectText:"대상에게 회상 1을 부여하고 주문을 1장 뽑습니다.", valueText:"회상 +1 / 드로우 +1", dropWeight:0, price:45, shopPrice:45, fx:[{ t:"applyRecollection", v:1 }, { t:"draw", v:1 }] },
  { id:"clear_rice_water", dataId:"IT012", name:"맑은 쌀물", emoji:"🍚", category:"정화", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"플레이어의 불안 1과 무기력 1을 제거합니다.", effectText:"플레이어의 불안 1과 무기력 1을 제거합니다.", valueText:"불안 -1 / 무기력 -1", dropWeight:0, price:35, shopPrice:35, fx:[{ t:"removePlayerStatus", status:"anxiety", v:1 }, { t:"removePlayerStatus", status:"lethargy", v:1 }] },
  { id:"peach_spring_water", dataId:"IT013", name:"복숭아 약수", emoji:"🍑", category:"회복", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"정신력을 6 회복하고 마음의 결계를 6 얻습니다.", effectText:"정신력을 6 회복하고 마음의 결계를 6 얻습니다.", valueText:"정신력 +6 / 결계 +6", dropWeight:0, price:45, shopPrice:45, fx:[{ t:"heal", v:6 }, { t:"block", v:6 }] },
  { id:"dawn_spring_water", dataId:"IT014", name:"새벽 샘물", emoji:"🌅", category:"드로우", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"주문을 2장 뽑고 이후 손패 1장을 선택해 버립니다.", effectText:"주문을 2장 뽑고 이후 손패 1장을 선택해 버립니다.", valueText:"드로우 +2 / 선택 버리기 1", dropWeight:0, price:40, shopPrice:40, fx:[{ t:"drawThenDiscardChoice", draw:2, discard:1 }] },
  { id:"sealing_ink", dataId:"IT015", name:"봉인 먹물", emoji:"🖋️", category:"비용", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"이번 턴 다음에 사용하는 비용 2 이상 주문의 비용을 1 감소시키고 주문을 1장 뽑습니다. 최소 비용 0.", effectText:"이번 턴 다음에 사용하는 비용 2 이상 주문의 비용을 1 감소시키고 주문을 1장 뽑습니다.", valueText:"다음 비용 2+ 주문 비용 -1 / 드로우 +1", dropWeight:0, price:45, shopPrice:45, fx:[{ t:"nextHighCostCardCostDown", minCost:2, v:1, minResultCost:0 }, { t:"draw", v:1 }] },
  { id:"sutra_ash_water", dataId:"IT016", name:"경문 잿물", emoji:"📜", category:"소멸", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"손패의 상태 주문 1장을 선택해 소멸합니다. 상태 주문이 없다면 주문을 1장 뽑습니다.", effectText:"손패의 상태 주문 1장을 선택해 소멸합니다. 상태 주문이 없다면 주문을 1장 뽑습니다.", valueText:"상태 주문 소멸 또는 드로우 +1", dropWeight:0, price:35, shopPrice:35, fx:[{ t:"exhaustStatusCardFromHandOrDraw", exhaust:1, drawIfNone:1 }] },
  { id:"blank_talisman", dataId:"IT017", name:"백지 부적", emoji:"📄", category:"드로우", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"다음 턴 시작 시 주문을 2장 추가로 뽑습니다.", effectText:"다음 턴 시작 시 주문을 2장 추가로 뽑습니다.", valueText:"다음 턴 드로우 +2", dropWeight:0, price:40, shopPrice:40, fx:[{ t:"nextTurnDraw", v:2 }] },
  { id:"white_salt_line", dataId:"IT018", name:"흰 소금선", emoji:"▫️", category:"결계", rarity:"common", obtainFrom:[], useTiming:"battle", target:"enemy", desc:"대상 유령의 결계를 최대 12 제거합니다.", effectText:"대상 유령의 결계를 최대 12 제거합니다.", valueText:"대상 결계 제거 최대 12", dropWeight:0, price:35, shopPrice:35, fx:[{ t:"removeEnemyBlock", v:12 }] },
  { id:"small_bell_liquor", dataId:"IT019", name:"작은 방울술", emoji:"🍶", category:"굿판", rarity:"common", obtainFrom:[], useTiming:"battle", target:"self", desc:"방울치기 1장을 생성하고 주문을 1장 뽑습니다.", effectText:"방울치기 1장을 생성하고 주문을 1장 뽑습니다.", valueText:"방울치기 +1 / 드로우 +1", dropWeight:0, price:40, shopPrice:40, fx:[{ t:"createBellStrike", v:1 }, { t:"draw", v:1 }] },
  { id:"spirit_eye_water", dataId:"IT020", name:"영안수", emoji:"👁️", category:"드로우", rarity:"uncommon", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"주문을 3장 뽑습니다.", effectText:"주문을 3장 뽑습니다.", valueText:"드로우 +3", dropWeight:35, price:55, shopPrice:55, fx:[{ t:"draw", v:3 }] },
  { id:"samsin_water", dataId:"IT021", name:"삼신수", emoji:"🌿", category:"회복", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"정신력을 12 회복하고 플레이어의 해로운 상태를 전부 제거합니다.", effectText:"정신력을 12 회복하고 플레이어의 해로운 상태를 전부 제거합니다.", valueText:"정신력 +12 / 해로운 상태 전부 제거", dropWeight:0, price:65, shopPrice:65, fx:[{ t:"heal", v:12 }, { t:"cleanseAllPlayerDebuffs" }] },
  { id:"white_tiger_water", dataId:"IT022", name:"백호수", emoji:"🐯", category:"신통력", rarity:"uncommon", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"이번 턴 신통력을 2 회복합니다.", effectText:"이번 턴 신통력을 2 회복합니다.", valueText:"이번 턴 신통력 +2", dropWeight:35, price:65, shopPrice:65, fx:[{ t:"energy", v:2 }] },
  { id:"goblin_mirror_water", dataId:"IT023", name:"도깨비 거울물", emoji:"🪞", category:"드로우", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"손패에서 원하는 만큼 주문을 선택해 버리고, 버린 수만큼 다시 뽑습니다.", effectText:"손패에서 원하는 만큼 주문을 선택해 버리고, 버린 수만큼 다시 뽑습니다.", valueText:"선택 버리기 / 같은 수 드로우", dropWeight:0, price:60, shopPrice:60, fx:[{ t:"discardAnyThenDrawSameCount" }] },
  { id:"diamond_water", dataId:"IT024", name:"금강수", emoji:"💎", category:"결계", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"이번 턴 획득하는 마음의 결계량이 50% 증가합니다.", effectText:"이번 턴 획득하는 마음의 결계량이 50% 증가합니다.", valueText:"이번 턴 결계 획득량 +50%", dropWeight:0, price:65, shopPrice:65, fx:[{ t:"blockGainMultiplierThisTurn", v:1.5 }] },
  { id:"soul_return_water", dataId:"IT025", name:"회혼수", emoji:"🫧", category:"회수", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"이번 전투에서 가장 최근에 손패에서 버린 주문 1장을 회수하고 해당 주문의 비용을 이번 턴 1 감소시킵니다. 최소 비용 0.", effectText:"이번 전투에서 가장 최근에 손패에서 버린 주문 1장을 회수하고 해당 주문의 비용을 이번 턴 1 감소시킵니다.", valueText:"최근 손패 버림 회수 / 이번 턴 비용 -1", dropWeight:0, price:70, shopPrice:70, fx:[{ t:"recoverHandDiscard", costReduce:1, minResultCost:0, excludeDiscardedAfterUse:true }] },
  { id:"grudge_ink", dataId:"IT026", name:"응어리 먹물", emoji:"⚫", category:"한풀이", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"손패 1장을 버리고 주문을 2장 뽑습니다. 버린 주문이 한풀이 계열이면 해당 성장 효과를 1회 발동합니다.", effectText:"손패 1장을 버리고 주문을 2장 뽑습니다. 버린 주문이 한풀이 계열이면 해당 성장 효과를 1회 발동합니다.", valueText:"버리기 1 / 드로우 +2 / 한풀이 성장 1회", dropWeight:0, price:60, shopPrice:60, fx:[{ t:"discardDrawTriggerGrowth", discard:1, draw:2, archetype:"hanpuri", growthTrigger:1 }] },
  { id:"divine_excitation_liquor", dataId:"IT027", name:"신명주", emoji:"🔔", category:"굿판", rarity:"uncommon", obtainFrom:[], useTiming:"battle", target:"self", desc:"방울치기 2장을 생성하고 이번 턴 방울치기의 정화량이 1 증가합니다.", effectText:"방울치기 2장을 생성하고 이번 턴 방울치기의 정화량이 1 증가합니다.", valueText:"방울치기 +2 / 이번 턴 방울치기 정화 +1", dropWeight:0, price:60, shopPrice:60, fx:[{ t:"createBellStrike", v:2 }, { t:"bellStrikePurifyBonusThisTurn", v:1 }] },
  { id:"ghost_gate_talisman", dataId:"IT028", name:"귀문부", emoji:"🚪", category:"특수", rarity:"rare", obtainFrom:["battle","shop","event"], useTiming:"battle", target:"self", desc:"이번 턴 다음 공격 주문의 총 정화량이 50% 증가합니다.", effectText:"이번 턴 다음 공격 주문의 총 정화량이 50% 증가합니다.", valueText:"다음 공격 주문 총 정화량 x1.5", dropWeight:10, price:90, shopPrice:90, fx:[{ t:"nextAttackDouble", v:1.5 }] },
  { id:"manshin_call", dataId:"IT029", name:"만신의 부름", emoji:"📣", category:"복사", rarity:"rare", obtainFrom:[], useTiming:"battle", target:"self", desc:"다음에 사용하는 주문 사용 후 해당 주문의 임시 복사본 1장을 손패에 생성합니다. 복사본 비용은 원래 비용과 동일하며 턴 종료 시 소멸합니다.", effectText:"다음에 사용하는 주문 사용 후 해당 주문의 임시 복사본 1장을 손패에 생성합니다.", valueText:"다음 주문 임시 복사본 +1", dropWeight:0, price:95, shopPrice:95, fx:[{ t:"createTemporaryCopy", keepOriginalCost:true, exhaustAtTurnEnd:true }] },
  { id:"goblin_panacea_bottle", dataId:"IT030", name:"도깨비 만병", emoji:"🧪", category:"특수", rarity:"rare", obtainFrom:[], useTiming:"battle", target:"self", desc:"사용 후 빈 약병 슬롯을 최대 2칸까지 Common 또는 Uncommon 약병으로 채웁니다.", effectText:"사용 후 빈 약병 슬롯을 최대 2칸까지 Common 또는 Uncommon 약병으로 채웁니다.", valueText:"빈 약병 슬롯 최대 2칸 채우기", dropWeight:0, price:90, shopPrice:90, fx:[{ t:"fillEmptyPotionSlots", maxSlots:2, rarityWeights:{ common:75, uncommon:25 }, allowRare:false, excludeSelf:true, noDuplicateInSameUse:true, removeSelfFirst:true }] }
];

/* =========================================================================
   potion.js 공식 런타임 DB 변환부
   - POTION_MASTER_DB: 기획 원본 데이터
   - POTION_DB: 기존 전투/상점/가방 코드가 바로 사용할 수 있는 호환 데이터
   ========================================================================= */

/**
 * 기획 원본 약병 데이터를 기존 런타임 코드가 기대하는 형태로 변환합니다.
 * 기존 코드가 potion.type / potion.effect / potion.value 를 참조하므로
 * fx 기반 데이터를 호환 필드로 평탄화합니다.
 */
function normalizePotionForRuntime(item) {
  const fx = Array.isArray(item.fx) ? item.fx : [];
  const firstFx = fx[0] || {};
  const hasFx = (type) => fx.some(e => e && e.t === type);
  const getFxValue = (type, fallback = 0) => {
    const found = fx.find(e => e && e.t === type);
    return found && typeof found.v === "number" ? found.v : fallback;
  };

  let type = item.type || "";
  let effect = item.effect || "";
  let value = typeof item.value === "number" ? item.value : (typeof firstFx.v === "number" ? firstFx.v : 0);
  let removeWeak = item.removeWeak || 0;

  if (hasFx("heal")) {
    type = "heal";
    effect = "healPlayerHp";
    value = getFxValue("heal", 0);
  } else if (hasFx("energy")) {
    type = "energy";
    effect = "gainEnergy";
    value = getFxValue("energy", 0);
  } else if (hasFx("block") && hasFx("removeWeak")) {
    type = "blockCleanse";
    effect = "blockAndRemoveAgitation";
    value = getFxValue("block", 0);
    removeWeak = getFxValue("removeWeak", 1);
  } else if (hasFx("block")) {
    type = "block";
    effect = "gainBlock";
    value = getFxValue("block", 0);
  } else if (hasFx("applyMark")) {
    type = "applyMark";
    effect = "applyMark";
    value = getFxValue("applyMark", 0);
  } else if (hasFx("attackSingle")) {
    type = "attackSingle";
    effect = "purifyTarget";
    value = getFxValue("attackSingle", 0);
  } else if (hasFx("attackAll")) {
    type = "attackAll";
    effect = "purifyAll";
    value = getFxValue("attackAll", 0);
  } else if (hasFx("applyWeak")) {
    type = "applyWeak";
    effect = "applyAgitation";
    value = getFxValue("applyWeak", 0);
  } else if (hasFx("draw")) {
    type = "draw";
    effect = "drawCards";
    value = getFxValue("draw", 0);
  } else if (hasFx("nextAttackDouble")) {
    type = "nextAttackDouble";
    effect = "nextAttackMultiplier";
    value = getFxValue("nextAttackDouble", 2);
  }

  return {
    ...item,
    type,
    effect,
    value,
    removeWeak,
    target: item.target === "self" ? "player" : item.target,
    price: item.shopPrice || item.price || 0,
    desc: item.desc || item.effectText || item.valueText || "",
    masterData: item
  };
}

var POTION_DB = POTION_MASTER_DB
  .filter(item => Array.isArray(item.obtainFrom) && item.obtainFrom.length > 0)
  .map(normalizePotionForRuntime);

const POTION_DROP_RATE = { common: 55, uncommon: 35, rare: 10 };
function getRandomPotion(rng = Math.random, source = null) {
  const list = Array.isArray(POTION_DB)
    ? POTION_DB.filter(item => {
        if (!source) return true;
        return Array.isArray(item.obtainFrom) && item.obtainFrom.includes(source);
      })
    : [];
  const total = list.reduce((sum, item) => sum + (item.dropWeight || 1), 0);
  if (total <= 0) return list[0] ? { ...list[0] } : null;
  let roll = rng() * total;
  for (const item of list) {
    roll -= (item.dropWeight || 1);
    if (roll <= 0) return { ...item };
  }
  return list[0] ? { ...list[0] } : null;
}
function canAddPotion(currentPotions){
  return Array.isArray(currentPotions) && currentPotions.length < POTION_SLOT_LIMIT;
}

window.POTION_SLOT_LIMIT = POTION_SLOT_LIMIT;
window.POTION_MASTER_DB = POTION_MASTER_DB;
window.POTION_DB = POTION_DB;
window.POTION_DROP_RATE = POTION_DROP_RATE;
window.getRandomPotion = getRandomPotion;
window.canAddPotion = canAddPotion;
