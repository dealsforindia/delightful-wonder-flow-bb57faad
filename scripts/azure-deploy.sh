#!/bin/bash
set -e

echo "Building Unlocked for Azure VM (Node.js server)..."

# Requirements: Node.js 20+ and Bun must be installed.
# Run on your VM:
#   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
#   sudo apt install -y nodejs
#   curl -fsSL https://bun.sh/install | bash
#   export PATH="$HOME/.bun/bin:$PATH"

# Build the app. TanStack Start outputs the production server to ./dist/server/index.mjs.
NITRO_PRESET=node bun run build

# Create logs directory for PM2
mkdir -p logs

echo "Build complete. Server entry: ./dist/server/index.mjs"
echo ""
echo "Next steps on your Azure VM:"
echo "1. Copy this repo to the VM:"
echo "   rsync -avz --exclude=node_modules --exclude=.git --exclude=dist . user@your-vm-ip:/var/www/unlocked/"
echo "2. SSH into the VM and install dependencies:"
echo "   cd /var/www/unlocked && bun install"
echo "3. Create .env and set your environment variables:"
echo "   cp .env.example .env"
echo "   nano .env"
echo "4. Start with PM2:"
echo "   pm2 start ecosystem.config.cjs"
echo "   pm2 save"
echo "   pm2 startup   # run the printed sudo command"
echo "5. Install Nginx and copy the config:"
echo "   sudo cp nginx.conf /etc/nginx/sites-available/unlocked"
echo "   sudo ln -sf /etc/nginx/sites-available/unlocked /etc/nginx/sites-enabled/"
echo "   sudo rm -f /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo ""
echo "For HTTPS, run: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"

