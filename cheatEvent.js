"use strict";
/* =========================================================================
   이벤트 노드 진입 치트 (cheatEvent.js)
   기획서: 이벤트 데이터 입력 1차 개발 지시서 - 다음 단계 안내 21번

   - eventData.js / eventNode.js / cheatConsole.js는 전혀 수정하지 않는다.
   - cheatConsole.js가 만들어 둔 window.CHEAT 객체에 event 그룹만 "추가"하고,
     CHEAT.help()는 원본을 감싸서(wrap) 안내 문구만 덧붙인다.
     (cheatMonster.js와 동일한 패턴)
   - 반드시 cheatConsole.js, eventNode.js 이후에 로드되어야 한다.
   - 이벤트 노드는 아직 맵에서 딤드 해제되지 않았으므로, 이 치트로만
     이벤트 화면에 진입할 수 있다.
   ========================================================================= */
(function initCheatEvent(){

  if(!window.CHEAT){
    return;
  }

  function eWarn(msg){ console.warn("[CHEAT] " + msg); }
  function eLog(msg){ console.log("[CHEAT] " + msg); }

  function findEventByArg(arg){
    const db = window.EVENT_DB || [];
    if(typeof arg === "string" && !/^\d+$/.test(arg)){
      return db.find(e => e.id === arg) || null;
    }
    const num = Number(arg);
    if(!Number.isFinite(num)) return null;
    return db.find(e => {
      const m = /^event_(\d+)_/.exec(e.id);
      return m && Number(m[1]) === num;
    }) || null;
  }

  function cheatEventOpen(numberOrId){
    if(typeof window.EVENT_NODE_OPEN !== "function"){
      eWarn("eventNode.js가 로드되지 않았습니다.");
      return;
    }
    const ev = findEventByArg(numberOrId);
    if(!ev){
      eWarn("이벤트를 찾을 수 없습니다: " + numberOrId + " (CHEAT.event.list()로 확인)");
      return;
    }
    window.EVENT_NODE_OPEN(ev.id);
    eLog("이벤트 화면 열림: " + ev.id);
  }

  function cheatEventClose(){
    if(typeof finishEventNode === "function") finishEventNode();
    else eWarn("eventNode.js가 로드되지 않았습니다.");
  }

  function cheatEventList(){
    const db = window.EVENT_DB || [];
    if(!db.length){ eWarn("EVENT_DB가 비어 있습니다."); return db; }
    console.table(db.map(e => ({ id: e.id, title: e.title, choices: (e.choices || []).length })));
    return db.map(e => e.id);
  }

  window.CHEAT.event = {
    open: cheatEventOpen,
    close: cheatEventClose,
    list: cheatEventList
  };

  if(typeof window.CHEAT.help === "function"){
    const ORIGINAL_HELP = window.CHEAT.help;
    window.CHEAT.help = function cheatWrappedHelpEvent(){
      ORIGINAL_HELP();
      console.log([
        "",
        "── CHEAT.event (이벤트 노드 화면 진입 / 종료 / 목록) ──",
        "CHEAT.event.open(1)      이벤트 1 화면 열기",
        "CHEAT.event.open(10)     이벤트 10 화면 열기",
        "CHEAT.event.open(16)     이벤트 16 화면 열기",
        "CHEAT.event.close()      이벤트 화면 강제로 닫고 맵으로 복귀",
        "CHEAT.event.list()       현재 로드된 이벤트 목록 출력"
      ].join("\n"));
    };
  }

  console.log("[CHEAT] 이벤트 진입 치트(CHEAT.event)가 등록되었습니다.");
  if(window.VIBERUN_DEBUG && typeof window.VIBERUN_DEBUG.guardCheatTree === "function"){
    window.VIBERUN_DEBUG.guardCheatTree(window.CHEAT, "CHEAT");
  }
})();
