export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const nt = (n) => (n <= 0 ? "免費" : "NT$ " + Math.round(n).toLocaleString("en-US"));
export const money = (n) => "NT$ " + Math.round(n).toLocaleString("en-US");
export const $ = (sel, root = document) => root.querySelector(sel);

export function headerImg(app) {
  return app.header || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${app.id}/header.jpg`;
}

export function fmtMinutes(min) {
  if (min < 60) return `${min} 分鐘`;
  return `${(min / 60).toFixed(1)} 小時`;
}

export function hash(n) {
  let x = Number(n) | 0;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  x = ((x >>> 16) ^ x) * 0x45d9f3b;
  return ((x >>> 16) ^ x) >>> 0;
}

export function toast(title, body = "", kind = "") {
  const box = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = `toast ${kind}`;
  el.innerHTML = `<b>${esc(title)}</b>${body ? `<span>${esc(body)}</span>` : ""}`;
  box.appendChild(el);
  setTimeout(() => el.classList.add("out"), 3600);
  setTimeout(() => el.remove(), 4200);
}

export function floatText(x, y, text, cls = "") {
  const el = document.createElement("div");
  el.className = `float-text ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

export const REVIEW_CLASS = { positive: "pos", mixed: "mix", negative: "neg" };
