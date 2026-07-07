"use strict";

/* =========================================================================
   Run Reward Service
   - Claims ACT1 result moon shard rewards through Supabase wallets.
   - Does not touch battle-only S.moonShards / RUN_STATE.moonShards directly.
   ========================================================================= */
(function(){
  const pendingClaimKeys = new Set();
  const claimedClaimKeys = new Set();

  function getClient(){
    const bridge = window.VIBERUN_SUPABASE;
    return bridge && typeof bridge.getClient === "function" ? bridge.getClient() : null;
  }

  function getAccountUserId(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return "";

    const account = auth.getAccountInfo();
    if(!account || !account.isLoggedIn) return "";
    return String(account.accountId || account.uid || "").trim();
  }

  function getCurrentUserId(){
    const client = getClient();
    if(client && client.auth && typeof client.auth.getUser === "function"){
      return client.auth.getUser().then(result => {
        const user = result && result.data ? result.data.user : null;
        return user && user.id ? String(user.id) : getAccountUserId();
      }).catch(() => getAccountUserId());
    }

    return Promise.resolve(getAccountUserId());
  }

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gemValue = typeof source.gem !== "undefined" ? source.gem : source.moonShards;
    const gem = Math.max(0, Math.floor(Number(gemValue) || 0));
    return {
      user_id: String(source.user_id || "").trim(),
      gem,
      moonShards: gem,
      updated_at: source.updated_at || null
    };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);

    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }

    return normalized;
  }

  function buildError(code, message, error){
    return {
      ok: false,
      code,
      message,
      error: error || null
    };
  }

  function getOrCreateWallet(userId){
    const userData = window.VIBERUN_USER_DATA;
    if(userData && typeof userData.getOrCreateWallet === "function"){
      return userData.getOrCreateWallet(userId);
    }

    return Promise.resolve(buildError("USER_DATA_UNAVAILABLE", "지갑 정보를 불러올 수 없습니다."));
  }

  async function claimAct1MoonReward(payload){
    const safePayload = payload && typeof payload === "object" ? payload : {};
    const claimKey = String(safePayload.claimKey || "").trim();
    const rewardMoonShards = Math.max(0, Math.floor(Number(safePayload.rewardMoonShards) || 0));

    if(!claimKey){
      return buildError("INVALID_CLAIM_KEY", "보상 수령 정보가 올바르지 않습니다.");
    }

    if(safePayload.isTemporary){
      return buildError("TEMPORARY_SCORE", "임시 점수는 보상을 수령할 수 없습니다.");
    }

    if(rewardMoonShards <= 0){
      return buildError("NO_REWARD", "수령할 달빛조각 보상이 없습니다.");
    }

    if(pendingClaimKeys.has(claimKey)){
      return buildError("REQUEST_PENDING", "이미 보상 수령 처리 중입니다.");
    }

    if(claimedClaimKeys.has(claimKey)){
      return {
        ok: true,
        code: "ALREADY_CLAIMED",
        reward: { moonShards: rewardMoonShards }
      };
    }

    const client = getClient();
    const userId = await getCurrentUserId();
    if(!client || !userId){
      return buildError("NOT_LOGGED_IN", "로그인이 필요합니다.");
    }

    pendingClaimKeys.add(claimKey);

    try {
      const walletResult = await getOrCreateWallet(userId);
      if(!walletResult || !walletResult.ok || !walletResult.wallet){
        return walletResult || buildError("WALLET_LOAD_FAILED", "지갑 정보를 불러오지 못했습니다.");
      }

      const currentWallet = normalizeWallet(walletResult.wallet);
      const nextGem = currentWallet.gem + rewardMoonShards;
      const updateResult = await client.from("wallets")
        .update({ gem: nextGem, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("*")
        .single();

      if(updateResult && updateResult.error){
        return buildError("WALLET_UPDATE_FAILED", updateResult.error.message || "달빛조각 수령에 실패했습니다.", updateResult.error);
      }

      claimedClaimKeys.add(claimKey);

      return {
        ok: true,
        claimKey,
        reward: { moonShards: rewardMoonShards },
        wallet: syncWallet(updateResult.data)
      };
    } catch(error) {
      console.warn("[RunReward] claim failed:", error);
      return buildError("CLAIM_ERROR", "달빛조각 수령 중 오류가 발생했습니다.", error);
    } finally {
      pendingClaimKeys.delete(claimKey);
    }
  }

  window.VIBERUN_RUN_REWARD = {
    claimAct1MoonReward
  };
})();
