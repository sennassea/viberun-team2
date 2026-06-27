"use strict";
/* =========================================================================
   라이프 시스템
   - HP, 보호막, 약화, 피해 계산만 담당
   - 카드/드래그/UI 코드는 건드리지 않음
   ========================================================================= */
(function attachLifeSystem(global){
  const WEAK_MULT = 0.75;
  const STATUS_META = {
    weak: { kind: "debuff", icon: "🌀", label: "약화", showCount: true },
    healingAura: { kind: "buff", icon: "💚", label: "치유의 향기", showCount: false }
  };

  const LifeSystem = {
    config: {
      weakMultiplier: WEAK_MULT,
      // true: 슬더스식 턴 종료 후 보호막 제거
      // false: 보호막이 0이 되기 전까지 유지
      resetPlayerBlockEachTurn: false
    },

    createPlayer(characterData){
      return {
        id: characterData.id,
        name: characterData.name,
        title: characterData.title,
        emoji: characterData.emoji,
        hp: characterData.hp,
        maxHp: characterData.maxHp,
        block: Math.min(characterData.maxHp, characterData.block || 0),
        weak: characterData.weak || 0,
        healingAura: characterData.healingAura === false ? 0 : 1
      };
    },

    createMonster(monsterData, index){
      return {
        id: monsterData.id || `enemy_${index}`,
        name: monsterData.name,
        emoji: monsterData.emoji,
        hp: monsterData.maxHp,
        maxHp: monsterData.maxHp,
        block: Math.min(monsterData.maxHp, monsterData.block || 0),
        weak: monsterData.weak || 0,
        x: monsterData.x || 72,
        moves: monsterData.moves || [],
        intent: (monsterData.moves || [])[monsterData.first || 0] || null
      };
    },

    applyDamage(target, rawDamage, attackerWeak){
      if(!target || rawDamage <= 0){
        return { rawDamage: 0, finalDamage: 0, absorbed: 0, hpLoss: 0 };
      }

      const finalDamage = attackerWeak > 0
        ? Math.floor(rawDamage * this.config.weakMultiplier)
        : rawDamage;

      const absorbed = Math.min(target.block || 0, finalDamage);
      const hpLoss = Math.max(0, finalDamage - absorbed);

      target.block = Math.max(0, (target.block || 0) - finalDamage);
      target.hp = Math.max(0, target.hp - hpLoss);

      return { rawDamage, finalDamage, absorbed, hpLoss };
    },

    addBlock(target, value){
      if(!target || value <= 0) return 0;
      const before = target.block || 0;
      const maxBlock = target.maxHp || before + value;
      target.block = Math.min(maxBlock, before + value);
      return target.block - before;
    },

    heal(target, value){
      if(!target || value <= 0) return 0;
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + value);
      return target.hp - before;
    },

    addWeak(target, value){
      if(!target || value <= 0) return 0;
      target.weak = (target.weak || 0) + value;
      return value;
    },

    reduceWeak(target, value){
      if(!target || value <= 0) return 0;
      const before = target.weak || 0;
      target.weak = Math.max(0, before - value);
      return before - target.weak;
    },

    prepareNextPlayerTurn(player){
      if(this.config.resetPlayerBlockEachTurn){
        player.block = 0;
      }
    },

    isDead(target){
      return !target || target.hp <= 0;
    },

    percent(value, max){
      if(!max || max <= 0) return 0;
      return Math.min(100, Math.max(0, (value / max) * 100));
    },

    renderCombatantStats(unit){
      return this.renderHpBar(unit) + this.renderBlockBar(unit) + this.renderStatuses(unit);
    },

    renderHpBar(unit){
      const hpPct = this.percent(unit.hp, unit.maxHp);
      return '<div class="hpbar"><div class="hpfill" style="width:' + hpPct + '%"></div>' +
        '<div class="hptxt">' + unit.hp + '/' + unit.maxHp + '</div></div>';
    },

    renderBlockBar(unit){
      const block = unit.block || 0;
      if(block <= 0) return "";

      const blockPct = this.percent(block, unit.maxHp);
      return '<div class="blockbar">' +
        '<div class="blockfill" style="width:' + blockPct + '%"></div>' +
        '<span class="block-icon">&#128737;&#65039;</span><b>' + block + '</b>' +
        '</div>';
    },

    renderStatuses(unit){
      const statuses = [];
      if((unit.weak || 0) > 0){
        statuses.push(this.renderStatusIcon("weak", unit.weak));
      }
      if((unit.healingAura || 0) > 0){
        statuses.push(this.renderStatusIcon("healingAura", unit.healingAura));
      }

      return '<div class="badges">' + statuses.join("") + '</div>';
    },

    renderStatusIcon(type, count){
      const meta = STATUS_META[type];
      if(!meta) return "";

      return '<span class="status-icon ' + meta.kind + ' ' + type + '" data-status="' + type +
        '" aria-label="' + meta.label + '">' +
        '<span class="status-symbol">' + meta.icon + '</span>' +
        (meta.showCount === false ? "" : '<span class="status-count">' + count + '</span>') +
        '</span>';
    }
  };

  global.BOHYUN_LIFE_SYSTEM = LifeSystem;
})(window);
