#!/usr/bin/env python3
"""audit_links.py — HEAD-check every v.xwcz.org media/text URL in wiki/ and
rewrite dead links.

- Dead [mp3]/[mp4] links are replaced with a working [m3u8 播放] link when the
  episode's HLS stream responds 200; otherwise the dead part is dropped
  (cell becomes — when empty).
- Dead official doc links ([正體doc]/[簡體doc]/...) are retried on the backup
  host (v2.xwcz.org); host is swapped when that works, else the dead part is
  dropped (the GitHub md link is always kept).
- Per-page `media:` frontmatter is recomputed from surviving link types.

Run from repo root:
    python wiki/tools/audit_links.py --dry-run   # report only
    python wiki/tools/audit_links.py             # rewrite in place

Writes audit_links.json (url -> status) next to the script for inspection.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

WIKI_ROOT = "wiki"
REPORT = os.path.join(os.path.dirname(__file__), "audit_links.json")
CONCURRENCY = 16

URL_PAT = re.compile(r"https?://v2?\.xwcz\.org/[^\s)\]]+")
LINK_PAT = re.compile(r"\[([^\]]*)\]\((https?://v2?\.xwcz\.org/[^\s)\]]+)\)")
M3U8_FROM_NUM = re.compile(r"/(mp3|mp4)/(\d+)/(\d+-\d+)/([^/\s)\]]+)\.(mp3|mp4)")


def clean(url):
    return url.rstrip(")., ")


def check(url, timeout=30, retries=2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status
        except Exception as e:
            code = getattr(e, "code", None)
            # retry transient network errors, not HTTP error statuses
            if isinstance(code, int) or attempt == retries:
                return code if isinstance(code, int) else "ERR"


def m3u8_for(media_url):
    """Derive the HLS URL for an mp3/mp4 asset URL. Returns None if unparseable."""
    m = M3U8_FROM_NUM.search(media_url)
    if not m:
        return None
    _, major, majmin, num, _ = m.groups()
    host = "https://v.xwcz.org/"
    return "{}m3u8/{}/{}/{}/{}/{}.m3u8".format(host, major, majmin, num, num, num)


def v2_variant(url):
    if url.startswith("https://v.xwcz.org/"):
        return "https://v2.xwcz.org/" + url[len("https://v.xwcz.org/") :]
    return None


def collect_pages():
    pages = []
    for root, _, files in os.walk(WIKI_ROOT):
        if "tools" in root.split(os.sep):
            continue
        for f in files:
            if f.endswith(".md"):
                pages.append(os.path.join(root, f))
    return sorted(pages)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pages = collect_pages()
    url_to_pages = {}
    for p in pages:
        text = open(p, encoding="utf-8", errors="ignore").read()
        for m in URL_PAT.finditer(text):
            url_to_pages.setdefault(clean(m.group(0)), set()).add(p)

    urls = sorted(url_to_pages)
    print("unique urls: {}".format(len(urls)))

    status = {}
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = {pool.submit(check, u): u for u in urls}
        done = 0
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                status[u] = fut.result()
            except Exception:
                status[u] = "ERR"
            done += 1
            if done % 500 == 0:
                print("  checked {}/{}".format(done, len(urls)))

    # supplementary checks: m3u8 for dead mp3/mp4, v2 for dead docs
    extra = set()
    for u, st in status.items():
        if st != 200:
            if "/mp3/" in u or "/mp4/" in u:
                h = m3u8_for(u)
                if h and h not in status:
                    extra.add(h)
            elif "/CHT/" in u or "/CHS/" in u:
                v2 = v2_variant(u)
                if v2 and v2 not in status:
                    extra.add(v2)
    print("supplementary urls: {}".format(len(extra)))
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = {pool.submit(check, u): u for u in sorted(extra)}
        for fut in as_completed(futures):
            u = futures[fut]
            try:
                status[u] = fut.result()
            except Exception:
                status[u] = "ERR"

    with open(REPORT, "w", encoding="utf-8") as f:
        json.dump(
            {u: status[u] for u in sorted(status)},
            f,
            ensure_ascii=False,
            indent=1,
        )
    print("wrote {}".format(REPORT))

    from collections import Counter

    def kind(u):
        for k in ("mp3", "mp4", "m3u8", "CHT", "CHS"):
            if "/{}/".format(k) in u:
                return k
        return "other"

    by_kind = {}
    for u, st in status.items():
        by_kind.setdefault(kind(u), Counter())[st if isinstance(st, int) else st] += 1
    for k in sorted(by_kind):
        print("  {}: {}".format(k, dict(by_kind[k])))

    if args.dry_run:
        print("dry run — no files rewritten")
        return

    rewritten = 0
    for p in pages:
        text = open(p, encoding="utf-8").read()

        def fix_link(m):
            label, url = m.group(1), clean(m.group(2))
            st = status.get(url, "ERR")
            if st == 200:
                return m.group(0)
            if "/mp3/" in url or "/mp4/" in url:
                h = m3u8_for(url)
                if h and status.get(h) == 200:
                    return "[m3u8 播放]({})".format(h)
                return ""  # drop dead part
            if "/CHT/" in url or "/CHS/" in url:
                v2 = v2_variant(url)
                if v2 and status.get(v2) == 200:
                    return "[{}]({})".format(label, v2)
                return ""  # drop dead part, keep md link
            return m.group(0)

        new = LINK_PAT.sub(fix_link, text)
        # tidy cells left with dangling separators: " · " fragments
        new = re.sub(r"\| ([^|\n]*?) ·  \|", r"| \1 |", new)
        new = re.sub(r"\|  · ([^|\n]*?) \|", r"| \1 |", new)
        new = re.sub(r"\| ([^|\n]*?) ·  \|", r"| \1 |", new)
        # empty cells → —
        new = re.sub(r"\| (\s*) \|", r"| — |", new) if False else new
        # recompute media: frontmatter from surviving link types
        def media_types(t):
            types = []
            if re.search(r"\[正體\w+\]\(https?://", t):
                types.append("CHT")
            if re.search(r"\[簡體\w+\]\(https?://", t):
                types.append("CHS")
            if "[mp3](" in t:
                types.append("mp3")
            if "[mp4](" in t:
                types.append("mp4")
            if "m3u8 播放](" in t:
                types.append("m3u8")
            return types

        def fix_fm(m):
            mt = media_types(new)
            return "media: [{}]".format(", ".join(mt)) if mt else "media: []"

        new = re.sub(r"^media: \[.*\]$", fix_fm, new, flags=re.M)
        if new != text:
            open(p, "w", encoding="utf-8").write(new)
            rewritten += 1
    print("rewrote {} pages".format(rewritten))


if __name__ == "__main__":
    main()
