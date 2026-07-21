import { createFileRoute } from "@tanstack/react-router";
import { LivingCanvas } from "@/components/LivingCanvas";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      <LivingCanvas />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-4xl font-light tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Touch the void
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
          Move your cursor. Tap the screen. Click to ignite a burst of light.
        </p>
      </div>
    </main>
  );
}
