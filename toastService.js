"use strict";
/* =========================================================================
   전역 토스트 서비스 (toastService.js)
   - 모든 토스트 메시지는 document.body 바로 아래 #global-toast-layer를 통해
     출력되어, 로그인/설정/상점/보상 등 어떤 모달·오버레이보다 위에 표시됩니다.
   - 반드시 다른 UI 스크립트보다 먼저 로드되어야 합니다. (index.html 참고)
   ========================================================================= */
(function(){
  const TOAST_LAYER_ID = "global-toast-layer";
  const DEFAULT_DURATION = 1200;

  function ensureToastLayer(){
    let layer = document.getElementById(TOAST_LAYER_ID);
    if(layer) return layer;

    layer = document.createElement("div");
    layer.id = TOAST_LAYER_ID;
    layer.className = "global-toast-layer";
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-atomic", "true");
    document.body.appendChild(layer);
    return layer;
  }

  function normalizeType(type){
    if(type === "success") return "success";
    if(type === "warning") return "warning";
    if(type === "error") return "error";
    return "info";
  }

  function showToast(message, options){
    if(!message) return null;
    const opts = options || {};

    /* 스크립트 로드 순서상 body 준비 전 호출은 없지만, 방어적으로 DOMContentLoaded까지 지연합니다. */
    if(!document.body){
      document.addEventListener("DOMContentLoaded", () => showToast(message, opts), { once: true });
      return null;
    }

    const layer = ensureToastLayer();
    const type = normalizeType(opts.type);
    const duration = Number.isFinite(opts.duration) ? opts.duration : DEFAULT_DURATION;

    const toastEl = document.createElement("div");
    toastEl.className = "global-toast global-toast--" + type;
    toastEl.textContent = String(message);
    toastEl.setAttribute("role", type === "error" ? "alert" : "status");

    layer.appendChild(toastEl);

    requestAnimationFrame(() => {
      toastEl.classList.add("is-visible");
    });

    const removeToast = () => {
      toastEl.classList.remove("is-visible");
      window.setTimeout(() => {
        if(toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
      }, 180);
    };

    if(duration > 0){
      window.setTimeout(removeToast, duration);
    }

    return { element: toastEl, close: removeToast };
  }

  window.ToastService = {
    show: showToast
  };

  window.showToast = function(message, typeOrOptions){
    if(typeof typeOrOptions === "string"){
      return showToast(message, { type: typeOrOptions });
    }
    return showToast(message, typeOrOptions || {});
  };
})();
