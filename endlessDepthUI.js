"use strict";
/* =========================================================================
   Endless Depth UI (endlessDepthUI.js)
   - ENDLESS_JOURNEY_DEBUFFS는 기능상 디버프 데이터이지만, 유저에게는 level 기준의
     "심도 N"으로만 노출한다. 데이터의 effectType/value/name/desc는 건드리지 않고
     표시 전용 헬퍼와 심도 확인 버튼/드롭다운만 이 파일에서 처리한다.
   - endlessJourneyData.js / battleRunState.js 이후, mapUI.js 이후에 로드되어야 한다.
   ========================================================================= */

function getCurrentDepthLevel(){
  const journey = (typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey)
    ? RUN_STATE.journey
    : (typeof S !== "undefined" && S && S.journey ? S.journey : null);
  return (journey && Number.isFinite(journey.endlessLevel)) ? journey.endlessLevel : 0;
}

function getActiveDepthItems(){
  const journey = (typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey)
    ? RUN_STATE.journey
    : (typeof S !== "undefined" && S && S.journey ? S.journey : null);
  const ids = journey && Array.isArray(journey.activeDebuffIds) ? journey.activeDebuffIds : [];
  const db = Array.isArray(window.ENDLESS_JOURNEY_DEBUFFS) ? window.ENDLESS_JOURNEY_DEBUFFS : [];
  return ids
    .map(id => db.find(debuff => debuff && debuff.id === id))
    .filter(Boolean)
    .slice()
    .sort((a, b) => a.level - b.level);
}

function formatDepthTitle(debuff){
  const level = debuff && Number.isFinite(debuff.level) ? debuff.level : null;
  return level === null ? "심도" : ("심도 " + level);
}

function formatDepthDesc(debuff){
  return (debuff && debuff.desc) || "";
}

function isDepthUiHidden(){
  if(typeof S !== "undefined" && S && S.tutorialMode) return true;
  if(typeof window.isTutorialMapLegendMode === "function" && window.isTutorialMapLegendMode()) return true;
  const journey = (typeof RUN_STATE !== "undefined" && RUN_STATE && RUN_STATE.journey)
    ? RUN_STATE.journey
    : (typeof S !== "undefined" && S && S.journey ? S.journey : null);
  if(journey && journey.mode !== "endless") return true;
  return false;
}

function escapeDepthHtml(value){
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ── 드롭다운: 같은 DOM을 재사용하고 중복 생성하지 않는다 ── */
let depthDropdownEl = null;
let depthDropdownAnchor = null;

function ensureDepthDropdown(){
  if(depthDropdownEl && depthDropdownEl.isConnected) return depthDropdownEl;
  const host = document.getElementById("game") || document.body;
  const el = document.createElement("div");
  el.id = "depthDropdown";
  el.className = "depth-dropdown";
  el.innerHTML =
    '<div class="depth-dropdown-title">적용 중인 심도</div>' +
    '<div class="depth-list" id="depthList"></div>';
  el.addEventListener("click", event => event.stopPropagation());
  host.appendChild(el);
  depthDropdownEl = el;
  return el;
}

function renderDepthDropdownList(){
  const el = ensureDepthDropdown();
  const listEl = el.querySelector("#depthList");
  if(!listEl) return;
  const items = getActiveDepthItems();
  if(!items.length){
    listEl.innerHTML = '<div class="depth-empty">적용 중인 심도가 없습니다.</div>';
    return;
  }
  listEl.innerHTML = items.map(debuff =>
    '<div class="depth-item">' +
      '<div class="depth-item-title">' + escapeDepthHtml(formatDepthTitle(debuff)) + '</div>' +
      '<div class="depth-item-name">' + escapeDepthHtml(debuff.name || "") + '</div>' +
      '<div class="depth-item-desc">' + escapeDepthHtml(formatDepthDesc(debuff)) + '</div>' +
    '</div>'
  ).join("");
}

function positionDepthDropdown(anchorEl){
  const el = ensureDepthDropdown();
  const game = document.getElementById("game");
  if(!game || !anchorEl) return;
  const gRect = game.getBoundingClientRect();
  const aRect = anchorEl.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const pad = 8;

  let left = (aRect.left - gRect.left) + aRect.width - elRect.width;
  let top = (aRect.bottom - gRect.top) + 8;

  left = Math.max(pad, Math.min(gRect.width - elRect.width - pad, left));
  top = Math.max(pad, Math.min(gRect.height - elRect.height - pad, top));

  el.style.left = left + "px";
  el.style.top = top + "px";
}

function handleDepthOutsideClick(event){
  if(!depthDropdownEl || !depthDropdownEl.classList.contains("show")) return;
  if(depthDropdownAnchor && depthDropdownAnchor.contains(event.target)) return;
  if(depthDropdownEl.contains(event.target)) return;
  closeDepthDropdown();
}

function handleDepthEscKey(event){
  if(event.key === "Escape") closeDepthDropdown();
}

function openDepthDropdown(anchorEl){
  if(isDepthUiHidden()) return;
  depthDropdownAnchor = anchorEl || depthDropdownAnchor;
  if(!depthDropdownAnchor) return;

  renderDepthDropdownList();
  const el = ensureDepthDropdown();
  el.classList.add("show");
  positionDepthDropdown(depthDropdownAnchor);

  document.addEventListener("click", handleDepthOutsideClick, true);
  document.addEventListener("keydown", handleDepthEscKey);
}

function closeDepthDropdown(){
  if(!depthDropdownEl) return;
  depthDropdownEl.classList.remove("show");
  document.removeEventListener("click", handleDepthOutsideClick, true);
  document.removeEventListener("keydown", handleDepthEscKey);
}

function toggleDepthDropdown(anchorEl){
  if(depthDropdownEl && depthDropdownEl.classList.contains("show") && depthDropdownAnchor === anchorEl){
    closeDepthDropdown();
    return;
  }
  openDepthDropdown(anchorEl);
}

/* ── 심도 버튼 상태 갱신: HUD/맵 버튼을 모두 함께 갱신한다 ── */
function renderDepthButtonState(){
  const level = getCurrentDepthLevel();
  const hidden = isDepthUiHidden();

  document.querySelectorAll(".ui-depth-button").forEach(btn => {
    btn.style.display = hidden ? "none" : "";
    const countEl = btn.querySelector(".depth-button-count");
    if(countEl) countEl.textContent = String(level);
    btn.classList.toggle("depth-button-inactive", level <= 0);
  });

  if(hidden){
    closeDepthDropdown();
  } else if(depthDropdownEl && depthDropdownEl.classList.contains("show")){
    renderDepthDropdownList();
  }
}

function bindDepthButton(btn){
  if(!btn || btn.dataset.depthBound) return;
  btn.dataset.depthBound = "true";
  btn.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    if(typeof window.closeMapPopupViews === "function") window.closeMapPopupViews("depth");
    toggleDepthDropdown(btn);
  });
}

function initDepthButtons(){
  document.querySelectorAll(".ui-depth-button").forEach(bindDepthButton);
  renderDepthButtonState();
}

initDepthButtons();

window.getCurrentDepthLevel = getCurrentDepthLevel;
window.getActiveDepthItems = getActiveDepthItems;
window.formatDepthTitle = formatDepthTitle;
window.formatDepthDesc = formatDepthDesc;
window.openDepthDropdown = openDepthDropdown;
window.closeDepthDropdown = closeDepthDropdown;
window.toggleDepthDropdown = toggleDepthDropdown;
window.renderDepthButtonState = renderDepthButtonState;
window.bindDepthButton = bindDepthButton;
