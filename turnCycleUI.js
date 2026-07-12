"use strict";
/* =========================================================================
   턴 종료/게임 오버 UI 레이어 — turnCycle.js에서 분리된 DOM 렌더링.
   턴 진행/전투 종료 판정 로직은 turnCycle.js에 남아있고 이 파일은
   레거시 종료 오버레이(#over) 표시만 담당한다.
   유니티 이식 시 이 파일은 통째로 버리고 uGUI로 새로 짜면 된다.
   ========================================================================= */

function showLegacyEndOverlay(result, giveUpToStartOnly){
  $("#overTitle").textContent = result==="win" ? "🎉 승리!" : "💀 패배...";
  $("#overDesc").textContent  = result==="win" ? "모든 영혼을 성불시켰습니다." : PLAYER_DEF.name+"이 쓰러졌습니다.";
  updateRestartButtonForEndGame(result === "lose" || giveUpToStartOnly);
  $("#returnStart").style.display = result==="lose" ? "block" : "none";
  $("#over").classList.add("show");
}

function updateRestartButtonForEndGame(removeRestart){
  const restartButton = document.getElementById("restart");
  if(removeRestart){
    if(restartButton) restartButton.remove();
    return;
  }
  if(restartButton){
    restartButton.hidden = false;
    restartButton.disabled = false;
    restartButton.style.display = "";
    return;
  }
  const returnStartButton = document.getElementById("returnStart");
  if(!returnStartButton || !returnStartButton.parentNode) return;
  const restoredButton = document.createElement("button");
  restoredButton.id = "restart";
  restoredButton.textContent = "다시 시작";
  restoredButton.addEventListener("click", () => {
    const over = document.querySelector("#over");
    if(over) over.classList.remove("show");
    newGame({ resetRun:true });
  });
  returnStartButton.parentNode.insertBefore(restoredButton, returnStartButton);
}
