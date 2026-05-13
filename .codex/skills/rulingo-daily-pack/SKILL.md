---
name: rulingo-daily-pack
description: Generate RuLingo daily learning material packs as database-backed DailyPack snapshot JSON. Use when the user asks to generate today's materials, create a daily pack, refresh the daily learning pack, prepare listening/speaking/reading/writing practice, or upload/override a daily pack in CloudBase.
---

# RuLingo Daily Pack

## Overview

Generate a RuLingo daily pack through a gated workflow: read local rules and recent context, discuss the plan with the user, wait for explicit authorization, generate a `daily_pack_snapshot` JSON, then upload it to CloudBase MySQL by overriding the current day's snapshot.

The generated JSON replaces the old standalone HTML material pack. The RuLingo `/daily-pack` page should read from CloudBase, not from local fallback files.

## Workflow

Work from the repository root.

1. Check `git status --short --branch`. Do not revert unrelated changes.
2. Read the current generation rules and treat them as the source of truth:
   - `materials-system/rules/每日素材包生成规则.md`
   - `materials-system/rules/每日学习工作区设计规则.md`
   - `materials-system/rules/语音陪练指令包设计规则.md`
   - `AGENTS.md`
3. Follow the rules document to gather local context, discuss the proposed pack with the user, and wait for explicit authorization. Do not generate final JSON, search external materials, or upload until the user confirms.
4. After authorization, generate the snapshot JSON at:

```text
data/daily-packs/YYYY-MM-DD.json
```

5. Validate that the JSON follows the DailyPack snapshot structure defined in `materials-system/rules/每日素材包生成规则.md`.
6. Run `npm run build` after code changes. If only JSON changes and no code changed, build is optional but recommended before upload when practical.
7. Upload with:

```bash
npm run daily-pack:upload -- --file=data/daily-packs/YYYY-MM-DD.json
```

8. Treat every successful upload as an override of that day's current pack. Do not distinguish inserted vs updated in user-facing summaries.
9. If upload fails due to missing local config, follow "CloudBase Upload Config Bootstrap" and retry after the user provides the missing values.
10. Summarize the generated date, theme, skill sections, override upload result, and any verification performed.

## CloudBase Upload Config Bootstrap

The upload script uses `scripts/upload-daily-pack.mjs` and optional local config:

```text
scripts/cloudbase-daily-pack.local.json
```

This local config is ignored by git and may contain secrets. Never print raw secrets back to the user.

Before upload:

1. Check whether `scripts/cloudbase-daily-pack.local.json` exists.
2. If missing, create it from `scripts/cloudbase-daily-pack.local.example.json`.
3. Read the local config and identify missing required values.
4. Ask the user only for missing values.
5. Preserve existing values when writing the config.
6. Confirm secret fields as "configured", not by echoing their values.

Upload reads CloudBase base configuration from the repository `.env` first:

- `UMI_APP_CLOUDBASE_ENV_ID`
- `UMI_APP_CLOUDBASE_REGION`
- `UMI_APP_CLOUDBASE_ACCESS_KEY`

Do not ask the user to duplicate these values in `scripts/cloudbase-daily-pack.local.json` when they already exist in `.env`.

Required in local config for upload:

- `username` and `password` for the target RuLingo user. The `owner` field is CloudBase-managed, so the upload script must sign in as the target user and must not set `owner` manually.
- `tableName`, default `rulingo_daily_pack_snapshots`.

Required database table:

```text
Docs/cloudbase-mysql-daily-pack-snapshots.sql
```

If upload fails because the table does not exist, instruct the user to execute that SQL in CloudBase MySQL, then rerun the upload command.

## Override Behavior

Every generation is a regeneration of the day's current pack. Daily packs are overridden by `(owner, date_key)`.

The upload script uses:

```text
upsert(row, { onConflict: "owner,date_key" })
```

Regenerating the same day must replace the existing snapshot. Do not create duplicate records for the same owner and date. In user-facing output, say the pack was "覆盖上传" or "overridden"; do not frame the result as "inserted" vs "updated".

## Safety

- Do not upload until the user has approved the proposed pack.
- Do not commit `scripts/cloudbase-daily-pack.local.json`.
- Do not store user task answers or completion state in the snapshot JSON.
- Do not fallback to local JSON in the app page when the database has no content; the page should show an empty state.
- Do not hardcode CloudBase credentials, user ids, or production secrets into this skill or project code.
