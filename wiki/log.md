---
type: log
updated: 2026-08-21
---

# 活動日誌

每條以 `## [YYYY-MM-DD] type|detail` 開頭。可用 `grep "^## \[" wiki/log.md` 解析。

## [2026-08-21] ingest|15-003 會聽話、聽懂話
首個相簿 ingest：樂在正論「會聽話、聽懂話」（15-003，1 集，2020-03-30 英國蘭彼得）。建立開示頁、類別頁 `樂在正論`、概念頁 `師承`/`信`/`妄想執著`，更新 `index.md`。

## [2026-08-20] schema|建立 xwcz LLM wiki 骨架
建立 `AGENTS.md`、`wiki/SCHEMA.md`、`wiki/README.md`、`wiki/index.md`、`wiki/tools/*.py`（Python：`api_client.py`/`fetch_catalog.py`/`download.py`/`gen_manifest.py`）。`sync:catalog` 13 類別、257 相簿、1833 集 → `catalog.json`；`sync:download` 全量 1830 集入库（含 637 無文稿 stubs），`sync:manifest` 245 相簿；修復 Quartz `quartz.config.yaml` 頂層 `plugins`/`layout` 縮排致 build 失敗（`filter` of undefined）。

## [2026-08-21] ingest|bulk 256 批量生成剩餘相簿
批量生成 256 相簿骨架頁（含 6 重名消歧），補齊 12 類別頁，重建 `index.md`。首頁 `會聽話、聽懂話` 保持人工精校版，其餘待 lint 精煉。
