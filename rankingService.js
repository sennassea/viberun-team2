"use strict";
/* =========================================================================
   Ranking Service
   - 인증은 accessToken을 Authorization: Bearer 헤더로 전달하는 방식만 사용한다
     (mailboxService.js / bmStoreService.js와 동일한 패턴).
   - 10분 캐시는 사용하지 않는다. fetchRanking/fetchMyRanking은 호출할 때마다
     서버에서 최신 데이터를 조회한다.
   ========================================================================= */
(function(){
  const RANKING_API_BASE = (window.VIBERUN_RANKING_API_BASE || window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
  const RANKING_PERIODS = ["all", "weekly", "daily"];
  const submittedRunIds = new Set();

  function getAccessToken(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? String(account.accessToken || "") : "";
  }

  function requestRankingJson(path, options, requireAuth){
    const token = getAccessToken();
    if(requireAuth && !token){
      return Promise.resolve({ ok:false, code:"NOT_LOGGED_IN", message:"로그인이 필요합니다." });
    }

    if(typeof fetch !== "function"){
      return Promise.resolve({ ok:false, code:"FETCH_UNAVAILABLE", message:"네트워크 요청을 사용할 수 없는 환경입니다." });
    }

    const requestOptions = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, requestOptions.headers || {});
    if(token) headers["Authorization"] = "Bearer " + token;

    return fetch(RANKING_API_BASE + path, Object.assign({}, requestOptions, { headers }))
      .then(response => response.text().then(text => {
        let body = {};
        if(text){
          try {
            body = JSON.parse(text);
          } catch(error) {
            console.warn("[Ranking] 서버 응답 JSON 파싱 실패:", error);
            body = { message: text };
          }
        }

        if(response.ok) return Object.assign({ ok: true }, body);

        if(response.status === 404){
          return {
            ok: false,
            status: 404,
            code: "RANKING_API_NOT_READY",
            message: "랭킹 서버가 준비되지 않았습니다.",
            body
          };
        }

        return {
          ok: false,
          status: response.status,
          code: body.code || body.errorCode || "",
          message: body.message || "랭킹 요청에 실패했습니다.",
          body
        };
      }))
      .catch(error => {
        console.warn("[Ranking] 서버 요청 중 네트워크 오류가 발생했습니다.", error);
        return {
          ok: false,
          code: "NETWORK_ERROR",
          error,
          message: "네트워크 오류가 발생했습니다."
        };
      });
  }

  function normalizeRankingPeriod(period){
    return RANKING_PERIODS.includes(period) ? period : "all";
  }

  function fetchRanking(period){
    const safePeriod = normalizeRankingPeriod(period);
    return requestRankingJson(
      "/ranking?period=" + encodeURIComponent(safePeriod) + "&t=" + Date.now(),
      { method: "GET", cache: "no-store" },
      false
    );
  }

  function fetchMyRanking(period){
    const safePeriod = normalizeRankingPeriod(period);
    return requestRankingJson(
      "/ranking/me?period=" + encodeURIComponent(safePeriod) + "&t=" + Date.now(),
      { method: "GET", cache: "no-store" },
      true
    );
  }

  async function submitRunResult(snapshot){
    if(!snapshot || !snapshot.runId){
      return { ok:false, code:"INVALID_SNAPSHOT" };
    }

    if(submittedRunIds.has(snapshot.runId)){
      return { ok:true, skipped:true, code:"ALREADY_SUBMITTED_CLIENT" };
    }

    const scoreBreakdown = snapshot.scoreBreakdown || {};

    if(scoreBreakdown.isTemporary){
      return { ok:false, code:"TEMPORARY_SCORE" };
    }

    const score = Math.floor(Number(snapshot.totalScore ?? scoreBreakdown.total ?? 0));
    const playTimeMs = Math.max(0, Math.floor(Number(snapshot.playTimeMs) || 0));

    if(!Number.isFinite(score)){
      return { ok:false, code:"INVALID_SCORE" };
    }

    submittedRunIds.add(snapshot.runId);

    const result = await requestRankingJson("/ranking/submit", {
      method: "POST",
      body: JSON.stringify({
        runId: snapshot.runId,
        result: snapshot.result,
        score,
        playTimeMs,
        scoreBreakdown,
        achievedAt: Date.now()
      })
    }, true);

    if(!result || !result.ok){
      submittedRunIds.delete(snapshot.runId);
      return result || { ok:false, code:"SUBMIT_FAILED" };
    }

    if(typeof window.dispatchEvent === "function"){
      window.dispatchEvent(new CustomEvent("viberun:ranking-updated", {
        detail: { runId: snapshot.runId, score, playTimeMs }
      }));
    }

    return result;
  }

  function clearRankingCache(){
    /* 10분 캐시는 더 이상 사용하지 않는다. 기존 UI 호환용으로만 남겨둔다. */
  }

  window.VIBERUN_RANKING_SERVICE = {
    PERIODS: RANKING_PERIODS,
    fetchRanking,
    fetchMyRanking,
    submitRunResult,
    clearCache: clearRankingCache
  };
})();
