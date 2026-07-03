"use strict";
/* =========================================================================
   엔딩/패배 연출 다이얼로그 데이터

   엑셀 v3 지시서의 씬 단위 대사와 선택지 문구만 보관한다.
   전투 요약 UI는 기존 runResult.js의 구현을 그대로 사용한다.
   ========================================================================= */

window.BOHYUN_RUN_RESULT_DATA = {
  ending: {
    labels: {
      spirit: "승리",
      dongja: "끝없는 여정",
      continue: "터치하여 계속"
    },
    spirits: [
      {
        id: "GENERAL_CHOE",
        name: "장군신 / 최영",
        image: "assets/spirits/guardian_spirit.png",
        emoji: "👻",
        blessingDialogue: "물러서지 않는 각오가 네 길을 지킬 것이다.",
        lines: [
          "끝까지 물러서지 않았구나.",
          "원혼을 성불시킨 것, 네가 쌓아 온 주문의 결과다.",
          "앞으로의 위령에서도, 네 각오를 지켜보겠다."
        ]
      },
      {
        id: "CHILSEONG",
        name: "칠성신 / 치성광여래",
        image: "assets/spirits/bond_spirit.png",
        emoji: "🧿",
        blessingDialogue: "별빛은 어둔 길에서도 네 걸음을 잊지 않는다.",
        lines: [
          "별의 흐름이 이 여정의 끝을 비추는구나.",
          "네가 지나온 길은 끝내 원혼을 성불로 이끌었다.",
          "남은 밤길에서도, 나는 너의 별을 지켜보겠다."
        ]
      },
      {
        id: "OGU_BARI",
        name: "오구신 / 바리데기",
        image: "assets/spirits/guide_spirit.png",
        emoji: "🏮",
        blessingDialogue: "떠도는 한을 건너게 할 마음을 잃지 말거라.",
        lines: [
          "그래, 끝내 그 한을 풀어냈구나.",
          "네가 쌓아 온 주문이 원혼의 길을 열어 주었다.",
          "앞으로의 위령에서도, 네 마음이 흐트러지지 않는지 지켜보마."
        ]
      }
    ],
    dongja: {
      name: "동자신",
      emoji: "🧒",
      lines: [
        "드디어 여정이 끝났네.",
        "아가, 이번 여정은 끝났지만 아직도 수많은 미련이 남았구나.",
        "아가, 이 끝없는 여정을 시작할래?"
      ]
    },
    choices: {
      exit: {
        title: "여정 종료",
        desc: "이번 여정을 마치고 전투 요약을 확인합니다."
      },
      infinite: {
        title: "끝없는 여정 진입",
        desc: "끝없는 여정으로 이어서 나아갑니다."
      }
    }
  },
  defeat: {
    label: "패배",
    speaker: "동자신",
    emoji: "🧒",
    mainLine: "어라? 벌써 끝이야?",
    subLine: "아가, 너무 서두른 거 아니야? 다음엔 더 멀리 가보자.",
    continue: "터치하여 계속"
  }
};
