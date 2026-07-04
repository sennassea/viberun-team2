"use strict";

/* =========================================================================
   Mailbox Service
   - 로그인된 accountId 기준으로 서버 선물함(mailbox)/지갑(wallet)을 읽고 씁니다.
   - 인증은 accessToken을 Authorization: Bearer 헤더로 전달하는 방식만 사용하며,
     중복 수령 방지 등 실제 검증은 서버(local-mock-server.js/운영 서버)가 담당합니다.
   ========================================================================= */
(function(){
  const MAILBOX_API_BASE = (window.VIBERUN_MAILBOX_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");

  function getAccessToken(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? String(account.accessToken || "") : "";
  }

  function requestMailboxJson(path, options){
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

    return fetch(MAILBOX_API_BASE + path, Object.assign({}, requestOptions, { headers }))
      .then(response => response.text().then(text => {
        let body = {};
        if(text){
          try {
            body = JSON.parse(text);
          } catch(error) {
            console.warn("[Mailbox] 서버 응답 JSON 파싱 실패:", error);
            body = { message: text };
          }
        }

        if(response.ok) return Object.assign({ ok: true }, body);

        return {
          ok: false,
          status: response.status,
          code: body.code || body.errorCode || "",
          message: body.message || "선물함 요청에 실패했습니다.",
          body
        };
      }))
      .catch(error => {
        console.warn("[Mailbox] 서버 요청 중 네트워크 오류가 발생했습니다.", error);
        return {
          ok: false,
          code: "NETWORK_ERROR",
          error,
          message: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요."
        };
      });
  }

  /* GET /mailbox → { items, wallet } */
  function fetchMailboxList(){
    return requestMailboxJson("/mailbox", { method: "GET" });
  }

  /* POST /mailbox/{mailId}/claim → { claimedMailId, rewards, wallet } */
  function claimMail(mailId){
    return requestMailboxJson("/mailbox/" + encodeURIComponent(mailId) + "/claim", { method: "POST" });
  }

  /* POST /mailbox/claim-all → { claimedMailIds, rewards, wallet } */
  function claimAllMail(){
    return requestMailboxJson("/mailbox/claim-all", { method: "POST" });
  }

  window.VIBERUN_MAILBOX = {
    fetchList: fetchMailboxList,
    claim: claimMail,
    claimAll: claimAllMail
  };
})();
