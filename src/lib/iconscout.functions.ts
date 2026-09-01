import { createServerFn } from "@tanstack/react-start";

type Asset = "3d" | "illustration" | "icon";

const cache = new Map<string, { url: string; asset: Asset } | null>();

async function search(query: string, asset: Asset, clientId: string, clientSecret: string) {
  const url = `https://api.iconscout.com/v3/search?query=${encodeURIComponent(query)}&product_type=item&asset=${asset}&per_page=1&price=free`;
  const res = await fetch(url, { headers: { "Client-ID": clientId, "Client-Secret": clientSecret } });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const item = json?.response?.items?.data?.[0];
  const u = item?.urls;
  return (u?.png_256 || u?.png_128 || u?.thumb || u?.png_64 || null) as string | null;
}

export const getIconscoutIcon = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string; prefer3d?: boolean }) => ({
    query: String(input.query || "").slice(0, 60),
    prefer3d: input.prefer3d !== false,
  }))
  .handler(async ({ data }) => {
    const key = `${data.prefer3d ? "3d" : "flat"}:${data.query.toLowerCase().trim()}`;
    if (!data.query.trim()) return { url: null, asset: null };
    if (cache.has(key)) {
      const hit = cache.get(key)!;
      return { url: hit?.url ?? null, asset: hit?.asset ?? null };
    }

    const clientId = process.env.ICONSCOUT_CLIENT_ID;
    const clientSecret = process.env.ICONSCOUT_SECRET_KEY;
    if (!clientId || !clientSecret) return { url: null, asset: null };

    const order: Asset[] = data.prefer3d ? ["3d", "illustration", "icon"] : ["icon", "illustration"];
    try {
      for (const asset of order) {
        const url = await search(data.query.toLowerCase().trim(), asset, clientId, clientSecret);
        if (url) {
          cache.set(key, { url, asset });
          return { url, asset };
        }
      }
      cache.set(key, null);
      return { url: null, asset: null };
    } catch {
      cache.set(key, null);
      return { url: null, asset: null };
    }
  });
