const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", msg => console.log("[console]", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[pageerror]", err.message));

  await page.addInitScript(() => {
    const _st = window.setTimeout.bind(window);
    window.setTimeout = (fn, ms, ...args) => _st(fn, Math.min(Number(ms) || 0, 5), ...args);
  });

  await page.goto("http://localhost:8199/index.html", { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const globals = await page.evaluate(() => {
    const out = {};
    try { out.S = typeof S; } catch(e){ out.S = "ERR:"+e.message; }
    try { out.RUN_STATE = typeof RUN_STATE; } catch(e){ out.RUN_STATE = "ERR:"+e.message; }
    try { out.CARD_DB = typeof CARD_DB; } catch(e){ out.CARD_DB = "ERR:"+e.message; }
    try { out.STARTER_DECK = typeof STARTER_DECK; } catch(e){ out.STARTER_DECK = "ERR:"+e.message; }
    try { out.BASE_STARTER_DECK = typeof BASE_STARTER_DECK; } catch(e){ out.BASE_STARTER_DECK = "ERR:"+e.message; }
    try { out.MAP_FLOORS = typeof MAP_FLOORS; } catch(e){ out.MAP_FLOORS = "ERR:"+e.message; }
    try { out.MAP_STAGES = typeof MAP_STAGES; } catch(e){ out.MAP_STAGES = "ERR:"+e.message; }
    try { out.MAP_PATHS = typeof MAP_PATHS; } catch(e){ out.MAP_PATHS = "ERR:"+e.message; }
    return out;
  });
  console.log("GLOBALS2:", JSON.stringify(globals, null, 2));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
