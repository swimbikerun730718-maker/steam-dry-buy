import { DB, S, app } from "../state.js";
import { esc, headerImg } from "../util.js";
import { tile, priceBlock, review, buyButtons } from "./components.js";

const SECTIONS = [
  ["specials", "🏷️ 特價優惠"],
  ["top_sellers", "🔥 熱銷商品"],
  ["popular_new", "✨ 熱門新品"],
  ["most_played", "🌍 全球熱銷"],
  ["coming_soon", "⏳ 即將推出"],
];

export function flashBanner() {
  const f = S.flash;
  const a = f && app(f.id);
  if (!a || f.until < Date.now()) return "";
  return `<a class="flash-banner" href="#/app/${a.id}">
    <img src="${esc(headerImg(a))}" alt="">
    <div><div class="flash-title">⚡ 限時快閃特價 <span data-live="flash-timer"></span></div>
    <div class="flash-name">${esc(a.name)}</div>${priceBlock(a, true)}</div></a>`;
}

export function heroCarousel(idx) {
  const list = (DB.sections.top_sellers || []).map(app).filter((a) => a && a.final > 0).slice(0, 10);
  if (!list.length) return "";
  const a = list[((idx % list.length) + list.length) % list.length];
  const shots = (a.screenshots || []).slice(0, 4).map((s) => `<img loading="lazy" src="${esc(s)}" alt="">`).join("");
  return `<section class="hero">
    <h2 class="sec-title">精選推薦</h2>
    <div class="hero-wrap">
      <button class="hero-nav" data-act="hero" data-d="-1" aria-label="上一個">‹</button>
      <a class="hero-card" href="#/app/${a.id}">
        <img class="hero-main" src="${esc(headerImg(a))}" alt="">
        <div class="hero-side"><h3>${esc(a.name)}</h3>
          <div class="hero-shots">${shots}</div>
          <div class="hero-tags">${(a.genres || []).slice(0, 4).map((g) => `<span>${esc(g)}</span>`).join("")}</div>
          ${review(a)}${priceBlock(a, true)}</div>
      </a>
      <button class="hero-nav" data-act="hero" data-d="1" aria-label="下一個">›</button>
    </div>
    <div class="hero-dots">${list.map((_, i) => `<i class="${i === idx % list.length ? "on" : ""}"></i>`).join("")}</div>
  </section>`;
}

export function renderStore(ui) {
  const genres = topGenres(16);
  const secs = SECTIONS.map(([key, title]) => {
    const list = (DB.sections[key] || []).map(app).filter(Boolean).slice(0, 24);
    if (!list.length) return "";
    return `<section><div class="sec-head"><h2 class="sec-title">${title}</h2><a href="#/browse?list=${key}">瀏覽全部 ›</a></div>
      <div class="tiles">${list.map(tile).join("")}</div></section>`;
  }).join("");
  return `${flashBanner()}${heroCarousel(ui.hero)}
    <section><h2 class="sec-title">依類型瀏覽</h2><div class="chips">${genres.map((g) => `<a class="chip" href="#/browse?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join("")}</div></section>
    ${secs}`;
}

export function topGenres(n) {
  const count = {};
  for (const a of Object.values(DB.apps)) for (const g of a.genres || []) count[g] = (count[g] || 0) + 1;
  return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, n).map(([g]) => g);
}

export { buyButtons };
