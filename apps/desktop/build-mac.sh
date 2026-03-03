#!/bin/bash
set -e

echo "================================="
echo "  QualiRec Desktop - Mac Builder"
echo "================================="
echo ""

# Check we're on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "Error: This script must be run on macOS."
  exit 1
fi

# Navigate to desktop app directory
cd "$(dirname "$0")"

echo "[1/5] Installing dependencies..."
cd ../..
npm install
cd apps/desktop

echo "[2/5] Generating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma

echo "[3/5] Compiling TypeScript..."
npx tsc -p tsconfig.main.json

echo "[4/5] Building web frontend..."
cd ../web
npx vite build --outDir=../desktop/dist/web --emptyOutDir
cd ../desktop

echo "[5/5] Packaging macOS application..."
npx electron-builder --mac

echo ""
echo "================================="
echo "  Build complete!"
echo "  Output: apps/desktop/dist/"
echo "================================="
echo ""
ls -la dist/*.zip 2>/dev/null || ls -la dist/mac* 2>/dev/null || echo "Check the dist/ directory for output files."
