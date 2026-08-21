#!/usr/bin/env python3
"""bulk_ingest.py — Generate skeleton source pages for all remaining albums.

Run from repo root:
    python wiki/tools/bulk_ingest.py         # all missing
    python wiki/tools/bulk_ingest.py --dry-run
    python wiki/tools/bulk_ingest.py --only 樂在正論

Reads catalog.json + doc/影音/ transcripts, writes wiki/<類別>/<相簿>.md
for every album not yet present. Frontmatter and ## 原始資料與影音 table are
accurate; 概要/重點 are auto-extracted stubs to be refined via lint.

Incremental: skips existing wiki pages.
"""

import argparse
import json
import os
import re
import sys
import urllib.parse

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from api_client import build_numbered_asset_url  # noqa: E402

CATALOG = "catalog.json"
WIKI_ROOT = "wiki"
DOC_ROOT = os.path.join("doc", "影音")

def sanitize(name):
    return re.sub(r'[\\/:*?"<>|]+', "_", name).strip()

def read_place_from_doc(album):
    # try to parse first episode md first line for place
    doc_dir = os.path.join(DOC_ROOT, *album["path"], sanitize(album["title"]))
    try:
        files = sorted([f for f in os.listdir(doc_dir) if f.endswith(".md")])
        if not files:
            return ""
        first = open(os.path.join(doc_dir, files[0]), encoding="utf-8").readline().strip()
        # format: 題目　　（共N集｜第N集）　　日期　　地點　　檔名：NUM  -> place is 4th field if looks like place
        parts = [p for p in first.split("　　") if p]
        # parts[0]=title, [1]=episode, [2]=date, [3]=place or filename, [4]=filename
        if len(parts) >= 4:
            cand = parts[3]
            if not cand.startswith("檔名"):
                # heuristic: if cand contains no digits and not date-like, treat as place
                if not re.match(r"^\d{4}[-/]", cand):
                    return cand
    except Exception:
        pass
    return ""

def extract_summary(album):
    doc_dir = os.path.join(DOC_ROOT, *album["path"], sanitize(album["title"]))
    try:
        files = sorted([f for f in os.listdir(doc_dir) if f.endswith(".md")])
        if not files:
            return "（文稿尚未精讀，待補概要。）", []
        text = open(os.path.join(doc_dir, files[0]), encoding="utf-8").read()
        # skip first metadata line
        lines = [l for l in text.splitlines() if l.strip()]
        if len(lines) >= 2:
            body = "\n".join(lines[1:])  # after metadata
            # take first 400 chars as summary
            summary = body.strip()[:400].replace("\n", " ")
            if len(body) > 400:
                summary += "……"
            if not summary:
                summary = "（文稿尚未精讀，待補概要。）"
            # make 2-3 bullet stubs from first paragraphs
            paras = [p.strip() for p in body.split("\n\n") if p.strip()][:3]
            bullets = []
            for p in paras[:3]:
                snippet = p[:120].replace("\n"," ")
                bullets.append(snippet + ("……" if len(p) > 120 else ""))
            return summary, bullets
    except Exception:
        pass
    return "（文稿尚未精讀，待補概要。）", []

