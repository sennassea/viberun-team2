"use strict";

/* =========================================================================
   local-mock-server.js
   -------------------------------------------------------------------------
   로컬 개발/QA 전용 Mock 서버입니다.
   - 실제 운영 서버가 아니며, 배포 빌드에 포함되거나 자동 실행되면 안 됩니다.
   - 실제 결제/BM/선물함 검증은 반드시 운영 서버에서 수행해야 합니다.
   - 모든 데이터는 메모리에만 저장되며, 서버를 재시작하면 초기화됩니다.
   - Node.js 기본 http/fs/path 모듈만 사용하며 추가 npm 설치가 필요 없습니다.

   [실행 방법]
   1) 프로젝트 루트(index.html이 있는 위치)로 이동
   2) node local-mock-server.js 실행
   3) 브라우저에서 http://localhost:5173/ 접속
   4) 치트 테스트: http://localhost:5173/?cheat=1 접속
   ========================================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 5173;
const ROOT_DIR = __dirname;
const GUEST_ACCOUNT_ID = "acc_local_guest_001";
const INITIAL_MOCK_MOON_SHARDS = Math.max(0, Math.floor(Number(
  process.env.INITIAL_MOCK_MOON_SHARDS || process.env.INITIAL_MOON_SHARDS
) || 0));
const REFUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
let mailIdCounter = 0;
function nextMailId() {
  mailIdCounter += 1;
  return "purchase_mail_" + Date.now() + "_" + mailIdCounter;
}

/* 로컬 날짜(YYYY-MM-DD) 기준입니다. UTC로 비교하면 한국 시간 기준 자정과 어긋나므로
   월영의 약속 일일 수령 판정은 서버(Mock)의 로컬 시각 기준 날짜로 처리합니다. */
