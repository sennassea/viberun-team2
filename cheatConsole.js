"use strict";
/* =========================================================================
   개발자 테스트용 치트 콘솔 (cheatConsole.js)
   기획서: 개발자 테스트용 치트 명령어 구현 기획서

   - 기존 파일(script.js, mapSystem.js, mapNodeLogic.js, mapUI.js, restNode.js,
     cardData.js, lifeSystem.js, monsterData.js)은 전혀 수정하지 않는다.
   - script.js/mapSystem.js/... 가 선언한 전역 함수·변수(S, CARD_DB,
     STARTER_DECK, MAP_FLOORS, MAP_STAGES, RELIC_DB, LIFE, startStage,
     openMap, renderAll ...)를 그대로 참조해서 조작한다. (mapUI.js가
     getViewBox/renderCanvas를, restNode.js가 startStage를 재정의하는 것과
     동일한 "전역 함수 재정의" 패턴을 newGame()/applyDamageWithFeedback()에
     한해 사용한다.)
   - 이 파일은 반드시 script.js, mapSystem.js, mapNodeLogic.js, mapUI.js,
     restNode.js, hand-layout.js 이후에 로드되어야 한다. (index.html 참고)
   - 콘솔 전용 기능이며 플레이 화면/UI에는 어떤 치트 관련 문구도 노출하지 않는다.
   ========================================================================= */
