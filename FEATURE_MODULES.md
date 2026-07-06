# Feature Module Split Map

This project still keeps several older systems in broad files. To reduce team conflicts, prefer adding new work through focused files and thin compatibility APIs instead of moving large blocks at once.

## Current Ownership

- Combat core: `script.js`
- Combat tooltip layer: `tooltip.js`
- Global tooltip layer for non-combat screens: `globalTooltip.js`, `globalTooltip.css`
- Sound config and playback: `soundConfig.js`, `soundManager.js`
- Character, monster, card, potion, relic data: `characterData.js`, `monsterData.js`, `cardData.js`, `PotionData.js`, `equipment.js`
- Map and node flow: `mapSystem.js`, `mapNodeLogic.js`, `mapUI.js`, `tutorialMapSystem.js`, `encounterPackages.js`
- Shop, rest, event screens: `shopNode.js`, `restNode.js`, `eventNode.js`, `eventData.js`
- Rewards and run result: `runResultData.js`, `runResult.js`
- Codex and bag UI: `deckViewer.js`, `bagUI.js`
- Settings and saved volume API: `settingsViewer.js`, `soundManager.js`
- Auth, wallet, mailbox, store services: `authService.js`, `walletService.js`, `mailboxService.js`, `bmStoreService.js`
- Start and account UI: `startMenu.js`, `menuProfileUI.js`, `nicknameUI.js`, `monthlyPassUI.js`, `mailboxUI.js`, `bmStoreUI.js`

## Safe Split Direction

- Add new feature logic in a dedicated file first.
- Expose a small `window.*` compatibility API when old files need to call it.
- Keep `script.js` changes limited to call sites until combat can be split in smaller passes.
- Put sound keys and paths only in `soundConfig.js`.
- Put sound playback, volume application, and BGM state only in `soundManager.js`.
- Add screen tooltip text with `data-tooltip-title` and `data-tooltip`; avoid adding new tooltip logic to each screen file.

## Sound Workflow

1. Add a key in `soundConfig.js`.
2. Set `category` to one of `bgm`, `battle`, `card`, `ui`, `reward`, `shop`, `rest`, `event`, or `result`.
3. Add `src` relative to `assets/sound/`.
4. Trigger it with `window.VIBERUN_SOUND.play("soundKey")` or add `data-sound-key="soundKey"` to a clickable element.
5. Use `window.VIBERUN_SOUND.playBgm("bgmKey")` for looping music.

The settings UI keeps using `window.VIBERUN_VOLUME_SETTINGS`, which is now provided by `soundManager.js` before settings screens load.
