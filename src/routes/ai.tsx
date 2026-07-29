import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { FmhyLayout } from "@/components/FmhyLayout";
import { MarkdownView } from "@/components/MarkdownView";
import { Brain, MessageSquare, Pin, RefreshCw, Search, Map, Sparkles, Loader2 } from "lucide-react";

type AiSearchParams = { q?: string; mode?: "search" | "roadmap" };

export const Route = createFileRoute("/ai")({
  validateSearch: (search: Record<string, unknown>): AiSearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    mode: search.mode === "search" || search.mode === "roadmap" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Concierge · Unlocked" },
      {
        name: "description",
        content:
          "Chat with Unlocked's concierge. Ask what you want to do — get real free tools from 26,000+ entries and step-by-step workflows, refined turn by turn.",
      },
      { property: "og:title", content: "Unlocked AI Concierge" },
      { property: "og:description", content: "A conversation that turns 'I want to earn from X' into a real toolkit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiRoute,
});

const STORAGE_KEY = "unlocked.ai.chat.v1";
const MEMORY_KEY = "unlocked.ai.memory.v1";

const SEARCH_EXAMPLES = [
  "Free tools to remove image background without watermark",
  "Self-host my own Netflix from scratch",
  "Read paywalled articles for free",
];

const ROADMAP_EXAMPLES = [
  "I want to earn from affiliate marketing — where do I start?",
  "Build a fully automated YouTube Shorts channel",
  "Set up a private cloud backup system",
];

function loadInitial(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as UIMessage[];
  } catch {
    return [];
  }
}

function loadMemory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function textOf(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function AiRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [initial] = useState<UIMessage[]>(loadInitial);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState<string[]>(loadMemory);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"auto" | "search" | "roadmap">(search.mode ?? "auto");
  useEffect(() => {
    if (search.mode) setMode(search.mode);
  }, [search.mode]);

  const memoryString = memory.join("\n- ");
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai-chat",
        body: { mode, memory: memory.length ? `- ${memoryString}` : "" },
      }),
    [mode, memoryString, memory.length],
  );

  const { messages, sendMessage, status, error, setMessages, stop, regenerate } = useChat({
    messages: initial,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  // capture remember_user tool outputs → persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const facts = new Set(memory);
    let changed = false;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      for (const p of m.parts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pp = p as any;
        if (pp.type === "tool-remember_user" && pp.state === "output-available") {
          const fact = pp.output?.fact;
          if (typeof fact === "string" && fact.trim() && !facts.has(fact.trim())) {
            facts.add(fact.trim());
            changed = true;
          }
        }
      }
    }
    if (changed) {
      const next = Array.from(facts).slice(-20);
      setMemory(next);
      localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    }
  }, [messages, memory]);

  // persist chat
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (!search.q || search.q.trim().length < 3) return;
    if (messages.length > 0) return;
    seeded.current = true;
    const q = search.q.trim();
    const prompt =
      mode === "roadmap"
        ? `Build me a roadmap for: ${q}`
        : mode === "search"
          ? `Find the best free tools for: ${q}`
          : q;
    void sendMessage({ text: prompt });
    void navigate({ search: { mode: undefined, q: undefined } as unknown as AiSearchParams });
  }, [search.q, search.mode, messages.length, sendMessage, navigate, mode]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
    composerRef.current?.focus();
  }

  function quoteBack(text: string) {
    const trimmed = text.slice(0, 400).replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    const quoted = `> ${trimmed}\n\n`;
    setInput((prev) => (prev.trim() ? `${quoted}${prev}` : quoted));
    composerRef.current?.focus();
    composerRef.current?.setSelectionRange(quoted.length + 1000, quoted.length + 1000);
  }

  function reset() {
    setMessages([]);
    setInput("");
    localStorage.removeItem(STORAGE_KEY);
    composerRef.current?.focus();
  }

  function forgetMemory(fact?: string) {
    const next = fact ? memory.filter((f) => f !== fact) : [];
    setMemory(next);
    if (next.length) localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    else localStorage.removeItem(MEMORY_KEY);
  }

  const examples = mode === "roadmap" ? ROADMAP_EXAMPLES : SEARCH_EXAMPLES;

  return (
    <FmhyLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_-2px_var(--primary)]" />
              AI Concierge · Gemini 3.1 Pro · 26k tools · thinking
            </div>
            <h1 className="mt-1 text-xl sm:text-2xl font-extrabold tracking-tight">
              Ask.{" "}
              <span className="text-primary">
                Get the right free tool.
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={reset}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent shrink-0"
              >
                + New chat
              </button>
            )}
          </div>
        </div>

        {memory.length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="uppercase tracking-widest text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Brain className="h-3 w-3" /> Remembering about you
              </span>
              <button
                onClick={() => forgetMemory()}
                className="text-[10px] text-muted-foreground hover:text-destructive"
              >
                forget all
              </button>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {memory.map((f) => (
                <li key={f}>
                  <button
                    onClick={() => forgetMemory(f)}
                    title="Click to forget"
                    className="px-2 py-0.5 rounded-full bg-background border border-border hover:border-destructive hover:text-destructive transition"
                  >
                    {f} ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-3 pb-1 overflow-x-auto scrollbar-hide">
          {([
            ["auto", "Auto", "Let AI decide", Sparkles],
            ["search", "Ask", "Find tools", Search],
            ["roadmap", "Plan", "Step-by-step", Map],
          ] as const).map(([value, label, hint, Icon]) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                title={hint}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition inline-flex items-center gap-1.5 ${
                  active
                    ? "bg-primary/15 border-primary/50 text-primary shadow-[0_0_14px_-6px_var(--primary)]"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            );
          })}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-3">
              <p>
                Tell me what you want to <em>do</em> — I'll pick the right free tools or build a step-by-step plan.
                Follow up in the same chat: "cheaper?", "no signup", "swap step 3".
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => sendMessage({ text: ex })}
                    className="px-2.5 py-1 text-xs rounded-full border border-border hover:bg-accent hover:border-primary/40 text-muted-foreground text-left transition"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageView key={m.id} message={m} onAskAbout={quoteBack} />
          ))}

          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Thinking…
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
              {error.message || "Something went wrong"}
            </div>
          )}
        </div>

        <form onSubmit={submit} className="pt-3 border-t border-border">
          <div className="flex gap-2 items-end">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              rows={Math.min(6, Math.max(1, input.split("\n").length))}
              placeholder="Ask anything — e.g. how do I earn from affiliate marketing?"
              className="flex-1 min-h-[44px] max-h-40 px-4 py-2.5 rounded-xl bg-muted border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary text-sm"
              autoFocus
            />
            {busy ? (
              <button
                type="button"
                onClick={() => stop()}
                className="px-4 h-11 rounded-xl border border-destructive text-destructive font-medium hover:bg-destructive/10 shrink-0"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={busy || input.trim().length < 2}
                className="px-4 h-11 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 shrink-0 shadow-[0_0_18px_-8px_var(--primary)] hover:brightness-110"
              >
                Send
              </button>
            )}
            {messages.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => regenerate()}
                className="px-4 h-11 rounded-xl border border-border hover:bg-accent hover:border-primary/40 font-medium text-muted-foreground shrink-0"
                title="Regenerate the last assistant response"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>
    </FmhyLayout>
  );
}

