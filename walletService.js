"use strict";

/* =========================================================================
   Wallet Service
   - accountId 기준 계정 wallet 값을 서버에서 조회하고 메모리에 캐시합니다.
   - RUN_STATE/S.moonShards/hudMoonShard와 연결하지 않아 전투 재화와 계정 BM 재화가
     섞이지 않도록 경계를 유지합니다.
   - wallet 값이 바뀌면 viberun:wallet-changed 이벤트를 발행해 UI들이 같은 값을
     즉시 갱신할 수 있게 합니다.
   ========================================================================= */
(function(){
  const WALLET_API_BASE = (window.VIBERUN_WALLET_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
  let cachedWallet = null;

  function getAccessToken(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";

    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? String(account.accessToken || "") : "";
  }

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gemValue = typeof source.gem !== "undefined" ? source.gem : source.moonShards;
    const gem = Math.max(0, Math.floor(Number(gemValue) || 0));
    return { gem, moonShards: gem };
  }

  function emitWalletChanged(wallet){
    try {
      window.dispatchEvent(new CustomEvent("viberun:wallet-changed", {
        detail: { wallet: wallet ? normalizeWallet(wallet) : null }
      }));
    } catch(error) {
      console.warn("[Wallet] wallet 변경 이벤트 발행에 실패했습니다.", error);
    }
  }

  function requestWalletJson(){
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

    return fetch(WALLET_API_BASE + "/wallet", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    }).then(response => response.text().then(text => {
      let body = {};
      if(text){
        try {
          body = JSON.parse(text);
        } catch(error) {
          console.warn("[Wallet] 서버 응답 JSON 파싱에 실패했습니다.", error);
          body = { message: text };
        }
      }

      if(response.ok) return Object.assign({ ok: true }, body);
      return {
        ok: false,
        status: response.status,
        code: body.code || body.errorCode || "",
        message: body.message || "wallet 조회에 실패했습니다.",
        body
      };
    })).catch(error => {
      console.warn("[Wallet] 서버 wallet 조회 중 네트워크 오류가 발생했습니다.", error);
      return {
        ok: false,
        code: "NETWORK_ERROR",
        error,
        message: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요."
      };
    });
  }

  function fetchWallet(){
    return requestWalletJson().then(result => {
      if(!result || !result.ok) return result;

      const wallet = normalizeWallet(result.wallet);
      setCachedWallet(wallet);
      return Object.assign({}, result, { wallet });
    });
  }

  function getCachedWallet(){
    return cachedWallet ? Object.assign({}, cachedWallet) : null;
  }

  function setCachedWallet(wallet){
    cachedWallet = normalizeWallet(wallet);
    emitWalletChanged(cachedWallet);
    return getCachedWallet();
  }

  function clearCachedWallet(){
    cachedWallet = null;
    emitWalletChanged(null);
  }

  window.VIBERUN_WALLET = {
    fetchWallet,
    getCachedWallet,
    setCachedWallet,
    clearCachedWallet
  };

  window.addEventListener("viberun:auth-changed", event => {
    const isLoggedIn = !!(event && event.detail && event.detail.isLoggedIn);
    if(!isLoggedIn) clearCachedWallet();
  });
})();
