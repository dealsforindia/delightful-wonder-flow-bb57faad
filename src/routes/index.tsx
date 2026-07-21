import { createFileRoute } from "@tanstack/react-router";
import { Singularity } from "@/components/Singularity";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <Singularity />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center px-6 pt-10 text-center sm:pt-16">
        <span className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground/80">
          A gravitational instrument
        </span>
        <h1 className="mt-3 text-4xl font-light tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Singularity
        </h1>
        <p className="mt-3 max-w-sm text-xs text-muted-foreground sm:text-sm">
          Move to steer the void. Hold to pull harder. Click to detonate a
          shockwave. Turn the sound on.
        </p>
      </div>
    </main>
  );
}
