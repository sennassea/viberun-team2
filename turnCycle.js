"use strict";
/* =========================================================================
   턴 종료 → 생존 적 행동(spawnIndex 순) → 새 플레이어 턴
   레거시 종료 오버레이(#over) DOM 렌더링은 turnCycleUI.js로 분리되어 있다.
   ========================================================================= */
async function endTurn(){
  const tutorialEndTurnStepActive = window.TUTORIAL_BATTLE &&
    typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
    window.TUTORIAL_BATTLE.isTutorialBattle() &&
    typeof window.TUTORIAL_BATTLE.isEndTurnStepActive === "function" &&
    window.TUTORIAL_BATTLE.isEndTurnStepActive();
  if((S.busy && !tutorialEndTurnStepActive) || S.pendingCardChoice || S.over) return;
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.canEndTurn === "function" &&
     !window.TUTORIAL_BATTLE.canEndTurn()){
    const message = typeof window.TUTORIAL_BATTLE.getTutorialRestrictionMessage === "function"
      ? window.TUTORIAL_BATTLE.getTutorialRestrictionMessage("endTurn")
      : "";
    if(message && typeof toast === "function") toast(message);
    return;
  }
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.onEndTurnClicked === "function"){
    window.TUTORIAL_BATTLE.onEndTurnClicked();
  }
  S.busy = true;
  S.playerTurnActive = false;
  updateEndBtn();

  applyPlayerTurnEndGimmicks();
  applyRelicTrigger("turnEnd");
  notifyMonsterBattleEvent("playerTurnEnd");

  LIFE.reduceWeak(S.player, 1);
  LIFE.reduceFracture(S.player, 1);
  LIFE.reduceAnxiety(S.player, 1);
  LIFE.reduceLethargy(S.player, 1);

  ensureCardInstanceZones();
  S.hand.forEach((key, index) => {
    const instance = S.handInstances && S.handInstances[index];
    if(instance && instance.runtime && instance.runtime.temporaryCopy && instance.runtime.exhaustOnTurnEnd){
      if(Array.isArray(S.exhaust)) S.exhaust.push(key);
      return;
    }
    discardCard(key, { source:"turnEnd", instance });
  });
  S.hand = [];
  S.handInstances = [];
  S.handLockTokens = [];
  S.handCostOverrides = [];
  triggerBlessingOnTurnEnd();
  renderAll();
  await wait(250);

  if(S.player.hp<=0 && !tryApplyFatalRelic()) return playDeathThenEndGame();

  // 생존 적을 spawnIndex 순서대로 행동 (기획서 §8-5)
  const actingEnemies = livingEnemies().sort((a,b) => (a.spawnIndex||0)-(b.spawnIndex||0));
  for(const e of actingEnemies){
    const mv = e.intent;
    if(!mv) continue;
    clearExpiredEnemyBlockBeforeAction(e);
    notifyMonsterBattleEvent("enemyActionStart", { enemy:e, move:mv });
    executeEchoMove(e);

    if(mv.t==="attack"){
      executeMonsterAttack(e, mv);
    } else if(mv.t==="defend"){
      const target = getPlannedMonsterSupportTarget(e, mv);
      const value = getMonsterDefendValue(e, mv, target);
      grantEnemyBlock(target, value);
      spawnFloat('[data-id="'+target.id+'"]', '+'+value, 'blk');
    } else if(mv.t==="summon"){
      const summoned = summonEnemy(e);
      spawnFloat('[data-id="'+e.id+'"]', summoned > 0 ? '소환' : '소환 실패', summoned > 0 ? 'heal' : 'blk');
    } else if(mv.t==="debuff"){
      if(mv.role==="anxiety"){
        LIFE.addAnxiety(S.player, mv.v);
        spawnFloat('.player', '불안', 'dmg');
      } else if(mv.role==="counter"){
        LIFE.addLethargy(S.player, mv.v);
        spawnFloat('.player', '무기력', 'dmg');
      } else if(mv.role==="fracture"){
        LIFE.addFracture(S.player, mv.v);
        spawnFloat('.player', '균열', 'dmg');
      } else {
        LIFE.addWeak(S.player, mv.v);
        spawnFloat('.player', '동요', 'dmg');
      }
    }
    if(Number.isFinite(e.expireAfterActions)){
      e.expireAfterActions -= 1;
      if(e.expireAfterActions <= 0){
        const beforeHp = e.hp || 0;
        e.hp = 0;
        if(beforeHp > 0) emitEnemyDiedOnce(e, { move:mv, expired:true });
      }
    }
    applyEnemyMoveAfterAction(e, mv);

    notifyMonsterBattleEvent("enemyActionEnd", { enemy:e, move:mv });
    decayEnemyStatuses(e, "afterEnemyAction");
    renderAll();

    // 회상 등 턴 종료 시 지속 피해로 마지막 적이 쓰러진 경우에도 즉시 클리어 처리한다.
    // (기존에는 카드 사용 직후에만 생존 적 0명을 검사해, 회상으로 적이 죽으면
    //  차례마침을 눌러도 전투가 끝나지 않는 문제가 있었다.)
    if(livingEnemies().length===0){
      nodeClear();
      renderAll();
      return;
    }
    if(S.player.hp<=0 && !tryApplyFatalRelic()) return playDeathThenEndGame();
    await wait(450);
  }

  // 새 플레이어 턴 준비
  const retainedBlock = S.retainedBlockFromRelic || 0;
  LIFE.prepareNextPlayerTurn(S.player);
  if(retainedBlock > 0){
    LIFE.addBlock(S.player, retainedBlock);
    spawnFloat('.player', '+'+retainedBlock, 'blk');
  }
  S.retainedBlockFromRelic = 0;
  S.blockGainedThisTurn = 0;
  S.cardsPlayedThisTurn = 0;
  S.attackCardsPlayedThisTurn = 0;
  S.damageDealtThisTurn = 0;
  S.exhaustedSpellCountThisTurn = 0;
  S.spellTypesPlayedThisTurn = {};
  S.handCostOverrides = [];
  S.blockGainMultiplierThisTurn = 1;
  S.bellStrikePurifyBonusThisTurn = 0;
  S.nextHighCostCardCostDown = null;
  S.nextAttackMultiplier = null;
  resetBlessingTurnFlags();
  const anxietyPenalty  = (S.player.anxiety||0)  > 0 ? 1 : 0;
  const lethargyPenalty = (S.player.lethargy||0) > 0 ? 1 : 0;
  S.energy    = Math.max(0, getMaxEnergy() - lethargyPenalty);
  const drawPenalty = S.pendingDrawPenalty || 0;
  const drawCount = Math.max(0, DRAW_PER_TURN - anxietyPenalty - drawPenalty);
  S.pendingDrawPenalty = 0;
  if(anxietyPenalty>0)  toast("불안으로 주문 뽑기 -1");
  if(drawPenalty>0)     toast("수술등 압박으로 주문 뽑기 -"+drawPenalty);
  if(lethargyPenalty>0) toast("무기력으로 신통력 -1");
  S.turn += 1;
  S.playerTurnActive = true;
  const bonusEnergy = S.nextTurnEnergyBonus || 0;
  const bonusDraw = S.nextTurnDrawBonus || 0;
  S.nextTurnEnergyBonus = 0;
  S.nextTurnDrawBonus = 0;
  if(S.nextTurnReturnCard && S.nextTurnReturnCard.cardUid){
    const returnedCard = removeCardFromBattleZonesByUid(S.nextTurnReturnCard.cardUid);
    if(returnedCard){
      const returnKey = returnedCard.key || S.nextTurnReturnCard.cardKey;
      S.hand.push(returnKey);
      S.handInstances.push(returnedCard.instance || createCardInstance(returnKey, { uid:S.nextTurnReturnCard.cardUid }));
      if(Array.isArray(S.handLockTokens)) S.handLockTokens.push(createHandLockToken());
      if(Array.isArray(S.handCostOverrides)) S.handCostOverrides.push(null);
      setHandCardCostOverride(S.hand.length - 1, Math.max(0, (CARD_DB[returnKey]?.cost || 0) - (S.nextTurnReturnCard.costReduction || 1)));
    }
    S.nextTurnReturnCard = null;
  }
  S.energy = Math.min(getMaxEnergy(), S.energy + bonusEnergy);
  triggerBlessingOnTurnStart();
  drawCards(drawCount, { source:"turnStartBase" });
  if(bonusDraw > 0) drawCards(bonusDraw, { source:"scheduledEffect" });
  applyRelicTrigger("turnStart");
  if(hasRelic("reversed_talisman_book")) drawCards(1, { source:"turnStartRelic" });
  notifyMonsterBattleEvent("playerTurnStart");
  // 생존 적 다음 행동 의도 계획
  livingEnemies().forEach(e => {
    MONSTER_PATTERN.planNextIntent(e);
    planEnemyIntentTarget(e);
  });
  applyPlayerTurnStartGimmicks();
  S.busy = false;
  renderAll();
  if(window.TUTORIAL_BATTLE &&
     typeof window.TUTORIAL_BATTLE.isTutorialBattle === "function" &&
     window.TUTORIAL_BATTLE.isTutorialBattle() &&
     typeof window.TUTORIAL_BATTLE.onEnemyTurnCompleted === "function"){
    window.TUTORIAL_BATTLE.onEnemyTurnCompleted();
  }
}

