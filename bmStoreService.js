"use strict";

/* =========================================================================
   BM Store Service
   - 월영당 상품 목록 제공과 패키지 구매 처리를 담당합니다.
   - 구매는 accountId 기준 dummyInventory에만 저장되며 카드/법구/골드/포션/전투 보상과
     연결하지 않습니다.
   - wallet.moonShards는 walletService의 캐시/이벤트와 동기화해 메인/선물함/BM UI가
     같은 수량을 표시하도록 유지합니다.
   ========================================================================= */
(function(){
  const API_BASE = (window.VIBERUN_BM_STORE_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
  let cachedDummyInventory = [];

  function getData(){
    return window.VIBERUN_BM_STORE_DATA;
  }

  function getAuthAccount(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return null;

    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? account : null;
  }

  function getAccessToken(){
    const account = getAuthAccount();
    return account ? String(account.accessToken || "") : "";
  }

  function normalizeWallet(wallet){
    const moonShards = Math.max(0, Math.floor(Number(wallet && wallet.moonShards) || 0));
    return { moonShards };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }
    return normalized;
  }

  function getCachedWallet(){
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.getCachedWallet === "function"){
      return window.VIBERUN_WALLET.getCachedWallet();
    }
    return null;
  }

  function fetchWalletIfNeeded(){
    const cached = getCachedWallet();
    if(cached) return Promise.resolve(normalizeWallet(cached));

    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.fetchWallet === "function"){
      return Promise.resolve(window.VIBERUN_WALLET.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet) return normalizeWallet(result.wallet);
        return { moonShards: 0 };
      });
    }

    return Promise.resolve({ moonShards: 0 });
  }

  function requestJson(path, options){
    const token = getAccessToken();
    if(!token){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    if(typeof fetch !== "function"){
      return Promise.resolve({
        ok: false,
        code: "FETCH_UNAVAILABLE",
        message: "네트워크 요청을 사용할 수 없는 환경입니다."
      });
    }

    const requestOptions = options || {};
    const headers = Object.assign({
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }, requestOptions.headers || {});

    return fetch(API_BASE + path, Object.assign({}, requestOptions, { headers }))
      .then(response => response.text().then(text => {
        let body = {};
        if(text){
          try {
            body = JSON.parse(text);
          } catch(error) {
            console.warn("[BMStore] 서버 응답 JSON 파싱에 실패했습니다.", error);
            body = { message: text };
          }
        }

        if(response.ok) return Object.assign({ ok: true }, body);
        return {
          ok: false,
          status: response.status,
          code: body.code || body.errorCode || "",
          message: body.message || "월영당 요청에 실패했습니다.",
          body
        };
      }))
      .catch(error => {
        console.warn("[BMStore] 서버 요청 중 네트워크 오류가 발생했습니다.", error);
        return {
          ok: false,
          code: "NETWORK_ERROR",
          error,
          message: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요."
        };
      });
  }

  function getPackageProducts(){
    const data = getData();
    return data && typeof data.getPackageProducts === "function" ? data.getPackageProducts() : [];
  }

  function getProductsByTab(tab){
    const data = getData();
    if(data && typeof data.getProductsByTab === "function") return data.getProductsByTab(tab);
    if(tab === "package") return getPackageProducts();
    if(tab === "order_pack") return getOrderPackProducts();
    return [];
  }

  function findPackageProduct(productId){
    const data = getData();
    return data && typeof data.findPackageProduct === "function" ? data.findPackageProduct(productId) : null;
  }

  function findProduct(productId){
    const data = getData();
    if(data && typeof data.findProduct === "function") return data.findProduct(productId);
    return findPackageProduct(productId) || findOrderPackProduct(productId);
  }

  function getOrderPackProducts(){
    const data = getData();
    return data && typeof data.getOrderPackProducts === "function" ? data.getOrderPackProducts() : [];
  }

  function findOrderPackProduct(productId){
    const data = getData();
    return data && typeof data.findOrderPackProduct === "function" ? data.findOrderPackProduct(productId) : null;
  }

  function getMoonChargeProducts(){
    const data = getData();
    return data && typeof data.getMoonChargeProducts === "function" ? data.getMoonChargeProducts() : [];
  }

  /* 추천탭 전용 조회 함수입니다. 패키지/주문 팩/충전 상품 중 recommended === true인
     상품만 recommendOrder 오름차순으로 가져오며, 구매는 기존 purchaseProduct를 그대로 사용합니다. */
  function getRecommendedProducts(){
    const data = getData();
    return data && typeof data.getRecommendedProducts === "function" ? data.getRecommendedProducts() : [];
  }

  function findMoonChargeProduct(productId){
    const data = getData();
    return data && typeof data.findMoonChargeProduct === "function" ? data.findMoonChargeProduct(productId) : null;
  }

  /* 패키지/주문 팩 공통 구매 처리입니다.
     wallet 확인 → 서버 요청 → dummyInventory/wallet 동기화 흐름은 동일하게 재사용합니다. */
  function purchaseFromCatalog(productId, product, endpointBase){
    const account = getAuthAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    if(!product){
      return Promise.resolve({
        ok: false,
        code: "UNKNOWN_PRODUCT",
        message: "존재하지 않는 상품입니다."
      });
    }

    if(product.priceType !== "moon_shard" || product.rewardType !== "dummy_item"){
      return Promise.resolve({
        ok: false,
        code: "UNSUPPORTED_PRODUCT",
        message: "현재 구매할 수 없는 상품입니다."
      });
    }

    return fetchWalletIfNeeded().then(wallet => {
      if(wallet.moonShards < product.price){
        return {
          ok: false,
          code: "INSUFFICIENT_MOON_SHARDS",
          message: "달빛조각이 부족합니다.",
          wallet
        };
      }

      return requestJson(endpointBase + "/" + encodeURIComponent(product.id) + "/purchase", {
        method: "POST"
      }).then(result => {
        if(!result || !result.ok){
          if(result && result.wallet) syncWallet(result.wallet);
          return result || { ok: false, message: "구매에 실패했습니다." };
        }

        if(Array.isArray(result.dummyInventory)) cachedDummyInventory = result.dummyInventory.slice();
        if(result.wallet) result.wallet = syncWallet(result.wallet);
        return result;
      });
    });
  }

  function purchasePackage(productId){
    return purchaseFromCatalog(productId, findPackageProduct(productId), "/bm-store/package");
  }

  function purchaseOrderPack(productId){
    return purchaseFromCatalog(productId, findOrderPackProduct(productId), "/bm-store/package");
  }

  /* 달빛조각 충전은 실제 결제가 아닌 테스트 구매입니다.
     달빛조각 잔액 확인/차감 없이 rewardAmount만큼 wallet.moonShards만 증가시킵니다. */
  function purchaseMoonCharge(productId){
    const account = getAuthAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    const product = findMoonChargeProduct(productId);
    if(!product){
      return Promise.resolve({
        ok: false,
        code: "UNKNOWN_PRODUCT",
        message: "존재하지 않는 상품입니다."
      });
    }

    if(product.priceType !== "test_cash" || product.rewardType !== "moon_shard"){
      return Promise.resolve({
        ok: false,
        code: "UNSUPPORTED_PRODUCT",
        message: "현재 구매할 수 없는 상품입니다."
      });
    }

    return requestJson("/bm-store/moon-charge/" + encodeURIComponent(product.id) + "/purchase", {
      method: "POST"
    }).then(result => {
      if(!result || !result.ok){
        if(result && result.wallet) syncWallet(result.wallet);
        return result || { ok: false, message: "구매에 실패했습니다." };
      }

      if(result.wallet) result.wallet = syncWallet(result.wallet);
      return result;
    });
  }

  /* 활성 탭과 무관하게 UI가 상품 ID만으로 구매를 요청할 수 있도록 모든 카탈로그를 조회합니다.
     rewardType이 moon_shard면 충전 테스트 구매로, dummy_item이면 기존 패키지/주문 팩 구매로 분기합니다. */
  function purchaseProduct(productId){
    const product = findProduct(productId);
    if(product && product.rewardType === "moon_shard") return purchaseMoonCharge(productId);
    return purchaseFromCatalog(productId, product, "/bm-store/package");
  }

  function fetchDummyInventory(){
    return requestJson("/bm-store/dummy-inventory", { method: "GET" }).then(result => {
      if(result && result.ok && Array.isArray(result.dummyInventory)){
        cachedDummyInventory = result.dummyInventory.slice();
      }
      return result;
    });
  }

  window.VIBERUN_BM_STORE_SERVICE = {
    getProductsByTab,
    getPackageProducts,
    purchasePackage,
    getOrderPackProducts,
    purchaseOrderPack,
    getMoonChargeProducts,
    purchaseMoonCharge,
    getRecommendedProducts,
    purchaseProduct,
    fetchDummyInventory,
    getCachedDummyInventory(){
      return cachedDummyInventory.slice();
    }
  };
})();
