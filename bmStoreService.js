"use strict";

/* =========================================================================
   BM Store Service
   - 월영당 상품 목록 제공과 패키지 구매 처리를 담당합니다.
   - 구매 즉시 dummyInventory/wallet.moonShards로 보상을 지급하지 않으며, 서버가 구매 상품을
     선물함 구매 메일로 생성합니다. 실제 지급은 선물함에서 수령할 때만 이뤄집니다.
   - wallet.moonShards는 walletService의 캐시/이벤트와 동기화해 메인/선물함/BM UI가
     같은 수량을 표시하도록 유지합니다.
   ========================================================================= */
(function(){
  const API_BASE = (window.VIBERUN_BM_STORE_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
  let cachedDummyInventory = [];
  let cachedDeckPackUnlocks = { ownedDeckPackIds: [] };

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
    const gemValue = wallet && typeof wallet.gem !== "undefined" ? wallet.gem : (wallet && wallet.moonShards);
    const moonShards = Math.max(0, Math.floor(Number(gemValue) || 0));
    return { gem: moonShards, moonShards };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }
    return normalized;
  }

  function normalizeDeckPackUnlocks(deckPackUnlocks){
    const ownedDeckPackIds = deckPackUnlocks && Array.isArray(deckPackUnlocks.ownedDeckPackIds)
      ? deckPackUnlocks.ownedDeckPackIds
          .map(id => String(id || "").trim())
          .filter(Boolean)
      : [];
    return { ownedDeckPackIds: Array.from(new Set(ownedDeckPackIds)) };
  }

  function syncDeckPackUnlocks(deckPackUnlocks){
    cachedDeckPackUnlocks = normalizeDeckPackUnlocks(deckPackUnlocks);
    window.VIBERUN_CONTENT_UNLOCKS = cachedDeckPackUnlocks;
    return cachedDeckPackUnlocks;
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

  function getMonthlyPassProducts(){
    const data = getData();
    return data && typeof data.getMonthlyPassProducts === "function" ? data.getMonthlyPassProducts() : [];
  }

  function findMonthlyPassProduct(productId){
    const data = getData();
    return data && typeof data.findMonthlyPassProduct === "function" ? data.findMonthlyPassProduct(productId) : null;
  }

  /* 패키지/주문 팩 공통 구매 처리입니다.
     wallet 확인 → 서버 요청 → wallet 동기화 흐름은 동일하게 재사용하며, 실제 보상은
     서버가 생성한 선물함 구매 메일(result.mail)을 통해서만 지급됩니다. */
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

        if(result.wallet) result.wallet = syncWallet(result.wallet);
        return result;
      });
    });
  }

  function purchasePackage(productId){
    return purchaseFromCatalog(productId, findPackageProduct(productId), "/bm-store/package");
  }

  /* 캐릭터 스킨 구매입니다. 달빛조각 결제이며, 실제 보유 처리는 하지 않고 서버가
     선물함 구매 메일을 생성합니다. 한정 스킨은 saleEndAt이 지나면 구매를 막습니다. */
  function purchaseCharacterSkin(productId){
    const product = findPackageProduct(productId);

    if(!product || product.rewardType !== "character_skin"){
      return Promise.resolve({
        ok: false,
        code: "INVALID_CHARACTER_SKIN_PRODUCT",
        message: "캐릭터 스킨 상품이 아닙니다."
      });
    }

    const account = getAuthAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    if(product.saleEndAt){
      const now = Date.now();
      const saleEndAt = Date.parse(product.saleEndAt);

      if(Number.isFinite(saleEndAt) && now >= saleEndAt){
        return Promise.resolve({
          ok: false,
          code: "CHARACTER_SKIN_SALE_ENDED",
          message: "판매 기간이 종료된 스킨입니다."
        });
      }
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

      return requestJson("/bm-store/character-skin/" + encodeURIComponent(productId) + "/purchase", {
        method: "POST"
      }).then(result => {
        if(!result || !result.ok){
          if(result && result.wallet) syncWallet(result.wallet);
          return result || { ok: false, message: "구매에 실패했습니다." };
        }

        if(result.wallet) result.wallet = syncWallet(result.wallet);
        return result;
      });
    });
  }

  function purchaseOrderPack(productId){
    return purchaseFromCatalog(productId, findOrderPackProduct(productId), "/bm-store/package");
  }

  /* 주문 덱 BM 임시 구현: 한풀이 덱 / 굿판 덱 확장덱 구매입니다. 달빛조각 결제이며,
     실제 소유권 부여는 하지 않고 서버가 선물함 구매 메일을 생성합니다. */
  function purchaseDeckPack(productId){
    return requestJson("/bm-store/deck-pack/" + encodeURIComponent(productId) + "/purchase", {
      method: "POST"
    }).then(result => {
      if(result && result.wallet){
        result.wallet = syncWallet(result.wallet);
      }
      if(result && result.deckPackUnlocks){
        result.deckPackUnlocks = syncDeckPackUnlocks(result.deckPackUnlocks);
      }
      return result;
    });
  }

  /* 계정이 보유 중인 확장덱 ID 목록을 조회합니다. */
  function fetchDeckPackUnlocks(){
    return requestJson("/bm-store/deck-pack/unlocks", {
      method: "GET"
    }).then(result => {
      if(result && result.ok && result.deckPackUnlocks){
        result.deckPackUnlocks = syncDeckPackUnlocks(result.deckPackUnlocks);
      }
      return result;
    });
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

    if(!API_BASE){
      return purchaseMoonChargeForTest(product);
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

  function purchaseMoonChargeForTest(product){
    const userData = window.VIBERUN_USER_DATA;
    if(!userData || typeof userData.grantTestGem !== "function"){
      return Promise.resolve({
        ok: false,
        code: "TEST_PURCHASE_UNAVAILABLE",
        message: "테스트 구매 기능을 사용할 수 없습니다."
      });
    }

    const amount = Math.max(0, Math.floor(Number(product.rewardAmount) || 0));
    if(!amount){
      return Promise.resolve({
        ok: false,
        code: "INVALID_REWARD_AMOUNT",
        message: "지급할 테스트 재화가 없습니다."
      });
    }

    return Promise.resolve(userData.grantTestGem(amount)).then(result => {
      if(!result || !result.ok) return result || { ok: false, message: "테스트 구매에 실패했습니다." };

      return {
        ok: true,
        wallet: syncWallet(result.wallet),
        testPurchase: true,
        productId: product.id,
        rewardAmount: amount
      };
    });
  }

  /* 월영의 약속(30일 출석 상품) 구매입니다. 결제는 test_cash이며, 즉시/매일 지급 모두
     선물함 구매 메일을 통해서만 이뤄집니다(수령 시 활성화 + 즉시 100 지급). */
  function purchaseMonthlyPass(productId){
    const product = findMonthlyPassProduct(productId);

    if(!product || product.rewardType !== "monthly_pass"){
      return Promise.resolve({
        ok: false,
        code: "INVALID_MONTHLY_PASS_PRODUCT",
        message: "월영의 약속 상품이 아닙니다."
      });
    }

    const account = getAuthAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "로그인이 필요합니다."
      });
    }

    return requestJson("/bm-store/monthly-pass/" + encodeURIComponent(productId) + "/purchase", {
      method: "POST"
    });
  }

  /* 활성 탭과 무관하게 UI가 상품 ID만으로 구매를 요청할 수 있도록 모든 카탈로그를 조회합니다.
     딤드/준비 중 상품은 서버 요청 없이 COMING_SOON으로 막고, rewardType에 따라
     월영의 약속/충전 테스트 구매/기존 패키지·주문 팩 구매로 분기합니다. */
  function purchaseProduct(productId){
    const product = findProduct(productId);

    if(!product){
      return Promise.resolve({
        ok: false,
        code: "UNKNOWN_PRODUCT",
        message: "존재하지 않는 상품입니다."
      });
    }

    if(product.dimmed || product.comingSoon || product.purchasable === false){
      return Promise.resolve({
        ok: false,
        code: "COMING_SOON",
        message: product.disabledReason || "준비 중입니다."
      });
    }

    if(product.rewardType === "monthly_pass") return purchaseMonthlyPass(productId);
    if(product.rewardType === "moon_shard") return purchaseMoonCharge(productId);
    if(product.rewardType === "character_skin") return purchaseCharacterSkin(productId);
    if(product.rewardType === "deck_pack") return purchaseDeckPack(productId);
    return purchaseFromCatalog(productId, product, "/bm-store/package");
  }

  /* 메인메뉴 좌하단 월영의 약속 일일 보상 UI가 사용하는 상태 조회/수령 함수입니다.
     계정용 wallet.moonShards만 동기화하며, 전투용 S.moonShards와는 연결하지 않습니다. */
  function fetchMonthlyPassStatus(){
    return requestJson("/bm-store/monthly-pass/status", { method: "GET" }).then(result => {
      if(result && result.wallet) syncWallet(result.wallet);
      return result;
    });
  }

  function claimMonthlyPassDailyReward(){
    return requestJson("/bm-store/monthly-pass/claim-daily", { method: "POST" }).then(result => {
      if(result && result.wallet) syncWallet(result.wallet);
      return result;
    });
  }

  /* 메인메뉴 좌상단 프로필 UI 전용 조회/적용 함수입니다.
     구매/보유 로직에는 관여하지 않고 equippedSkinId 조회·저장만 담당합니다. */
  function fetchCharacterSkinProfileState(){
    return requestJson("/profile/character-skins", { method: "GET" });
  }

  function equipCharacterSkinProfile(skinId){
    return requestJson("/profile/character-skins/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skinId: skinId ?? null })
    });
  }

  /* 닉네임 변경 UI(nicknameUI.js) 전용 조회/변경 함수입니다. 스킨/장착 로직에는 관여하지 않습니다. */
  function fetchProfileStatus(){
    return requestJson("/profile/status", { method: "GET" });
  }

  function updateProfileNickname(nickname){
    return requestJson("/profile/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname })
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
    getProductsByTab,
    getPackageProducts,
    purchasePackage,
    purchaseCharacterSkin,
    getOrderPackProducts,
    purchaseOrderPack,
    purchaseDeckPack,
    fetchDeckPackUnlocks,
    getMoonChargeProducts,
    purchaseMoonCharge,
    getMonthlyPassProducts,
    purchaseMonthlyPass,
    getRecommendedProducts,
    purchaseProduct,
    fetchMonthlyPassStatus,
    claimMonthlyPassDailyReward,
    fetchCharacterSkinProfileState,
    equipCharacterSkinProfile,
    fetchProfileStatus,
    updateProfileNickname,
    fetchDummyInventory,
    getCachedDeckPackUnlocks(){
      return normalizeDeckPackUnlocks(cachedDeckPackUnlocks);
    },
    getCachedDummyInventory(){
      return cachedDummyInventory.slice();
    }
  };
})();
