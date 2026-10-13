import { S, app } from "../state.js";
import { esc, money, fmtMinutes, headerImg } from "../util.js";
import { BADGES, level, levelXp, cardPrice, job } from "../economy.js";

export function renderProfile() {
  const owned = Object.entries(S.owned);
  const lv = level();
  const prog = ((S.xp - levelXp(lv)) / (levelXp(lv + 1) - levelXp(lv))) * 100;
  const playMin = owned.reduce((s, [, o]) => s + o.play, 0);
  const unplayed = owned.filter(([, o]) => o.play === 0).length;
  const value = owned.reduce((s, [id]) => s + (app(id)?.original || 0), 0);
  const cards = Object.entries(S.cards).filter(([id]) => app(id));
  const cardTotal = cards.reduce((s, [id, n]) => s + n * cardPrice(id), 0);
  const stat = (k, v) => `<div class="stat"><b>${v}</b><small>${k}</small></div>`;
  return `<div class="profile">
    <div class="prof-head">
      <div class="avatar">${job().icon}</div>
      <div><h2>乾癮玩家</h2><div class="job-sub">${job().name} · 開始剁手於 ${new Date(owned[0]?.[1].t || Date.now()).toLocaleDateString("zh-TW")}</div></div>
      <div class="lvl"><span class="lvl-ring">${lv}</span><div class="progress"><i style="width:${prog}%"></i></div><small>${S.xp} XP</small></div>
    </div>
    <div class="stats">
      ${stat("擁有遊戲", owned.length)}${stat("累計花費", money(S.stats.spent))}${stat("收藏庫原價", money(value))}
      ${stat("折扣省下", money(S.stats.saved))}${stat("從沒玩過", `${unplayed}(${owned.length ? Math.round((unplayed / owned.length) * 100) : 0}%)`)}
      ${stat("總遊玩時間", fmtMinutes(playMin))}${stat("累計賺取", money(S.stats.earned))}${stat("退款次數", S.stats.refunds)}
    </div>
    <h3 class="sec-title">徽章 ${Object.keys(S.badges).length}/${BADGES.length}</h3>
    <div class="badges">${BADGES.map((b) => `<div class="badge ${S.badges[b.id] ? "on" : ""}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${b.name}</b><small>${b.desc}</small></div>`).join("")}</div>
    <h3 class="sec-title">庫存 · 交易卡片 ${cards.length ? `<button class="btn btn-green small" data-act="sell-all">全部賣出 ${money(cardTotal)}</button>` : ""}</h3>
    <div class="cards">${cards.map(([id, n]) => `<div class="card-item"><img src="${esc(headerImg(app(id)))}" alt=""><div>${esc(app(id).name)}</div><small>×${n} · 市價 ${money(cardPrice(id))}</small><button class="btn small" data-act="sell" data-id="${id}">賣一張</button></div>`).join("") || `<p class="empty">還沒有卡片。去收藏庫玩付費遊戲就會掉落。</p>`}</div>
    <h3 class="sec-title">錢包紀錄</h3>
    <div class="history">${S.history.slice(0, 30).map((h) => `<div><span>${new Date(h.t).toLocaleString("zh-TW", { hour12: false })}</span><span>${esc(h.text)}</span><b class="${h.amount >= 0 ? "pos" : "neg"}">${h.amount >= 0 ? "+" : ""}${money(h.amount)}</b></div>`).join("") || `<p class="empty">尚無紀錄</p>`}</div>
    <div class="danger"><button class="link" data-act="reset">⚠️ 重置存檔(所有遊戲與錢包歸零)</button></div>
  </div>`;
}