function getLocalDateKey(timestamp) {
  const date = new Date(timestamp || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

/* ------------------------------------------------------------------------
   In-memory mock 데이터 (서버 재시작 시 초기화됩니다)
   - mailbox/wallet/dummyInventory는 accountId별로 분리해서 저장합니다.
   - accessToken → accountId 매핑은 /auth/* 응답 발급 시점에 등록합니다.
   ------------------------------------------------------------------------ */
const accounts = new Map();      // accountId -> { mailbox: [...], wallet: {...}, dummyInventory: [...] }
const tokenToAccount = new Map(); // accessToken -> accountId

/* 월영당 로컬 Mock 검증용 상품 테이블입니다.
   UI 표시 데이터는 bmStoreData.js가 관리하며, 이 테이블은 서버 차감/지급 검증만 담당합니다. */
const BM_PACKAGE_PRODUCTS = [
  { id: "starter_pack", name: "초심자 스타터 팩", price: 7500, rewardId: "dummy_starter_pack", category: "package", description: "지금 시작하면 모험이 더욱 특별해집니다." },
  { id: "growth_package", name: "성장 패키지", price: 2980, rewardId: "dummy_growth_package", category: "package", description: "성장에 필요한 물품이 담긴 패키지입니다." },
  { id: "rare_package", name: "희귀 장신 패키지", price: 6500, rewardId: "dummy_rare_package", category: "package", description: "희귀한 장신구가 담긴 패키지입니다." },
  { id: "spring_blessing_box", name: "봄날의 축복 상자", price: 2400, rewardId: "dummy_spring_blessing_box", category: "package", description: "계절 한정 축복 상자입니다." },
  { id: "order_pack_summon_charm", name: "소환 부적 팩", price: 1000, rewardId: "dummy_summon_charm_pack", category: "order_pack", description: "소환을 바꾸는 주문 부적" },
  { id: "order_pack_soul_charm", name: "영혼 부적 팩", price: 2000, rewardId: "dummy_soul_charm_pack", category: "order_pack", description: "영혼을 모으는 주문 부적" },
  { id: "order_pack_divine_charm", name: "신력 부적 팩", price: 3000, rewardId: "dummy_divine_charm_pack", category: "order_pack", description: "강력한 인연 소환 주문 부적" },
  { id: "order_pack_legend_support", name: "전설 보조 팩", price: 10000, rewardId: "dummy_legend_support_pack", category: "order_pack", description: "전설 등급 신력 확정 소환" }
];

/* 스킨 탭 캐릭터 스킨 구매 서버 검증 테이블입니다. 달빛서약☆마법무녀만 saleStartAt/saleEndAt
   기간 제한이 있으며, saleEndAt은 exclusive로 처리합니다(해당 시각부터 판매 종료). */
const BM_CHARACTER_SKIN_PRODUCTS = [
  {
    id: "skin_limited_moonlight_vow_magic_maiden",
    name: "달빛서약☆마법무녀",
    skinId: "moonlight_vow_magic_maiden",
    grade: "limited",
    price: 1500,
    saleStartAt: "2026-07-06T00:00:00+09:00",
    saleEndAt: "2026-08-20T00:00:00+09:00",
    category: "character_skin",
    profileIcon: "assets/profile/profile_limited_moonlight_vow_magic_maiden.png",
    battleProfileIcon: "assets/profile/profile_limited_moonlight_vow_magic_maiden.png",
    battleStandingImage: "assets/skins/skin_limited_moonlight_vow_magic_maiden.png"
  },
  {
    id: "skin_premium_wolyeong_academy_transfer",
    name: "월영학당 전학생",
    skinId: "wolyeong_academy_transfer",
    grade: "premium",
    price: 1000,
    category: "character_skin",
    profileIcon: "assets/profile/profile_premium_wolyeong_academy_transfer.png",
    battleProfileIcon: "assets/profile/profile_premium_wolyeong_academy_transfer.png",
    battleStandingImage: "assets/skins/skin_premium_wolyeong_academy_transfer.png"
  },
  {
    id: "skin_common_prayer_robe",
    name: "백성의 기도복",
    skinId: "common_prayer_robe",
    grade: "common",
    price: 700,
    category: "character_skin",
    profileIcon: "assets/profile/profile_common_prayer_robe.png",
    battleProfileIcon: "assets/profile/profile_common_prayer_robe.png",
    battleStandingImage: "assets/skins/skin_common_prayer_robe.png"
  }
];

/* 메인메뉴 프로필 UI 전용 상수입니다. 기본 프로필은 상품 데이터가 아니므로
   구매 검증 테이블과 별도로 여기서만 관리합니다. */
const DEFAULT_PROFILE_ICON = "assets/profile/profile_default.png";
const DEFAULT_DISPLAY_NAME = "빛솔이";

function resolveProfileIconBySkinId(skinId) {
  if (!skinId) return DEFAULT_PROFILE_ICON;
  const product = BM_CHARACTER_SKIN_PRODUCTS.find((item) => item.skinId === skinId);
  return (product && product.profileIcon) || DEFAULT_PROFILE_ICON;
}

/* 달빛조각 충전(테스트 구매) 검증 테이블입니다. 실제 결제 검증 없이 rewardAmount만큼
   wallet.moonShards를 증가시키며, 차감/잔액 확인은 하지 않습니다. */
const BM_MOON_CHARGE_PRODUCTS = [
  { id: "moon_charge_60", name: "달빛조각 60", price: 1200, rewardAmount: 60 },
  { id: "moon_charge_300", name: "달빛조각 300", price: 5900, rewardAmount: 300 },
  { id: "moon_charge_980", name: "달빛조각 980", price: 19000, rewardAmount: 980 },
  { id: "moon_charge_1980", name: "달빛조각 1,980", price: 37000, rewardAmount: 1980 },
  { id: "moon_charge_3280", name: "달빛조각 3,280", price: 59000, rewardAmount: 3280 },
  { id: "moon_charge_6480", name: "달빛조각 6,480", price: 119000, rewardAmount: 6480 }
];

/* 월영의 약속(30일 출석 상품) 검증 테이블입니다. 구매는 test_cash이며,
   즉시/매일 지급 모두 선물함 구매 메일 수령 시점에만 이뤄집니다. */
const BM_MONTHLY_PASS_PRODUCTS = [
  {
    id: "monthly_moon_promise",
    name: "월영의 약속",
    price: 5900,
    durationDays: 30,
    immediateRewardAmount: 100,
    dailyRewardAmount: 15
  }
];

function buildDefaultMonthlyPass() {
  return {
    active: false,
    startedAt: null,
    expiresAt: null,
    lastClaimDate: null,
    claimedDays: 0,
    durationDays: 30,
    dailyRewardAmount: 15
  };
}

/* 월영의 약속 상태를 조회/수령 응답에 쓰기 좋은 형태로 계산합니다.
   active는 expiresAt이 지나면 자동으로 false가 되며, canClaimToday는
   활성 + 오늘 미수령 + 잔여 일수가 남아있을 때만 true입니다. */
function normalizeMonthlyPass(pass) {
  const now = Date.now();
  const safePass = pass || buildDefaultMonthlyPass();

  const expiresAt = Number(safePass.expiresAt) || 0;
  const active = !!safePass.active && expiresAt > now;
  const todayKey = getLocalDateKey(now);
  const lastClaimDate = safePass.lastClaimDate || null;
  const durationDays = Math.max(1, Number(safePass.durationDays) || 30);
  const claimedDays = Math.max(0, Number(safePass.claimedDays) || 0);
  const dailyRewardAmount = Math.max(0, Number(safePass.dailyRewardAmount) || 15);
  const daysRemaining = active
    ? Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)))
    : 0;

  return {
    active,
    startedAt: safePass.startedAt || null,
    expiresAt: safePass.expiresAt || null,
    lastClaimDate,
    claimedDays,
    durationDays,
    dailyRewardAmount,
    daysRemaining,
    canClaimToday: active && lastClaimDate !== todayKey && claimedDays < durationDays,
    todayRewardAmount: dailyRewardAmount
  };
}

