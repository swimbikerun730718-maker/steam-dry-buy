import { S, save, app, allApps } from "./state.js";
import { toast, hash, money } from "./util.js";

export const JOBS = [
  { name: "超商大夜班", icon: "🏪", click: 8, passive: 0, cost: 0 },
  { name: "外送騎士", icon: "🛵", click: 15, passive: 30, cost: 1500 },
  { name: "QA 測試員", icon: "🐞", click: 30, passive: 80, cost: 6000 },
  { name: "後端工程師", icon: "💻", click: 60, passive: 200, cost: 20000 },
  { name: "技術主管", icon: "📊", click: 120, passive: 500, cost: 60000 },
  { name: "新創 CEO", icon: "🚀", click: 260, passive: 1300, cost: 180000 },
  { name: "科技巨頭董事長", icon: "👑", click: 600, passive: 4000, cost: 600000 },
];
export const DAILY_BONUS = 600;
export const REFUND_MINUTES = 120;
export const CARDS_PER_GAME = 4;
const OFFLINE_CAP_MIN = 8 * 60;
const FLASH_MS = 3 * 60 * 1000;

export const job = () => JOBS[S.job];
export const owns = (id) => Boolean(S.owned[id]);
export const level = () => Math.floor(Math.sqrt(S.xp / 25));
export const levelXp = (lv) => lv * lv * 25;

export function price(a) {
  const base = a.original || a.final;
  const f = S.flash;
  if (f && f.id === a.id && f.until > Date.now()) {
    const pct = Math.max(f.pct, a.discount || 0);
    return { final: Math.round(base * (1 - pct / 100)), original: base, discount: pct, flash: true };
  }
  return { final: a.final, original: base, discount: a.discount || 0, flash: false };
}

export const purchasable = (a) => a && !a.coming_soon && !owns(a.id);
export const cardPrice = (id) => 3 + (hash(id) % 28);
export const cartApps = () => S.cart.map(app).filter(Boolean);
export const cartTotal = () => cartApps().reduce((s, a) => s + price(a).final, 0);

export function addXp(n) {
  const before = level();
  S.xp += n;
  if (level() > before) toast(`等級提升!Lv ${level()}`, "你的個人檔案等級上升了", "level");
}

export function earn(amount, reason) {
  S.wallet += amount;
  S.stats.earned += amount;
  if (reason) S.history.unshift({ t: Date.now(), kind: "earn", text: reason, amount });
  trimHistory();
}

function trimHistory() {
  if (S.history.length > 60) S.history.length = 60;
}

export function toggleCart(id) {
  const i = S.cart.indexOf(id);
  if (i >= 0) S.cart.splice(i, 1);
  else S.cart.push(id);
  save();
}

export function toggleWish(id) {
  const i = S.wishlist.indexOf(id);
  if (i >= 0) S.wishlist.splice(i, 1);
  else S.wishlist.push(id);
  checkBadges();
  save();
}

/** Buy a list of app ids. Returns {ok, msg}. */
export function checkout(ids) {
  const apps = ids.map(app).filter(purchasable);
  const total = apps.reduce((s, a) => s + price(a).final, 0);
  if (!apps.length) return { ok: false, msg: "沒有可購買的遊戲" };
  if (total > S.wallet) return { ok: false, msg: `錢包餘額不足,還差 ${money(total - S.wallet)}。去打工吧!` };
  for (const a of apps) {
    const p = price(a);
    S.wallet -= p.final;
    S.owned[a.id] = { t: Date.now(), price: p.final, play: 0, ach: 0, drops: 0, lastPlayed: 0 };
    S.stats.spent += p.final;
    S.stats.saved += p.original - p.final;
    if (p.final === 0) S.stats.freeClaims++;
    if (p.discount > 0) S.stats.discountBuys++;
    if (p.flash) S.stats.flashBuys++;
    S.history.unshift({ t: Date.now(), kind: "buy", text: a.name, amount: -p.final });
    addXp(Math.max(5, Math.round(p.final / 20)));
    S.wishlist = S.wishlist.filter((w) => w !== a.id);
  }
  S.cart = S.cart.filter((c) => !apps.some((a) => a.id === c));
  trimHistory();
  checkBadges();
  save();
  return { ok: true, apps, total };
}

