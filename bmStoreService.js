"use strict";

/* =========================================================================
   BM Store Service
   - Purchase results are delivered through Supabase mails.
   - Account BM currency is wallets.gem, exposed to UI as moonShards.
   ========================================================================= */
(function(){
  const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const EQUIPPED_SKIN_KEY = "viberunEquippedSkinId";
  const pendingPurchases = new Set();
  let cachedDummyInventory = [];
  let cachedDeckPackUnlocks = { ownedDeckPackIds: [] };

  function getData(){
    return window.VIBERUN_BM_STORE_DATA;
  }

  function getClient(){
    const bridge = window.VIBERUN_SUPABASE;
    return bridge && typeof bridge.getClient === "function" ? bridge.getClient() : null;
  }

  function getAuthAccount(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.getAccountInfo !== "function") return null;
    const account = auth.getAccountInfo();
    return account && account.isLoggedIn ? account : null;
  }

  function requireReady(){
    const client = getClient();
    const account = getAuthAccount();
    if(!client) return { ok: false, code: "SUPABASE_UNAVAILABLE", message: "Supabase is unavailable." };
    if(!account) return { ok: false, code: "NOT_LOGGED_IN", message: "Login is required." };
    return { ok: true, client, account, userId: account.accountId || account.uid };
  }

  function normalizeWallet(wallet){
    const source = wallet && typeof wallet === "object" ? wallet : {};
    const gemValue = typeof source.gem !== "undefined" ? source.gem : source.moonShards;
    const moonShards = Math.max(0, Math.floor(Number(gemValue) || 0));
    return { gem: moonShards, moonShards };
  }

  function syncWallet(wallet){
    const normalized = normalizeWallet(wallet);
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function"){
      window.VIBERUN_WALLET.setCachedWallet(normalized);
    }
    return normalized;
  }

  function fetchWalletIfNeeded(){
    const walletService = window.VIBERUN_WALLET;
    const cached = walletService && typeof walletService.getCachedWallet === "function"
      ? walletService.getCachedWallet()
      : null;
    if(cached) return Promise.resolve(normalizeWallet(cached));

    if(walletService && typeof walletService.fetchWallet === "function"){
      return Promise.resolve(walletService.fetchWallet()).then(result => {
        if(result && result.ok && result.wallet) return normalizeWallet(result.wallet);
        return { gem: 0, moonShards: 0 };
      });
    }

    return Promise.resolve({ gem: 0, moonShards: 0 });
  }

  function normalizeDeckPackUnlocks(deckPackUnlocks){
    const ownedDeckPackIds = deckPackUnlocks && Array.isArray(deckPackUnlocks.ownedDeckPackIds)
      ? deckPackUnlocks.ownedDeckPackIds.map(id => String(id || "").trim()).filter(Boolean)
      : [];
    return { ownedDeckPackIds: Array.from(new Set(ownedDeckPackIds)) };
  }

  function syncDeckPackUnlocks(deckPackUnlocks){
    cachedDeckPackUnlocks = normalizeDeckPackUnlocks(deckPackUnlocks);
    window.VIBERUN_CONTENT_UNLOCKS = cachedDeckPackUnlocks;
    return cachedDeckPackUnlocks;
  }

  function getPackageProducts(){
    const data = getData();
    return data && typeof data.getPackageProducts === "function" ? data.getPackageProducts() : [];
  }

  function getProductsByTab(tab){
    const data = getData();
    if(data && typeof data.getProductsByTab === "function") return data.getProductsByTab(tab);
    return [];
  }

  function findPackageProduct(productId){
    const data = getData();
    return data && typeof data.findPackageProduct === "function" ? data.findPackageProduct(productId) : null;
  }

  function findProduct(productId){
    const data = getData();
    if(data && typeof data.findProduct === "function") return data.findProduct(productId);
    return findPackageProduct(productId) || findOrderPackProduct(productId) || findMoonChargeProduct(productId) || findMonthlyPassProduct(productId);
  }

  function getOrderPackProducts(){
    const data = getData();
    return data && typeof data.getOrderPackProducts === "function" ? data.getOrderPackProducts() : [];
  }

  function findOrderPackProduct(productId){
    const data = getData();
    return data && typeof data.findOrderPackProduct === "function" ? data.findOrderPackProduct(productId) : null;
  }

  function getMoonChargeProducts(){
    const data = getData();
    return data && typeof data.getMoonChargeProducts === "function" ? data.getMoonChargeProducts() : [];
  }

  function findMoonChargeProduct(productId){
    const data = getData();
    return data && typeof data.findMoonChargeProduct === "function" ? data.findMoonChargeProduct(productId) : null;
  }

  function getMonthlyPassProducts(){
    const data = getData();
    return data && typeof data.getMonthlyPassProducts === "function" ? data.getMonthlyPassProducts() : [];
  }

  function findMonthlyPassProduct(productId){
    const data = getData();
    return data && typeof data.findMonthlyPassProduct === "function" ? data.findMonthlyPassProduct(productId) : null;
  }

  function getRecommendedProducts(){
    const data = getData();
    return data && typeof data.getRecommendedProducts === "function" ? data.getRecommendedProducts() : [];
  }

  function toReward(product){
    if(!product) return [];
    if(product.rewardType === "moon_shard"){
      return [{ type: "moon_shard", amount: Math.max(0, Math.floor(Number(product.rewardAmount) || 0)) }];
    }
    if(product.rewardType === "character_skin"){
      return [{ type: "character_skin", id: product.skinId || product.id, name: product.name || "", amount: 1 }];
    }
    if(product.rewardType === "deck_pack"){
      return [{ type: "deck_pack", id: product.deckPackId || product.id, name: product.name || "", amount: 1 }];
    }
    if(product.rewardType === "monthly_pass"){
      const rewards = [{ type: "monthly_pass", id: product.id, name: product.name || "", amount: 1 }];
      if(product.immediateRewardType === "moon_shard" && Number(product.immediateRewardAmount) > 0){
        rewards.push({ type: "moon_shard", amount: Math.floor(Number(product.immediateRewardAmount) || 0) });
      }
      return rewards;
    }
    return [{ type: product.rewardType || "item", id: product.rewardId || product.id, name: product.name || "", amount: 1 }];
  }

  function normalizeMail(row){
    const source = row && typeof row === "object" ? row : {};
    return {
      mailId: String(source.id || "").trim(),
      source: source.source || "bm_purchase",
      status: source.status || "PURCHASED_UNCLAIMED",
      productId: source.product_id || "",
      productName: source.product_name || source.title || "",
      productDescription: source.product_description || "",
      rewards: Array.isArray(source.rewards) ? source.rewards : []
    };
  }

  function firstRow(data){
    if(Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  function productTypeFor(product){
    return product && product.rewardType === "moon_shard" ? "currency" : "item";
  }

  function isRepeatableProduct(product){
    return !!(product && product.rewardType === "moon_shard");
  }

  function getKstDateKey(time){
    const date = new Date((Number(time) || Date.now()) + 9 * 60 * 60 * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  /* KST 달력 날짜의 자정(00:00 KST) 시각을 ms로 반환합니다.
     시/분/초를 버리고 날짜만 비교해야 "서버 날짜가 하루 지났는지"를
     정확히 판단할 수 있습니다 (구매 시각의 시/분에 좌우되지 않도록). */
  function kstMidnightMs(time){
    return Date.parse(getKstDateKey(time) + "T00:00:00.000+09:00");
  }

  function kstCalendarDaysDiff(fromTime, toTime){
    return Math.round((kstMidnightMs(toTime) - kstMidnightMs(fromTime)) / 86400000);
  }

  function normalizeMonthlyPass(row){
    const source = row && typeof row === "object" ? row : {};
    const expiresAtTime = source.expires_at ? Date.parse(source.expires_at) : 0;
    const active = !!source.active && expiresAtTime > Date.now();
    const dailyRewardAmount = Math.max(0, Math.floor(Number(source.daily_reward_amount) || 15));
    const durationDays = Math.max(1, Math.floor(Number(source.duration_days) || 30));
    const claimedDays = Math.max(0, Math.floor(Number(source.claimed_days) || 0));
    const todayKey = getKstDateKey(Date.now());
    const lastClaimDate = source.last_claim_date ? String(source.last_claim_date) : "";
    const daysRemaining = active ? Math.max(0, kstCalendarDaysDiff(Date.now(), expiresAtTime)) : durationDays;

    return {
      active,
      productId: source.product_id || "monthly_moon_promise",
      startedAt: source.started_at ? Date.parse(source.started_at) : 0,
      expiresAt: expiresAtTime,
      lastClaimDate,
      claimedDays,
      durationDays,
      dailyRewardAmount,
      todayRewardAmount: dailyRewardAmount,
      daysRemaining,
      canClaimToday: active && lastClaimDate !== todayKey && claimedDays < durationDays
    };
  }

  function emptyMonthlyPassStatus(){
    return {
      active: false,
      daysRemaining: 30,
      dailyRewardAmount: 15,
      todayRewardAmount: 15,
      canClaimToday: false
    };
  }

  function emitMonthlyPassChanged(monthlyPass){
    if(typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent("viberun:monthly-pass-changed", {
      detail: { monthlyPass }
    }));
  }

  function createPurchaseMail(product, ready){
    const rewards = toReward(product);
    const now = Date.now();
    const row = {
      user_id: ready.userId,
      source: "bm_purchase",
      status: "PURCHASED_UNCLAIMED",
      title: product.name || "",
      message: "Purchased item has arrived.",
      product_id: product.id,
      product_name: product.name || "",
      product_description: product.description || product.subtitle || "",
      product_type: productTypeFor(product),
      is_repeatable: isRepeatableProduct(product),
      rewards,
      purchased_at: new Date(now).toISOString(),
      refund_until: new Date(now + REFUND_WINDOW_MS).toISOString()
    };

    return ready.client.from("mails").insert(row).select("*").then(result => {
      if(result && result.error){
        return {
          ok: false,
          error: result.error,
          code: result.error.code === "23505" ? "ALREADY_PURCHASED" : result.error.code,
          message: result.error.code === "23505" ? "This product has already been purchased." : (result.error.message || "Failed to create purchase mail.")
        };
      }

      const mailRow = firstRow(result.data);
      if(!mailRow){
        return {
          ok: false,
          code: "MAIL_INSERT_EMPTY",
          message: "Purchase mail was not created."
        };
      }

      return {
        ok: true,
        mail: normalizeMail(mailRow),
        productId: product.id,
        rewards
      };
    });
  }

  function updateWalletGem(client, userId, nextGem){
    const nextGemValue = Math.max(0, Math.floor(Number(nextGem) || 0));

    return client.from("wallets")
      .update({ gem: nextGemValue, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to update wallet." };
        }

        return client.from("wallets")
          .select("*")
          .eq("user_id", userId)
          .limit(1)
          .then(selectResult => {
            if(selectResult && selectResult.error){
              return { ok: false, error: selectResult.error, message: selectResult.error.message || "Failed to load wallet." };
            }

            const walletRow = firstRow(selectResult.data);
            if(!walletRow || Math.max(0, Math.floor(Number(walletRow.gem) || 0)) !== nextGemValue){
              return { ok: false, code: "WALLET_UPDATE_EMPTY", message: "Wallet was not updated." };
            }

            return { ok: true, wallet: syncWallet(walletRow) };
          });
      });
  }

  function purchaseCashProduct(product){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);
    return createPurchaseMail(product, ready).then(result => {
      if(!result || !result.ok) return result;
      return fetchWalletIfNeeded().then(wallet => Object.assign({}, result, { wallet }));
    });
  }

  function purchaseGemProduct(product){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);

    return fetchWalletIfNeeded().then(wallet => {
      const price = Math.max(0, Math.floor(Number(product.price) || 0));
      if(wallet.moonShards < price){
        return {
          ok: false,
          code: "INSUFFICIENT_MOON_SHARDS",
          message: "Not enough moon shards.",
          wallet
        };
      }

      const nextGem = wallet.moonShards - price;
      return updateWalletGem(ready.client, ready.userId, nextGem).then(walletResult => {
        if(!walletResult || !walletResult.ok) return walletResult;

        return createPurchaseMail(product, ready).then(mailResult => {
          if(mailResult && mailResult.ok){
            return Object.assign({}, mailResult, { wallet: walletResult.wallet });
          }

          return updateWalletGem(ready.client, ready.userId, wallet.moonShards).then(revertResult => {
            if(revertResult && revertResult.wallet) mailResult.wallet = revertResult.wallet;
            return mailResult;
          });
        });
      });
    });
  }

  function purchaseProductInternal(product){
    if(product.priceType === "moon_shard") return purchaseGemProduct(product);
    return purchaseCashProduct(product);
  }

  function purchaseGuarded(product){
    if(!product){
      return Promise.resolve({ ok: false, code: "UNKNOWN_PRODUCT", message: "Unknown product." });
    }

    if(product.dimmed || product.comingSoon || product.purchasable === false){
      return Promise.resolve({
        ok: false,
        code: "COMING_SOON",
        message: product.disabledReason || "Coming soon."
      });
    }

    if(pendingPurchases.has(product.id)){
      return Promise.resolve({ ok: false, code: "REQUEST_PENDING", message: "Request is already pending." });
    }

    pendingPurchases.add(product.id);
    return purchaseProductInternal(product).finally(() => {
      pendingPurchases.delete(product.id);
    });
  }

  function purchasePackage(productId){
    return purchaseGuarded(findPackageProduct(productId));
  }

  function purchaseCharacterSkin(productId){
    const product = findPackageProduct(productId);
    if(product && product.saleEndAt){
      const saleEndAt = Date.parse(product.saleEndAt);
      if(Number.isFinite(saleEndAt) && Date.now() >= saleEndAt){
        return Promise.resolve({ ok: false, code: "CHARACTER_SKIN_SALE_ENDED", message: "Sale ended." });
      }
    }
    return purchaseGuarded(product);
  }

  function purchaseOrderPack(productId){
    return purchaseGuarded(findOrderPackProduct(productId));
  }

  function purchaseDeckPack(productId){
    return purchaseGuarded(findOrderPackProduct(productId)).then(result => {
      if(result && result.ok) return fetchDeckPackUnlocks().then(unlocks => Object.assign({}, result, { deckPackUnlocks: unlocks.deckPackUnlocks }));
      return result;
    });
  }

  function purchaseMoonCharge(productId){
    return purchaseGuarded(findMoonChargeProduct(productId));
  }

  function purchaseMonthlyPass(productId){
    return purchaseGuarded(findMonthlyPassProduct(productId));
  }

  function purchaseProduct(productId){
    return purchaseGuarded(findProduct(productId));
  }

  function rewardsContain(row, type){
    const rewards = Array.isArray(row && row.rewards) ? row.rewards : [];
    return rewards.some(reward => reward && reward.type === type);
  }

  function fetchClaimedPurchaseMails(){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(Object.assign({}, ready, { mails: [] }));

    return ready.client.from("mails")
      .select("*")
      .eq("user_id", ready.userId)
      .eq("source", "bm_purchase")
      .eq("status", "CLAIMED")
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to load claimed mails.", mails: [] };
        }
        return { ok: true, mails: Array.isArray(result.data) ? result.data : [] };
      });
  }

  function fetchDeckPackUnlocks(){
    return fetchClaimedPurchaseMails().then(result => {
      if(!result || !result.ok) return result;
      const ownedDeckPackIds = [];
      result.mails.forEach(mail => {
        (Array.isArray(mail.rewards) ? mail.rewards : []).forEach(reward => {
          if(reward && reward.type === "deck_pack" && reward.id) ownedDeckPackIds.push(String(reward.id));
        });
      });
      return {
        ok: true,
        deckPackUnlocks: syncDeckPackUnlocks({ ownedDeckPackIds })
      };
    });
  }

  function fetchCharacterSkinProfileState(){
    return fetchClaimedPurchaseMails().then(result => {
      const userData = window.VIBERUN_USER_DATA;
      const profile = userData && typeof userData.getCachedProfile === "function" ? userData.getCachedProfile() : null;
      if(!result || !result.ok){
        return {
          ok: false,
          profile: profile || null,
          characterSkins: { ownedSkinIds: [] }
        };
      }

      const ownedSkinIds = [];
      result.mails.forEach(mail => {
        (Array.isArray(mail.rewards) ? mail.rewards : []).forEach(reward => {
          if(reward && reward.type === "character_skin" && reward.id) ownedSkinIds.push(String(reward.id));
        });
      });

      const equippedSkinId = getStoredEquippedSkinId(ownedSkinIds);
      return {
        ok: true,
        profile: Object.assign({}, profile || {}, { equippedSkinId }),
        characterSkins: { ownedSkinIds: Array.from(new Set(ownedSkinIds)) }
      };
    });
  }

  function getStoredEquippedSkinId(ownedSkinIds){
    try {
      const value = String(localStorage.getItem(EQUIPPED_SKIN_KEY) || "").trim();
      return ownedSkinIds && ownedSkinIds.includes(value) ? value : null;
    } catch(error) {
      return null;
    }
  }

  function equipCharacterSkinProfile(skinId){
    return fetchCharacterSkinProfileState().then(result => {
      if(!result || !result.ok) return result;
      const ownedSkinIds = result.characterSkins && Array.isArray(result.characterSkins.ownedSkinIds)
        ? result.characterSkins.ownedSkinIds
        : [];
      const nextSkinId = String(skinId || "").trim();
      if(nextSkinId && !ownedSkinIds.includes(nextSkinId)){
        return { ok: false, code: "SKIN_NOT_OWNED", message: "Skin is not owned." };
      }
      try {
        if(nextSkinId) localStorage.setItem(EQUIPPED_SKIN_KEY, nextSkinId);
        else localStorage.removeItem(EQUIPPED_SKIN_KEY);
      } catch(error) {
        return { ok: false, error, message: "Failed to save equipped skin." };
      }
      return fetchCharacterSkinProfileState();
    });
  }

  function fetchProfileStatus(){
    const profile = window.VIBERUN_USER_DATA && typeof window.VIBERUN_USER_DATA.getCachedProfile === "function"
      ? window.VIBERUN_USER_DATA.getCachedProfile()
      : null;
    return Promise.resolve({ ok: true, profile });
  }

  function updateProfileNickname(nickname){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);
    const nextNickname = String(nickname || "").trim();

    return ready.client.from("profiles")
      .update({ nickname: nextNickname })
      .eq("id", ready.userId)
      .select("*")
      .single()
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to update nickname." };
        }

        if(window.VIBERUN_USER_DATA && typeof window.VIBERUN_USER_DATA.prepareUserData === "function"){
          window.VIBERUN_USER_DATA.prepareUserData(ready.account);
        }

        return { ok: true, profile: result.data, message: "Nickname updated." };
      });
  }

  function fetchMonthlyPassStatus(){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(Object.assign({}, ready, { monthlyPass: emptyMonthlyPassStatus() }));

    return ready.client.from("monthly_passes")
      .select("*")
      .eq("user_id", ready.userId)
      .limit(1)
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to load monthly pass.", monthlyPass: emptyMonthlyPassStatus() };
        }

        const row = firstRow(result.data);
        const monthlyPass = row ? normalizeMonthlyPass(row) : emptyMonthlyPassStatus();
        return { ok: true, monthlyPass };
      }).catch(error => {
        console.warn("[BMStore] Failed to load monthly pass.", error);
        return { ok: false, error, message: "Failed to load monthly pass.", monthlyPass: emptyMonthlyPassStatus() };
      });
  }

  function activateMonthlyPass(productId){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);

    const product = findMonthlyPassProduct(productId) || findMonthlyPassProduct("monthly_moon_promise") || {};
    const durationDays = Math.max(1, Math.floor(Number(product.durationDays) || 30));
    const dailyRewardAmount = Math.max(0, Math.floor(Number(product.dailyRewardAmount) || 15));
    const now = Date.now();

    return ready.client.from("monthly_passes")
      .select("*")
      .eq("user_id", ready.userId)
      .limit(1)
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to load monthly pass." };
        }

        const existing = firstRow(result.data);
        const existingExpiry = existing && existing.expires_at ? Date.parse(existing.expires_at) : 0;
        const startTime = Math.max(now, Number.isFinite(existingExpiry) ? existingExpiry : 0);
        const expiresAt = new Date(startTime + durationDays * 86400000).toISOString();
        const startedAt = existing && existing.started_at ? existing.started_at : new Date(now).toISOString();
        const row = {
          user_id: ready.userId,
          product_id: product.id || productId || "monthly_moon_promise",
          active: true,
          started_at: startedAt,
          expires_at: expiresAt,
          duration_days: durationDays,
          daily_reward_amount: dailyRewardAmount
        };

        const request = existing
          ? ready.client.from("monthly_passes").update(row).eq("user_id", ready.userId).select("*").single()
          : ready.client.from("monthly_passes").insert(row).select("*").single();

        return request.then(saveResult => {
          if(saveResult && saveResult.error){
            return { ok: false, error: saveResult.error, message: saveResult.error.message || "Failed to activate monthly pass." };
          }

          const monthlyPass = normalizeMonthlyPass(saveResult.data);
          emitMonthlyPassChanged(monthlyPass);
          return { ok: true, monthlyPass };
        });
      }).catch(error => {
        console.warn("[BMStore] Failed to activate monthly pass.", error);
        return { ok: false, error, message: "Failed to activate monthly pass." };
      });
  }

  function claimMonthlyPassDailyReward(){
    const ready = requireReady();
    if(!ready.ok) return Promise.resolve(ready);

    return ready.client.from("monthly_passes")
      .select("*")
      .eq("user_id", ready.userId)
      .limit(1)
      .then(result => {
        if(result && result.error){
          return { ok: false, error: result.error, message: result.error.message || "Failed to load monthly pass." };
        }

        const row = firstRow(result.data);
        const monthlyPass = row ? normalizeMonthlyPass(row) : emptyMonthlyPassStatus();
        if(!monthlyPass.active){
          return { ok: false, code: "MONTHLY_PASS_INACTIVE", message: "Monthly pass is not active.", monthlyPass };
        }
        if(!monthlyPass.canClaimToday){
          return { ok: false, code: "ALREADY_CLAIMED_TODAY", message: "Daily reward has already been claimed.", monthlyPass };
        }

        return fetchWalletIfNeeded().then(wallet => {
          const amount = monthlyPass.dailyRewardAmount;
          const nextGem = Math.max(0, Math.floor(Number(wallet.moonShards) || 0)) + amount;
          return updateWalletGem(ready.client, ready.userId, nextGem).then(walletResult => {
            if(!walletResult || !walletResult.ok) return walletResult;

            const nextClaimedDays = monthlyPass.claimedDays + 1;
            return ready.client.from("monthly_passes")
              .update({
                last_claim_date: getKstDateKey(Date.now()),
                claimed_days: nextClaimedDays
              })
              .eq("user_id", ready.userId)
              .select("*")
              .single()
              .then(updateResult => {
                if(updateResult && updateResult.error){
                  return { ok: false, error: updateResult.error, message: updateResult.error.message || "Failed to save monthly pass reward." };
                }

                const nextMonthlyPass = normalizeMonthlyPass(updateResult.data);
                emitMonthlyPassChanged(nextMonthlyPass);
                return {
                  ok: true,
                  monthlyPass: nextMonthlyPass,
                  wallet: walletResult.wallet,
                  reward: { type: "moon_shard", amount }
                };
              });
          });
        });
      }).catch(error => {
        console.warn("[BMStore] Failed to claim monthly pass reward.", error);
        return { ok: false, error, message: "Failed to claim monthly pass reward." };
      });
  }

  function fetchDummyInventory(){
    return fetchClaimedPurchaseMails().then(result => {
      if(!result || !result.ok) return result;
      cachedDummyInventory = [];
      result.mails.forEach(mail => {
        (Array.isArray(mail.rewards) ? mail.rewards : []).forEach(reward => {
          if(reward && reward.type === "dummy_item") cachedDummyInventory.push(reward);
        });
      });
      return { ok: true, dummyInventory: cachedDummyInventory.slice() };
    });
  }

  window.VIBERUN_BM_STORE_SERVICE = {
    getProductsByTab,
    getPackageProducts,
    purchasePackage,
    purchaseCharacterSkin,
    getOrderPackProducts,
    purchaseOrderPack,
    purchaseDeckPack,
    fetchDeckPackUnlocks,
    getMoonChargeProducts,
    purchaseMoonCharge,
    getMonthlyPassProducts,
    purchaseMonthlyPass,
    getRecommendedProducts,
    purchaseProduct,
    fetchMonthlyPassStatus,
    activateMonthlyPass,
    claimMonthlyPassDailyReward,
    fetchCharacterSkinProfileState,
    equipCharacterSkinProfile,
    fetchProfileStatus,
    updateProfileNickname,
    fetchDummyInventory,
    getCachedDeckPackUnlocks(){
      return normalizeDeckPackUnlocks(cachedDeckPackUnlocks);
    },
    getCachedDummyInventory(){
      return cachedDummyInventory.slice();
    }
  };
})();