(function initCheatConsole(){

  /* ── 7-3. 치트 활성화 조건 ─────────────────────────────────────────────── */
  let cheatEnabledFlag = false;
  try{
    cheatEnabledFlag =
      location.hostname === "localhost" ||
      location.search.includes("cheat=1") ||
      localStorage.getItem("cheatEnabled") === "1";
  }catch(err){
    cheatEnabledFlag = location.hostname === "localhost";
  }

  if(!cheatEnabledFlag){
    console.warn("[CHEAT] 치트 모드가 꺼져 있습니다. 주소에 ?cheat=1을 붙여주세요.");
    return;
  }

  /* ── 공통 유틸 ─────────────────────────────────────────────────────────── */
  function cheatWarn(msg){ console.warn("[CHEAT] " + msg); }
  function cheatLog(msg){ console.log("[CHEAT] " + msg); }
  function cheatClamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function safeToast(msg){ if(typeof toast === "function") toast(msg); }
  function cheatToast(type, msg){
    if(typeof window.showToast === "function"){ window.showToast(msg, type); return; }
    cheatWarn("전역 토스트 서비스가 초기화되지 않았습니다.");
  }
  function safeRenderAll(){ if(typeof renderAll === "function") renderAll(); }
  function safeRenderHud(){ if(typeof renderHud === "function") renderHud(); }

  function requireBattle(){
    if(typeof S === "undefined" || !S){ cheatWarn("현재 전투 중이 아닙니다."); return false; }
    return true;
  }

  function requireCard(id){
    if(typeof CARD_DB === "undefined" || !CARD_DB[id]){
      cheatWarn('존재하지 않는 주문 ID입니다. CHEAT.card.find("검색어")를 사용하세요.');
      return false;
    }
    return true;
  }

  function requirePositive(n){
    const v = Number(n);
    if(!Number.isFinite(v) || v <= 0){ cheatWarn("수량은 0보다 커야 합니다."); return false; }
    return true;
  }

  function resolveEnemyTargets(indexOrAll){
    if(indexOrAll === "all") return S.enemies.slice();
    const e = S.enemies[Number(indexOrAll)];
    return e ? [e] : [];
  }

  /* =========================================================================
     7-5. newGame 초기화 주의사항 – 2안: CHEAT_RUN_STATE 재적용
     새 전투(newGame)가 시작되면 STARTER_DECK/S.gold/S.relics/S.potions가
     초기화되므로, 치트로 준 값을 기록해두었다가 새 전투 시작 직후 다시 준다.
     ========================================================================= */
  const CHEAT_RUN_STATE = {
    goldDelta: 0,
    moonDelta: 0,
    relics: [],   // 치트로 지급한 유물 객체 (참조 유지 → take.relic에서 역추적)
    potions: [],  // 치트로 지급한 포션 객체
    deckAdds: []  // 치트로 STARTER_DECK에 추가한 주문 ID 목록
  };

  function cheatReapplyRunState(){
    if(typeof S === "undefined" || !S) return;
    if(CHEAT_RUN_STATE.goldDelta)  S.gold       = Math.max(0, (S.gold || 0) + CHEAT_RUN_STATE.goldDelta);
    if(CHEAT_RUN_STATE.moonDelta)  S.moonShards = Math.max(0, (S.moonShards || 0) + CHEAT_RUN_STATE.moonDelta);
    if(Array.isArray(S.relics))  CHEAT_RUN_STATE.relics.forEach(r => S.relics.push(r));
    if(Array.isArray(S.potions)) CHEAT_RUN_STATE.potions.forEach(p => S.potions.push(p));
    if(typeof STARTER_DECK !== "undefined" && CHEAT_RUN_STATE.deckAdds.length){
      CHEAT_RUN_STATE.deckAdds.forEach(id => STARTER_DECK.push(id));
    }
    safeRenderAll();
  }

  // newGame()을 감싸서(wrap) 실행 직후 CHEAT_RUN_STATE를 재적용한다.
  // 기존 newGame() 로직은 그대로 호출만 하므로 원본 동작은 변하지 않는다.
  if(typeof newGame === "function"){
    const ORIGINAL_NEW_GAME = newGame;
    newGame = function cheatWrappedNewGame(){
      ORIGINAL_NEW_GAME();
      cheatReapplyRunState();
    };
  }

  /* =========================================================================
     4-4. 공격력/피해량 변경 – applyDamageWithFeedback()을 감싸 플레이어
     "정화(공격) 주문"이 적에게 주는 최종 피해량만 보정한다.
     (block/heal/draw 등은 이 함수를 거치지 않으므로 영향받지 않는다.)
     ========================================================================= */
  const CHEAT_ATK_PLAYER = { add: 0, mul: 1, set: null };
  function cheatComputePlayerDamage(rawDamage){
    if(CHEAT_ATK_PLAYER.set !== null) return Math.max(0, CHEAT_ATK_PLAYER.set);
    return Math.max(0, Math.round(rawDamage * CHEAT_ATK_PLAYER.mul + CHEAT_ATK_PLAYER.add));
  }

  if(typeof applyDamageWithFeedback === "function" && typeof LIFE !== "undefined"){
    applyDamageWithFeedback = function cheatWrappedApplyDamage(target, rawDamage, attackerWeak){
      const dmg = (typeof S !== "undefined" && S && target !== S.player)
        ? cheatComputePlayerDamage(rawDamage)
        : rawDamage;
      const result = LIFE.applyDamage(target, dmg, attackerWeak);
      const sel = (typeof S !== "undefined" && S && target === S.player) ? '.player' : '[data-id="' + target.id + '"]';
      if(result.absorbed > 0) spawnFloat(sel, '-' + result.absorbed, 'blk');
      if(result.hpLoss   > 0) spawnFloat(sel, '-' + result.hpLoss,   'dmg');
      if(result.absorbed === 0 && result.hpLoss === 0) spawnFloat(sel, '0', 'blk');
    };
  }

  /* =========================================================================
     4-1. 특정 노드로 바로 이동
     ========================================================================= */
  function listAllNodes(){
    const out = [];
    if(typeof MAP_FLOORS === "undefined") return out;
    MAP_FLOORS.forEach((floor, fi) => floor.forEach((node, ni) => out.push({ node, fi, ni })));
    return out;
  }

  function normalizeNodeType(type){ return type === "normal" ? "enemy" : type; }

  function goToStage(stageIndex){
    if(typeof S !== "undefined" && S) S.rewardOpen = false;
    if(typeof closeRewardOverlay === "function") closeRewardOverlay();
    if(typeof startStage !== "function"){ cheatWarn("맵 시스템을 찾을 수 없습니다."); return; }
    startStage(stageIndex);
  }

  function cheatNodeGoto(floor, nodeIndex){
    const fi = Number(floor);
    const ni = nodeIndex === undefined ? 0 : Number(nodeIndex);
    const f = typeof MAP_FLOORS !== "undefined" ? MAP_FLOORS[fi] : null;
    const target = f ? f[ni] : null;
    if(!target || target.stageIndex === undefined){ cheatWarn("해당 조건에 맞는 노드를 찾지 못했습니다."); return; }
    goToStage(target.stageIndex);
  }

  function cheatNodeType(typeStr){
    const wanted = normalizeNodeType(typeStr);
    const found = listAllNodes().find(entry => entry.node.type === wanted && entry.node.stageIndex !== undefined);
    if(!found){ cheatWarn("해당 조건에 맞는 노드를 찾지 못했습니다."); return; }
    goToStage(found.node.stageIndex);
  }

  function cheatNodeLobby(){
    if(typeof window.MAP_STATE === "undefined"){ cheatWarn("맵 상태를 찾을 수 없습니다."); return; }
    window.MAP_STATE.currentStage = -1;
    window.MAP_STATE.startMapMode = true;
    window.MAP_STATE.proceedMode  = false;
    if(typeof updateHudFloor === "function") updateHudFloor();
    safeToast("신령의 은혜 상태로 이동");
  }

  function cheatNodeMap(){
    if(typeof openMap !== "function"){ cheatWarn("맵을 열 수 없습니다."); return; }
    openMap();
  }

  /* =========================================================================
     4-2. 몬스터/캐릭터 즉사
     ========================================================================= */
  function afterEnemyHpChange(){
    if(typeof autoSelectTarget === "function") autoSelectTarget();
    if(typeof livingEnemies === "function" && livingEnemies().length === 0 && typeof nodeClear === "function"){
      nodeClear();
    }
    safeRenderAll();
  }

  function cheatKillEnemy(indexOrAll){
    if(!requireBattle()) return;
    const targets = resolveEnemyTargets(indexOrAll);
    if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
    targets.forEach(e => { e.hp = 0; });
    afterEnemyHpChange();
  }

  function cheatKillPlayer(){
    if(!requireBattle()) return;
    S.player.hp = 0;
    safeRenderAll();
    if(typeof endGame === "function") endGame("lose");
  }

  /* =========================================================================
     4-3. 체력/정신력 변경
     ========================================================================= */
  function cheatHpPlayer(hp, maxHp){
    if(!requireBattle()) return;
    if(hp === undefined || !Number.isFinite(Number(hp))){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    if(maxHp !== undefined && Number.isFinite(Number(maxHp))){
      S.player.maxHp = Math.max(1, Math.floor(Number(maxHp)));
    }
    S.player.hp = cheatClamp(Math.floor(Number(hp)), 0, S.player.maxHp);
    safeRenderAll();
    if(S.player.hp <= 0 && typeof endGame === "function") endGame("lose");
  }

  function cheatHpEnemy(indexOrAll, hp){
    if(!requireBattle()) return;
    if(hp === undefined || !Number.isFinite(Number(hp))){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    const targets = resolveEnemyTargets(indexOrAll);
    if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
    targets.forEach(e => { e.hp = cheatClamp(Math.floor(Number(hp)), 0, e.maxHp); });
    afterEnemyHpChange();
  }

  /* =========================================================================
     4-4. 공격력/피해량 변경 (플레이어)
     ========================================================================= */
  function cheatAtkPlayerAdd(v){
    const n = Number(v);
    if(!Number.isFinite(n)){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    CHEAT_ATK_PLAYER.add = n; CHEAT_ATK_PLAYER.set = null;
    cheatLog("플레이어 공격 주문 피해량 보정 add=" + n);
  }
  function cheatAtkPlayerMul(v){
    const n = Number(v);
    if(!Number.isFinite(n) || n < 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    CHEAT_ATK_PLAYER.mul = n; CHEAT_ATK_PLAYER.set = null;
    cheatLog("플레이어 공격 주문 피해량 보정 mul=" + n);
  }
  function cheatAtkPlayerSet(v){
    const n = Number(v);
    if(!Number.isFinite(n) || n < 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    CHEAT_ATK_PLAYER.set = n;
    cheatLog("플레이어 공격 주문 피해량 고정값=" + n);
  }
  function cheatAtkPlayerReset(){
    CHEAT_ATK_PLAYER.add = 0; CHEAT_ATK_PLAYER.mul = 1; CHEAT_ATK_PLAYER.set = null;
    cheatLog("플레이어 공격력 치트 초기화");
  }

  function cheatAtkEnemyTarget(indexOrAll){
    return {
      set(value){
        if(!requireBattle()) return;
        const v = Number(value);
        if(!Number.isFinite(v) || v < 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
        const targets = resolveEnemyTargets(indexOrAll);
        if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
        targets.forEach(e => {
          (e.moves || []).forEach(mv => { if(mv.t === "attack") mv.v = v; });
          if(e.intent && e.intent.t === "attack") e.intent.v = v;
        });
        safeRenderAll();
      }
    };
  }

  /* =========================================================================
     4-5 / 4-6. 아이템·돈 획득/제거
     ========================================================================= */
  function cheatGiveGold(n){
    if(!requireBattle() || !requirePositive(n)) return;
    const v = Math.floor(Number(n));
    S.gold += v;
    CHEAT_RUN_STATE.goldDelta += v;
    safeRenderHud();
  }
  function cheatGiveMoon(n){
    console.warn("CHEAT.give.moon은 deprecated입니다. CHEAT.wallet.moon.add(amount)를 사용하세요.");
    cheatWalletMoonAdd(n);
  }
  function cheatTakeGold(n){
    if(!requireBattle() || !requirePositive(n)) return;
    const v = Math.min(Math.floor(Number(n)), S.gold);
    S.gold = Math.max(0, S.gold - v);
    CHEAT_RUN_STATE.goldDelta -= v;
    safeRenderHud();
  }
  function cheatTakeMoon(n){
    console.warn("CHEAT.take.moon은 deprecated입니다. CHEAT.wallet.moon.take(amount)를 사용하세요.");
    cheatWalletMoonTake(n);
  }

  /* =========================================================================
     BM 계정 달빛조각(wallet.moonShards) 치트
     - 전투 상태 S.moonShards는 절대 건드리지 않고, accountId 기준
       wallet.moonShards만 서버(local-mock-server.js `/wallet/cheat`)에 반영한다.
     - 서버 반영 후 window.VIBERUN_WALLET.setCachedWallet()을 호출해
       viberun:wallet-changed 이벤트를 발행, 메인/선물함/월영당 UI를 동기화한다.
     ========================================================================= */
  function requireLoggedInAccount(){
    const auth = window.VIBERUN_AUTH;
    const account = auth && typeof auth.getAccountInfo === "function" ? auth.getAccountInfo() : null;
    if(!account || !account.isLoggedIn){
      cheatWarn("로그인이 필요합니다. Guest/Google/Facebook 로그인 후 다시 시도하세요.");
      return null;
    }
    return account;
  }

  function requireFiniteAmount(n){
    const v = Number(n);
    if(!Number.isFinite(v)){ cheatWarn("수량은 숫자여야 합니다."); return null; }
    return v;
  }

  function requestWalletCheat(op, amount){
    const account = requireLoggedInAccount();
    if(!account) return Promise.resolve(null);

    const token = String(account.accessToken || "");
    const base = (window.VIBERUN_WALLET_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
    if(typeof fetch !== "function" || !token){
      cheatWarn("wallet 치트 API를 사용할 수 없는 환경입니다.");
      return Promise.resolve(null);
    }

    return fetch(base + "/wallet/cheat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ op, amount })
    }).then(response => response.text().then(text => {
      let body = {};
      try { body = text ? JSON.parse(text) : {}; } catch(error) { body = {}; }
      if(!response.ok || !body.ok || !body.wallet){
        cheatWarn("wallet 치트 요청이 실패했습니다: " + (body.message || response.statusText));
        return null;
      }
      if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
        window.VIBERUN_WALLET.setCachedWallet(body.wallet);
      }
      return body.wallet;
    })).catch(error => {
      cheatWarn("wallet 치트 요청 중 오류가 발생했습니다: " + error);
      return null;
    });
  }

  function cheatWalletMoonAdd(amount){
    const v = requireFiniteAmount(amount);
    if(v === null || v <= 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    const delta = Math.floor(v);
    requestWalletCheat("add", delta).then(wallet => {
      if(wallet) cheatLog("계정 달빛조각 " + delta + " 증가 → 현재 " + wallet.moonShards);
    });
  }

  function cheatWalletMoonTake(amount){
    const v = requireFiniteAmount(amount);
    if(v === null || v <= 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    const delta = Math.floor(v);
    requestWalletCheat("take", delta).then(wallet => {
      if(wallet) cheatLog("계정 달빛조각 " + delta + " 감소 → 현재 " + wallet.moonShards);
    });
  }

  function cheatWalletMoonSet(amount){
    const v = requireFiniteAmount(amount);
    if(v === null){ return; }
    const target = Math.max(0, Math.floor(v));
    requestWalletCheat("set", target).then(wallet => {
      if(wallet) cheatLog("계정 달빛조각을 " + target + "로 설정 → 현재 " + wallet.moonShards);
    });
  }

  function cheatWalletMoonGet(){
    const account = requireLoggedInAccount();
    if(!account) return;

    const cached = window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.getCachedWallet === "function"
      ? window.VIBERUN_WALLET.getCachedWallet()
      : null;
    if(cached){
      cheatLog("현재 계정 달빛조각: " + cached.moonShards);
      return;
    }

    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.fetchWallet === "function"){
      Promise.resolve(window.VIBERUN_WALLET.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet) cheatLog("현재 계정 달빛조각: " + result.wallet.moonShards);
        else cheatWarn("wallet 조회에 실패했습니다.");
      });
    }
  }

  function cheatGiveRelicRandom(){
    if(!requireBattle()) return;
    const relicDb = Array.isArray(window.RELIC_DB)
      ? window.RELIC_DB
      : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
    if(!relicDb.length){ cheatWarn("유물 데이터를 찾을 수 없습니다."); return; }
    const relic = { ...relicDb[Math.floor(Math.random() * relicDb.length)] };
    S.relics.push(relic);
    CHEAT_RUN_STATE.relics.push(relic);
    safeToast("법구 획득: " + relic.emoji + " " + relic.name);
    safeRenderHud();
  }
  function cheatGiveRelic(id){
    if(!requireBattle()) return;
    const relicDb = Array.isArray(window.RELIC_DB)
      ? window.RELIC_DB
      : (typeof RELIC_DB !== "undefined" ? RELIC_DB : []);
    const found = relicDb.find(r => r.id === id);
    if(!found){ cheatWarn("존재하지 않는 유물 ID입니다. CHEAT.give.relicRandom()으로 목록을 확인하세요."); return; }
    const relic = { ...found };
    S.relics.push(relic);
    CHEAT_RUN_STATE.relics.push(relic);
    safeToast("법구 획득: " + relic.emoji + " " + relic.name);
    safeRenderHud();
  }
  function cheatGivePotionObject(potion){
    if(!requireBattle()) return;
    if(S.potions.length >= 3){ cheatWarn("포션 슬롯이 가득 찼습니다. 기본 최대 3개입니다."); return; }
    S.potions.push(potion);
    CHEAT_RUN_STATE.potions.push(potion);
    safeToast("약병 획득: " + (potion.emoji || "🧪") + " " + potion.name);
    safeRenderHud();
  }
  function cheatGivePotion(id){
    const db = typeof window.POTION_DB !== "undefined" ? window.POTION_DB : [];
    const found = db.find(p => p.id === id);
    if(!found){ cheatWarn("존재하지 않는 약병 ID입니다. CHEAT.give.potionList()로 목록을 확인하세요."); return; }
    cheatGivePotionObject({ ...found });
  }

  function cheatRelicFind(query){
    const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : [];
    const q = String(query || "").toLowerCase();
    const results = db.filter(r => r.id.toLowerCase().includes(q) || (r.name && r.name.includes(query)))
      .map(r => ({ id: r.id, name: r.name }));
    console.table(results);
    return results;
  }
  function cheatRelicList(){
    const db = Array.isArray(window.RELIC_DB) ? window.RELIC_DB : [];
    const results = db.map(r => ({ id: r.id, name: r.name }));
    console.table(results);
    return results;
  }
  function cheatPotionFind(query){
    const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : [];
    const q = String(query || "").toLowerCase();
    const results = db.filter(p => p.id.toLowerCase().includes(q) || (p.name && p.name.includes(query)))
      .map(p => ({ id: p.id, name: p.name }));
    console.table(results);
    return results;
  }
  function cheatPotionList(){
    const db = Array.isArray(window.POTION_DB) ? window.POTION_DB : [];
    const results = db.map(p => ({ id: p.id, name: p.name }));
    console.table(results);
    return results;
  }

  function cheatTakeRelic(indexOrAll){
    if(!requireBattle()) return;
    if(indexOrAll === "all"){
      S.relics = [];
      CHEAT_RUN_STATE.relics = [];
      safeRenderHud();
      return;
    }
    const idx = Number(indexOrAll);
    if(!S.relics[idx]){ cheatWarn("해당 유물이 없습니다. 현재 보유 유물 수를 확인하세요."); return; }
    const [removed] = S.relics.splice(idx, 1);
    const ti = CHEAT_RUN_STATE.relics.indexOf(removed);
    if(ti >= 0) CHEAT_RUN_STATE.relics.splice(ti, 1);
    safeRenderHud();
  }
  function cheatTakePotion(indexOrAll){
    if(!requireBattle()) return;
    if(indexOrAll === "all"){
      S.potions = [];
      CHEAT_RUN_STATE.potions = [];
      safeRenderHud();
      return;
    }
    const idx = Number(indexOrAll);
    if(!S.potions[idx]){ cheatWarn("해당 포션이 없습니다. 현재 보유 포션 수를 확인하세요."); return; }
    const [removed] = S.potions.splice(idx, 1);
    const ti = CHEAT_RUN_STATE.potions.indexOf(removed);
    if(ti >= 0) CHEAT_RUN_STATE.potions.splice(ti, 1);
    safeRenderHud();
  }

  /* =========================================================================
     4-7. 상태이상 부여 및 제거
     ========================================================================= */
  const STATUS_ALIAS = { "동요": "weak", "불안": "anxiety", "무기력": "lethargy", "치유": "healingAura",
    weak: "weak", anxiety: "anxiety", lethargy: "lethargy", healingAura: "healingAura" };

  function resolveStatusKey(name){ return STATUS_ALIAS[name] || null; }

  function applyStatusAdd(unit, key, value){
    if(!unit || !key){ cheatWarn("알 수 없는 상태이상입니다. (동요/불안/무기력/치유)"); return; }
    if(!Number.isFinite(value) || value <= 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    if(key === "weak") LIFE.addWeak(unit, value);
    else if(key === "anxiety") LIFE.addAnxiety(unit, value);
    else if(key === "lethargy") LIFE.addLethargy(unit, value);
    else if(key === "healingAura") unit.healingAura = (unit.healingAura || 0) + value;
  }
  function applyStatusRemove(unit, key, value){
    if(!unit || !key){ cheatWarn("알 수 없는 상태이상입니다. (동요/불안/무기력/치유)"); return; }
    if(!Number.isFinite(value) || value <= 0){ cheatWarn("수량은 0보다 커야 합니다."); return; }
    if(key === "weak") LIFE.reduceWeak(unit, value);
    else if(key === "anxiety") LIFE.reduceAnxiety(unit, value);
    else if(key === "lethargy") LIFE.reduceLethargy(unit, value);
    else if(key === "healingAura") unit.healingAura = Math.max(0, (unit.healingAura || 0) - value);
  }
  function clearStatus(unit){
    if(!unit) return;
    unit.weak = 0; unit.anxiety = 0; unit.lethargy = 0;
  }

  function cheatStatusAdd(target, a, b, c){
    if(!requireBattle()) return;
    if(target === "player"){
      applyStatusAdd(S.player, resolveStatusKey(a), Number(b));
    } else if(target === "enemy"){
      const targets = resolveEnemyTargets(a);
      if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
      targets.forEach(e => applyStatusAdd(e, resolveStatusKey(b), Number(c)));
    } else {
      cheatWarn('대상은 "player" 또는 "enemy"여야 합니다.');
      return;
    }
    safeRenderAll();
  }

  function cheatStatusRemove(target, a, b, c){
    if(!requireBattle()) return;
    if(target === "player"){
      applyStatusRemove(S.player, resolveStatusKey(a), Number(b));
    } else if(target === "enemy"){
      const targets = resolveEnemyTargets(a);
      if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
      targets.forEach(e => applyStatusRemove(e, resolveStatusKey(b), Number(c)));
    } else {
      cheatWarn('대상은 "player" 또는 "enemy"여야 합니다.');
      return;
    }
    safeRenderAll();
  }

  function cheatStatusClear(target, indexOrAll){
    if(!requireBattle()) return;
    if(target === "player"){
      clearStatus(S.player);
    } else if(target === "enemy"){
      const targets = resolveEnemyTargets(indexOrAll === undefined ? "all" : indexOrAll);
      if(!targets.length){ cheatWarn("해당 몬스터가 없습니다. 현재 몬스터 수를 확인하세요."); return; }
      targets.forEach(clearStatus);
    } else {
      cheatWarn('대상은 "player" 또는 "enemy"여야 합니다.');
      return;
    }
    safeRenderAll();
  }

  /* =========================================================================
     4-8 / 4-9. 주문 불러오기 / 제거하기
     ========================================================================= */
  function cardZone(location){
    if(location === "hand") return S.hand;
    if(location === "draw") return S.draw;
    if(location === "discard") return S.discard;
    if(location === "deck") return STARTER_DECK;
    return null;
  }

  function warnIfDeckEmpty(){
    if(!S) return;
    const total = (S.hand?.length || 0) + (S.draw?.length || 0) + (S.discard?.length || 0) +
      (typeof STARTER_DECK !== "undefined" ? STARTER_DECK.length : 0);
    if(total === 0) cheatWarn("덱이 비어 전투가 멈출 수 있습니다.");
  }

  function trackDeckRemoval(id, count){
    for(let i = 0; i < count; i++){
      const idx = CHEAT_RUN_STATE.deckAdds.indexOf(id);
      if(idx >= 0) CHEAT_RUN_STATE.deckAdds.splice(idx, 1);
    }
  }

  function cheatCardHand(id, count){
    if(!requireBattle() || !requireCard(id)) return;
    const n = count === undefined ? 1 : Number(count);
    if(!requirePositive(n)) return;
    for(let i = 0; i < n; i++) S.hand.push(id);
    safeRenderAll();
  }
  function cheatCardDeck(id, count){
    if(!requireBattle() || !requireCard(id)) return;
    const n = count === undefined ? 1 : Number(count);
    if(!requirePositive(n)) return;
    for(let i = 0; i < n; i++){ STARTER_DECK.push(id); CHEAT_RUN_STATE.deckAdds.push(id); }
    safeRenderHud();
  }
  function cheatCardDraw(id, count){
    if(!requireBattle() || !requireCard(id)) return;
    const n = count === undefined ? 1 : Number(count);
    if(!requirePositive(n)) return;
    for(let i = 0; i < n; i++) S.draw.push(id);
    safeRenderAll();
  }
  function cheatCardDiscard(id, count){
    if(!requireBattle() || !requireCard(id)) return;
    const n = count === undefined ? 1 : Number(count);
    if(!requirePositive(n)) return;
    for(let i = 0; i < n; i++) S.discard.push(id);
    safeRenderAll();
  }

  function cheatCardFind(query){
    if(typeof CARD_DB === "undefined") return [];
    const q = String(query || "").toLowerCase();
    const results = Object.keys(CARD_DB).filter(key => {
      const c = CARD_DB[key];
      return key.toLowerCase().includes(q) || (c.name && c.name.includes(query));
    }).map(key => ({ id: key, name: CARD_DB[key].name }));
    console.table(results);
    return results;
  }
  function cheatCardList(){
    if(typeof CARD_DB === "undefined") return [];
    const ids = Object.keys(CARD_DB);
    console.log(ids);
    return ids;
  }

  function cheatCardRemove(id, location, count){
    if(!requireBattle() || !requireCard(id)) return;
    const n = count === undefined ? 1 : Number(count);
    if(!requirePositive(n)) return;

    function removeFromArray(arr, want){
      let removed = 0;
      for(let i = arr.length - 1; i >= 0 && removed < want; i--){
        if(arr[i] === id){ arr.splice(i, 1); removed++; }
      }
      return removed;
    }

    if(location === undefined){
      let remaining = n;
      remaining -= removeFromArray(S.hand, remaining);
      remaining -= removeFromArray(S.draw, remaining);
      remaining -= removeFromArray(S.discard, remaining);
      const removedFromDeck = removeFromArray(STARTER_DECK, remaining);
      if(removedFromDeck) trackDeckRemoval(id, removedFromDeck);
    } else {
      const zone = cardZone(location);
      if(!zone){ cheatWarn("올바른 위치를 지정하세요: hand/draw/discard/deck"); return; }
      const removed = removeFromArray(zone, n);
      if(location === "deck" && removed) trackDeckRemoval(id, removed);
    }
    safeRenderAll(); safeRenderHud();
    warnIfDeckEmpty();
  }

  function cheatCardRemoveAll(id){
    if(!requireBattle() || !requireCard(id)) return;
    function purgeAll(arr){
      let removed = 0;
      for(let i = arr.length - 1; i >= 0; i--){
        if(arr[i] === id){ arr.splice(i, 1); removed++; }
      }
      return removed;
    }
    purgeAll(S.hand); purgeAll(S.draw); purgeAll(S.discard);
    const removedFromDeck = purgeAll(STARTER_DECK);
    if(removedFromDeck) trackDeckRemoval(id, removedFromDeck);
    safeRenderAll(); safeRenderHud();
    warnIfDeckEmpty();
  }

  function cheatCardClear(zone){
    if(!requireBattle()) return;
    if(zone === "hand"){
      const had = S.hand.length;
      S.hand = [];
      if(had > 0) cheatWarn("손패를 모두 비웠습니다. 전투가 멈출 수 있습니다.");
    } else if(zone === "status"){
      function purgeStatus(arr){
        for(let i = arr.length - 1; i >= 0; i--){
          const c = CARD_DB[arr[i]];
          if(c && c.rarity === "status") arr.splice(i, 1);
        }
      }
      purgeStatus(S.hand); purgeStatus(S.draw); purgeStatus(S.discard); purgeStatus(STARTER_DECK);
    } else {
      cheatWarn('제거할 대상을 지정하세요: "hand" 또는 "status"');
      return;
    }
    safeRenderAll(); safeRenderHud();
    warnIfDeckEmpty();
  }

  /* =========================================================================
     현재 상태 출력 / 전투·런 초기화
     ========================================================================= */
  function cheatDumpState(){ console.log("[CHEAT] state:", S); return S; }
  function cheatDumpCards(){
    if(!requireBattle()) return;
    const info = {
      hand: S.hand.slice(), draw: S.draw.slice(), discard: S.discard.slice(),
      deck: typeof STARTER_DECK !== "undefined" ? STARTER_DECK.slice() : []
    };
    console.log("[CHEAT] cards:", info);
    return info;
  }
  function cheatDumpEnemies(){
    if(!requireBattle()) return;
    const rows = S.enemies.map(e => ({
      id: e.id, name: e.name, hp: e.hp, maxHp: e.maxHp, block: e.block,
      weak: e.weak, anxiety: e.anxiety, lethargy: e.lethargy,
      intent: e.intent ? e.intent.t + " " + (e.intent.v ?? "") : "-"
    }));
    console.table(rows);
    return rows;
  }

  function cheatResetBattle(){
    if(!requireBattle()) return;
    if(typeof newGame === "function") newGame();
  }
  function cheatResetRun(){
    CHEAT_RUN_STATE.goldDelta = 0; CHEAT_RUN_STATE.moonDelta = 0;
    CHEAT_RUN_STATE.relics = []; CHEAT_RUN_STATE.potions = []; CHEAT_RUN_STATE.deckAdds = [];
    if(typeof generateMap === "function") generateMap();
    if(window.MAP_STATE){
      window.MAP_STATE.currentStage = 0;
      window.MAP_STATE.proceedMode  = false;
      window.MAP_STATE.startMapMode = false;
    }
    if(typeof loadStageMonsters === "function") loadStageMonsters(0);
    if(typeof closeMap === "function") closeMap();
    if(typeof newGame === "function") newGame();
    cheatLog("런이 초기화되었습니다.");
  }

  /* ── CHEAT.help() ─────────────────────────────────────────────────────── */
  function cheatHelp(){
    console.log(
      "%c[CHEAT] 사용 가능한 명령어",
      "font-weight:bold;font-size:13px;"
    );
    console.log([
      "── 기획자용 필수 명령어 10개 ──",
      "CHEAT.node.boss()                              보스전으로 이동",
      "CHEAT.node.goto(10)                             10층으로 이동",
      'CHEAT.node.type("shop")                         상점 노드로 이동',
      'CHEAT.node.type("rest")                         휴식 노드로 이동',
      'CHEAT.kill.enemy("all")                         모든 몬스터 즉사',
      "CHEAT.kill.player()                             플레이어 즉사",
      "CHEAT.hp.player(999, 999)                       체력/정신력 최대로",
      "CHEAT.give.gold(999)                            골드 999 획득",
      'CHEAT.card.hand("soul_passing", 1)              손패에 주문 추가',
      'CHEAT.give.relic("bronze_incense_burner")       실전 법구 지급 (CHEAT.give.relicList()로 목록 확인)',
      'CHEAT.give.potion("cheongsim_pill")             실전 약병 지급 (CHEAT.give.potionList()로 목록 확인)',
      'CHEAT.status.clear("player")                    플레이어 상태이상 제거',
      'CHEAT.toast.success("성공 테스트")                전역 토스트 레이어 테스트',
      "",
      "── 그룹 목록 ──",
      "CHEAT.node   맵 노드 이동 (goto/type/boss/lobby/map)",
      "CHEAT.kill   몬스터/플레이어 즉사 (enemy/player)",
      "CHEAT.hp     체력/정신력 변경 (player/enemy)",
      "CHEAT.atk    공격력/피해량 변경 (player.add|mul|set|reset, enemy(i).set)",
      "CHEAT.give   돈/아이템 획득 (gold/moon[deprecated]/relicRandom/relic/relicFind/relicList/potion/potionFind/potionList)",
      "CHEAT.take   돈/아이템 제거 (gold/moon[deprecated]/relic/potion)",
      "CHEAT.status 상태이상 부여/제거 (add/remove/clear)",
      "CHEAT.card   주문 추가/제거/검색 (hand/deck/draw/discard/find/list/remove/removeAll/clear)",
      "CHEAT.dump   현재 상태 출력 (state/cards/enemies)",
      "CHEAT.reset  전투/런 초기화 (battle/run)",
      "CHEAT.toast  전역 토스트 레이어 노출 테스트 (info/success/warning/error)",
      "",
      "── BM 계정 달빛조각 치트 ──",
      "CHEAT.wallet.moon.add(1000)  // 계정 달빛조각 1000개 추가",
      "CHEAT.wallet.moon.take(100)  // 계정 달빛조각 100개 차감",
      "CHEAT.wallet.moon.set(5000)  // 계정 달빛조각 5000개로 설정",
      "CHEAT.wallet.moon.get()      // 현재 계정 달빛조각 확인",
      "",
      "※ CHEAT.give.moon / CHEAT.take.moon은 deprecated입니다. 위 CHEAT.wallet.moon.* 을 사용하세요."
    ].join("\n"));
  }

  /* ── window.CHEAT 등록 ────────────────────────────────────────────────── */
  window.CHEAT = {
    help: cheatHelp,
    node: {
      goto: cheatNodeGoto,
      type: cheatNodeType,
      boss: () => cheatNodeType("boss"),
      lobby: cheatNodeLobby,
      map: cheatNodeMap
    },
    kill: {
      enemy: cheatKillEnemy,
      player: cheatKillPlayer
    },
    hp: {
      player: cheatHpPlayer,
      enemy: cheatHpEnemy
    },
    atk: {
      player: {
        add: cheatAtkPlayerAdd,
        mul: cheatAtkPlayerMul,
        set: cheatAtkPlayerSet,
        reset: cheatAtkPlayerReset
      },
      enemy: cheatAtkEnemyTarget
    },
    give: {
      gold: cheatGiveGold,
      moon: cheatGiveMoon,
      relicRandom: cheatGiveRelicRandom,
      relic: cheatGiveRelic,
      relicFind: cheatRelicFind,
      relicList: cheatRelicList,
      potion: cheatGivePotion,
      potionFind: cheatPotionFind,
      potionList: cheatPotionList
    },
    take: {
      gold: cheatTakeGold,
      moon: cheatTakeMoon,
      relic: cheatTakeRelic,
      potion: cheatTakePotion
    },
    wallet: {
      moon: {
        add: cheatWalletMoonAdd,
        take: cheatWalletMoonTake,
        set: cheatWalletMoonSet,
        get: cheatWalletMoonGet
      }
    },
    status: {
      add: cheatStatusAdd,
      remove: cheatStatusRemove,
      clear: cheatStatusClear
    },
    card: {
      hand: cheatCardHand,
      deck: cheatCardDeck,
      draw: cheatCardDraw,
      discard: cheatCardDiscard,
      find: cheatCardFind,
      list: cheatCardList,
      remove: cheatCardRemove,
      removeAll: cheatCardRemoveAll,
      clear: cheatCardClear
    },
    dump: {
      state: cheatDumpState,
      cards: cheatDumpCards,
      enemies: cheatDumpEnemies
    },
    reset: {
      battle: cheatResetBattle,
      run: cheatResetRun
    },
    toast: {
      info: (msg) => cheatToast("info", msg || "안내 테스트"),
      success: (msg) => cheatToast("success", msg || "성공 테스트"),
      warning: (msg) => cheatToast("warning", msg || "경고 테스트"),
      error: (msg) => cheatToast("error", msg || "오류 테스트")
    }
  };

  console.log("[CHEAT] 치트 모드가 활성화되었습니다. CHEAT.help()로 사용법을 확인하세요.");
})();
