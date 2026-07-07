"use strict";

/* =========================================================================
   Auth Service
   - 1차 프로토타입용 계정 세션 저장소입니다.
   - 서버 인증 전까지 localStorage 값은 UX 흐름 확인용으로만 사용합니다.
   ========================================================================= */
(function(){
  const AUTH_KEY = "viberunAuthSession";
  const AUTH_API_BASE = (window.VIBERUN_AUTH_API_BASE || "").replace(/\/$/, "");
  const MAILBOX_CONTEXT_VERSION = 1;
  const PROVIDER_CONFIG = {
    google: {
      accountType: "Google",
      bridgeMethod: "signInGoogle",
      message: "Google 로그인 설정을 확인해 주세요."
    },
    googlePlay: {
      accountType: "Google",
      bridgeMethod: "signInGooglePlay",
      message: "Google 로그인 설정을 확인해 주세요."
    },
    facebook: {
      accountType: "Facebook",
      bridgeMethod: "signInFacebook",
      message: "Facebook 로그인 설정을 확인해 주세요."
    }
  };
  const pendingProviderRequests = {};

  function emitAuthChanged(detail){
    if(typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    try {
      window.dispatchEvent(new CustomEvent("viberun:auth-changed", { detail: detail || {} }));
    } catch(error) {
      console.warn("[Auth] 로그인 상태 변경 이벤트 발행에 실패했습니다.", error);
    }
  }

  /* localStorage 차단/시크릿 모드/저장 용량 문제를 사전에 감지합니다. */
  function canUseLocalStorage(){
    try {
      if(typeof localStorage === "undefined") return false;
      const testKey = "__viberunAuthStorageTest";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch(error) {
      console.warn("[Auth] localStorage를 사용할 수 없어 로그인 세션을 저장할 수 없습니다.", error);
      return false;
    }
  }

  /* 저장된 세션을 안전하게 읽고, 깨진 JSON이나 필수 값이 없는 세션은 즉시 정리합니다. */
  function readSession(){
    if(!canUseLocalStorage()) return null;

    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if(!raw) return null;

      const session = normalizeStoredSession(JSON.parse(raw));
      if(!isValidSession(session)){
        localStorage.removeItem(AUTH_KEY);
        return null;
      }

      return session;
    } catch(error) {
      console.warn("[Auth] 저장된 로그인 세션을 읽는 중 오류가 발생했습니다.", error);
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
  }

  /* Guest UID와 provider 정보를 단일 키에 저장합니다. 1차에서는 서버 검증 없이 UX 검증용으로만 사용합니다. */
  function writeSession(session){
    if(!canUseLocalStorage()){
      return {
        ok: false,
        message: "브라우저 저장소를 사용할 수 없어 Guest 로그인을 진행할 수 없습니다."
      };
    }

    try {
      const normalizedSession = normalizeStoredSession(session);
      if(!isValidSession(normalizedSession)){
        return {
          ok: false,
          message: "로그인 세션 정보가 올바르지 않습니다."
        };
      }

      const storedSession = Object.assign({}, normalizedSession);
      delete storedSession.uid;

      localStorage.setItem(AUTH_KEY, JSON.stringify(storedSession));
      emitAuthChanged({ isLoggedIn: true, accountId: normalizedSession.accountId, provider: normalizedSession.provider });
      return { ok: true, session: normalizedSession };
    } catch(error) {
      console.warn("[Auth] 로그인 세션 저장에 실패했습니다.", error);
      return {
        ok: false,
        message: "로그인 정보를 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요."
      };
    }
  }

  function isValidSession(session){
    return !!(
      session &&
      typeof session.accountId === "string" &&
      session.accountId.length > 0 &&
      typeof session.provider === "string" &&
      session.provider.length > 0
    );
  }

  /* All stored sessions pass through this adapter so old uid-only data still loads, while new saves are accountId based. */
  function normalizeStoredSession(session){
    if(!session || typeof session !== "object") return null;

    const accountId = String(session.accountId || session.uid || "").trim();
    const provider = String(session.provider || "guest").trim();
    if(!accountId || !provider) return null;

    return {
      accountId,
      uid: accountId,
      provider,
      providerUserId: String(session.providerUserId || "").trim(),
      displayName: String(session.displayName || "").trim(),
      accessToken: String(session.accessToken || "").trim(),
      refreshToken: String(session.refreshToken || "").trim(),
      isGuest: typeof session.isGuest === "boolean" ? session.isGuest : provider === "guest",
      createdAt: Number(session.createdAt) || Date.now(),
      lastLoginAt: Number(session.lastLoginAt) || Date.now(),
      linkedProvider: session.linkedProvider || (provider === "guest" ? "" : provider)
    };
  }

  /* Sends auth requests to the configured backend and preserves server error codes for UI-specific messages. */
  function requestAuthJson(path, options){
    if(typeof fetch !== "function"){
      return Promise.resolve({
        ok: false,
        code: "FETCH_UNAVAILABLE",
        message: "네트워크 요청을 사용할 수 없는 환경입니다."
      });
    }

    const requestOptions = options || {};
    const headers = Object.assign({ "Content-Type": "application/json" }, requestOptions.headers || {});

    return fetch(AUTH_API_BASE + path, Object.assign({}, requestOptions, { headers }))
      .then(response => response.text().then(text => {
        let body = {};
        if(text){
          try {
            body = JSON.parse(text);
          } catch(error) {
            console.warn("[Auth] 서버 응답 JSON 파싱 실패:", error);
            body = { message: text };
          }
        }

        if(response.ok) return { ok: true, body };

        return {
          ok: false,
          status: response.status,
          code: body.code || body.errorCode || body.error || "",
          message: body.message || "서버 인증 요청에 실패했습니다.",
          body
        };
      }))
      .catch(error => {
        console.warn("[Auth] 서버 인증 요청 중 네트워크 오류가 발생했습니다.", error);
        return {
          ok: false,
          code: "NETWORK_ERROR",
          error,
          message: "서버와 연결할 수 없습니다. 네트워크 상태를 확인해 주세요."
        };
      });
  }

  /* 외부 계정 로그인 결과에 uid가 없을 때만 임시 UID를 만듭니다. 실제 빌드에서는 서버 검증 UID로 교체되어야 합니다. */
  function createProviderUid(provider){
    const prefix = provider === "facebook" ? "facebook_" : "googlePlay_";
    if(window.crypto && typeof window.crypto.randomUUID === "function"){
      return prefix + window.crypto.randomUUID();
    }

    const randomPart = Math.random().toString(36).slice(2, 12);
    const timePart = Date.now().toString(36);
    return prefix + timePart + "_" + randomPart;
  }

  /* 설정 UI와 향후 선물함에서 같은 형태로 계정 정보를 읽을 수 있게 표준 응답을 만듭니다. */
  function buildAccountInfo(session){
    if(!session){
      return {
        isLoggedIn: false,
        uid: "",
        provider: "none",
        accountType: "미로그인",
        isGuest: false,
        linkedProvider: ""
      };
    }

    return {
      isLoggedIn: true,
      accountId: session.accountId,
      uid: session.accountId,
      provider: session.provider,
      accountType: session.provider === "guest"
        ? "Guest"
        : ((PROVIDER_CONFIG[session.provider] && PROVIDER_CONFIG[session.provider].accountType) || session.provider),
      isGuest: session.provider === "guest" || !!session.isGuest,
      linkedProvider: session.linkedProvider || (session.provider === "guest" ? "" : session.provider),
      providerUserId: session.providerUserId || "",
      accessToken: session.accessToken || "",
      refreshToken: session.refreshToken || "",
      displayName: session.displayName || "",
      createdAt: session.createdAt || 0,
      lastLoginAt: session.lastLoginAt || 0
    };
  }

  function getSupabaseClient(){
    const supabaseBridge = window.VIBERUN_SUPABASE;
    if(!supabaseBridge || typeof supabaseBridge.getClient !== "function") return null;
    return supabaseBridge.getClient();
  }

  function buildSupabaseSession(authSession){
    const sourceSession = authSession && typeof authSession === "object" ? authSession : {};
    const user = sourceSession.user || {};
    const appMetadata = user.app_metadata || {};
    const userMetadata = user.user_metadata || {};
    const userId = String(user.id || "").trim();
    const rawProvider = String(appMetadata.provider || "").trim();
    const provider = user.is_anonymous || rawProvider === "anonymous" ? "guest" : (rawProvider || "guest");
    const now = Date.now();
    return {
      accountId: userId,
      provider,
      providerUserId: String(userMetadata.provider_id || userMetadata.sub || "").trim(),
      displayName: String(userMetadata.full_name || userMetadata.name || userMetadata.email || "").trim(),
      accessToken: String(sourceSession.access_token || "").trim(),
      refreshToken: String(sourceSession.refresh_token || "").trim(),
      isGuest: provider === "guest",
      createdAt: user.created_at ? Date.parse(user.created_at) || now : now,
      lastLoginAt: now,
      linkedProvider: provider === "guest" ? "" : provider
    };
  }

  function writeSupabaseSession(authSession){
    const session = buildSupabaseSession(authSession);
    if(!session.accountId || !session.accessToken || !session.refreshToken){
      return {
        ok: false,
        code: "INVALID_SUPABASE_SESSION",
        message: "Supabase 로그인 응답이 올바르지 않습니다."
      };
    }

    const result = writeSession(session);
    if(!result.ok) return result;
    return prepareServerUserData(result.session).then(dataResult => {
      return {
        ok: true,
        account: buildAccountInfo(result.session),
        session: result.session,
        profile: dataResult && dataResult.profile ? dataResult.profile : null,
        wallet: dataResult && dataResult.wallet ? dataResult.wallet : null,
        userData: dataResult || null
      };
    });
  }

  function prepareServerUserData(session){
    if(!session || !session.accountId) return Promise.resolve(null);
    const userData = window.VIBERUN_USER_DATA;
    if(!userData || typeof userData.prepareUserData !== "function") return Promise.resolve(null);

    return Promise.resolve(userData.prepareUserData(buildAccountInfo(session))).then(result => {
      if(result && !result.ok){
        console.warn("[Auth] 서버 유저 데이터 준비가 완전히 끝나지 않았습니다.", result);
      }
      return result;
    }).catch(error => {
      console.warn("[Auth] 서버 유저 데이터 준비 중 오류가 발생했습니다.", error);
      return { ok: false, error };
    });
  }

  function buildSessionResult(session){
    const account = buildAccountInfo(session);
    return prepareServerUserData(session).then(dataResult => {
      return {
        ok: true,
        account,
        session,
        profile: dataResult && dataResult.profile ? dataResult.profile : null,
        wallet: dataResult && dataResult.wallet ? dataResult.wallet : null,
        userData: dataResult || null
      };
    });
  }

  function isLoggedIn(){
    return !!readSession();
  }

  function getAccountInfo(){
    return buildAccountInfo(readSession());
  }

  /* 새 게임/이어하기 진입 전 사용하는 게이트입니다. 로그인 성공 후 기존 콜백을 그대로 재호출합니다. */
  function requireLogin(callback){
    if(isLoggedIn()) return true;

    if(window.VIBERUN_LOGIN_MODAL && typeof window.VIBERUN_LOGIN_MODAL.open === "function"){
      window.VIBERUN_LOGIN_MODAL.open({
        onSuccess(){
          if(typeof callback === "function") callback();
        }
      });
    } else {
      console.warn("[Auth] 로그인 모달이 아직 로드되지 않았습니다.");
      if(typeof toast === "function") toast("로그인 창을 불러올 수 없습니다.");
    }

    return false;
  }

  function checkSession(){
    const existing = readSession();
    if(existing) return buildSessionResult(existing);

    const client = getSupabaseClient();
    if(!client || !client.auth || typeof client.auth.getSession !== "function"){
      return Promise.resolve({ ok: false, code: "SUPABASE_UNAVAILABLE", message: "Supabase 연결을 사용할 수 없습니다." });
    }

    return client.auth.getSession().then(result => {
      const authSession = result && result.data ? result.data.session : null;
      if(!authSession) return { ok: false, code: "NO_SESSION", message: "저장된 로그인 세션이 없습니다." };
      return writeSupabaseSession(authSession);
    }).catch(error => {
      console.warn("[Auth] Supabase 세션 확인 중 오류가 발생했습니다.", error);
      return {
        ok: false,
        code: "SUPABASE_SESSION_ERROR",
        error,
        message: "로그인 세션을 확인하지 못했습니다."
      };
    });
  }

  /* 1차 실제 구현 대상입니다. 기존 Guest 세션이 있으면 새 UID를 만들지 않고 재사용합니다. */
  function signInGuest(){
    const existing = readSession();
    if(existing) return buildSessionResult(existing);

    const client = getSupabaseClient();
    if(client && client.auth && typeof client.auth.signInAnonymously === "function"){
      return client.auth.signInAnonymously().then(result => {
        if(result && result.error){
          return {
            ok: false,
            code: result.error.code || "SUPABASE_AUTH_ERROR",
            error: result.error,
            message: result.error.message || "Supabase 익명 로그인에 실패했습니다."
          };
        }

        const authSession = result && result.data ? result.data.session : null;
        return writeSupabaseSession(authSession);
      }).catch(error => {
        console.warn("[Auth] Supabase 익명 로그인 중 오류가 발생했습니다.", error);
        return {
          ok: false,
          code: "SUPABASE_NETWORK_ERROR",
          error,
          message: "Supabase 익명 로그인 중 오류가 발생했습니다."
        };
      });
    }

    return requestAuthJson("/auth/guest", { method: "POST" }).then(response => {
      if(!response.ok) return response;

      const body = response.body || {};
      const now = Date.now();
      const session = {
        accountId: String(body.accountId || "").trim(),
        provider: body.provider || "guest",
        providerUserId: "",
        displayName: body.displayName || "",
        accessToken: body.accessToken || "",
        refreshToken: body.refreshToken || "",
        isGuest: true,
        createdAt: Number(body.createdAt) || now,
        lastLoginAt: now
      };
      if(!session.accountId || !session.accessToken || !session.refreshToken){
        return {
          ok: false,
          code: "INVALID_AUTH_RESPONSE",
          message: "서버 Guest 인증 응답이 올바르지 않습니다."
        };
      }

      const result = writeSession(session);
      if(!result.ok) return result;

      return { ok: true, account: buildAccountInfo(result.session) };
    });
  }

  /* SDK/네이티브 브리지가 반환한 값을 세션에 저장 가능한 최소 필드로 정규화합니다. */
  function normalizeProviderPayload(provider, payload){
    const source = payload && typeof payload === "object" ? payload : {};
    const tokenString = typeof payload === "string" ? payload.trim() : "";
    const uid = String(source.uid || source.playerId || source.userId || source.id || "").trim();
    return {
      uid: uid || createProviderUid(provider),
      providerUserId: String(source.providerUserId || uid || "").trim(),
      displayName: String(source.displayName || source.name || "").trim(),
      googlePlayToken: source.googlePlayToken || source.idToken || source.serverAuthCode || source.authCode || source.accessToken || tokenString,
      facebookAccessToken: source.facebookAccessToken || source.accessToken || tokenString,
      authCode: source.authCode || "",
      accessToken: source.accessToken || "",
      raw: source.raw || null
    };
  }

  /* Guest에서 외부 계정으로 승격될 때 기존 생성 시각을 유지해 진행 데이터와 계정 이력을 끊지 않습니다. */
  function writeProviderSession(provider, payload){
    return linkProviderSession(provider, payload);
  }

  /* Links an external provider to the current guest account without changing accountId. */
  function linkProviderSession(provider, payload){
    if(!PROVIDER_CONFIG[provider]){
      return Promise.resolve({ ok: false, provider, message: "지원하지 않는 로그인 방식입니다." });
    }

    const existing = readSession();
    if(!existing || !existing.accountId || !existing.accessToken || !existing.isGuest){
      return Promise.resolve({
        ok: false,
        provider,
        code: "GUEST_SESSION_REQUIRED",
        message: "Guest 계정으로 로그인한 뒤 계정 연동을 진행해 주세요."
      });
    }

    const normalized = normalizeProviderPayload(provider, payload);
    const linkPath = provider === "facebook" ? "/auth/link/facebook" : "/auth/link/google-play";
    const requestBody = provider === "facebook"
      ? { facebookAccessToken: normalized.facebookAccessToken }
      : { googlePlayToken: normalized.googlePlayToken };

    if(!requestBody.facebookAccessToken && !requestBody.googlePlayToken){
      return Promise.resolve({
        ok: false,
        provider,
        code: "PROVIDER_TOKEN_REQUIRED",
        message: "provider 인증 토큰을 확인할 수 없습니다."
      });
    }

    return requestAuthJson(linkPath, {
      method: "POST",
      headers: { Authorization: "Bearer " + existing.accessToken },
      body: JSON.stringify(requestBody)
    }).then(response => {
      if(!response.ok){
        if(response.code === "ACCOUNT_ALREADY_LINKED"){
          response.message = "이미 다른 계정에 연결된 로그인입니다.";
        }
        return Object.assign({ provider }, response);
      }

      const body = response.body || {};
      const returnedAccountId = String(body.accountId || "").trim();
      if(returnedAccountId !== existing.accountId){
        console.warn("[Auth] Provider link returned a different accountId.", {
          currentAccountId: existing.accountId,
          returnedAccountId
        });
        return {
          ok: false,
          provider,
          code: "ACCOUNT_ID_MISMATCH",
          message: "계정 연동 응답의 accountId가 현재 Guest 계정과 다릅니다."
        };
      }

      const session = {
        accountId: existing.accountId,
        provider: body.provider || provider,
        providerUserId: body.providerUserId || normalized.providerUserId,
        displayName: body.displayName || normalized.displayName,
        accessToken: body.accessToken || "",
        refreshToken: body.refreshToken || "",
        isGuest: false,
        createdAt: existing.createdAt || Date.now(),
        lastLoginAt: Date.now(),
        linkedProvider: body.provider || provider
      };
      if(!session.accessToken || !session.refreshToken){
        return {
          ok: false,
          provider,
          code: "INVALID_AUTH_RESPONSE",
          message: "계정 연동 토큰 응답이 올바르지 않습니다."
        };
      }

      const result = writeSession(session);
      if(!result.ok) return result;
      return { ok: true, provider, account: buildAccountInfo(result.session) };
    });
  }

  /* window.VIBERUN_AUTH_PROVIDERS 또는 앱 브리지에 실제 SDK 함수를 연결해 provider 로그인을 실행합니다. */
  function requestProviderLogin(provider){
    const config = PROVIDER_CONFIG[provider];
    if(!config) return Promise.resolve({ ok: false, provider, message: "지원하지 않는 로그인 방식입니다." });

    const adapters = window.VIBERUN_AUTH_PROVIDERS || {};
    const adapter = adapters[provider];
    const directSignIn = typeof adapter === "function"
      ? adapter
      : adapter && typeof adapter.signIn === "function"
        ? adapter.signIn.bind(adapter)
        : null;
    const facebookSdkSignIn = provider === "facebook" && window.FB && typeof window.FB.login === "function"
      ? requestFacebookSdkLogin
      : null;
    const bridge = window.VIBERUN_NATIVE_AUTH;
    const bridgeSignIn = bridge && typeof bridge[config.bridgeMethod] === "function"
      ? bridge[config.bridgeMethod].bind(bridge)
      : null;

    if(!directSignIn && !facebookSdkSignIn && !bridgeSignIn){
      console.warn("[Auth] " + config.accountType + " provider가 연결되지 않았습니다.");
      return Promise.resolve({ ok: false, provider, message: config.message });
    }

    try {
      const signIn = directSignIn || facebookSdkSignIn || bridgeSignIn;
      const signInResult = signIn();
      if(signInResult === undefined && bridgeSignIn){
        if(pendingProviderRequests[provider]){
          return Promise.resolve({ ok: false, provider, message: config.accountType + " 로그인이 이미 진행 중입니다." });
        }

        return new Promise(resolve => {
          pendingProviderRequests[provider] = { resolve };
          window.setTimeout(() => {
            if(!pendingProviderRequests[provider]) return;
            delete pendingProviderRequests[provider];
            resolve({ ok: false, provider, message: config.accountType + " 로그인 응답 시간이 초과되었습니다." });
          }, 30000);
        });
      }

      return Promise.resolve(signInResult).then(payload => {
        if(!payload || payload.cancelled){
          return { ok: false, provider, message: config.accountType + " 로그인이 취소되었습니다." };
        }
        return linkProviderSession(provider, payload);
      }).catch(error => {
        console.warn("[Auth] " + config.accountType + " 로그인 처리 중 오류가 발생했습니다.", error);
        return {
          ok: false,
          provider,
          error,
          message: config.accountType + " 로그인에 실패했습니다."
        };
      });
    } catch(error) {
      console.warn("[Auth] " + config.accountType + " 로그인 호출 중 오류가 발생했습니다.", error);
      return Promise.resolve({
        ok: false,
        provider,
        error,
        message: config.accountType + " 로그인에 실패했습니다."
      });
    }
  }

  /* Facebook JS SDK가 이미 초기화된 웹 빌드에서는 FB.login 결과를 표준 payload로 변환합니다. */
  function requestFacebookSdkLogin(){
    return new Promise(resolve => {
      window.FB.login(response => {
        const authResponse = response && response.authResponse;
        if(!authResponse || response.status !== "connected"){
          resolve({ cancelled: true });
          return;
        }

        resolve({
          uid: authResponse.userID,
          accessToken: authResponse.accessToken
        });
      }, { scope: "public_profile,email" });
    });
  }

  /* Promise를 반환하지 않는 네이티브 SDK 브리지가 콜백으로 로그인 완료를 알려올 때 사용하는 진입점입니다. */
  function completeProviderLogin(provider, payload){
    const resultPromise = Promise.resolve(linkProviderSession(provider, payload));
    const pendingRequest = pendingProviderRequests[provider];
    if(pendingRequest){
      resultPromise.then(result => pendingRequest.resolve(result));
      delete pendingProviderRequests[provider];
    }
    return resultPromise;
  }

  function signInGooglePlay(){
    return signInWithSupabaseOAuth("google");
  }

  function signInFacebook(){
    return signInWithSupabaseOAuth("facebook");
  }

  function getOAuthRedirectTo(){
    if(!window.location || !/^https?:$/.test(window.location.protocol)) return undefined;
    return window.location.href.split("#")[0];
  }

  function signInWithSupabaseOAuth(provider){
    const client = getSupabaseClient();
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.googlePlay;
    if(!client || !client.auth || typeof client.auth.signInWithOAuth !== "function"){
      return requestProviderLogin(provider === "google" ? "googlePlay" : provider);
    }

    return client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getOAuthRedirectTo()
      }
    }).then(result => {
      if(result && result.error){
        return {
          ok: false,
          provider,
          code: result.error.code || "SUPABASE_OAUTH_ERROR",
          error: result.error,
          message: result.error.message || (config.accountType + " 로그인에 실패했습니다.")
        };
      }

      return {
        ok: false,
        provider,
        code: "OAUTH_REDIRECT",
        message: config.accountType + " 로그인 페이지로 이동합니다."
      };
    }).catch(error => {
      console.warn("[Auth] " + config.accountType + " OAuth 로그인 중 오류가 발생했습니다.", error);
      return {
        ok: false,
        provider,
        code: "SUPABASE_OAUTH_ERROR",
        error,
        message: config.accountType + " 로그인 중 오류가 발생했습니다."
      };
    });
  }

  /* 로그아웃은 인증 세션을 제거하고, 첫 방문 메뉴 복귀에 필요한 이전 계정 정보를 반환합니다. */
  function logout(){
    if(!canUseLocalStorage()){
      return {
        ok: false,
        message: "브라우저 저장소를 사용할 수 없어 로그아웃할 수 없습니다."
      };
    }

    try {
      const previousAccount = getAccountInfo();
      const client = getSupabaseClient();
      if(client && client.auth && typeof client.auth.signOut === "function"){
        client.auth.signOut().catch(error => {
          console.warn("[Auth] Supabase 로그아웃 요청에 실패했습니다.", error);
        });
      }
      if(window.VIBERUN_USER_DATA && typeof window.VIBERUN_USER_DATA.clearCache === "function"){
        window.VIBERUN_USER_DATA.clearCache();
      }
      localStorage.removeItem(AUTH_KEY);
      emitAuthChanged({ isLoggedIn: false, previousUid: previousAccount && previousAccount.uid ? previousAccount.uid : null });
      return {
        ok: true,
        previousUid: previousAccount && previousAccount.uid ? previousAccount.uid : null,
        previousProvider: previousAccount && previousAccount.provider ? previousAccount.provider : null,
        shouldReturnToFirstVisitMenu: true
      };
    } catch(error) {
      console.warn("[Auth] 로그아웃 처리 중 오류가 발생했습니다.", error);
      return {
        ok: false,
        error,
        message: "로그아웃 처리 중 오류가 발생했습니다."
      };
    }
  }

  /* 선물함 1차 준비용 컨텍스트입니다. 실제 지급/수령 기록은 2차 서버 연동에서 채웁니다. */
  function getMailboxContext(){
    const account = getAccountInfo();
    return {
      version: MAILBOX_CONTEXT_VERSION,
      account,
      enabled: account.isLoggedIn,
      items: []
    };
  }

  window.VIBERUN_AUTH = {
    AUTH_KEY,
    isLoggedIn,
    getAccountInfo,
    getMailboxContext,
    requireLogin,
    checkSession,
    signInGuest,
    signInGooglePlay,
    signInFacebook,
    completeProviderLogin,
    logout
  };

  function restoreSupabaseSessionOnLoad(){
    checkSession().then(result => {
      if(result && result.ok){
        emitAuthChanged({
          isLoggedIn: true,
          accountId: result.account && (result.account.accountId || result.account.uid),
          provider: result.account && result.account.provider
        });
      }
    });
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", restoreSupabaseSessionOnLoad);
  } else {
    restoreSupabaseSessionOnLoad();
  }
})();
