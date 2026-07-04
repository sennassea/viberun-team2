"use strict";

/* =========================================================================
   BM Store Data
   - 월영당 1차 구현에서 사용하는 상품/탭 정적 데이터입니다.
   - UI와 구매 서비스는 이 데이터만 읽고, 상품명/가격/보상 ID를 직접 하드코딩하지 않습니다.
   - 이번 범위는 패키지 탭 상품 4종뿐이며, 다른 탭 상품 데이터는 의도적으로 비워 둡니다.
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
      id: "orderPack",
      label: "주문 팩",
      enabled: false,
      readyMessage: "해당 탭은 준비 중입니다."
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
      name: "초심자 스타터 팩",
      price: 7500,
      rewardId: "dummy_starter_pack",
      description: "지금 시작하면 모험이 더욱 특별해집니다."
    },
    {
      id: "growth_package",
      name: "성장 패키지",
      price: 2980,
      rewardId: "dummy_growth_package",
      description: "성장에 필요한 물품이 담긴 패키지입니다."
    },
    {
      id: "rare_package",
      name: "희귀 장신 패키지",
      price: 6500,
      rewardId: "dummy_rare_package",
      description: "희귀한 장신구가 담긴 패키지입니다."
    },
    {
      id: "spring_blessing_box",
      name: "봄날의 축복 상자",
      price: 2400,
      rewardId: "dummy_spring_blessing_box",
      badge: "20% OFF",
      description: "계절 한정 축복 상자입니다."
    }
  ];

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  window.VIBERUN_BM_STORE_DATA = {
    getTabs(){
      return clone(TABS);
    },
    getPackageProducts(){
      return clone(PACKAGE_PRODUCTS);
    },
    findPackageProduct(productId){
      return clone(PACKAGE_PRODUCTS.find(product => product.id === productId) || null);
    }
  };
})();
