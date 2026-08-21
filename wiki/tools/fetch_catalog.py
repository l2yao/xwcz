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


def walk_category(node, path):
    """Recursively fetch a category's albums + subcategories."""
    full_path = path + [node["title"]]

    def _subcats(_):
        try:
            return category_list("video", node["id"])
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

    children = [walk_category(sub, full_path) for sub in subcats]

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


def main():
    tops = category_list("video").get("data", {}).get("rows") or []
    print("Top-level video categories: {}".format(len(tops)))

    categories = []
    for top in tops:
        sys.stdout.write("  fetching {} ... ".format(top["title"]))
        sys.stdout.flush()
        node = walk_category({"id": top["id"], "title": top["title"]}, [])
        categories.append(node)
        stats = {"albums": 0, "episodes": 0}
        count_tree(node, stats)
        sys.stdout.write("{} albums, {} episodes\n".format(stats["albums"], stats["episodes"]))

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