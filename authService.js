"use strict";

/* =========================================================================
   Auth Service
   - 1차 프로토타입용 계정 세션 저장소입니다.
   - 서버 인증 전까지 localStorage 값은 UX 흐름 확인용으로만 사용합니다.
   ========================================================================= */
(function(){
  const AUTH_KEY = "viberunAuthSession";
  const MAILBOX_CONTEXT_VERSION = 1;
  const PROVIDER_CONFIG = {
    googlePlay: {
      accountType: "Google Play",
      bridgeMethod: "signInGooglePlay",
      message: "Google Play 로그인은 Android 모바일 빌드에서 사용할 수 있습니다."
    },
    facebook: {
      accountType: "Facebook",
      bridgeMethod: "signInFacebook",
      message: "Facebook Login SDK가 연결되지 않았습니다."
    }
  };
  const pendingProviderRequests = {};

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

      const session = JSON.parse(raw);
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
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      return { ok: true, session };
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
      typeof session.uid === "string" &&
      session.uid.length > 0 &&
      typeof session.provider === "string" &&
      session.provider.length > 0
    );
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

  /* crypto.randomUUID를 우선 사용하고, 미지원 환경에서는 시간값과 난수를 섞어 충돌 가능성을 낮춥니다. */
  function createGuestUid(){
    if(window.crypto && typeof window.crypto.randomUUID === "function"){
      return "guest_" + window.crypto.randomUUID();
    }

    const randomPart = Math.random().toString(36).slice(2, 12);
    const timePart = Date.now().toString(36);
    return "guest_" + timePart + "_" + randomPart;
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
      uid: session.uid,
      provider: session.provider,
      accountType: session.provider === "guest"
        ? "Guest"
        : ((PROVIDER_CONFIG[session.provider] && PROVIDER_CONFIG[session.provider].accountType) || session.provider),
      isGuest: session.provider === "guest" || !!session.isGuest,
      linkedProvider: session.linkedProvider || "",
      displayName: session.displayName || "",
      createdAt: session.createdAt || 0,
      lastLoginAt: session.lastLoginAt || 0
    };
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

  /* 1차 실제 구현 대상입니다. 기존 Guest 세션이 있으면 새 UID를 만들지 않고 재사용합니다. */
  function signInGuest(){
    const existing = readSession();
    if(existing) return { ok: true, account: buildAccountInfo(existing) };

    const now = Date.now();
    const session = {
      uid: createGuestUid(),
      provider: "guest",
      isGuest: true,
      createdAt: now,
      lastLoginAt: now,
      linkedProvider: ""
    };
    const result = writeSession(session);
    if(!result.ok) return result;

    return { ok: true, account: buildAccountInfo(session) };
  }

  /* SDK/네이티브 브리지가 반환한 값을 세션에 저장 가능한 최소 필드로 정규화합니다. */
  function normalizeProviderPayload(provider, payload){
    const source = payload && typeof payload === "object" ? payload : {};
    const uid = String(source.uid || source.playerId || source.userId || source.id || "").trim();
    return {
      uid: uid || createProviderUid(provider),
      displayName: String(source.displayName || source.name || "").trim(),
      authCode: source.authCode || "",
      accessToken: source.accessToken || "",
      raw: source.raw || null
    };
  }

  /* Guest에서 외부 계정으로 승격될 때 기존 생성 시각을 유지해 진행 데이터와 계정 이력을 끊지 않습니다. */
  function writeProviderSession(provider, payload){
    if(!PROVIDER_CONFIG[provider]){
      return { ok: false, provider, message: "지원하지 않는 로그인 방식입니다." };
    }

    const existing = readSession();
    const normalized = normalizeProviderPayload(provider, payload);
    const now = Date.now();
    const session = {
      uid: normalized.uid,
      provider,
      isGuest: false,
      createdAt: existing && existing.createdAt ? existing.createdAt : now,
      lastLoginAt: now,
      linkedProvider: provider,
      previousGuestUid: existing && existing.provider === "guest" ? existing.uid : "",
      displayName: normalized.displayName,
      hasProviderCredential: !!(normalized.authCode || normalized.accessToken)
    };

    const result = writeSession(session);
    if(!result.ok) return result;
    return { ok: true, provider, account: buildAccountInfo(session) };
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
        return writeProviderSession(provider, payload);
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
    const result = writeProviderSession(provider, payload);
    if(pendingProviderRequests[provider]){
      pendingProviderRequests[provider].resolve(result);
      delete pendingProviderRequests[provider];
    }
    return result;
  }

  function signInGooglePlay(){
    return requestProviderLogin("googlePlay");
  }

  function signInFacebook(){
    return requestProviderLogin("facebook");
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
      localStorage.removeItem(AUTH_KEY);
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
    signInGuest,
    signInGooglePlay,
    signInFacebook,
    completeProviderLogin,
    logout
  };
})();
