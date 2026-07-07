"use strict";
/* =========================================================================
   Ranking Service
   - Uses Supabase rankings table directly.
   - Keeps the same public API used by rankingUI.js and runResult.js.
   ========================================================================= */
(function(){
  const DEFAULT_NICKNAME = "빛솔이";
  const RANKING_PERIODS = ["all", "weekly", "daily"];
  const RANKING_LIMIT = 100;
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const submittedRunIds = new Set();

  function getClient(){
    const bridge = window.VIBERUN_SUPABASE;
    return bridge && typeof bridge.getClient === "function" ? bridge.getClient() : null;
  }

  function getAccountInfo(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return null;
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? account : null;
  }

  function getCurrentUserId(){
    const account = getAccountInfo();
    return account ? String(account.accountId || account.uid || "").trim() : "";
  }

  function normalizeRankingPeriod(period){
    return RANKING_PERIODS.includes(period) ? period : "all";
  }

  function getKstPeriodStartIso(period){
    const safePeriod = normalizeRankingPeriod(period);
    if(safePeriod === "all") return "";

    const now = new Date();
    const kstNow = new Date(now.getTime() + KST_OFFSET_MS);
    const year = kstNow.getUTCFullYear();
    const month = kstNow.getUTCMonth();
    const date = kstNow.getUTCDate();

    if(safePeriod === "daily"){
      return new Date(Date.UTC(year, month, date) - KST_OFFSET_MS).toISOString();
    }

    const day = kstNow.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    return new Date(Date.UTC(year, month, date - daysFromMonday) - KST_OFFSET_MS).toISOString();
  }

  function normalizeRankingRow(row, rank){
    const source = row && typeof row === "object" ? row : {};
    return {
      id: source.id,
      rank,
      userId: String(source.user_id || "").trim(),
      nickname: String(source.nickname || "익명").trim() || "익명",
      score: Math.floor(Number(source.score) || 0),
      playTimeMs: Math.max(0, Math.floor(Number(source.play_time) || 0)),
      createdAt: source.created_at || null
    };
  }

  function buildError(code, message, error){
    return {
      ok: false,
      code,
      message,
      error: error || null
    };
  }

  function getCachedNickname(){
    const userData = window.VIBERUN_USER_DATA;
    if(userData && typeof userData.getCachedProfile === "function"){
      const profile = userData.getCachedProfile();
      if(profile && profile.nickname) return String(profile.nickname).trim();
    }

    return "";
  }

  async function fetchNickname(userId){
    const cachedNickname = getCachedNickname();
    if(cachedNickname) return cachedNickname;

    const client = getClient();
    if(!client || !userId) return DEFAULT_NICKNAME;

    const result = await client.from("profiles")
      .select("nickname")
      .eq("id", userId)
      .limit(1);

    if(result && result.error){
      console.warn("[Ranking] profile nickname load failed:", result.error);
      return DEFAULT_NICKNAME;
    }

    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return row && row.nickname ? String(row.nickname).trim() : DEFAULT_NICKNAME;
  }

  async function fetchRanking(period){
    const safePeriod = normalizeRankingPeriod(period);

    const client = getClient();
    if(!client){
      return buildError("SUPABASE_UNAVAILABLE", "랭킹 서버 연결 전입니다.");
    }

    let query = client.from("rankings")
      .select("id,user_id,nickname,score,play_time,created_at")
      .order("score", { ascending: false })
      .order("play_time", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(RANKING_LIMIT);

    const periodStartIso = getKstPeriodStartIso(safePeriod);
    if(periodStartIso){
      query = query.gte("created_at", periodStartIso);
    }

    const result = await query;

    if(result && result.error){
      return buildError("RANKING_LOAD_FAILED", result.error.message || "랭킹을 불러오지 못했습니다.", result.error);
    }

    const rows = Array.isArray(result.data) ? result.data : [];
    return {
      ok: true,
      period: safePeriod,
      rows: rows.map((row, index) => normalizeRankingRow(row, index + 1))
    };
  }

  async function fetchMyRanking(period){
    const userId = getCurrentUserId();
    if(!userId){
      return buildError("NOT_LOGGED_IN", "로그인이 필요합니다.");
    }

    const response = await fetchRanking(period);
    if(!response || !response.ok) return response;

    const myRank = response.rows.find(row => row.userId === userId) || null;
    return {
      ok: true,
      period: response.period,
      myRank
    };
  }

  async function submitRunResult(snapshot){
    if(!snapshot || !snapshot.runId){
      return buildError("INVALID_SNAPSHOT", "랭킹에 등록할 전투 기록이 없습니다.");
    }

    if(submittedRunIds.has(snapshot.runId)){
      return { ok: true, skipped: true, code: "ALREADY_SUBMITTED_CLIENT" };
    }

    const scoreBreakdown = snapshot.scoreBreakdown || {};
    if(scoreBreakdown.isTemporary){
      return buildError("TEMPORARY_SCORE", "임시 점수는 랭킹에 등록하지 않습니다.");
    }

    const client = getClient();
    const userId = getCurrentUserId();
    if(!client || !userId){
      return buildError("NOT_LOGGED_IN", "로그인이 필요합니다.");
    }

    const score = Math.floor(Number(snapshot.totalScore ?? scoreBreakdown.total ?? 0));
    const playTimeMs = Math.max(0, Math.floor(Number(snapshot.playTimeMs) || 0));
    if(!Number.isFinite(score)){
      return buildError("INVALID_SCORE", "점수 정보가 올바르지 않습니다.");
    }

    submittedRunIds.add(snapshot.runId);

    try {
      const nickname = await fetchNickname(userId);
      const result = await client.from("rankings").insert({
        user_id: userId,
        nickname,
        score,
        play_time: playTimeMs
      }).select("id,user_id,nickname,score,play_time,created_at").single();

      if(result && result.error){
        submittedRunIds.delete(snapshot.runId);
        return buildError("RANKING_SUBMIT_FAILED", result.error.message || "랭킹 등록에 실패했습니다.", result.error);
      }

      if(typeof window.dispatchEvent === "function"){
        window.dispatchEvent(new CustomEvent("viberun:ranking-updated", {
          detail: { runId: snapshot.runId, score, playTimeMs }
        }));
      }

      return {
        ok: true,
        row: normalizeRankingRow(result.data, null)
      };
    } catch(error) {
      submittedRunIds.delete(snapshot.runId);
      console.warn("[Ranking] submit failed:", error);
      return buildError("RANKING_SUBMIT_FAILED", "랭킹 등록 중 오류가 발생했습니다.", error);
    }
  }

  function clearRankingCache(){
    submittedRunIds.clear();
  }

  window.VIBERUN_RANKING_SERVICE = {
    PERIODS: RANKING_PERIODS,
    fetchRanking,
    fetchMyRanking,
    submitRunResult,
    clearCache: clearRankingCache
  };
})();