function buildDefaultMailbox() {
  return [
    {
      mailId: "mail_test_001",
      title: "로컬 테스트 선물",
      message: "로컬 테스트용 달빛조각 선물입니다.",
      status: "UNCLAIMED",
      expiresAt: 9999999999999,
      rewards: [{ type: "moon_shard", amount: 100 }]
    }
  ];
}

function buildDefaultCharacterSkins() {
  return {
    ownedSkinIds: [],
    equippedSkinId: null
  };
}

function ensureAccount(accountId) {
  if (!accounts.has(accountId)) {
    accounts.set(accountId, {
      mailbox: buildDefaultMailbox(),
      wallet: { moonShards: INITIAL_MOCK_MOON_SHARDS },
      dummyInventory: [],
      monthlyPass: buildDefaultMonthlyPass(),
      characterSkins: buildDefaultCharacterSkins()
    });
  }

  const account = accounts.get(accountId);
  if (!account.monthlyPass) {
    account.monthlyPass = buildDefaultMonthlyPass();
  }
  if (!account.characterSkins) {
    account.characterSkins = buildDefaultCharacterSkins();
  }
  if (!Array.isArray(account.characterSkins.ownedSkinIds)) {
    account.characterSkins.ownedSkinIds = [];
  }
  if (!("equippedSkinId" in account.characterSkins)) {
    account.characterSkins.equippedSkinId = null;
  }
  return account;
}

function registerAccessToken(accountId, accessToken) {
  ensureAccount(accountId);
  if (accessToken) tokenToAccount.set(accessToken, accountId);
}

/* Authorization: Bearer {accessToken} 헤더를 읽어 accountId를 식별합니다. */
function resolveAccountId(req) {
  const header = req.headers["authorization"] || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return tokenToAccount.get(match[1].trim()) || null;
}

/* ------------------------------------------------------------------------
   공용 유틸
   ------------------------------------------------------------------------ */
function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readRequestBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => resolve(raw));
    req.on("error", () => resolve(""));
  });
}

/* ------------------------------------------------------------------------
   /auth/* Mock 핸들러
   ------------------------------------------------------------------------ */
function handleAuthGuest(res) {
  const accessToken = "local_access_token";
  registerAccessToken(GUEST_ACCOUNT_ID, accessToken);
  sendJson(res, 200, {
    accountId: GUEST_ACCOUNT_ID,
    provider: "guest",
    displayName: "Guest",
    accessToken,
    refreshToken: "local_refresh_token",
    createdAt: Date.now()
  });
}

function handleAuthLinkGooglePlay(res) {
  const accessToken = "local_google_access_token";
  registerAccessToken(GUEST_ACCOUNT_ID, accessToken);
  sendJson(res, 200, {
    accountId: GUEST_ACCOUNT_ID,
    provider: "googlePlay",
    providerUserId: "google_local_user_001",
    displayName: "Google Play User",
    accessToken,
    refreshToken: "local_google_refresh_token"
  });
}

function handleAuthLinkFacebook(res) {
  const accessToken = "local_facebook_access_token";
  registerAccessToken(GUEST_ACCOUNT_ID, accessToken);
  sendJson(res, 200, {
    accountId: GUEST_ACCOUNT_ID,
    provider: "facebook",
    providerUserId: "facebook_local_user_001",
    displayName: "Facebook User",
    accessToken,
    refreshToken: "local_facebook_refresh_token"
  });
}

/* ------------------------------------------------------------------------
   /mailbox Mock 핸들러
   ------------------------------------------------------------------------ */
/* 선물함 메일의 rewards를 실제로 지급합니다.
   moon_shard는 wallet.moonShards에, dummy_item은 dummyInventory에 지급하며,
   패키지/주문 팩/충전 상품 모두 이 함수를 통해서만 실제 보상을 받습니다. */
function applyMailRewards(account, mail) {
  (mail.rewards || []).forEach((reward) => {
    if (reward.type === "moon_shard") {
      account.wallet.moonShards = (Number(account.wallet.moonShards) || 0) + (Number(reward.amount) || 0);
    } else if (reward.type === "dummy_item") {
      account.dummyInventory.push({
        id: reward.dummyRewardId,
        name: mail.productName || reward.dummyRewardId,
        category: mail.productCategory || "package",
        obtainedAt: Date.now()
      });
    } else if (reward.type === "monthly_pass") {
      const now = Date.now();
      const durationDays = Math.max(1, Number(reward.durationDays) || 30);
      const dailyRewardAmount = Math.max(0, Number(reward.dailyRewardAmount) || 15);
      const immediateRewardAmount = Math.max(0, Number(reward.immediateRewardAmount) || 100);

      account.monthlyPass = {
        active: true,
        startedAt: now,
        expiresAt: now + durationDays * 24 * 60 * 60 * 1000,
        lastClaimDate: null,
        claimedDays: 0,
        durationDays,
        dailyRewardAmount
      };

      account.wallet.moonShards = (Number(account.wallet.moonShards) || 0) + immediateRewardAmount;
    } else if (reward.type === "character_skin") {
      if (!account.characterSkins) {
        account.characterSkins = buildDefaultCharacterSkins();
      }

      const skinId = String(reward.skinId || "");
      if (skinId && !account.characterSkins.ownedSkinIds.includes(skinId)) {
        account.characterSkins.ownedSkinIds.push(skinId);
      }
    }
  });
}

