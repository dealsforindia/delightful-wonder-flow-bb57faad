# Deploy Unlocked

This project can be hosted on **Lovable** (one-click publish), **Vercel**, or your own **Azure VM / Node server**.

## Lovable (fastest)

Click **Publish** in the Lovable editor. The app will be live on a `.lovable.app` URL. You can add a custom domain afterward in Project Settings → Domains.

## Vercel

### 1. Prerequisites

- A [GitHub](https://github.com) repository containing this code.
- A free [Vercel](https://vercel.com) account.
- A Google API key for the AI features (get one at [Google AI Studio](https://aistudio.google.com/app/apikey)).

### 2. Vercel project settings

Import the GitHub repo into Vercel. The included `vercel.json` already configures:

- Build command: `bun run build:vercel`
- Output directory: `.vercel/output`
- Install command: `bun install`

### 3. Environment variables

In the Vercel dashboard, go to **Project Settings → Environment Variables** and add:

| Name | Value | Environment |
| --- | --- | --- |
| `GOOGLE_API_KEY` | Your Google API key | Production, Preview, Development |

### 4. Deploy

Push to GitHub and Vercel will build and deploy automatically. The first deploy may take 2–3 minutes.

### Local Vercel build test

```bash
bun run build:vercel
npx srvx --static ./.vercel/output/static ./.vercel/output/functions/__server.func/index.mjs
```

## Azure VM / Node server

See `scripts/azure-deploy.sh` for a step-by-step guide. The build command for a self-hosted Node server is:

```bash
bun run build:node
```

This outputs the server to `dist/server/index.mjs`, which PM2 serves.

## Environment variables

Copy `.env.example` to `.env` and fill in your values. For hosted deployments, set these in the hosting dashboard instead.

- `GOOGLE_API_KEY` — required for AI search, chat, and roadmaps.
- `NODE_ENV` — set to `production` by the deployment configs.
- `PORT` — internal port (3000 for Azure/PM2, ignored by Vercel).
