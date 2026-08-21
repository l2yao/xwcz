# xwcz

LLM Wiki for **熏聞成種 / xwcz.org**（成德法師主講）. A Python-based, reproducible clone of the xwcz.org teachings plus an LLM-maintained wiki (Karpathy "LLM Wiki" pattern, same as `amtb`).

- **Raw corpus** — `doc/影音/` (one markdown per episode), synced from the public API; read-only except via sync tools.
- **Wiki** — `wiki/` (LLM-authored interlinked markdown: categories, topics, albums, concepts, Q&A).
- **Schema** — `AGENTS.md` + `wiki/SCHEMA.md` define structure and workflows.
- **Tools** — `wiki/tools/` (Python): `fetch_catalog.py`, `download.py`, `gen_manifest.py`, `api_client.py`.

## Existing API

Base URL:

```text
https://api.xwcz.org/api/v1/
```

Every GET request currently includes:

```text
client=h5
v=2
```

Media hosts:

```text
https://v.xwcz.org/
https://v2.xwcz.org/
https://live.xwcz.org/
```

## Sync the raw corpus (LLM wiki)

The API is walked and transcripts downloaded into `doc/影音/` by Python tools in `wiki/tools/` (they share `wiki/tools/api_client.py`). Run from the repo root:

```
python wiki/tools/fetch_catalog.py   # walk categories→albums→episodes → catalog.json
python wiki/tools/download.py        # fetch missing transcripts into doc/影音/… (incremental)
python wiki/tools/gen_manifest.py    # regenerate wiki/raw-manifest.md
```

Use `--only <prefix>` to target one series (e.g. `python wiki/tools/download.py --only 16-058`) or `--dry-run` to preview. Never hand-edit anything under `doc/`.

## Wiki workflows

See `AGENTS.md` for the full schema. Typical flows:

- **Ingest** — pick an album from `wiki/raw-manifest.md`, read its `doc/` pages, write a source page in `wiki/` plus concept/category updates, then update `wiki/index.md` and `wiki/log.md`.
- **Query** — search `wiki/index.md`, synthesize an answer with citations like `〔16-058〕`, optionally file it under `wiki/問答/`.
- **Lint** — periodic health-check for contradictions, orphan pages, missing concepts, or gaps fillable by syncing.

Browse with Obsidian (open `wiki/`); start at `wiki/README.md` and `wiki/index.md`.

## Structure

```
xwcz/
  AGENTS.md             <- LLM wiki schema
  catalog.json          <- generated catalog (category→album→episode tree)
  doc/影音/<類別>/<子分類>/<相簿>/<NUM>.md
  wiki/
    SCHEMA.md           <- page templates
    README.md           <- wiki home
    index.md            <- content catalog
    log.md              <- activity log
    raw-manifest.md     <- generated album catalog
    tools/
      api_client.py
      fetch_catalog.py
      download.py
      gen_manifest.py
```