/* 청약철회 기간(7일)이 지난 미수령 구매 메일을 EXPIRED_REFUND로 전환합니다.
   수령은 계속 가능하지만 더 이상 청약철회 버튼은 노출되지 않습니다. */
function refreshMailStatuses(account) {
  const now = Date.now();
  account.mailbox.forEach((mail) => {
    if (mail.source === "bm_purchase" && mail.status === "PURCHASED_UNCLAIMED" && Number(mail.refundUntil) <= now) {
      mail.status = "EXPIRED_REFUND";
    }
  });
}

function handleMailboxList(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  refreshMailStatuses(account);
  sendJson(res, 200, { items: account.mailbox, wallet: account.wallet });
}

function handleWallet(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  sendJson(res, 200, { wallet: account.wallet });
}

function handleMailboxClaim(req, res, mailId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  refreshMailStatuses(account);
  const mail = account.mailbox.find((item) => item.mailId === mailId);
  if (!mail) {
    sendJson(res, 404, { ok: false, message: "존재하지 않는 선물입니다." });
    return;
  }

  if (mail.status === "CLAIMED") {
    sendJson(res, 409, { ok: false, message: "이미 수령한 선물입니다." });
    return;
  }

  if (mail.status === "REFUNDED") {
    sendJson(res, 409, { ok: false, message: "청약철회된 상품은 수령할 수 없습니다." });
    return;
  }

  mail.status = "CLAIMED";
  mail.claimedAt = Date.now();
  applyMailRewards(account, mail);

  sendJson(res, 200, {
    ok: true,
    claimedMailId: mail.mailId,
    rewards: mail.rewards,
    wallet: account.wallet
  });
}

function handleMailboxClaimAll(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  refreshMailStatuses(account);
  const claimedMailIds = [];
  const rewardTotals = new Map();

  account.mailbox.forEach((mail) => {
    if (mail.status !== "UNCLAIMED" && mail.status !== "PURCHASED_UNCLAIMED" && mail.status !== "EXPIRED_REFUND") return;

    mail.status = "CLAIMED";
    mail.claimedAt = Date.now();
    claimedMailIds.push(mail.mailId);
    applyMailRewards(account, mail);

    mail.rewards.forEach((reward) => {
      rewardTotals.set(reward.type, (rewardTotals.get(reward.type) || 0) + (Number(reward.amount) || 0));
    });
  });

  const rewards = Array.from(rewardTotals.entries()).map(([type, amount]) => ({ type, amount }));

  sendJson(res, 200, { ok: true, claimedMailIds, rewards, wallet: account.wallet });
}

/* 치트 콘솔 전용 계정 wallet.moonShards 조회/증감/설정 핸들러입니다.
   전투 상태(S.moonShards)와는 완전히 분리되어 있으며 accountId 기준 wallet만 바꿉니다. */
