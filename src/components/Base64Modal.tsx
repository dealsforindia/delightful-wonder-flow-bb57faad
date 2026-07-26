import { useEffect, useState } from "react";

// FMHY wraps obfuscated links as /base64/<b64>. Intercept clicks, show a modal.
export function Base64Modal() {
  const [target, setTarget] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const skip = () => {
      try { return localStorage.getItem("fmhy.b64.skip") === "1"; } catch { return false; }
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const m = href.match(/(?:https?:\/\/[^/]+)?\/base64\/([A-Za-z0-9+/=_-]+)/);
      if (!m) return;
      e.preventDefault();
      let decoded = "";
      try { decoded = atob(m[1].replace(/-/g, "+").replace(/_/g, "/")); } catch { decoded = m[1]; }
      if (skip()) { window.open(decoded, "_blank", "noopener,noreferrer"); return; }
      setTarget(decoded);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!target) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setTarget(null)}>
      <div className="bg-popover text-popover-foreground rounded-2xl border border-border max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">Base64 Encoded Link</h3>
        <p className="text-sm text-muted-foreground mt-1">The link you clicked was Base64-encoded. Decoded destination:</p>
        <div className="mt-3 p-3 rounded-lg bg-muted text-sm break-all font-mono">{target}</div>
        <label className="flex items-center gap-2 mt-4 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Don't show this again
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent" onClick={() => setTarget(null)}>Cancel</button>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            onClick={() => {
              if (remember) { try { localStorage.setItem("fmhy.b64.skip", "1"); } catch {/**/} }
              window.open(target, "_blank", "noopener,noreferrer");
              setTarget(null);
            }}
          >
            Open link
          </button>
        </div>
      </div>
    </div>
  );
}
