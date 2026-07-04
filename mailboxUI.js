"use strict";

/* =========================================================================
   Mailbox UI (mailboxUI.js)
   - 계정 기반 선물함 1차 기능의 팝업 UI입니다.
   - 로그인 여부는 VIBERUN_AUTH.requireLogin으로 확인하고, 목록/수령은
     mailboxService.js(window.VIBERUN_MAILBOX)를 통해 서버와 통신합니다.
   - RUN_STATE/S.moonShards는 건드리지 않으며, 계정 wallet.moonShards는
     이 팝업 안에서만 표시합니다.
   ========================================================================= */
(function(){
  let els = null;
  const state = {
    loading: false,
    error: null,
    filter: "all", // all | unclaimed | claimed
    items: [],
    wallet: { moonShards: 0 }
  };

  function escapeHtml(str){
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  function ensureUI(){
    if(els) return els;

    const overlay = document.createElement("div");
    overlay.id = "mailboxUIOverlay";
    overlay.className = "mailbox-ui-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="mailbox-ui-panel" role="dialog" aria-modal="true" aria-labelledby="mailboxUITitle">' +
        '<div class="mailbox-ui-head">' +
          '<div class="mailbox-ui-title" id="mailboxUITitle">🎁 선물함</div>' +
          '<div class="mailbox-ui-wallet"><span class="mailbox-wallet-icon">🌙</span><span id="mailboxWalletValue">0</span></div>' +
          '<button type="button" class="mailbox-ui-close" aria-label="닫기">✕</button>' +
        '</div>' +
        '<div class="mailbox-ui-tabs">' +
          '<button type="button" class="mailbox-tab active" data-filter="all">전체</button>' +
          '<button type="button" class="mailbox-tab" data-filter="unclaimed">미수령</button>' +
          '<button type="button" class="mailbox-tab" data-filter="claimed">수령 완료</button>' +
        '</div>' +
        '<div class="mailbox-ui-body" id="mailboxUIBody"></div>' +
        '<div class="mailbox-ui-actions">' +
          '<button type="button" class="mailbox-claim-all-btn" id="mailboxClaimAllBtn">모두 받기</button>' +
          '<button type="button" class="mailbox-close-btn" id="mailboxCloseBtn">닫기</button>' +
        '</div>' +
      '</div>';

    overlay.addEventListener("click", event => {
      if(event.target === overlay) closeMailboxUI();
    });
    overlay.querySelector(".mailbox-ui-close").addEventListener("click", closeMailboxUI);
    overlay.querySelector("#mailboxCloseBtn").addEventListener("click", closeMailboxUI);
    overlay.querySelector("#mailboxClaimAllBtn").addEventListener("click", handleClaimAll);
    overlay.querySelectorAll(".mailbox-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        state.filter = tab.dataset.filter;
        render();
      });
    });
    overlay.querySelector("#mailboxUIBody").addEventListener("click", event => {
      const btn = event.target.closest(".mailbox-claim-btn");
      if(btn && !btn.disabled) handleClaimOne(btn.dataset.mailId);
    });

    (document.querySelector("#game") || document.body).appendChild(overlay);

    els = {
      overlay,
      body: overlay.querySelector("#mailboxUIBody"),
      walletValue: overlay.querySelector("#mailboxWalletValue"),
      claimAllBtn: overlay.querySelector("#mailboxClaimAllBtn"),
      tabs: Array.from(overlay.querySelectorAll(".mailbox-tab"))
    };
    return els;
  }

  /* 메인 메뉴/HUD/맵/상점/이벤트의 선물함 버튼이 공통으로 호출하는 진입점입니다. */
  function openMailboxUI(options){
    const opts = options || {};
    if(window.VIBERUN_AUTH && typeof window.VIBERUN_AUTH.requireLogin === "function" &&
       !window.VIBERUN_AUTH.requireLogin(() => openMailboxUI(opts))){
      return;
    }

    ensureUI();
    els.overlay.classList.toggle("map-mode", opts.mode === "map");
    els.overlay.classList.toggle("start-mode", opts.mode === "start");
    state.filter = "all";
    updateActiveTab();
    els.overlay.classList.add("show");
    els.overlay.setAttribute("aria-hidden", "false");
    loadMailbox();
  }

  function closeMailboxUI(){
    if(!els) return;
    els.overlay.classList.remove("show");
    els.overlay.classList.remove("map-mode");
    els.overlay.classList.remove("start-mode");
    els.overlay.setAttribute("aria-hidden", "true");
  }

  function updateActiveTab(){
    if(!els) return;
    els.tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.filter === state.filter));
  }

  function loadMailbox(){
    state.loading = true;
    state.error = null;
    render();

    Promise.resolve(window.VIBERUN_MAILBOX.fetchList()).then(result => {
      state.loading = false;
      if(!result || !result.ok){
        state.error = (result && result.message) || "선물함을 불러오지 못했습니다.";
        render();
        return;
      }

      state.items = Array.isArray(result.items) ? result.items : [];
      state.wallet = result.wallet || { moonShards: 0 };
      render();
      refreshBadge();
    }).catch(error => {
      console.warn("[MailboxUI] 목록 조회 중 오류가 발생했습니다.", error);
      state.loading = false;
      state.error = "선물함을 불러오지 못했습니다.";
      render();
    });
  }

  function handleClaimOne(mailId){
    if(!mailId) return;
    const item = state.items.find(i => i.mailId === mailId);
    if(item && item.status === "CLAIMED") return;

    Promise.resolve(window.VIBERUN_MAILBOX.claim(mailId)).then(result => {
      if(!result || !result.ok){
        if(typeof toast === "function") toast((result && result.message) || "선물 수령에 실패했습니다.", "error");
        if(result && result.status === 409) loadMailbox();
        return;
      }

      if(item) item.status = "CLAIMED";
      state.wallet = result.wallet || state.wallet;
      render();
      refreshBadge();
      if(typeof toast === "function") toast(rewardToastMessage(result.rewards) || "선물을 받았습니다.", "success");
    }).catch(error => {
      console.warn("[MailboxUI] 개별 수령 중 오류가 발생했습니다.", error);
      if(typeof toast === "function") toast("선물 수령에 실패했습니다.", "error");
    });
  }

  function handleClaimAll(){
    const hasUnclaimed = state.items.some(item => item.status !== "CLAIMED");
    if(!hasUnclaimed){
      if(typeof toast === "function") toast("받을 선물이 없습니다.", "info");
      return;
    }

    Promise.resolve(window.VIBERUN_MAILBOX.claimAll()).then(result => {
      if(!result || !result.ok){
        if(typeof toast === "function") toast((result && result.message) || "선물 수령에 실패했습니다.", "error");
        return;
      }

      const claimedIds = Array.isArray(result.claimedMailIds) ? result.claimedMailIds : [];
      claimedIds.forEach(mailId => {
        const item = state.items.find(i => i.mailId === mailId);
        if(item) item.status = "CLAIMED";
      });
      state.wallet = result.wallet || state.wallet;
      render();
      refreshBadge();
      if(typeof toast === "function") toast(rewardToastMessage(result.rewards) || "모든 선물을 받았습니다.", "success");
    }).catch(error => {
      console.warn("[MailboxUI] 모두 받기 중 오류가 발생했습니다.", error);
      if(typeof toast === "function") toast("선물 수령에 실패했습니다.", "error");
    });
  }

  function rewardLabel(reward){
    if(!reward) return "";
    const amount = Number(reward.amount) || 0;
    if(reward.type === "moon_shard") return "🌙 " + amount;
    return String(reward.type || "") + " " + amount;
  }

  function rewardToastMessage(rewards){
    if(!Array.isArray(rewards) || rewards.length === 0) return "";
    const parts = rewards.map(rewardLabel).filter(Boolean);
    return parts.length ? parts.join(" ") + " 획득!" : "";
  }

  function formatExpiry(expiresAt){
    const diff = Number(expiresAt) - Date.now();
    if(!Number.isFinite(diff) || diff <= 0) return "만료됨";

    const dayMs = 86400000;
    const hourMs = 3600000;
    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    if(days > 0) return "만료 기한 " + days + "일 " + hours + "시간";
    if(hours > 0) return "만료 기한 " + hours + "시간";
    return "곧 만료됩니다";
  }

  function renderItem(item){
    const claimed = item.status === "CLAIMED";
    const rewardsHtml = (Array.isArray(item.rewards) ? item.rewards : [])
      .map(reward => '<span class="mailbox-item-reward">' + escapeHtml(rewardLabel(reward)) + '</span>')
      .join("");

    return (
      '<div class="mailbox-item' + (claimed ? " claimed" : "") + '">' +
        '<div class="mailbox-item-icon">🎁</div>' +
        '<div class="mailbox-item-body">' +
          '<div class="mailbox-item-title">' + escapeHtml(item.title || "") + '</div>' +
          '<div class="mailbox-item-desc">' + escapeHtml(item.message || "") + '</div>' +
          '<div class="mailbox-item-meta">' +
            rewardsHtml +
            '<span class="mailbox-item-expiry">' + escapeHtml(formatExpiry(item.expiresAt)) + '</span>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="mailbox-claim-btn" data-mail-id="' + escapeHtml(item.mailId) + '"' + (claimed ? " disabled" : "") + '>' +
          (claimed ? "수령 완료" : "받기") +
        '</button>' +
      '</div>'
    );
  }

  function render(){
    if(!els) return;
    els.walletValue.textContent = String((state.wallet && state.wallet.moonShards) || 0);
    updateActiveTab();

    if(state.loading){
      els.body.innerHTML = '<div class="mailbox-status-msg">불러오는 중...</div>';
      els.claimAllBtn.disabled = true;
      return;
    }

    if(state.error){
      els.body.innerHTML =
        '<div class="mailbox-status-msg mailbox-status-error">' + escapeHtml(state.error) + '</div>' +
        '<button type="button" class="mailbox-retry-btn" id="mailboxRetryBtn">다시 시도</button>';
      const retryBtn = els.body.querySelector("#mailboxRetryBtn");
      if(retryBtn) retryBtn.addEventListener("click", loadMailbox);
      els.claimAllBtn.disabled = true;
      return;
    }

    const filtered = state.items.filter(item => {
      if(state.filter === "unclaimed") return item.status !== "CLAIMED";
      if(state.filter === "claimed") return item.status === "CLAIMED";
      return true;
    });

    if(filtered.length === 0){
      els.body.innerHTML = '<div class="mailbox-status-msg">' +
        (state.filter === "claimed" ? "수령한 선물이 없습니다." : "받을 선물이 없습니다.") +
        '</div>';
    } else {
      els.body.innerHTML = filtered.map(renderItem).join("");
    }

    els.claimAllBtn.disabled = !state.items.some(item => item.status !== "CLAIMED");
  }

  /* 로그인 상태일 때만 조용히 미수령 개수를 조회해 모든 화면의 선물함 버튼 배지를 갱신합니다. */
  function refreshBadge(){
    const auth = window.VIBERUN_AUTH;
    if(!auth || typeof auth.isLoggedIn !== "function" || !auth.isLoggedIn()){
      setBadgeCount(0);
      return;
    }

    Promise.resolve(window.VIBERUN_MAILBOX.fetchList()).then(result => {
      if(!result || !result.ok) return;
      const items = Array.isArray(result.items) ? result.items : [];
      const unclaimed = items.filter(item => item.status !== "CLAIMED").length;
      setBadgeCount(unclaimed);
    }).catch(() => {});
  }

  function setBadgeCount(count){
    document.querySelectorAll(".mailbox-badge").forEach(badge => {
      if(count > 0){
        badge.textContent = count > 99 ? "99+" : String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    });
  }

  window.VIBERUN_MAILBOX_UI = {
    open: openMailboxUI,
    close: closeMailboxUI,
    refreshBadge
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refreshBadge);
  } else {
    refreshBadge();
  }
})();
