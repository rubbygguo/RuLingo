#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

echo "英文提升学习系统"
echo "项目目录：$PROJECT_DIR"
echo ""

if ! command -v npm >/dev/null 2>&1; then
  echo "没有找到 npm。"
  echo ""
  echo "请先双击“安装Node到系统.command”安装 Node.js。"
  echo ""
  echo "安装完成后，重新双击这个脚本即可。"
  echo ""
  read "?按回车键关闭窗口..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "首次启动：正在安装 Umi/Mantine 依赖..."
  npm install
  echo ""
fi

echo "正在启动网站..."
echo "浏览器地址：http://localhost:4173/site/"
echo ""

(sleep 2 && open "http://localhost:4173/site/") >/dev/null 2>&1 &

npm run dev
