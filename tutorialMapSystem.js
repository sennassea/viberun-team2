"use strict";
/* =========================================================================
   Tutorial Map System
   - Owns tutorial-only map UI and behavior.
   - Does not call or wrap ACT1 map generation/render/open/close/stage logic.
   ========================================================================= */

(function(){
  const OVERLAY_ID = "tutorialMapOverlay";
  const STYLE_ID = "tutorialMapStyles";

  let tutorialMapActive = false;
  let currentLocation = "home";

  function openTutorialMap(){
    tutorialMapActive = true;
    currentLocation = "home";
    ensureTutorialMapStyles();

    if(typeof closeRewardOverlay === "function") closeRewardOverlay();
    const over = document.getElementById("over");
    if(over) over.classList.remove("show");

    let overlay = document.getElementById(OVERLAY_ID);
    if(!overlay) overlay = buildTutorialMapOverlay();
    document.body.appendChild(overlay);
    renderTutorialMap();
    overlay.classList.add("show");
  }

  function closeTutorialMap(){
    tutorialMapActive = false;
    currentLocation = "home";
    const overlay = document.getElementById(OVERLAY_ID);
    if(overlay) overlay.classList.remove("show");
  }

  function startTutorialBattleFromMap(){
    currentLocation = "tutorial";
    renderTutorialMap();
    tutorialMapActive = false;
    const overlay = document.getElementById(OVERLAY_ID);
    if(overlay) overlay.remove();
    if(window.TUTORIAL_BATTLE && typeof window.TUTORIAL_BATTLE.startTutorialBattle === "function"){
      window.TUTORIAL_BATTLE.startTutorialBattle();
    }
  }

  function getCurrentLocationLabel(){
    return currentLocation === "tutorial" ? "튜토리얼 구역" : "집";
  }

  function buildTutorialMapOverlay(){
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.className = "tutorial-map-overlay";
    overlay.innerHTML = [
      '<div class="tutorial-map-panel" role="dialog" aria-modal="true" aria-labelledby="tutorialMapTitle">',
        '<div class="tutorial-map-header">',
          '<div class="tutorial-map-location" aria-label="현재 위치">',
            '<span>현재 위치</span>',
            '<strong data-tutorial-map-current>집</strong>',
          '</div>',
          '<h2 id="tutorialMapTitle">튜토리얼 지도</h2>',
          '<button type="button" class="tutorial-map-close" aria-label="튜토리얼 지도 닫기">×</button>',
        '</div>',
        '<div class="tutorial-map-canvas" aria-label="튜토리얼 진행 지도">',
          '<svg class="tutorial-map-svg" viewBox="0 0 720 360" role="img" aria-labelledby="tutorialMapTitle">',
            '<line class="tutorial-map-path" x1="190" y1="250" x2="530" y2="110"></line>',
            '<g class="tutorial-map-node tutorial-map-node-home" data-tutorial-location="home" transform="translate(190 250)">',
              '<circle r="34"></circle>',
              '<text y="6" text-anchor="middle">집</text>',
            '</g>',
            '<g class="tutorial-map-node tutorial-map-node-battle" data-tutorial-battle-node transform="translate(530 110)">',
              '<circle r="36"></circle>',
              '<text y="6" text-anchor="middle">전투</text>',
            '</g>',
          '</svg>',
        '</div>',
        '<div class="tutorial-map-footer" data-tutorial-map-footer>📍 현재 위치: 집</div>',
      '</div>'
    ].join("");

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeTutorialMap();
    });
    overlay.querySelector(".tutorial-map-close").addEventListener("click", closeTutorialMap);
    overlay.querySelector("[data-tutorial-battle-node]").addEventListener("click", event => {
      event.stopPropagation();
      startTutorialBattleFromMap();
    });

    return overlay;
  }

  function renderTutorialMap(){
    const overlay = document.getElementById(OVERLAY_ID);
    if(!overlay) return;
    const label = getCurrentLocationLabel();
    const current = overlay.querySelector("[data-tutorial-map-current]");
    const footer = overlay.querySelector("[data-tutorial-map-footer]");
    if(current) current.textContent = label;
    if(footer) footer.textContent = "📍 현재 위치: " + label;
    overlay.querySelectorAll(".tutorial-map-node").forEach(node => {
      node.classList.toggle("is-current", node.dataset.tutorialLocation === currentLocation);
    });
  }

  function ensureTutorialMapStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .tutorial-map-overlay{
        position:fixed;
        inset:0;
        z-index:220;
        display:none;
        align-items:center;
        justify-content:center;
        padding:2.4cqh 2.4cqw;
        background:rgba(15, 31, 51, .48);
      }
      .tutorial-map-overlay.show{display:flex;}
      .tutorial-map-panel{
        width:min(82cqw, 110cqh);
        height:min(78cqh, 64cqw);
        min-height:420px;
        display:flex;
        flex-direction:column;
        border:0.3cqh solid rgba(255,255,255,.86);
        border-radius:1.2cqh;
        background:#f4f8fc;
        color:#243247;
        box-shadow:0 2cqh 4cqh rgba(0,0,0,.24);
        overflow:hidden;
      }
      .tutorial-map-header{
        min-height:7.4cqh;
        display:grid;
        grid-template-columns:minmax(160px, 1fr) auto minmax(160px, 1fr);
        align-items:center;
        gap:1.2cqw;
        padding:1.4cqh 1.4cqw;
        border-bottom:0.16cqh solid rgba(53,93,135,.24);
      }
      .tutorial-map-location{
        justify-self:start;
        display:flex;
        align-items:center;
        gap:.8cqw;
        min-height:4.4cqh;
        padding:0 1.1cqw;
        border:0.16cqh solid rgba(53,93,135,.24);
        border-radius:.8cqh;
        background:#fff;
        font-size:1.7cqh;
        font-weight:800;
      }
      .tutorial-map-location strong{color:#2f66a8;}
      .tutorial-map-header h2{
        margin:0;
        font-size:3cqh;
        line-height:1;
        text-align:center;
      }
      .tutorial-map-close{
        justify-self:end;
        width:4.4cqh;
        height:4.4cqh;
        border:0.18cqh solid rgba(53,93,135,.3);
        border-radius:.9cqh;
        background:#fff;
        color:#405066;
        font-size:3cqh;
        font-weight:900;
        line-height:1;
        cursor:pointer;
      }
      .tutorial-map-canvas{
        flex:1;
        min-height:0;
        padding:2cqh 2cqw;
      }
      .tutorial-map-svg{
        width:100%;
        height:100%;
        display:block;
        border:0.16cqh solid rgba(53,93,135,.18);
        border-radius:1cqh;
        background:linear-gradient(180deg, #ffffff 0%, #e9f1fa 100%);
      }
      .tutorial-map-path{
        stroke:#9fb5cf;
        stroke-width:8;
        stroke-linecap:round;
        stroke-dasharray:18 14;
      }
      .tutorial-map-node circle{
        fill:#ffffff;
        stroke:#6d89aa;
        stroke-width:5;
      }
      .tutorial-map-node text{
        fill:#243247;
        font-size:20px;
        font-weight:900;
        pointer-events:none;
      }
      .tutorial-map-node-home circle{fill:#fff8df;}
      .tutorial-map-node-battle{
        cursor:pointer;
      }
      .tutorial-map-node-battle circle{
        fill:#eef4ff;
        stroke:#4b8bd8;
      }
      .tutorial-map-node-battle:hover circle{
        fill:#dfeeff;
        stroke:#2f66a8;
      }
      .tutorial-map-node.is-current circle{
        stroke:#e7b54a;
        stroke-width:7;
      }
      .tutorial-map-footer{
        min-height:5.6cqh;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:1cqh 1.4cqw;
        border-top:0.16cqh solid rgba(53,93,135,.24);
        background:#fff;
        font-size:1.9cqh;
        font-weight:900;
        color:#405066;
      }
      @media (max-width:720px){
        .tutorial-map-panel{
          width:100%;
          height:78cqh;
          min-height:360px;
        }
        .tutorial-map-header{
          grid-template-columns:1fr auto;
        }
        .tutorial-map-header h2{
          grid-column:1 / -1;
          grid-row:1;
        }
        .tutorial-map-location{
          grid-row:2;
        }
        .tutorial-map-close{
          grid-row:2;
        }
      }
    `;
    document.head.appendChild(style);
  }

  window.TUTORIAL_MAP_SYSTEM = {
    open: openTutorialMap,
    close: closeTutorialMap,
    isActive: () => tutorialMapActive
  };
})();