function MessageView({ message, onAskAbout }: { message: UIMessage; onAskAbout: (text: string) => void }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap break-words shadow-[0_0_20px_-10px_var(--primary)]">
          {textOf(message)}
        </div>
      </div>
    );
  }

  const text = textOf(message);

  return (
    <div className="space-y-3 group">
      {message.parts.map((part, idx) => {
        if (part.type === "reasoning") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = part as any;
          const t: string = r.text ?? "";
          if (!t.trim()) return null;
          return <ReasoningBlock key={idx} text={t} />;
        }
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return (
            <div key={idx} className="text-sm leading-relaxed prose-fmhy-small">
              <MarkdownView source={part.text} />
            </div>
          );
        }
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          const name: string = p.toolName || part.type.replace(/^tool-/, "");
          const state: string = p.state;
          if (state === "input-streaming" || state === "input-available") {
            const label =
              name === "build_roadmap" ? "Designing your roadmap…" :
              name === "list_categories" ? "Scanning the taxonomy…" :
              name === "browse_category" ? "Browsing the directory…" :
              name === "compare_tools" ? "Pulling entries to compare…" :
              name === "remember_user" ? "Noting that for later…" :
              "Searching the directory…";
            return (
              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                {label}
              </div>
            );
          }
          if (state === "output-available") {
            return <ToolResultCard key={idx} name={name} output={p.output} />;
          }
          if (state === "output-error") {
            return (
              <div key={idx} className="text-xs text-destructive">
                Tool failed: {p.errorText || "unknown error"}
              </div>
            );
          }
        }
        return null;
      })}

      {text && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAskAbout(text)}
            className="text-[11px] px-2 py-0.5 rounded-md border border-border hover:bg-accent hover:border-primary/40 text-muted-foreground inline-flex items-center gap-1"
            title="Quote this reply into your next question"
          >
            <Pin className="h-3 w-3" /> Ask about this
          </button>
        </div>
      )}
    </div>
  );
}

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="rounded-lg border border-dashed border-border bg-muted/30 text-xs"
    >
      <summary className="cursor-pointer select-none px-2.5 py-1.5 text-muted-foreground inline-flex items-center gap-1.5">
        <MessageSquare className="h-3 w-3" /> {open ? "Hide" : "Show"} thinking
      </summary>
      <div className="px-3 py-2 whitespace-pre-wrap text-muted-foreground/90 leading-relaxed">
        {text}
      </div>
    </details>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToolResultCard({ name, output }: { name: string; output: any }) {
  if (name === "search_tools") return <SearchCard output={output} />;
  if (name === "build_roadmap") return <RoadmapCardView output={output} />;
  if (name === "list_categories") return <CategoriesCard output={output} />;
  if (name === "browse_category") return <BrowseCard output={output} />;
  if (name === "compare_tools") return <CompareCard output={output} />;
  if (name === "remember_user") {
    return (
      <div className="text-xs text-primary flex items-center gap-1.5">
        <Brain className="h-3.5 w-3.5" /> Remembered: <span className="italic">{output?.fact}</span>
      </div>
    );
  }
  return null;
}

