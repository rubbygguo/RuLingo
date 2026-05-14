# RuLingo

RuLingo 是个人英语学习系统。当前仓库通过 Codex skills 维护每日学习素材、练习复盘、语言记忆入库和部署流程。

## 可用 Skills

> 使用原则：不要手工复制 skill 里的流程。需要执行某类固定工作时，直接让 Codex 使用对应 skill。

### `rulingo-daily-pack`：生成每日素材包

使用 `rulingo-daily-pack`。

适用场景：

- 生成今天或指定日期的听、说、读、写练习素材包。
- 刷新或覆盖当天 `/daily-pack` 页面读取的 CloudBase DailyPack 快照。
- 将生成的 `daily-pack-snapshot.json` 上传到 CloudBase MySQL。

常用说法：

- “生成今天的每日素材包”
- “刷新今天的 daily pack”
- “为 2026-05-14 准备听说读写练习”
- “覆盖上传今天的 DailyPack”

关键流程：

1. Codex 会先检查 `git status`，并读取素材包生成规则。
2. Codex 会根据本地规则和上下文提出素材包计划。
3. 必须等用户明确确认后，才会生成最终 JSON、查找外部材料或上传。
4. 生成文件位置：

```text
materials-system/daily-packs/YYYY-MM-DD/daily-pack-snapshot.json
```

5. 上传命令：

```bash
npm run daily-pack:upload -- --file=materials-system/daily-packs/YYYY-MM-DD/daily-pack-snapshot.json
```

注意事项：

- 上传前必须完成来源审计和 CloudBase 连通性预检。
- 每次成功上传都视为覆盖当天当前素材包。
- 不要把用户练习答案或完成状态写入 DailyPack 快照。
- 不要把 CloudBase 密钥、用户凭证或本地配置提交到仓库。

### `rulingo-check-daily-practice`：复盘每日练习

使用 `rulingo-check-daily-practice`。

适用场景：

- 拉取并复盘当前用户今天的 DailyPack 和已保存答案。
- 分析某天完成的每日练习。
- 讨论已勾选的学习项、自由笔记、错误理解和下一步练习。
- 从练习复盘中推荐值得加入语言记忆库的表达。

常用说法：

- “检查今天的每日练习”
- “复盘一下我今天的 DailyPack 答案”
- “分析 2026-05-14 的练习完成情况”
- “看看哪些表达值得记入语言记忆库”

关键流程：

1. Codex 会先读取每日练习复盘规则。
2. 默认拉取今天数据：

```bash
npm run daily-practice:fetch -- --date=today
```

3. 指定日期：

```bash
npm run daily-practice:fetch -- --date=YYYY-MM-DD
```

4. Codex 会优先基于 fetch 结果里的 `merged` 数据复盘，因为它已经合并了题目、用户答案、学习项状态和自由笔记。
5. 如果缺少 DailyPack 快照，Codex 会说明当天没有素材包。
6. 如果有素材包但没有已保存答案，Codex 会说明还没有保存的练习记录。

注意事项：

- 这个 skill 只用于复盘和辅导，不生成或上传新的 DailyPack。
- Codex 通常会先问 1-3 个聚焦问题，再给复盘；除非用户明确要求直接总结。
- 复盘中发现的语言记忆候选项，只有在用户明确确认后，才会交给 `rulingo-memory` 上传。

### `rulingo-memory`：记录语言记忆

使用 `rulingo-memory`。

适用场景：

- 把聊天中确认的生词、词形、短语、搭配、句型、语法点、发音点或话题表达加入 RuLingo 语言记忆库。
- 在 DailyPack 或练习复盘后，把用户确认的表达入库。
- 合并已有记忆项的新例句、上下文、错误备注或标签。

常用说法：

- “把 take it for granted 加入语言记忆库”
- “记录一下这个表达”
- “把这几个搭配都记一下”
- “刚才复盘里提到的 3 个表达确认入库”

