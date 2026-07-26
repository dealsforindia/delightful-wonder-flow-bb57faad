import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { FmhyLayout } from "@/components/FmhyLayout";

type AiSearchParams = { q?: string };

export const Route = createFileRoute("/ai")({
  validateSearch: (search: Record<string, unknown>): AiSearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
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

type ToolResult =
  | {
      name: "search_tools";
      output: {
        query: string;
        results: Array<{ i: number; name: string; url: string; category: string; section: string }>;
      };
    }
  | {
      name: "build_roadmap";
      output: {
        goal: string;
        title: string;
        totalMinutes: number;
        steps: Array<{
          i: number;
          name: string;
          url: string;
          category: string;
          section: string;
          action: string;
          output: string;
          why: string;
          estMinutes: number;
        }>;
      };
    };

const EXAMPLES = [
  "I want to earn from affiliate marketing — where do I start?",
  "Free tools to remove image background without watermark",
  "Self-host my own Netflix from scratch",
  "Read paywalled articles for free",
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

function textOf(m: UIMessage): string {
  return m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
}

function AiRoute() {
  const search = Route.useSearch();
  const [initial] = useState<UIMessage[]>(loadInitial);
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/ai-chat" }),
  });

  const busy = status === "submitted" || status === "streaming";

  // persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (messages.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // auto-scroll on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // seed from ?q= (only once, only when chat is empty)
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    if (!search.q || search.q.trim().length < 3) return;
    if (messages.length > 0) return;
    seeded.current = true;
    void sendMessage({ text: search.q.trim() });
  }, [search.q, messages.length, sendMessage]);

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

  return (
    <FmhyLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-pink animate-pulse" />
              AI Concierge · Gemini · 26k tools
            </div>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
              Ask.{" "}
              <span className="bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-transparent">
                Get the right free tool.
              </span>
            </h1>
          </div>
          {messages.length > 0 && (
            <button
              onClick={reset}
              className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent shrink-0"
            >
              + New chat
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground space-y-3">
              <p>
                Tell me what you want to <em>do</em> — I'll pick the right free tools or build a step-by-step plan.
                Follow up in the same chat: "cheaper?", "no signup", "swap step 3".
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => sendMessage({ text: ex })}
                    className="px-2.5 py-1 text-xs rounded-full border border-border hover:bg-accent text-muted-foreground text-left"
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
              <span className="inline-block h-2 w-2 rounded-full bg-brand-purple animate-pulse" />
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
              className="flex-1 min-h-[44px] max-h-40 px-4 py-2.5 rounded-xl bg-muted border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              autoFocus
            />
            <button
              type="submit"
              disabled={busy || input.trim().length < 2}
              className="px-4 h-11 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 shrink-0"
            >
              {busy ? "…" : "Send"}
            </button>
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
        <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground text-sm whitespace-pre-wrap break-words">
          {textOf(message)}
        </div>
      </div>
    );
  }

  const text = textOf(message);

  return (
    <div className="space-y-3 group">
      {message.parts.map((part, idx) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return (
            <div key={idx} className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {part.text}
            </div>
          );
        }
        // AI SDK tool-part types have the form `tool-<name>` or `dynamic-tool`
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = part as any;
          const name: string = p.toolName || part.type.replace(/^tool-/, "");
          const state: string = p.state;
          if (state === "input-streaming" || state === "input-available") {
            return (
              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-purple animate-pulse" />
                {name === "build_roadmap" ? "Designing your roadmap…" : "Searching the directory…"}
              </div>
            );
          }
          if (state === "output-available") {
            const tr: ToolResult = { name: name as ToolResult["name"], output: p.output };
            return <ToolResultCard key={idx} result={tr} />;
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
            className="text-[11px] px-2 py-0.5 rounded-md border border-border hover:bg-accent text-muted-foreground"
            title="Quote this reply into your next question"
          >
            📌 Ask about this
          </button>
        </div>
      )}
    </div>
  );
}

function ToolResultCard({ result }: { result: ToolResult }) {
  if (result.name === "search_tools") {
    const { results, query } = result.output;
    if (!results?.length) {
      return (
        <div className="text-xs text-muted-foreground italic">No matches for "{query}".</div>
      );
    }
    return (
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-muted-foreground bg-muted/60">
          🔎 Found {results.length} for "{query}"
        </div>
        <ul className="divide-y divide-border">
          {results.map((r) => (
            <li key={r.i}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 hover:bg-accent/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.name}</span>
                    <span className="text-[11px] text-muted-foreground">{r.section}</span>
                  </span>
                  <span className="block text-[11px] text-brand-blue truncate mt-0.5">{r.url}</span>
                </span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                  {r.category}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // build_roadmap
  const { title, totalMinutes, steps, goal } = result.output;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-muted/60 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">🗺️ Roadmap · {goal}</div>
          <div className="font-semibold text-sm mt-0.5">{title}</div>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {steps.length} steps · ~{totalMinutes} min
        </div>
      </div>
      <ol className="divide-y divide-border">
        {steps.map((s, i) => (
          <li key={`${s.i}-${i}`} className="p-3 flex gap-3">
            <span className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue text-white text-xs grid place-items-center font-semibold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm">{s.action}</div>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap text-xs">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-purple hover:underline"
                >
                  {s.name}
                </a>
                <span className="text-muted-foreground">{s.category}</span>
                <span className="ml-auto text-muted-foreground">~{s.estMinutes} min</span>
              </div>
              {s.why && <div className="mt-1 text-xs text-muted-foreground italic">Why: {s.why}</div>}
              {s.output && (
                <div className="mt-0.5 text-xs text-muted-foreground">You'll have: {s.output}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