type ToolRow = { i: number; name: string; url: string; category: string; section: string; why?: string };

function SearchCard({ output }: { output: { query: string; results: ToolRow[] } }) {
  const { results, query } = output;
  if (!results?.length) return <div className="text-xs text-muted-foreground italic">No matches for "{query}".</div>;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/60 inline-flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5" /> Found {results.length} for "{query}"
      </div>
      <ul className="divide-y divide-border">
        {results.map((r) => <ToolRowLi key={r.i} r={r} />)}
      </ul>
    </div>
  );
}

function ToolRowLi({ r }: { r: ToolRow }) {
  return (
    <li>
      <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 hover:bg-accent/40 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 flex-wrap">
            <span className="font-medium text-sm">{r.name}</span>
            <span className="text-[11px] text-muted-foreground">{r.section}</span>
          </span>
          <span className="block text-[11px] text-primary/80 truncate mt-0.5">{r.url}</span>
          {r.why && <span className="block text-[11px] text-muted-foreground italic mt-0.5">{r.why}</span>}
        </span>
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
          {r.category}
        </span>
      </a>
    </li>
  );
}

function RoadmapCardView({ output }: {
  output: {
    goal: string; title: string; totalMinutes: number;
    steps: Array<{ i: number; name: string; url: string; category: string; section: string; action: string; output: string; why: string; estMinutes: number }>;
  };
}) {
  const { title, totalMinutes, steps, goal } = output;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/60 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5" /> Roadmap · {goal}
          </div>
          <div className="font-semibold text-sm mt-0.5">{title}</div>
        </div>
        <div className="text-[11px] text-muted-foreground">{steps.length} steps · ~{totalMinutes} min</div>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((s, i) => (
          <li key={`${s.i}-${i}`} className="p-3 flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs grid place-items-center font-semibold shadow-[0_0_10px_-3px_var(--primary)]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm">{s.action}</div>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap text-xs">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{s.name}</a>
                <span className="text-muted-foreground">{s.category}</span>
                <span className="ml-auto text-muted-foreground">~{s.estMinutes} min</span>
              </div>
              {s.why && <div className="mt-1 text-xs text-muted-foreground italic">Why: {s.why}</div>}
              {s.output && <div className="mt-0.5 text-xs text-muted-foreground">You'll have: {s.output}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CategoriesCard({ output }: {
  output: { total: number; categories: Array<{ category: string; count: number; sections: Array<{ name: string; count: number }> }> };
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/60 inline-flex items-center gap-1.5">
        <LayoutGrid className="h-3.5 w-3.5" /> {output.categories.length} categories · {output.total.toLocaleString()} tools
      </div>
      <ul className="divide-y divide-border">
        {output.categories.map((c) => (
          <li key={c.category} className="p-3 text-xs">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-sm">{c.category}</span>
              <span className="text-muted-foreground">{c.count.toLocaleString()}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
              {c.sections.slice(0, 8).map((s) => (
                <span key={s.name} className="px-1.5 py-0.5 rounded bg-muted">{s.name} · {s.count}</span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BrowseCard({ output }: {
  output: { category: string; section: string | null; totalInCategory: number; results: ToolRow[] };
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/60 inline-flex items-center gap-1.5">
        <BookOpen className="h-3.5 w-3.5" /> {output.category}{output.section ? ` · ${output.section}` : ""} · showing {output.results.length} of {output.totalInCategory}
      </div>
      <ul className="divide-y divide-border">
        {output.results.map((r) => <ToolRowLi key={r.i} r={r} />)}
      </ul>
    </div>
  );
}

function CompareCard({ output }: {
  output: { results: Array<{ query: string; found: boolean; i?: number; name?: string; url?: string; category?: string; section?: string }> };
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/60 inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" /> Compare · {output.results.length} tools
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {output.results.map((r, i) => (
          <div key={i} className="p-3 text-xs">
            {r.found ? (
              <>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-primary hover:underline">
                  {r.name}
                </a>
                <div className="text-muted-foreground mt-0.5">{r.section}</div>
                <div className="text-[10px] uppercase tracking-wider mt-1 text-muted-foreground">{r.category}</div>
                <div className="text-[11px] text-primary/80 truncate mt-1">{r.url}</div>
              </>
            ) : (
              <div className="text-muted-foreground italic">"{r.query}" not in the directory.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
