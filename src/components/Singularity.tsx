import { useEffect, useRef, useState } from "react";

interface Star {
  x: number;
  y: number;
  z: number;
  baseZ: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  strength: number;
  life: number;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

function readColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${name}`)
    .trim();
  return v || fallback;
}

export function Singularity() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioOn, setAudioOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const droneRef = useRef<{ osc: OscillatorNode; gain: GainNode }[] | null>(
    null,
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let cx = 0;
    let cy = 0;
    let rafId = 0;
    let time = 0;

    let stars: Star[] = [];
    let ripples: Ripple[] = [];
    let dust: Dust[] = [];

    const pointer = {
      x: 0,
      y: 0,
      tx: 0,
      ty: 0,
      active: false,
      pressing: false,
    };

    const palette = {
      primary: readColor("primary", "#4fb0ff"),
      secondary: readColor("secondary", "#a56bff"),
      accent: readColor("accent", "#5fe6b5"),
      ember: readColor("glow-ember", "#ff8b4a"),
    };
    const starColors = [
      palette.primary,
      palette.secondary,
      palette.accent,
      palette.ember,
      "#ffffff",
    ];

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width * dpr;
      height = rect.height * dpr;
      canvas!.width = width;
      canvas!.height = height;
      cx = width / 2;
      cy = height / 2;
      pointer.x = cx;
      pointer.y = cy;
      pointer.tx = cx;
      pointer.ty = cy;
      initStars();
    }

    function initStars() {
      const count = Math.min(
        Math.max(Math.floor((width * height) / 6000), 300),
        1400,
      );
      stars = [];
      for (let i = 0; i < count; i++) {
        const z = Math.random() * 1 + 0.05;
        stars.push({
          x: (Math.random() - 0.5) * width * 2.2,
          y: (Math.random() - 0.5) * height * 2.2,
          z,
          baseZ: z,
          color: starColors[Math.floor(Math.random() * starColors.length)],
          size: Math.random() * 1.4 + 0.3,
        });
      }
    }

    function spawnRipple(x: number, y: number, strength = 1) {
      ripples.push({
        x,
        y,
        radius: 4 * dpr,
        strength,
        life: 1,
      });
      for (let i = 0; i < 40; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 2 + Math.random() * 6;
        dust.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 1,
          hue: Math.random() * 360,
        });
      }
      playBoom();
    }

    function ensureAudio() {
      if (audioCtxRef.current) return audioCtxRef.current;
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ac = new AC();
      const master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
      audioCtxRef.current = ac;
      masterGainRef.current = master;

      // Ambient drone made of detuned sines
      const freqs = [55, 82.5, 110, 164.8];
      const layers = freqs.map((f) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.value = 0.08 + Math.random() * 0.05;
        osc.connect(g);
        g.connect(master);
        osc.start();
        return { osc, gain: g };
      });
      droneRef.current = layers;

      // Fade in
      master.gain.exponentialRampToValueAtTime(
        0.18,
        ac.currentTime + 2,
      );
      return ac;
    }

    function playBoom() {
      const ac = audioCtxRef.current;
      const master = masterGainRef.current;
      if (!ac || !master) return;
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = "sine";
      const baseFreq = 120 + Math.random() * 180;
      osc.frequency.setValueAtTime(baseFreq * 3, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.6);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.4, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(g);
      g.connect(master);
      osc.start(now);
      osc.stop(now + 1);

      // shimmer
      const s = ac.createOscillator();
      const sg = ac.createGain();
      s.type = "triangle";
      s.frequency.setValueAtTime(baseFreq * 6, now);
      s.frequency.exponentialRampToValueAtTime(baseFreq * 12, now + 0.4);
      sg.gain.setValueAtTime(0.0001, now);
      sg.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      s.connect(sg);
      sg.connect(master);
      s.start(now);
      s.stop(now + 0.6);
    }

    function update() {
      time += 1;

      // Smooth pointer
      pointer.x += (pointer.tx - pointer.x) * 0.15;
      pointer.y += (pointer.ty - pointer.y) * 0.15;

      const gx = pointer.active ? pointer.x : cx;
      const gy = pointer.active ? pointer.y : cy;

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 8 * dpr;
        r.life -= 0.012;
        if (r.life <= 0) ripples.splice(i, 1);
      }

      // Dust
      for (let i = dust.length - 1; i >= 0; i--) {
        const d = dust[i];
        d.vx *= 0.96;
        d.vy *= 0.96;
        d.x += d.vx;
        d.y += d.vy;
        d.life -= 0.015;
        if (d.life <= 0) dust.splice(i, 1);
      }

      // Star warp toward singularity
      const pull = pointer.pressing ? 0.06 : 0.018;
      for (const s of stars) {
        const dx = gx - (cx + s.x);
        const dy = gy - (cy + s.y);
        const dist2 = dx * dx + dy * dy;
        const dist = Math.sqrt(dist2) + 1;
        const f = (pull * 5000 * dpr) / (dist + 40);
        s.x += (dx / dist) * f;
        s.y += (dy / dist) * f;

        // Ripple push
        for (const r of ripples) {
          const rdx = cx + s.x - r.x;
          const rdy = cy + s.y - r.y;
          const rd = Math.sqrt(rdx * rdx + rdy * rdy);
          const band = Math.abs(rd - r.radius);
          if (band < 40 * dpr) {
            const push = ((40 * dpr - band) / (40 * dpr)) * r.life * 6;
            s.x += (rdx / (rd + 0.01)) * push;
            s.y += (rdy / (rd + 0.01)) * push;
          }
        }

        // Recycle if consumed by singularity
        if (dist < 20 * dpr) {
          const a = Math.random() * Math.PI * 2;
          const rad = Math.max(width, height);
          s.x = Math.cos(a) * rad;
          s.y = Math.sin(a) * rad;
          s.z = s.baseZ;
        }
      }
    }

    function draw() {
      // Fade trails
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.fillStyle = "rgba(4, 6, 18, 0.28)";
      ctx!.fillRect(0, 0, width, height);

      const gx = pointer.active ? pointer.x : cx;
      const gy = pointer.active ? pointer.y : cy;

      // Accretion disk glow
      const bg = ctx!.createRadialGradient(
        gx,
        gy,
        4 * dpr,
        gx,
        gy,
        260 * dpr,
      );
      bg.addColorStop(0, "rgba(255,180,120,0.35)");
      bg.addColorStop(0.25, "rgba(180,110,255,0.18)");
      bg.addColorStop(0.6, "rgba(80,140,255,0.08)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.globalCompositeOperation = "screen";
      ctx!.fillStyle = bg;
      ctx!.beginPath();
      ctx!.arc(gx, gy, 260 * dpr, 0, Math.PI * 2);
      ctx!.fill();

      // Stars
      for (const s of stars) {
        const px = cx + s.x;
        const py = cy + s.y;
        const dx = px - gx;
        const dy = py - gy;
        const dist = Math.sqrt(dx * dx + dy * dy) + 1;
        const trail = Math.min(60, 3000 / dist) * dpr;
        const nx = dx / dist;
        const ny = dy / dist;
        ctx!.strokeStyle = s.color;
        ctx!.globalAlpha = Math.min(1, 0.4 + trail / (40 * dpr));
        ctx!.lineWidth = s.size * dpr;
        ctx!.beginPath();
        ctx!.moveTo(px, py);
        ctx!.lineTo(px + nx * trail * 0.4, py + ny * trail * 0.4);
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;

      // Ripples
      for (const r of ripples) {
        ctx!.strokeStyle = `rgba(180,220,255,${r.life * 0.6})`;
        ctx!.lineWidth = 2 * dpr;
        ctx!.beginPath();
        ctx!.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // Dust
      for (const d of dust) {
        ctx!.fillStyle = `hsla(${d.hue}, 90%, 70%, ${d.life})`;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, 2 * dpr * d.life, 0, Math.PI * 2);
        ctx!.fill();
      }

      // Event horizon
      const eh = ctx!.createRadialGradient(gx, gy, 0, gx, gy, 40 * dpr);
      eh.addColorStop(0, "rgba(0,0,0,1)");
      eh.addColorStop(0.7, "rgba(0,0,0,0.9)");
      eh.addColorStop(1, "rgba(0,0,0,0)");
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = eh;
      ctx!.beginPath();
      ctx!.arc(gx, gy, 40 * dpr, 0, Math.PI * 2);
      ctx!.fill();

      // Halo ring
      const ringPulse = 1 + Math.sin(time * 0.05) * 0.1;
      ctx!.globalCompositeOperation = "screen";
      ctx!.strokeStyle = "rgba(180,140,255,0.55)";
      ctx!.lineWidth = 1.5 * dpr;
      ctx!.beginPath();
      ctx!.arc(gx, gy, 44 * dpr * ringPulse, 0, Math.PI * 2);
      ctx!.stroke();
      ctx!.strokeStyle = "rgba(120,200,255,0.35)";
      ctx!.beginPath();
      ctx!.arc(gx, gy, 60 * dpr * ringPulse, 0, Math.PI * 2);
      ctx!.stroke();

      ctx!.globalCompositeOperation = "source-over";
    }

    function loop() {
      update();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function toLocal(clientX: number, clientY: number) {
      const rect = canvas!.getBoundingClientRect();
      pointer.tx = (clientX - rect.left) * dpr;
      pointer.ty = (clientY - rect.top) * dpr;
      pointer.active = true;
    }

    const onMove = (e: MouseEvent) => toLocal(e.clientX, e.clientY);
    const onLeave = () => {
      pointer.active = false;
      pointer.tx = cx;
      pointer.ty = cy;
    };
    const onDown = (e: MouseEvent) => {
      pointer.pressing = true;
      toLocal(e.clientX, e.clientY);
      spawnRipple(pointer.tx, pointer.ty, 1);
    };
    const onUp = () => {
      pointer.pressing = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) toLocal(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      pointer.pressing = true;
      if (e.touches[0]) {
        toLocal(e.touches[0].clientX, e.touches[0].clientY);
        spawnRipple(pointer.tx, pointer.ty, 1);
      }
    };
    const onTouchEnd = () => {
      pointer.pressing = false;
    };
    const onResize = () => resize();

    resize();
    // Initial soft ripple
    spawnRipple(cx, cy, 0.6);
    loop();

    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleAudio() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!audioCtxRef.current) {
      const ac = new AC();
      const master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
      audioCtxRef.current = ac;
      masterGainRef.current = master;
      const freqs = [55, 82.5, 110, 164.8, 220];
      droneRef.current = freqs.map((f, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = f * (1 + (Math.random() - 0.5) * 0.005);
        g.gain.value = 0.05 + Math.random() * 0.04;
        osc.connect(g);
        g.connect(master);
        osc.start();
        return { osc, gain: g };
      });
      master.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 2.5);
      setAudioOn(true);
    } else {
      const ac = audioCtxRef.current;
      const master = masterGainRef.current!;
      if (audioOn) {
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
        setAudioOn(false);
      } else {
        master.gain.cancelScheduledValues(ac.currentTime);
        master.gain.exponentialRampToValueAtTime(0.22, ac.currentTime + 1.5);
        setAudioOn(true);
      }
    }
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-none"
        aria-label="An interactive gravitational singularity warping a field of stars. Move to steer, hold to pull harder, click or tap to detonate a shockwave."
      />
      <button
        type="button"
        onClick={toggleAudio}
        className="pointer-events-auto absolute bottom-6 right-6 z-10 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur-md transition-colors hover:bg-background/70"
      >
        {audioOn ? "◉ sound on" : "◎ sound off"}
      </button>
    </>
  );
}
