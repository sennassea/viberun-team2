"use strict";
/* =========================================================================
   Monster Data
   - Ghost data for memorial combat: lingering attachment, not extermination.
   - Map designers should call monsters by id/stage key instead of redefining data.
   ========================================================================= */
(function attachMonsterData(global){
  const data = global.BOHYUN_COMBAT_DATA = global.BOHYUN_COMBAT_DATA || {};

  const MONSTER_DEFS = [
    {
      id: "child_spirit",
      name: "이름표를 잃어버린 아이",
      family: "튜토리얼",
      image: "assets/monster/child_spirit.png",
      grade: "tutorial",
      roles: ["tutorial", "basicAttacker", "weakDebuffer", "defender"],
      maxHp: 34,
      x: 72,
      first: 0,
      moves: [
        { t: "attack", v: 5, name: "작은 울음", role: "normalAttack" },
        { t: "debuff", v: 1, name: "낯선 시선", role: "weak" },
        { t: "defend", v: 4, name: "책상 밑 숨기", role: "defense" },
        { t: "attack", v: 8, name: "손 내밀기", role: "specialAttack" }
      ]
    },
    {
      id: "child_spirit_lost",
      name: "놀이터를 헤매는 아이",
      family: "아이",
      image: "assets/monster/child_spirit_lost.png",
      grade: "normal",
      roles: ["basicAttacker"],
      maxHp: 28,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "attention", counterId: "neglect", maxStack: 2, hitFlag: "hitThisPlayerTurn" },
      counters: { neglect: 0 },
      moves: [
        { t: "attack", v: 5, name: "작은 훌쩍임", role: "normalAttack" },
        { t: "attack", v: 6, name: "모래 묻은 손", role: "normalAttack", counterDamage: { id: "neglect", per: 2, resetAfterUse: true } }, // TEMP_BALANCE
        { t: "defend", v: 3, name: "미끄럼틀 뒤 숨기", role: "defense" }
      ]
    },
    {
      id: "child_spirit_night",
      name: "밤 교실을 걷는 아이",
      family: "아이",
      image: "assets/monster/child_spirit_night.png",
      grade: "normal",
      roles: ["anxietyDebuffer", "basicAttacker"],
      maxHp: 28,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "anxietyLink" },
      moves: [
        { t: "attack", v: 4, name: "분필 긁는 소리", role: "normalAttack" },
        { t: "debuff", v: 1, name: "꺼진 교실등", role: "anxiety" },
        { t: "attack", v: 6, name: "차가운 손 내밀기", role: "normalAttack", conditionalDamage: { ifPlayerStatus: "anxiety", v: 8 } }, // TEMP_BALANCE
        { t: "defend", v: 3, name: "책상 뒤 숨기", role: "defense" }
      ]
    },
    {
      id: "child_spirit_underbed",
      name: "침대 밑에 숨은 아이",
      family: "아이",
      image: "assets/monster/child_spirit_underbed.png",
      grade: "normal",
      roles: ["defender", "tank"],
      maxHp: 36,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "defend", v: 8, name: "침대 밑 숨기", role: "defense", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self", fallbackValue: 5 },
        { t: "attack", v: 4, name: "병실 끝 발소리", role: "normalAttack" },
        { t: "defend", v: 5, name: "담요 끌어당기기", role: "defense", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self", fallbackValue: 5 },
        { t: "attack", v: 7, name: "갑작스런 울음", role: "specialAttack" }
      ]
    },
    {
      id: "child_spirit_swallowed",
      name: "그네 뒤의 아이",
      family: "아이",
      image: "assets/monster/child_spirit_swallowed.png",
      grade: "normal",
      roles: ["slowScaler", "burstWarning"],
      maxHp: 32,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "charge", counterId: "patience", maxStack: 3, blockBreakReduction: 1 },
      counters: { patience: 0 },
      moves: [
        { t: "attack", v: 3, name: "참은 훌쩍임", role: "normalAttack" },
        { t: "defend", v: 5, name: "그네줄 붙잡기", role: "defense", afterActionCounter: { id: "patience", op: "add", v: 1 } },
        { t: "attack", v: 10, name: "터져 나온 울음", role: "specialAttack", counterDamage: { id: "patience", per: 2, resetAfterUse: true } } // TEMP_BALANCE
      ]
    },
    {
      id: "child_spirit_window",
      name: "창가 자리의 아이",
      family: "아이",
      image: "assets/monster/child_spirit_window.png",
      grade: "elite",
      roles: ["burstWarning", "regretInjector"],
      maxHp: 52,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "question", sequence: ["attack", "nonAttack"], failStatusCard: "regret", failStatusCount: 1, burstCounterId: "wrongAnswer", burstPerStack: 2, maxStack: 2 }, // TEMP_BALANCE
      counters: { questionIndex: 0, wrongAnswer: 0 },
      moves: [
        { t: "attack", v: 9, name: "작은 울음", role: "normalAttack" },
        { t: "attack", v: 10, name: "공책 찢기", role: "normalAttack" },
        { t: "attack", v: 15, name: "창밖을 부르는 손", role: "specialAttack", statusCard: "regret", counterDamage: { id: "wrongAnswer", per: 2 } }, // TEMP_BALANCE
        { t: "defend", v: 6, name: "커튼 뒤 숨기", role: "defense" }
      ]
    },
    {
      id: "grandmother_spirit",
      name: "벤치의 옛 기억",
      family: "노인",
      image: "assets/monster/grandmother_spirit.png",
      grade: "normal",
      roles: ["defender", "weakDebuffer"],
      maxHp: 50,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "weak" },
        { t: "attack", v: 5, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 8, name: "그리움의 빛", role: "specialAttack" },
        { t: "defend", v: 9, name: "빛바랜 사진", role: "defense", conditionalTargetPolicy: { ifPlayerStatus: "weak", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self" } }
      ]
    },
    {
      id: "grandmother_spirit_memory",
      name: "사진을 품은 산책객",
      family: "노인",
      image: "assets/monster/grandmother_spirit_memory.png",
      grade: "normal",
      roles: ["deckClogger", "intrusiveThoughtInjector"],
      maxHp: 40,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "memoryClog", statusCard: "intrusive_thought", maxCount: 3 },
      moves: [
        { t: "debuff", v: 1, name: "낡은 사진 건네기", role: "anxiety" },
        { t: "attack", v: 5, name: "오래된 자장가", role: "normalAttack" },
        { t: "attack", v: 7, name: "잊힌 장면", role: "specialAttack", statusCard: "intrusive_thought", statusCardDamage: { statusCard: "intrusive_thought", per: 2, maxCount: 3 } }, // TEMP_BALANCE
        { t: "defend", v: 6, name: "사진 속으로 숨기", role: "defense", statusCardBlock: { statusCard: "intrusive_thought", per: 1, maxCount: 3 } } // TEMP_BALANCE
      ]
    },
    {
      id: "grandmother_spirit_dream",
      name: "교문 벤치의 노인",
      family: "노인",
      image: "assets/monster/grandmother_spirit_dream.png",
      grade: "normal",
      roles: ["weakDebuffer", "defender"],
      maxHp: 44,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "weak" },
        { t: "attack", v: 6, name: "느린 등교길", role: "normalAttack" },
        { t: "attack", v: 9, name: "그리움의 종소리", role: "specialAttack" },
        { t: "defend", v: 7, name: "교문에 기대기", role: "defense", conditionalTargetPolicy: { ifPlayerStatus: "weak", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self" } }
      ]
    },
    {
      id: "grandmother_spirit_visit",
      name: "병문안을 기다린 노인",
      family: "노인",
      image: "assets/monster/grandmother_spirit_visit.png",
      grade: "normal",
      roles: ["anxietyDebuffer", "statusPressure"],
      maxHp: 39,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "scaling", counterId: "waiting", maxStack: 3 },
      counters: { waiting: 0 },
      moves: [
        { t: "debuff", v: 1, name: "오지 않는 발걸음", role: "anxiety" },
        { t: "attack", v: 5, name: "낮은 한숨", role: "normalAttack", afterActionCounter: { id: "waiting", op: "add", v: 1 } },
        { t: "defend", v: 5, name: "병실 문에 기대기", role: "defense" },
        { t: "attack", v: 7, name: "외로운 손짓", role: "specialAttack", counterDamage: { id: "waiting", per: 2 }, afterActionCounter: { id: "waiting", op: "add", v: 1 } } // TEMP_BALANCE
      ]
    },
    {
      id: "grandmother_spirit_echo",
      name: "교가를 흥얼대는 노인",
      family: "노인",
      image: "assets/monster/grandmother_spirit_echo.png",
      grade: "elite",
      roles: ["defender", "weakDebuffer", "statusPressure"],
      maxHp: 66,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "echo", ratio: 0.5, minValue: 1, repeatStatusCard: false }, // TEMP_BALANCE
      moves: [
        { t: "debuff", v: 1, name: "잊혀진 이름", role: "weak" },
        { t: "attack", v: 8, name: "오래된 교가", role: "normalAttack" },
        { t: "attack", v: 11, name: "졸업식의 빛", role: "specialAttack" },
        { t: "defend", v: 12, name: "빛바랜 졸업사진", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit",
      name: "야간 병동 간호사",
      family: "간호사",
      image: "assets/monster/nurse_spirit.png",
      grade: "normal",
      roles: ["basicAttacker"],
      maxHp: 36,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "attack", v: 7, name: "분주한 호출", role: "normalAttack" },
        { t: "attack", v: 6, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 10, name: "긴급 돌봄", role: "specialAttack" },
        { t: "defend", v: 4, name: "차트 정리", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit_lamp",
      name: "스테이션의 간호사",
      family: "간호사",
      image: "assets/monster/nurse_spirit_lamp.png",
      grade: "normal",
      roles: ["defender", "hesitationInjector"],
      maxHp: 44,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "defend", v: 8, name: "차트 정리", role: "defense", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self" },
        { t: "attack", v: 6, name: "조심스런 처치", role: "normalAttack" },
        { t: "attack", v: 9, name: "긴급 돌봄", role: "specialAttack", statusCard: "hesitation" },
        { t: "defend", v: 6, name: "스테이션 정비", role: "defense" }
      ]
    },
    {
      id: "nurse_spirit_soft",
      name: "보건실 문턱의 교사",
      family: "교사",
      image: "assets/monster/nurse_spirit_soft.png",
      grade: "normal",
      roles: ["anxietyDebuffer", "support"],
      maxHp: 38,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "debuff", v: 1, name: "망설이는 출석 확인", role: "anxiety" },
        { t: "attack", v: 6, name: "조심스런 훈계", role: "normalAttack" },
        { t: "attack", v: 9, name: "보건실 호출", role: "specialAttack" },
        { t: "defend", v: 6, name: "출석부 정리", role: "defense", targetPolicy: "lowestHpRatioAlly", fallbackTarget: "self", conditionalValueBonus: { ifPlayerStatus: "anxiety", v: 2 } } // TEMP_BALANCE
      ]
    },
    {
      id: "nurse_spirit_callbell",
      name: "분실물 종을 든 관리인",
      family: "관리인",
      image: "assets/monster/nurse_spirit_callbell.png",
      grade: "normal",
      roles: ["summoner", "hesitationInjector"],
      maxHp: 34,
      x: 72,
      first: 0,
      patternMode: "fixed",
      summonConfig: { summonMonsterId: "lost_item_echo", summonGroup: "lost_item_echo", maxLivingSummons: 1, count: 1 },
      moves: [
        { t: "summon", v: 1, name: "분실물 종 울리기", role: "summon" },
        { t: "defend", v: 5, name: "벤치 아래 살피기", role: "defense" },
        { t: "attack", v: 5, name: "자갈길 발걸음", role: "normalAttack" },
        { t: "attack", v: 8, name: "관리실 호출", role: "specialAttack", statusCard: "hesitation" }
      ]
    },
    {
      id: "nurse_spirit_watch",
      name: "마지막 순찰의 생활지도 교사",
      family: "교사",
      image: "assets/monster/nurse_spirit_watch.png",
      grade: "elite",
      roles: ["lethargyDebuffer", "support", "basicAttacker"],
      maxHp: 58,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "discipline", threshold: 4, counterId: "discipline", maxStack: 2, triggerMoveRole: "normalAttack", burstDamage: 16, statusCard: "regret" }, // TEMP_BALANCE
      counters: { discipline: 0 },
      moves: [
        { t: "defend", v: 10, name: "복도 순찰", role: "defense" },
        { t: "attack", v: 10, name: "생활지도 손짓", role: "normalAttack" },
        { t: "attack", v: 14, name: "교무실 호출", role: "specialAttack" },
        { t: "debuff", v: 1, name: "야간 점호", role: "counter" }
      ]
    },
    {
      id: "patient_spirit_waiting",
      name: "진료를 기다리던 환자",
      family: "환자",
      image: "assets/monster/patient_spirit_waiting.png",
      grade: "normal",
      roles: ["anxietyDebuffer", "basicAttacker"],
      maxHp: 38,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "debuff", v: 1, name: "번지는 불안", role: "anxiety" },
        { t: "attack", v: 6, name: "불안한 중얼거림", role: "normalAttack" },
        { t: "attack", v: 8, name: "떨리는 손짓", role: "specialAttack", conditionalDamage: { ifPlayerStatus: "anxiety", v: 10 } },
        { t: "defend", v: 6, name: "담요 끌어안기", role: "defense" }
      ]
    },
    {
      id: "patient_spirit_iv",
      name: "분수대를 맴도는 환자",
      family: "환자",
      image: "assets/monster/patient_spirit_iv.png",
      grade: "normal",
      roles: ["deckClogger", "intrusiveThoughtInjector"],
      maxHp: 41,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "memoryLink", statusCard: "intrusive_thought", maxCount: 3 },
      moves: [
        { t: "debuff", v: 1, name: "엉킨 산책줄", role: "anxiety" },
        { t: "attack", v: 6, name: "흔들리는 걸음", role: "normalAttack" },
        { t: "attack", v: 8, name: "차가운 분수 물결", role: "specialAttack", statusCard: "intrusive_thought", statusCardDamage: { statusCard: "intrusive_thought", per: 2, maxCount: 3 } }, // TEMP_BALANCE
        { t: "defend", v: 5, name: "분수대 붙잡기", role: "defense" }
      ]
    },
    {
      id: "mother_spirit",
      name: "병실 문 앞의 보호자",
      family: "보호자",
      image: "assets/monster/mother_spirit.png",
      grade: "elite",
      roles: ["choicePressure", "regretInjector", "burstWarning"],
      maxHp: 56,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "attackRule", threshold: 3, counterId: "violation", maxStack: 2, triggerMoveRole: "normalAttack", triggerMoveName: "애타는 부름", burstDamage: 15, statusCard: "regret" },
      counters: { violation: 0 },
      moves: [
        { t: "attack", v: 9, name: "애타는 부름", role: "normalAttack" },
        { t: "defend", v: 6, name: "병실 앞 기다림", role: "defense" },
        { t: "attack", v: 10, name: "놓지 못한 손", role: "normalAttack" }
      ]
    },
    {
      id: "grandfather_spirit",
      name: "느티나무 아래의 노인",
      family: "노인",
      image: "assets/monster/grandfather_spirit.png",
      grade: "elite",
      roles: ["defender", "basicAttacker"],
      maxHp: 68,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "scaling", counterId: "years", maxStack: 3, afterActionAdd: 1, blockBreakReduction: 1 },
      counters: { years: 0 },
      moves: [
        { t: "attack", v: 9, name: "추억의 메아리", role: "normalAttack", counterDamage: { id: "years", per: 2 } }, // TEMP_BALANCE
        { t: "attack", v: 8, name: "오래된 산책 이야기", role: "normalAttack", counterDamage: { id: "years", per: 2 } }, // TEMP_BALANCE
        { t: "attack", v: 11, name: "가족을 부르는 바람", role: "specialAttack", counterDamage: { id: "years", per: 2 } }, // TEMP_BALANCE
        { t: "defend", v: 12, name: "나무 그늘의 약속", role: "defense", counterBlock: { id: "years", per: 2 } } // TEMP_BALANCE
      ]
    },
    {
      id: "doctor_spirit_intern",
      name: "출석부를 놓친 담임",
      family: "교사",
      image: "assets/monster/doctor_spirit_intern.png",
      grade: "normal",
      roles: ["basicAttacker", "burstWarning"],
      maxHp: 36,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "attack", v: 7, name: "서툰 호명", role: "normalAttack" },
        { t: "attack", v: 7, name: "빠른 생활기록", role: "normalAttack" },
        { t: "attack", v: 11, name: "급한 상담", role: "specialAttack", statusCard: "hesitation" },
        { t: "defend", v: 6, name: "출석부 확인", role: "defense" }
      ]
    },
    {
      id: "doctor_spirit",
      name: "회진을 멈추지 못한 의사",
      family: "의사",
      image: "assets/monster/doctor_spirit.png",
      grade: "elite",
      roles: ["burstWarning", "deckClogger"],
      maxHp: 54,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "statusLink", statusCard: "intrusive_accident", maxCount: 3 },
      moves: [
        { t: "attack", v: 6, name: "다급한 회진", role: "normalAttack", statusCard: "intrusive_accident" },
        { t: "defend", v: 7, name: "진료 준비", role: "defense" },
        { t: "attack", v: 15, name: "집중 진료", role: "specialAttack", statusCardDamage: { statusCard: "intrusive_accident", per: 2, maxCount: 3 } },
        { t: "attack", v: 9, name: "살피는 손길", role: "normalAttack" }
      ]
    },
    {
      id: "visitor_spirit_flower",
      name: "꽃다발을 든 방문객",
      family: "방문객",
      image: "assets/monster/visitor_spirit_flower.png",
      grade: "normal",
      roles: ["anxietyDebuffer", "hesitationInjector"],
      maxHp: 37,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "debuff", v: 1, name: "말라가는 꽃향기", role: "anxiety" },
        { t: "attack", v: 5, name: "조용한 문안", role: "normalAttack" },
        { t: "attack", v: 8, name: "놓고 간 편지", role: "specialAttack", conditionalStatusCard: { ifPlayerStatus: "anxiety", statusCard: "hesitation", statusCount: 1 } },
        { t: "defend", v: 6, name: "꽃다발 끌어안기", role: "defense" }
      ]
    },
    {
      id: "surgery_light_spirit",
      name: "수술등 아래의 그림자",
      family: "공간",
      image: "assets/monster/surgery_light_spirit.png",
      grade: "elite",
      roles: ["burstWarning", "deckClogger", "spaceControl"],
      maxHp: 60,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "handPressure", drawPenalty: 1 },
      moves: [
        { t: "drawPenalty", v: 1, name: "눈부신 수술등", role: "drawPenalty" },
        { t: "attack", v: 10, name: "차가운 절개음", role: "normalAttack" },
        { t: "defend", v: 6, name: "멈춘 수술대", role: "defense" },
        { t: "attack", v: 17, name: "하얀 빛의 압박", role: "specialAttack", statusCard: "intrusive_accident" }
      ]
    },
    {
      id: "fountain_reflection_spirit",
      name: "분수 속의 얼굴",
      family: "공간",
      image: "assets/monster/fountain_reflection_spirit.png",
      grade: "elite",
      roles: ["defender", "deckClogger", "anxietyDebuffer"],
      maxHp: 58,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "reflection", oncePerPlayerTurn: true, block: 6 }, // TEMP_BALANCE
      moves: [
        { t: "debuff", v: 1, name: "물결에 비친 이름", role: "anxiety" },
        { t: "attack", v: 8, name: "젖은 손짓", role: "normalAttack" },
        { t: "defend", v: 12, name: "분수의 장막", role: "defense" },
        { t: "attack", v: 12, name: "가라앉은 얼굴", role: "specialAttack", statusCard: "intrusive_thought" }
      ]
    },
    {
      id: "lost_picnic_spirit",
      name: "돗자리를 접지 못한 가족",
      family: "가족",
      image: "assets/monster/lost_picnic_spirit.png",
      grade: "elite",
      roles: ["regretInjector", "support"],
      maxHp: 62,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "emptySeat", counterId: "emptySeat", maxStack: 2 },
      counters: { emptySeat: 0 },
      moves: [
        { t: "defend", v: 10, name: "돗자리 펼치기", role: "defense", targetPolicy: "lowestHpAlly", fallbackTarget: "self" },
        { t: "attack", v: 9, name: "식은 도시락", role: "normalAttack" },
        { t: "debuff", v: 1, name: "돌아오지 않는 소풍", role: "anxiety" },
        { t: "attack", v: 14, name: "남겨진 웃음", role: "specialAttack", statusCard: "regret", counterDamage: { id: "emptySeat", per: 3, resetAfterUse: true } } // TEMP_BALANCE
      ]
    },
    {
      id: "locker_spirit",
      name: "사물함 속 속삭임",
      family: "공간",
      image: "assets/monster/locker_spirit.png",
      grade: "normal",
      roles: ["hesitationInjector", "anxietyDebuffer"],
      maxHp: 35,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "handLock", lockDuration: "nextPlayerTurnEnd" },
      moves: [
        { t: "debuff", v: 1, name: "사물함 속 이름표", role: "anxiety" },
        { t: "lock", v: 1, name: "철문 잠금", role: "lock" },
        { t: "attack", v: 5, name: "철문 두드림", role: "normalAttack" },
        { t: "attack", v: 8, name: "분실된 공책", role: "specialAttack", statusCard: "hesitation" },
        { t: "defend", v: 6, name: "닫힌 사물함", role: "defense" }
      ]
    },
    {
      id: "cafeteria_spirit",
      name: "급식실을 맴도는 아이",
      family: "아이",
      image: "assets/monster/cafeteria_spirit.png",
      grade: "normal",
      roles: ["basicAttacker", "anxietyDebuffer"],
      maxHp: 33,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "resourceRule", counterId: "leftover", maxStack: 2 },
      counters: { leftover: 0 },
      moves: [
        { t: "attack", v: 6, name: "식판 끌리는 소리", role: "normalAttack" },
        { t: "debuff", v: 1, name: "남겨진 자리", role: "anxiety" },
        { t: "attack", v: 8, name: "차가운 국그릇", role: "specialAttack", counterDamage: { id: "leftover", per: 3, resetAfterUse: true } }, // TEMP_BALANCE
        { t: "defend", v: 4, name: "배식대 뒤 숨기", role: "defense" }
      ]
    },
    {
      id: "ward_wraith",
      name: "비어 있는 404호",
      family: "공간",
      image: "assets/monster/ward_wraith.png",
      grade: "boss",
      roles: ["boss", "summoner", "spaceControl", "deckClogger", "anxietyDebuffer"],
      maxHp: 92,
      x: 72,
      first: 0,
      patternMode: "fixed",
      phaseConfig: {
        mode: "hpThresholdPatterns",
        thresholds: [64, 36], // TEMP_BALANCE
        phases: [
          {
            moves: [
              { t: "debuff", v: 1, name: "꺼지지 않는 형광등", role: "anxiety" },
              { t: "attack", v: 10, name: "커튼 뒤의 인기척", role: "normalAttack" },
              { t: "summon", v: 1, name: "빈 침대의 그림자", role: "summon" }
            ],
            summonConfig: { summonMonsterId: "empty_bed_shadow", summonGroup: "empty_bed_shadow", maxLivingSummons: 1, count: 1 }
          },
          {
            moves: [
              { t: "attack", v: 14, name: "병실이 닫히는 소리", role: "specialAttack", statusCard: "intrusive_accident" },
              { t: "debuff", v: 1, name: "꺼지지 않는 형광등", role: "anxiety" },
              { t: "summon", v: 1, name: "빈 침대의 그림자", role: "summon" }
            ],
            summonConfig: { summonMonsterId: "empty_bed_shadow", summonGroup: "empty_bed_shadow", maxLivingSummons: 2, count: 1 }
          },
          {
            moves: [
              { t: "attack", v: 18, name: "404호의 문", role: "burst", summonDamage: { group: "empty_bed_shadow", per: 2 }, statusCard: "intrusive_accident" }, // TEMP_BALANCE
              { t: "attack", v: 10, name: "커튼 뒤의 인기척", role: "normalAttack", summonDamage: { group: "empty_bed_shadow", per: 2 }, conditionalStatus: { role: "anxiety", v: 1 } }, // TEMP_BALANCE
              { t: "defend", v: 8, name: "빈 병상", role: "defense" }
            ],
            summonConfig: null
          }
        ]
      },
      summonConfig: { summonMonsterId: "empty_bed_shadow", summonGroup: "empty_bed_shadow", maxLivingSummons: 1, count: 1 },
      moves: [
        { t: "debuff", v: 1, name: "꺼지지 않는 형광등", role: "anxiety" },
        { t: "attack", v: 10, name: "커튼 뒤의 인기척", role: "normalAttack" },
        { t: "summon", v: 1, name: "빈 침대의 그림자", role: "summon" }
      ]
    },
    {
      id: "runner_spirit",
      name: "트랙을 달리던 사람",
      family: "주자",
      image: "assets/monster/runner_spirit.png",
      grade: "boss",
      roles: ["boss", "phaseShift", "burstWarning", "regretInjector"],
      maxHp: 84,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: { type: "lap", counterId: "speed", maxStack: 3, interruptThreshold: 18, phaseThresholds: [18, 22, 26] }, // TEMP_BALANCE
      counters: { speed: 0 },
      phaseConfig: {
        mode: "hpThresholdPatterns",
        thresholds: [56, 28], // TEMP_BALANCE
        phases: [
          { moves: [
            { t: "attack", v: 11, name: "멈추지 못한 출발", role: "normalAttack" },
            { t: "defend", v: 8, name: "숨 고르기", role: "charge" },
            { t: "attack", v: 15, name: "트랙 끝 질주", role: "specialAttack", speedBurst: { threshold: 3, damage: 22, reset: true } } // TEMP_BALANCE
          ] },
          { moves: [
            { t: "attack", v: 12, name: "비틀린 보폭", role: "normalAttack" },
            { t: "debuff", v: 1, name: "잃어버린 트랙", role: "anxiety" },
            { t: "attack", v: 17, name: "트랙 끝 질주", role: "specialAttack", speedBurst: { threshold: 3, damage: 24, reset: true } } // TEMP_BALANCE
          ] },
          { moves: [
            { t: "attack", v: 13, name: "멈추지 못한 출발", role: "normalAttack" },
            { t: "attack", v: 15, name: "비틀린 보폭", role: "normalAttack" },
            { t: "attack", v: 20, name: "마지막 질주", role: "burst", statusCard: "regret", speedBurst: { threshold: 3, damage: 28, reset: true } } // TEMP_BALANCE
          ] }
        ]
      },
      moves: [
        { t: "attack", v: 11, name: "멈추지 못한 출발", role: "normalAttack" },
        { t: "defend", v: 8, name: "숨 고르기", role: "charge" },
        { t: "attack", v: 15, name: "트랙 끝 질주", role: "specialAttack" }
      ]
    },
    {
      id: "blank_exam_wraith",
      name: "백지 시험지",
      family: "시험",
      image: "assets/monster/blank_exam_wraith.png",
      grade: "boss",
      roles: ["boss", "deckClogger", "hesitationInjector", "regretInjector", "statusPressure"],
      maxHp: 90,
      x: 72,
      first: 0,
      patternMode: "fixed",
      gimmick: {
        type: "exam",
        thresholds: [60, 30], // TEMP_BALANCE
        sequences: [
          [{ mode: "require", types: ["attack"], failStatusCards: ["hesitation"] }, { mode: "require", types: ["nonAttack"], failStatusCards: ["hesitation"] }],
          [{ mode: "forbid", types: ["attack"], failStatusCards: ["regret"] }, { mode: "forbid", types: ["nonAttack"], failStatusCards: ["regret"] }],
          [{ mode: "require", types: ["attack"], failStatusCards: ["hesitation", "regret"] }, { mode: "require", types: ["nonAttack"], failStatusCards: ["hesitation", "regret"] }, { mode: "requireAll", types: ["attack", "nonAttack"], failStatusCards: ["hesitation", "regret"] }]
        ],
        finisherStatusCards: ["hesitation", "regret"],
        finisherPerStatus: 2,
        finisherMaxCount: 5
      },
      counters: { examIndex: 0 },
      phaseConfig: {
        mode: "hpThresholdPatterns",
        thresholds: [60, 30], // TEMP_BALANCE
        phases: [
          { moves: [
            { t: "exam", name: "시험 시작", role: "exam" },
            { t: "attack", v: 9, name: "빈칸의 시선", role: "normalAttack", statusCard: "hesitation" },
            { t: "defend", v: 12, name: "답안지 접기", role: "defense" }
          ] },
          { moves: [
            { t: "exam", name: "금지 문항", role: "exam" },
            { t: "attack", v: 13, name: "붉은 채점", role: "specialAttack" },
            { t: "defend", v: 12, name: "답안지 접기", role: "defense" }
          ] },
          { moves: [
            { t: "exam", name: "백지 문항", role: "exam" },
            { t: "exam", name: "백지 문항", role: "exam" },
            { t: "attack", v: 17, name: "백지 제출", role: "burst", statusCard: "regret", statusCardDamage: { statusCards: ["hesitation", "regret"], per: 2, maxCount: 5 } } // TEMP_BALANCE
          ] }
        ]
      },
      moves: [
        { t: "exam", name: "시험 시작", role: "exam" },
        { t: "attack", v: 9, name: "빈칸의 시선", role: "normalAttack", statusCard: "hesitation" },
        { t: "defend", v: 12, name: "답안지 접기", role: "defense" },
        { t: "attack", v: 13, name: "붉은 채점", role: "specialAttack" },
        { t: "attack", v: 17, name: "백지 제출", role: "burst", statusCard: "regret" }
      ]
    },
    {
      id: "empty_bed_shadow",
      name: "빈 침대의 그림자",
      family: "그림자",
      emoji: "🛏️",
      grade: "summon",
      roles: ["summon", "anxietyDebuffer"],
      maxHp: 12,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "attack", v: 4, name: "침대 밑 손짓", role: "normalAttack" },
        { t: "debuff", v: 1, name: "빈 병상", role: "anxiety" }
      ]
      // TODO: 전용 이미지 에셋 확정 전까지 emoji fallback 사용
    },
    {
      id: "lost_item_echo",
      name: "분실물의 잔상",
      family: "잔상",
      emoji: "🎒",
      grade: "summon",
      roles: ["summon", "hesitationInjector"],
      maxHp: 10,
      x: 72,
      first: 0,
      patternMode: "fixed",
      moves: [
        { t: "attack", v: 3, name: "작은 흔들림", role: "normalAttack" },
        { t: "attack", v: 3, name: "망설이는 울림", role: "normalAttack", statusCard: "hesitation" }
      ],
      runtimeFlags: { expireAfterActions: 2 }
      // TODO: 전용 이미지 에셋 확정 전까지 emoji fallback 사용
    }
  ];

  const ENCOUNTERS = [
    { id: "stage_tutorial_child_spirit", label: "튜토리얼 - 이름표를 잃어버린 아이", monsterIds: ["child_spirit"] },
    { id: "stage_grandmother_spirit", label: "벤치의 옛 기억", monsterIds: ["grandmother_spirit"] },
    { id: "stage_nurse_spirit", label: "야간 병동 간호사", monsterIds: ["nurse_spirit"] },
    { id: "stage_mother_spirit", label: "병실 문 앞의 보호자", monsterIds: ["mother_spirit"] },
    { id: "stage_grandfather_spirit", label: "느티나무 아래의 노인", monsterIds: ["grandfather_spirit"] },
    { id: "stage_doctor_spirit", label: "회진을 멈추지 못한 의사", monsterIds: ["doctor_spirit"] },
    { id: "stage_ward_wraith", label: "비어 있는 404호", monsterIds: ["ward_wraith"] },
    { id: "stage_runner_spirit", label: "트랙을 달리던 사람", monsterIds: ["runner_spirit"] },
    { id: "stage_blank_exam_wraith", label: "백지 시험지", monsterIds: ["blank_exam_wraith"] }
  ];

  const MONSTER_THEME_BY_ID = {
    // 병원: 병동, 의료진, 병실 공간 중심
    child_spirit_underbed: "hospital",
    grandmother_spirit_visit: "hospital",
    nurse_spirit: "hospital",
    nurse_spirit_lamp: "hospital",
    patient_spirit_waiting: "hospital",
    mother_spirit: "hospital",
    doctor_spirit: "hospital",
    visitor_spirit_flower: "hospital",
    surgery_light_spirit: "hospital",
    ward_wraith: "hospital",

    // 공원: 산책, 기억, 기다림처럼 외부 공간에 어울리는 정서 중심
    child_spirit_lost: "park",
    child_spirit_swallowed: "park",
    grandmother_spirit: "park",
    grandmother_spirit_memory: "park",
    patient_spirit_iv: "park",
    grandfather_spirit: "park",
    nurse_spirit_callbell: "park",
    fountain_reflection_spirit: "park",
    lost_picnic_spirit: "park",
    runner_spirit: "park",

    // 학교: 아이, 보호자, 기다림 중심
    child_spirit: "school",
    child_spirit_night: "school",
    child_spirit_window: "school",
    grandmother_spirit_dream: "school",
    grandmother_spirit_echo: "school",
    nurse_spirit_watch: "school",
    nurse_spirit_soft: "school",
    doctor_spirit_intern: "school",
    locker_spirit: "school",
    cafeteria_spirit: "school",
    blank_exam_wraith: "school"
  };

  const MONSTER_THEME_LABELS = {
    hospital: "병원",
    park: "공원",
    school: "학교"
  };

  const clonePlain = value => {
    if(Array.isArray(value)) return value.map(clonePlain);
    if(value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePlain(item)]));
    return value;
  };
  const cloneMoveList = moves => Array.isArray(moves) ? moves.map(move => clonePlain(move)) : [];
  const clonePhase = phase => phase ? ({
    ...phase,
    moves: cloneMoveList(phase.moves)
  }) : null;
  const cloneMonster = monster => ({
    ...monster,
    theme: monster.theme || MONSTER_THEME_BY_ID[monster.id] || "hospital",
    themeLabel: MONSTER_THEME_LABELS[monster.theme || MONSTER_THEME_BY_ID[monster.id] || "hospital"],
    roles: Array.isArray(monster.roles) ? [...monster.roles] : undefined,
    moves: cloneMoveList(monster.moves),
    gimmick: clonePlain(monster.gimmick),
    counters: clonePlain(monster.counters),
    phaseConfig: clonePlain(monster.phaseConfig),
    summonConfig: clonePlain(monster.summonConfig),
    phases: Array.isArray(monster.phases) ? monster.phases.map(clonePhase) : undefined,
    nextPhase: clonePhase(monster.nextPhase)
  });

  data.monsterCatalog = MONSTER_DEFS.reduce((catalog, monster) => {
    catalog[monster.id] = cloneMonster(monster);
    return catalog;
  }, {});

  data.monsterGroups = MONSTER_DEFS.reduce((groups, monster) => {
    groups[monster.grade] = groups[monster.grade] || [];
    groups[monster.grade].push(monster.id);
    return groups;
  }, { tutorial: [], normal: [], elite: [], boss: [] });

  data.monsterThemes = MONSTER_DEFS.reduce((themes, monster) => {
    const theme = MONSTER_THEME_BY_ID[monster.id] || "hospital";
    themes[theme] = themes[theme] || [];
    themes[theme].push(monster.id);
    return themes;
  }, { hospital: [], park: [], school: [] });

  data.monsterThemeGroups = MONSTER_DEFS.reduce((themes, monster) => {
    const theme = MONSTER_THEME_BY_ID[monster.id] || "hospital";
    themes[theme] = themes[theme] || { tutorial: [], normal: [], elite: [], boss: [] };
    themes[theme][monster.grade] = themes[theme][monster.grade] || [];
    themes[theme][monster.grade].push(monster.id);
    return themes;
  }, {
    hospital: { tutorial: [], normal: [], elite: [], boss: [] },
    park: { tutorial: [], normal: [], elite: [], boss: [] },
    school: { tutorial: [], normal: [], elite: [], boss: [] }
  });

  data.monsterThemeLabels = { ...MONSTER_THEME_LABELS };

  data.monsterEncounters = ENCOUNTERS.reduce((encounters, encounter) => {
    encounters[encounter.id] = {
      ...encounter,
      monsterIds: [...encounter.monsterIds]
    };
    return encounters;
  }, {});
  data.monsterEncounters.stage_child_spirit = {
    ...data.monsterEncounters.stage_tutorial_child_spirit,
    id: "stage_child_spirit"
  };

  data.monsterStageIds = ENCOUNTERS.map(encounter => [...encounter.monsterIds]);
  data.monsterStages = ENCOUNTERS.map(encounter => ({
    id: encounter.id,
    label: encounter.label,
    monsterIds: [...encounter.monsterIds],
    getMonsters(){
      return data.getEncounterMonsters(encounter.id);
    }
  }));

  data.getMonsterById = function getMonsterById(id){
    const monster = this.monsterCatalog[id];
    return monster ? cloneMonster(monster) : null;
  };

  data.getMonstersByIds = function getMonstersByIds(ids){
    if(!Array.isArray(ids)) return [];
    return ids.map(id => this.getMonsterById(id)).filter(Boolean);
  };

  data.getMonstersByGrade = function getMonstersByGrade(grade){
    return this.getMonstersByIds(this.monsterGroups[grade] || []);
  };

  data.getMonstersByTheme = function getMonstersByTheme(theme){
    return this.getMonstersByIds(this.monsterThemes[theme] || []);
  };

  data.getMonstersByThemeAndGrade = function getMonstersByThemeAndGrade(theme, grade){
    const group = this.monsterThemeGroups[theme];
    return this.getMonstersByIds(group ? (group[grade] || []) : []);
  };

  data.getEncounterMonsters = function getEncounterMonsters(encounterId){
    const encounter = this.monsterEncounters[encounterId];
    return encounter ? this.getMonstersByIds(encounter.monsterIds) : [];
  };

  data.getStageMonsters = function getStageMonsters(stageKey){
    if(typeof stageKey === "string"){
      return this.getEncounterMonsters(stageKey);
    }
    return this.getMonstersByIds(this.monsterStageIds[stageKey] || []);
  };

  data.monsters = MONSTER_DEFS.map(cloneMonster);

  data.monsterPatternSystem = {
    countResolvedIntent(monster){
      if(!monster || !monster.intent) return;

      const intentType = monster.intent.t;
      if(monster.lastIntentType === intentType){
        monster.intentRepeatCount = (monster.intentRepeatCount || 1) + 1;
      }
      else {
        monster.lastIntentType = intentType;
        monster.intentRepeatCount = 1;
      }
    },

    pickNextIntent(monster){
      if(!monster || monster.hp <= 0 || !Array.isArray(monster.moves) || monster.moves.length === 0){
        return null;
      }

      if(monster.patternMode === "fixed"){
        const index = typeof monster.patternIndex === "number" ? monster.patternIndex : 0;
        const intent = monster.moves[index % monster.moves.length];
        monster.patternIndex = (index + 1) % monster.moves.length;
        return intent;
      }

      const isBoss = monster.grade === "boss";
      const burstMoves = monster.moves.filter(move => move.role === "burst");
      if(isBoss && monster.lastIntentType === "defend" && burstMoves.length > 0){
        return burstMoves[Math.floor(Math.random() * burstMoves.length)];
      }

      const limitedGrades = ["tutorial", "normal", "elite"];
      const shouldLimitRepeat = limitedGrades.includes(monster.grade);
      const blockedTypes = new Set();

      if(monster.lastIntentType === "defend"){
        blockedTypes.add("defend");
      }
      if(shouldLimitRepeat && monster.lastIntentType && (monster.intentRepeatCount || 0) >= 2){
        blockedTypes.add(monster.lastIntentType);
      }

      const candidates = monster.moves.filter(move => {
        if(blockedTypes.has(move.t)) return false;
        if(isBoss && move.role === "burst") return false;
        if(move.requiresPrevious && move.requiresPrevious !== monster.lastIntentType) return false;
        return true;
      });
      const pool = candidates.length > 0 ? candidates : monster.moves;

      return pool[Math.floor(Math.random() * pool.length)];
    },

    planNextIntent(monster){
      if(!monster) return null;
      this.countResolvedIntent(monster);
      monster.intent = this.pickNextIntent(monster);
      return monster.intent;
    }
  };
})(window);
