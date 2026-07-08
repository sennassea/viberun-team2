"use strict";

(function () {
  const CONFIG = window.VIBERUN_SOUND_CONFIG || {};
  const VOLUME_KEY = "viberunVolumeSettings";
  const DEFAULT_VOLUMES = CONFIG.defaults || { master: 80, music: 70, effect: 80 };
  const cache = new Map();
  const lastPlayedAt = new Map();
  let currentBgm = null;
  let pendingBgmKey = null;
  let unlockBound = false;

  function clampVolume(value, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(100, n));
  }

  function normalizeMuted(muted) {
    const source = muted && typeof muted === "object" ? muted : {};
    return {
      master: source.master === true,
      music: source.music === true,
      effect: source.effect === true
    };
  }

  function normalizeVolumes(volumes) {
    const source = volumes || {};
    return {
      master: clampVolume(source.master, DEFAULT_VOLUMES.master),
      music: clampVolume(source.music, DEFAULT_VOLUMES.music),
      effect: clampVolume(source.effect, DEFAULT_VOLUMES.effect),
      muted: normalizeMuted(source.muted)
    };
  }

  function readVolumes() {
    if (typeof localStorage === "undefined") return normalizeVolumes();
    try {
      return normalizeVolumes(JSON.parse(localStorage.getItem(VOLUME_KEY) || "{}"));
    } catch (error) {
      localStorage.removeItem(VOLUME_KEY);
      return normalizeVolumes();
    }
  }

  function writeVolumes(volumes) {
    const normalized = normalizeVolumes(volumes);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(VOLUME_KEY, JSON.stringify(normalized));
    }
    applyVolumes(normalized);
    return normalized;
  }

  window.VIBERUN_VOLUME_SETTINGS = {
    key: VOLUME_KEY,
    defaults: { ...DEFAULT_VOLUMES },
    read: readVolumes,
    write: writeVolumes
  };

  function getSound(key) {
    return CONFIG.sounds && CONFIG.sounds[key] ? CONFIG.sounds[key] : null;
  }

  function getCategory(sound) {
    const categoryKey = sound && sound.category ? sound.category : "ui";
    return (CONFIG.categories && CONFIG.categories[categoryKey]) || {};
  }

  function resolveSrc(sound) {
    if (!sound || !sound.src) return "";
    if (/^(https?:)?\/\//.test(sound.src) || sound.src.indexOf("/") === 0) return sound.src;
    return (CONFIG.assetBasePath || "") + sound.src;
  }

  function getAudio(key) {
    const sound = getSound(key);
    const src = resolveSrc(sound);
    if (!src) return null;
    if (cache.has(key)) return cache.get(key);
    const audio = new Audio(src);
    audio.preload = sound.preload || "auto";
    cache.set(key, audio);
    return audio;
  }

  function volumeFor(sound, volumes) {
    const category = getCategory(sound);
    const volumeKey = category.volumeKey || "effect";
    const muted = volumes.muted || {};
    if (muted.master || muted[volumeKey]) return 0;
    return (volumes.master / 100) * ((volumes[volumeKey] ?? 100) / 100) * ((sound.volume ?? 100) / 100);
  }

  function applyAudioVolume(key, audio, volumes) {
    const sound = getSound(key);
    if (!sound || !audio) return;
    audio.volume = Math.max(0, Math.min(1, volumeFor(sound, volumes)));
  }

  function applyVolumes(volumes) {
    const normalized = normalizeVolumes(volumes);
    cache.forEach((audio, key) => applyAudioVolume(key, audio, normalized));
  }

  function play(key, options = {}) {
    const sound = getSound(key);
    const audio = getAudio(key);
    if (!sound || !audio) return false;
    const category = getCategory(sound);
    if (options.allowOverlap !== true) {
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
      const minGap = category.minGapMs ?? 60;
      const last = lastPlayedAt.get(key) || 0;
      if (now - last < minGap) return false;
      lastPlayedAt.set(key, now);
    }
    const volumes = readVolumes();
    applyAudioVolume(key, audio, volumes);
    audio.loop = options.loop ?? sound.loop ?? category.loop ?? false;
    if (options.restart !== false) audio.currentTime = 0;
    const promise = audio.play();
    if (promise && typeof promise.catch === "function") {
      promise.catch(err => {
        /* play()가 곧바로 이어진 pause()에 의해 중단된 경우(AbortError)는 다른 BGM으로
           의도적으로 전환된 것이므로 재시도 대상이 아니다. 실제 자동재생 차단(NotAllowedError)
           이고, 그 사이 다른 곡으로 바뀌지 않았을 때만 다음 제스처에 재시도한다. */
        if (err && err.name === "AbortError") return;
        if (currentBgm && currentBgm.key !== key) return;
        if (category.volumeKey === "music" || sound.loop || category.loop) {
          pendingBgmKey = key;
          ensureUnlockListener();
        }
      });
    }
    return true;
  }

  function ensureUnlockListener() {
    if (unlockBound) return;
    unlockBound = true;
    const retry = () => {
      document.removeEventListener("pointerdown", retry, true);
      document.removeEventListener("keydown", retry, true);
      unlockBound = false;
      if (pendingBgmKey) {
        const key = pendingBgmKey;
        pendingBgmKey = null;
        playBgm(key, { restart: false });
      }
    };
    document.addEventListener("pointerdown", retry, true);
    document.addEventListener("keydown", retry, true);
  }

  function playBgm(key, options = {}) {
    if (currentBgm && currentBgm.key !== key) currentBgm.audio.pause();
    const audio = getAudio(key);
    if (!audio) return false;
    currentBgm = { key, audio };
    return play(key, { ...options, loop: options.loop ?? true, restart: options.restart ?? false, allowOverlap: true });
  }

  function stop(key) {
    const audio = cache.get(key);
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    if (currentBgm && currentBgm.key === key) currentBgm = null;
  }

  function stopBgm() {
    if (!currentBgm) return;
    currentBgm.audio.pause();
    currentBgm.audio.currentTime = 0;
    currentBgm = null;
  }

  function bindAutoClickSound() {
    document.addEventListener("click", event => {
      const selector = CONFIG.autoClickSelector;
      if (!selector || !event.target || typeof event.target.closest !== "function") return;
      const target = event.target.closest(selector);
      if (!target || target.dataset.soundDisabled === "true") return;
      play(target.dataset.soundKey || "uiButtonClick");
    }, true);
  }

  window.VIBERUN_SOUND = {
    play,
    playBgm,
    stop,
    stopBgm,
    setVolume: writeVolumes,
    getVolume: readVolumes,
    refreshVolume: () => applyVolumes(readVolumes()),
    getConfig: () => CONFIG
  };

  bindAutoClickSound();
})();