关键流程：

1. Codex 会先确认用户是否明确要求记录。
2. 如果用户只是问“哪些值得记录”，Codex 只会先推荐候选项。
3. 用户确认后，Codex 会生成结构化 JSON 文件。
4. 上传命令：

```bash
npm run memory:upload -- --file=/private/tmp/rulingo-memory-items.json
```

支持的类型：

- `word`
- `phrase`
- `sentence_pattern`
- `collocation`
- `grammar_point`
- `pronunciation`
- `topic_expression`

注意事项：

- 不要自动合并词形。例如用户记录 `taken` 时，应记录 `taken`，并可用 `baseForm: "take"` 建立关联。
- 不要上传系统建议项，除非用户明确确认。
- 不要把用户错误当成单独类型；应写入 `mistakeNote` 或 `mistakeNotes`。
- 不要通过 RuLingo 前端创建真实记忆项，真实提交路径是 Chat + uploader。
- 上传脚本会按 `owner + fingerprint` 做 upsert：新项会创建，已有项会合并。

### `rulingo-deploy`：部署 RuLingo

使用 `rulingo-deploy`。

适用场景：

- 构建 RuLingo 前端应用。
- 上传 `dist/` 到腾讯云 COS。
- 刷新腾讯云 CDN 路由缓存。
- 排查部署脚本、COS 上传或 CDN 刷新问题。

常用说法：

- “部署 RuLingo”
- “发布当前版本”
- “上传站点到 COS”
- “刷新 CDN”
- “先跑一次 prepare-only 检查部署包”

关键流程：

1. Codex 会先检查 `git status`。
2. Codex 会检查本地部署配置 `scripts/cos-deploy.local.json`。
3. 真实部署命令：

```bash
npm run deploy:cos
```

4. 只验证构建和打包，不上传：

```bash
npm run deploy:cos -- --prepare-only
```

5. 部署输出需要确认这些节点：
   - `max build` 成功。
   - Umi 应用构建到 `dist/`。
   - `dist/` 同步到 COS。
   - `dist/index.html` 在同步后重新上传。
   - CDN 路由刷新请求已提交。

注意事项：

- 部署实现的单一来源是 `scripts/deploy-cos.mjs`，不要临时重写上传、签名、路由发现或 CDN 刷新逻辑。
- 不要在 skill、README 或项目代码中硬编码生产 bucket、CDN 域名、密钥或路由。
- `scripts/cos-deploy.local.json` 会被 git 忽略，可能包含密钥；不要提交。
- 如果 COS 上传成功但 CDN 刷新失败，需要明确说明“文件已上传，但 CDN 刷新失败”。

## Skill 组合用法

### 生成并上线今天的学习内容

1. 使用 `rulingo-daily-pack` 生成并覆盖上传当天 DailyPack。
2. 如涉及前端代码变化，运行 `npm run build`。
3. 使用 `rulingo-deploy` 发布当前站点并刷新 CDN。

### 复盘练习并沉淀记忆

1. 使用 `rulingo-check-daily-practice` 拉取并复盘当天或指定日期练习。
2. Codex 推荐值得沉淀的语言项。
3. 用户明确确认后，使用 `rulingo-memory` 上传到语言记忆库。

### 只检查、不修改线上数据

- 复盘练习：使用 `rulingo-check-daily-practice`。
- 部署预检：使用 `rulingo-deploy` 的 `--prepare-only`。
- 生成素材包计划但不上传：使用 `rulingo-daily-pack`，但在确认前停留在讨论阶段。

## 备注

- 所有涉及 CloudBase、COS、CDN 的本地配置都可能包含密钥，不要打印或提交。
- Codex 遇到无关的本地改动时，不应回滚；只处理当前任务需要的文件。
- 前端 UI 变更需要遵守 `AGENTS.md` 的响应式要求，并在结束前运行 `npm run build`。
