---
name: rulingo-deploy
description: Deploy the RuLingo learning app in this repository to Tencent Cloud COS and refresh Tencent Cloud CDN route caches. Use when the user asks to deploy RuLingo, publish the current version, upload the site, refresh CDN after deployment, or troubleshoot the RuLingo deployment flow.
---

# RuLingo Deploy

## Overview

Use the repository-owned deployment command. Do not reimplement upload, CDN refresh, signing, route discovery, or config parsing inside the skill. The single source of truth is `scripts/deploy-cos.mjs`, invoked through `npm run deploy:cos`.

## Workflow

1. Work from the repository root.
2. Check `git status --short --branch` before deploying. Do not revert unrelated user changes.
3. Check and complete local deployment config before a real deployment. See "Local Config Bootstrap".
4. Run `npm run deploy:cos` for a real deployment.
5. Use `npm run deploy:cos -- --prepare-only` only to validate build/packaging without uploading.
6. Verify these milestones in the output:
   - `max build` completes successfully.
   - `data/` is copied into `dist/data/`.
   - `dist/` syncs to COS.
   - `dist/index.html` is reuploaded after sync.
   - CDN purge is submitted for route URLs.

## Local Config Bootstrap

The real deployment depends on `scripts/cos-deploy.local.json`. This file is intentionally ignored by git and may be missing on a new machine.

Before running `npm run deploy:cos`:

1. Check whether `scripts/cos-deploy.local.json` exists.
2. If it is missing, create it from `scripts/cos-deploy.local.example.json` when that example exists. If no example exists, create a JSON object with these keys:
   - `bucket`
   - `prefix`
   - `endpoint`
   - `secretId`
   - `secretKey`
   - `token`
   - `cdnDomain`
3. Read the local config and identify empty or placeholder values.
4. Ask the user for the missing values before deploying. Ask only for fields that are needed or missing.
5. Write the values into `scripts/cos-deploy.local.json`, preserving existing values.
6. Never print raw secrets back to the user. Confirm secret fields as "configured" instead.

Required values for normal upload and CDN refresh:

- `bucket`: COS bucket name, or use `target` instead if the user gives a full `cos://...` target.
- `endpoint`: COS endpoint, such as a Tencent Cloud COS regional endpoint.
- `secretId`: Tencent Cloud SecretId.
- `secretKey`: Tencent Cloud SecretKey.
- `cdnDomain`: CDN domain for route refresh.

Optional values:

- `prefix`: COS path prefix. Empty string means bucket root.
- `token`: Temporary credential token, only required for temporary credentials.
- `cdnSecretId`, `cdnSecretKey`, `cdnToken`: Use only if CDN refresh should use different credentials from COS.

## Deployment Targets

Do not hardcode production bucket names, CDN domains, credentials, or route URLs in this skill. Let `scripts/deploy-cos.mjs` and local config determine the targets, then summarize only non-secret deployment results from command output.

If routes or targets change, update the project deployment script/config first; do not encode replacement deployment behavior in this skill.

## Failure Handling

If build fails, stop and report the build error. If COS upload fails, stop and report the upload error. If CDN purge fails after COS upload succeeds, say clearly that files were uploaded but CDN refresh failed, then fix the local script/config issue when possible and rerun.

For script bugs or config issues, edit `scripts/deploy-cos.mjs` or the local config as appropriate, then rerun `npm run deploy:cos`. Do not add a second deployment path to the skill.

## Safety

`scripts/cos-deploy.local.json` is ignored by git and may contain secrets. Redact secrets in summaries. Do not commit local config, `dist/`, or `scripts/.coscli.local.yaml` unless the user explicitly asks and the repository policy changes.
