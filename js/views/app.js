import { app, S } from "../state.js";
import { esc, headerImg } from "../util.js";
import { priceBlock, review, buyButtons } from "./components.js";
import { owns } from "../economy.js";

export function renderApp(id) {
  const a = app(id);
  if (!a) return `<p class="empty">找不到這款遊戲(可能已經從商店同步清單中下架)。<a href="#/">回商店</a></p>`;
  const shots = (a.screenshots || []).slice(0, 5).map((s) => `<img loading="lazy" src="${esc(s)}" alt="">`).join("");
  const wished = S.wishlist.includes(a.id);
  return `<div class="app-page" style="--hero-bg:url('${esc(a.bg || "")}')">
    <div class="crumbs"><a href="#/">所有遊戲</a> › ${(a.genres || [])[0] ? `<a href="#/browse?genre=${encodeURIComponent(a.genres[0])}">${esc(a.genres[0])}</a> › ` : ""}${esc(a.name)}</div>
    <h1 class="app-title">${esc(a.name)}</h1>
    <div class="app-top">
      <div class="app-shots">${shots || `<img src="${esc(headerImg(a))}" alt="">`}</div>
      <div class="app-info">
        <img class="app-header" src="${esc(headerImg(a))}" alt="">
        <p class="app-desc">${esc(a.desc || "")}</p>
        <dl>
          <dt>所有評論:</dt><dd>${review(a, true)}</dd>
          <dt>發行日期:</dt><dd>${esc(a.release || "—")}</dd>
          <dt>開發人員:</dt><dd>${esc((a.developers || []).join(", ") || "—")}</dd>
          <dt>發行商:</dt><dd>${esc((a.publishers || []).join(", ") || "—")}</dd>
        </dl>
        <div class="hero-tags">${(a.genres || []).map((g) => `<a href="#/browse?genre=${encodeURIComponent(g)}">${esc(g)}</a>`).join("")}</div>
      </div>
    </div>
    <div class="buy-box">
      <h3>${owns(a.id) ? "你已擁有" : "購買"} ${esc(a.name)}</h3>
      <div class="buy-actions">${priceBlock(a, true)}${buyButtons(a)}</div>
    </div>
    <div class="app-meta">
      ${owns(a.id) ? "" : `<button class="btn btn-dark" data-act="wish" data-id="${a.id}">${wished ? "✓ 已在願望清單" : "♡ 加入願望清單"}</button>`}
      <a class="btn btn-dark" href="https://store.steampowered.com/app/${a.id}" target="_blank" rel="noopener">在真正的 Steam 上查看 ↗</a>
    </div>
    <div class="feature-list">
      ${a.achievements ? `<span>🏆 Steam 成就 ×${a.achievements}</span>` : ""}
      ${(a.categories || []).map((c) => `<span>${esc(c)}</span>`).join("")}
      ${(a.platforms || []).map((p) => `<span>${{ windows: "🪟 Windows", mac: "🍎 macOS", linux: "🐧 Linux" }[p] || esc(p)}</span>`).join("")}
    </div>
  </div>`;
}
