"use strict";

/* =========================================================================
   Mailbox UI (mailboxUI.js)
   - 계정 기반 선물함 1차 기능의 팝업 UI입니다.
   - 로그인 여부는 VIBERUN_AUTH.requireLogin으로 확인하고, 목록/수령/청약철회는
     mailboxService.js(window.VIBERUN_MAILBOX)를 통해 서버와 통신합니다.
   - 월영당 구매 상품(source === "bm_purchase") 중 현금 결제 상품만 수령 전 청약철회가
     가능하며, 달빛 조각(moon_shard)으로 구매한 상품은 청약철회 버튼을 노출하지 않습니다.
     실제 보상 지급은 이 팝업에서 수령하기를 눌렀을 때만 이뤄집니다.
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

  function formatNumber(value){
    return (Number(value) || 0).toLocaleString("ko-KR");
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
          '<button type="button" class="mailbox-ui-wallet" aria-label="월영당 열기"><span class="mailbox-wallet-icon">🌙</span><span id="mailboxWalletValue">0</span></button>' +
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
    overlay.querySelector(".mailbox-ui-wallet").addEventListener("click", openBMStoreFromMailbox);
    overlay.querySelector("#mailboxCloseBtn").addEventListener("click", closeMailboxUI);
    overlay.querySelector("#mailboxClaimAllBtn").addEventListener("click", handleClaimAll);
    overlay.querySelectorAll(".mailbox-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        state.filter = tab.dataset.filter;
        render();
      });
    });
    setupMailboxBodyDragScroll(overlay.querySelector("#mailboxUIBody"));

    overlay.querySelector("#mailboxUIBody").addEventListener("click", event => {
      const claimBtn = event.target.closest(".mailbox-claim-btn");
      if(claimBtn && !claimBtn.disabled){
        handleClaimOne(claimBtn.dataset.mailId);
        return;
      }

      const refundBtn = event.target.closest(".mailbox-refund-btn");
      if(refundBtn && !refundBtn.disabled) handleRefund(refundBtn.dataset.mailId);
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

  /* 마우스 드래그로 선물함 목록을 스크롤할 수 있게 합니다. (rankingUI.js의 동일 패턴 참고)
     드래그로 판단된 클릭은 claim/refund 버튼 핸들러(뒤에 등록됨)로 전달되지 않도록
     stopImmediatePropagation으로 차단합니다. */
  function setupMailboxBodyDragScroll(body){
    if(!body || body.dataset.dragScrollBound) return;
    body.dataset.dragScrollBound = "1";

    let dragging = false;
    let startY = 0;
    let startScrollTop = 0;
    let moved = false;

    const onMove = event => {
      if(!dragging) return;
      const deltaY = event.clientY - startY;
      if(Math.abs(deltaY) > 3) moved = true;
      body.scrollTop = startScrollTop - deltaY;
    };

    const onUp = () => {
      if(!dragging) return;
      dragging = false;
      body.classList.remove("dragging");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    body.addEventListener("mousedown", event => {
      dragging = true;
      moved = false;
      startY = event.clientY;
      startScrollTop = body.scrollTop;
      body.classList.add("dragging");
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    body.addEventListener("click", event => {
      if(moved) event.stopImmediatePropagation();
    });
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

  function openBMStoreFromMailbox(event){
    if(event) event.preventDefault();
    if(window.VIBERUN_BM_STORE_UI && typeof window.VIBERUN_BM_STORE_UI.open === "function"){
      window.VIBERUN_BM_STORE_UI.open();
      return;
    }

    if(typeof toast === "function") toast("월영당을 불러오지 못했습니다.", "error");
    else if(typeof window.showToast === "function") window.showToast("월영당을 불러오지 못했습니다.", "error");
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
      syncCommonWallet(result.wallet);
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
    if(item && (item.status === "CLAIMED" || item.status === "REFUNDED")) return;

    Promise.resolve(window.VIBERUN_MAILBOX.claim(mailId)).then(result => {
      if(!result || !result.ok){
        if(typeof toast === "function") toast((result && result.message) || "선물 수령에 실패했습니다.", "error");
        if(result && result.status === 409) loadMailbox();
        return;
      }

      if(item){
        item.status = "CLAIMED";
        item.claimedAt = Date.now();
      }
      state.wallet = result.wallet || state.wallet;
      syncCommonWallet(result.wallet);
      render();
      refreshBadge();
      window.dispatchEvent(new CustomEvent("viberun:mailbox-changed"));
      syncDeckPackUnlocksIfNeeded(item);

      const message = item && item.source === "bm_purchase"
        ? purchaseClaimToastMessage(item)
        : (rewardToastMessage(result.rewards) || "선물을 받았습니다.");
      if(typeof toast === "function") toast(message, "success");
    }).catch(error => {
      console.warn("[MailboxUI] 개별 수령 중 오류가 발생했습니다.", error);
      if(typeof toast === "function") toast("선물 수령에 실패했습니다.", "error");
    });
  }

  function handleRefund(mailId){
    if(!mailId) return;
    const item = state.items.find(i => i.mailId === mailId);
    if(!item || !isRefundEligible(item)) return;

    const confirmed = window.confirm("이 상품의 구매를 취소하시겠습니까? 취소 후에는 수령할 수 없습니다.");
    if(!confirmed) return;

    Promise.resolve(window.VIBERUN_MAILBOX.refund(mailId)).then(result => {
      if(!result || !result.ok){
        if(typeof toast === "function") toast((result && result.message) || "청약철회에 실패했습니다.", "error");
        if(result && result.status === 409) loadMailbox();
        return;
      }

      item.status = "REFUNDED";
      item.refundedAt = Date.now();
      state.wallet = result.wallet || state.wallet;
      syncCommonWallet(result.wallet);
      render();
      refreshBadge();
      if(typeof toast === "function") toast("청약철회가 완료되었습니다.", "success");
    }).catch(error => {
      console.warn("[MailboxUI] 청약철회 중 오류가 발생했습니다.", error);
      if(typeof toast === "function") toast("청약철회에 실패했습니다.", "error");
    });
  }

  function handleClaimAll(){
    const hasUnclaimed = state.items.some(item => item.status !== "CLAIMED" && item.status !== "REFUNDED");
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
        if(item){
          item.status = "CLAIMED";
          item.claimedAt = Date.now();
        }
      });
      state.wallet = result.wallet || state.wallet;
      syncCommonWallet(result.wallet);
      render();
      refreshBadge();
      window.dispatchEvent(new CustomEvent("viberun:mailbox-changed"));
      if(claimedIds.some(mailId => {
        const claimedItem = state.items.find(i => i.mailId === mailId);
        return claimedItem && Array.isArray(claimedItem.rewards) &&
          claimedItem.rewards.some(reward => reward.type === "deck_pack");
      })) syncDeckPackUnlocksIfNeeded();
      if(typeof toast === "function") toast(rewardToastMessage(result.rewards) || "모든 선물을 받았습니다.", "success");
    }).catch(error => {
      console.warn("[MailboxUI] 모두 받기 중 오류가 발생했습니다.", error);
      if(typeof toast === "function") toast("선물 수령에 실패했습니다.", "error");
    });
  }

  function rewardLabel(reward){
    if(!reward) return "";
    const amount = Number(reward.amount) || 0;
    if(reward.type === "moon_shard") return "🌙 " + formatNumber(amount);
    if(reward.type === "dummy_item") return "테스트용 더미 아이템";
    if(reward.type === "monthly_pass") return "월영의 약속 활성화";
    if(reward.type === "character_skin") return (reward.name || "캐릭터 스킨") + " 획득";
    if(reward.type === "deck_pack") return (reward.name || "주문 덱") + " 해금";
    return String(reward.type || "") + " " + formatNumber(amount);
  }

  function rewardToastMessage(rewards){
    if(!Array.isArray(rewards) || rewards.length === 0) return "";
    const parts = rewards.map(rewardLabel).filter(Boolean);
    return parts.length ? parts.join(" ") + " 획득!" : "";
  }

  /* 구매 상품 메일 전용 수령 완료 토스트 문구입니다. 예: "초심자 스타터 팩을 수령했습니다.",
     "달빛 조각 300개를 수령했습니다." */
  function purchaseClaimToastMessage(item){
    const rewards = Array.isArray(item.rewards) ? item.rewards : [];
    const moonShardReward = rewards.find(reward => reward.type === "moon_shard");
    if(moonShardReward) return "달빛 조각 " + formatNumber(moonShardReward.amount) + "개를 수령했습니다.";
    return (item.productName || "상품") + "을 수령했습니다.";
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

  function formatPurchaseDate(purchasedAt){
    const date = new Date(Number(purchasedAt) || 0);
    if(Number.isNaN(date.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return date.getFullYear() + "." + pad(date.getMonth() + 1) + "." + pad(date.getDate());
  }

  function isCashPurchase(item){
    const store = window.VIBERUN_BM_STORE_DATA;
    if(!store || typeof store.findProduct !== "function") return true;
    const product = store.findProduct(item.productId);
    return !product || product.priceType !== "moon_shard";
  }

  /* 청약철회 가능 조건: 구매 메일 + 현금 구매(달빛 조각 구매 제외) + 수령 전(PURCHASED_UNCLAIMED) + 7일 이내 + 미환불. */
  function isRefundEligible(item){
    return item.source === "bm_purchase" &&
      item.status === "PURCHASED_UNCLAIMED" &&
      Number(item.refundUntil) > Date.now() &&
      isCashPurchase(item);
  }

  function formatRefundWindow(item){
    if(item.status === "CLAIMED") return "수령 완료 (청약철회 불가)";
    if(item.status === "REFUNDED") return "청약철회 완료";
    if(item.status === "EXPIRED_REFUND") return "청약철회 기간 만료";
    if(!isCashPurchase(item)) return "";

    const diff = Number(item.refundUntil) - Date.now();
    if(!Number.isFinite(diff) || diff <= 0) return "청약철회 기간 만료";

    const dayMs = 86400000;
    const hourMs = 3600000;
    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    if(days > 0) return "청약철회 가능: " + days + "일 " + hours + "시간 남음";
    if(hours > 0) return "청약철회 가능: " + hours + "시간 남음";
    return "청약철회 가능: 곧 만료";
  }

  function renderPurchaseItem(item){
    const claimed = item.status === "CLAIMED";
    const refunded = item.status === "REFUNDED";
    const canClaim = !claimed && !refunded;
    const canRefund = isRefundEligible(item);
    const rewardsHtml = (Array.isArray(item.rewards) ? item.rewards : [])
      .map(reward => '<span class="mailbox-item-reward">' + escapeHtml(rewardLabel(reward)) + '</span>')
      .join("");

    let claimLabel = "수령하기";
    if(claimed) claimLabel = "수령 완료";
    else if(refunded) claimLabel = "청약철회됨";

    return (
      '<div class="mailbox-item mailbox-item-purchase' + (claimed ? " claimed" : "") + (refunded ? " refunded" : "") + '">' +
        '<div class="mailbox-item-icon">🌙</div>' +
        '<div class="mailbox-item-body">' +
          '<div class="mailbox-item-purchase-tag">월영당 구매 상품</div>' +
          '<div class="mailbox-item-title">' + escapeHtml(item.productName || "") + '</div>' +
          (item.productDescription ? '<div class="mailbox-item-desc">' + escapeHtml(item.productDescription) + '</div>' : "") +
          '<div class="mailbox-item-purchase-meta">' +
            '<span>구매일: ' + escapeHtml(formatPurchaseDate(item.purchasedAt)) + '</span>' +
            '<span>' + escapeHtml(formatRefundWindow(item)) + '</span>' +
          '</div>' +
          '<div class="mailbox-item-meta">' +
            '<span class="mailbox-item-reward-label">보상:</span>' +
            rewardsHtml +
          '</div>' +
        '</div>' +
        '<div class="mailbox-item-actions">' +
          '<button type="button" class="mailbox-claim-btn" data-mail-id="' + escapeHtml(item.mailId) + '"' + (canClaim ? "" : " disabled") + '>' +
            claimLabel +
          '</button>' +
          (canRefund
            ? '<button type="button" class="mailbox-refund-btn" data-mail-id="' + escapeHtml(item.mailId) + '">청약철회</button>'
            : "") +
        '</div>' +
      '</div>'
    );
  }

  function renderItem(item){
    if(item.source === "bm_purchase") return renderPurchaseItem(item);

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
    els.walletValue.textContent = formatNumber((state.wallet && state.wallet.moonShards) || 0);
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

    const isResolved = item => item.status === "CLAIMED" || item.status === "REFUNDED";
    const filtered = state.items.filter(item => {
      if(state.filter === "unclaimed") return !isResolved(item);
      if(state.filter === "claimed") return isResolved(item);
      return true;
    });

    const sorted = sortMailboxItems(filtered);

    if(sorted.length === 0){
      els.body.innerHTML = '<div class="mailbox-status-msg">' +
        (state.filter === "claimed" ? "수령한 선물이 없습니다." : "받을 선물이 없습니다.") +
        '</div>';
    } else {
      els.body.innerHTML = sorted.map(renderItem).join("");
    }

    els.claimAllBtn.disabled = !state.items.some(item => item.status !== "CLAIMED" && item.status !== "REFUNDED");
  }

  /* 정렬 우선순위: 1) 미수령 구매 상품 2) 일반 미수령 선물 3) 수령 완료 상품 4) 청약철회 완료 상품 */
  function mailboxSortRank(item){
    if(item.source === "bm_purchase" && item.status !== "CLAIMED" && item.status !== "REFUNDED") return 0;
    if(item.source !== "bm_purchase" && item.status !== "CLAIMED") return 1;
    if(item.status === "CLAIMED") return 2;
    return 3;
  }

  function sortMailboxItems(items){
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const rankDiff = mailboxSortRank(a.item) - mailboxSortRank(b.item);
        return rankDiff !== 0 ? rankDiff : a.index - b.index;
      })
      .map(entry => entry.item);
  }

  /* 주문 덱 BM 임시 구현: 선물함에서 확장덱을 수령하면 최신 보유 목록을 조회해
     window.VIBERUN_CONTENT_UNLOCKS에 저장합니다. 이번 단계에서는 script.js가 이 값을
     사용하지 않으므로 실제 게임 플레이에는 영향이 없으며, 후속 콘텐츠 필터링 작업에서 사용합니다. */
  function syncDeckPackUnlocksIfNeeded(item){
    if(item && (!Array.isArray(item.rewards) || !item.rewards.some(reward => reward.type === "deck_pack"))) return;

    if(window.VIBERUN_BM_STORE_SERVICE && typeof window.VIBERUN_BM_STORE_SERVICE.fetchDeckPackUnlocks === "function"){
      Promise.resolve(window.VIBERUN_BM_STORE_SERVICE.fetchDeckPackUnlocks()).then(result => {
        if(result && result.ok){
          window.VIBERUN_CONTENT_UNLOCKS = result.deckPackUnlocks;
        }
      }).catch(() => {});
    }
  }

  function syncCommonWallet(wallet){
    if(window.VIBERUN_WALLET && typeof window.VIBERUN_WALLET.setCachedWallet === "function" && wallet){
      window.VIBERUN_WALLET.setCachedWallet(wallet);
    }
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
      syncCommonWallet(result.wallet);
      const unclaimed = items.filter(item => item.status !== "CLAIMED" && item.status !== "REFUNDED").length;
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

  window.addEventListener("viberun:wallet-changed", event => {
    const wallet = event && event.detail ? event.detail.wallet : null;
    if(wallet) state.wallet = wallet;
    if(els) render();
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", refreshBadge);
  } else {
    refreshBadge();
  }
})();
