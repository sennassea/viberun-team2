"use strict";

const TUTORIAL_DIALOGUE_DATA = [
  { id: "T-001", part: "안내", section: "안내창", condition: "신규 플레이어 / 튜토리얼 기록 없음", speaker: "시스템", text: "튜토리얼을 진행할까요?",purpose: "튜토리얼 진행 여부 선택", target: "튜토리얼 팝업" },
  { id: "T-002", part: "안내", section: "안내창", condition: "안내창 본문", speaker: "시스템", text: "동자신의 안내를 따라 첫 위령을 진행합니다.<br>진행하시겠습니까?",purpose: "튜토리얼 진입 안내", target: "튜토리얼 팝업 본문" },
  { id: "S-001", part: "스킵", section: "스킵", condition: "건너뛰기 선택", speaker: "동자신", text: "어라? 바로 가려고?<br>자신 있나 보네, 아가?",purpose: "스킵 선택 반응", target: "튜토리얼 스킵 확인" },
  { id: "S-002", part: "스킵", section: "스킵", condition: "S-001 이후", speaker: "시스템", text: "튜토리얼을 건너뛰었습니다.",purpose: "스킵 처리 결과 안내", target: "튜토리얼 스킵 안내" },
  { id: "M-001", part: "여정", section: "여정 화면 진입", condition: "진행하기 선택 후 여정 화면 표시", speaker: "동자신", text: "왔다 왔다!<br>아가, 여기가 앞으로 네가 길을 고르는 여정이야.",purpose: "동자신 등장 / 여정 화면 첫 안내", target: "여정 화면 전체" },
  { id: "M-002", part: "여정", section: "현재 위치 안내", condition: "현재 위치 강조", speaker: "동자신", text: "자, 먼저 여기 봐.<br>반짝이는 곳이 지금 네 위치야.",purpose: "현재 위치 설명", target: "현재 위치" },
  { id: "M-003", part: "여정", section: "현재 위치 안내", condition: "M-002 이후", speaker: "동자신", text: "길 잃은 척하면 바로 들킨다?<br>내가 생각보다 눈이 밝거든!",purpose: "캐릭터 톤 표현", target: "현재 위치" },
  { id: "M-004", part: "여정", section: "이동 가능 장소 안내", condition: "일반 장소 1개 강조", speaker: "동자신", text: "다음에 갈 수 있는 곳은 저기야.<br>처음부터 길이 많으면 아가 머리 아프잖아?",purpose: "선택 가능한 장소 안내", target: "미련이 느껴지는 곳" },
  { id: "M-005", part: "여정", section: "이동 가능 장소 안내", condition: "M-004 이후", speaker: "동자신", text: "이어진 길로만 갈 수 있어.<br>아무 데나 훌쩍 뛰어가는 건 안 돼.",purpose: "경로 선택 방식 설명", target: "연결선" },
  { id: "M-006", part: "여정", section: "범례 안내", condition: "범례 영역 전체 강조", speaker: "동자신", text: "그래도 앞으로는 갈 곳이 더 많아질 거야.<br>오른쪽 설명도 슬쩍 봐둬.",purpose: "범례 영역 안내", target: "범례 영역" },
  { id: "M-007", part: "여정", section: "범례 안내", condition: "M-006 이후", speaker: "동자신", text: "갈 곳마다 기다리는 일이 달라.<br>아무 데나 고르면 나중에 아가만 고생한다?",purpose: "장소별 의미 차이 설명", target: "범례 영역" },
  { id: "M-008", part: "여정", section: "기본 위령 범례", condition: "범례의 기본 위령 항목 강조", speaker: "동자신", text: "미련이 느껴지는 곳은 기본적인 위령이 필요한 곳이야.<br>처음엔 이런 곳부터 보는 게 좋아.",purpose: "일반 장소 설명", target: "범례: 미련이 느껴지는 곳" },
  { id: "M-009", part: "여정", section: "강한 위령 범례", condition: "범례의 고난도 위령 항목 강조", speaker: "동자신", text: "기운이 더 무거워 보이는 곳은 조심해야 해.<br>강한 미련이 느껴지는 곳이거든.",purpose: "고난도 장소 설명", target: "범례: 강한 미련이 느껴지는 곳" },
  { id: "M-010", part: "여정", section: "사건 범례", condition: "범례의 사건 항목 강조", speaker: "동자신", text: "뭔가 일이 생길 것 같은 곳도 있어.<br>좋은 일일 수도 있고, 귀찮은 일일 수도 있지.",purpose: "사건 장소 설명", target: "범례: 일이 생길 것 같은 곳" },
  { id: "M-011", part: "여정", section: "상점 범례", condition: "범례의 상점 항목 강조", speaker: "동자신", text: "필요한 걸 챙길 수 있는 곳도 있어.<br>약병이나 법구처럼 여정에 도움이 되는 것들이 있지.",purpose: "상점 설명", target: "범례: 필요한 걸 챙길 수 있는 곳" },
  { id: "M-012", part: "여정", section: "기도터 범례", condition: "범례의 기도터 항목 강조", speaker: "동자신", text: "잠깐 숨을 고를 수 있는 곳도 있어.<br>정신을 가다듬고 다시 갈 준비를 하는 거야.",purpose: "휴식 장소 설명", target: "범례: 잠깐 숨을 고를 수 있는 곳" },
  { id: "M-013", part: "여정", section: "마지막 목표 범례", condition: "범례의 마지막 목표 항목 강조", speaker: "동자신", text: "저 멀리엔 기운이 엄청 무거운 곳도 있어.<br>거대한 미련이 느껴지는 곳이지.",purpose: "보스 장소 설명", target: "범례: 거대한 미련이 느껴지는 곳" },
  { id: "M-014", part: "여정", section: "첫 장소 선택", condition: "일반 장소 재강조", speaker: "동자신", text: "자, 설명은 여기까지!<br>이제 저기로 가보자, 아가.",purpose: "첫 선택 유도", target: "미련이 느껴지는 곳" },
  { id: "M-015", part: "여정", section: "첫 장소 선택", condition: "M-014 이후", speaker: "동자신", text: "직접 눌러봐.<br>아가가 고르는 척은 해야지?",purpose: "조작 유도", target: "미련이 느껴지는 곳" },
  { id: "M-016", part: "여정", section: "선택 완료", condition: "일반 장소 선택 후", speaker: "동자신", text: "좋아, 그쪽으로 가는 거네.<br>그럼 이제 첫 위령을 시작해보자.",purpose: "위령 화면 전환 연결", target: "화면 전환" },
  { id: "W-001", part: "위령", section: "위령 화면 진입", condition: "위령 화면 표시", speaker: "동자신", text: "자, 아가.<br>여기서부터는 진짜 위령이야.",purpose: "위령 구간 시작", target: "위령 화면 전체" },
  { id: "W-002", part: "위령", section: "위령 화면 진입", condition: "W-001 이후", speaker: "동자신", text: "너무 긴장하지 마.<br>내가 옆에서 하나씩 알려줄게.",purpose: "안내역 역할 재확인", target: "동자신" },
  { id: "W-003", part: "위령", section: "위령 화면 진입", condition: "W-002 이후", speaker: "동자신", text: "근데 딴짓하면 바로 들킨다?<br>동자신 눈은 생각보다 밝거든!",purpose: "장난꾸러기 성격 표현", target: "동자신" },
  { id: "W-004", part: "위령", section: "유령 등장", condition: "유령 실루엣 등장", speaker: "동자신", text: "저기 봐, 아가.<br>흐릿하게 서 있는 거 보이지?",purpose: "유령 등장 시선 유도", target: "유령 실루엣" },
  { id: "W-005", part: "위령", section: "유령 등장", condition: "W-004 이후", speaker: "동자신", text: "저건 그냥 무서운 괴물이 아니야.<br>아직 못 떠난 유령이야.",purpose: "유령 개념 설명", target: "유령" },
  { id: "W-006", part: "위령", section: "유령 등장", condition: "W-005 이후", speaker: "동자신", text: "미련이 남아서 저렇게 맴도는 거야.<br>마음이 제대로 풀리지 않은 거지.",purpose: "유령이 남아 있는 이유 설명", target: "유령" },
  { id: "W-007", part: "위령", section: "유령 등장", condition: "W-006 이후", speaker: "동자신", text: "그러니까 막 혼내기만 하면 안 돼, 아가.<br>위령은 그렇게 하는 게 아니야.",purpose: "위령 목적 설명", target: "유령" },
  { id: "W-008", part: "위령", section: "기본 목표 안내", condition: "위령 UI 표시", speaker: "동자신", text: "주문으로 유령의 미련을 정화해보자.<br>무작정 때리는 거 아니니까 잘 봐.",purpose: "기본 목표 안내", target: "주문 / 유령의 미련" },
  { id: "W-009", part: "위령", section: "정신력 안내", condition: "정신력 UI 강조", speaker: "동자신", text: "먼저 이건 아가의 정신력이야.<br>마음이 버틸 수 있는 힘이라고 보면 돼.",purpose: "체력 개념 설명", target: "정신력 UI" },
  { id: "W-010", part: "위령", section: "정신력 안내", condition: "W-009 이후", speaker: "동자신", text: "정신력이 다 닳으면 위험해져.<br>그러니까 괜히 씩씩한 척만 하면 안 돼.",purpose: "패배 조건 안내", target: "정신력 UI" },
  { id: "W-011", part: "위령", section: "정신력 안내", condition: "W-010 이후", speaker: "동자신", text: "버티는 것도 좋지만,<br>쓰러지면 내가 놀릴 거야?",purpose: "귀엽게 경고", target: "정신력 UI" },
  { id: "W-012", part: "위령", section: "유령 미련 안내", condition: "유령의 미련 UI 강조", speaker: "동자신", text: "저쪽에 보이는 건 유령의 미련이야.<br>아가가 풀어줘야 할 마음이지.",purpose: "적 체력 개념 설명", target: "유령의 미련 UI" },
  { id: "W-013", part: "위령", section: "유령 미련 안내", condition: "W-012 이후", speaker: "동자신", text: "저 미련을 전부 정화하면,<br>유령은 더 이상 여기에 붙잡혀 있지 않아도 돼.",purpose: "승리 조건 안내", target: "유령의 미련 UI" },
  { id: "W-014", part: "위령", section: "유령 미련 안내", condition: "W-013 이후", speaker: "동자신", text: "없애는 게 아니야, 아가.<br>붙잡고 있던 걸 풀어주는 거야.",purpose: "위령 의미 강조", target: "유령" },
  { id: "W-015", part: "위령", section: "신통력 안내", condition: "신통력 UI 강조", speaker: "동자신", text: "주문을 쓰려면 신통력이 필요해.<br>힘 없이 주문만 외우면 폼만 나잖아?",purpose: "코스트 개념 도입", target: "신통력 UI" },
  { id: "W-016", part: "위령", section: "신통력 안내", condition: "W-015 이후", speaker: "동자신", text: "한 차례가 시작되면 기본 신통력은 3이야.<br>이걸 써서 주문을 펼치는 거지.",purpose: "기본 신통력 수치 설명", target: "신통력 UI" },
  { id: "W-017", part: "위령", section: "신통력 안내", condition: "W-016 이후", speaker: "동자신", text: "막 쓰면 금방 없어져.<br>그럼 아가, 멋있는 척만 하고 아무것도 못 한다?",purpose: "자원 관리 필요성 설명", target: "신통력 UI" },
  { id: "W-018", part: "위령", section: "신통력 안내", condition: "W-017 이후", speaker: "동자신", text: "나중엔 법구나 주문으로 신통력이 늘어나기도 해.<br>그건 지금 말하면 아가 머리 복잡해지니까 나중에!",purpose: "심화 요소 예고", target: "신통력 UI" },
  { id: "W-019", part: "위령", section: "정화 주문 학습", condition: "정화 주문 강조", speaker: "동자신", text: "좋아, 먼저 정화 주문부터 써보자.",purpose: "공격 역할 사용 유도", target: "정화 주문" },
  { id: "W-020", part: "위령", section: "정화 주문 학습", condition: "W-019 이후", speaker: "동자신", text: "정화 주문은 유령의 미련을 줄이는 주문이야.<br>그냥 때리는 거랑은 달라.",purpose: "정화 주문 역할 설명", target: "정화 주문" },
  { id: "W-021", part: "위령", section: "정화 주문 학습", condition: "W-020 이후", speaker: "동자신", text: "여기, 이 주문을 유령에게 써봐.<br>살살 말고, 똑바로!",purpose: "대상 선택 및 사용 유도", target: "정화 주문 → 유령" },
  { id: "W-022", part: "위령", section: "정화 성공 피드백", condition: "정화 주문 사용 후", speaker: "동자신", text: "오오, 제법인데?<br>유령의 미련이 줄었어.",purpose: "정화 성공 피드백", target: "유령의 미련 UI" },
  { id: "W-023", part: "위령", section: "정화 성공 피드백", condition: "W-022 이후", speaker: "동자신", text: "봤지?<br>주문을 쓰면 신통력이 줄고, 미련도 정화돼.",purpose: "주문 사용 결과 설명", target: "신통력 / 미련 UI" },
  { id: "W-024", part: "위령", section: "유령 행동 예고", condition: "유령 의도 UI 강조", speaker: "동자신", text: "앗, 아가.<br>저 유령이 뭔가 하려고 해.",purpose: "유령 행동 예고 인지", target: "유령 의도 UI" },
  { id: "W-025", part: "위령", section: "유령 행동 예고", condition: "W-024 이후", speaker: "동자신", text: "저기 보이는 기척이,<br>유령이 다음에 뭘 하려는지 알려주는 거야.",purpose: "행동 예고 설명", target: "유령 의도 UI" },
  { id: "W-026", part: "위령", section: "유령 행동 예고", condition: "W-025 이후", speaker: "동자신", text: "미리 보이면 미리 막으면 돼.<br>보고도 맞으면 그건 좀 창피하다?",purpose: "방어 판단 유도", target: "유령 의도 UI" },
  { id: "W-027", part: "위령", section: "결계 주문 학습", condition: "결계 주문 강조", speaker: "동자신", text: "이번엔 결계 주문을 써보자.",purpose: "방어 역할 사용 유도", target: "결계 주문" },
  { id: "W-028", part: "위령", section: "결계 주문 학습", condition: "W-027 이후", speaker: "동자신", text: "결계는 아가의 마음을 감싸주는 주문이야.<br>유령의 기운을 막아줄 수 있어.",purpose: "결계 주문 역할 설명", target: "결계 주문" },
  { id: "W-029", part: "위령", section: "결계 주문 학습", condition: "W-028 이후", speaker: "동자신", text: "정신력이 닳기 전에 둘러두는 게 좋아.<br>맞고 나서 후회하면 늦거든.",purpose: "방어 필요성 설명", target: "정신력 / 결계" },
  { id: "W-030", part: "위령", section: "결계 주문 학습", condition: "W-029 이후", speaker: "동자신", text: "자, 결계 주문 써봐.<br>이번엔 안 까먹겠지, 아가?",purpose: "결계 사용 유도", target: "결계 주문" },
  { id: "W-031", part: "위령", section: "결계 성공 피드백", condition: "결계 주문 사용 후", speaker: "동자신", text: "좋아 좋아!<br>마음에 결계가 둘러졌어.",purpose: "결계 성공 피드백", target: "플레이어 결계 효과" },
  { id: "W-032", part: "위령", section: "결계 성공 피드백", condition: "W-031 이후", speaker: "동자신", text: "이제 유령이 건드려도,<br>정신력이 바로 깎이진 않을 거야.",purpose: "결계 효과 설명", target: "정신력 / 결계" },
  { id: "W-033", part: "위령", section: "차례 넘기기 안내", condition: "사용할 주문이 없거나 신통력 부족", speaker: "동자신", text: "이번 차례에 할 건 거의 다 한 것 같네.",purpose: "턴 종료 상황 안내", target: "차례 넘기기 버튼" },
  { id: "W-034", part: "위령", section: "차례 넘기기 안내", condition: "W-033 이후", speaker: "동자신", text: "신통력이 부족하거나 더 쓸 주문이 없으면,<br>차례를 넘기면 돼.",purpose: "턴 종료 조건 설명", target: "차례 넘기기 버튼" },
  { id: "W-035", part: "위령", section: "차례 넘기기 안내", condition: "W-034 이후", speaker: "동자신", text: "차례를 넘기면 유령이 움직여.<br>준비됐으면 눌러봐, 아가.",purpose: "턴 종료 버튼 유도", target: "차례 넘기기 버튼" },
  { id: "W-036", part: "위령", section: "유령 행동 후", condition: "유령 행동 처리 후", speaker: "동자신", text: "봤지?<br>유령이 움직였어.",purpose: "적 턴 결과 확인", target: "유령" },
  { id: "W-037", part: "위령", section: "유령 행동 후", condition: "결계로 피해 감소 후", speaker: "동자신", text: "그래도 아까 결계를 둘러둔 덕분에,<br>정신력은 덜 닳았지.",purpose: "방어 효과 재확인", target: "정신력 / 결계" },
  { id: "W-038", part: "위령", section: "유령 행동 후", condition: "W-037 이후", speaker: "동자신", text: "헤헤, 내가 알려준 대로 하니까 괜찮았지?",purpose: "귀엽게 놀림", target: "동자신" },
  { id: "W-039", part: "위령", section: "조율 주문 학습", condition: "조율 주문 강조", speaker: "동자신", text: "이번엔 조율 주문을 볼 차례야.",purpose: "스킬 역할 사용 유도", target: "조율 주문" },
  { id: "W-040", part: "위령", section: "조율 주문 학습", condition: "W-039 이후", speaker: "동자신", text: "조율 주문은 바로 미련을 정화하거나,<br>결계를 두르는 주문은 아니야.",purpose: "조율 주문 구분", target: "조율 주문" },
  { id: "W-041", part: "위령", section: "조율 주문 학습", condition: "W-040 이후", speaker: "동자신", text: "대신 마음을 가다듬거나,<br>신통력을 되찾거나,<br>다음 주문을 이어가기 쉽게 해줘.",purpose: "스킬 효과 설명", target: "조율 주문" },
  { id: "W-042", part: "위령", section: "조율 주문 학습", condition: "W-041 이후", speaker: "동자신", text: "그러니까 조율은 잔꾀가 아니라 준비야.<br>아가처럼 덤벙대는 애한테 꼭 필요하지!",purpose: "조율 가치 설명", target: "조율 주문" },
  { id: "W-043", part: "위령", section: "조율 성공 피드백", condition: "조율 주문 사용 후", speaker: "동자신", text: "그렇지!<br>흐름이 조금 정돈됐어.",purpose: "조율 사용 피드백", target: "조율 효과" },
  { id: "W-044", part: "위령", section: "조율 성공 피드백", condition: "W-043 이후", speaker: "동자신", text: "위령은 힘만 세다고 되는 게 아니야.<br>언제 정화하고, 언제 지키고, 언제 가다듬을지 봐야 해.",purpose: "기본 판단 기준 설명", target: "전체 전투 흐름" },
  { id: "W-045", part: "위령", section: "반복 학습", condition: "유령 미련이 남아 있음", speaker: "동자신", text: "자, 이제 다시 유령의 미련을 정화해보자.",purpose: "정화 반복 유도", target: "유령의 미련 / 정화 주문" },
  { id: "W-046", part: "위령", section: "반복 학습", condition: "W-045 이후", speaker: "동자신", text: "아까보다 좀 알겠지?<br>모르겠어도 괜찮아. 손은 움직이면 돼!",purpose: "반복 학습 부담 완화", target: "전체" },
  { id: "W-047", part: "위령", section: "유령 약화 연출", condition: "유령 미련 감소 후", speaker: "동자신", text: "봐, 아가.<br>유령의 기운이 흐려지고 있어.",purpose: "체력 감소 시각화 설명", target: "유령" },
  { id: "W-048", part: "위령", section: "유령 약화 연출", condition: "W-047 이후", speaker: "동자신", text: "미련이 줄어드니까 붙잡는 힘도 약해진 거야.",purpose: "미련 감소 의미 설명", target: "유령" },
  { id: "W-049", part: "위령", section: "유령 약화 연출", condition: "W-048 이후", speaker: "동자신", text: "저 유령이 사납게 보이는 건,<br>마음이 오래 묶여 있었기 때문이야.",purpose: "세계관 설명 강화", target: "유령" },
  { id: "W-050", part: "위령", section: "유령 약화 연출", condition: "W-049 이후", speaker: "동자신", text: "이제 거의 다 풀렸어.<br>아가, 여기서 멍때리면 안 된다?",purpose: "마무리 유도", target: "유령의 미련" },
  { id: "W-051", part: "위령", section: "마무리 안내", condition: "유령 미련이 적게 남음", speaker: "동자신", text: "남은 미련만 정화하면 돼.<br>마지막이라고 손 놓으면 안 된다?",purpose: "마지막 행동 예고", target: "유령의 미련 / 정화 주문" },
  { id: "W-052", part: "위령", section: "마무리 안내", condition: "W-051 이후", speaker: "동자신", text: "마지막까지 집중해, 아가.<br>이번엔 나도 장난 안 칠게.",purpose: "진지한 마무리 분위기", target: "유령" },
  { id: "W-053", part: "위령", section: "성불 연출", condition: "유령 미련 0", speaker: "동자신", text: "됐다.",purpose: "처치 성공 시작", target: "유령" },
  { id: "W-054", part: "위령", section: "성불 연출", condition: "W-053 이후", speaker: "동자신", text: "묶여 있던 마음이 풀리고 있어.",purpose: "성불 과정 설명", target: "유령" },
  { id: "W-055", part: "위령", section: "성불 연출", condition: "W-054 이후", speaker: "동자신", text: "잘 봐둬, 아가.<br>이게 성불이야.",purpose: "결과 개념 안내", target: "유령" },
  { id: "W-056", part: "위령", section: "결과 출력", condition: "성불 연출 종료", speaker: "시스템", text: "혼을 인도했습니다.",purpose: "처치 결과 문구", target: "결과 문구" },
  { id: "W-057", part: "완료", section: "완료", condition: "결과 출력 후", speaker: "동자신", text: "잘했어, 아가.<br>첫 위령치고는 꽤 괜찮았어.",purpose: "완료 칭찬", target: "동자신" },
  { id: "W-058", part: "완료", section: "완료", condition: "W-057 이후", speaker: "동자신", text: "물론 내가 옆에서 알려줬으니까 당연하지만!",purpose: "장난기 표현", target: "동자신" },
  { id: "W-059", part: "완료", section: "완료", condition: "W-058 이후", speaker: "동자신", text: "앞으로 만날 유령들은 저마다 다른 미련을 가지고 있을 거야.",purpose: "이후 콘텐츠 예고", target: "전체" },
  { id: "W-060", part: "완료", section: "완료", condition: "W-059 이후", speaker: "동자신", text: "어떤 유령은 화가 나 있고,<br>어떤 유령은 겁먹고 있고,<br>어떤 유령은 자기가 왜 남았는지도 모를 거야.",purpose: "유령 다양성 설명", target: "전체" },
  { id: "W-061", part: "완료", section: "완료", condition: "W-060 이후", speaker: "동자신", text: "그래도 아가가 할 일은 크게 다르지 않아.",purpose: "핵심 목표 정리", target: "전체" },
  { id: "W-062", part: "완료", section: "완료", condition: "W-061 이후", speaker: "동자신", text: "주문을 쓰고, 마음을 지키고,<br>미련을 풀어서 길을 열어주는 것.",purpose: "플레이 목적 정리", target: "전체" },
  { id: "W-063", part: "완료", section: "완료", condition: "W-062 이후", speaker: "동자신", text: "자, 이제 진짜로 가보자.<br>내가 계속 지켜볼게.",purpose: "본 게임 진입 연결", target: "전체" }
];

