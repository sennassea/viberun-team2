"use strict";
/* =========================================================================
   라이프 시스템
   - HP, 보호막, 동요, 상태 주문, 피해 계산 담당
   - 주문/드래그/UI 코드는 건드리지 않음
   ========================================================================= */
(function attachLifeSystem(global){
  const WEAK_MULT = 0.75;
  const STATUS_META = {
    block: { kind: "buff", icon: "&#128737;&#65039;", label: "마음의 결계", showCount: true },
    weak: { kind: "debuff", icon: "🌀", label: "동요", showCount: true },
    fracture: { kind: "debuff", icon: "💔", label: "균열", showCount: true },
    anxiety: { kind: "debuff", icon: "💭", label: "불안", showCount: true },
    lethargy: { kind: "debuff", icon: "🌫️", label: "무기력", showCount: true }
  };
  Object.assign(STATUS_META.block, { iconImage: "assets/status_icons/block.png" });
  Object.assign(STATUS_META.weak, { iconImage: "assets/status_icons/agitation.png" });
  Object.assign(STATUS_META.fracture, { iconImage: "assets/status_icons/fracture.png" });
  Object.assign(STATUS_META.anxiety, { iconImage: "assets/status_icons/anxiety.png" });
  Object.assign(STATUS_META.lethargy, { iconImage: "assets/status_icons/lethargy.png" });
  const STATUS_CARD_DB = {
    intrusive_thought: {
      name: "잡념",
      cost: 0,
      type: "status",
      emoji: "💭",
      target: "none",
      attr: "상태",
      rarity: "status",
      desc: "사용 불가\n덱에 남아 손패 자리를 차지합니다",
      fx: [],
      unplayable: true
    },
    regret: {
      name: "후회",
      cost: 0,
      type: "status",
      emoji: "💧",
      target: "none",
      attr: "상태",
      rarity: "status",
      desc: "사용 불가\n버려지면 정신력 3을 받고 소멸합니다",
      fx: [],
      unplayable: true,
      damageOnDiscard: 3
    },
    hesitation: {
      name: "망설임",
      cost: 0,
      type: "status",
      emoji: "⏳",
      target: "none",
      attr: "상태",
      rarity: "status",
      desc: "사용 불가\n턴 종료 시 소멸합니다",
      fx: [],
      unplayable: true,
      exhaustOnTurnEnd: true
    }
  };

  const LifeSystem = {
    config: {
      weakMultiplier: WEAK_MULT,
      // true: 슬더스식 턴 종료 후 보호막 제거
      // false: 보호막이 0이 되기 전까지 유지
      resetPlayerBlockEachTurn: true
    },

    getStatusCardDb(){
      return Object.fromEntries(
        Object.entries(STATUS_CARD_DB).map(([key, card]) => [key, { ...card, fx: [...card.fx] }])
      );
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
        fracture: characterData.fracture || 0,
        anxiety: characterData.anxiety || 0,
        lethargy: characterData.lethargy || 0
      };
    },

    createMonster(monsterData, index){
      return {
        id: monsterData.id || `enemy_${index}`,
        name: monsterData.name,
        image: monsterData.image,
        family: monsterData.family,
        theme: monsterData.theme,
        themeLabel: monsterData.themeLabel,
        roles: Array.isArray(monsterData.roles) ? [...monsterData.roles] : [],
        hp: monsterData.maxHp,
        maxHp: monsterData.maxHp,
        block: Math.min(monsterData.maxHp, monsterData.block || 0),
        weak: monsterData.weak || 0,
        fracture: monsterData.fracture || 0,
        anxiety: monsterData.anxiety || 0,
        lethargy: monsterData.lethargy || 0,
        grade: monsterData.grade || "normal",
        x: monsterData.x || 72,
        moves: monsterData.moves || [],
        nextPhase: monsterData.nextPhase || null,
        intent: (monsterData.moves || [])[monsterData.first || 0] || null,
        lastIntentType: null,
        intentRepeatCount: 0
      };
    },

    applyDamage(target, rawDamage, attackerWeak){
      if(!target || rawDamage <= 0){
        return { rawDamage: 0, finalDamage: 0, absorbed: 0, hpLoss: 0 };
      }

      const baseDamage = attackerWeak > 0
        ? Math.floor(rawDamage * this.config.weakMultiplier)
        : rawDamage;
      const finalDamage = (target.fracture || 0) > 0
        ? Math.floor(baseDamage * 1.25)
        : baseDamage;

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

    addFracture(target, value){
      if(!target || value <= 0) return 0;
      target.fracture = (target.fracture || 0) + value;
      return value;
    },

    reduceFracture(target, value){
      if(!target || value <= 0) return 0;
      const before = target.fracture || 0;
      target.fracture = Math.max(0, before - value);
      return before - target.fracture;
    },

    addAnxiety(target, value){
      if(!target || value <= 0) return 0;
      target.anxiety = (target.anxiety || 0) + value;
      return value;
    },

    consumeAnxiety(target){
      if(!target || (target.anxiety || 0) <= 0) return 0;
      target.anxiety = Math.max(0, (target.anxiety || 0) - 1);
      return 1;
    },

    reduceAnxiety(target, value){
      if(!target || value <= 0) return 0;
      const before = target.anxiety || 0;
      target.anxiety = Math.max(0, before - value);
      return before - target.anxiety;
    },

    addLethargy(target, value){
      if(!target || value <= 0) return 0;
      target.lethargy = (target.lethargy || 0) + value;
      return value;
    },

    consumeLethargy(target){
      if(!target || (target.lethargy || 0) <= 0) return 0;
      target.lethargy = Math.max(0, (target.lethargy || 0) - 1);
      return 1;
    },

    reduceLethargy(target, value){
      if(!target || value <= 0) return 0;
      const before = target.lethargy || 0;
      target.lethargy = Math.max(0, before - value);
      return before - target.lethargy;
    },

    resolveStatusCardDiscard(card, player, options = {}){
      if(!card || card.rarity !== "status"){
        return { handled: false };
      }

      if(card.damageOnDiscard){
        const damage = this.applyDamage(player, card.damageOnDiscard, 0);
        return {
          handled: true,
          discard: false,
          damage,
          message: card.name + "이 마음을 찔렀습니다"
        };
      }

      if(card.exhaustOnTurnEnd && options.source === "turnEnd"){
        return {
          handled: true,
          discard: false,
          message: card.name + " 소멸"
        };
      }

      return {
        handled: true,
        discard: true
      };
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

    renderCombatantStats(unit, options = {}){
      return this.renderHpBar(unit) + this.renderBlockBar(unit, options) + this.renderStatuses(unit);
    },

    renderHpBar(unit){
      const hpPct = this.percent(unit.hp, unit.maxHp);
      return '<div class="hpbar"><div class="hpfill" style="width:' + hpPct + '%"></div>' +
        '<div class="hptxt">' + unit.hp + '/' + unit.maxHp + '</div></div>';
    },

    renderBlockBar(unit, options = {}){
      const block = unit.block || 0;
      if(block <= 0){
        return options.reserveBlockSpace
          ? '<div class="blockbar" style="visibility:hidden" aria-hidden="true"></div>'
          : "";
      }

      const blockPct = this.percent(block, unit.maxHp);
      return '<div class="blockbar">' +
        '<div class="blockfill" style="width:' + blockPct + '%"></div>' +
        '<span class="block-icon">&#128737;&#65039;</span><b>' + block + '</b>' +
        '</div>';
    },

    renderStatuses(unit, options = {}){
      const statuses = [];
      if(options.includeBlock && (unit.block || 0) > 0){
        statuses.push(this.renderStatusIcon("block", unit.block));
      }
      if((unit.weak || 0) > 0){
        statuses.push(this.renderStatusIcon("weak", unit.weak));
      }
      if((unit.fracture || 0) > 0){
        statuses.push(this.renderStatusIcon("fracture", unit.fracture));
      }
      if((unit.anxiety || 0) > 0){
        statuses.push(this.renderStatusIcon("anxiety", unit.anxiety));
      }
      if((unit.lethargy || 0) > 0){
        statuses.push(this.renderStatusIcon("lethargy", unit.lethargy));
      }
      return '<div class="badges">' + statuses.join("") + '</div>';
    },

    renderStatusIcon(type, count){
      const meta = STATUS_META[type];
      if(!meta) return "";
      const iconHtml = meta.iconImage
        ? '<img src="' + meta.iconImage + '" alt="' + meta.label + '">'
        : meta.icon;

      return '<span class="status-icon ' + meta.kind + ' ' + type + '" data-status="' + type +
        '" aria-label="' + meta.label + '">' +
        '<span class="status-symbol">' + iconHtml + '</span>' +
        (meta.showCount === false ? "" : '<span class="status-count">' + count + '</span>') +
        '</span>';
    }
  };

  global.BOHYUN_LIFE_SYSTEM = LifeSystem;
})(window);
