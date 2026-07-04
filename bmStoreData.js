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
      id: "recommend",
      label: "추천",
      enabled: false,
      readyMessage: "해당 탭은 준비 중입니다."
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
      id: "moonShardCharge",
      label: "달빛조각 충전",
      enabled: false,
      readyMessage: "해당 탭은 준비 중입니다."
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
      description: "지금 시작하면 모험이 더욱 특별해집니다."
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
      description: "계절 한정 축복 상자입니다."
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
      icon: "📜"
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

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  window.VIBERUN_BM_STORE_DATA = {
    getTabs(){
      return clone(TABS);
    },
    getProductsByTab(tab){
      return clone(PACKAGE_PRODUCTS.concat(ORDER_PACK_PRODUCTS).filter(product => product.tab === tab));
    },
    findProduct(productId){
      return clone(PACKAGE_PRODUCTS.concat(ORDER_PACK_PRODUCTS).find(product => product.id === productId) || null);
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
    }
  };
})();