/* 플레이어 사망 시 패배 연출(동자신 대사/여정 요약 오버레이 등)로 넘어가기 전,
   1) 치명타로 트리거된 피격(damage) 모션이 있으면 끝까지 재생되도록 기다리고
   2) 그 다음 dead 스탠딩 이미지로 쓰러진 모습을 지정 시간만큼 보여준 뒤
   3) endGame("lose")을 호출한다.
   순서를 지키지 않으면 피격 모션이 끝나기도 전에 dead 모션으로 덮어써져
   두 모션이 뒤섞이거나 죽는 연출이 묻혀 보이지 않는 문제가 있었다. */
async function playDeathThenEndGame(){
  const durations = (typeof PLAYER_BATTLE_MOTION_DURATION !== "undefined") ? PLAYER_BATTLE_MOTION_DURATION : null;
  if(S.playerBattleMotion === "damage" && durations && durations.damage){
    await wait(durations.damage);
  }
  if(typeof triggerPlayerBattleMotion === "function") triggerPlayerBattleMotion("dead");
  await wait((durations && durations.dead) || 1500);
  return endGame("lose");
}

function endGame(result){
  const giveUpToStartOnly = !!(S && S.giveUpToStartOnly);
  if(S){
    S.over = result; S.busy = false;
    S.giveUpToStartOnly = false;
  }
  saveCompletedRunRecord(result);
  if(window.VIBERUN_SOUND && typeof window.VIBERUN_SOUND.play === "function"){
    window.VIBERUN_SOUND.play(result === "win" ? "battleVictory" : "battleDefeat");
  }

  // 보스 처치(승리) 시 신령의 은혜 신령 출현 연출을 먼저 보여준다.
  // runResult.js가 처리하지 못하는 결과(패배 등)는 기존 종료 UI로 폴백한다.
  if(window.RUN_RESULT_UI && typeof window.RUN_RESULT_UI.open === "function" &&
     window.RUN_RESULT_UI.open(result, () => showLegacyEndOverlay(result, giveUpToStartOnly))){
    return true;
  }

  showLegacyEndOverlay(result, giveUpToStartOnly);
  return true;
}
