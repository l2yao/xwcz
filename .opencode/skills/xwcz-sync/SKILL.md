---
name: xwcz-sync
description: Sync the xwcz raw corpus (doc/影音/) from the xwcz.org public API. Use when the user asks to "sync doc", "sync the input /doc folder", "refresh sources", "update corpus", "sync from xwcz", "run the source update", or mentions fetch/download/manifest for the raw corpus.
---

# Sync xwcz raw corpus (doc/影音/)

Updates `doc/影音/` from the xwcz public API. Run from the **xwcz repo root**.

Never hand-edit anything under `doc/`; it is changed only through these tools.

## Prerequisites

- Python 3.10+ (stdlib only for the default tools; `requests` optional).
- No extra deps required for the current tools (they use `urllib` via `wiki/tools/api_client.py`). If `wiki/tools/requirements.txt` lists deps, run `pip install -r wiki/tools/requirements.txt`.

## Workflow

Run these steps in order, from `C:\Users\Long\Documents\xwcz`:

```
python wiki/tools/fetch_catalog.py   # walk categories→albums→episodes → catalog.json
python wiki/tools/download.py        # fetch missing transcripts into doc/影音/… (incremental)
python wiki/tools/gen_manifest.py    # regenerate wiki/raw-manifest.md
```

Targeted sync (fast, for one album/series):

```
python wiki/tools/download.py --only 16-058
python wiki/tools/download.py --only 15-003 --dry-run
```

Timeout notes: a full download of all 257 albums / ~1,800 episodes takes several minutes. Pass a large bash timeout and let it finish; re-running is safe because downloads are incremental (skips existing files).

## Verify

1. `wiki/raw-manifest.md` counts (albums, episodes) updated.
2. Spot-check a new `.md` first line (metadata): `題目　　（共N集｜第N集）　　日期　　檔名：NUM`.
3. `git status` under `doc/` shows only expected new files.

## Report

Tell the user what was added/updated (new album titles, episode counts). If new albums appeared, run the Ingest workflow (see AGENTS.md) on them next. Ask before committing unless the user already asked to commit and push. See `wiki/raw-manifest.md` for counts.
