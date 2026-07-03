"use strict";
/* =========================================================================
   몬스터 소환 치트 (cheatMonster.js)
   기획서: 몬스터 소환 치트 구현 기획서

   - script.js / monsterData.js / encounterPackages.js / lifeSystem.js 등
     기존 파일은 전혀 수정하지 않는다.
   - cheatConsole.js도 수정하지 않는다. cheatConsole.js가 만들어 둔
     window.CHEAT 객체에 monster 그룹만 "추가"하고, CHEAT.help()는
     원본을 감싸서(wrap) 안내 문구만 덧붙인다. (cheatConsole.js가
     newGame()/applyDamageWithFeedback()을 감싸는 것과 동일한 패턴)
   - 반드시 cheatConsole.js 이후, 그리고 monsterData.js/encounterPackages.js/
     script.js 이후에 로드되어야 한다. (index.html 참고)
   - 콘솔 전용 기능이며 플레이 화면/UI에는 어떤 치트 관련 문구도 노출하지 않는다.
   ========================================================================= */
(function initCheatMonster(){

  // cheatConsole.js가 치트 비활성화 조건이라 window.CHEAT을 만들지 않았다면
  // 이 파일도 아무것도 하지 않는다. (cheatConsole.js의 활성화 판단을 그대로 따름)
  if(!window.CHEAT){
    return;
  }

  /* ── 공통 유틸 (cheatConsole.js는 자체 IIFE라 내부 함수를 재사용할 수
     없으므로, 이 파일에서 필요한 만큼만 동일한 규칙으로 다시 둔다) ──────── */
  function mWarn(msg){ console.warn("[CHEAT] " + msg); }
  function mLog(msg){ console.log("[CHEAT] " + msg); }
  function mClamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
  function mSafeRenderAll(){ if(typeof renderAll === "function") renderAll(); }
  function mSafeToast(msg){ if(typeof toast === "function") toast(msg); }
  function mRequireBattle(){
    if(typeof S === "undefined" || !S){ mWarn("현재 전투 중이 아닙니다."); return false; }
    return true;
  }

  const CHEAT_MAX_FIELD_ENEMIES = 4;
  let CHEAT_MONSTER_UID = 1;

  /* 몬스터 데이터 API(BOHYUN_COMBAT_DATA)를 안전하게 가져온다. */
  function getMonsterDataApi(){
    const d = window.BOHYUN_COMBAT_DATA;
    if(!d || typeof d.getMonsterById !== "function"){
      mWarn("몬스터 데이터를 찾을 수 없습니다. monsterData.js 로드 순서를 확인하세요.");
      return null;
    }
    return d;
  }

  /* moves 배열을 얕은 복사해 원본 정의가 오염되지 않게 한다. */
  function cloneMonsterDefForCheat(def){
    return {
      ...def,
      moves: Array.isArray(def.moves) ? def.moves.map(move => ({ ...move })) : []
    };
  }

  /* 같은 몬스터를 여러 번 소환해도 id가 겹치지 않도록 전투용 ID를 만든다. */
  function makeCheatMonsterRuntimeId(baseId){
    const safeBaseId = String(baseId || "monster").replace(/[^\w-]/g, "_");
    let runtimeId;
    do {
      runtimeId = `${safeBaseId}_cheat_${CHEAT_MONSTER_UID++}`;
    } while(typeof S !== "undefined" && S && Array.isArray(S.enemies) && S.enemies.some(e => e.id === runtimeId));
    return runtimeId;
  }

  /* 죽은 몬스터(hp<=0)를 전장에서 제거해 소환 공간을 확보한다. */
  function cheatMonsterClearDead(silent){
    if(!mRequireBattle()) return [];
    const before = S.enemies.length;
    S.enemies = S.enemies.filter(e => e && e.hp > 0);
    const removed = before - S.enemies.length;
    if(typeof autoSelectTarget === "function") autoSelectTarget();
    mSafeRenderAll();
    if(!silent) mLog(`죽은 몬스터 ${removed}마리를 정리했습니다.`);
    return S.enemies;
  }

  /* 몬스터 정의를 LIFE.createMonster() 규격의 실제 전투 객체로 변환한다. */
  function createCheatMonster(def, options){
    const opts = options || {};
    const runtimeDef = cloneMonsterDefForCheat(def);
    const originalId = runtimeDef.id;

    runtimeDef.id = makeCheatMonsterRuntimeId(originalId);
    if(opts.keepName !== true){
      runtimeDef.name = `${runtimeDef.name} ※소환`;
    }

    const nextSpawnIndex = Math.max(
      -1,
      ...S.enemies.map(e => Number.isFinite(e.spawnIndex) ? e.spawnIndex : -1)
    ) + 1;

    const enemy = LIFE.createMonster(runtimeDef, nextSpawnIndex);
    enemy.catalogId = originalId;       // 원본 몬스터 ID 보존 (디버깅/clearSummoned용)
    enemy.isCheatSpawned = true;        // 치트 소환 표시 (기존 몬스터와 구분)
    enemy.spawnIndex = nextSpawnIndex;

    if(Number.isFinite(Number(opts.maxHp))){
      enemy.maxHp = Math.max(1, Math.floor(Number(opts.maxHp)));
      enemy.hp = Math.min(enemy.hp, enemy.maxHp);
    }
    if(Number.isFinite(Number(opts.hp))){
      enemy.hp = mClamp(Math.floor(Number(opts.hp)), 0, enemy.maxHp);
    }
    if(Number.isFinite(Number(opts.block))){
      enemy.block = Math.max(0, Math.floor(Number(opts.block)));
    }
    if(Number.isInteger(Number(opts.intentIndex))){
      const intentIndex = Number(opts.intentIndex);
      if(enemy.moves[intentIndex]) enemy.intent = enemy.moves[intentIndex];
    }

    return enemy;
  }

  /* 몬스터 정의 배열을 현재 전장(S.enemies)에 추가한다. */
  function spawnCheatMonsterDefs(defs, options){
    if(!mRequireBattle()) return [];
    const opts = options || {};
    const inputDefs = Array.isArray(defs) ? defs.filter(Boolean) : [];
    if(!inputDefs.length){
      mWarn("소환할 몬스터가 없습니다.");
      return [];
    }

    if(opts.replace === true){
      S.enemies = [];
      S.selectedId = null;
    } else if(opts.keepDead !== true){
      cheatMonsterClearDead(true);
    }

    const maxOnField = Number.isFinite(Number(opts.maxOnField))
      ? Math.max(1, Math.floor(Number(opts.maxOnField)))
      : CHEAT_MAX_FIELD_ENEMIES;

    let spawnableCount = inputDefs.length;
    if(opts.allowOverLimit !== true){
      const remainSlots = Math.max(0, maxOnField - S.enemies.length);
      spawnableCount = Math.min(spawnableCount, remainSlots);
      if(spawnableCount < inputDefs.length){
        mWarn(`전장 최대 ${maxOnField}마리 제한으로 ${spawnableCount}마리만 소환합니다.`);
      }
    }

    if(spawnableCount <= 0){
      mWarn("전장에 소환 가능한 빈 자리가 없습니다. CHEAT.monster.clearDead() 후 다시 시도하세요.");
      return [];
    }

    const spawned = inputDefs.slice(0, spawnableCount).map(def => createCheatMonster(def, opts));
    S.enemies.push(...spawned);

    if(typeof autoSelectTarget === "function") autoSelectTarget();
    if(!S.selectedId && spawned[0]) S.selectedId = spawned[0].id;

    mSafeRenderAll();
    mSafeToast(`${spawned.length}마리 소환`);
    console.table(spawned.map(e => ({
      runtimeId: e.id,
      originalId: e.catalogId,
      name: e.name,
      hp: e.hp,
      maxHp: e.maxHp,
      intent: e.intent ? `${e.intent.t} ${e.intent.v ?? ""}` : "-"
    })));
    return spawned;
  }

  /* CHEAT.monster.spawn("child_spirit_lost", 2, { hp: 1 }) */
  function cheatMonsterSpawn(monsterId, count, options){
    if(!mRequireBattle()) return [];
    const d = getMonsterDataApi();
    if(!d) return [];
    const def = d.getMonsterById(monsterId);
    if(!def){
      mWarn(`존재하지 않는 몬스터 ID입니다: ${monsterId}`);
      mWarn('CHEAT.monster.list("검색어")로 몬스터 ID를 확인하세요.');
      return [];
    }
    const n = count === undefined ? 1 : Number(count);
    if(!Number.isFinite(n) || n <= 0){
      mWarn("소환 수량은 1 이상이어야 합니다.");
      return [];
    }
    const defs = Array.from({ length: Math.floor(n) }, () => def);
    return spawnCheatMonsterDefs(defs, options);
  }

  /* CHEAT.monster.spawnPackage("HN01", true) */
  function cheatMonsterSpawnPackage(packageId, replaceCurrent){
    if(!mRequireBattle()) return [];
    const d = getMonsterDataApi();
    if(!d) return [];
    const packages = window.ACT1_ENCOUNTER_PACKAGES || [];
    const pkg = packages.find(p => p.id === packageId);
    if(!pkg){
      mWarn(`존재하지 않는 패키지 ID입니다: ${packageId}`);
      mWarn("CHEAT.monster.packages()로 패키지 ID를 확인하세요.");
      return [];
    }
    const defs = pkg.monsterIds.map(id => d.getMonsterById(id)).filter(Boolean);
    return spawnCheatMonsterDefs(defs, { replace: replaceCurrent === true });
  }

  /* CHEAT.monster.list() / CHEAT.monster.list("아이") */
  function cheatMonsterList(query){
    const d = getMonsterDataApi();
    if(!d) return [];
    const q = String(query || "").toLowerCase();
    const rows = Object.values(d.monsterCatalog || {})
      .filter(m => {
        if(!q) return true;
        return String(m.id || "").toLowerCase().includes(q)
          || String(m.name || "").toLowerCase().includes(q)
          || String(m.grade || "").toLowerCase().includes(q)
          || String(m.family || "").toLowerCase().includes(q);
      })
      .map(m => ({
        id: m.id, name: m.name, grade: m.grade, family: m.family,
        maxHp: m.maxHp, moves: Array.isArray(m.moves) ? m.moves.length : 0
      }));
    console.table(rows);
    return rows;
  }

  /* CHEAT.monster.packages() / CHEAT.monster.packages("HN01") */
  function cheatMonsterPackages(query){
    const q = String(query || "").toLowerCase();
    const packages = window.ACT1_ENCOUNTER_PACKAGES || [];
    const rows = packages
      .filter(p => {
        if(!q) return true;
        return String(p.id || "").toLowerCase().includes(q)
          || String(p.name || "").toLowerCase().includes(q)
          || String(p.nodeType || "").toLowerCase().includes(q)
          || String(p.grade || "").toLowerCase().includes(q);
      })
      .map(p => ({
        id: p.id, name: p.name, nodeType: p.nodeType, grade: p.grade,
        size: Array.isArray(p.monsterIds) ? p.monsterIds.length : p.size,
        monsterIds: Array.isArray(p.monsterIds) ? p.monsterIds.join(", ") : "-"
      }));
    console.table(rows);
    return rows;
  }

  /* CHEAT.monster.clearSummoned() – 치트로 소환한 몬스터만 제거 (스테이지 몬스터는 유지) */
  function cheatMonsterClearSummoned(){
    if(!mRequireBattle()) return [];
    const before = S.enemies.length;
    S.enemies = S.enemies.filter(e => !e.isCheatSpawned);
    const removed = before - S.enemies.length;
    if(typeof autoSelectTarget === "function") autoSelectTarget();
    mSafeRenderAll();
    mLog(`치트 소환 몬스터 ${removed}마리를 제거했습니다.`);
    return S.enemies;
  }

  /* ── window.CHEAT.monster 등록 (기존 그룹은 그대로 둔 채 추가만 한다) ──── */
  window.CHEAT.monster = {
    spawn: cheatMonsterSpawn,
    spawnPackage: cheatMonsterSpawnPackage,
    list: cheatMonsterList,
    packages: cheatMonsterPackages,
    clearDead: cheatMonsterClearDead,
    clearSummoned: cheatMonsterClearSummoned
  };

  /* ── CHEAT.help() 확장: 원본 help()를 감싸서 안내 문구만 덧붙인다 ──────── */
  if(typeof window.CHEAT.help === "function"){
    const ORIGINAL_HELP = window.CHEAT.help;
    window.CHEAT.help = function cheatWrappedHelp(){
      ORIGINAL_HELP();
      console.log([
        "",
        "── CHEAT.monster (몬스터 소환 / 패키지 교체 / 목록 검색) ──",
        'CHEAT.monster.spawn("child_spirit_lost")            몬스터 1마리 소환',
        'CHEAT.monster.spawn("child_spirit_lost", 2)         몬스터 2마리 소환',
        'CHEAT.monster.spawn("child_spirit_lost", 1, {hp:1}) 체력 1로 소환',
        'CHEAT.monster.spawnPackage("HN01", true)            현재 적을 HN01 패키지로 교체',
        'CHEAT.monster.list("아이")                          몬스터 ID 검색',
        "CHEAT.monster.packages()                            전투 패키지 목록 출력",
        "CHEAT.monster.clearDead()                           죽은 몬스터 정리",
        "CHEAT.monster.clearSummoned()                       치트로 소환한 몬스터만 제거"
      ].join("\n"));
    };
  }

  console.log("[CHEAT] 몬스터 소환 치트(CHEAT.monster)가 등록되었습니다.");
})();
