# Feature Module Split Map

This project still keeps several older systems in broad files. To reduce team conflicts, prefer adding new work through focused files and thin compatibility APIs instead of moving large blocks at once.

## Logic/UI 분리 (유니티 이식 준비)

전투 규칙·상태·저장 데이터(로직)와 DOM 렌더링(웹 전용 UI)을 파일 단위로
분리해 두었다. 유니티로 이식할 때는 `*UI.js` 파일들을 통째로 버리고
uGUI로 새로 짜면 되고, 나머지(Logic) 파일의 계산/상태/판정 로직은 C#으로
거의 그대로 옮길 수 있다.

| Logic (이식 대상) | UI (웹 전용, 이식 시 폐기) |
|---|---|
| battleRewards.js | battleRewardsUI.js |
| mapSystem.js | mapUI.js (기존 파일에 흡수) |
| runResult.js | runResultUI.js |
| shopNode.js | shopNodeUI.js |
| restNode.js | restNodeUI.js |
| runRecord.js | runRecordUI.js |
| startMenu.js | startMenuUI.js |
| eventNode.js | eventNodeUI.js |
| treasureNode.js | treasureNodeUI.js |
| startBlessing.js | startBlessingUI.js |
| turnCycle.js | turnCycleUI.js |
| cardPlaySystem.js | cardPlaySystemUI.js |
| battleInit.js | battleInitUI.js |
| tutorialMapSystem.js | tutorialMapSystemUI.js |
| tutorialSystem.js | tutorialSystemUI.js |
| tutorialBattle.js | tutorialBattleUI.js |

**분리 기준**: 상태를 바꾸거나 판정을 내리는 함수는 Logic에, `document`/
DOM을 직접 만지는 함수는 UI에 둔다. 여러 UI 조각을 한 번에 여닫는 얇은
컨트롤러 함수(`openXNode()` 같은 것)는 상태 변경이 주된 책임이라 Logic에
남겨뒀다 — UI 함수를 이름으로 호출하지만(같은 전역 스코프라 문제없음)
정의는 다른 파일에 있다.

**UI 파일을 먼저 로드해야 하는 경우**: `mapUI.js`, `startMenuUI.js`,
`tutorialSystemUI.js`, `tutorialBattleUI.js`는 짝이 되는 Logic 파일이
로드되자마자(즉시 실행 코드에서) 참조하므로 index.html에서 반드시 그
Logic 파일보다 먼저 로드해야 한다. 그 외의 Logic/UI 쌍은 로드 순서가
중요하지 않다(실제 호출은 항상 전체 로드가 끝난 뒤 사용자 상호작용
시점에 일어나기 때문).

**IIFE를 벗겨낼 때 주의할 점**: `tutorialMapSystem.js`/`tutorialSystem.js`/
`tutorialBattle.js`는 원래 자기만의 IIFE 안에 `state`/`VOLUME_KEY` 같은
비공개 변수와 도우미 함수를 감춰뒀다. 이걸 파일 최상위 변수로 바꿀 때는
**변수 이름뿐 아니라 함수 이름도** 다른 파일과 겹치지 않는지 반드시
확인해야 한다. 클래식 `<script>`는 모듈이 아니라서 최상위 `function`
선언은 자동으로 `window.그이름`이 되는데, 다른 파일이 이미
`window.그이름 = 그이름`으로 "다리" 역할을 해뒀다면(예:
`tutorialSystem.js`의 `window.startTutorialBattle = startTutorialBattle`)
같은 이름의 함수를 다른 파일에 최상위로 선언하는 순간 그 다리를 덮어써
버려 자기 자신을 무한 재귀 호출하게 된다(`tutorialBattle.js`의
`startTutorialBattle`/`isTutorialBattle`이 실제로 이 문제가 있었고,
`startTutorialBattleFlow`/`isTutorialModeActive`로 이름을 바꿔 해결했다).
같은 파일 세트를 다시 손볼 때는 `grep -rn "^function 이름" *.js`로
전체 충돌을 먼저 확인할 것.

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
3. Add `src` relative to `assets/audio/` (the project's actual sound folder: `bgm/`, `sfx/`).
4. Trigger it with `window.VIBERUN_SOUND.play("soundKey")` or add `data-sound-key="soundKey"` to a clickable element.
5. Use `window.VIBERUN_SOUND.playBgm("bgmKey")` for looping music.

The settings UI keeps using `window.VIBERUN_VOLUME_SETTINGS`, which is now provided by `soundManager.js` before settings screens load.
