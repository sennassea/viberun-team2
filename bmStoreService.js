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

  function findPackageProduct(productId){
    const data = getData();
    return data && typeof data.findPackageProduct === "function" ? data.findPackageProduct(productId) : null;
  }

  /* 구매 전 클라이언트 캐시 wallet을 먼저 확인해 부족한 경우 서버 요청 없이 즉시 실패시킵니다. */
  function purchasePackage(productId){
    const account = getAuthAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    const product = findPackageProduct(productId);
    if(!product){
      return Promise.resolve({
        ok: false,
        code: "UNKNOWN_PRODUCT",
        message: "존재하지 않는 상품입니다."
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

      return requestJson("/bm-store/package/" + encodeURIComponent(product.id) + "/purchase", {
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

  function fetchDummyInventory(){
    return requestJson("/bm-store/dummy-inventory", { method: "GET" }).then(result => {
      if(result && result.ok && Array.isArray(result.dummyInventory)){
        cachedDummyInventory = result.dummyInventory.slice();
      }
      return result;
    });
  }

  window.VIBERUN_BM_STORE_SERVICE = {
    getPackageProducts,
    purchasePackage,
    fetchDummyInventory,
    getCachedDummyInventory(){
      return cachedDummyInventory.slice();
    }
  };
})();
