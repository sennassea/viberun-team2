"use strict";
/* =========================================================================
   Run Records 로직 (runRecord.js)
   - 완료된 런 기록을 localStorage에 저장/조회한다.
   - 화면 렌더링(기록 목록/상세 오버레이, 스타일)은 runRecordUI.js로 분리
     되어 있으며 이 파일은 순수 저장/조회 로직만 담당한다.
   ========================================================================= */

const RUN_RECORD_KEY = "viberunRunRecords";
const RUN_RECORD_MAX = 20;

function saveCompletedRunRecord(result){
  if(!S || S.recordSaved) return;
  const completed = result === "lose" || (result === "win" && typeof hasNextTier === "function" && !hasNextTier());
  if(!completed) return;

  S.recordSaved = true;
  if(typeof localStorage === "undefined") return;

  try {
    const records = readRunRecords();
    /* endGame()이 이 함수 직후 RUN_RESULT_UI.open()을 호출해 같은 스냅샷을 다시
       만들기 전이므로, RUN_STATE가 아직 살아있는 지금 시점에 여정 요약/상세용
       스냅샷을 함께 저장해 기록 클릭 시 오버레이로 재사용한다. */
    const snapshot = typeof buildRunResultSnapshot === "function" ? buildRunResultSnapshot(result) : null;
    records.unshift({
      id: Date.now(),
      result,
      floor: getRunRecordFloor(),
      turn: S.turn || 1,
      createdAt: new Date().toISOString(),
      snapshot
    });
    // 최근 20개까지만 보관한다.
    localStorage.setItem(RUN_RECORD_KEY, JSON.stringify(records.slice(0, RUN_RECORD_MAX)));
  } catch(error) {}
}

function readRunRecords(){
  if(typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(RUN_RECORD_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch(error) {
    return [];
  }
}

function getRunRecordFloor(){
  if(typeof formatCurrentDisplayArea === "function") return formatCurrentDisplayArea();

  const hudFloor = document.getElementById("hudFloor");
  const match = hudFloor ? hudFloor.textContent.match(/(\d+)\s*(?:F|구역)/i) : null;
  if(match) return match[1] + "구역";
  return "신령의 은혜";
}
