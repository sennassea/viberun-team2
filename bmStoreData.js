"use strict";

/* =========================================================================
   BM Store Data
   - 월영당 1차 구현에서 사용하는 상품/탭 정적 데이터입니다.
   - UI와 구매 서비스는 이 데이터만 읽고, 상품명/가격/보상 ID를 직접 하드코딩하지 않습니다.
   - 주문 팩도 패키지와 같은 더미 아이템 구매 구조를 사용하며, 실제 게임 보상과 연결하지 않습니다.
   ========================================================================= */
(function(){
  const TABS = [
    {
      id: "recommended",
      label: "추천",
      enabled: true,
      readyMessage: ""
    },
    {
      id: "package",
      label: "스킨",
      enabled: true,
      readyMessage: ""
    },
    {
      id: "order_pack",
      label: "주문 팩",
      enabled: true,
      readyMessage: ""
    },
    {
      id: "moon_charge",
      label: "달빛조각 충전",
      enabled: true,
      readyMessage: ""
    }
  ];

  /* 기존 패키지 상품입니다. 스킨 탭 1차 구현으로 더 이상 노출하지 않지만,
     추후 복원 가능성을 위해 데이터는 삭제하지 않고 주석 처리합니다.
  const PACKAGE_PRODUCTS = [
    {
      id: "starter_pack",
      tab: "package",
      name: "초심자 스타터 팩",
      priceType: "moon_shard",
      price: 7500,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_starter_pack",
      rewardId: "dummy_starter_pack",
      description: "지금 시작하면 모험이 더욱 특별해집니다.",
      recommended: true,
      recommendOrder: 10,
      recommendBadge: "첫 구매 추천"
    },
    {
      id: "growth_package",
      tab: "package",
      name: "성장 패키지",
      priceType: "moon_shard",
      price: 2980,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_growth_package",
      rewardId: "dummy_growth_package",
      description: "성장에 필요한 물품이 담긴 패키지입니다."
    },
    {
      id: "rare_package",
      tab: "package",
      name: "희귀 장신 패키지",
      priceType: "moon_shard",
      price: 6500,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_rare_package",
      rewardId: "dummy_rare_package",
      description: "희귀한 장신구가 담긴 패키지입니다."
    },
    {
      id: "spring_blessing_box",
      tab: "package",
      name: "봄날의 축복 상자",
      priceType: "moon_shard",
      price: 2400,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_spring_blessing_box",
      rewardId: "dummy_spring_blessing_box",
      badge: "20% OFF",
      description: "계절 한정 축복 상자입니다.",
      recommended: true,
      recommendOrder: 20,
      recommendBadge: "20% OFF"
    }
  ];
  */

  /* 스킨 탭 캐릭터 스킨 상품 3종입니다. 배치 순서는 한정 → 프리미엄 → 일반이며,
     달빛서약☆마법무녀만 45일 한정 판매 기간(saleStartAt/saleEndAt)이 적용됩니다.
     스킨은 구매 즉시 지급되지 않고 선물함 수령 시에만 보유 처리됩니다. */
  const CHARACTER_SKIN_PRODUCTS = [
    {
      id: "skin_limited_moonlight_vow_magic_maiden",
      tab: "package",
      name: "달빛서약☆마법무녀",
      skinTypeName: "마법소녀 스킨",
      grade: "limited",
      gradeLabel: "한정",
      priceType: "moon_shard",
      price: 1500,
      rewardType: "character_skin",
      skinId: "moonlight_vow_magic_maiden",

      description: "달빛 아래 맺은 서약을 품은 한정 마법무녀 의상입니다. 판매 기간: 2026.07.06 ~ 2026.08.19 23:59",
      saleStartAt: "2026-07-06T00:00:00+09:00",
      saleEndAt: "2026-08-20T00:00:00+09:00",
      salePeriodText: "판매 기간: 2026.07.06 ~ 2026.08.19 23:59",

      badge: "한정",
      sortOrder: 1,
      imageKey: "skin_limited_moonlight_vow_magic_maiden",
      previewImage: "assets/skins/skin_limited_moonlight_vow_magic_maiden.png",

      profileIcon: "assets/profile/profile_limited_moonlight_vow_magic_maiden.png",
      profileSortOrder: 1,
      profileLabel: "달빛서약☆마법무녀",

      purchasable: true,
      dimmed: false
    },
    {
      id: "skin_premium_wolyeong_academy_transfer",
      tab: "package",
      name: "월영학당 전학생",
      skinTypeName: "교복 스킨",
      grade: "premium",
      gradeLabel: "프리미엄",
      priceType: "moon_shard",
      price: 1000,
      rewardType: "character_skin",
      skinId: "wolyeong_academy_transfer",

      description: "월영학당에 새로 찾아온 전학생 의상입니다.",
      badge: "프리미엄",
      sortOrder: 2,
      imageKey: "skin_premium_wolyeong_academy_transfer",
      previewImage: "assets/skins/skin_premium_wolyeong_academy_transfer.png",

      profileIcon: "assets/profile/profile_premium_wolyeong_academy_transfer.png",
      profileSortOrder: 2,
      profileLabel: "월영학당 전학생",

      purchasable: true,
      dimmed: false
    },
    {
      id: "skin_common_prayer_robe",
      tab: "package",
      name: "백성의 기도복",
      skinTypeName: "수녀복 스킨",
      grade: "common",
      gradeLabel: "일반",
      priceType: "moon_shard",
      price: 700,
      rewardType: "character_skin",
      skinId: "common_prayer_robe",

      description: "백성을 위해 조용히 기도하는 소박한 의상입니다.",
      badge: "일반",
      sortOrder: 3,
      imageKey: "skin_common_prayer_robe",
      previewImage: "assets/skins/skin_common_prayer_robe.png",

      profileIcon: "assets/profile/profile_common_prayer_robe.png",
      profileSortOrder: 3,
      profileLabel: "백성의 기도복",

      purchasable: true,
      dimmed: false
    }
  ];

  /* 주문 팩 탭 상품 4종입니다. 패키지 탭과 동일한 카드 UI/구매 로직을 그대로 재사용하며,
     보상은 실제 플레이에 영향을 주지 않는 더미 아이템(dummyRewardId)만 지급합니다. */
  const ORDER_PACK_PRODUCTS = [
    {
      id: "order_pack_summon_charm",
      tab: "order_pack",
      name: "소환 부적 팩",
      priceType: "moon_shard",
      price: 1000,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_summon_charm_pack",
      rewardId: "dummy_summon_charm_pack",
      description: "소환을 바꾸는 주문 부적",
      limitText: "매일 1회",
      icon: "📜",
      recommended: true,
      recommendOrder: 30,
      recommendBadge: "매일 추천"
    },
    {
      id: "order_pack_soul_charm",
      tab: "order_pack",
      name: "영혼 부적 팩",
      priceType: "moon_shard",
      price: 2000,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_soul_charm_pack",
      rewardId: "dummy_soul_charm_pack",
      description: "영혼을 모으는 주문 부적",
      limitText: "매일 1회",
      icon: "📜"
    },
    {
      id: "order_pack_divine_charm",
      tab: "order_pack",
      name: "신력 부적 팩",
      priceType: "moon_shard",
      price: 3000,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_divine_charm_pack",
      rewardId: "dummy_divine_charm_pack",
      description: "강력한 인연 소환 주문 부적",
      limitText: "주간 2회",
      icon: "📜"
    },
    {
      id: "order_pack_legend_support",
      tab: "order_pack",
      name: "전설 보조 팩",
      priceType: "moon_shard",
      price: 10000,
      rewardType: "dummy_item",
      dummyRewardId: "dummy_legend_support_pack",
      rewardId: "dummy_legend_support_pack",
      description: "전설 등급 신력 확정 소환",
      limitText: "월간 1회",
      icon: "📜"
    }
  ];

  /* 추천 탭 최상단/좌측 메인 상품인 월영의 약속(30일 출석 상품)입니다.
     구매는 test_cash(테스트 결제)이며, 즉시 지급/매일 지급 모두 선물함 수령 시에만 이뤄집니다. */
  const MONTHLY_PASS_PRODUCTS = [
    {
      id: "monthly_moon_promise",
      tab: "recommended",
      name: "월영의 약속",
      subtitle: "30일 출석 상품",

      priceType: "test_cash",
      price: 5900,
      priceLabel: "₩5,900",

      rewardType: "monthly_pass",

      immediateRewardType: "moon_shard",
      immediateRewardAmount: 100,

      dailyRewardType: "moon_shard",
      dailyRewardAmount: 15,

      durationDays: 30,
      totalRewardAmount: 550,

      description: "30일 동안 매일 달빛조각을 받을 수 있습니다.",
      limitText: "즉시 100개 + 매일 15개 × 30일",
      detailLines: [
        "즉시 100 달빛 조각",
        "매일 15 × 30일",
        "총 550 달빛 조각"
      ],

      icon: "🌙",
      imageKey: "monthly_moon_promise",

      recommended: true,
      recommendOrder: 1,
      recommendBadge: "30일 출석 상품",

      layoutType: "monthly_pass_main",
      purchasable: true,
      dimmed: false
    }
  ];

  /* 추천 탭 전용 딤드 노출 상품입니다. 혼꽃 설화편/진언 스킨/캐릭터 스킨은 영역만 만들고
     실제 구매는 막습니다(dimmed/comingSoon/purchasable:false). 다른 탭/구매 로직과 연결하지 않습니다. */
  const RECOMMENDED_PREVIEW_PRODUCTS = [
    {
      id: "story_dlc_red_pond_sisters",
      tab: "recommended",
      name: "혼꽃 설화편 I",
      subtitle: "붉은 연못의 자매",
      priceType: "test_cash",
      price: 9900,
      priceLabel: "₩9,900",
      rewardType: "story_dlc",
      description: "신규 스토리 DLC",
      recommended: true,
      recommendOrder: 2,
      layoutType: "story_dlc_banner",
      purchasable: false,
      dimmed: true,
      comingSoon: true,
      disabledReason: "준비 중입니다."
    },
    {
      id: "mantra_skin_preview",
      tab: "recommended",
      name: "진언 스킨",
      subtitle: "카드 외형 테마",
      priceLabel: "일반 300 / 프리미엄 500",
      rewardType: "mantra_skin",
      recommended: true,
      recommendOrder: 3,
      layoutType: "mantra_skin_panel",
      purchasable: false,
      dimmed: true,
      comingSoon: true,
      disabledReason: "준비 중입니다."
    },
    {
      id: "character_skin_preview",
      tab: "recommended",
      name: "캐릭터 스킨",
      subtitle: "외형 변경",
      priceLabel: "일반 700 / 프리미엄 1,000 / 한정 1,500",
      rewardType: "character_skin",
      recommended: true,
      recommendOrder: 4,
      layoutType: "character_skin_panel",
      purchasable: false,
      dimmed: true,
      comingSoon: true,
      disabledReason: "준비 중입니다."
    }
  ];

  /* 달빛조각 충전 탭 상품 6종입니다. 실제 결제는 하지 않는 테스트 구매이며,
     달빛조각 차감 없이 rewardAmount만큼 wallet.moonShards를 증가시킵니다. */
  const MOON_CHARGE_PRODUCTS = [
    {
      id: "moon_charge_60",
      tab: "moon_charge",
      name: "달빛조각 60",
      priceType: "test_cash",
      price: 1200,
      rewardType: "moon_shard",
      rewardAmount: 60,
      bonusText: "+60 보너스",
      badge: "첫 2배"
    },
    {
      id: "moon_charge_300",
      tab: "moon_charge",
      name: "달빛조각 300",
      priceType: "test_cash",
      price: 5900,
      rewardType: "moon_shard",
      rewardAmount: 300,
      bonusText: "+300 보너스",
      badge: "첫 2배",
      recommended: true,
      recommendOrder: 40,
      recommendBadge: "충전 추천"
    },
    {
      id: "moon_charge_980",
      tab: "moon_charge",
      name: "달빛조각 980",
      priceType: "test_cash",
      price: 19000,
      rewardType: "moon_shard",
      rewardAmount: 980,
      bonusText: "+980 보너스",
      badge: "첫 2배",
      recommended: true,
      recommendOrder: 50,
      recommendBadge: "인기"
    },
    {
      id: "moon_charge_1980",
      tab: "moon_charge",
      name: "달빛조각 1,980",
      priceType: "test_cash",
      price: 37000,
      rewardType: "moon_shard",
      rewardAmount: 1980,
      bonusText: "+1,980 보너스"
    },
    {
      id: "moon_charge_3280",
      tab: "moon_charge",
      name: "달빛조각 3,280",
      priceType: "test_cash",
      price: 59000,
      rewardType: "moon_shard",
      rewardAmount: 3280,
      bonusText: "+3,280 보너스"
    },
    {
      id: "moon_charge_6480",
      tab: "moon_charge",
      name: "달빛조각 6,480",
      priceType: "test_cash",
      price: 119000,
      rewardType: "moon_shard",
      rewardAmount: 6480,
      bonusText: "+6,480 보너스",
      badge: "첫 2배"
    }
  ];

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function allProducts(){
    return MONTHLY_PASS_PRODUCTS.concat(
      RECOMMENDED_PREVIEW_PRODUCTS,
      CHARACTER_SKIN_PRODUCTS,
      ORDER_PACK_PRODUCTS,
      MOON_CHARGE_PRODUCTS
    );
  }

  window.VIBERUN_BM_STORE_DATA = {
    getTabs(){
      return clone(TABS);
    },
    getProductsByTab(tab){
      return clone(allProducts().filter(product => product.tab === tab));
    },
    findProduct(productId){
      return clone(allProducts().find(product => product.id === productId) || null);
    },
    getPackageProducts(){
      return clone(CHARACTER_SKIN_PRODUCTS);
    },
    findPackageProduct(productId){
      return clone(CHARACTER_SKIN_PRODUCTS.find(product => product.id === productId) || null);
    },
    getCharacterSkinProducts(){
      return clone(CHARACTER_SKIN_PRODUCTS);
    },
    findCharacterSkinProduct(productId){
      return clone(CHARACTER_SKIN_PRODUCTS.find(product => product.id === productId) || null);
    },
    getOrderPackProducts(){
      return clone(ORDER_PACK_PRODUCTS);
    },
    findOrderPackProduct(productId){
      return clone(ORDER_PACK_PRODUCTS.find(product => product.id === productId) || null);
    },
    getMoonChargeProducts(){
      return clone(MOON_CHARGE_PRODUCTS);
    },
    findMoonChargeProduct(productId){
      return clone(MOON_CHARGE_PRODUCTS.find(product => product.id === productId) || null);
    },
    getMonthlyPassProducts(){
      return clone(MONTHLY_PASS_PRODUCTS);
    },
    findMonthlyPassProduct(productId){
      return clone(MONTHLY_PASS_PRODUCTS.find(product => product.id === productId) || null);
    },
    getRecommendedProducts(){
      return clone(
        allProducts()
          .filter(product => product.recommended === true)
          .sort((a, b) => (Number(a.recommendOrder) || 0) - (Number(b.recommendOrder) || 0))
      );
    }
  };
})();
