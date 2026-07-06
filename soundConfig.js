"use strict";

window.VIBERUN_SOUND_CONFIG = {
  assetBasePath: "assets/sound/",
  defaults: {
    master: 80,
    music: 70,
    effect: 80
  },
  categories: {
    bgm: { volumeKey: "music", loop: true },
    battle: { volumeKey: "effect" },
    card: { volumeKey: "effect" },
    ui: { volumeKey: "effect" },
    reward: { volumeKey: "effect" },
    shop: { volumeKey: "effect" },
    rest: { volumeKey: "effect" },
    event: { volumeKey: "effect" },
    result: { volumeKey: "effect" }
  },
  sounds: {
    bgmTitle: { category: "bgm", src: "" },
    bgmMap: { category: "bgm", src: "" },
    bgmBattleNormal: { category: "bgm", src: "" },
    bgmBattleBoss: { category: "bgm", src: "" },

    uiButtonClick: { category: "ui", src: "" },
    uiOpen: { category: "ui", src: "" },
    uiClose: { category: "ui", src: "" },

    battleStart: { category: "battle", src: "" },
    battleTurnEnd: { category: "battle", src: "" },
    battleEnemyAttack: { category: "battle", src: "" },

    cardUseAttack: { category: "card", src: "" },
    cardUseDefense: { category: "card", src: "" },
    cardUseSkill: { category: "card", src: "" },
    cardDraw: { category: "card", src: "" },

    rewardOpen: { category: "reward", src: "" },
    rewardPick: { category: "reward", src: "" },
    shopBuy: { category: "shop", src: "" },
    restHeal: { category: "rest", src: "" },
    eventChoice: { category: "event", src: "" },

    battleVictory: { category: "result", src: "" },
    battleDefeat: { category: "result", src: "" }
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
