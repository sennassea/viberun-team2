"use strict";

/* =========================================================================
   Cheat Wallet Service
   - Developer-only wallet cheat helpers.
   - Updates wallets.gem and records the action in cheat_logs.
   ========================================================================= */
(function(){
  function getClient(){
    const bridge = window.VIBERUN_SUPABASE;
    return bridge && typeof bridge.getClient === "function" ? bridge.getClient() : null;
  }

  function getAccount(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return null;
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? account : null;
  }

  function getUserId(account){
    return String((account && (account.accountId || account.uid)) || "").trim();
  }

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gem = Math.max(0, Math.floor(Number(source.gem ?? source.moonShards) || 0));
    return { gem, moonShards: gem };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }
    return normalized;
  }

  function buildError(code, message, error){
    return { ok: false, code, message, error: error || null };
  }

  function getOrCreateWallet(userId){
    const userData = window.VIBERUN_USER_DATA;
    if(userData && typeof userData.getOrCreateWallet === "function"){
      return userData.getOrCreateWallet(userId);
    }
    return Promise.resolve(buildError("USER_DATA_UNAVAILABLE", "Wallet service is unavailable."));
  }

  function calcNextValue(op, currentGem, amount){
    const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
    if(op === "add") return currentGem + safeAmount;
    if(op === "take") return Math.max(0, currentGem - safeAmount);
    if(op === "set") return safeAmount;
    return null;
  }

  function insertCheatLog(client, params){
    return client.from("cheat_logs").insert({
      user_id: params.userId,
      cheat_type: "wallet_moon",
      target: "wallet",
      operation: params.op,
      amount: params.amount,
      before_value: params.beforeValue,
      after_value: params.afterValue,
      memo: params.memo || ""
    }).then(result => {
      if(result && result.error){
        console.warn("[CheatWallet] Failed to write cheat log.", result.error);
      }
      return result;
    }).catch(error => {
      console.warn("[CheatWallet] Failed to write cheat log.", error);
      return null;
    });
  }

  async function updateMoon(op, amount, memo){
    const client = getClient();
    const account = getAccount();
    const userId = getUserId(account);
    if(!client) return buildError("SUPABASE_UNAVAILABLE", "Supabase is unavailable.");
    if(!userId) return buildError("NOT_LOGGED_IN", "Login is required.");

    const walletResult = await getOrCreateWallet(userId);
    if(!walletResult || !walletResult.ok || !walletResult.wallet){
      return walletResult || buildError("WALLET_LOAD_FAILED", "Failed to load wallet.");
    }

    const currentGem = normalizeWallet(walletResult.wallet).gem;
    const nextGem = calcNextValue(op, currentGem, amount);
    if(nextGem === null){
      return buildError("INVALID_OPERATION", "Unknown wallet cheat operation.");
    }

    const updateResult = await client.from("wallets")
      .update({ gem: nextGem, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select("*")
      .single();

    if(updateResult && updateResult.error){
      return buildError("WALLET_UPDATE_FAILED", updateResult.error.message || "Failed to update wallet.", updateResult.error);
    }

    const wallet = syncWallet(updateResult.data);
    await insertCheatLog(client, {
      userId,
      op,
      amount: Math.max(0, Math.floor(Number(amount) || 0)),
      beforeValue: currentGem,
      afterValue: wallet.gem,
      memo
    });

    return {
      ok: true,
      wallet,
      beforeValue: currentGem,
      afterValue: wallet.gem
    };
  }

  function getMoon(){
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.fetchWallet === "function"){
      return Promise.resolve(window.VIBERUN_WALLET.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet){
          return { ok: true, wallet: normalizeWallet(result.wallet) };
        }
        return result || buildError("WALLET_LOAD_FAILED", "Failed to load wallet.");
      });
    }

    return Promise.resolve(buildError("WALLET_SERVICE_UNAVAILABLE", "Wallet service is unavailable."));
  }

  window.VIBERUN_CHEAT_WALLET = {
    updateMoon,
    getMoon
  };
})();
