"use strict";
/* ACT1 최종 일반 법구 36종 데이터 + 시작 전용 은혜 법구 15종 */

const RELIC_MASTER_DB = [
  { id:"bronze_incense_burner", dataId:"RE001", name:"청동 향로", emoji:"🪔", category:"범용", deck:"범용", rarity:"uncommon", desc:"전투 시작 시 주문 1장 추가로 뽑기", effectText:"전투 시작 시 주문 1장 추가로 뽑기", valueText:"전투 시작 드로우 +1", synergy:"모든 덱", coreFun:"초기 손패 안정성 강화", balanceStatus:"등급 조정", balanceRisk:"P1", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"fx", implementationKey:"relic_bronze_incense_burner", plannedTrigger:"battleStart", plannedConditions:{}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"moon_spirit_tablet", dataId:"RE002", name:"월령패", emoji:"🌙", category:"범용", deck:"범용", rarity:"common", desc:"전투마다 처음 사용하는 정화 주문의 정화량 +4", effectText:"전투마다 처음 사용하는 정화 주문의 정화량 +4", valueText:"첫 정화 주문 정화 +4", synergy:"모든 공격형 덱", coreFun:"첫 정화 주문의 템포 강화", balanceStatus:"소폭 상향", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"fx", implementationKey:"relic_moon_spirit_tablet", plannedTrigger:"onFirstPurifySpellEachBattle", plannedConditions:{oncePerBattle:true, cardType:"attack"}, plannedEffects:{purifyBonus:4}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"lizard_tail_charm", dataId:"RE003", name:"도마뱀 꼬리 부적", emoji:"🦎", category:"범용", deck:"범용", rarity:"rare", desc:"쓰러질 때 법구를 소모하고 최대 정신력 50% 회복", effectText:"쓰러질 때 법구를 소모하고 최대 정신력 50% 회복", valueText:"1회 부활: 최대 정신력 50%", synergy:"모든 덱", coreFun:"위험 경로를 공격적으로 선택하게 만드는 보험", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["엘리트","보스"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"fx", implementationKey:"relic_lizard_tail_charm", plannedTrigger:"fatalDamage", plannedConditions:{consumeRelic:true}, plannedEffects:{healByMaxHpRatio:0.5}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"broken_rosary", dataId:"RE004", name:"깨진 염주", emoji:"📿", category:"범용", deck:"범용", rarity:"uncommon", desc:"매 턴 처음으로 생성되지 않은 주문이 소멸할 때 주문 1장 뽑기", effectText:"매 턴 처음으로 생성되지 않은 주문이 소멸할 때 주문 1장 뽑기", valueText:"비생성 주문 소멸 시 드로우", synergy:"굿판·소멸 혼합", coreFun:"소멸을 드로우 자원으로 전환", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_broken_rosary", plannedTrigger:"onCardExhaust", plannedConditions:{oncePerTurn:true, generatedOnly:false}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"leftover_candle_wax", dataId:"RE005", name:"남은 촛농", emoji:"🕯️", category:"범용", deck:"범용", rarity:"uncommon", desc:"턴 종료 시 남은 신통력 1당 결계 3 획득, 최대 6", effectText:"턴 종료 시 남은 신통력 1당 결계 3 획득, 최대 6", valueText:"남은 신통력 결계 전환", synergy:"결계·한풀이", coreFun:"쓰지 않은 자원도 전략으로 전환", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_leftover_candle_wax", plannedTrigger:"turnEnd", plannedConditions:{remainingEnergyMin:1}, plannedEffects:{blockPerRemainingEnergy:3, maxBlock:6}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"tricolor_cotton_fan", dataId:"RE006", name:"삼색 무명부채", emoji:"🪭", category:"범용", deck:"범용", rarity:"rare", desc:"한 턴에 정화·결계·의식 주문을 모두 사용하면 신통력 1 회복. 턴당 1회", effectText:"한 턴에 정화·결계·의식 주문을 모두 사용하면 신통력 1 회복. 턴당 1회", valueText:"3종 주문 사용 시 신통력 +1", synergy:"혼합 덱", coreFun:"서로 다른 주문 유형을 섞는 빌드 보상", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["보스","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_tricolor_cotton_fan", plannedTrigger:"onSpellTypeSetCompleted", plannedConditions:{requiredTypes:["attack","defense","skill"], oncePerTurn:true}, plannedEffects:{restoreEnergy:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"old_hairpin", dataId:"RE007", name:"묵은 비녀", emoji:"🪮", category:"범용", deck:"범용", rarity:"uncommon", desc:"전투 시작 시 시작 손패의 무작위 주문 1장의 비용을 그 턴 동안 1 감소(최소 0)", effectText:"전투 시작 시 시작 손패의 무작위 주문 1장의 비용을 그 턴 동안 1 감소(최소 0)", valueText:"첫 턴 무작위 주문 비용 -1", synergy:"모든 덱", coreFun:"첫 턴 손패에 작은 변주와 고점 생성", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_old_hairpin", plannedTrigger:"battleStartAfterDraw", plannedConditions:{handOnly:true, randomTarget:true, minCost:0}, plannedEffects:{temporaryCostReduction:1, duration:"currentTurn"}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"ash_smeared_mirror", dataId:"RE008", name:"재 묻은 거울", emoji:"🪞", category:"범용", deck:"범용", rarity:"uncommon", desc:"전투당 처음 정신력 피해를 받으면 다음 턴 신통력 +1", effectText:"전투당 처음 정신력 피해를 받으면 다음 턴 신통력 +1", valueText:"첫 피해 후 다음 턴 신통력 +1", synergy:"모든 덱", coreFun:"피해를 다음 턴 반격 자원으로 전환", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_ash_smeared_mirror", plannedTrigger:"onPlayerHpDamage", plannedConditions:{oncePerBattle:true}, plannedEffects:{nextTurnEnergyBonus:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"paper_crane_bundle", dataId:"RE009", name:"종이학 묶음", emoji:"🕊️", category:"범용", deck:"범용", rarity:"rare", desc:"전투당 처음 손패가 0장이 되는 순간 주문 2장 뽑기", effectText:"전투당 처음 손패가 0장이 되는 순간 주문 2장 뽑기", valueText:"첫 손패 0장 시 드로우 +2", synergy:"저비용·고비용 혼합", coreFun:"손패를 털어낸 뒤 한 번 더 턴을 이어가는 역전감", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["보스","희귀 상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_paper_crane_bundle", plannedTrigger:"onHandEmpty", plannedConditions:{oncePerBattle:true, duringPlayerTurn:true}, plannedEffects:{draw:2}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"threshold_salt", dataId:"RE010", name:"문지방 소금", emoji:"🧂", category:"범용", deck:"범용", rarity:"common", desc:"전투마다 처음 받는 정신력 피해를 5 감소", effectText:"전투마다 처음 받는 정신력 피해를 5 감소", valueText:"첫 정신력 피해 -5", synergy:"모든 덱", coreFun:"초반 생존 안정성과 엘리트 진입 부담 완화", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_threshold_salt", plannedTrigger:"beforePlayerHpDamage", plannedConditions:{oncePerBattle:true}, plannedEffects:{reduceHpDamage:5}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"demon_sealing_tablet", dataId:"RE011", name:"봉마패", emoji:"🧿", category:"결계", deck:"결계", rarity:"common", desc:"전투 시작 시 결계 8", effectText:"전투 시작 시 결계 8", valueText:"전투 시작 결계 +8", synergy:"결계 덱", coreFun:"초반 안정성 확보", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"fx", implementationKey:"relic_demon_sealing_tablet", plannedTrigger:"battleStart", plannedConditions:{}, plannedEffects:{block:8}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"red_golden_rope", dataId:"RE012", name:"붉은 금줄", emoji:"🔴", category:"결계", deck:"결계", rarity:"uncommon", desc:"매 턴 처음 결계를 얻을 때 무작위 유령 1체를 2 정화", effectText:"매 턴 처음 결계를 얻을 때 무작위 유령 1체를 2 정화", valueText:"턴당 첫 결계 획득 시 무작위 정화 2", synergy:"결계 덱", coreFun:"방어 행동이 공격으로 이어짐", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_red_golden_rope", plannedTrigger:"onBlockGain", plannedConditions:{oncePerTurn:true}, plannedEffects:{damageRandomEnemy:2}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"ink_line_spool", dataId:"RE013", name:"먹줄 감개", emoji:"🧵", category:"결계", deck:"결계", rarity:"rare", desc:"현재 결계가 15 이상인 상태에서 결계를 전부 소모하면 주문 1장 뽑고 신통력 1 회복. 전투당 1회", effectText:"현재 결계가 15 이상인 상태에서 결계를 전부 소모하면 주문 1장 뽑고 신통력 1 회복. 전투당 1회", valueText:"결계 전부 소모 후 드로우+신통력", synergy:"결계 피니셔", coreFun:"피니셔 이후 턴을 다시 이어가는 폭발감", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["보스","희귀 상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_ink_line_spool", plannedTrigger:"onBarrierFullyConsumed", plannedConditions:{minBarrierBeforeConsume:15, oncePerBattle:true}, plannedEffects:{draw:1, restoreEnergy:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"damp_letter_tie", dataId:"RE014", name:"눅은 편지끈", emoji:"🎗️", category:"회상", deck:"회상", rarity:"uncommon", desc:"회상 3 이상인 대상에게 회상을 추가 부여하면 주문 1장 뽑기. 턴당 1회", effectText:"회상 3 이상인 대상에게 회상을 추가 부여하면 주문 1장 뽑기. 턴당 1회", valueText:"회상 3+ 대상 추가 회상 시 드로우", synergy:"회상 덱", coreFun:"집중 누적을 드로우 엔진으로 전환", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_damp_letter_tie", plannedTrigger:"onRecollectionApplied", plannedConditions:{targetRecollectionAtLeast:3, oncePerTurn:true}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"ward_pocket_watch", dataId:"RE015", name:"병실 회중시계", emoji:"⏱️", category:"회상", deck:"회상", rarity:"common", desc:"매 턴 처음 회상이 발동해 정화할 때 정화량 +1", effectText:"매 턴 처음 회상이 발동해 정화할 때 정화량 +1", valueText:"턴당 첫 회상 발동 정화 +1", synergy:"회상 덱", coreFun:"지속 정화의 안정적인 저점 보강", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_ward_pocket_watch", plannedTrigger:"onRecollectionDamage", plannedConditions:{oncePerTurn:true}, plannedEffects:{recollectionDamageBonus:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"tear_catcher_gourd", dataId:"RE016", name:"눈물받이 호리병", emoji:"🏺", category:"회상", deck:"회상", rarity:"rare", desc:"전투당 처음으로 회상을 가진 유령이 성불하면 남은 다른 유령 1체에 회상 2 전이", effectText:"전투당 처음으로 회상을 가진 유령이 성불하면 남은 다른 유령 1체에 회상 2 전이", valueText:"회상 대상 성불 시 회상 2 전이", synergy:"회상 다수전", coreFun:"처치 순서 자체를 전략으로 만듦", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["보스","엘리트"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_tear_catcher_gourd", plannedTrigger:"onEnemyDefeated", plannedConditions:{defeatedHadRecollection:true, oncePerBattle:true, requireOtherEnemy:true}, plannedEffects:{transferRecollection:2, target:"anotherEnemy"}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"lotus_lamp", dataId:"RE017", name:"연화 등잔", emoji:"🪷", category:"성불 표식", deck:"성불 표식", rarity:"uncommon", desc:"성불 표식이 없는 대상에게 처음 표식을 부여할 때 표식 1을 추가 부여. 대상당 전투 1회", effectText:"성불 표식이 없는 대상에게 처음 표식을 부여할 때 표식 1을 추가 부여. 대상당 전투 1회", valueText:"대상별 첫 표식 +1", synergy:"성불 표식 덱", coreFun:"표식 엔진의 시동 강화", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_lotus_lamp", plannedTrigger:"onMarkApply", plannedConditions:{targetHadNoMark:true, oncePerTargetPerBattle:true}, plannedEffects:{markBonus:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"lotus_seed_bead", dataId:"RE018", name:"연씨 염주", emoji:"📿", category:"성불 표식", deck:"성불 표식", rarity:"common", desc:"전투 시작 시 선두 유령에게 성불 표식 1", effectText:"전투 시작 시 선두 유령에게 성불 표식 1", valueText:"선두 유령 표식 +1", synergy:"성불 표식 덱", coreFun:"첫 폭발까지의 준비 턴 단축", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"fx", implementationKey:"relic_lotus_seed_bead", plannedTrigger:"battleStart", plannedConditions:{target:"frontEnemy"}, plannedEffects:{applyMark:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"cheondo_bell", dataId:"RE019", name:"천도 방울", emoji:"🔔", category:"성불 표식", deck:"성불 표식", rarity:"rare", desc:"한 번에 성불 표식 4 이상을 소모하면 다음 턴 시작 시 신통력 1을 회복하고 주문 1장 추가로 뽑기. 전투당 1회", effectText:"한 번에 성불 표식 4 이상을 소모하면 다음 턴 시작 시 신통력 1을 회복하고 주문 1장 추가로 뽑기. 전투당 1회", valueText:"표식 4+ 소모 후 다음 턴 보상", synergy:"혼백천도 중심", coreFun:"폭발 피니셔 뒤 공백을 보완", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["보스","희귀 상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_cheondo_bell", plannedTrigger:"onMarksConsumed", plannedConditions:{minMarksConsumed:4, oncePerBattle:true}, plannedEffects:{nextTurnRestoreEnergy:1, nextTurnDraw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"old_letter_box", dataId:"RE020", name:"묵은 편지함", emoji:"📮", category:"한풀이", deck:"한풀이", rarity:"rare", desc:"전투 시작 시 무작위 한풀이 주문 1장이 성장 1회 적용된 상태로 시작", effectText:"전투 시작 시 무작위 한풀이 주문 1장이 성장 1회 적용된 상태로 시작", valueText:"전투 시작 한풀이 1장 성장 +1", synergy:"한풀이 덱", coreFun:"초기 저점 보완과 숙성 기대감", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","보스"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_old_letter_box", plannedTrigger:"battleStart", plannedConditions:{randomHandOrDeckCard:true, archetype:"hanpuri"}, plannedEffects:{applyGrowthCount:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"broken_red_thread", dataId:"RE021", name:"끊어진 붉은 실", emoji:"🧶", category:"한풀이", deck:"한풀이", rarity:"uncommon", desc:"매 턴 처음 한풀이 주문의 수치가 증가하면 주문 1장 뽑기", effectText:"매 턴 처음 한풀이 주문의 수치가 증가하면 주문 1장 뽑기", valueText:"턴당 첫 한풀이 성장 시 드로우", synergy:"한풀이 덱", coreFun:"성장 자체를 순환 자원으로 전환", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_broken_red_thread", plannedTrigger:"onHanpuriGrowth", plannedConditions:{oncePerTurn:true}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"unsealed_letter", dataId:"RE022", name:"봉하지 못한 편지", emoji:"💌", category:"한풀이", deck:"한풀이", rarity:"rare", desc:"한풀이 주문이 처음 최대 성장에 도달하면 다음 턴 시작 시 손패로 가져오고 그 턴 비용 1 감소(최소 0). 전투당 1회", effectText:"한풀이 주문이 처음 최대 성장에 도달하면 다음 턴 시작 시 손패로 가져오고 그 턴 비용 1 감소(최소 0). 전투당 1회", valueText:"최대 성장 한풀이 다음 턴 회수", synergy:"한풀이 피니셔", coreFun:"‘다 익었다’는 숙성 보상과 확정 폭발", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["보스","희귀 상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_unsealed_letter", plannedTrigger:"onHanpuriReachMaxGrowth", plannedConditions:{oncePerBattle:true, firstReachOnly:true}, plannedEffects:{returnTiming:"nextTurnStart", returnTarget:"triggeredCard", temporaryCostReduction:1, minCost:0}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"gilt_bell_clapper", dataId:"RE023", name:"금동 방울채", emoji:"🔔", category:"굿판", deck:"굿판", rarity:"common", desc:"매 턴 첫 방울치기의 정화량 +2", effectText:"매 턴 첫 방울치기의 정화량 +2", valueText:"턴당 첫 방울치기 정화 +2", synergy:"굿판 덱", coreFun:"첫 연타의 기본 체감 강화", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["일반전","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_gilt_bell_clapper", plannedTrigger:"onBellStrikePurify", plannedConditions:{oncePerTurn:true}, plannedEffects:{purifyBonus:2}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"sevenstar_knot", dataId:"RE024", name:"칠성 매듭", emoji:"🪢", category:"굿판", deck:"굿판", rarity:"uncommon", desc:"매 턴 5번째 주문을 사용하면 주문 1장 뽑기. 턴당 1회", effectText:"매 턴 5번째 주문을 사용하면 주문 1장 뽑기. 턴당 1회", valueText:"5번째 주문 사용 시 드로우", synergy:"굿판·저비용 덱", coreFun:"4번째 주문 도달을 미니 목표로 만듦", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_sevenstar_knot", plannedTrigger:"onNthSpellPlayedEachTurn", plannedConditions:{spellCount:5, oncePerTurn:true}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"torn_gut_fan", dataId:"RE025", name:"찢어진 굿부채", emoji:"🪭", category:"굿판", deck:"굿판", rarity:"uncommon", desc:"한 턴에 주문 3장이 소멸하면 결계 5 획득. 전투당 최대 2회", effectText:"한 턴에 주문 3장이 소멸하면 결계 5 획득. 전투당 최대 2회", valueText:"주문 3장 소멸 시 결계 +5", synergy:"굿판 덱", coreFun:"연타·소멸 행동을 방어 자원으로 변환", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_torn_gut_fan", plannedTrigger:"onExhaustCountEachTurn", plannedConditions:{exhaustedSpellCount:3, maxPerBattle:2}, plannedEffects:{block:5}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"mugwort_bundle", dataId:"RE026", name:"약쑥 다발", emoji:"🌿", category:"기도터", deck:"기도터", rarity:"common", desc:"기도터 ‘휴식하기’ 회복량이 최대 정신력 25% → 35%", effectText:"기도터 ‘휴식하기’ 회복량이 최대 정신력 25% → 35%", valueText:"휴식 회복량 35%", synergy:"기도터 경로", coreFun:"회복 노드 가치 상승", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"하", obtainFrom:[], obtainFromProposal:["기도터","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_mugwort_bundle", plannedTrigger:"onRestSiteHeal", plannedConditions:{action:"rest"}, plannedEffects:{healMaxHpRatioOverride:0.35}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"empty_spirit_tablet", dataId:"RE027", name:"빈 신위패", emoji:"🪧", category:"기도터", deck:"기도터", rarity:"rare", desc:"이번 런의 첫 ‘정리하기’ 비용 0", effectText:"이번 런의 첫 ‘정리하기’ 비용 0", valueText:"첫 정리하기 무료", synergy:"덱 압축", coreFun:"기도터 경로를 적극적으로 타게 만듦", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["기도터","이벤트"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_empty_spirit_tablet", plannedTrigger:"onPrayerCleanseCost", plannedConditions:{firstCleanseThisRun:true}, plannedEffects:{costOverride:0}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"tricolor_ritual_bowl", dataId:"RE028", name:"삼색 제기", emoji:"🥣", category:"기도터", deck:"기도터", rarity:"uncommon", desc:"기도터 ‘받아들이기’에서 주문 3장 대신 4장 제시", effectText:"기도터 ‘받아들이기’에서 주문 3장 대신 4장 제시", valueText:"받아들이기 선택지 +1", synergy:"모든 덱", coreFun:"카드 선택 품질과 덱 완성도 상승", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["기도터","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_tricolor_ritual_bowl", plannedTrigger:"onPrayerAcceptOffer", plannedConditions:{action:"accept"}, plannedEffects:{offerCountBonus:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"prayer_knot", dataId:"RE029", name:"기원문 매듭", emoji:"🪢", category:"기도터", deck:"기도터", rarity:"common", desc:"기도터에서 어떤 행동이든 완료하면 다음 전투 시작 시 결계 6", effectText:"기도터에서 어떤 행동이든 완료하면 다음 전투 시작 시 결계 6", valueText:"기도터 후 다음 전투 결계 +6", synergy:"모든 덱", coreFun:"기도터 방문 자체를 다음 전투 준비로 연결", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["기도터","일반전"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_prayer_knot", plannedTrigger:"onPrayerActionComplete", plannedConditions:{anyPrayerAction:true}, plannedEffects:{nextBattleStartBlock:6}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"empty_lucky_pouch", dataId:"RE030", name:"비워 둔 복주머니", emoji:"👝", category:"런 운영", deck:"런 운영", rarity:"uncommon", desc:"전투 후 주문 보상을 건너뛰면 복채 15 획득. 이번 런에서 최대 4회", effectText:"전투 후 주문 보상을 건너뛰면 복채 15 획득. 이번 런에서 최대 4회", valueText:"카드 보상 스킵 시 복채 +15", synergy:"덱 압축·완성형 덱", coreFun:"카드를 안 집는 선택에도 명확한 보상을 부여", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["엘리트","상점"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_empty_lucky_pouch", plannedTrigger:"onCardRewardSkipped", plannedConditions:{maxPerRun:4}, plannedEffects:{gold:15}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"peddler_abacus", dataId:"RE031", name:"장돌뱅이의 주판", emoji:"🧮", category:"런 운영", deck:"런 운영", rarity:"uncommon", desc:"각 상점에서 첫 구매 가격 15% 할인", effectText:"각 상점에서 첫 구매 가격 15% 할인", valueText:"상점별 첫 구매 15% 할인", synergy:"모든 덱", coreFun:"상점 경로와 구매 순서를 전략으로 만듦", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"중", obtainFrom:[], obtainFromProposal:["상점","이벤트"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_peddler_abacus", plannedTrigger:"onShopPriceCalculate", plannedConditions:{firstPurchaseEachShop:true}, plannedEffects:{discountRatio:0.15}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"twin_marriage_tablet", dataId:"RE032", name:"쌍둥이 혼인패", emoji:"🎎", category:"고위험 특수", deck:"고위험 특수", rarity:"special", desc:"덱에 주문을 영구적으로 추가할 때마다 같은 주문을 1장 더 추가", effectText:"덱에 주문을 영구적으로 추가할 때마다 같은 주문을 1장 더 추가", valueText:"영구 카드 추가 시 1장 복제", synergy:"핵심 카드 집중 덱", coreFun:"핵심 주문 확보는 빨라지지만 덱이 폭발적으로 비대해짐", balanceStatus:"유지", balanceRisk:"P2", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["특수 이벤트"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_twin_marriage_tablet", plannedTrigger:"onPermanentCardAdded", plannedConditions:{copySameCard:true}, plannedEffects:{addExtraCopy:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"inverted_bell", dataId:"RE033", name:"거꾸로 맨 방울", emoji:"🔔", category:"고위험 특수", deck:"고위험 특수", rarity:"special", desc:"매 턴 최대 신통력 +1. 단, 전투 첫 턴에는 손패 순서를 바꿀 수 없고 주문을 왼쪽부터 가능한 만큼 자동 사용하며 대상도 자동 선택", effectText:"매 턴 최대 신통력 +1. 단, 전투 첫 턴에는 손패 순서를 바꿀 수 없고 주문을 왼쪽부터 가능한 만큼 자동 사용하며 대상도 자동 선택", valueText:"최대 신통력 +1, 첫 턴 자동 사용", synergy:"고비용 덱", coreFun:"강력한 자원 보상과 첫 턴 통제 상실", balanceStatus:"규칙 명확화", balanceRisk:"P1", implementationDifficulty:"최상", obtainFrom:[], obtainFromProposal:["특수 이벤트","보스"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_inverted_bell", plannedTrigger:"turnStart", plannedConditions:{maxEnergyBonus:1, firstTurnAutoPlay:true}, plannedEffects:{maxEnergyBonus:1, autoPlayLeftToRight:true, autoSelectTargets:true}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"cracked_divine_tablet", dataId:"RE034", name:"금 간 신통패", emoji:"🪬", category:"고위험 특수", deck:"고위험 특수", rarity:"special", desc:"매 턴 최대 신통력 +1. 단, 한 턴에 주문을 최대 3장까지만 사용", effectText:"매 턴 최대 신통력 +1. 단, 한 턴에 주문을 최대 3장까지만 사용", valueText:"최대 신통력 +1, 주문 3장 제한", synergy:"결계·성불", coreFun:"고비용 덱에는 신급, 연타 덱에는 재앙", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["특수 이벤트","보스"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_cracked_divine_tablet", plannedTrigger:"turnStart", plannedConditions:{maxCardsPlayedPerTurn:3}, plannedEffects:{maxEnergyBonus:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"closed_sutra_box", dataId:"RE035", name:"닫힌 경전함", emoji:"📦", category:"고위험 특수", deck:"고위험 특수", rarity:"special", desc:"매 턴 시작 시 주문 1장 추가로 뽑기. 단, 자신의 턴 중 다른 효과로 주문을 뽑을 수 없음", effectText:"매 턴 시작 시 주문 1장 추가로 뽑기. 단, 자신의 턴 중 다른 효과로 주문을 뽑을 수 없음", valueText:"턴 시작 드로우 +1, 추가 드로우 차단", synergy:"결계·한풀이·고비용", coreFun:"큰 손패 보상과 드로우 엔진 봉쇄의 양면성", balanceStatus:"필수 하향", balanceRisk:"P0", implementationDifficulty:"상", obtainFrom:[], obtainFromProposal:["특수 이벤트","보스"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_closed_sutra_box", plannedTrigger:"turnStart", plannedConditions:{blockOtherDrawDuringPlayerTurn:true}, plannedEffects:{draw:1}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },
  { id:"reversed_talisman_book", dataId:"RE036", name:"뒤집힌 부적첩", emoji:"📒", category:"고위험 특수", deck:"고위험 특수", rarity:"special", desc:"매 턴 시작 시 주문 1장 추가로 뽑기. 뽑기 더미에서 손패로 들어오는 주문의 비용이 그 턴 동안 무작위 0~3", effectText:"매 턴 시작 시 주문 1장 추가로 뽑기. 뽑기 더미에서 손패로 들어오는 주문의 비용이 그 턴 동안 무작위 0~3", valueText:"턴 시작 드로우 +1, 드로우 카드 비용 0~3", synergy:"고비용 회상·성불", coreFun:"고비용 주문 대박과 저비용 주문 역폭탄", balanceStatus:"경미 하향", balanceRisk:"P1", implementationDifficulty:"최상", obtainFrom:[], obtainFromProposal:["특수 이벤트"], runtimeEnabled:false, implementationStatus:"dataOnly", implementationType:"custom", implementationKey:"relic_reversed_talisman_book", plannedTrigger:"onCardDrawnFromDrawPile", plannedConditions:{duration:"currentTurn", randomCostRange:[0,3]}, plannedEffects:{turnStartDraw:1, randomizeDrawnCardCost:true}, trigger:"none", target:"self", dropWeight:0, price:0, shopPrice:0, fx:[] },

  { "id":"blessing_relic_01", "dataId":"BR001", "name":"길잃은 방울", "emoji":"🌒", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"무작위 법구 1개를 얻습니다. 대신 정신력 12를 잃습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"무작위 법구 1개를 얻습니다. 대신 정신력 12를 잃습니다.", "valueText":"신령의 은혜: 법구 획득, 정신력 -12", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_02", "dataId":"BR002", "name":"금단의 서낭부", "emoji":"🃏", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"Rare 카드 3장 중 1장을 선택합니다. 대신 상태 카드 1장을 덱에 추가합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"Rare 카드 3장 중 1장을 선택합니다. 대신 상태 카드 1장을 덱에 추가합니다.", "valueText":"신령의 은혜: Rare 카드 획득, 상태 카드 추가", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_03", "dataId":"BR003", "name":"깨진 복주머니", "emoji":"🪙", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"복채 120을 얻습니다. 대신 최대 정신력 8을 잃습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"복채 120을 얻습니다. 대신 최대 정신력 8을 잃습니다.", "valueText":"신령의 은혜: 복채 +120, 최대 정신력 -8", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_04", "dataId":"BR004", "name":"흔들리는 약향로", "emoji":"⚗️", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"무작위 약병 2개를 얻습니다. 대신 첫 전투 시작 시 플레이어에게 불안 1을 부여합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"무작위 약병 2개를 얻습니다. 대신 첫 전투 시작 시 플레이어에게 불안 1을 부여합니다.", "valueText":"신령의 은혜: 약병 +2, 첫 전투 불안 1", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_05", "dataId":"BR005", "name":"빈 복채함", "emoji":"🏺", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"무작위 법구 1개를 얻습니다. 대신 보유 복채를 모두 잃습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"무작위 법구 1개를 얻습니다. 대신 보유 복채를 모두 잃습니다.", "valueText":"신령의 은혜: 법구 획득, 복채 0", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_06", "dataId":"BR006", "name":"인연 끊는 가위", "emoji":"✂️", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"기본 카드 1장을 선택하여 제거합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"기본 카드 1장을 선택하여 제거합니다.", "valueText":"신령의 은혜: 기본 카드 선택 제거", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_07", "dataId":"BR007", "name":"뒤섞인 인연패", "emoji":"🔀", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"기본 카드 1장을 무작위로 제거하고, 무작위 Common 카드 1장을 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"기본 카드 1장을 무작위로 제거하고, 무작위 Common 카드 1장을 얻습니다.", "valueText":"신령의 은혜: 기본 카드 제거, Common 카드 획득", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_08", "dataId":"BR008", "name":"망각의 매듭", "emoji":"🧹", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"카드 2장을 제거합니다. 대신 보유 복채를 모두 잃습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"카드 2장을 제거합니다. 대신 보유 복채를 모두 잃습니다.", "valueText":"신령의 은혜: 카드 2장 제거, 복채 0", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_09", "dataId":"BR009", "name":"새 인연의 부적", "emoji":"📜", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"Common 카드 3장 중 1장을 선택해 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"Common 카드 3장 중 1장을 선택해 얻습니다.", "valueText":"신령의 은혜: Common 카드 획득", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_10", "dataId":"BR010", "name":"가벼운 첫 매듭", "emoji":"🍃", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"무작위 Common 카드 1장을 얻습니다. 그 카드는 이번 런 동안 비용이 1 감소합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"무작위 Common 카드 1장을 얻습니다. 그 카드는 이번 런 동안 비용이 1 감소합니다.", "valueText":"신령의 은혜: Common 카드 비용 -1", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_11", "dataId":"BR011", "name":"수호의 첫 종소리", "emoji":"🕯️", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"다음 3번의 일반 전투에서 첫 번째 적의 정신력을 1로 만듭니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"다음 3번의 일반 전투에서 첫 번째 적의 정신력을 1로 만듭니다.", "valueText":"신령의 은혜: 일반 전투 3회 첫 적 정신력 1", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_12", "dataId":"BR012", "name":"첫 결계의 연꽃", "emoji":"🛡️", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"첫 전투 시작 시 결계 10을 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"첫 전투 시작 시 결계 10을 얻습니다.", "valueText":"신령의 은혜: 첫 전투 결계 +10", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_13", "dataId":"BR013", "name":"맑은 혼의 옥패", "emoji":"💗", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"최대 정신력이 8 증가하고, 현재 정신력도 8 회복합니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"최대 정신력이 8 증가하고, 현재 정신력도 8 회복합니다.", "valueText":"신령의 은혜: 최대 정신력 +8, 회복 +8", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_14", "dataId":"BR014", "name":"수호 복주머니", "emoji":"💰", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"복채 80을 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"복채 80을 얻습니다.", "valueText":"신령의 은혜: 복채 +80", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] },
  { "id":"blessing_relic_15", "dataId":"BR015", "name":"은혜의 약병", "emoji":"🧪", "deck":"은혜", "rarity":"blessing", "obtainFrom":[], "source":"startBlessing", "category":"blessingRelic", "trigger":"none", "target":"self", "desc":"무작위 약병 1개를 얻습니다.\n여정을 떠나기 전 신령에게 받은 은혜의 증표.", "effectText":"무작위 약병 1개를 얻습니다.", "valueText":"신령의 은혜: 약병 +1", "dropWeight":0, "price":0, "shopPrice":0, "fx":[] }
];

const RELIC_ICON_PATHS = {
  bronze_incense_burner: "assets/relic_icons/bronze_incense_burner.png",
  moon_spirit_tablet: "assets/relic_icons/moon_spirit_tablet.png",
  lizard_tail_charm: "assets/relic_icons/lizard_tail_charm.png",
  broken_rosary: "assets/relic_icons/broken_rosary.png",
  leftover_candle_wax: "assets/relic_icons/leftover_candle_wax.png",
  tricolor_cotton_fan: "assets/relic_icons/tricolor_cotton_fan.png",
  old_hairpin: "assets/relic_icons/old_hairpin.png",
  ash_smeared_mirror: "assets/relic_icons/ash_smeared_mirror.png",
  paper_crane_bundle: "assets/relic_icons/paper_crane_bundle.png",
  threshold_salt: "assets/relic_icons/threshold_salt.png",
  demon_sealing_tablet: "assets/relic_icons/demon_sealing_tablet.png",
  red_golden_rope: "assets/relic_icons/red_golden_rope.png",
  ink_line_spool: "assets/relic_icons/ink_line_spool.png",
  damp_letter_tie: "assets/relic_icons/damp_letter_tie.png",
  ward_pocket_watch: "assets/relic_icons/ward_pocket_watch.png",
  tear_catcher_gourd: "assets/relic_icons/tear_catcher_gourd.png",
  lotus_lamp: "assets/relic_icons/lotus_lamp.png",
  lotus_seed_bead: "assets/relic_icons/lotus_seed_bead.png",
  cheondo_bell: "assets/relic_icons/cheondo_bell.png",
  old_letter_box: "assets/relic_icons/old_letter_box.png",
  broken_red_thread: "assets/relic_icons/broken_red_thread.png",
  unsealed_letter: "assets/relic_icons/unsealed_letter.png",
  gilt_bell_clapper: "assets/relic_icons/gilt_bell_clapper.png",
  sevenstar_knot: "assets/relic_icons/sevenstar_knot.png",
  torn_gut_fan: "assets/relic_icons/torn_gut_fan.png",
  mugwort_bundle: "assets/relic_icons/mugwort_bundle.png",
  empty_spirit_tablet: "assets/relic_icons/empty_spirit_tablet.png",
  tricolor_ritual_bowl: "assets/relic_icons/tricolor_ritual_bowl.png",
  prayer_knot: "assets/relic_icons/prayer_knot.png",
  empty_lucky_pouch: "assets/relic_icons/empty_lucky_pouch.png",
  peddler_abacus: "assets/relic_icons/peddler_abacus.png",
  twin_marriage_tablet: "assets/relic_icons/twin_marriage_tablet.png",
  inverted_bell: "assets/relic_icons/inverted_bell.png",
  cracked_divine_tablet: "assets/relic_icons/cracked_divine_tablet.png",
  closed_sutra_box: "assets/relic_icons/closed_sutra_box.png",
  reversed_talisman_book: "assets/relic_icons/reversed_talisman_book.png",
  blessing_relic_01: "assets/relic_icons/blessing_relic_01.png",
  blessing_relic_02: "assets/relic_icons/blessing_relic_02.png",
  blessing_relic_03: "assets/relic_icons/blessing_relic_03.png",
  blessing_relic_04: "assets/relic_icons/blessing_relic_04.png",
  blessing_relic_05: "assets/relic_icons/blessing_relic_05.png",
  blessing_relic_06: "assets/relic_icons/blessing_relic_06.png",
  blessing_relic_07: "assets/relic_icons/blessing_relic_07.png",
  blessing_relic_08: "assets/relic_icons/blessing_relic_08.png",
  blessing_relic_09: "assets/relic_icons/blessing_relic_09.png",
  blessing_relic_10: "assets/relic_icons/blessing_relic_10.png",
  blessing_relic_11: "assets/relic_icons/blessing_relic_11.png",
  blessing_relic_12: "assets/relic_icons/blessing_relic_12.png",
  blessing_relic_13: "assets/relic_icons/blessing_relic_13.png",
  blessing_relic_14: "assets/relic_icons/blessing_relic_14.png",
  blessing_relic_15: "assets/relic_icons/blessing_relic_15.png"
};

RELIC_MASTER_DB.forEach(item => {
  if (!item || !RELIC_ICON_PATHS[item.id]) return;
  item.iconImage = RELIC_ICON_PATHS[item.id];
});

const IMPLEMENTED_RELIC_IDS = new Set([
  "bronze_incense_burner",
  "moon_spirit_tablet",
  "lizard_tail_charm",
  "broken_rosary",
  "leftover_candle_wax",
  "tricolor_cotton_fan",
  "old_hairpin",
  "ash_smeared_mirror",
  "paper_crane_bundle",
  "threshold_salt",
  "demon_sealing_tablet",
  "red_golden_rope",
  "ink_line_spool",
  "damp_letter_tie",
  "ward_pocket_watch",
  "tear_catcher_gourd",
  "lotus_lamp",
  "lotus_seed_bead",
  "cheondo_bell",
  "old_letter_box",
  "broken_red_thread",
  "unsealed_letter",
  "gilt_bell_clapper",
  "sevenstar_knot",
  "torn_gut_fan",
  "mugwort_bundle",
  "empty_spirit_tablet",
  "tricolor_ritual_bowl",
  "prayer_knot",
  "empty_lucky_pouch",
  "peddler_abacus",
  "twin_marriage_tablet",
  "inverted_bell",
  "cracked_divine_tablet",
  "closed_sutra_box",
  "reversed_talisman_book"
]);

RELIC_MASTER_DB.forEach(item => {
  if (!item || !/^RE\d{3}$/.test(item.dataId || "")) return;
  if (!IMPLEMENTED_RELIC_IDS.has(item.id)) return;
  item.runtimeEnabled = true;
  item.implementationStatus = "implemented";
});

/* =========================================================================
   equipment.js 공식 런타임 DB 변환부
   - RELIC_MASTER_DB: 기획 원본 데이터
   - RELIC_DB: 기존 전투/상점/가방 코드가 바로 사용할 수 있는 호환 데이터
   ========================================================================= */

function normalizeRelicForRuntime(item) {
  const fx = Array.isArray(item.fx) ? item.fx.map(effect => {
    if (!effect) return effect;
    if (effect.t === "markBonus") {
      return { ...effect, t: "markPlus" };
    }
    if (effect.timing === "damageModifier") {
      return { ...effect, timing: "damage" };
    }
    return { ...effect };
  }) : [];

  return {
    ...item,
    attr: item.attr || item.deck || "범용",
    price: item.shopPrice || item.price || 0,
    desc: item.desc || item.effectText || item.valueText || "",
    fx,
    masterData: item
  };
}

var RELIC_DB = RELIC_MASTER_DB
  .filter(item => {
    if (!item) return false;
    if (item.category === "blessingRelic" || item.source === "startBlessing") return true;
    return item.runtimeEnabled === true;
  })
  .map(normalizeRelicForRuntime);

const RELIC_DROP_RATE = { common: 55, uncommon: 35, rare: 10 };
function getRandomRelic(rng = Math.random, source = null, ownedIds = []) {
  const ownedSet = new Set(Array.isArray(ownedIds) ? ownedIds : []);
  const list = Array.isArray(RELIC_DB)
    ? RELIC_DB.filter(item => {
        if (!item || ownedSet.has(item.id)) return false;
        if (item.category === "blessingRelic" || item.source === "startBlessing") return false;
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

window.RELIC_MASTER_DB = RELIC_MASTER_DB;
window.RELIC_DB = RELIC_DB;
window.RELIC_DROP_RATE = RELIC_DROP_RATE;
window.RELIC_ICON_PATHS = RELIC_ICON_PATHS;
window.getRandomRelic = getRandomRelic;
