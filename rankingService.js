"use strict";
/* =========================================================================
   Ranking Service
   - Provides ranking data lookups. Currently returns mock/empty data;
     wire up to a real backend when the ranking API is available.
   ========================================================================= */

const RANKING_PERIODS = ["all", "weekly", "daily"];

function buildMockRankingResponse(period){
  const now = Date.now();
  return {
    ok: true,
    period,
    lastUpdatedAt: now,
    nextUpdateAt: now + 10 * 60 * 1000,
    rows: []
  };
}

function fetchRanking(period){
  const normalized = RANKING_PERIODS.includes(period) ? period : "all";
  return Promise.resolve(buildMockRankingResponse(normalized));
}

function fetchMyRanking(period){
  const normalized = RANKING_PERIODS.includes(period) ? period : "all";
  return Promise.resolve({
    ok: true,
    period: normalized,
    connected: false,
    row: null
  });
}

function clearRankingCache(){}

window.VIBERUN_RANKING_SERVICE = {
  PERIODS: RANKING_PERIODS,
  fetchRanking,
  fetchMyRanking,
  clearCache: clearRankingCache
};
