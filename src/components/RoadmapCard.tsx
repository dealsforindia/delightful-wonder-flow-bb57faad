import { useState } from "react";
import type { Tool } from "@/lib/tools-data";

export type RoadmapStep = {
  i: number;
  tool: Tool;
  action: string;
  output: string;
  why: string;
  estMinutes: number;
};

export type Roadmap = {
  title: string;
  totalMinutes: number;
  keywords?: string[];
  steps: RoadmapStep[];
};

type Props = {
  step: RoadmapStep;
  index: number;
  done: boolean;
  onToggleDone: () => void;
  onSwap: () => void;
  swapping: boolean;
};

export function RoadmapStepCard({ step, index, done, onToggleDone, onSwap, swapping }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <li className="relative pl-12">
      <button
        onClick={onToggleDone}
        aria-label={done ? "Mark step incomplete" : "Mark step done"}
        className={`absolute left-0 top-2 h-8 w-8 rounded-full grid place-items-center text-sm font-bold border transition-colors ${
          done
            ? "bg-brand-blue border-brand-blue text-primary-foreground"
            : "bg-gradient-to-br from-brand-pink to-brand-purple border-transparent text-primary-foreground hover:scale-105"
        }`}
      >
        {done ? "✓" : index + 1}
      </button>
      <div
        className={`p-4 rounded-lg border bg-card transition-opacity ${
          done ? "border-brand-blue/40 opacity-60" : "border-border"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`flex-1 text-sm ${done ? "line-through" : ""}`}>{step.action}</div>
          <span className="shrink-0 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            ~{step.estMinutes}m
          </span>
        </div>

        <div className="mt-2 flex items-center flex-wrap gap-2">
          <a
            href={step.tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
          >
            → {step.tool.name}
          </a>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {step.tool.category}
          </span>
          <button
            onClick={onSwap}
            disabled={swapping}
            className="ml-auto text-xs px-2 py-1 rounded-md border border-border hover:bg-accent disabled:opacity-50"
            title="Swap this tool for a different one"
          >
            {swapping ? "…" : "🔄 Swap"}
          </button>
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="text-xs px-2 py-1 rounded-md border border-border hover:bg-accent"
          >
            {showWhy ? "Hide why" : "Why?"}
          </button>
        </div>

        {showWhy && step.why && (
          <p className="mt-2 text-xs text-muted-foreground border-l-2 border-brand-purple/60 pl-3">
            {step.why}
          </p>
        )}
        <div className="mt-2 text-xs text-muted-foreground">✓ {step.output}</div>
      </div>
    </li>
  );
}

export function roadmapToMarkdown(r: Roadmap): string {
  const lines = [`# ${r.title}`, "", `_Total: ~${r.totalMinutes} minutes · ${r.steps.length} steps_`, ""];
  r.steps.forEach((s, i) => {
    lines.push(`## ${i + 1}. ${s.action}`);
    lines.push(`- **Tool:** [${s.tool.name}](${s.tool.url}) · _${s.tool.category}_`);
    lines.push(`- **Time:** ~${s.estMinutes} min`);
    if (s.why) lines.push(`- **Why:** ${s.why}`);
    lines.push(`- **Result:** ${s.output}`);
    lines.push("");
  });
  lines.push("---", "Built with Unlocked · https://unlocked");
  return lines.join("\n");
}

export function encodeRoadmap(r: Roadmap): string {
  // compact form to keep URL short
  const compact = {
    t: r.title,
    m: r.totalMinutes,
    s: r.steps.map((s) => ({ i: s.i, a: s.action, o: s.output, w: s.why, e: s.estMinutes })),
  };
  const json = JSON.stringify(compact);
  if (typeof window === "undefined") return "";
  return btoa(unescape(encodeURIComponent(json)));
}