export function refundable(id) {
  const o = S.owned[id];
  return o && o.price > 0 && o.play < REFUND_MINUTES && Date.now() - o.t < 14 * 864e5;
}

export function refund(id) {
  if (!refundable(id)) return false;
  const o = S.owned[id];
  S.wallet += o.price;
  S.stats.spent -= o.price;
  S.stats.refunds++;
  if (S.playing === id) S.playing = null;
  S.history.unshift({ t: Date.now(), kind: "refund", text: app(id)?.name || id, amount: o.price });
  delete S.owned[id];
  checkBadges();
  save();
  return true;
}

export function work() {
  const j = job();
  const crit = Math.random() < 0.08;
  const amt = j.click * (crit ? 5 : 1);
  S.stats.clicks++;
  earn(amt);
  if (S.stats.clicks % 50 === 0) addXp(5);
  checkBadges();
  return { amt, crit };
}

export function promote() {
  const next = JOBS[S.job + 1];
  if (!next || S.wallet < next.cost) return false;
  S.wallet -= next.cost;
  S.job++;
  S.history.unshift({ t: Date.now(), kind: "job", text: `升職:${next.name}`, amount: -next.cost });
  addXp(100);
  save();
  return true;
}

export function claimDaily() {
  const today = new Date().toDateString();
  if (S.lastDaily === today) return false;
  S.lastDaily = today;
  earn(DAILY_BONUS + level() * 50, "每日登入獎勵");
  save();
  return true;
}

export function sellCards(id, n = Infinity) {
  const have = S.cards[id] || 0;
  const k = Math.min(have, n);
  if (!k) return 0;
  const amt = k * cardPrice(id);
  S.cards[id] = have - k;
  if (!S.cards[id]) delete S.cards[id];
  S.stats.cardsSold += k;
  earn(amt, `市集賣出 ${app(id)?.name || id} 卡片 ×${k}`);
  checkBadges();
  save();
  return amt;
}

function achThreshold(n) {
  return Math.round(6 * Math.pow(n, 1.35));
}

/** Advance simulated play by `minutes` (1 real second = 1 game minute). */
function advancePlay(minutes, quiet) {
  const id = S.playing;
  const o = S.owned[id];
  const a = app(id);
  if (!o || !a) {
    S.playing = null;
    return;
  }
  const achTotal = a.achievements || 0;
  for (let m = 0; m < minutes; m++) {
    o.play++;
    if (o.ach < achTotal && o.play >= achThreshold(o.ach + 1)) {
      o.ach++;
      addXp(3);
      if (!quiet) toast(`🏆 成就解鎖`, `${a.name}(${o.ach}/${achTotal})`, "ach");
    }
    if (o.price > 0 && o.drops < CARDS_PER_GAME && o.play % 25 === 0) {
      o.drops++;
      S.cards[id] = (S.cards[id] || 0) + 1;
      if (!quiet) toast(`🃏 獲得交易卡片`, `${a.name} 卡片 #${o.drops}`, "card");
    }
  }
  o.lastPlayed = Date.now();
}

export function maybeFlash() {
  if (S.flash && S.flash.until > Date.now()) return;
  const pool = allApps().filter((a) => a.final > 0 && !a.coming_soon && !owns(a.id));
  if (!pool.length) return;
  const a = pool[Math.floor(Math.random() * pool.length)];
  const pct = Math.min(95, Math.max((a.discount || 0) + 15, 40 + Math.floor(Math.random() * 46)));
  S.flash = { id: a.id, pct, until: Date.now() + FLASH_MS };
}

