import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import { Copy, Download, Loader2, Sparkles, FileText } from "lucide-react";
import { generateCoverLetter } from "@/lib/cover.functions";

export const Route = createFileRoute("/")({
  component: Cover,
});

type Tone = "confident" | "warm" | "direct" | "enthusiastic";
const TONES: { value: Tone; label: string }[] = [
  { value: "confident", label: "Confident" },
  { value: "warm", label: "Warm" },
  { value: "direct", label: "Direct" },
  { value: "enthusiastic", label: "Enthusiastic" },
];

function Cover() {
  const [jobPosting, setJobPosting] = useState("");
  const [resume, setResume] = useState("");
  const [tone, setTone] = useState<Tone>("confident");
  const [letter, setLetter] = useState("");

  const fn = useServerFn(generateCoverLetter);
  const mutation = useMutation({
    mutationFn: (input: { jobPosting: string; resume: string; tone: Tone }) =>
      fn({ data: input }),
    onSuccess: (data) => {
      setLetter(data.letter);
      toast.success("Cover letter ready");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = jobPosting.trim().length >= 20 && resume.trim().length >= 20;

  function copyLetter() {
    navigator.clipboard.writeText(letter);
    toast.success("Copied to clipboard");
  }

  function downloadLetter() {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cover-letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" richColors />

      {/* Header */}
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-tight">Cover</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            AI cover letters that get replies
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Free while in beta
        </span>
        <h1 className="mt-5 text-4xl font-light leading-tight tracking-tight sm:text-6xl">
          A tailored cover letter,
          <span className="block text-primary">in ten seconds.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground sm:text-base">
          Paste the job posting. Paste your CV. Get a specific, hiring-manager-ready
          letter — not generic AI slop.
        </p>
      </section>

      {/* Tool */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inputs */}
          <div className="space-y-6 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Job posting
              </label>
              <textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder="Paste the full job description..."
                className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your CV / background
              </label>
              <textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste your resume, or a paragraph about your experience, achievements, and skills..."
                className="min-h-[180px] w-full resize-y rounded-lg border border-border bg-background/60 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      tone === t.value
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate({ jobPosting, resume, tone })}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Writing your letter...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate cover letter
                </>
              )}
            </button>
          </div>

          {/* Output */}
          <div className="relative rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your letter
              </label>
              {letter && (
                <div className="flex gap-2">
                  <button
                    onClick={copyLetter}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </button>
                  <button
                    onClick={downloadLetter}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </div>
              )}
            </div>

            {mutation.isPending && (
              <div className="flex h-[420px] items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs uppercase tracking-widest">
                    Drafting...
                  </span>
                </div>
              </div>
            )}

            {!mutation.isPending && !letter && (
              <div className="flex h-[420px] flex-col items-center justify-center text-center text-sm text-muted-foreground/70">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                Your generated letter will appear here.
              </div>
            )}

            {!mutation.isPending && letter && (
              <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {letter}
              </pre>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          Built with Lovable AI · No signup · Nothing stored
        </p>
      </section>
    </main>
  );
}
