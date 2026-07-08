# 미사용 에셋(Category A) 백업 이동 대상 목록

생성일: 2026-07-09

이 문서는 `assets 최적화 감사 보고서`(1차)와 `미사용 에셋 후보 재검증`(2차, A/B/C 분류)에서 **Category A(삭제해도 안전)**로 확정된 파일 목록입니다. B(사람 확인 필요), C(위험) 등급 파일은 포함하지 않았습니다.

- 대상 파일 수: **59개**
- 총 용량: **58.37 MB**
- 처리 방식: 삭제가 아니라 `backup_unused_assets/` 폴더로 **이동**(원본 상대 경로 구조 유지)
- 코드 수정: 없음

## 이동 매핑 규칙

각 파일은 프로젝트 루트 기준 원래의 상대 경로를 그대로 유지한 채 `backup_unused_assets/` 아래로 이동합니다. 예:

```
assets/potion_icons/청심환.png
  -> backup_unused_assets/assets/potion_icons/청심환.png

prototype-check.png
  -> backup_unused_assets/prototype-check.png
```

복구가 필요하면 `backup_unused_assets/<경로>`를 원래 경로로 다시 옮기면 됩니다.

## 이동 대상 목록

### 프로젝트 루트 디버그 스크린샷 (assets 밖) — 3개, 5.18 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `UsersUSERAppDataLocalTempclaudec--Users-USER-sdslike-viberun-team2d60a9f0c-3a59-45aa-8d70-2094593cb808scratchpadshop_after.png` | 1.73 MB | `backup_unused_assets/UsersUSERAppDataLocalTempclaudec--Users-USER-sdslike-viberun-team2d60a9f0c-3a59-45aa-8d70-2094593cb808scratchpadshop_after.png` |
| `prototype-check.png` | 1.73 MB | `backup_unused_assets/prototype-check.png` |
| `stage-panel-check.png` | 1.72 MB | `backup_unused_assets/stage-panel-check.png` |

### ui_panels 백업 폴더 — 5개, 8.33 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/ui_panels/_backup_20260708/relic_potion_frame_rare.png` | 2.05 MB | `backup_unused_assets/assets/ui_panels/_backup_20260708/relic_potion_frame_rare.png` |
| `assets/ui_panels/_backup_20260708/relic_potion_frame_legendary.png` | 1.97 MB | `backup_unused_assets/assets/ui_panels/_backup_20260708/relic_potion_frame_legendary.png` |
| `assets/ui_panels/_backup_20260708/relic_potion_frame_start.png` | 1.97 MB | `backup_unused_assets/assets/ui_panels/_backup_20260708/relic_potion_frame_start.png` |
| `assets/ui_panels/_backup_20260708/relic_potion_frame_common.png` | 1.94 MB | `backup_unused_assets/assets/ui_panels/_backup_20260708/relic_potion_frame_common.png` |
| `assets/ui_panels/_backup_20260709/codex_section_panel.png` | 0.41 MB | `backup_unused_assets/assets/ui_panels/_backup_20260709/codex_section_panel.png` |

