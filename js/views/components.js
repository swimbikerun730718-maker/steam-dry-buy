import { esc, nt, headerImg, REVIEW_CLASS } from "../util.js";
import { price, owns } from "../economy.js";
import { S } from "../state.js";

export function priceBlock(a, big = false) {
  if (a.coming_soon) return `<div class="price-block soon">即將推出</div>`;
  const p = price(a);
  const disc = p.discount > 0
    ? `<span class="disc-pct ${p.flash ? "flash" : ""}">-${p.discount}%</span><span class="price-stack"><s>${nt(p.original)}</s><b>${nt(p.final)}</b></span>`
    : `<span class="price-stack"><b>${nt(p.final)}</b></span>`;
  return `<div class="price-block ${big ? "big" : ""}">${disc}</div>`;
}

export function ownedTag(a) {
  if (owns(a.id)) return `<span class="tag-owned">已擁有</span>`;
  if (S.cart.includes(a.id)) return `<span class="tag-cart">在購物車中</span>`;
  if (S.wishlist.includes(a.id)) return `<span class="tag-wish">願望清單</span>`;
  return "";
}

export function review(a, long = false) {
  if (!a.review_text) return `<span class="review none">尚無評論</span>`;
  const cls = REVIEW_CLASS[a.review] || "mix";
  return `<span class="review ${cls}" title="${esc(a.review_detail)}">${esc(a.review_text)}${long && a.review_detail ? `<small>${esc(a.review_detail)}</small>` : ""}</span>`;
}

export function tile(a) {
  return `<a class="tile" href="#/app/${a.id}">
    <div class="tile-img"><img loading="lazy" src="${esc(headerImg(a))}" alt="" onerror="this.style.visibility='hidden'">${ownedTag(a)}</div>
    <div class="tile-body"><div class="tile-name">${esc(a.name)}</div>${priceBlock(a)}</div>
  </a>`;
}

export function row(a) {
  const genres = (a.genres || []).slice(0, 3).map(esc).join(" · ");
  return `<a class="row" href="#/app/${a.id}">
    <img loading="lazy" src="${esc(headerImg(a))}" alt="" onerror="this.style.visibility='hidden'">
    <div class="row-main"><div class="row-name">${esc(a.name)} ${ownedTag(a)}</div>
      <div class="row-sub">${esc(a.release || "")}${genres ? " · " + genres : ""}</div>
      <div class="row-sub">${review(a)}</div></div>
    ${priceBlock(a)}
  </a>`;
}

export function buyButtons(a) {
  if (owns(a.id)) return `<a class="btn btn-blue" href="#/library/${a.id}">在收藏庫中開啟</a>`;
  if (a.coming_soon) {
    return `<button class="btn" data-act="wish" data-id="${a.id}">${S.wishlist.includes(a.id) ? "✓ 已在願望清單" : "加入願望清單"}</button>`;
  }
  const inCart = S.cart.includes(a.id);
  const p = price(a);
  return `<button class="btn btn-green" data-act="buy-now" data-id="${a.id}">${p.final === 0 ? "免費領取" : "立即購買"}</button>
    <button class="btn" data-act="cart" data-id="${a.id}">${inCart ? "✓ 在購物車中" : "加入購物車"}</button>`;
}