function handleWalletCheat(req, res, body) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  let payload = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    sendJson(res, 400, { ok: false, message: "요청 형식이 올바르지 않습니다." });
    return;
  }

  const op = payload.op;
  const amount = Math.floor(Number(payload.amount));
  if (!Number.isFinite(amount)) {
    sendJson(res, 400, { ok: false, message: "amount는 숫자여야 합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const current = Number(account.wallet.moonShards) || 0;

  if (op === "add") {
    account.wallet.moonShards = current + amount;
  } else if (op === "take") {
    account.wallet.moonShards = Math.max(0, current - amount);
  } else if (op === "set") {
    account.wallet.moonShards = Math.max(0, amount);
  } else {
    sendJson(res, 400, { ok: false, message: "op은 add/take/set 중 하나여야 합니다." });
    return;
  }

  sendJson(res, 200, { ok: true, wallet: account.wallet });
}

/* ------------------------------------------------------------------------
   /bm-store Mock 핸들러
   - 구매는 즉시 dummyInventory/wallet.moonShards를 지급하지 않고 선물함 구매 메일만 생성합니다.
   - 실제 지급은 /mailbox/{mailId}/claim에서만 이뤄지며, 수령 전 상품은 /mailbox/{mailId}/refund로
     청약철회할 수 있습니다.
   - 카드/법구/골드/포션/전투 보상 데이터와 절대 연결하지 않습니다.
   ------------------------------------------------------------------------ */
function handleDummyInventory(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  sendJson(res, 200, {
    ok: true,
    dummyInventory: account.dummyInventory,
    wallet: account.wallet
  });
}

/* 패키지/주문 팩 구매입니다. 달빛조각 결제는 구매 시점에 즉시 차감하지만,
   실제 보상(더미 아이템)은 지급하지 않고 선물함 구매 메일만 생성합니다.
   실제 지급은 선물함에서 "수령하기"를 누른 시점에만 이뤄집니다. */
function handleBMPackagePurchase(req, res, productId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const product = BM_PACKAGE_PRODUCTS.find((item) => item.id === productId);
  if (!product) {
    sendJson(res, 404, { ok: false, message: "존재하지 않는 상품입니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const currentMoonShards = Number(account.wallet.moonShards) || 0;
  if (currentMoonShards < product.price) {
    sendJson(res, 400, {
      ok: false,
      code: "INSUFFICIENT_MOON_SHARDS",
      message: "달빛조각이 부족합니다.",
      wallet: account.wallet
    });
    return;
  }

  account.wallet.moonShards = currentMoonShards - product.price;

  const purchasedAt = Date.now();
  const mail = {
    mailId: nextMailId(),
    source: "bm_purchase",
    productId: product.id,
    productName: product.name,
    productDescription: product.description || "",
    productCategory: product.category || "package",
    status: "PURCHASED_UNCLAIMED",
    purchasedAt,
    refundUntil: purchasedAt + REFUND_WINDOW_MS,
    claimedAt: null,
    refundedAt: null,
    priceType: "moon_shard",
    paidAmount: product.price,
    rewards: [{ type: "dummy_item", dummyRewardId: product.rewardId, amount: 1 }]
  };
  account.mailbox.unshift(mail);

  sendJson(res, 200, {
    ok: true,
    product,
    mail,
    wallet: account.wallet
  });
}

/* 캐릭터 스킨 구매입니다. 패키지 구매와 동일하게 달빛조각을 즉시 차감하지만,
   보유 처리는 하지 않고 선물함 구매 메일만 생성합니다. 한정 스킨은 saleStartAt/saleEndAt
   기간을 벗어나면 구매를 막습니다(saleEndAt은 exclusive). */
function handleBMCharacterSkinPurchase(req, res, productId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  const product = BM_CHARACTER_SKIN_PRODUCTS.find((item) => item.id === productId);
  if (!product) {
    sendJson(res, 404, { ok: false, code: "UNKNOWN_PRODUCT", message: "존재하지 않는 스킨 상품입니다." });
    return;
  }

  const now = Date.now();

  if (product.saleStartAt && now < Date.parse(product.saleStartAt)) {
    sendJson(res, 409, {
      ok: false,
      code: "CHARACTER_SKIN_SALE_NOT_STARTED",
      message: "아직 판매가 시작되지 않은 스킨입니다."
    });
    return;
  }

  if (product.saleEndAt && now >= Date.parse(product.saleEndAt)) {
    sendJson(res, 409, {
      ok: false,
      code: "CHARACTER_SKIN_SALE_ENDED",
      message: "판매 기간이 종료된 스킨입니다."
    });
    return;
  }

  const account = ensureAccount(accountId);

  if (account.characterSkins.ownedSkinIds.includes(product.skinId)) {
    sendJson(res, 409, {
      ok: false,
      code: "CHARACTER_SKIN_ALREADY_OWNED",
      message: "이미 보유 중인 스킨입니다.",
      wallet: account.wallet,
      characterSkins: account.characterSkins
    });
    return;
  }

  const currentMoonShards = Number(account.wallet.moonShards) || 0;
  if (currentMoonShards < product.price) {
    sendJson(res, 409, {
      ok: false,
      code: "INSUFFICIENT_MOON_SHARDS",
      message: "달빛조각이 부족합니다.",
      wallet: account.wallet
    });
    return;
  }

  account.wallet.moonShards = currentMoonShards - product.price;

  const purchasedAt = Date.now();
  const mail = {
    mailId: nextMailId(),
    source: "bm_purchase",
    productId: product.id,
    productName: product.name,
    productCategory: "character_skin",
    status: "PURCHASED_UNCLAIMED",
    purchasedAt,
    refundUntil: purchasedAt + REFUND_WINDOW_MS,
    claimedAt: null,
    refundedAt: null,
    priceType: "moon_shard",
    paidAmount: product.price,
    rewards: [
      {
        type: "character_skin",
        skinId: product.skinId,
        grade: product.grade,
        productId: product.id,
        name: product.name
      }
    ]
  };

  account.mailbox.unshift(mail);

  sendJson(res, 200, {
    ok: true,
    product,
    mail,
    wallet: account.wallet,
    characterSkins: account.characterSkins
  });
}

/* 달빛조각 충전 테스트 구매입니다. 실제 결제 검증이 없고 wallet.moonShards도 즉시 증가시키지 않으며,
   충전될 달빛조각은 선물함 구매 메일로만 생성됩니다. */
function handleBMMoonChargePurchase(req, res, productId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const product = BM_MOON_CHARGE_PRODUCTS.find((item) => item.id === productId);
  if (!product) {
    sendJson(res, 404, { ok: false, message: "존재하지 않는 상품입니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const purchasedAt = Date.now();
  const mail = {
    mailId: nextMailId(),
    source: "bm_purchase",
    productId: product.id,
    productName: product.name,
    productDescription: product.description || "",
    productCategory: "moon_charge",
    status: "PURCHASED_UNCLAIMED",
    purchasedAt,
    refundUntil: purchasedAt + REFUND_WINDOW_MS,
    claimedAt: null,
    refundedAt: null,
    priceType: "test_cash",
    paidAmount: product.price,
    rewards: [{ type: "moon_shard", amount: product.rewardAmount }]
  };
  account.mailbox.unshift(mail);

  sendJson(res, 200, {
    ok: true,
    productId: product.id,
    rewardAmount: product.rewardAmount,
    mail,
    wallet: account.wallet
  });
}

/* 월영의 약속(30일 출석 상품) 구매입니다. 결제는 test_cash이며 즉시 지급하지 않고,
   기존 청약철회 정책을 유지하기 위해 선물함 구매 메일만 생성합니다.
   실제 활성화/즉시 100 지급은 선물함에서 수령할 때만 이뤄집니다. */
function handleBMMonthlyPassPurchase(req, res, productId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  const product = BM_MONTHLY_PASS_PRODUCTS.find((item) => item.id === productId);
  if (!product) {
    sendJson(res, 404, { ok: false, code: "UNKNOWN_PRODUCT", message: "존재하지 않는 상품입니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const now = Date.now();
  const pass = account.monthlyPass || buildDefaultMonthlyPass();

  if (pass.active && Number(pass.expiresAt) > now) {
    sendJson(res, 409, {
      ok: false,
      code: "MONTHLY_PASS_ALREADY_ACTIVE",
      message: "이미 월영의 약속이 활성화되어 있습니다."
    });
    return;
  }

  const hasUnclaimedMonthlyPassMail = account.mailbox.some(
    (mail) => mail.productId === product.id && mail.status === "PURCHASED_UNCLAIMED"
  );

  if (hasUnclaimedMonthlyPassMail) {
    sendJson(res, 409, {
      ok: false,
      code: "MONTHLY_PASS_UNCLAIMED_MAIL_EXISTS",
      message: "선물함에 아직 수령하지 않은 월영의 약속이 있습니다."
    });
    return;
  }

  const purchasedAt = Date.now();
  const mail = {
    mailId: nextMailId(),
    source: "bm_purchase",
    productId: product.id,
    productName: product.name,
    productCategory: "monthly_pass",
    status: "PURCHASED_UNCLAIMED",
    purchasedAt,
    refundUntil: purchasedAt + REFUND_WINDOW_MS,
    claimedAt: null,
    refundedAt: null,
    priceType: "test_cash",
    paidAmount: product.price,
    rewards: [
      {
        type: "monthly_pass",
        productId: product.id,
        durationDays: product.durationDays,
        immediateRewardAmount: product.immediateRewardAmount,
        dailyRewardAmount: product.dailyRewardAmount
      }
    ]
  };

  account.mailbox.unshift(mail);

  sendJson(res, 200, {
    ok: true,
    product,
    mail,
    wallet: account.wallet,
    monthlyPass: account.monthlyPass
  });
}

/* 월영의 약속 상태 조회입니다. 메인메뉴 좌하단 일일 보상 UI가 이 응답으로
   노출 여부/D-day/오늘 수령 가능 여부를 판단합니다. */
function handleMonthlyPassStatus(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const monthlyPass = normalizeMonthlyPass(account.monthlyPass);

  sendJson(res, 200, {
    ok: true,
    monthlyPass,
    wallet: account.wallet
  });
}

/* 월영의 약속 일일 보상 수령입니다. 하루 1회만 허용하며, account.wallet.moonShards만
   증가시킵니다(전투용 S.moonShards와는 절대 연결하지 않습니다). */
function handleMonthlyPassClaimDaily(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const pass = account.monthlyPass || buildDefaultMonthlyPass();
  const status = normalizeMonthlyPass(pass);

  if (!status.active) {
    sendJson(res, 409, {
      ok: false,
      code: "MONTHLY_PASS_NOT_ACTIVE",
      message: "월영의 약속이 활성화되어 있지 않습니다."
    });
    return;
  }

  if (!status.canClaimToday) {
    sendJson(res, 409, {
      ok: false,
      code: "MONTHLY_PASS_ALREADY_CLAIMED",
      message: "오늘 보상은 이미 수령했습니다."
    });
    return;
  }

  const now = Date.now();
  const todayKey = getLocalDateKey(now);
  const rewardAmount = Math.max(0, Number(pass.dailyRewardAmount) || 15);

  account.wallet.moonShards = (Number(account.wallet.moonShards) || 0) + rewardAmount;

  account.monthlyPass = Object.assign({}, pass, {
    active: true,
    lastClaimDate: todayKey,
    claimedDays: Math.min(
      Math.max(0, Number(pass.claimedDays) || 0) + 1,
      Math.max(1, Number(pass.durationDays) || 30)
    )
  });

  const monthlyPass = normalizeMonthlyPass(account.monthlyPass);

  sendJson(res, 200, {
    ok: true,
    reward: { type: "moon_shard", amount: rewardAmount },
    monthlyPass,
    wallet: account.wallet,
    message: "달빛조각 " + rewardAmount + "개를 받았습니다."
  });
}

/* 청약철회입니다. 수령 전 구매 메일이며 7일 이내인 경우에만 허용하고,
   moon_shard로 결제한 상품은 paidAmount만큼 wallet을 환급합니다. */
function handleMailboxRefund(req, res, mailId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  refreshMailStatuses(account);
  const mail = account.mailbox.find((item) => item.mailId === mailId);
  if (!mail) {
    sendJson(res, 404, { ok: false, message: "존재하지 않는 선물입니다." });
    return;
  }

  if (mail.source !== "bm_purchase") {
    sendJson(res, 400, { ok: false, message: "청약철회할 수 없는 선물입니다." });
    return;
  }

  if (mail.status !== "PURCHASED_UNCLAIMED") {
    sendJson(res, 409, { ok: false, message: "청약철회할 수 없는 상태입니다." });
    return;
  }

  if (Number(mail.refundUntil) <= Date.now()) {
    mail.status = "EXPIRED_REFUND";
    sendJson(res, 409, { ok: false, message: "청약철회 기간이 지났습니다." });
    return;
  }

  if (mail.priceType === "moon_shard") {
    account.wallet.moonShards = (Number(account.wallet.moonShards) || 0) + (Number(mail.paidAmount) || 0);
  }

  mail.status = "REFUNDED";
  mail.refundedAt = Date.now();

  sendJson(res, 200, {
    ok: true,
    refundedMailId: mail.mailId,
    mail,
    wallet: account.wallet
  });
}

/* ------------------------------------------------------------------------
   메인메뉴 프로필 아이콘 (캐릭터 스킨 적용) Mock 핸들러
   - 실소유 여부는 characterSkins.ownedSkinIds만 기준으로 판단합니다.
   - 전투/카드/보상/상점 로직에는 관여하지 않고 equippedSkinId만 저장합니다.
   ------------------------------------------------------------------------ */
function handleProfileCharacterSkinsGet(req, res) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  let equippedSkinId = account.characterSkins.equippedSkinId || null;

  /* equippedSkinId가 ownedSkinIds에 없는 비정상 상태라면 기본 외형으로 되돌립니다. */
  if (equippedSkinId && !account.characterSkins.ownedSkinIds.includes(equippedSkinId)) {
    equippedSkinId = null;
    account.characterSkins.equippedSkinId = null;
  }

  sendJson(res, 200, {
    ok: true,
    profile: {
      displayName: DEFAULT_DISPLAY_NAME,
      equippedSkinId,
      currentProfileIcon: resolveProfileIconBySkinId(equippedSkinId)
    },
    characterSkins: account.characterSkins
  });
}

function handleProfileCharacterSkinsEquip(req, res, body) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, code: "NOT_LOGGED_IN", message: "로그인이 필요합니다." });
    return;
  }

  let payload = {};
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    sendJson(res, 400, { ok: false, code: "INVALID_REQUEST", message: "요청 형식이 올바르지 않습니다." });
    return;
  }

  const skinId = payload.skinId === undefined ? null : payload.skinId;
  const account = ensureAccount(accountId);

  if (skinId !== null && !account.characterSkins.ownedSkinIds.includes(skinId)) {
    sendJson(res, 409, {
      ok: false,
      code: "CHARACTER_SKIN_NOT_OWNED",
      message: "보유하지 않은 스킨입니다."
    });
    return;
  }

  account.characterSkins.equippedSkinId = skinId;

  sendJson(res, 200, {
    ok: true,
    message: "스킨이 적용되었습니다.",
    profile: {
      displayName: DEFAULT_DISPLAY_NAME,
      equippedSkinId: skinId,
      currentProfileIcon: resolveProfileIconBySkinId(skinId)
    },
    characterSkins: account.characterSkins
  });
}

/* ------------------------------------------------------------------------
   정적 파일 서빙 (index.html 및 프로젝트 루트 리소스)
   ------------------------------------------------------------------------ */
function serveStaticFile(res, pathname) {
  const relativePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(ROOT_DIR, relativePath));

  if (!filePath.startsWith(ROOT_DIR)) {
    sendJson(res, 403, { ok: false, message: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found: " + relativePath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

/* ------------------------------------------------------------------------
   서버 본체
   ------------------------------------------------------------------------ */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);
  const pathname = url.pathname;
  const method = req.method;

  if (method === "POST" && pathname === "/auth/guest") {
    readRequestBody(req).then(() => handleAuthGuest(res));
    return;
  }

  if (method === "POST" && pathname === "/auth/link/google-play") {
    readRequestBody(req).then(() => handleAuthLinkGooglePlay(res));
    return;
  }

  if (method === "POST" && pathname === "/auth/link/facebook") {
    readRequestBody(req).then(() => handleAuthLinkFacebook(res));
    return;
  }

  if (method === "GET" && pathname === "/mailbox") {
    handleMailboxList(req, res);
    return;
  }

  if (method === "GET" && pathname === "/wallet") {
    handleWallet(req, res);
    return;
  }

  if (method === "POST" && pathname === "/wallet/cheat") {
    readRequestBody(req).then((body) => handleWalletCheat(req, res, body));
    return;
  }

  if (method === "POST" && pathname === "/mailbox/claim-all") {
    handleMailboxClaimAll(req, res);
    return;
  }

  if (method === "GET" && pathname === "/bm-store/dummy-inventory") {
    handleDummyInventory(req, res);
    return;
  }

  const bmPackagePurchaseMatch = pathname.match(/^\/bm-store\/package\/([^/]+)\/purchase$/);
  if (method === "POST" && bmPackagePurchaseMatch) {
    readRequestBody(req).then(() => handleBMPackagePurchase(req, res, decodeURIComponent(bmPackagePurchaseMatch[1])));
    return;
  }

  const bmCharacterSkinPurchaseMatch = pathname.match(/^\/bm-store\/character-skin\/([^/]+)\/purchase$/);
  if (method === "POST" && bmCharacterSkinPurchaseMatch) {
    readRequestBody(req).then(() => handleBMCharacterSkinPurchase(req, res, decodeURIComponent(bmCharacterSkinPurchaseMatch[1])));
    return;
  }

  const bmMoonChargePurchaseMatch = pathname.match(/^\/bm-store\/moon-charge\/([^/]+)\/purchase$/);
  if (method === "POST" && bmMoonChargePurchaseMatch) {
    readRequestBody(req).then(() => handleBMMoonChargePurchase(req, res, decodeURIComponent(bmMoonChargePurchaseMatch[1])));
    return;
  }

  const bmMonthlyPassPurchaseMatch = pathname.match(/^\/bm-store\/monthly-pass\/([^/]+)\/purchase$/);
  if (method === "POST" && bmMonthlyPassPurchaseMatch) {
    readRequestBody(req).then(() => handleBMMonthlyPassPurchase(req, res, decodeURIComponent(bmMonthlyPassPurchaseMatch[1])));
    return;
  }

  if (method === "GET" && pathname === "/bm-store/monthly-pass/status") {
    handleMonthlyPassStatus(req, res);
    return;
  }

  if (method === "POST" && pathname === "/bm-store/monthly-pass/claim-daily") {
    readRequestBody(req).then(() => handleMonthlyPassClaimDaily(req, res));
    return;
  }

  const claimMatch = pathname.match(/^\/mailbox\/([^/]+)\/claim$/);
  if (method === "POST" && claimMatch) {
    handleMailboxClaim(req, res, decodeURIComponent(claimMatch[1]));
    return;
  }

  const refundMatch = pathname.match(/^\/mailbox\/([^/]+)\/refund$/);
  if (method === "POST" && refundMatch) {
    handleMailboxRefund(req, res, decodeURIComponent(refundMatch[1]));
    return;
  }

  if (method === "GET" && pathname === "/profile/character-skins") {
    handleProfileCharacterSkinsGet(req, res);
    return;
  }

  if (method === "POST" && pathname === "/profile/character-skins/equip") {
    readRequestBody(req).then((body) => handleProfileCharacterSkinsEquip(req, res, body));
    return;
  }

  if (method === "GET") {
    serveStaticFile(res, pathname);
    return;
  }

  sendJson(res, 404, { ok: false, message: "Not Found" });
});

server.listen(PORT, () => {
  console.log("[MockServer] http://localhost:" + PORT + " 에서 로컬 Mock 서버가 실행 중입니다.");
  console.log("[MockServer] 치트 테스트: http://localhost:" + PORT + "/?cheat=1");
  console.log("[MockServer] 이 서버는 개발/QA 전용입니다. 실제 배포 서버로 사용하지 마세요.");
});
