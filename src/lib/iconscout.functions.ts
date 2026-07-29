import { createServerFn } from "@tanstack/react-start";

const cache = new Map<string, string | null>();

export const getIconscoutIcon = createServerFn({ method: "GET" })
  .inputValidator((input: { query: string }) => ({ query: String(input.query || "").slice(0, 60) }))
  .handler(async ({ data }) => {
    const key = data.query.toLowerCase().trim();
    if (!key) return { url: null };
    if (cache.has(key)) return { url: cache.get(key)! };

    const clientId = process.env.ICONSCOUT_CLIENT_ID;
    const clientSecret = process.env.ICONSCOUT_SECRET_KEY;
    if (!clientId || !clientSecret) return { url: null };

    try {
      const url = `https://api.iconscout.com/v3/search?query=${encodeURIComponent(key)}&product_type=item&asset=icon&per_page=1&price=free`;
      const res = await fetch(url, {
        headers: { "Client-ID": clientId, "Client-Secret": clientSecret },
      });
      if (!res.ok) {
        cache.set(key, null);
        return { url: null };
      }
      const json = (await res.json()) as any;
      const item = json?.response?.items?.data?.[0];
      const iconUrl: string | null =
        item?.urls?.png_128 || item?.urls?.png_64 || item?.urls?.png_256 || null;
      cache.set(key, iconUrl);
      return { url: iconUrl };
    } catch {
      cache.set(key, null);
      return { url: null };
    }
  });
