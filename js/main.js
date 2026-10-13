import { S, DB, save, resetSave, loadStore, app } from "./state.js";
import { esc, money, nt, toast, floatText, fmtMinutes, headerImg, $ } from "./util.js";
import * as E from "./economy.js";
import { renderStore } from "./views/store.js";
import { renderBrowse } from "./views/browse.js";
import { renderApp } from "./views/app.js";
import { renderCart } from "./views/cart.js";
import { renderLibrary } from "./views/library.js";
import { renderWork } from "./views/work.js";
import { renderProfile } from "./views/profile.js";

const ui = { hero: 0, libFilter: "", slide: 0 };
const main = $("#main");

function route() {
  const [path, query = ""] = location.hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  return { page: parts[0] || "store", id: Number(parts[1]) || null, params: new URLSearchParams(query) };
}

function render(keepScroll = false) {
  const r = route();
  const y = window.scrollY;
  const views = {
    store: () => renderStore(ui),
    browse: () => renderBrowse(r.params),
    app: () => renderApp(r.id),
    cart: () => renderCart(),
    library: () => renderLibrary(r.id, ui.libFilter),
    work: () => renderWork(),
    profile: () => renderProfile(),
  };
  main.innerHTML = (views[r.page] || views.store)();
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("on", a.dataset.page === r.page));
  renderHeader();
  liveUpdate();
  if (keepScroll) window.scrollTo(0, y);
}

function renderHeader() {
  $("#wallet").textContent = money(S.wallet);
  $("#cart-count").textContent = S.cart.length;
  $("#cart-link").classList.toggle("has", S.cart.length > 0);
  const p = S.playing && app(S.playing);
  $("#now").innerHTML = p ? `<a href="#/library/${p.id}">▶ 正在玩 ${esc(p.name)}</a>` : "";
  $("#lvl").textContent = E.level();
}