const TUTORIAL_DONGJASIN_ASSET_BASE = "assets/characters/dongjasin/";
const TUTORIAL_DONGJASIN_ASSET_BY_ID = Object.freeze({
  "T-001": { cutId: "C-001", asset: "dgs_idle_default" },
  "T-002": { cutId: "C-001", asset: "dgs_idle_default" },
  "S-001": { cutId: "C-002", asset: "dgs_tease_smile" },
  "S-002": { cutId: "C-002", asset: "dgs_tease_smile" },
  "M-001": { cutId: "M-CUT-001", asset: "dgs_greeting_wave" },
  "M-002": { cutId: "M-CUT-002", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "M-003": { cutId: "M-CUT-002", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "M-004": { cutId: "M-CUT-003", asset: "dgs_guide_forward" },
  "M-005": { cutId: "M-CUT-003", asset: "dgs_guide_forward" },
  "M-006": { cutId: "M-CUT-004", asset: "dgs_present_open" },
  "M-007": { cutId: "M-CUT-004", asset: "dgs_present_open" },
  "M-008": { cutId: "M-CUT-005", asset: "dgs_point_up" },
  "M-009": { cutId: "M-CUT-006", asset: "dgs_plead_soft" },
  "M-010": { cutId: "M-CUT-007", asset: "dgs_surprised" },
  "M-011": { cutId: "M-CUT-008", asset: "dgs_present_open" },
  "M-012": { cutId: "M-CUT-009", asset: "dgs_serious_gentle" },
  "M-013": { cutId: "M-CUT-010", asset: "dgs_serious_gentle" },
  "M-014": { cutId: "M-CUT-011", asset: "dgs_guide_forward" },
  "M-015": { cutId: "M-CUT-011", asset: "dgs_guide_forward" },
  "M-016": { cutId: "M-CUT-012", asset: "dgs_cheer_big", altAsset: "dgs_guide_forward" },
  "W-001": { cutId: "W-CUT-001", asset: "dgs_greeting_wave", altAsset: "dgs_tease_smile" },
  "W-002": { cutId: "W-CUT-001", asset: "dgs_greeting_wave", altAsset: "dgs_tease_smile" },
  "W-003": { cutId: "W-CUT-001", asset: "dgs_greeting_wave", altAsset: "dgs_tease_smile" },
  "W-004": { cutId: "W-CUT-002", asset: "dgs_serious_gentle" },
  "W-005": { cutId: "W-CUT-002", asset: "dgs_serious_gentle" },
  "W-006": { cutId: "W-CUT-002", asset: "dgs_serious_gentle" },
  "W-007": { cutId: "W-CUT-002", asset: "dgs_serious_gentle" },
  "W-008": { cutId: "W-CUT-003", asset: "dgs_present_open" },
  "W-009": { cutId: "W-CUT-004", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-010": { cutId: "W-CUT-004", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-011": { cutId: "W-CUT-004", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-012": { cutId: "W-CUT-005", asset: "dgs_serious_gentle" },
  "W-013": { cutId: "W-CUT-005", asset: "dgs_serious_gentle" },
  "W-014": { cutId: "W-CUT-005", asset: "dgs_serious_gentle" },
  "W-015": { cutId: "W-CUT-006", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-016": { cutId: "W-CUT-006", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-017": { cutId: "W-CUT-006", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-018": { cutId: "W-CUT-006", asset: "dgs_point_up", altAsset: "dgs_tease_smile" },
  "W-019": { cutId: "W-CUT-007", asset: "dgs_guide_forward" },
  "W-020": { cutId: "W-CUT-007", asset: "dgs_guide_forward" },
  "W-021": { cutId: "W-CUT-007", asset: "dgs_guide_forward" },
  "W-022": { cutId: "W-CUT-008", asset: "dgs_cheer_big" },
  "W-023": { cutId: "W-CUT-008", asset: "dgs_cheer_big" },
  "W-024": { cutId: "W-CUT-009", asset: "dgs_surprised" },
  "W-025": { cutId: "W-CUT-009", asset: "dgs_surprised" },
  "W-026": { cutId: "W-CUT-009", asset: "dgs_surprised" },
  "W-027": { cutId: "W-CUT-010", asset: "dgs_plead_soft", altAsset: "dgs_guide_forward" },
  "W-028": { cutId: "W-CUT-010", asset: "dgs_plead_soft", altAsset: "dgs_guide_forward" },
  "W-029": { cutId: "W-CUT-010", asset: "dgs_plead_soft", altAsset: "dgs_guide_forward" },
  "W-030": { cutId: "W-CUT-010", asset: "dgs_plead_soft", altAsset: "dgs_guide_forward" },
  "W-031": { cutId: "W-CUT-011", asset: "dgs_cheer_big" },
  "W-032": { cutId: "W-CUT-011", asset: "dgs_cheer_big" },
  "W-033": { cutId: "W-CUT-012", asset: "dgs_guide_forward" },
  "W-034": { cutId: "W-CUT-012", asset: "dgs_guide_forward" },
  "W-035": { cutId: "W-CUT-012", asset: "dgs_guide_forward" },
  "W-036": { cutId: "W-CUT-013", asset: "dgs_cheer_big", altAsset: "dgs_tease_smile" },
  "W-037": { cutId: "W-CUT-013", asset: "dgs_cheer_big", altAsset: "dgs_tease_smile" },
  "W-038": { cutId: "W-CUT-013", asset: "dgs_cheer_big", altAsset: "dgs_tease_smile" },
  "W-039": { cutId: "W-CUT-014", asset: "dgs_present_open" },
  "W-040": { cutId: "W-CUT-014", asset: "dgs_present_open" },
  "W-041": { cutId: "W-CUT-014", asset: "dgs_present_open" },
  "W-042": { cutId: "W-CUT-014", asset: "dgs_present_open" },
  "W-043": { cutId: "W-CUT-015", asset: "dgs_cheer_big", altAsset: "dgs_serious_gentle" },
  "W-044": { cutId: "W-CUT-015", asset: "dgs_cheer_big", altAsset: "dgs_serious_gentle" },
  "W-045": { cutId: "W-CUT-016", asset: "dgs_guide_forward" },
  "W-046": { cutId: "W-CUT-016", asset: "dgs_guide_forward" },
  "W-047": { cutId: "W-CUT-017", asset: "dgs_serious_gentle" },
  "W-048": { cutId: "W-CUT-017", asset: "dgs_serious_gentle" },
  "W-049": { cutId: "W-CUT-017", asset: "dgs_serious_gentle" },
  "W-050": { cutId: "W-CUT-017", asset: "dgs_serious_gentle" },
  "W-051": { cutId: "W-CUT-018", asset: "dgs_plead_soft", altAsset: "dgs_serious_gentle" },
  "W-052": { cutId: "W-CUT-018", asset: "dgs_plead_soft", altAsset: "dgs_serious_gentle" },
  "W-053": { cutId: "W-CUT-019", asset: "dgs_serious_gentle" },
  "W-054": { cutId: "W-CUT-019", asset: "dgs_serious_gentle" },
  "W-055": { cutId: "W-CUT-019", asset: "dgs_serious_gentle" },
  "W-056": { cutId: "W-CUT-019", asset: "dgs_serious_gentle" },
  "W-057": { cutId: "W-CUT-020", asset: "dgs_cheer_big" },
  "W-058": { cutId: "W-CUT-020", asset: "dgs_cheer_big" },
  "W-059": { cutId: "W-CUT-021", asset: "dgs_serious_gentle", altAsset: "dgs_greeting_wave" },
  "W-060": { cutId: "W-CUT-021", asset: "dgs_serious_gentle", altAsset: "dgs_greeting_wave" },
  "W-061": { cutId: "W-CUT-021", asset: "dgs_serious_gentle", altAsset: "dgs_greeting_wave" },
  "W-062": { cutId: "W-CUT-021", asset: "dgs_serious_gentle", altAsset: "dgs_greeting_wave" },
  "W-063": { cutId: "W-CUT-021", asset: "dgs_serious_gentle", altAsset: "dgs_greeting_wave" },
});

TUTORIAL_DIALOGUE_DATA.forEach(dialogue => {
  const assetMeta = TUTORIAL_DONGJASIN_ASSET_BY_ID[dialogue.id];
  if(!assetMeta) return;
  dialogue.cutId = assetMeta.cutId;
  dialogue.dongjasinAsset = assetMeta.asset;
  dialogue.dongjasinAssetPath = TUTORIAL_DONGJASIN_ASSET_BASE + assetMeta.asset + ".png";
  if(assetMeta.altAsset){
    dialogue.dongjasinAltAsset = assetMeta.altAsset;
    dialogue.dongjasinAltAssetPath = TUTORIAL_DONGJASIN_ASSET_BASE + assetMeta.altAsset + ".png";
  }
});

const TUTORIAL_DIALOGUE_BY_ID = TUTORIAL_DIALOGUE_DATA.reduce((map, dialogue) => {
  map[dialogue.id] = dialogue;
  return map;
}, {});

function getTutorialDialogueById(id){
  return TUTORIAL_DIALOGUE_BY_ID[id] || null;
}

function getTutorialDialoguesByIds(ids){
  if(!Array.isArray(ids)) return [];
  return ids
    .map(getTutorialDialogueById)
    .filter(dialogue => dialogue !== null);
}

window.TUTORIAL_DIALOGUE_DATA = TUTORIAL_DIALOGUE_DATA;
window.TUTORIAL_DONGJASIN_ASSET_BY_ID = TUTORIAL_DONGJASIN_ASSET_BY_ID;
window.TUTORIAL_DONGJASIN_ASSET_BASE = TUTORIAL_DONGJASIN_ASSET_BASE;
window.getTutorialDialogueById = getTutorialDialogueById;
window.getTutorialDialoguesByIds = getTutorialDialoguesByIds;
