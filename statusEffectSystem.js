"use strict";
function ensureEnemyStatus(enemy){
  if(!enemy) return {};
  if(!enemy.status || typeof enemy.status !== "object") enemy.status = {};
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    const legacyKey = data.legacyKey;
    if(legacyKey && typeof enemy[legacyKey] === "number"){
      enemy.status[statusId] = Math.max(enemy.status[statusId] || 0, enemy[legacyKey] || 0);
    } else if(typeof enemy.status[statusId] !== "number"){
      enemy.status[statusId] = 0;
    }
  });
  syncLegacyStatusFields(enemy);
  return enemy.status;
}

function syncLegacyStatusFields(enemy){
  if(!enemy || !enemy.status) return;
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    if(!data.legacyKey) return;
    enemy[data.legacyKey] = Math.max(0, enemy.status[statusId] || 0);
  });
}

function addStatus(enemy, statusId, amount, options={}){
  if(!enemy || !statusId || !amount) return 0;
  const data = STATUS_DATA[statusId] || { maxStack: 99 };
  ensureEnemyStatus(enemy);
  const before = enemy.status[statusId] || 0;
  const next = Math.min(data.maxStack || 99, before + amount);
  enemy.status[statusId] = Math.max(0, next);
  syncLegacyStatusFields(enemy);
  const added = Math.max(0, enemy.status[statusId] - before);
  if(added > 0 && statusId === "mark") triggerBlessingOnMarkApplied();
  if(added > 0 && !options.skipRelic){
    if(statusId === "mark") applyRelicTrigger("onMarkApply", { target:enemy, before, added, amount });
    if(statusId === "recollection") applyRelicTrigger("onRecollectionApplied", { target:enemy, before, added, amount });
  }
  return added;
}

function removeStatus(enemy, statusId, amount){
  if(!enemy || !statusId || !enemy.status) return 0;
  ensureEnemyStatus(enemy);
  const before = enemy.status[statusId] || 0;
  enemy.status[statusId] = Math.max(0, before - (amount || before));
  syncLegacyStatusFields(enemy);
  return before - enemy.status[statusId];
}

function setStatus(enemy, statusId, amount){
  if(!enemy || !statusId) return;
  ensureEnemyStatus(enemy);
  enemy.status[statusId] = Math.max(0, amount || 0);
  syncLegacyStatusFields(enemy);
}

function getStatus(enemy, statusId){
  if(!enemy || !statusId) return 0;
  ensureEnemyStatus(enemy);
  return enemy.status?.[statusId] || 0;
}

function decayEnemyStatuses(enemy, timing){
  if(!enemy) return;
  ensureEnemyStatus(enemy);
  Object.entries(STATUS_DATA).forEach(([statusId, data]) => {
    if(!data || !data.showOnEnemy) return;
    if(data.decayTiming && data.decayTiming !== timing) return;
    if(statusId === "recollection" && timing === "afterEnemyAction"){
      let damage = enemy.status[statusId] || 0;
      if(damage > 0){
        const ctx = { enemy, damage, bonusDamage:0 };
        applyRelicTrigger("onRecollectionDamage", ctx);
        damage += ctx.bonusDamage || 0;
        applyDamageWithFeedback(enemy, damage, 0);
      }
    }
    const amount = data.decayAmount || 1;
    if(amount > 0) removeStatus(enemy, statusId, amount);
  });
}

function statusTooltipText(statusId, count){
  const data = STATUS_DATA[statusId] || {};
  const lines = [];
  lines.push(data.name || statusId);
  lines.push("현재 스택 : " + count);
  if(data.description) lines.push(data.description);
  if(data.decayTimingText) lines.push(data.decayTimingText);
  return lines.filter(Boolean).join("\n");
}

function statusIconHtml(statusId, count){
  const data = STATUS_DATA[statusId];
  if(!data || !data.showOnEnemy || count <= 0) return "";
  const name = data.name || statusId;
  const tooltip = statusTooltipText(statusId, count);
  const icon = data.iconImage
    ? '<img src="'+escapeHtml(data.iconImage)+'" alt="'+escapeHtml(name)+'">'
    : '<span>'+escapeHtml(data.icon || "•")+'</span>';
  return '<div class="enemy-status-icon status-'+escapeHtml(statusId)+'" data-status-id="'+escapeHtml(statusId)+'" data-status-name="'+escapeHtml(name)+'" data-status-tooltip="'+escapeHtml(tooltip)+'" style="--status-color:'+(data.color || '#7b61ff')+'">'
       + icon + '<b>'+count+'</b></div>';
}

const MONSTER_COUNTER_LABELS = {
  waiting: "기다림",
  violation: "위반",
  neglect: "외면",
  patience: "참음",
  years: "세월",
  emptySeat: "빈자리",
  leftover: "잔반",
  discipline: "지적",
  speed: "속도",
  wrongAnswer: "오답"
};

function monsterCounterIconHtml(enemyLike, counterId, count){
  if(!count || count <= 0) return "";
  const label = MONSTER_COUNTER_LABELS[counterId] || counterId;
  const max = enemyLike.gimmick && enemyLike.gimmick.counterId === counterId ? enemyLike.gimmick.maxStack : null;
  const tooltip = label + "\n현재 스택 : " + count + (Number.isFinite(max) ? "/" + max : "");
  return '<div class="enemy-status-icon status-counter" data-status-id="counter-'+escapeHtml(counterId)+'" data-status-name="'+escapeHtml(label)+'" data-status-tooltip="'+escapeHtml(tooltip)+'" style="--status-color:#9b7a32">'
       + '<span>●</span><b>'+count+'</b></div>';
}

function renderEnemyStatusIcons(enemyLike){
  if(!enemyLike || enemyLike.hideHud) return "";
  ensureEnemyStatus(enemyLike);
  const orderedStatusIds = ["agitation", "fracture", "recollection", "mark", ...Object.keys(STATUS_DATA).filter(id => !["agitation", "fracture", "recollection", "mark"].includes(id))];
  const statusHtml = orderedStatusIds
    .map(statusId => statusIconHtml(statusId, enemyLike.status?.[statusId] || 0))
    .join("");
  const counterHtml = Object.entries(enemyLike.counters || {})
    .map(([counterId, count]) => monsterCounterIconHtml(enemyLike, counterId, count))
    .join("");
  const html = statusHtml + counterHtml;
  return html ? '<div class="enemy-status-icons">'+html+'</div>' : "";
}

// 선택 적이 죽으면 다음 생존 적으로 자동 전환 (기획서 §8-6)
