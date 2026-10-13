import { S } from "../state.js";
import { esc, headerImg, money, nt } from "../util.js";
import { cartApps, cartTotal, price } from "../economy.js";
import { priceBlock } from "./components.js";

export function renderCart() {
  const items = cartApps();
  if (!items.length) {
    return `<div class="cart"><h2 class="sec-title">你的購物車</h2><p class="empty">購物車空空的……手好癢?<a href="#/">去逛逛</a></p></div>`;
  }
  const total = cartTotal();
  const saved = items.reduce((s, a) => s + price(a).original - price(a).final, 0);
  const short = total - S.wallet;
  return `<div class="cart"><h2 class="sec-title">你的購物車</h2>
    <div class="cart-list">${items.map((a) => `<div class="cart-item">
      <a href="#/app/${a.id}"><img src="${esc(headerImg(a))}" alt=""></a>
      <div class="cart-name"><a href="#/app/${a.id}">${esc(a.name)}</a></div>
      ${priceBlock(a)}<button class="link" data-act="cart" data-id="${a.id}">移除</button></div>`).join("")}</div>
    <div class="cart-total">
      <div><span>預估總額</span><b>${nt(total)}</b></div>
      ${saved > 0 ? `<div class="saved">為你省下 ${money(saved)}(雖然本來就不用買)</div>` : ""}
      <div class="wallet-line">錢包餘額:${money(S.wallet)}</div>
      ${short > 0 ? `<div class="warn">還差 ${money(short)} — <a href="#/work">去打工</a></div>` : ""}
      <button class="btn btn-green btn-big" data-act="checkout" ${short > 0 ? "disabled" : ""}>為自己購買</button>
      <button class="link" data-act="clear-cart">清空購物車</button>
    </div></div>`;
}
