#!/usr/bin/env python3
"""fetch_catalog.py — Walk the xwcz API (categories → subcategories → albums → episodes)
and dump the whole catalog to catalog.json at CWD.

Run from the xwcz repo root:
    python wiki/tools/fetch_catalog.py

The catalog is the raw ground-truth the other sync tools consume:
    catalog.categories[]: title, id, albums[] (own), children[] (recursive)
    album: id, title, total, path (breadcrumb of category/subcategory titles), episodes[]
    episode: id, title, num, video, audio, author, lecture_time, media flags...

No external dependencies (uses only the stdlib + wiki/tools/api_client.py).
"""

import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from api_client import album_list, category_list, video_list  # noqa: E402

CONCURRENCY = 6
RETRIES = 3


def sleep(ms):
    time.sleep(ms / 1000.0)


def paged(fn):
    """Collect all pages for a paginated endpoint (fn(page) -> payload.data)."""
    rows = []
    first = fn(1)
    rows.extend(first.get("data", {}).get("rows") or [])
    pages = first.get("data", {}).get("pages") or 1
    for p in range(2, pages + 1):
        more = fn(p)
        rows.extend(more.get("data", {}).get("rows") or [])
        sleep(50)
    return rows


def fetch_album_episodes(album):
    for attempt in range(1, RETRIES + 1):
        try:
            res = video_list(album["id"])
            return res.get("data", {}).get("rows") or []
        except Exception as err:
            if attempt == RETRIES:
                msg = str(err).strip()
                print(
                    "  !! videoList {} ({}): {}".format(album["id"], album["title"], msg)
                )
                return []
            sleep(400 * attempt)
    return []


def walk_category(node, path, model="video"):
    """Recursively fetch a category's albums + subcategories."""
    full_path = path + [node["title"]]

    def _subcats(_):
        try:
            return category_list(model, node["id"])
        except Exception:
            return {"data": {"rows": []}}

    sub_res = _subcats(1)
    album_rows = paged(lambda p: album_list(node["id"], page=p))

    subcats = [
        {"id": s["id"], "title": s["title"]}
        for s in (sub_res.get("data", {}).get("rows") or [])
    ]
    albums = [
        {"id": a["id"], "title": a["title"], "total": a.get("total", 0), "path": full_path}
        for a in album_rows
    ]

    results = []
    done = 0
    with ThreadPoolExecutor(max_workers=min(CONCURRENCY, len(albums) or 1)) as pool:
        futures = {pool.submit(fetch_album_episodes, alb): alb for alb in albums}
        for fut in as_completed(futures):
            alb = futures[fut]
            results.append({**alb, "episodes": fut.result()})
            done += 1
            sleep(40)

    children = [walk_category(sub, full_path, model) for sub in subcats]

    return {
        "id": node["id"],
        "title": node["title"],
        "path": full_path,
        "albums": results,
        "children": children,
    }


def count_tree(node, stats):
    for a in node["albums"]:
        stats["albums"] += 1
        stats["episodes"] += len(a["episodes"])
    for c in node["children"]:
        count_tree(c, stats)


def collect_ids(categories):
    ids = set()

    def walk(n):
        for a in n.get("albums", []):
            ids.add(a["id"])
        for c in n.get("children", []):
            walk(c)

    for cat in categories:
        walk(cat)
    return ids


def probe_album(aid):
    """Return (aid, title, n_eps) if album aid exists, else None."""
    try:
        res = video_list(aid)
        rows = (res.get("data", {}) or {}).get("rows") or []
        alb = (res.get("data", {}) or {}).get("album") or {}
        if rows or alb.get("id"):
            return (aid, alb.get("title") or "", len(rows))
    except Exception:
        pass
    return None


