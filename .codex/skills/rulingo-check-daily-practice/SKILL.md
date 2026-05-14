---
name: rulingo-check-daily-practice
description: Fetch and review the current user's RuLingo daily practice pack and saved answers from CloudBase. Use when the user asks Codex to check daily practice, review today's RuLingo answers, analyze completed daily exercises, discuss checked learning items, or produce a DailyPack practice debrief from the database.
---

# RuLingo Check Daily Practice

Use this skill to fetch the user's saved DailyPack snapshot and responses from CloudBase, then discuss the practice in Chat.

This skill is for review and coaching. Do not generate or upload a new daily pack from here.

## Workflow

Work from the RuLingo repository root.

1. Read the discussion rules before analyzing:
   - `materials-system/rules/每日练习复盘规则.md`
2. Fetch the practice context:

```bash
npm run daily-practice:fetch -- --date=today
```

For another date:

```bash
npm run daily-practice:fetch -- --date=YYYY-MM-DD
```

3. Use `merged` as the primary review surface. It contains task prompts, user answers, learning item statuses, and free notes already joined back to the source pack.
4. If `snapshot` is missing, tell the user no DailyPack snapshot exists for that date and stop.
5. If `responses` is missing, tell the user the pack exists but no saved answers/checks were found yet; optionally review the task plan only if the user asks.
6. Start the review by asking 1-3 focused questions unless the user explicitly asks for a direct summary.
7. After the user responds, synthesize the review following the rules document.
8. If useful language items emerge, recommend candidates for RuLingo memory, but upload them only after explicit user confirmation and then use the `rulingo-memory` skill.

## Data Expectations

The fetch command signs in with local CloudBase user credentials from `local-ops/rulingo.local.json`, reads CloudBase base config from the root `.env`, resolves the real CloudBase user id from login state, then fetches:

- `rulingo_daily_pack_snapshots`
- `rulingo_daily_pack_responses`

Do not ask the user to copy feedback packages when this command succeeds.

Do not print secrets from `.env` or `local-ops/rulingo.local.json`.

## Review Focus

Prefer reviewing:

- Whether each answer actually addresses the original prompt.
- Missing assignment facts, misunderstood source material, or vague answers.
- Checked learning items marked unfamiliar or mastered.
- User free notes that reveal confusion, friction, or reusable phrasing.
- Next practice actions that are small enough for one session.

Do not over-grade checkbox-only tasks. Treat them as completion signals unless the user provides evidence or notes.
