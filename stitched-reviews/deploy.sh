#!/bin/bash

# --- CONFIGURATION ---
SERVER_IP="5.189.162.195"
PROJECT_DIR="/var/www/stitched-reviews"
PM2_NAME="stitched-reviews"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Deploying Stitched Reviews to VPS ($SERVER_IP)..."

# 1. Sync files to VPS (excludes node_modules, .next, .env)
echo "📤 Uploading files..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.env' \
  --exclude '.env.local' \
  "$LOCAL_DIR/" root@$SERVER_IP:$PROJECT_DIR/

# 2. Build and restart on server
echo "🏗️  Building and restarting on server..."
ssh root@$SERVER_IP << EOF
  cd $PROJECT_DIR || exit

  echo "📦 Installing dependencies..."
  npm install

  echo "🏗️  Building Next.js app..."
  npm run build

  echo "🔄 Restarting PM2 process..."
  pm2 restart $PM2_NAME

  echo "✅ DEPLOYMENT SUCCESSFUL! Live at https://reviews.stitchedqa.com"
EOF
