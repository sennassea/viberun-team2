"use strict";

/* =========================================================================
   Wallet Service
   - Keeps account BM currency separate from run currency.
   - Reads Supabase wallets through userDataService so wallet creation stays
     in one place.
   ========================================================================= */
(function(){
  let cachedWallet = null;

  function getAccount(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return null;
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? account : null;
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
      console.warn("[Wallet] Failed to emit wallet change event.", error);
    }
  }

  function fetchWallet(){
    const account = getAccount();
    if(!account){
      return Promise.resolve({
        ok: false,
        code: "NOT_LOGGED_IN",
        message: "Login is required."
      });
    }

    const userData = window.VIBERUN_USER_DATA;
    if(!userData || typeof userData.getOrCreateWallet !== "function"){
      return Promise.resolve({
        ok: false,
        code: "USER_DATA_UNAVAILABLE",
        message: "Wallet service is unavailable."
      });
    }

    return Promise.resolve(userData.getOrCreateWallet(account.accountId || account.uid)).then(result => {
      if(!result || !result.ok) return result || { ok: false, message: "Failed to load wallet." };

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
