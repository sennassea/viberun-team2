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

const PORT = 5173;
const ROOT_DIR = __dirname;
const GUEST_ACCOUNT_ID = "acc_local_guest_001";

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
   - mailbox/wallet은 accountId별로 분리해서 저장합니다.
   - accessToken → accountId 매핑은 /auth/* 응답 발급 시점에 등록합니다.
   ------------------------------------------------------------------------ */
const accounts = new Map();      // accountId -> { mailbox: [...], wallet: {...} }
const tokenToAccount = new Map(); // accessToken -> accountId

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

function ensureAccount(accountId) {
  if (!accounts.has(accountId)) {
    accounts.set(accountId, { mailbox: buildDefaultMailbox(), wallet: { moonShards: 0 } });
  }
  return accounts.get(accountId);
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
function applyRewardsToWallet(wallet, rewards) {
  rewards.forEach((reward) => {
    if (reward.type === "moon_shard") {
      wallet.moonShards += Number(reward.amount) || 0;
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
  sendJson(res, 200, { items: account.mailbox, wallet: account.wallet });
}

function handleMailboxClaim(req, res, mailId) {
  const accountId = resolveAccountId(req);
  if (!accountId) {
    sendJson(res, 401, { ok: false, message: "로그인이 필요합니다." });
    return;
  }

  const account = ensureAccount(accountId);
  const mail = account.mailbox.find((item) => item.mailId === mailId);
  if (!mail) {
    sendJson(res, 404, { ok: false, message: "존재하지 않는 선물입니다." });
    return;
  }

  if (mail.status === "CLAIMED") {
    sendJson(res, 409, { ok: false, message: "이미 수령한 선물입니다." });
    return;
  }

  mail.status = "CLAIMED";
  applyRewardsToWallet(account.wallet, mail.rewards);

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
  const claimedMailIds = [];
  const rewardTotals = new Map();

  account.mailbox.forEach((mail) => {
    if (mail.status !== "UNCLAIMED") return;

    mail.status = "CLAIMED";
    claimedMailIds.push(mail.mailId);
    applyRewardsToWallet(account.wallet, mail.rewards);

    mail.rewards.forEach((reward) => {
      rewardTotals.set(reward.type, (rewardTotals.get(reward.type) || 0) + (Number(reward.amount) || 0));
    });
  });

  const rewards = Array.from(rewardTotals.entries()).map(([type, amount]) => ({ type, amount }));

  sendJson(res, 200, { ok: true, claimedMailIds, rewards, wallet: account.wallet });
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

  if (method === "POST" && pathname === "/mailbox/claim-all") {
    handleMailboxClaimAll(req, res);
    return;
  }

  const claimMatch = pathname.match(/^\/mailbox\/([^/]+)\/claim$/);
  if (method === "POST" && claimMatch) {
    handleMailboxClaim(req, res, decodeURIComponent(claimMatch[1]));
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
