import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glow: string;
  phase: number;
  pulseSpeed: number;
}

function getCssColor(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(
    `--${name}`,
  );
  return value.trim() || fallback;
}

export function LivingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let sparks: Particle[] = [];
    let rafId = 0;
    let time = 0;

    const pointer: Point & { active: boolean; vx: number; vy: number } = {
      x: -1000,
      y: -1000,
      active: false,
      vx: 0,
      vy: 0,
    };
    let lastPointer = { x: -1000, y: -1000 };

    const palette = {
      primary: getCssColor("primary", "oklch(0.65 0.2 220)"),
      secondary: getCssColor("secondary", "oklch(0.55 0.18 300)"),
      accent: getCssColor("accent", "oklch(0.7 0.2 160)"),
      ember: getCssColor("glow-ember", "oklch(0.72 0.22 30)"),
    };

    const colorKeys = ["primary", "secondary", "accent", "ember"] as const;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width * dpr;
      height = rect.height * dpr;
      canvas.width = width;
      canvas.height = height;
      initParticles();
    }

    function initParticles() {
      const count = Math.min(
        Math.max(Math.floor((width * height) / 22000), 60),
        220,
      );
      particles = [];
      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const colorKey = colorKeys[i % colorKeys.length];
        particles.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 1.5 + 1,
          color: palette[colorKey],
          glow: palette[colorKey],
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.02 + Math.random() * 0.03,
        });
      }
    }

    function spawnBurst(x: number, y: number) {
      const burst = 24;
      for (let i = 0; i < burst; i++) {
        const angle = (Math.PI * 2 * i) / burst + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        const colorKey = colorKeys[i % colorKeys.length];
        sparks.push({
          x,
          y,
          homeX: x,
          homeY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2 + 1.2,
          color: palette[colorKey],
          glow: palette[colorKey],
          phase: Math.random() * Math.PI * 2,
          pulseSpeed: 0.05 + Math.random() * 0.05,
        });
      }
    }

    function update() {
      time += 1;

      for (const p of particles) {
        // gentle drift around home
        p.phase += p.pulseSpeed;
        const drift = Math.sin(p.phase) * 0.15;
        p.vx += (p.homeX - p.x) * 0.0003 + Math.cos(p.phase) * 0.003;
        p.vy += (p.homeY - p.y) * 0.0003 + Math.sin(p.phase) * 0.003;
        p.vx *= 0.97;
        p.vy *= 0.97;

        // pointer interaction
        if (pointer.active) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const radius = 160 * dpr;
          if (dist < radius && dist > 0.001) {
            const force = ((radius - dist) / radius) * 2.5;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        p.x += p.vx + drift;
        p.y += p.vy + drift;
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.96;
        s.vy *= 0.96;
        s.vy += 0.02;
        s.x += s.vx;
        s.y += s.vy;
        s.size *= 0.98;
        if (s.size < 0.2) {
          sparks.splice(i, 1);
        }
      }
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // subtle gradient background
      const gradient = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        0,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8,
      );
      gradient.addColorStop(0, "rgba(20, 20, 45, 0)");
      gradient.addColorStop(1, "rgba(10, 10, 25, 0.35)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "screen";

      // draw connections
      ctx.lineWidth = 0.5 * dpr;
      const maxDist = 120 * dpr;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          if (dist < maxDist * maxDist) {
            const alpha = 1 - Math.sqrt(dist) / maxDist;
            ctx.strokeStyle = `rgba(160, 200, 255, ${alpha * 0.25})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // draw sparks
      for (const s of sparks) {
        const pulse = 1 + Math.sin(s.phase + time * 0.15) * 0.3;
        const radius = s.size * pulse * dpr;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.glow;
        ctx.shadowBlur = 20 * dpr;
        ctx.fill();
      }

      // draw particles
      for (const p of particles) {
        const pulse = 1 + Math.sin(p.phase + time * 0.05) * 0.25;
        const radius = p.size * pulse * dpr;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.glow;
        ctx.shadowBlur = 14 * dpr;
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
    }

    function loop() {
      update();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function handleMove(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * dpr;
      const y = (clientY - rect.top) * dpr;
      pointer.vx = x - lastPointer.x;
      pointer.vy = y - lastPointer.y;
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      lastPointer.x = x;
      lastPointer.y = y;
    }

    function handleEnd() {
      pointer.active = false;
      pointer.x = -1000;
      pointer.y = -1000;
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onMouseLeave = () => handleEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleEnd();
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      spawnBurst((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0]) {
        const rect = canvas.getBoundingClientRect();
        spawnBurst(
          (e.touches[0].clientX - rect.left) * dpr,
          (e.touches[0].clientY - rect.top) * dpr,
        );
      }
    };
    const onResize = () => resize();

    resize();
    loop();

    window.addEventListener("resize", onResize);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", onTouchMove, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full cursor-crosshair"
      aria-label="Interactive living particle field. Move or touch to disturb it. Click or tap to create bursts of light."
    />
  );
}