/** Called every second, and once at boot to settle offline progress. */
export function tick(boot = false) {
  const now = Date.now();
  const elapsedMin = Math.min(OFFLINE_CAP_MIN, Math.floor((now - S.lastTick) / 1000));
  if (elapsedMin <= 0) return null;
  S.lastTick += elapsedMin * 1000;
  const passive = (job().passive / 60) * elapsedMin;
  S.wallet += passive;
  S.stats.earned += passive;
  if (S.playing) advancePlay(elapsedMin, boot);
  maybeFlash();
  checkBadges(boot);
  if (boot && elapsedMin > 30) return { minutes: elapsedMin, passive };
  return null;
}

export const BADGES = [
  { id: "first", icon: "🛒", name: "第一次剁手", desc: "購買第一款遊戲", test: () => Object.keys(S.owned).length >= 1 },
  { id: "ten", icon: "🔟", name: "十連抽", desc: "收藏庫達 10 款", test: () => Object.keys(S.owned).length >= 10 },
  { id: "fifty", icon: "📚", name: "收藏家", desc: "收藏庫達 50 款", test: () => Object.keys(S.owned).length >= 50 },
  { id: "hundred", icon: "🏛️", name: "博物館館長", desc: "收藏庫達 100 款", test: () => Object.keys(S.owned).length >= 100 },
  { id: "hoarder", icon: "🐿️", name: "囤積症末期", desc: "擁有 10 款從沒玩過的遊戲", test: () => Object.values(S.owned).filter((o) => o.play === 0).length >= 10 },
  { id: "sale", icon: "🏷️", name: "特價獵人", desc: "購買 10 款特價遊戲", test: () => S.stats.discountBuys >= 10 },
  { id: "flash", icon: "⚡", name: "秒殺手", desc: "搶到一次限時快閃特價", test: () => S.stats.flashBuys >= 1 },
  { id: "free", icon: "🆓", name: "白嫖仔", desc: "領取 5 款免費遊戲", test: () => S.stats.freeClaims >= 5 },
  { id: "whale", icon: "🐋", name: "課長", desc: "累計花費 NT$ 20,000", test: () => S.stats.spent >= 20000 },
  { id: "megawhale", icon: "💎", name: "傳說課長", desc: "累計花費 NT$ 100,000", test: () => S.stats.spent >= 100000 },
  { id: "saver", icon: "🧮", name: "精打細算", desc: "透過折扣省下 NT$ 5,000", test: () => S.stats.saved >= 5000 },
  { id: "broke", icon: "🪫", name: "月光族", desc: "擁有 3 款以上遊戲且錢包低於 NT$ 50", test: () => S.wallet < 50 && Object.keys(S.owned).length >= 3 },
  { id: "refund", icon: "↩️", name: "反悔王", desc: "退款 3 次", test: () => S.stats.refunds >= 3 },
  { id: "grinder", icon: "⌨️", name: "社畜", desc: "打工點擊 1,000 次", test: () => S.stats.clicks >= 1000 },
  { id: "wish", icon: "🌠", name: "許願池", desc: "願望清單放 20 款", test: () => S.wishlist.length >= 20 },
  { id: "player", icon: "🎮", name: "真的有在玩", desc: "總遊玩時間達 10 小時", test: () => Object.values(S.owned).reduce((s, o) => s + o.play, 0) >= 600 },
  { id: "achiever", icon: "🏆", name: "成就獵人", desc: "解鎖 100 個遊戲成就", test: () => Object.values(S.owned).reduce((s, o) => s + o.ach, 0) >= 100 },
  { id: "trader", icon: "🃏", name: "市集商人", desc: "賣出 30 張卡片", test: () => S.stats.cardsSold >= 30 },
  { id: "ceo", icon: "👑", name: "人生勝利組", desc: "升到最高職位", test: () => S.job === JOBS.length - 1 },
];

export function checkBadges(quiet = false) {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.test()) {
      S.badges[b.id] = Date.now();
      addXp(50);
      if (!quiet) toast(`${b.icon} 徽章獲得:${b.name}`, b.desc, "badge");
    }
  }
}