### potion_icons 한글 원본명 (구버전 중복) — 30개, 39.51 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/potion_icons/도깨비 만병.png` | 1.99 MB | `backup_unused_assets/assets/potion_icons/도깨비 만병.png` |
| `assets/potion_icons/신명주.png` | 1.95 MB | `backup_unused_assets/assets/potion_icons/신명주.png` |
| `assets/potion_icons/응어리 먹물.png` | 1.79 MB | `backup_unused_assets/assets/potion_icons/응어리 먹물.png` |
| `assets/potion_icons/삼신수.png` | 1.61 MB | `backup_unused_assets/assets/potion_icons/삼신수.png` |
| `assets/potion_icons/봉인 먹물.png` | 1.59 MB | `backup_unused_assets/assets/potion_icons/봉인 먹물.png` |
| `assets/potion_icons/흰 소금선.png` | 1.58 MB | `backup_unused_assets/assets/potion_icons/흰 소금선.png` |
| `assets/potion_icons/백호수.png` | 1.56 MB | `backup_unused_assets/assets/potion_icons/백호수.png` |
| `assets/potion_icons/백지 부적.png` | 1.51 MB | `backup_unused_assets/assets/potion_icons/백지 부적.png` |
| `assets/potion_icons/만신의 부름.png` | 1.49 MB | `backup_unused_assets/assets/potion_icons/만신의 부름.png` |
| `assets/potion_icons/기억 이슬.png` | 1.38 MB | `backup_unused_assets/assets/potion_icons/기억 이슬.png` |
| `assets/potion_icons/귀문부.png` | 1.34 MB | `backup_unused_assets/assets/potion_icons/귀문부.png` |
| `assets/potion_icons/도깨비 거울물.png` | 1.32 MB | `backup_unused_assets/assets/potion_icons/도깨비 거울물.png` |
| `assets/potion_icons/회혼수.png` | 1.31 MB | `backup_unused_assets/assets/potion_icons/회혼수.png` |
| `assets/potion_icons/살풀이 재.png` | 1.26 MB | `backup_unused_assets/assets/potion_icons/살풀이 재.png` |
| `assets/potion_icons/작은 방울술.png` | 1.24 MB | `backup_unused_assets/assets/potion_icons/작은 방울술.png` |
| `assets/potion_icons/말하지 못한 편지.png` | 1.23 MB | `backup_unused_assets/assets/potion_icons/말하지 못한 편지.png` |
| `assets/potion_icons/영안수.png` | 1.23 MB | `backup_unused_assets/assets/potion_icons/영안수.png` |
| `assets/potion_icons/금강수.png` | 1.21 MB | `backup_unused_assets/assets/potion_icons/금강수.png` |
| `assets/potion_icons/액막이 소금.png` | 1.19 MB | `backup_unused_assets/assets/potion_icons/액막이 소금.png` |
| `assets/potion_icons/청심환.png` | 1.18 MB | `backup_unused_assets/assets/potion_icons/청심환.png` |
| `assets/potion_icons/집중부.png` | 1.18 MB | `backup_unused_assets/assets/potion_icons/집중부.png` |
| `assets/potion_icons/새벽 샘물.png` | 1.17 MB | `backup_unused_assets/assets/potion_icons/새벽 샘물.png` |
| `assets/potion_icons/오방수.png` | 1.17 MB | `backup_unused_assets/assets/potion_icons/오방수.png` |
| `assets/potion_icons/촛농 봉인액.png` | 1.12 MB | `backup_unused_assets/assets/potion_icons/촛농 봉인액.png` |
| `assets/potion_icons/복숭아 약수.png` | 1.10 MB | `backup_unused_assets/assets/potion_icons/복숭아 약수.png` |
| `assets/potion_icons/연꽃 향.png` | 1.08 MB | `backup_unused_assets/assets/potion_icons/연꽃 향.png` |
| `assets/potion_icons/금이 간 경면수.png` | 1.02 MB | `backup_unused_assets/assets/potion_icons/금이 간 경면수.png` |
| `assets/potion_icons/맑은 쌀물.png` | 0.96 MB | `backup_unused_assets/assets/potion_icons/맑은 쌀물.png` |
| `assets/potion_icons/경문 잿물.png` | 0.92 MB | `backup_unused_assets/assets/potion_icons/경문 잿물.png` |
| `assets/potion_icons/호신부.png` | 0.83 MB | `backup_unused_assets/assets/potion_icons/호신부.png` |

### characters 임시 파일 — 2개, 1.40 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/characters/player-temp-cutout.png.bak` | 0.86 MB | `backup_unused_assets/assets/characters/player-temp-cutout.png.bak` |
| `assets/characters/player-temp.png` | 0.54 MB | `backup_unused_assets/assets/characters/player-temp.png` |

### ui_buttons 구버전 "_v2" 세트 + 미사용 튜토리얼 버튼 — 11개, 2.94 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/ui_buttons/end_turn_panel_v2.png` | 0.61 MB | `backup_unused_assets/assets/ui_buttons/end_turn_panel_v2.png` |
| `assets/ui_buttons/shop_tab_panel_v2.png` | 0.45 MB | `backup_unused_assets/assets/ui_buttons/shop_tab_panel_v2.png` |
| `assets/ui_buttons/settings_replay_v2.png` | 0.30 MB | `backup_unused_assets/assets/ui_buttons/settings_replay_v2.png` |
| `assets/ui_buttons/settings_reset_v2.png` | 0.25 MB | `backup_unused_assets/assets/ui_buttons/settings_reset_v2.png` |
| `assets/ui_buttons/menu_codex_v2.png` | 0.25 MB | `backup_unused_assets/assets/ui_buttons/menu_codex_v2.png` |
| `assets/ui_buttons/settings_logout_v2.png` | 0.24 MB | `backup_unused_assets/assets/ui_buttons/settings_logout_v2.png` |
| `assets/ui_buttons/menu_continue_v2.png` | 0.20 MB | `backup_unused_assets/assets/ui_buttons/menu_continue_v2.png` |
| `assets/ui_buttons/menu_record_v2.png` | 0.18 MB | `backup_unused_assets/assets/ui_buttons/menu_record_v2.png` |
| `assets/ui_buttons/menu_tutorial_v2.png` | 0.17 MB | `backup_unused_assets/assets/ui_buttons/menu_tutorial_v2.png` |
| `assets/ui_buttons/menu_new_game_v2.png` | 0.16 MB | `backup_unused_assets/assets/ui_buttons/menu_new_game_v2.png` |
| `assets/ui_buttons/tutorial.png` | 0.12 MB | `backup_unused_assets/assets/ui_buttons/tutorial.png` |

### ui/start_menu 구버전 (신버전 "new_*"로 교체됨) — 4개, 0.47 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/ui/start_menu/continue.png` | 0.14 MB | `backup_unused_assets/assets/ui/start_menu/continue.png` |
| `assets/ui/start_menu/new_game.png` | 0.12 MB | `backup_unused_assets/assets/ui/start_menu/new_game.png` |
| `assets/ui/start_menu/codex.png` | 0.12 MB | `backup_unused_assets/assets/ui/start_menu/codex.png` |
| `assets/ui/start_menu/record.png` | 0.10 MB | `backup_unused_assets/assets/ui/start_menu/record.png` |

