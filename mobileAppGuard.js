"use strict";

/* =========================================================================
   Mobile App Guard
   - Browser chrome cannot be removed from a normal browser tab.
   - In APK/WebView, the native shell removes the address bar and this file
     requests fullscreen + landscape as an extra runtime guard.
   ========================================================================= */
(function mobileAppGuard(){
  const LANDSCAPE_ORIENTATION = "landscape";

  function requestFullscreen(){
    const root = document.documentElement;
    if(document.fullscreenElement || !root.requestFullscreen) return;

    root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }

  function lockLandscape(){
    const orientation = screen.orientation;
    if(!orientation || !orientation.lock) return;

    orientation.lock(LANDSCAPE_ORIENTATION).catch(() => {});
  }

  function applyAppMode(){
    document.documentElement.classList.add("mobile-app-mode");
    requestFullscreen();
    lockLandscape();
  }

  window.BOHYUN_MOBILE_APP_GUARD = {
    apply: applyAppMode,
    requestFullscreen,
    lockLandscape
  };

  document.addEventListener("DOMContentLoaded", applyAppMode, { once: true });

  ["pointerdown", "touchstart", "click"].forEach(eventName => {
    window.addEventListener(eventName, applyAppMode, { passive: true });
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(applyAppMode, 250);
  });
})();
