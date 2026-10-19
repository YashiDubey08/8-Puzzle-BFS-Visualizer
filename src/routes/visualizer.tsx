import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { BfsStepper, GOAL, isSolvable, validate } from "@/lib/puzzle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/visualizer")({
  head: () => ({
    meta: [
      { title: "BFS Visualizer — Watch the Queue and Visited Set" },
      { name: "description", content: "Step through a real Breadth-First Search on the 8-puzzle: see the FIFO queue, visited states and search depth." },
      { property: "og:title", content: "BFS Algorithm Visualizer" },
      { property: "og:description", content: "Real BFS execution on a 3×3 sliding puzzle, one step at a time." },
    ],
  }),
  component: Visualizer,
});

type Ev = ReturnType<BfsStepper["step"]>;

function Visualizer() {
  const [startInput, setStartInput] = useState("123405786");
  const [err, setErr] = useState<string | null>(null);
  const stepper = useRef(new BfsStepper("123405786"));
  const [ev, setEv] = useState<Ev>(null);
  const [, force] = useState(0);
  const [auto, setAuto] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const s = stepper.current;
  const doStep = () => {
    const e = s.step();
    setEv(e);
    if (e) setLog((l) => [
      e.isGoal ? `✓ Dequeued ${e.current} — it's the GOAL at depth ${e.depth}!`
        : `Dequeued ${e.current} (depth ${e.depth}) → added ${e.added.length}, skipped ${e.skipped.length} visited`, ...l].slice(0, 12));
    force((n) => n + 1);
  };

  useEffect(() => {
    if (!auto) return;
    if (s.done) { setAuto(false); return; }
    const id = setTimeout(doStep, 350);
    return () => clearTimeout(id);
  });

  const restart = (start = startInput) => {
    const e = validate(start);
    if (e) return setErr(e);
    if (!isSolvable(start)) return setErr("This puzzle configuration cannot be solved.");
    setErr(null); stepper.current = new BfsStepper(start); setEv(null); setLog([]); setAuto(false);
  };

  const pending = s.pending();
  const steps = [
    "Start with the initial state", "Add it to the queue", "Remove the front state", "Check whether it is the goal",
    "Generate valid neighbouring states", "Skip already-visited states", "Add new states to the queue", "Repeat until the goal is found",
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Algorithm Visualizer</p>
        <h1 className="mt-2 text-4xl font-bold">How BFS searches</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Everything below is the real search running in your browser, one state at a time. Pick an easy start (few moves away) so you can follow it.
        </p>
      </header>

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs text-muted-foreground">Start state
          <input value={startInput} onChange={(e) => setStartInput(e.target.value)} className="mt-1 block w-36 rounded-lg bg-secondary p-2 font-mono text-sm text-foreground" />
        </label>
        <button onClick={() => restart()} className="rounded-xl bg-secondary px-4 py-2 text-sm">Load</button>
        {["123405786", "120453786", "413026758"].map((p) => (
          <button key={p} onClick={() => { setStartInput(p); restart(p); }} className="rounded-xl border border-border px-3 py-2 font-mono text-xs">{p}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={doStep} disabled={s.done} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">Step</button>
          <button onClick={() => setAuto(!auto)} disabled={s.done} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-40">{auto ? "Pause" : "Auto-run"}</button>
          <button onClick={() => restart()} className="rounded-xl bg-secondary px-4 py-2 text-sm">Restart</button>
        </div>
        {err && <p className="w-full text-sm text-destructive">{err}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel p-5">
          <h2 className="font-semibold">Current state (front of queue)</h2>
          <div className="mt-4 flex justify-center">
            <Board state={ev?.current ?? s.start} size="md" solved={!!ev?.isGoal} />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-secondary p-2"><dt className="text-[10px] uppercase text-muted-foreground">Visited</dt><dd className="font-mono font-bold">{s.visited.size}</dd></div>
            <div className="rounded-lg bg-secondary p-2"><dt className="text-[10px] uppercase text-muted-foreground">In queue</dt><dd className="font-mono font-bold">{pending.length}</dd></div>
            <div className="rounded-lg bg-secondary p-2"><dt className="text-[10px] uppercase text-muted-foreground">Depth</dt><dd className="font-mono font-bold">{ev?.depth ?? 0}</dd></div>
          </dl>
          {s.found && <p className="mt-3 text-center font-semibold text-success">Goal reached at depth {ev?.depth} — the shortest solution.</p>}
        </div>

        <div className="panel p-5 lg:col-span-2">
          <h2 className="font-semibold">Neighbours generated by moving the empty space</h2>
          {ev && !ev.isGoal ? (
            <div className="mt-4 flex flex-wrap gap-4">
              {ev.added.map((st) => <div key={st} className="text-center"><Board state={st} size="sm" /><p className="mt-1 text-xs text-success">added</p></div>)}
              {ev.skipped.map((st) => <div key={st} className="text-center opacity-40"><Board state={st} size="sm" /><p className="mt-1 text-xs">visited — skip</p></div>)}
            </div>
          ) : <p className="mt-4 text-sm text-muted-foreground">{ev?.isGoal ? "Goal found — search stops." : "Press Step to dequeue the first state."}</p>}

          <h3 className="mt-6 text-sm font-semibold">Queue (FIFO) — front on the left</h3>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {pending.slice(0, 14).map((q, i) => (
              <div key={q.state + i} className={cn("shrink-0 rounded-lg p-1.5 text-center", i === 0 ? "bg-primary/20 ring-1 ring-primary" : "bg-secondary")}>
                <Board state={q.state} size="sm" />
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">d{q.depth}</p>
              </div>
            ))}
            {pending.length > 14 && <div className="self-center px-2 text-xs text-muted-foreground">+{pending.length - 14} more</div>}
            {!pending.length && <p className="text-sm text-muted-foreground">Queue empty.</p>}
          </div>
          <ul className="mt-4 space-y-1 font-mono text-xs text-muted-foreground" aria-live="polite">
            {log.map((l, i) => <li key={i} className={i === 0 ? "text-foreground" : ""}>{l}</li>)}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-xl font-bold">The search process</h2>
          <ol className="mt-4 space-y-2">
            {steps.map((t, i) => <li key={t} className="flex gap-3 text-sm"><span className="font-mono text-primary">{i + 1}.</span>{t}</li>)}
          </ol>
        </section>
        <section className="panel space-y-4 p-6 text-sm text-muted-foreground">
          <div><h3 className="font-semibold text-foreground">Queue</h3>BFS always explores the <em>oldest</em> waiting state first (First-In, First-Out), so it finishes every state at depth 1 before depth 2, and so on.</div>
          <div><h3 className="font-semibold text-foreground">Visited states</h3>Each arrangement is recorded the first time it's seen, so the same board is never explored twice. This keeps the search finite (at most 181,440 solvable states).</div>
          <div><h3 className="font-semibold text-foreground">Puzzle states</h3>A state is a 9-character string like <code className="font-mono">123405786</code>. Swapping 0 with a neighbour creates a new state.</div>
          <div><h3 className="font-semibold text-foreground">Shortest path</h3>Every move costs the same (1). Because BFS explores level by level, the first time it reaches {GOAL} it has used the fewest moves possible.</div>
        </section>
      </div>
    </div>
  );
}
