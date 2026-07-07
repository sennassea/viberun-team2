"use strict";

/* =========================================================================
   Supabase User Data Service
   - Creates/loads profiles and wallets for the current authenticated user.
   - Keeps table access out of UI/auth modules.
   ========================================================================= */
(function(){
  let cachedProfile = null;
  let cachedWallet = null;
  let isGrantingTestGem = false;

  function getClient(){
    const bridge = window.VIBERUN_SUPABASE;
    return bridge && typeof bridge.getClient === "function" ? bridge.getClient() : null;
  }

  function normalizeProfile(profile){
    const source = profile && typeof profile === "object" ? profile : {};
    return {
      id: String(source.id || "").trim(),
      nickname: String(source.nickname || "").trim(),
      created_at: source.created_at || null
    };
  }

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gem = Math.max(0, Math.floor(Number(source.gem) || 0));
    return {
      user_id: String(source.user_id || "").trim(),
      gem,
      moonShards: gem,
      updated_at: source.updated_at || null
    };
  }

  function makeRandomNickname(){
    return "Player_" + String(Math.floor(1000 + Math.random() * 9000));
  }

  function isNoRowsError(error){
    return !!(error && (error.code === "PGRST116" || String(error.message || "").includes("0 rows")));
  }

  function emitUserDataChanged(){
    try {
      window.dispatchEvent(new CustomEvent("viberun:user-data-changed", {
        detail: {
          profile: cachedProfile ? Object.assign({}, cachedProfile) : null,
          wallet: cachedWallet ? Object.assign({}, cachedWallet) : null
        }
      }));
    } catch(error) {
      console.warn("[UserData] user data 변경 이벤트 발행에 실패했습니다.", error);
    }
  }

  function syncWalletCache(wallet){
    cachedWallet = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(cachedWallet);
    }
    emitUserDataChanged();
    return Object.assign({}, cachedWallet);
  }

  function getOrCreateProfile(userId, fallbackName){
    const client = getClient();
    const id = String(userId || "").trim();
    if(!client || !id){
      return Promise.resolve({ ok: false, code: "SUPABASE_UNAVAILABLE", message: "유저 정보를 불러올 수 없습니다." });
    }

    return client.from("profiles").select("*").eq("id", id).single().then(result => {
      if(result && result.data){
        cachedProfile = normalizeProfile(result.data);
        emitUserDataChanged();
        return { ok: true, profile: Object.assign({}, cachedProfile), created: false };
      }

      if(result && result.error && !isNoRowsError(result.error)){
        return { ok: false, error: result.error, message: result.error.message || "유저 정보를 불러오지 못했습니다." };
      }

      const nickname = String(fallbackName || "").trim() || makeRandomNickname();
      return client.from("profiles").insert({ id, nickname }).select("*").single().then(insertResult => {
        if(insertResult && insertResult.error){
          return { ok: false, error: insertResult.error, message: insertResult.error.message || "유저 정보를 생성하지 못했습니다." };
        }

        cachedProfile = normalizeProfile(insertResult.data);
        emitUserDataChanged();
        return { ok: true, profile: Object.assign({}, cachedProfile), created: true };
      });
    }).catch(error => {
      console.warn("[UserData] profile 준비 중 오류가 발생했습니다.", error);
      return { ok: false, error, message: "유저 정보를 준비하지 못했습니다." };
    });
  }

  function getOrCreateWallet(userId){
    const client = getClient();
    const id = String(userId || "").trim();
    if(!client || !id){
      return Promise.resolve({ ok: false, code: "SUPABASE_UNAVAILABLE", message: "재화 정보를 불러올 수 없습니다." });
    }

    return client.from("wallets").select("*").eq("user_id", id).single().then(result => {
      if(result && result.data){
        return { ok: true, wallet: syncWalletCache(result.data), created: false };
      }

      if(result && result.error && !isNoRowsError(result.error)){
        return { ok: false, error: result.error, message: result.error.message || "재화 정보를 불러오지 못했습니다." };
      }

      return client.from("wallets").insert({ user_id: id, gem: 0 }).select("*").single().then(insertResult => {
        if(insertResult && insertResult.error){
          return { ok: false, error: insertResult.error, message: insertResult.error.message || "재화 정보를 생성하지 못했습니다." };
        }

        return { ok: true, wallet: syncWalletCache(insertResult.data), created: true };
      });
    }).catch(error => {
      console.warn("[UserData] wallet 준비 중 오류가 발생했습니다.", error);
      return { ok: false, error, message: "재화 정보를 준비하지 못했습니다." };
    });
  }

  function fetchWallet(userId){
    const client = getClient();
    const id = String(userId || "").trim();
    if(!client || !id){
      return Promise.resolve({ ok: false, code: "SUPABASE_UNAVAILABLE", message: "?ы솕 ?뺣낫瑜?遺덈윭?????놁뒿?덈떎." });
    }

    return client.from("wallets").select("*").eq("user_id", id).limit(1).then(result => {
      if(result && result.error){
        return { ok: false, error: result.error, message: result.error.message || "?ы솕 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??" };
      }

      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if(!row){
        return { ok: false, code: "WALLET_NOT_FOUND", message: "?ы솕 ?뺣낫媛 ?놁뒿?덈떎." };
      }

      return { ok: true, wallet: syncWalletCache(row), created: false };
    }).catch(error => {
      console.warn("[UserData] wallet 議고쉶 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.", error);
      return { ok: false, error, message: "?ы솕 ?뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??" };
    });
  }

  function prepareUserData(account){
    const source = account && typeof account === "object" ? account : {};
    const userId = String(source.accountId || source.uid || "").trim();
    if(!userId){
      return Promise.resolve({ ok: false, code: "ACCOUNT_REQUIRED", message: "로그인 정보가 없습니다." });
    }

    return Promise.all([
      getOrCreateProfile(userId, source.displayName),
      getOrCreateWallet(userId)
    ]).then(results => {
      const profileResult = results[0];
      const walletResult = results[1];
      return {
        ok: !!(profileResult && profileResult.ok && walletResult && walletResult.ok),
        profile: profileResult && profileResult.profile ? profileResult.profile : null,
        wallet: walletResult && walletResult.wallet ? walletResult.wallet : null,
        profileResult,
        walletResult
      };
    });
  }

  function getCurrentUserId(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";
    const account = auth.getAccountInfo();
    if(!account || !account.isLoggedIn) return "";
    return String(account.accountId || account.uid || "").trim();
  }

  function grantTestGem(amount){
    const client = getClient();
    const userId = getCurrentUserId();
    const delta = Math.max(1, Math.floor(Number(amount) || 100));

    if(isGrantingTestGem){
      return Promise.resolve({ ok: false, code: "REQUEST_PENDING", message: "이미 처리 중입니다." });
    }

    if(!client || !userId){
      return Promise.resolve({ ok: false, code: "SUPABASE_UNAVAILABLE", message: "로그인이 필요합니다." });
    }

    isGrantingTestGem = true;
    return getOrCreateWallet(userId).then(walletResult => {
      if(!walletResult || !walletResult.ok || !walletResult.wallet){
        return walletResult || { ok: false, message: "재화 정보를 불러오지 못했습니다." };
      }

      const currentGem = Math.max(0, Math.floor(Number(walletResult.wallet.gem) || 0));
      const nextGem = currentGem + delta;
      return client.from("wallets")
        .update({ gem: nextGem, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("*")
        .single()
        .then(updateResult => {
          if(updateResult && updateResult.error){
            return { ok: false, error: updateResult.error, message: updateResult.error.message || "테스트 재화 지급에 실패했습니다." };
          }

          return {
            ok: true,
            wallet: syncWalletCache(updateResult.data),
            amount: delta
          };
        });
    }).catch(error => {
      console.warn("[UserData] test gem 지급 중 오류가 발생했습니다.", error);
      return { ok: false, error, message: "테스트 재화 지급에 실패했습니다." };
    }).finally(() => {
      isGrantingTestGem = false;
    });
  }

  function getCachedProfile(){
    return cachedProfile ? Object.assign({}, cachedProfile) : null;
  }

  function getCachedWallet(){
    return cachedWallet ? Object.assign({}, cachedWallet) : null;
  }

  function clearCache(){
    cachedProfile = null;
    cachedWallet = null;
    emitUserDataChanged();
  }

  window.VIBERUN_USER_DATA = {
    getOrCreateProfile,
    getOrCreateWallet,
    fetchWallet,
    prepareUserData,
    grantTestGem,
    getCachedProfile,
    getCachedWallet,
    clearCache
  };

  window.addEventListener("viberun:auth-changed", event => {
    const isLoggedIn = !!(event && event.detail && event.detail.isLoggedIn);
    if(!isLoggedIn) clearCache();
  });
})();
