# RuLingo

RuLingo 是个人英语学习系统。当前仓库主要通过 Codex skills 维护日常素材生成和部署流程。

## 可用 Skills

### 生成每日素材包

使用 `rulingo-daily-pack`。

适用场景：

- 生成今天的听、说、读、写练习素材包。
- 刷新或覆盖当天 `/daily-pack` 页面读取的 CloudBase 数据。
- 上传每日素材包快照到 CloudBase MySQL。

### 部署

使用 `rulingo-deploy`。

适用场景：

- 构建 RuLingo 前端应用。
- 上传 `dist/` 到腾讯云 COS。
- 刷新腾讯云 CDN 路由缓存。

## 备注

不要手工复制 skill 里的流程。需要生成素材包或部署时，直接让 Codex 使用对应 skill 执行。
