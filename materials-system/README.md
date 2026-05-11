# Materials System

这个目录集中管理和素材相关的内容。

## 目录说明

```text
materials-system/
  rules/        素材来源、筛选、每日生成和调整规则
  daily-packs/  每天临时生成的学习素材包，本地使用，不同步到 Git
```

项目代码里不再沉淀长期素材库。每天学习完成后，有价值的内容会在对话中总结，后续上传到系统后台数据库。这个上传和后台数据流程会单独设计。

## 每日素材包路径

每日生成的素材包统一放在日期子文件夹中：

```text
materials-system/daily-packs/YYYY-MM-DD/今日素材包_主题.md
```

例如：

```text
materials-system/daily-packs/2026-05-11/今日素材包_听说读写.md
```

## Git 同步规则

`materials-system/daily-packs/` 已加入 `.gitignore`，用于避免每天生成的大量素材包进入版本控制。

生成规则可以进入 Git，因为它们是系统设计的一部分。每日素材包和长期学习内容不进入 Git。