function liveUpdate() {
  $("#wallet").textContent = money(S.wallet);
  const t = $('[data-live="flash-timer"]');
  if (t && S.flash) {
    const s = Math.max(0, Math.round((S.flash.until - Date.now()) / 1000));
    t.textContent = `剩 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  const r = route();
  if (r.page === "library" && S.playing) {
    const o = S.owned[S.playing];
    const a = app(S.playing);
    const sel = document.querySelector(".lib-item.on")?.getAttribute("href")?.endsWith(`/${S.playing}`);
    if (o && a && sel) {
      const set = (k, v) => { const el = $(`[data-live="${k}"]`); if (el) el.textContent = v; };
      set("play-time", fmtMinutes(o.play));
      if (a.achievements) set("ach", `${o.ach}/${a.achievements}`);
      if (o.price > 0) set("drops", `${o.drops}/${E.CARDS_PER_GAME}`);
      const bar = $('[data-live="ach-bar"]');
      if (bar && a.achievements) bar.style.width = `${(o.ach / a.achievements) * 100}%`;
      const shots = a.screenshots || [];
      const img = $('[data-live="slideshow"]');
      if (img && shots.length && Date.now() % 4000 < 1000) img.src = shots[++ui.slide % shots.length];
    }
  }
}

function modal(html) {
  const m = $("#modal");
  m.innerHTML = `<div class="modal-card">${html}</div>`;
  m.hidden = false;
}

function closeModal() {
  $("#modal").hidden = true;
}

function doCheckout(ids) {
  const total = ids.map(app).filter(E.purchasable).reduce((s, a) => s + E.price(a).final, 0);
  modal(`<div class="spinner"></div><p>正在處理你的交易……</p>`);
  setTimeout(() => {
    const res = E.checkout(ids);
    if (!res.ok) {
      modal(`<h3>交易失敗</h3><p>${esc(res.msg)}</p><div class="modal-actions"><a class="btn btn-green" href="#/work" data-act="close">去打工</a><button class="btn" data-act="close">關閉</button></div>`);
      return;
    }
    confetti();
    modal(`<h3>🎉 感謝您的購買!</h3>
      <p>${res.apps.length} 款遊戲已加入你的收藏庫,共花費 ${nt(total)}。</p>
      <div class="receipt">${res.apps.map((a) => `<div><img src="${esc(headerImg(a))}" alt=""><span>${esc(a.name)}</span></div>`).join("")}</div>
      <p class="muted">錢包剩餘 ${money(S.wallet)}。${S.wallet < 100 ? "……要不要考慮去打工?" : "還能再買!"}</p>
      <div class="modal-actions"><a class="btn btn-blue" href="#/library/${res.apps[0].id}" data-act="close">前往收藏庫</a><button class="btn" data-act="close">繼續購物</button></div>`);
    render(true);
  }, 900 + Math.random() * 600);
}

function confetti() {
  const colors = ["#66c0f4", "#a4d007", "#ffd166", "#ef476f", "#ffffff"];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.4}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 2400);
  }
}

const ACTIONS = {
  close: () => closeModal(),
  hero: (el) => { ui.hero += Number(el.dataset.d); render(true); },
  cart: (el) => { E.toggleCart(Number(el.dataset.id)); render(true); },
  wish: (el) => { E.toggleWish(Number(el.dataset.id)); render(true); },
  "buy-now": (el) => {
    const a = app(el.dataset.id);
    const p = E.price(a);
    modal(`<h3>確認購買</h3><div class="receipt"><div><img src="${esc(headerImg(a))}" alt=""><span>${esc(a.name)}</span></div></div>
      <p>價格 <b>${nt(p.final)}</b> · 錢包 ${money(S.wallet)}${p.final > S.wallet ? ` <span class="warn">(不夠)</span>` : ""}</p>
      <div class="modal-actions"><button class="btn btn-green" data-act="confirm-buy" data-id="${a.id}" ${p.final > S.wallet ? "disabled" : ""}>確認付款</button><button class="btn" data-act="close">取消</button></div>`);
  },
  "confirm-buy": (el) => doCheckout([Number(el.dataset.id)]),
  checkout: () => doCheckout([...S.cart]),
  "clear-cart": () => { S.cart = []; save(); render(); },
  play: (el) => {
    S.playing = Number(el.dataset.id);
    S.owned[S.playing].lastPlayed = Date.now();
    save();
    toast("▶ 開始遊戲", app(S.playing).name);
    render(true);
  },
  stop: () => { S.playing = null; save(); render(true); },
  refund: (el) => {
    const id = Number(el.dataset.id);
    const name = app(id).name;
    if (!confirm(`確定要退款「${name}」嗎?`)) return;
    if (E.refund(id)) toast("↩️ 退款完成", `${name} 的款項已退回錢包`);
    location.hash = "#/library";
    render();
  },
  work: (el, ev) => {
    const r = E.work();
    floatText(ev.clientX, ev.clientY, `+${r.amt}${r.crit ? " 🔥" : ""}`, r.crit ? "crit" : "");
    const c = $('[data-live="clicks"]');
    if (c) c.textContent = S.stats.clicks;
    renderHeader();
    if (S.stats.clicks % 10 === 0) save();
  },
  promote: () => { if (E.promote()) { toast(`🎉 升職成功`, E.job().name); render(true); } },
  daily: () => { if (E.claimDaily()) { toast("📅 每日獎勵", "已存入錢包"); render(true); } },
  sell: (el) => { const amt = E.sellCards(Number(el.dataset.id), 1); toast("🃏 卡片已賣出", `+${money(amt)}`); render(true); },
  "sell-all": () => {
    const amt = Object.keys(S.cards).reduce((s, id) => s + E.sellCards(Number(id)), 0);
    toast("🃏 全部賣出", `+${money(amt)}`);
    render(true);
  },
  reset: () => { if (confirm("真的要重置所有進度嗎?無法復原。")) resetSave(); },
};

document.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el || el.disabled) {
    if (ev.target.id === "modal") closeModal();
    return;
  }
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === "BUTTON") ev.preventDefault();
  fn(el, ev);
});

document.addEventListener("input", (ev) => {
  if (ev.target.dataset.input === "libfilter") {
    ui.libFilter = ev.target.value;
    const pos = ev.target.selectionStart;
    render();
    const inp = $(".lib-search");
    inp.focus();
    inp.setSelectionRange(pos, pos);
  }
});

$("#search").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const q = $("#search input").value.trim();
  location.hash = `#/browse?q=${encodeURIComponent(q)}`;
});

window.addEventListener("hashchange", () => { closeModal(); render(); window.scrollTo(0, 0); });

let ticks = 0;
function loop() {
  const prevFlash = S.flash?.id;
  const prevBadges = Object.keys(S.badges).length;
  E.tick();
  if (S.flash?.id !== prevFlash && route().page === "store") render(true);
  else if (Object.keys(S.badges).length !== prevBadges) renderHeader();
  liveUpdate();
  if (++ticks % 5 === 0) save();
}

async function boot() {
  try {
    await loadStore();
  } catch (e) {
    main.innerHTML = `<p class="empty">商店資料載入失敗:${esc(e.message)}</p>`;
    return;
  }
  const upd = new Date(DB.updated);
  $("#synced").textContent = `商店資料同步自 Steam(台灣區):${upd.toLocaleString("zh-TW", { hour12: false })}`;
  const away = E.tick(true);
  if (away) toast("👋 歡迎回來", `離開 ${fmtMinutes(away.minutes)},被動收入 +${money(away.passive)}`);
  save();
  render();
  setInterval(loop, 1000);
  window.addEventListener("beforeunload", save);
}

boot();
