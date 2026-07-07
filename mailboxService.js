"use strict";

/* =========================================================================
   Mailbox Service
   - Uses Supabase mails plus claim_mail/refund_mail RPCs.
   - Keeps the public response shape used by mailboxUI.js.
   ========================================================================= */
(function(){
  const pendingMailActions = new Set();

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

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gemValue = typeof source.gem !== "undefined" ? source.gem : source.moonShards;
    const gem = Math.max(0, Math.floor(Number(gemValue) || 0));
    return { gem, moonShards: gem };
  }

  function getCachedWallet(){
    const userData = window.VIBERUN_USER_DATA;
    if(userData && typeof userData.getCachedWallet === "function"){
      const wallet = userData.getCachedWallet();
      if(wallet) return normalizeWallet(wallet);
    }

    const wallet = window.VIBERUN_WALLET;
    if(wallet && typeof wallet.getCachedWallet === "function"){
      return normalizeWallet(wallet.getCachedWallet());
    }

    return { gem: 0, moonShards: 0 };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }
    return normalized;
  }

  function fetchWallet(){
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.fetchWallet === "function"){
      return Promise.resolve(window.VIBERUN_WALLET.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet) return syncWallet(result.wallet);
        return getCachedWallet();
      });
    }
    return Promise.resolve(getCachedWallet());
  }

  function findBMProduct(productId){
    const data = window.VIBERUN_BM_STORE_DATA;
    if(!data || typeof data.findProduct !== "function") return null;
    return data.findProduct(productId);
  }

  function updateWalletGem(client, account, nextGem){
    const userId = account && (account.accountId || account.uid);
    if(!userId) return Promise.resolve({ ok: false, code: "ACCOUNT_REQUIRED" });

    return client.from("wallets")
      .update({ gem: Math.max(0, Math.floor(Number(nextGem) || 0)), updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select("*")
      .single()
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to update wallet." };
        }
        return { ok: true, wallet: syncWallet(result.data) };
      });
  }

  function refundSpentGemIfNeeded(client, account, mail){
    const product = findBMProduct(mail && mail.productId);
    if(!product || product.priceType !== "moon_shard") return fetchWallet();

    const price = Math.max(0, Math.floor(Number(product.price) || 0));
    if(!price) return fetchWallet();

    return fetchWallet().then(wallet => {
      const currentGem = Math.max(0, Math.floor(Number(wallet && wallet.gem) || 0));
      return updateWalletGem(client, account, currentGem + price).then(result => {
        if(result && result.ok && result.wallet) return result.wallet;
        return wallet;
      });
    });
  }

  function toTime(value){
    if(!value) return 0;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
  }

  function normalizeMail(row){
    const source = row && typeof row === "object" ? row : {};
    const rewards = Array.isArray(source.rewards) ? source.rewards : [];
    return {
      mailId: String(source.id || "").trim(),
      id: String(source.id || "").trim(),
      source: source.source || "system",
      status: source.status || "PURCHASED_UNCLAIMED",
      title: source.title || source.product_name || "",
      message: source.message || "",
      productId: source.product_id || "",
      productName: source.product_name || source.title || "",
      productDescription: source.product_description || "",
      productType: source.product_type || "",
      purchaseType: source.purchase_type || "",
      isRepeatable: !!source.is_repeatable,
      rewards,
      purchasedAt: toTime(source.purchased_at || source.created_at),
      refundUntil: toTime(source.refund_until),
      claimedAt: toTime(source.claimed_at),
      refundedAt: toTime(source.refunded_at),
      createdAt: toTime(source.created_at)
    };
  }

  function requireReady(){
    const client = getClient();
    const account = getAccount();
    if(!client){
      return { ok: false, code: "SUPABASE_UNAVAILABLE", message: "Supabase is unavailable." };
    }
    if(!account){
      return { ok: false, code: "NOT_LOGGED_IN", message: "Login is required." };
    }
    return { ok: true, client, account };
  }

  function fetchMailboxList(){
    const ready = requireReady();
    if(!ready.ok){
      return Promise.resolve(Object.assign({}, ready, {
        items: [],
        wallet: getCachedWallet()
      }));
    }

    return ready.client.from("mails")
      .select("*")
      .eq("user_id", ready.account.accountId || ready.account.uid)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(result => {
        if(result && result.error){
          return {
            ok: false,
            error: result.error,
            message: result.error.message || "Failed to load mailbox.",
            wallet: getCachedWallet(),
            items: []
          };
        }

        return fetchWallet().then(wallet => ({
          ok: true,
          items: Array.isArray(result.data) ? result.data.map(normalizeMail) : [],
          wallet
        }));
      }).catch(error => {
        console.warn("[Mailbox] Failed to load mailbox.", error);
        return {
          ok: false,
          error,
          message: "Failed to load mailbox.",
          wallet: getCachedWallet(),
          items: []
        };
      });
  }

  function claimMail(mailId){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);
    const actionKey = "claim:" + String(mailId || "");
    if(pendingMailActions.has(actionKey)){
      return Promise.resolve({ ok: false, code: "REQUEST_PENDING", message: "Request is already pending." });
    }

    pendingMailActions.add(actionKey);
    return ready.client.rpc("claim_mail", { p_mail_id: mailId }).then(result => {
      if(result && result.error){
        return {
          ok: false,
          error: result.error,
          message: result.error.message || "Failed to claim mail."
        };
      }

      const data = result && result.data ? result.data : {};
      const mail = normalizeMail(data.mail);
      const wallet = data.wallet ? syncWallet(data.wallet) : getCachedWallet();
      return {
        ok: true,
        claimedMailId: mail.mailId || mailId,
        mail,
        rewards: mail.rewards,
        wallet
      };
    }).catch(error => {
      console.warn("[Mailbox] Failed to claim mail.", error);
      return { ok: false, error, message: "Failed to claim mail." };
    }).finally(() => {
      pendingMailActions.delete(actionKey);
    });
  }

  function claimAllMail(){
    return fetchMailboxList().then(listResult => {
      if(!listResult || !listResult.ok) return listResult;

      const targets = listResult.items.filter(item =>
        item.status !== "CLAIMED" && item.status !== "REFUNDED"
      );

      const claimedMailIds = [];
      const rewards = [];
      let wallet = listResult.wallet;

      return targets.reduce((chain, item) => {
        return chain.then(() => claimMail(item.mailId).then(result => {
          if(result && result.ok){
            claimedMailIds.push(result.claimedMailId || item.mailId);
            if(Array.isArray(result.rewards)) rewards.push.apply(rewards, result.rewards);
            if(result.wallet) wallet = result.wallet;
          }
        }));
      }, Promise.resolve()).then(() => ({
        ok: true,
        claimedMailIds,
        rewards,
        wallet
      }));
    });
  }

  function refundMail(mailId){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);
    const actionKey = "refund:" + String(mailId || "");
    if(pendingMailActions.has(actionKey)){
      return Promise.resolve({ ok: false, code: "REQUEST_PENDING", message: "Request is already pending." });
    }

    pendingMailActions.add(actionKey);
    return ready.client.rpc("refund_mail", { p_mail_id: mailId }).then(result => {
      if(result && result.error){
        return {
          ok: false,
          error: result.error,
          message: result.error.message || "Failed to refund mail."
        };
      }

      const data = result && result.data ? result.data : {};
      const mail = normalizeMail(data.mail);
      return refundSpentGemIfNeeded(ready.client, ready.account, mail).then(wallet => ({
        ok: true,
        refundedMailId: mail.mailId || mailId,
        mail,
        wallet
      }));
    }).catch(error => {
      console.warn("[Mailbox] Failed to refund mail.", error);
      return { ok: false, error, message: "Failed to refund mail." };
    }).finally(() => {
      pendingMailActions.delete(actionKey);
    });
  }

  window.VIBERUN_MAILBOX = {
    fetchList: fetchMailboxList,
    claim: claimMail,
    claimAll: claimAllMail,
    refund: refundMail
  };
})();