def build_page(album, category, topic, dry_run=False):
    title = album["title"]
    pages = len(album["episodes"])
    first = album["episodes"][0] if pages>0 else {}
    code = "-".join((first.get("num") or first.get("video") or first.get("audio") or "").split("-")[:2])
    date = first.get("lecture_time") or ""
    place = read_place_from_doc(album)
    raw = "doc/影音/" + "/".join(album["path"] + [sanitize(title)]) + "/"
    # media flags
    media = []
    hasTrad = any(e.get("traditional_text_download") for e in album["episodes"])
    hasAudio = any(e.get("audio_download") for e in album["episodes"])
    hasVideo = any(e.get("video_download") for e in album["episodes"])
    if hasTrad:
        media.append("CHT")
    if hasAudio:
        media.append("mp3")
    if hasVideo:
        media.append("mp4")
    if not media:
        media.append("CHT")

    summary, bullets = extract_summary(album)

    # tags: start with category/topic
    tags = [category]
    if topic:
        tags.append(topic)
    # add generic if small
    if len(tags) > 3:
        tags = tags[:3]

    # GitHub encoded raw path
    enc_raw = urllib.parse.quote(raw.rstrip("/"), safe="/")

    # per-episode table
    rows = []
    for idx, ep in enumerate(sorted(album["episodes"], key=lambda e: e.get("num") or "")):
        num = ep.get("num") or ep.get("video") or ep.get("audio") or f"ep{idx+1}"
        ep_file = urllib.parse.quote(f"{raw}{num}.md", safe="/")
        md_link = f"https://github.com/l2yao/xwcz/blob/main/{ep_file}"
        # text link
        ext = ep.get("traditional_text_extension") or "doc"
        cht_url = build_numbered_asset_url("https://v.xwcz.org/", "CHT", num, ext)
        text_cell = f"[md]({md_link})"
        if ep.get("traditional_text_download"):
            text_cell += f" · [正體{ext}]({cht_url})"
        else:
            text_cell += f" · [正體{ext}]({cht_url})"
        # media cell
        media_parts = []
        if ep.get("audio_download"):
            mp3 = build_numbered_asset_url("https://v.xwcz.org/", "mp3", num, "mp3")
            media_parts.append(f"[mp3]({mp3})")
        if ep.get("video_download"):
            mp4 = build_numbered_asset_url("https://v.xwcz.org/", "mp4", num, "mp4")
            media_parts.append(f"[mp4]({mp4})")
        # fallback: if neither flag but video/audio codes exist, still offer
        if not media_parts and ep.get("audio"):
            mp3 = build_numbered_asset_url("https://v.xwcz.org/", "mp3", ep.get("audio"), "mp3")
            media_parts.append(f"[mp3]({mp3})")
        if not media_parts and ep.get("video"):
            mp4 = build_numbered_asset_url("https://v.xwcz.org/", "mp4", ep.get("video"), "mp4")
            media_parts.append(f"[mp4]({mp4})")
        media_cell = " · ".join(media_parts) if media_parts else "—"
        rows.append(f"| {idx+1} | {num} | {text_cell} | {media_cell} |")

    topic_line = f"topic: {topic}" if topic else "topic:"
    tags_str = ", ".join(tags)

    frontmatter = f"""---
type: source
category: {category}
{topic_line}
code: {code}
title: {title}
date: {date}
place: {place}
pages: {pages}
raw: {raw}
media: [{", ".join(media)}]
tags: [{tags_str}]
created: 2026-08-21
updated: 2026-08-21
---
"""

    body = f"""# {title}（{code}）

- **檔名**：{first.get("num") or "—"}（系列前綴 `{code}`）
- **類別**：{category}{" / " + topic if topic else ""}
- **集數**：共 {pages} 集
- **日期地點**：{date or "—"}，{place or "—"}
- **原始路徑**：`{raw}`

## 概要

{summary}

> 註：此為批量生成的初稿概要，待人工精讀補充。

## 重點

"""

    if bullets:
        for b in bullets:
            num0 = first.get("num") or ""
            body += f"- {b}〔{num0}〕\n"
    else:
        body += "- （待補）\n"

    body += f"""
## 相關概念

- [[概念/師承]] [[概念/念佛]]

## 相關頁面

- [[{category}]] — 類別頁
"""

    body += f"""
## 原始資料與影音

原始資料夾：[GitHub](https://github.com/l2yao/xwcz/tree/main/{enc_raw})（逐集 `md`）

| 集數 | 檔名 | 文字 | 影音 |
|---|---|---|---|
"""
    body += "\n".join(rows) + "\n"

    content = frontmatter + "\n" + body

    # decide filename: for duplicate titles, use disambiguated name from the start
    is_dup = title in DUP_TITLES if 'DUP_TITLES' in globals() else False
    if is_dup:
        # use topic prefix if available, else id suffix
        if topic:
            out_path = os.path.join(WIKI_ROOT, sanitize(category), sanitize(f"{topic}_{title}") + ".md")
            # if that still collides (same topic+title duplicate), fall back to id
            if os.path.exists(out_path):
                # check if existing file is same album by reading frontmatter code/id? fallback to id suffix
                alt = os.path.join(WIKI_ROOT, sanitize(category), sanitize(f"{title}_{album['id']}") + ".md")
                if os.path.exists(alt):
                    return "skip", alt
                out_path = alt
        else:
            out_path = os.path.join(WIKI_ROOT, sanitize(category), sanitize(f"{title}_{album['id']}") + ".md")
            if os.path.exists(out_path):
                return "skip", out_path
    else:
        out_path = os.path.join(WIKI_ROOT, sanitize(category), sanitize(title) + ".md")
        if os.path.exists(out_path):
            return "skip", out_path

    if dry_run:
        return "dry-run", out_path
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    open(out_path, "w", encoding="utf-8").write(content)
    return "created", out_path

def collect_albums(categories):
    albums = []
    def walk(node):
        for a in node.get("albums") or []:
            yield a
        for c in node.get("children") or []:
            yield from walk(c)
    for cat in categories:
        for a in walk(cat):
            yield a

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", default=None)
    args = ap.parse_args()

    catalog = json.load(open(CATALOG, encoding="utf-8"))
    cats = catalog["categories"]
    # precompute duplicate titles for disambiguation
    from collections import Counter
    all_titles = [a["title"] for a in collect_albums(cats)]
    global DUP_TITLES
    DUP_TITLES = {t for t, c in Counter(all_titles).items() if c > 1}

    created = skipped = dry = 0
    for album in collect_albums(cats):
        cat = album["path"][0] if album["path"] else "未分類"
        topic = album["path"][1] if len(album["path"]) > 1 else ""
        if args.only and args.only not in cat and args.only not in album["title"]:
            continue
        status, path = build_page(album, cat, topic, dry_run=args.dry_run)
        if status == "created":
            created += 1
            print(f"✓ {cat} / {album['title']} -> {path}")
        elif status == "skip":
            skipped += 1
        elif status == "dry-run":
            dry += 1
    print(f"\nDone. created={created} skipped={skipped} dry={dry}")

if __name__ == "__main__":
    main()
