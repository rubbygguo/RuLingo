---
name: rulingo-memory
description: Submit confirmed language memory items to RuLingo from Chat. Use when the user asks to record, add, save, or upload unfamiliar English words, word forms, phrases, collocations, sentence patterns, grammar points, pronunciation points, or topic expressions into RuLingo's language memory database; also use after DailyPack/practice review when the user confirms which items should be remembered.
---

# RuLingo Memory

Use this skill to turn confirmed Chat discussion into structured RuLingo language memory records and upload them to CloudBase MySQL.

Do not use this for frontend page submission. RuLingo's page reads and displays memory items; new items are created through Chat because AI is needed to structure the content.

## Workflow

1. Confirm the user is explicitly asking to record the item.
   - Direct examples: "把 X 加入语言记忆库", "记录一下 X", "把这几个表达都记一下".
   - If the user asks "哪些值得记录?", recommend items first, then upload only after they confirm.
2. Create one JSON file containing one object or `{ "items": [...] }`.
3. Include structured fields below.
4. Run `npm run memory:upload -- --file=<path>`.
5. Report the script result: `created` or `merged`, item text, and fingerprint.

Use a temporary file under `/private/tmp` or a clearly named local file that can be overwritten. Do not edit `local-ops/memory-item.example.json` for real submissions.

## Required Fields

For each item, provide:

```json
{
  "type": "phrase",
  "canonicalText": "take it for granted",
  "displayText": "take it for granted",
  "meaningZh": "认为某事理所当然",
  "explanationEn": "To fail to appreciate something because it feels normal or expected.",
  "examples": ["We often take clean water for granted."],
  "userContext": "Recorded from Chat.",
  "tags": [
    { "category": "topic", "key": "daily-life", "displayName": "日常生活" }
  ],
  "sourceKind": "chat"
}
```

Allowed `type` values:

- `word`
- `phrase`
- `sentence_pattern`
- `collocation`
- `grammar_point`
- `pronunciation`
- `topic_expression`

Use `sourceKind: "chat"` for direct Chat records.
Use `sourceKind: "daily_pack_review"` for items confirmed during DailyPack/practice review.

## Word Forms

Do not merge word forms automatically. If the user records `taken`, record `taken`, not `take`.

For word forms, add:

```json
{
  "type": "word",
  "canonicalText": "taken",
  "baseForm": "take",
  "wordForm": "past_participle"
}
```

`baseForm` is only for search and association. It does not merge review status.

## Tags

Add useful tags, but keep them restrained.

Common categories:

- `topic`: `daily-life`, `technology`, `academic`, `workplace`, `travel`, `news`
- `skill`: `listening`, `speaking`, `reading`, `writing`
- `usage`: `attitude`, `framing`, `contrast`, `cause-effect`
- `problem`: `word-form`, `preposition`, `collocation`, `tense`, `pronunciation`

The uploader automatically adds `type` and `source` tags. You do not need to duplicate them unless a user-facing display name needs improvement.

## Fingerprints and Duplicates

Usually omit `fingerprint`; the uploader generates it from `type` and normalized text.

The upload script upserts by `owner + fingerprint`:

- new fingerprint: creates a new item
- existing fingerprint: merges examples, contexts, mistake notes, tags, and `search_text`

## Upload Command

Run from the RuLingo repo root:

```bash
npm run memory:upload -- --file=/private/tmp/rulingo-memory-items.json
```

Expected success output:

```text
Memory items uploaded to rulingo_memory_items: 1
created: take it for granted (phrase:take_it_for_granted)
```

or:

```text
merged: take it for granted (phrase:take_it_for_granted)
```

## Do Not

- Do not create `pending` memory items.
- Do not upload system-suggested items until the user confirms them.
- Do not treat user mistakes as a standalone `type`; add them as `mistakeNote` or `mistakeNotes`.
- Do not use the RuLingo frontend as the creation path.
- Do not use mock data for real submissions.
