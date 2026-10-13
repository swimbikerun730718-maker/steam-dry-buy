import { DB, S, app, allApps } from "../state.js";
import { esc } from "../util.js";
import { row } from "./components.js";
import { price, owns } from "../economy.js";
import { topGenres } from "./store.js";

const LIST_NAMES = { specials: "特價優惠", top_sellers: "熱銷商品", popular_new: "熱門新品", most_played: "全球熱銷", coming_soon: "即將推出", wishlist: "我的願望清單" };
const SORTS = { rel: "相關性", price: "價格 低→高", price_d: "價格 高→低", disc: "折扣最多", name: "名稱" };

export function renderBrowse(params) {
  const q = (params.get("q") || "").trim().toLowerCase();
  const genre = params.get("genre") || "";
  const list = params.get("list") || "";
  const sort = params.get("sort") || "rel";
  const afford = params.get("afford") === "1";
  const hideOwned = params.get("hide") === "1";

  let items = list === "wishlist" ? S.wishlist.map(app).filter(Boolean)
    : list ? (DB.sections[list] || []).map(app).filter(Boolean) : allApps();
  if (q) items = items.filter((a) => a.name.toLowerCase().includes(q) || (a.developers || []).join(" ").toLowerCase().includes(q));
  if (genre) items = items.filter((a) => (a.genres || []).includes(genre));
  if (afford) items = items.filter((a) => !a.coming_soon && price(a).final <= S.wallet);
  if (hideOwned) items = items.filter((a) => !owns(a.id));
  const sorters = {
    price: (a, b) => price(a).final - price(b).final,
    price_d: (a, b) => price(b).final - price(a).final,
    disc: (a, b) => price(b).discount - price(a).discount,
    name: (a, b) => a.name.localeCompare(b.name),
  };
  if (sorters[sort]) items = [...items].sort(sorters[sort]);

  const title = q ? `搜尋「${esc(q)}」` : genre ? `類型:${esc(genre)}` : LIST_NAMES[list] || "所有遊戲";
  const link = (k, v) => {
    const p = new URLSearchParams(params);
    if (v === null) p.delete(k);
    else p.set(k, v);
    return `#/browse?${p}`;
  };
  return `<div class="browse">
    <div class="browse-main"><h2 class="sec-title">${title} <small>${items.length} 項結果</small></h2>
      <div class="sort-bar">排序:${Object.entries(SORTS).map(([k, v]) => `<a class="${k === sort ? "on" : ""}" href="${link("sort", k)}">${v}</a>`).join("")}</div>
      <div class="rows">${items.map(row).join("") || `<p class="empty">沒有符合的遊戲。</p>`}</div></div>
    <aside class="browse-side">
      <div class="side-box"><h4>篩選</h4>
        <a class="check ${afford ? "on" : ""}" href="${link("afford", afford ? null : "1")}">💰 只看我買得起的</a>
        <a class="check ${hideOwned ? "on" : ""}" href="${link("hide", hideOwned ? null : "1")}">🙈 隱藏已擁有</a></div>
      <div class="side-box"><h4>清單</h4>${Object.entries(LIST_NAMES).map(([k, v]) => `<a class="check ${k === list ? "on" : ""}" href="#/browse?list=${k}">${v}</a>`).join("")}</div>
      <div class="side-box"><h4>類型</h4>${topGenres(20).map((g) => `<a class="check ${g === genre ? "on" : ""}" href="${link("genre", g === genre ? null : g)}">${esc(g)}</a>`).join("")}</div>
    </aside></div>`;
}
