import { S, app } from "../state.js";
import { esc, headerImg, fmtMinutes, money } from "../util.js";
import { refundable, CARDS_PER_GAME, REFUND_MINUTES } from "../economy.js";

export function renderLibrary(selId, filter = "") {
  const ids = Object.keys(S.owned).map(Number).filter((id) => app(id));
  if (!ids.length) {
    return `<div class="library empty-lib"><h2>收藏庫是空的</h2><p>一款遊戲都沒有,這怎麼行?</p><a class="btn btn-green" href="#/">前往商店</a></div>`;
  }
  ids.sort((a, b) => (S.owned[b].lastPlayed || S.owned[b].t) - (S.owned[a].lastPlayed || S.owned[a].t));
  const shown = filter ? ids.filter((id) => app(id).name.toLowerCase().includes(filter.toLowerCase())) : ids;
  const sel = S.owned[selId] ? selId : S.playing || ids[0];
  const unplayed = ids.filter((id) => S.owned[id].play === 0).length;
  return `<div class="library">
    <aside class="lib-list">
      <input class="lib-search" data-input="libfilter" placeholder="搜尋收藏庫" value="${esc(filter)}">
      <div class="lib-count">全部(${ids.length})· 從沒玩過 ${unplayed} 款</div>
      ${shown.map((id) => `<a class="lib-item ${id === sel ? "on" : ""} ${S.playing === id ? "playing" : ""}" href="#/library/${id}">
        <img src="${esc(app(id).capsule || headerImg(app(id)))}" alt="" onerror="this.style.visibility='hidden'"><span>${esc(app(id).name)}</span></a>`).join("")}
    </aside>
    <section class="lib-detail">${detail(sel)}</section></div>`;
}

function detail(id) {
  const a = app(id);
  const o = S.owned[id];
  const playing = S.playing === id;
  const achTotal = a.achievements || 0;
  const shots = a.screenshots || [];
  return `<div class="lib-hero" style="background-image:url('${esc(a.bg || headerImg(a))}')">
      <img src="${esc(headerImg(a))}" alt="">
      ${playing && shots.length ? `<div class="now-playing"><img data-live="slideshow" src="${esc(shots[0])}" alt=""><span>▶ 遊戲中…</span></div>` : ""}
    </div>
    <div class="lib-bar">
      ${playing ? `<button class="btn btn-stop" data-act="stop">■ 停止</button>` : `<button class="btn btn-play" data-act="play" data-id="${id}">▶ 開始遊戲</button>`}
      <div class="lib-stat"><small>遊玩時間</small><b data-live="play-time">${fmtMinutes(o.play)}</b></div>
      <div class="lib-stat"><small>成就</small><b data-live="ach">${achTotal ? `${o.ach}/${achTotal}` : "無"}</b></div>
      <div class="lib-stat"><small>卡片掉落</small><b data-live="drops">${o.price > 0 ? `${o.drops}/${CARDS_PER_GAME}` : "免費遊戲無卡片"}</b></div>
      <div class="lib-stat"><small>購買價格</small><b>${money(o.price)}</b></div>
    </div>
    ${achTotal ? `<div class="progress"><i data-live="ach-bar" style="width:${(o.ach / achTotal) * 100}%"></i></div>` : ""}
    <p class="hint">💡 遊戲中每 1 秒 = 遊戲內 1 分鐘。玩越久解鎖越多成就,付費遊戲每 25 分鐘掉一張可以賣錢的交易卡片。</p>
    <div class="lib-actions">
      <a class="btn btn-dark" href="#/app/${id}">商店頁面</a>
      ${refundable(id) ? `<button class="btn btn-dark" data-act="refund" data-id="${id}">申請退款(遊玩未滿 ${REFUND_MINUTES / 60} 小時)</button>` : ""}
      ${S.cards[id] ? `<a class="btn btn-dark" href="#/profile">去市集賣卡片(${S.cards[id]} 張)</a>` : ""}
    </div>`;
}
