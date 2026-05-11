# 英文提升学习系统

本项目现在是一个 Vite + React 本地学习系统。学习内容保存在 `data/`，React 应用负责读取、搜索、筛选和展示。

## 运行

macOS 可以直接双击：

```text
启动英文提升系统.command
```

脚本会自动安装依赖、启动开发服务器，并打开浏览器。

如果系统还没有 Node.js，先双击：

```text
安装Node到系统.command
```

也可以手动运行：

```bash
npm install
npm run dev
```

默认访问：

```text
http://localhost:4173/site/
```

## 目录

```text
data/        学习数据：计划、素材、表达、练习、写作、复盘
site/        Vite HTML 入口
src/         React 应用源码
```

`vite.config.js` 中有一个本地数据中间件，用来让 React dev server 读取项目根目录下的 `data/`。

## 部署到腾讯云 COS

先在腾讯云 COS 中开启静态网站托管，索引文档和错误文档都建议设置为 `index.html`。

只准备可上传目录：

```bash
npm run deploy:cos -- --prepare-only
```

构建产物会生成在 `dist/`，脚本会自动把 `data/` 复制到 `dist/data/`。

安装并配置好 `coscli` 后，可以直接上传：

```bash
COS_TARGET=cos://你的-bucket-name npm run deploy:cos
```

也可以把 COS 信息预先放到本地配置文件，避免每次命令行填写。先复制示例：

```bash
cp scripts/cos-deploy.local.example.json scripts/cos-deploy.local.json
```

然后编辑 `scripts/cos-deploy.local.json`：

```json
{
  "bucket": "你的-bucket-name-1250000000",
  "prefix": "",
  "endpoint": "cos.ap-guangzhou.myqcloud.com",
  "secretId": "你的 SecretId",
  "secretKey": "你的 SecretKey",
  "token": ""
}
```

之后直接运行：

```bash
npm run deploy:cos
```

`scripts/cos-deploy.local.json` 已加入 `.gitignore`，不要提交这个文件。

脚本会自动创建一个本地 `scripts/.coscli.local.yaml` 空配置文件，并把 Key、endpoint 通过命令参数传给 `coscli`，这样不会触发 `Input Your Secret ID` 这一类交互式初始化。

如果要上传到 bucket 里的子目录：

```bash
COS_TARGET=cos://你的-bucket-name/site npm run deploy:cos
```

也可以拆成 bucket 和前缀：

```bash
COS_BUCKET=你的-bucket-name COS_PREFIX=site npm run deploy:cos
```

当前 `coscli sync` 版本不支持自动删除远端多余文件；如果传 `--delete`，脚本只会给出提示，不会执行删除。
