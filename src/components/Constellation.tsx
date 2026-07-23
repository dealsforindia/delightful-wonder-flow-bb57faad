import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search } from "lucide-react";
import { TOOLS, CATEGORIES, type Tool } from "@/lib/tools-data";

// Deterministic hue per category
const HUES: Record<string, number> = {};
CATEGORIES.forEach((c, i) => { HUES[c] = Math.round((i * 360) / CATEGORIES.length); });

interface Node {
  t: Tool;
  x: number; y: number;
  vx: number; vy: number;
  cx: number; cy: number; // cluster anchor
  r: number;
  hue: number;
  match: number; // 0..1 highlight
}

export function Constellation({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<Node | null>(null);
  const queryRef = useRef("");
  const viewRef = useRef({ zoom: 1, ox: 0, oy: 0, dragging: false, lx: 0, ly: 0 });
  const nodesRef = useRef<Node[]>([]);

  // build nodes once
  const nodes = useMemo(() => {
    const catList = CATEGORIES;
    const cols = Math.ceil(Math.sqrt(catList.length));
    const spacing = 520;
    const anchors: Record<string, { x: number; y: number }> = {};
    catList.forEach((c, i) => {
      anchors[c] = {
        x: (i % cols) * spacing - (cols - 1) * spacing / 2,
        y: Math.floor(i / cols) * spacing - Math.floor(catList.length / cols) * spacing / 2,
      };
    });
    return TOOLS.map((t) => {
      const a = anchors[t.category] ?? { x: 0, y: 0 };
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * 180;
      return {
        t,
        x: a.x + Math.cos(angle) * rad,
        y: a.y + Math.sin(angle) * rad,
        vx: 0, vy: 0,
        cx: a.x, cy: a.y,
        r: 2 + Math.random() * 1.5,
        hue: HUES[t.category] ?? 200,
        match: 0,
      } as Node;
    });
  }, []);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { queryRef.current = query.toLowerCase().trim(); }, [query]);

  // physics + render loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // initial fit
    const v = viewRef.current;
    v.zoom = 0.35;
    v.ox = window.innerWidth / 2;
    v.oy = window.innerHeight / 2;

    let t0 = performance.now();
    function frame(now: number) {
      const dt = Math.min(0.033, (now - t0) / 1000);
      t0 = now;
      const ns = nodesRef.current;
      const q = queryRef.current;

      // physics: pull to cluster
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        const dx = n.cx - n.x;
        const dy = n.cy - n.y;
        n.vx += dx * 0.6 * dt;
        n.vy += dy * 0.6 * dt;
        n.vx *= 0.92;
        n.vy *= 0.92;
        n.x += n.vx;
        n.y += n.vy;

        // match highlight
        const isMatch = q && (n.t.name.toLowerCase().includes(q) || n.t.section.toLowerCase().includes(q));
        n.match += ((isMatch ? 1 : 0) - n.match) * 0.15;
      }

      // draw
      const W = window.innerWidth, H = window.innerHeight;
      ctx.fillStyle = "#05060a";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(v.ox, v.oy);
      ctx.scale(v.zoom, v.zoom);

      // glow layer
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < ns.length; i++) {
        const n = ns[i];
        const bright = 0.35 + n.match * 0.65;
        const size = n.r * (1 + n.match * 3);
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, size * 6);
        g.addColorStop(0, `hsla(${n.hue}, 90%, 65%, ${bright})`);
        g.addColorStop(1, `hsla(${n.hue}, 90%, 60%, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(n.x - size * 6, n.y - size * 6, size * 12, size * 12);
      }
      ctx.globalCompositeOperation = "source-over";

      // labels for categories
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 42px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      const seen = new Set<string>();
      for (const n of ns) {
        if (seen.has(n.t.category)) continue;
        seen.add(n.t.category);
        ctx.fillStyle = `hsla(${n.hue}, 80%, 70%, 0.5)`;
        ctx.fillText(n.t.category, n.cx, n.cy - 220);
      }

      ctx.restore();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  // interaction
  useEffect(() => {
    const canvas = canvasRef.current!;
    const v = viewRef.current;

    function toWorld(px: number, py: number) {
      return { x: (px - v.ox) / v.zoom, y: (py - v.oy) / v.zoom };
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.001);
      const before = toWorld(e.clientX, e.clientY);
      v.zoom = Math.max(0.1, Math.min(5, v.zoom * factor));
      const after = toWorld(e.clientX, e.clientY);
      v.ox += (after.x - before.x) * v.zoom;
      v.oy += (after.y - before.y) * v.zoom;
    }
    function onDown(e: MouseEvent) {
      v.dragging = true; v.lx = e.clientX; v.ly = e.clientY;
    }
    function onUp() { v.dragging = false; }
    function onMove(e: MouseEvent) {
      if (v.dragging) {
        v.ox += e.clientX - v.lx;
        v.oy += e.clientY - v.ly;
        v.lx = e.clientX; v.ly = e.clientY;
        setHover(null);
        return;
      }
      const w = toWorld(e.clientX, e.clientY);
      let best: Node | null = null;
      let bd = 20 / v.zoom;
      for (const n of nodesRef.current) {
        const d = Math.hypot(n.x - w.x, n.y - w.y);
        if (d < bd) { bd = d; best = n; }
      }
      setHover(best);
    }
    function onClick(e: MouseEvent) {
      const w = toWorld(e.clientX, e.clientY);
      let best: Node | null = null;
      let bd = 20 / v.zoom;
      for (const n of nodesRef.current) {
        const d = Math.hypot(n.x - w.x, n.y - w.y);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) window.open(best.t.url, "_blank", "noopener");
    }

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#05060a] text-white">
      <canvas ref={canvasRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div className="absolute top-4 left-4 right-4 flex items-center gap-3 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-2">
          <Search className="w-4 h-4 opacity-60" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="illuminate tools…"
            className="bg-transparent outline-none text-sm w-64 placeholder:text-white/40"
          />
        </div>
        <div className="pointer-events-auto text-xs text-white/50 hidden md:block">
          scroll to zoom · drag to pan · click a star to open
        </div>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="pointer-events-auto rounded-full bg-white/5 backdrop-blur-xl border border-white/10 p-2 hover:bg-white/10 transition"
          aria-label="Close constellation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 text-xs text-white/50 pointer-events-none">
        {TOOLS.length.toLocaleString()} tools · {CATEGORIES.length} clusters
      </div>

      {hover && (
        <div
          className="absolute pointer-events-none rounded-lg bg-black/80 backdrop-blur border border-white/20 px-3 py-2 text-xs max-w-xs"
          style={{
            left: Math.min(window.innerWidth - 260, viewRef.current.ox + hover.x * viewRef.current.zoom + 12),
            top: Math.min(window.innerHeight - 80, viewRef.current.oy + hover.y * viewRef.current.zoom + 12),
          }}
        >
          <div className="font-medium text-white">{hover.t.name}</div>
          <div className="text-white/50 mt-0.5">{hover.t.category} · {hover.t.section}</div>
        </div>
      )}
    </div>
  );
}