def discover_orphans(known_ids, hi=None, margin=30):
    """Probe album IDs for albums not reachable via category traversal.

    hi defaults to max(known)+margin. Returns {aid: (title, n_eps)}.
    """
    top = (max(known_ids) if known_ids else 0) if hi is None else hi
    lo = 1
    found = {}
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = {pool.submit(probe_album, aid): aid for aid in range(lo, top + margin + 1)}
        for fut in as_completed(futures):
            r = fut.result()
            if r and r[0] not in known_ids:
                found[r[0]] = (r[1], r[2])
            sleep(5)
    return found


def main():
    tops = category_list("video").get("data", {}).get("rows") or []
    print("Top-level video categories: {}".format(len(tops)))

    categories = []
    for top in tops:
        sys.stdout.write("  fetching {} ... ".format(top["title"]))
        sys.stdout.flush()
        node = walk_category({"id": top["id"], "title": top["title"]}, [], "video")
        categories.append(node)
        stats = {"albums": 0, "episodes": 0}
        count_tree(node, stats)
        sys.stdout.write("{} albums, {} episodes\n".format(stats["albums"], stats["episodes"]))

    # news model (視頻更新): video albums surfaced as news, not under video cats
    try:
        news_tops = category_list("news").get("data", {}).get("rows") or []
    except Exception:
        news_tops = []
    for top in news_tops:
        sys.stdout.write("  fetching news:{} ... ".format(top["title"]))
        sys.stdout.flush()
        node = walk_category({"id": top["id"], "title": top["title"]}, [], "news")
        # skip albums already filed under video categories (e.g. aid 287)
        known = collect_ids(categories)
        node["albums"] = [a for a in node["albums"] if a["id"] not in known]
        for ch in node.get("children", []):
            ch["albums"] = [a for a in ch.get("albums", []) if a["id"] not in known]
        categories.append(node)
        stats = {"albums": 0, "episodes": 0}
        count_tree(node, stats)
        sys.stdout.write("{} albums, {} episodes\n".format(stats["albums"], stats["episodes"]))

    # orphan discovery: albums reachable via video/list but attached to no category
    # (e.g. aid 305 再談弟子規 while category 66 lists 0 albums).
    known = collect_ids(categories)
    title_to_cat = {c["title"]: c for c in categories}
    orphans = discover_orphans(known)
    print("  orphan albums (no category link): {}".format(len(orphans)))
    unfiled = {"id": 0, "title": "未分類", "path": ["未分類"], "albums": [], "children": []}
    attached = 0
    # fetch episodes for orphans
    orphan_albums = [
        {"id": aid, "title": title or "aid-{}".format(aid), "total": n, "path": ["未分類"]}
        for aid, (title, n) in sorted(orphans.items())
    ]
    with ThreadPoolExecutor(max_workers=min(CONCURRENCY, len(orphan_albums) or 1)) as pool:
        futures = {pool.submit(fetch_album_episodes, alb): alb for alb in orphan_albums}
        for fut in as_completed(futures):
            alb = futures[fut]
            alb = {**alb, "episodes": fut.result()}
            # exact title match → file under that category (e.g. 305→66 再談弟子規)
            target = title_to_cat.get(alb["title"])
            if target is not None:
                alb = {**alb, "path": [target["title"]]}
                target["albums"].append(alb)
                attached += 1
                print("    attached aid {} {!r} → {}".format(alb["id"], alb["title"], target["title"]))
            else:
                unfiled["albums"].append(alb)
            sleep(20)
    if unfiled["albums"]:
        categories.append(unfiled)
        print("  filed {} orphans under 未分類".format(len(unfiled["albums"])))
    print("  title-matched orphans attached: {}".format(attached))

    stats = {"categories": len(categories), "albums": 0, "episodes": 0}
    for c in categories:
        count_tree(c, stats)

    catalog = {
        "source": "https://api.xwcz.org/api/v1/",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "categories": categories,
        "stats": stats,
    }

    with open("catalog.json", "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)

    print("\nWrote catalog.json")
    print("Categories: {}".format(stats["categories"]))
    print("Albums: {}".format(stats["albums"]))
    print("Episodes: {}".format(stats["episodes"]))


if __name__ == "__main__":
    main()