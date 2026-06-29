"use strict";

(function(global){
  const SAVE_DB = "gwiroSaveBackup";
  const SAVE_STORE = "snapshots";
  const SAVE_KEY = "viberunSaveState";
  const RESUME_EVENT = "viberun:resume";
  const PAUSE_EVENT = "viberun:pause";
  let paused = document.visibilityState === "hidden";
  let appPauseState = null;

  function openDb(){
    if(!("indexedDB" in global)) return Promise.resolve(null);

    return new Promise(resolve => {
      const request = indexedDB.open(SAVE_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if(!db.objectStoreNames.contains(SAVE_STORE)){
          db.createObjectStore(SAVE_STORE, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    });
  }

  async function writeIndexedDb(payload){
    const db = await openDb();
    if(!db) return false;

    return new Promise(resolve => {
      const tx = db.transaction(SAVE_STORE, "readwrite");
      tx.objectStore(SAVE_STORE).put({ id: SAVE_KEY, payload, updatedAt: Date.now() });
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    });
  }

  async function readIndexedDb(){
    const db = await openDb();
    if(!db) return null;

    return new Promise(resolve => {
      const tx = db.transaction(SAVE_STORE, "readonly");
      const request = tx.objectStore(SAVE_STORE).get(SAVE_KEY);
      request.onsuccess = () => resolve(request.result ? request.result.payload : null);
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
      tx.onabort = () => db.close();
    });
  }

  async function deleteIndexedDb(){
    const db = await openDb();
    if(!db) return false;

    return new Promise(resolve => {
      const tx = db.transaction(SAVE_STORE, "readwrite");
      tx.objectStore(SAVE_STORE).delete(SAVE_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    });
  }

  function getCapacitorPreferences(){
    return global.Capacitor && global.Capacitor.Plugins
      ? global.Capacitor.Plugins.Preferences
      : null;
  }

  async function writeCapacitor(payload){
    const prefs = getCapacitorPreferences();
    if(!prefs || typeof prefs.set !== "function") return false;
    try {
      await prefs.set({ key: SAVE_KEY, value: JSON.stringify(payload) });
      return true;
    } catch(error) {
      return false;
    }
  }

  async function readCapacitor(){
    const prefs = getCapacitorPreferences();
    if(!prefs || typeof prefs.get !== "function") return null;
    try {
      const result = await prefs.get({ key: SAVE_KEY });
      return result && result.value ? JSON.parse(result.value) : null;
    } catch(error) {
      return null;
    }
  }

  async function deleteCapacitor(){
    const prefs = getCapacitorPreferences();
    if(!prefs || typeof prefs.remove !== "function") return false;
    try {
      await prefs.remove({ key: SAVE_KEY });
      return true;
    } catch(error) {
      return false;
    }
  }

  async function saveBackup(payload){
    await Promise.all([writeIndexedDb(payload), writeCapacitor(payload)]);
    return payload;
  }

  async function loadBackup(){
    return (await readCapacitor()) || (await readIndexedDb());
  }

  async function clearBackup(){
    await Promise.all([deleteIndexedDb(), deleteCapacitor()]);
  }

  function closeTopOverlay(){
    const settings = document.querySelector("#settingsViewerOverlay.show .settings-viewer-close");
    if(settings){ settings.click(); return true; }

    const map = document.querySelector("#mapOverlay #mapClose");
    if(map){ map.click(); return true; }

    const reward = document.querySelector("#cardRewardOverlay.show .reward-skip");
    if(reward){ reward.click(); return true; }

    const over = document.querySelector("#over.show");
    if(over){
      const restart = document.querySelector("#restart");
      if(restart) restart.focus();
      return true;
    }

    return false;
  }

  function handleBackButton(){
    if(closeTopOverlay()){
      history.pushState({ app: "gwiro" }, "", location.href);
      return;
    }
    if(typeof toast === "function") toast("뒤로가기를 한 번 더 누르면 앱이 종료됩니다.");
  }

  function bindAndroidBack(){
    history.replaceState({ app: "gwiro-root" }, "", location.href);
    history.pushState({ app: "gwiro" }, "", location.href);
    global.addEventListener("popstate", handleBackButton);

    const app = global.Capacitor && global.Capacitor.Plugins
      ? global.Capacitor.Plugins.App
      : null;
    if(app && typeof app.addListener === "function"){
      app.addListener("backButton", event => {
        if(closeTopOverlay()) return;
        if(event && typeof event.canGoBack !== "undefined" && !event.canGoBack && app.exitApp){
          app.exitApp();
        }
      });
    }
  }

  function syncViewportHeight(){
    const viewport = global.visualViewport;
    const height = viewport ? viewport.height : global.innerHeight;
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  }

  function pauseMedia(){
    document.querySelectorAll("audio, video").forEach(media => {
      if(media.paused) return;
      media.dataset.mobilePaused = "1";
      media.pause();
    });
  }

  function pauseCombat(){
    if(appPauseState || typeof S === "undefined" || !S || S.over) return;
    appPauseState = { busy: !!S.busy };
    S.busy = true;
    if(typeof updateEndBtn === "function") updateEndBtn();
  }

  function resumeCombat(){
    if(!appPauseState) return;
    if(typeof S !== "undefined" && S && !S.over){
      S.busy = appPauseState.busy;
      if(typeof updateEndBtn === "function") updateEndBtn();
    }
    appPauseState = null;
  }

  function setPaused(nextPaused){
    if(paused === nextPaused) return;
    paused = nextPaused;
    document.documentElement.classList.toggle("app-paused", paused);

    if(paused){
      pauseMedia();
      pauseCombat();
      document.dispatchEvent(new CustomEvent(PAUSE_EVENT));
      return;
    }

    resumeCombat();
    document.dispatchEvent(new CustomEvent(RESUME_EVENT));
  }

  function waitForResume(){
    if(!paused) return Promise.resolve();
    return new Promise(resolve => {
      document.addEventListener(RESUME_EVENT, resolve, { once: true });
    });
  }

  async function appWait(ms){
    let remaining = Math.max(0, Number(ms) || 0);
    while(remaining > 0){
      if(paused) await waitForResume();
      const slice = Math.min(remaining, 80);
      const startedAt = Date.now();
      await new Promise(resolve => setTimeout(resolve, slice));
      if(!paused) remaining -= Date.now() - startedAt;
    }
  }

  function registerServiceWorker(){
    if(!("serviceWorker" in navigator)) return;
    global.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  function bindLifecycle(){
    syncViewportHeight();
    global.addEventListener("resize", syncViewportHeight);
    if(global.visualViewport){
      global.visualViewport.addEventListener("resize", syncViewportHeight);
      global.visualViewport.addEventListener("scroll", syncViewportHeight);
    }
    document.addEventListener("visibilitychange", () => setPaused(document.visibilityState === "hidden"));
    global.addEventListener("pagehide", () => setPaused(true));
    global.addEventListener("pageshow", () => setPaused(false));
    global.addEventListener("blur", () => setPaused(true));
    global.addEventListener("focus", () => setPaused(false));
  }

  global.ViberunMobile = {
    saveBackup,
    loadBackup,
    clearBackup,
    wait: appWait,
    isPaused: () => paused,
    syncViewportHeight
  };

  registerServiceWorker();
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => {
      bindLifecycle();
      bindAndroidBack();
    });
  } else {
    bindLifecycle();
    bindAndroidBack();
  }
})(window);
