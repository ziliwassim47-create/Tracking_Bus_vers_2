#!/bin/bash

# Frontend Deployment Script
# Usage: ./deploy.sh

echo "🚀 Starting frontend deployment..."

# Navigate to frontend directory
cd "$(dirname "$0")"

# Pull latest changes (if using git)
# git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🔨 Building for production..."
npm run build

# Check if build was successful
if [ -d "build" ]; then
    echo "✅ Build successful!"
    echo "📁 Build folder created at: $(pwd)/build"
    echo ""
    echo "Next steps:"
    echo "1. If using Nginx: Copy build folder contents to nginx root"
    echo "2. If using PM2: Run 'pm2 start ecosystem-frontend.config.js'"
    echo "3. Make sure to update API URLs in LeafletRoutingMachine.js before building"
else
    echo "❌ Build failed! Check the errors above."
    exit 1
fi

