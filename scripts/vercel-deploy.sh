#!/bin/bash
set -e

echo "Building Unlocked for Vercel..."

# Requirements: Bun must be installed locally. Vercel also supports Bun in its build environment.
# Install locally if needed: curl -fsSL https://bun.sh/install | bash

# This produces a prebuilt Vercel output in ./.vercel/output
bun run build:vercel

echo ""
echo "Vercel build complete. Output is in ./.vercel/output"
echo ""
echo "Deploy options:"
echo "A. Deploy from GitHub (recommended):"
echo "   1. Push this repo to GitHub."
echo "   2. Import the repo in Vercel dashboard."
echo "   3. In Project Settings > Environment Variables, add GOOGLE_API_KEY."
echo "   4. Vercel will auto-deploy on every push."
echo ""
echo "B. Deploy manually with Vercel CLI:"
echo "   1. Install Vercel CLI: npm i -g vercel"
echo "   2. Login: vercel login"
echo "   3. Deploy: vercel --prebuilt"
echo ""
echo "Important: keep GOOGLE_API_KEY in Vercel's Environment Variables, never in the repo."
