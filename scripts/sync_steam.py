#!/usr/bin/env python3
"""Sync real Steam store listings (TW region, Traditional Chinese) into data/store.json."""
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "data" / "store.json"
CC, LANG = "tw", "tchinese"
UA = {"User-Agent": "Mozilla/5.0 (steam-dry-buy sync)", "Accept-Language": "zh-TW"}
SEARCH_LISTS = {
    "top_sellers": {"filter": "topsellers"},
    "specials": {"specials": "1"},
    "popular_new": {"filter": "popularnew"},
    "most_played": {"filter": "globaltopsellers"},
}
PER_LIST = 100
MAX_DETAIL_FETCH = 260
DETAIL_DELAY = 1.6


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8")
        except Exception as e:  # rate limit / transient
            wait = 10 * (i + 1)
            print(f"  ! {e} -> retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    return None


ROW_RE = re.compile(r'<a href="[^"]*"\s+data-ds-appid="(\d+)"(.*?)</a>', re.S)


def text(pat, s, default=""):
    m = re.search(pat, s, re.S)
    return html.unescape(m.group(1)).strip() if m else default


def parse_rows(results_html):
    rows = []
    for appid, body in ROW_RE.findall(results_html):
        price_final = text(r'data-price-final="(\d+)"', body, "")
        if price_final == "":
            continue
        orig = text(r'discount_original_price">([^<]*)<', body)
        disc = text(r'data-discount="(\d+)"', body, "0")
        review_cls = text(r'search_review_summary (\w+)', body)
        review_tip = text(r'data-tooltip-html="([^"]*)"', body)
        tags = text(r'data-ds-tagids="\[([^\]]*)\]', body)
        rows.append({
            "id": int(appid),
            "name": text(r'<span class="title">(.*?)</span>', body),
            "release": re.sub(r"\s+", " ", text(r'search_released[^>]*>(.*?)</div>', body)),
            "final": int(price_final) // 100,
            "original": int(float(re.sub(r"[^\d.]", "", orig) or 0)) or int(price_final) // 100,
            "discount": int(disc),
            "review": review_cls,
            "review_text": re.sub(r"<br>.*", "", review_tip.replace("&lt;br&gt;", "<br>")) if review_tip else "",
            "review_detail": html.unescape(review_tip).split("<br>")[1] if "<br>" in html.unescape(review_tip) else "",
            "tagids": [int(t) for t in tags.split(",") if t.strip().isdigit()],
        })
    return rows


def fetch_list(params):
    out = []
    for start in range(0, PER_LIST, 50):
        q = {"infinite": "1", "count": "50", "start": str(start), "cc": CC, "l": LANG, **params}
        raw = get("https://store.steampowered.com/search/results/?" + urllib.parse.urlencode(q))
        if not raw:
            break
        out += parse_rows(json.loads(raw).get("results_html", ""))
        time.sleep(1)
    return out


def fetch_detail(appid):
    raw = get(f"https://store.steampowered.com/api/appdetails?appids={appid}&cc={CC}&l={LANG}")
    if not raw:
        return None
    node = json.loads(raw).get(str(appid)) or {}
    if not node.get("success"):
        return {}
    d = node["data"]
    return {
        "type": d.get("type"),
        "desc": html.unescape(d.get("short_description", "")),
        "header": d.get("header_image", ""),
        "capsule": d.get("capsule_imagev5") or d.get("capsule_image", ""),
        "bg": d.get("background_raw") or d.get("background", ""),
        "developers": d.get("developers", []),
        "publishers": d.get("publishers", []),
        "genres": [g["description"] for g in d.get("genres", [])],
        "categories": [c["description"] for c in d.get("categories", [])][:8],
        "screenshots": [s["path_thumbnail"] for s in d.get("screenshots", [])][:6],
        "achievements": (d.get("achievements") or {}).get("total", 0),
        "recommendations": (d.get("recommendations") or {}).get("total", 0),
        "metacritic": (d.get("metacritic") or {}).get("score"),
        "coming_soon": (d.get("release_date") or {}).get("coming_soon", False),
        "platforms": [k for k, v in (d.get("platforms") or {}).items() if v],
    }


def main():
    old = json.loads(OUT.read_text()) if OUT.exists() else {"apps": {}}
    old_apps = old.get("apps", {})
    apps, sections = {}, {}

    for key, params in SEARCH_LISTS.items():
        rows = fetch_list(params)
        print(f"{key}: {len(rows)} rows")
        sections[key] = []
        for r in rows:
            sid = str(r["id"])
            sections[key].append(r["id"])
            prev = apps.get(sid) or old_apps.get(sid, {})
            apps[sid] = {**prev, **r}

    feat = get(f"https://store.steampowered.com/api/featuredcategories?cc={CC}&l={LANG}")
    if feat:
        cs = json.loads(feat).get("coming_soon", {}).get("items", [])
        sections["coming_soon"] = []
        for it in cs:
            sid = str(it["id"])
            sections["coming_soon"].append(it["id"])
            prev = apps.get(sid) or old_apps.get(sid, {})
            apps[sid] = {**prev, "id": it["id"], "name": it["name"],
                         "final": (it.get("final_price") or 0) // 100,
                         "original": (it.get("original_price") or it.get("final_price") or 0) // 100,
                         "discount": it.get("discount_percent", 0),
                         "release": prev.get("release", "即將推出"), "review": prev.get("review", ""),
                         "tagids": prev.get("tagids", [])}

    todo = [sid for sid, a in apps.items() if "desc" not in a][:MAX_DETAIL_FETCH]
    print(f"fetching details for {len(todo)} apps")
    for i, sid in enumerate(todo, 1):
        det = fetch_detail(sid)
        if det:
            apps[sid].update(det)
        if i % 25 == 0:
            print(f"  {i}/{len(todo)}")
        time.sleep(DETAIL_DELAY)

    apps = {k: v for k, v in apps.items() if v.get("type", "game") in ("game", None) or "desc" not in v}
    sections = {k: [i for i in v if str(i) in apps] for k, v in sections.items()}
    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "region": CC,
        "sections": sections,
        "apps": apps,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {OUT} ({len(apps)} apps, {OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
