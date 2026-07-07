"use strict";

window.VIBERUN_SOUND_CONFIG = {
  assetBasePath: "assets/audio/",
  defaults: {
    master: 80,
    music: 70,
    effect: 80
  },
  categories: {
    bgm: { volumeKey: "music", loop: true },
    battle: { volumeKey: "effect" },
    card: { volumeKey: "effect", minGapMs: 80 },
    ui: { volumeKey: "effect", minGapMs: 80 },
    reward: { volumeKey: "effect" },
    shop: { volumeKey: "effect" },
    rest: { volumeKey: "effect" },
    event: { volumeKey: "effect" },
    result: { volumeKey: "effect" }
  },
  sounds: {
    /* 배경음악: 실제 보유 에셋(assets/audio/bgm)만 연결 */
    bgmTitle: { category: "bgm", src: "bgm/main_menu.mp3" },
    bgmMap: { category: "bgm", src: "bgm/journey.mp3" },
    bgmBattleNormal: { category: "bgm", src: "bgm/battle.mp3" },
    bgmBattleBoss: { category: "bgm", src: "bgm/boss.mp3" },
    bgmShop: { category: "bgm", src: "bgm/shop_wolyeongdang.mp3" },
    bgmEvent: { category: "bgm", src: "bgm/event.mp3" },
    bgmPrayer: { category: "bgm", src: "bgm/prayer_site.mp3" },
    bgmReward: { category: "bgm", src: "bgm/reward.mp3" },
    bgmSpiritBlessing: { category: "bgm", src: "bgm/spirit_blessing.mp3" },

    /* 공용 UI 효과음 */
    uiButtonClick: { category: "ui", src: "sfx/button_common.mp3" },
    uiConfirm: { category: "ui", src: "sfx/button_confirm.mp3" },
    uiCancel: { category: "ui", src: "sfx/button_cancel.mp3" },
    uiOpen: { category: "ui", src: "sfx/tab_popup_open.mp3" },
    uiClose: { category: "ui", src: "sfx/popup_close.mp3" },

    /* 전투 관련: 새로 추가된 공용 전투/전환 사운드에 맞춰 매핑 */
    battleStart: { category: "battle", src: "sfx/tab_switch.mp3" },
    battleTurnEnd: { category: "battle", src: "sfx/tab_switch.mp3" },
    battleEnemyAttack: { category: "battle", src: "sfx/attack.mp3" },

    /* 카드 사용/선택: 카드 태그(결계/정화/의식)에 맞춰 매핑 */
    cardUseAttack: { category: "card", src: "sfx/attack.mp3" },
    cardUseDefense: { category: "card", src: "sfx/defense_card.mp3" },
    cardUseSkill: { category: "card", src: "sfx/skill.mp3" },
    cardDraw: { category: "card", src: "sfx/card_draw.mp3" },
    cardSelect: { category: "card", src: "sfx/card_select.mp3" },

    rewardOpen: { category: "reward", src: "sfx/tab_popup_open.mp3" },
    rewardPick: { category: "reward", src: "sfx/purchase_success.mp3" },
    shopBuy: { category: "shop", src: "sfx/purchase_success.mp3" },
    shopBuyFail: { category: "shop", src: "sfx/purchase_fail.mp3" },
    restHeal: { category: "rest", src: "sfx/spell_barrier.mp3" },
    eventChoice: { category: "event", src: "sfx/button_confirm.mp3" },

    battleVictory: { category: "result", src: "sfx/victory.mp3" },
    battleDefeat: { category: "result", src: "sfx/game_over.mp3" }
  },
  autoClickSelector: [
    "button",
    "[role='button']",
    ".start-menu-button",
    ".shop-product",
    ".event-choice",
    ".prayer-card"
  ].join(",")
};
