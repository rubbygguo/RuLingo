#!/bin/zsh

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
PKG_PATH="/private/tmp/english-system-node/node-v24.15.0.pkg"

echo "Node.js 系统安装"
echo ""

if [ ! -f "$PKG_PATH" ]; then
  echo "没有找到安装包，正在下载 Node.js v24.15.0..."
  mkdir -p "/private/tmp/english-system-node"
  curl -L --fail --progress-bar -o "$PKG_PATH" "https://nodejs.org/dist/v24.15.0/node-v24.15.0.pkg"
fi

echo "即将把 Node.js 安装到系统目录。"
echo "macOS 会要求输入你的登录密码；输入时不会显示字符。"
echo ""

sudo installer -pkg "$PKG_PATH" -target /

echo ""
echo "安装完成。当前版本："
/usr/local/bin/node -v
/usr/local/bin/npm -v

echo ""
echo "你现在可以双击：$PROJECT_DIR/启动英文提升系统.command"
echo ""
read "?按回车键关闭窗口..."
