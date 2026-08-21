#!/usr/bin/env python3
"""gen_manifest.py — Regenerate wiki/raw-manifest.md from the downloaded corpus
(doc/影音/…) and the catalog.

Run from the xwcz repo root:
    python wiki/tools/gen_manifest.py

Leaf folders under doc/影音/ that contain .md episode pages are albums (series).
The manifest lists them grouped by category, with links usable by the LLM.
"""

import os
import re
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT_ROOT = os.path.join("doc", "影音")
OUT_FILE = os.path.join("wiki", "raw-manifest.md")


def list_dirs(directory):
    return sorted(
        e for e in os.listdir(directory)
        if os.path.isdir(os.path.join(directory, e))
    )


def count_markdown(directory):
    return sum(
        1 for e in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, e)) and e.endswith(".md")
    )


def find_albums(directory, acc=None):
    if acc is None:
        acc = []
    entries = os.listdir(directory)
    md_count = sum(1 for e in entries if os.path.isfile(os.path.join(directory, e)) and e.endswith(".md"))
    if md_count > 0:
        acc.append(directory)
    for child in list_dirs(directory):
        find_albums(os.path.join(directory, child), acc)
    return acc


def to_relative(dir_path):
    rel = os.path.relpath(dir_path, "doc").replace("\\", "/")
    return rel


def main():
    if not os.path.isdir(OUT_ROOT):
        print("raw corpus not found: {}. Run 'python wiki/tools/download.py' first.".format(OUT_ROOT))
        return 1

    albums = find_albums(OUT_ROOT)

    lines = [
        "---",
        "type: manifest",
        "generated: {}".format(time.strftime("%Y-%m-%d")),
        "---",
        "",
        "# 原始開示清單（xwcz）",
        "",
        "自動產生自 `doc/影音/`。共 **{}** 個系列（相簿）。".format(len(albums)),
        "",
        "> 由 `wiki/tools/gen_manifest.py` 產生，請勿手動編輯。",
        "",
    ]

    grouped = {}
    total_pages = 0
    for dir_path in albums:
        rel = to_relative(dir_path)
        parts = re.sub(r"^影音/", "", rel).split("/")
        cat = parts[0] if len(parts) > 1 else "(未分類)"
        title = parts[-1]
        sub = " / ".join(parts[1:-1])
        pages = count_markdown(dir_path)
        total_pages += pages
        grouped.setdefault(cat, []).append({"title": title, "sub": sub, "pages": pages, "rel": rel})

    for cat in sorted(grouped):
        lines.append("## {}".format(cat))
        lines.append("")
        lines.append("| 系列 | 子分類 | 集數 | 原始路徑 |")
        lines.append("|---|---|---|---|")
        for r in sorted(grouped[cat], key=lambda r: r["title"]):
            lines.append(
                "| {} | {} | {} | `{}/` |".format(
                    r["title"], r["sub"] or "—", r["pages"], r["rel"]
                )
            )
        lines.append("")

    lines.append(
        "> 共 {} 個系列、約 {} 集。由 `python wiki/tools/gen_manifest.py` 重新產生。".format(
            len(albums), total_pages
        )
    )

    with open(OUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("wrote {} ({} albums, {} episodes)".format(OUT_FILE, len(albums), total_pages))


if __name__ == "__main__":
    main()