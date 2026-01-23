#!/bin/bash

# --- CONFIGURATION ---
SERVER_IP="5.189.162.195"
PROJECT_DIR="/var/www/portal_admin-stitchedqa"
PM2_NAME="stitchedqa-admin"

echo "🚀 Connecting to VPS ($SERVER_IP)..."

# Connect to the server using your new SSH key
ssh root@$SERVER_IP << EOF
  # 1. Go to project folder
  cd $PROJECT_DIR || exit

  # 2. Ensure we are on the main branch
  git checkout main

  # 3. Pull latest code
  echo "⬇️  Pulling latest code from GitHub..."
  git pull origin main

  # 4. Install dependencies (only if package.json changed)
  echo "📦 Installing dependencies..."
  npm install

  # 5. Rebuild the app (Crucial for Next.js)
  echo "🏗️  Building Next.js app..."
  npm run build

  # 6. Restart the server
  echo "🔄 Restarting PM2 process..."
  pm2 restart $PM2_NAME

  echo "✅ DEPLOYMENT SUCCESSFUL! Live at https://admin.stitchedqa.com"
EOF
