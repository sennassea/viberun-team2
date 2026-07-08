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
      label: "달빛 조각 충전",
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

      description: "달빛 아래 맺은 서약을 품은 한정 마법무녀 의상입니다.",
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

      battleProfileIcon: "assets/profile/profile_limited_moonlight_vow_magic_maiden.png",
      battleStandingImage: "assets/skins/skin_limited_moonlight_vow_magic_maiden.png",
      mapMarkerImage: "assets/map_icons/player_marker_moonlight_vow_magic_maiden.png",

      purchasable: true,
      dimmed: false,

      recommended: true,
      recommendOrder: 2,
      layoutType: "recommended_wide",
      recommendedSlot: "top_banner"
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

      battleProfileIcon: "assets/profile/profile_premium_wolyeong_academy_transfer.png",
      battleStandingImage: "assets/skins/skin_premium_wolyeong_academy_transfer.png",
      mapMarkerImage: "assets/map_icons/player_marker_wolyeong_academy_transfer.png",

      purchasable: true,
      dimmed: false,

      recommended: true,
      recommendOrder: 3,
      layoutType: "recommended_small",
      recommendedSlot: "bottom_left"
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

      battleProfileIcon: "assets/profile/profile_common_prayer_robe.png",
      battleStandingImage: "assets/skins/skin_common_prayer_robe.png",
      mapMarkerImage: "assets/map_icons/player_marker_common_prayer_robe.png",

      purchasable: true,
      dimmed: false
    }
  ];

  /* 전투화면 좌상단 프로필 아이콘 / 기본 전투 스탠딩의 기본값입니다.
     equippedSkinId가 없거나 매핑에 실패했을 때 이 값으로 fallback합니다. */
  const DEFAULT_PROFILE_ICON = "assets/profile/profile_default.png";
  const DEFAULT_BATTLE_STANDING_IMAGE = "assets/characters/player-temp-cutout.png";
  const DEFAULT_MAP_MARKER_IMAGE = "assets/map_icons/player_marker.png";

  /* 주문 팩 탭 임시 구현입니다(작업명: 주문 덱 BM 임시 구현).
     기존 주문 부적 팩 4종 대신 한풀이 덱 / 굿판 덱 확장덱 2종을 임시로 노출합니다.
     구매 시 실제 게임 콘텐츠 풀 필터링은 하지 않으며, 계정 소유권(ownedDeckPackIds)만 저장합니다. */
  const ORDER_PACK_PRODUCTS = [
    {
      id: "deck_pack_hanpuri",
      tab: "order_pack",
      name: "한풀이 덱",
      subtitle: "응어리를 풀어내는 확장 주문 덱",
      priceType: "moon_shard",
      price: 1200,
      rewardType: "deck_pack",
      deckPackId: "hanpuri",
      unlockKeyword: "한풀이 덱",
      unlockTags: ["한풀이", "한풀이 덱", "hanpuri"],
      description: "한풀이 덱 키워드가 있는 주문, 약병, 법구를 해금하는 확장팩입니다.",
      contentSummary: "한풀이 키워드 주문 / 약병 / 법구 포함",
      icon: "🌙",
      sortOrder: 1,
      purchasable: true,
      dimmed: false,

      recommended: true,
      recommendOrder: 4,
      layoutType: "recommended_small",
      recommendedSlot: "bottom_middle"
    },
    {
      id: "deck_pack_gutpan",
      tab: "order_pack",
      name: "굿판 덱",
      subtitle: "신명을 끌어올리는 확장 주문 덱",
      priceType: "moon_shard",
      price: 1200,
      rewardType: "deck_pack",
      deckPackId: "gutpan",
      unlockKeyword: "굿판 덱",
      unlockTags: ["굿판", "굿판 덱", "gutpan"],
      description: "굿판 덱 키워드가 있는 주문, 약병, 법구를 해금하는 확장팩입니다.",
      contentSummary: "굿판 키워드 주문 / 약병 / 법구 포함",
      icon: "🔔",
      sortOrder: 2,
      purchasable: true,
      dimmed: false
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

      description: "30일 동안 매일 달빛 조각을 받을 수 있습니다.",
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

  /* 달빛 조각 충전 탭 상품 4종입니다. 실제 결제는 하지 않는 테스트 구매이며,
     달빛 조각 차감 없이 rewardAmount만큼 wallet.moonShards를 증가시킵니다.
     BM 기획서의 "달빛 조각 직접 판매안" 기준(개당 단가/용도)을 따릅니다. */
  const MOON_CHARGE_PRODUCTS = [
    {
      id: "moon_charge_100",
      tab: "moon_charge",
      name: "달빛 조각 100개",
      subtitle: "소액 부족분 보충",
      priceType: "test_cash",
      price: 1200,
      priceLabel: "₩1,200",
      rewardType: "moon_shard",
      rewardAmount: 100,
      unitPriceLabel: "개당 12원",
      description: "소액 부족분 보충 / 첫 결제",
      imageKey: "moon_charge_small",
      sortOrder: 1,
      recommendedBadge: "첫 결제"
    },
    {
      id: "moon_charge_500",
      tab: "moon_charge",
      name: "달빛 조각 500개",
      subtitle: "혼합 구매용",
      priceType: "test_cash",
      price: 5500,
      priceLabel: "₩5,500",
      rewardType: "moon_shard",
      rewardAmount: 500,
      unitPriceLabel: "개당 11원",
      description: "플레이 재화와 혼합 구매",
      imageKey: "moon_charge_medium",
      sortOrder: 2,
      recommendedBadge: "균형형"
    },
    {
      id: "moon_charge_1200",
      tab: "moon_charge",
      name: "달빛 조각 1,200개",
      subtitle: "확장덱 즉시 해금",
      priceType: "test_cash",
      price: 12000,
      priceLabel: "₩12,000",
      rewardType: "moon_shard",
      rewardAmount: 1200,
      unitPriceLabel: "개당 10원",
      description: "확장덱 1종 즉시 해금 앵커",
      imageKey: "moon_charge_large",
      sortOrder: 3,
      recommendedBadge: "추천"
    },
    {
      id: "moon_charge_3000",
      tab: "moon_charge",
      name: "달빛 조각 3,000개",
      subtitle: "복합 구매용",
      priceType: "test_cash",
      price: 27000,
      priceLabel: "₩27,000",
      rewardType: "moon_shard",
      rewardAmount: 3000,
      unitPriceLabel: "개당 9원",
      description: "확장덱+스킨 복합 구매 코어 유저",
      imageKey: "moon_charge_premium",
      sortOrder: 4,
      recommendedBadge: "최고 효율",

      recommended: true,
      recommendOrder: 5,
      layoutType: "recommended_small",
      recommendedSlot: "bottom_right"
    }
  ];

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function allProducts(){
    return MONTHLY_PASS_PRODUCTS.concat(
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
      if(tab === "recommended"){
        return clone(
          allProducts()
            .filter(product => product.recommended === true)
            .sort((a, b) => (Number(a.recommendOrder) || 0) - (Number(b.recommendOrder) || 0))
        );
      }

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
    getCharacterSkinBySkinId(skinId){
      return clone(CHARACTER_SKIN_PRODUCTS.find(product => product.skinId === skinId) || null);
    },
    getDefaultProfileIcon(){
      return DEFAULT_PROFILE_ICON;
    },
    getDefaultBattleStandingImage(){
      return DEFAULT_BATTLE_STANDING_IMAGE;
    },
    getDefaultMapMarkerImage(){
      return DEFAULT_MAP_MARKER_IMAGE;
    },
    getOrderPackProducts(){
      return clone(ORDER_PACK_PRODUCTS);
    },
    findOrderPackProduct(productId){
      return clone(ORDER_PACK_PRODUCTS.find(product => product.id === productId) || null);
    },
    getDeckPackProducts(){
      return clone(ORDER_PACK_PRODUCTS.filter(product => product.rewardType === "deck_pack"));
    },
    findDeckPackProduct(productId){
      return clone(ORDER_PACK_PRODUCTS.find(product =>
        product.id === productId &&
        product.rewardType === "deck_pack"
      ) || null);
    },
    getMoonChargeProducts(){
      return clone(MOON_CHARGE_PRODUCTS)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
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
