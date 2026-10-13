const KEY = "steem-dry-buy-v1";

export const defaults = () => ({
  wallet: 2000,
  owned: {},
  cart: [],
  wishlist: [],
  cards: {},
  badges: {},
  xp: 0,
  job: 0,
  lastDaily: 0,
  playing: null,
  flash: null,
  lastTick: Date.now(),
  history: [],
  stats: { spent: 0, saved: 0, refunds: 0, clicks: 0, earned: 0, freeClaims: 0, discountBuys: 0, flashBuys: 0, cardsSold: 0 },
});

export const S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = defaults();
      const saved = JSON.parse(raw);
      return { ...d, ...saved, stats: { ...d.stats, ...saved.stats } };
    }
  } catch (e) {
    console.warn("load save failed", e);
  }
  return defaults();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.warn("save failed", e);
  }
}

export function resetSave() {
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn(e);
  }
  location.hash = "#/";
  location.reload();
}

export const DB = { apps: {}, sections: {}, updated: null };

export async function loadStore() {
  const res = await fetch(`data/store.json?v=${Math.floor(Date.now() / 3.6e6)}`);
  if (!res.ok) throw new Error(`store.json HTTP ${res.status}`);
  const data = await res.json();
  for (const [id, a] of Object.entries(data.apps)) data.apps[id] = { ...a, id: Number(id) };
  Object.assign(DB, data);
}

export const app = (id) => DB.apps[String(id)];
export const allApps = () => Object.values(DB.apps);
