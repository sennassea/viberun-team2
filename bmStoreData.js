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
      label: "패키지",
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
    return PACKAGE_PRODUCTS.concat(ORDER_PACK_PRODUCTS, MOON_CHARGE_PRODUCTS);
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
      return clone(PACKAGE_PRODUCTS);
    },
    findPackageProduct(productId){
      return clone(PACKAGE_PRODUCTS.find(product => product.id === productId) || null);
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
    getRecommendedProducts(){
      return clone(
        allProducts()
          .filter(product => product.recommended === true)
          .sort((a, b) => (Number(a.recommendOrder) || 0) - (Number(b.recommendOrder) || 0))
      );
    }
  };
})();