### 기타 흔적 없는 단일 파일 — 4개, 0.54 MB

| 원본 경로 | 용량 | 이동 후 경로 |
|---|---|---|
| `assets/ui_panels/map_outer_frame_only_transparent_slots.png` | 0.45 MB | `backup_unused_assets/assets/ui_panels/map_outer_frame_only_transparent_slots.png` |
| `assets/ui_panels/map_bottom_description_panel.png` | 0.06 MB | `backup_unused_assets/assets/ui_panels/map_bottom_description_panel.png` |
| `assets/ui/player_info_panel_461x130.png` | 0.02 MB | `backup_unused_assets/assets/ui/player_info_panel_461x130.png` |
| `assets/ui_panels/map_title_name_panel.png` | 0.02 MB | `backup_unused_assets/assets/ui_panels/map_title_name_panel.png` |

## 실행 순서

1. 위 목록의 파일을 `git mv`(추적 파일) 또는 `mv`(미추적 파일)로 `backup_unused_assets/` 아래 동일 상대 경로에 이동
2. 이동 후 코드 전체에서 이동된 파일 경로에 대한 참조가 남아있지 않은지 재확인
3. 정적 서버로 앱을 구동해 콘솔 오류(404 등)와 주요 화면 동작 확인
4. 문제가 없으면 이동 완료 보고, 문제가 있으면 원인 파일을 되돌리고 원인 기록

## 처리 결과

**실행일: 2026-07-09 — 이동 완료, 문제 없음**

### 1) 이동 실행

`git mv`로 59개 파일 전부를 `backup_unused_assets/` 아래 동일한 상대 경로 구조로 이동했습니다(폴더 통째 삭제 없이 파일 단위 처리, 코드 수정 없음).

- 성공: 59 / 59
- 실패: 0
- `git status`에는 59개의 `R (renamed)` 항목만 나타나고, 그 외 변경 없음(신규 파일은 이 보고서 자체뿐)

### 2) 이동 후 재검증

- **코드 참조 재검색**: 이동된 59개 경로 전체를 대상으로 `*.js/*.css/*.html`에서 재검색 → **일치 0건** (참조가 살아있던 파일은 애초에 이동 대상에서 제외했으므로 예상대로)
- **앱 실행 확인**: 로컬 정적 서버(`http://127.0.0.1:8877`)를 띄우고 Playwright(Chromium)로 실제 페이지를 구동
  - 로그인 화면 → Guest 로그인 → 튜토리얼 진행 여부 팝업 → 메인 화면까지 정상 렌더링 확인(스크린샷 확보)
  - 월영의 약속(월간 패스) 패널의 아이콘(`월영의 선물.png`, B등급이라 이동 안 함)도 정상 표시 — A등급 이동이 인접 B등급 자산에 영향 주지 않음을 재확인
  - 콘솔 에러: 2건 모두 `Failed to load resource: 406` — **Supabase 프로필/지갑 API 응답**(백엔드 인증 이슈)이며 이미지/정적 자산과 무관. 파일 이동 전에도 존재했을 문제로, 이번 작업과 인과관계 없음
  - **이미지/오디오 등 정적 자산에 대한 404는 0건**
- **교차 확인**: 이동된 파일과 베이스네임이 겹치는 "활성 버전" 파일들(`relic_potion_frame_common/rare/legendary/start.png`, `codex_section_panel.png`, `player-temp-cutout.png`, `cheongsim_pill.png`, `new_codex.png`, `codex_unknown_card.png`)이 여전히 정상적으로 로드되는지 개별 확인 → **전부 200 OK**
- 이동된 파일들은 원래 경로에서 사라졌고(파일시스템 확인), `backup_unused_assets/` 아래에 그대로 보존됨을 확인

### 3) 문제 추적

문제 발생 없음 — 되돌린 파일 없음.

### 4) 최종 이동 파일 목록 (59개, 58.37 MB)

위 "이동 대상 목록" 절의 7개 그룹(프로젝트 루트 스크린샷 3개, ui_panels 백업 5개, potion_icons 한글 30개, characters 임시 2개, ui_buttons 구버전 11개, ui/start_menu 구버전 4개, 기타 흔적 없음 4개)이 **그대로 전부 이동 완료**되었습니다. 목록이 곧 최종 이동 결과이며 추가/제외된 파일은 없습니다.

**복구 방법**: `backup_unused_assets/<경로>`의 파일을 원래 경로로 다시 옮기면 즉시 복원됩니다(예: `git mv backup_unused_assets/assets/potion_icons/청심환.png assets/potion_icons/청심환.png`). B/C등급 파일과 `assets/card_frames/`, `assets/card_art/`, `assets/audio/`, `assets/characters/dongjasin/`(동적 로딩 그룹)은 이번 작업에서 전혀 건드리지 않았습니다.
