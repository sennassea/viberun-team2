"use strict";

/* =========================================================================
   Run Reward Service
   - ACT1 결과 점수에 따른 달빛조각 수령 요청을 담당한다.
   - 전투용 S.moonShards / RUN_STATE.moonShards는 절대 수정하지 않는다.
   - 서버 응답 wallet을 walletService에 동기화해 BM/선물함/메인 UI가 같은 수량을 보게 한다.
   ========================================================================= */
(function(){
  const API_BASE = (window.VIBERUN_RUN_REWARD_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");

  function getAccessToken(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";

    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? String(account.accessToken || "") : "";
  }

  function syncWallet(wallet){
    if(!wallet) return null;

    const normalized = {
      moonShards: Math.max(0, Math.floor(Number(wallet.moonShards) || 0))
    };

    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }

    return normalized;
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
        message: "네트워크 요청을 사용할 수 없습니다."
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
            console.warn("[RunReward] 서버 응답 JSON 파싱 실패", error);
            body = { message: text };
          }
        }

        if(response.ok) return Object.assign({ ok: true }, body);

        return {
          ok: false,
          status: response.status,
          code: body.code || body.errorCode || "",
          message: body.message || "달빛조각 수령에 실패했습니다.",
          body
        };
      }))
      .catch(error => {
        console.warn("[RunReward] 네트워크 오류", error);
        return {
          ok: false,
          code: "NETWORK_ERROR",
          error,
          message: "서버와 연결할 수 없습니다."
        };
      });
  }

  function claimAct1MoonReward(payload){
    const safePayload = payload && typeof payload === "object" ? payload : {};

    return requestJson("/run-result/act1/moon-reward/claim", {
      method: "POST",
      body: JSON.stringify({
        claimKey: safePayload.claimKey,
        result: safePayload.result,
        score: safePayload.score,
        scoreBreakdown: safePayload.scoreBreakdown,
        isTemporary: !!safePayload.isTemporary
      })
    }).then(result => {
      if(result && result.wallet) {
        result.wallet = syncWallet(result.wallet);
      }
      return result;
    });
  }

  window.VIBERUN_RUN_REWARD = {
    claimAct1MoonReward
  };
})();
