---
type: log
updated: 2026-08-20
---

# 活動日誌

每條以 `## [YYYY-MM-DD] type|detail` 開頭。可用 `grep "^## \[" wiki/log.md` 解析。

## [2026-08-20] schema|建立 xwcz LLM wiki 骨架
建立 `AGENTS.md`、`wiki/SCHEMA.md`、`wiki/README.md`、`wiki/index.md`、`wiki/tools/fetch_catalog.mjs`、`download.mjs`、`gen_manifest.mjs`，並在 `package.json` 新增 `sync:catalog` / `sync:download` / `sync:manifest`。首次 `sync:catalog` 成功（12 類別、257 相簿、1,833 集 → `catalog.json`）；`sync:download --only 15-003` 成功取回《會聽話、聽懂話》文稿。