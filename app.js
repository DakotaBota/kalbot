// KalBot Mini App controller. Each button hands one KalBot command to the bot with Telegram.WebApp.sendData;
// the bot runs it as if typed and answers in the chat (Telegram closes the app after sendData).
(() => {
  "use strict";
  const COINS = ["BTC", "ETH", "SOL", "XRP", "HYPE", "DOGE", "BNB"];          // KalBot's 15-minute coins
  const SELL = [["tennis", "🎾 Tennis"], ["crypto", "🪙 Crypto"], ["football", "🏈 Football"], ["soccer", "⚽ Soccer"],
                ["economics", "📈 Economics"], ["climate", "🌦️ Climate"], ["elections", "🗳️ Elections"],
                ["politics", "🏛️ Politics"], ["culture", "🎭 Culture"], ["commodities", "🛢️ Commodities"]];
  const CMD = /^\/[a-z]+(?: [A-Za-z0-9]+){0,2}$/;                              // same shape the bot accepts

  const tg = window.Telegram && window.Telegram.WebApp;
  const proxy = window.TelegramWebviewProxy;
  const ext = window.external;
  // The SDK alone loads in any browser; require Telegram's native bridge too (same gate as connect.js).
  const live = !!(tg && typeof tg.sendData === "function" &&
                  ((proxy && typeof proxy.postEvent === "function") || (ext && typeof ext.notify === "function")));

  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor("#0c0a08"); tg.setBackgroundColor("#000000"); } catch (_) { /* older clients */ }
  }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const haptic = (kind) => { try { tg.HapticFeedback.impactOccurred(kind); } catch (_) { /* optional */ } };

  function send(cmd) {
    if (!live || typeof cmd !== "string" || cmd.length > 64 || !CMD.test(cmd)) return false;
    haptic(cmd.startsWith("/sellall") ? "heavy" : "light");
    tg.sendData(JSON.stringify({ cmd }));
    return true;
  }

  // coin picker drives the Trade card
  let coin = "BTC";
  const seg = $("#coin-seg");
  COINS.slice(0, 5).forEach((c, i) => {                    // five fit the row; DOGE and BNB stay in the chat console
    const b = document.createElement("button");
    b.textContent = c; b.dataset.coin = c; b.setAttribute("role", "tab");
    if (i === 0) b.className = "on";
    seg.appendChild(b);
  });
  function setCoin(c) {
    coin = c;
    $$("button", seg).forEach((b) => { b.classList.toggle("on", b.dataset.coin === c); b.setAttribute("aria-selected", b.dataset.coin === c); });
    $("#trade-cta").textContent = `Trade ${c} 15-min`;
    $$("[data-coins]").forEach((b) => { b.disabled = (!live && !/[?&]preview\b/.test(location.search)) || !b.dataset.coins.split(" ").includes(c); });
  }
  seg.addEventListener("click", (e) => { const b = e.target.closest("button[data-coin]"); if (b) { haptic("light"); setCoin(b.dataset.coin); } });

  // sell-all sheet: categories + everything
  const grid = $("#sellall-grid");
  SELL.forEach(([key, label]) => {
    const b = document.createElement("button");
    b.textContent = label; b.dataset.cmd = `/sellall ${key}`;
    grid.appendChild(b);
  });
  const sheet = $("#sheet-sellall");
  const openSheet = () => { sheet.hidden = false; haptic("medium"); if (tg && tg.BackButton) tg.BackButton.show(); };
  const closeSheet = () => { sheet.hidden = true; if (tg && tg.BackButton) tg.BackButton.hide(); };
  if (tg && tg.BackButton) tg.BackButton.onClick(closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet || e.target.closest("[data-close]")) closeSheet(); });

  // tabs and section panes
  function showTab(name) {
    $$(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
    $$(".tab").forEach((t) => { t.classList.toggle("on", t.dataset.tab === name); t.setAttribute("aria-current", t.dataset.tab === name ? "page" : "false"); });
    window.scrollTo(0, 0);
  }
  $(".tabs").addEventListener("click", (e) => { const t = e.target.closest(".tab"); if (t) { haptic("light"); showTab(t.dataset.tab); } });
  $$(".seg.wide").forEach((s) => s.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-pane]"); if (!b) return;
    const view = s.closest(".view");
    $$("button", s).forEach((x) => x.classList.toggle("on", x === b));
    $$("[data-pane-body]", view).forEach((p) => { p.hidden = p.dataset.paneBody !== b.dataset.pane; });
  }));

  // every command button
  document.addEventListener("click", (e) => {
    const sheetBtn = e.target.closest("[data-sheet]");
    if (sheetBtn) { openSheet(); return; }
    const b = e.target.closest("[data-cmd], [data-cmd-template]");
    if (!b || b.disabled) return;
    const cmd = b.dataset.cmd || b.dataset.cmdTemplate.replace("{coin}", coin);
    send(cmd);
  });

  const preview = /[?&]preview\b/.test(location.search);                     // design review: full colour, still sends nothing
  if (!live) {
    $("#outside").hidden = preview;
    if (!preview) $$("[data-cmd], [data-cmd-template]").forEach((b) => { b.disabled = true; });
  }
  setCoin("BTC");
  const start = location.hash.slice(1);                                      // #sports, #bots, #account, #sellall
  if (["trade", "sports", "bots", "account"].includes(start)) showTab(start);
  if (start === "sellall") openSheet();
  window.__kalbotApp = { COINS, SELL, CMD, live, send };                      // test hook
})();
