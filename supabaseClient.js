"use strict";

/* =========================================================================
   Supabase Client
   - Uses the public publishable key only.
   - Exposes a small project-local wrapper so other files do not depend on
     the CDN global name directly.
   ========================================================================= */
(function(){
  const SUPABASE_URL = "https://ingouxqoqhoetsgwayoc.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_Gz8XgPKaVnQnVJpkvv-jBQ_VWiPzyYg";

  let client = null;

  function initSupabase(){
    if(client) return client;

    const sdk = window.supabase;
    if(!sdk || typeof sdk.createClient !== "function"){
      console.warn("[Supabase] SDK is not loaded.");
      return null;
    }

    client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });

    return client;
  }

  function getClient(){
    return client || initSupabase();
  }

  window.VIBERUN_SUPABASE = {
    SUPABASE_URL,
    initSupabase,
    getClient
  };

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", initSupabase);
  } else {
    initSupabase();
  }
})();
