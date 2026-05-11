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
