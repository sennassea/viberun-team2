"use strict";
/* =========================================================================
   구역/ACT 표시 규칙 (journeyDisplay.js)
   - 내부 맵 층수(nodeFloorIdx, MAP_STAGES의 floor 등)는 그대로 두고,
     화면에 노출되는 "N구역" / ACT명만 이 파일에서 계산한다.
   - ACT1 1회 반복 단위는 16구역이며, 끝없는 여정 N의 표시 오프셋은 N * 16이다.
   ========================================================================= */

function getCurrentJourneyState(){
  if(typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey) return RUN_STATE.journey;
  if(typeof S !== "undefined" && S && S.journey) return S.journey;
  return (typeof createDefaultJourneyState === "function")
    ? createDefaultJourneyState()
    : { mode: "first", actName: "최초의 여정", totalDisplayFloorOffset: 0 };
}

function getCurrentActName(){
  const journey = getCurrentJourneyState();
  return journey.actName || "최초의 여정";
}

function getDisplayAreaNumberByFloorIndex(floorIndex){
  const journey = getCurrentJourneyState();
  const offset = journey.mode === "endless" ? (journey.totalDisplayFloorOffset || 0) : 0;
  const safeFloorIndex = Number.isFinite(floorIndex) ? floorIndex : 0;
  return safeFloorIndex + offset;
}

function getCurrentDisplayAreaNumber(){
  if(typeof nodeFloorIdx !== "function" || typeof getCurrentNodeId !== "function") return 0;
  const floorIndex = nodeFloorIdx(getCurrentNodeId());
  if(!Number.isFinite(floorIndex) || floorIndex <= 0) return 0;
  return getDisplayAreaNumberByFloorIndex(floorIndex);
}

function formatDisplayAreaByFloorIndex(floorIndex){
  if(!Number.isFinite(floorIndex) || floorIndex <= 0) return "신령의 은혜";
  return getDisplayAreaNumberByFloorIndex(floorIndex) + "구역";
}

function formatCurrentDisplayArea(){
  if(typeof nodeFloorIdx !== "function" || typeof getCurrentNodeId !== "function") return "신령의 은혜";
  return formatDisplayAreaByFloorIndex(nodeFloorIdx(getCurrentNodeId()));
}

function getHudProgressLabels(){
  return {
    actName: getCurrentActName(),
    area: formatCurrentDisplayArea()
  };
}

window.getCurrentJourneyState = getCurrentJourneyState;
window.getCurrentActName = getCurrentActName;
window.getDisplayAreaNumberByFloorIndex = getDisplayAreaNumberByFloorIndex;
window.getCurrentDisplayAreaNumber = getCurrentDisplayAreaNumber;
window.formatDisplayAreaByFloorIndex = formatDisplayAreaByFloorIndex;
window.formatCurrentDisplayArea = formatCurrentDisplayArea;
window.getHudProgressLabels = getHudProgressLabels;
