import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily wiki sync (Vercel Cron, 03:00 UTC).
 *
 * Content is baked in at build time, so "syncing" means triggering a fresh
 * deploy — the build itself runs scripts/refresh-content.ts first, which
 * pulls the latest wiki pages and rebuilds the tool directory.
 *
 * Required env vars (Vercel dashboard):
 * - CRON_SECRET        — set any random string; Vercel automatically sends it
 *                        as `Authorization: Bearer <CRON_SECRET>` on cron calls.
 * - VERCEL_DEPLOY_HOOK — a Deploy Hook URL (Project Settings → Git → Deploy Hooks).
 */
export const Route = createFileRoute("/api/public/cron/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (secret) {
          const auth = request.headers.get("authorization");
          if (auth !== `Bearer ${secret}`) {
            return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
          }
        }

        const hook = process.env["VERCEL_DEPLOY_HOOK"];
        if (!hook) {
          return Response.json(
            { ok: false, error: "VERCEL_DEPLOY_HOOK is not configured" },
            { status: 500 },
          );
        }

        const res = await fetch(hook, { method: "POST" });
        if (!res.ok) {
          const body = await res.text();
          console.error(`Deploy hook failed [${res.status}]: ${body}`);
          return Response.json(
            { ok: false, error: `deploy hook failed [${res.status}]` },
            { status: 502 },
          );
        }

        return Response.json({
          ok: true,
          triggeredAt: new Date().toISOString(),
          note: "Redeploy started — the build re-syncs wiki content before bundling.",
        });
      },
    },
  },
});
