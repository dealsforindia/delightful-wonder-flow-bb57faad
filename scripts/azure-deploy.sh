#!/bin/bash
set -e

echo "Building Unlocked for Azure (Node.js server)..."

# Build with Node.js-compatible Nitro preset
NITRO_PRESET=node bun run build

# Create logs directory
mkdir -p logs

echo "Build complete. Output is in ./.output/"
echo ""
echo "Next steps on your Azure VM:"
echo "1. Copy this repo to the VM:"
echo "   rsync -avz --exclude=node_modules --exclude=.git . user@your-vm-ip:/var/www/unlocked/"
echo "2. SSH into the VM and install dependencies:"
echo "   cd /var/www/unlocked && bun install"
echo "3. Set environment variables:"
echo "   export GOOGLE_API_KEY=your_key"
echo "   export NODE_ENV=production"
echo "   export PORT=3000"
echo "4. Start with PM2:"
echo "   pm2 start ecosystem.config.cjs"
echo "5. Install Nginx and copy the config:"
echo "   sudo cp nginx.conf /etc/nginx/sites-available/unlocked"
echo "   sudo ln -s /etc/nginx/sites-available/unlocked /etc/nginx/sites-enabled/"
echo "   sudo nginx -t && sudo systemctl restart nginx"
echo ""
echo "For HTTPS, run: sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
