import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Lightbulb, Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward, Undo2, Volume2, VolumeX, Wand2, Rewind, Flag, X,
} from "lucide-react";
import { Board } from "@/components/Board";
import {
  GOAL, MOVE_NAME, applyMove, countInversions, describeMove, isSolvable, moveForTile, randomPuzzle, validate, type Move,
} from "@/lib/puzzle";
import { solveInWorker, type SolveHandle } from "@/lib/solver-client";
import { formatTime, getGuestName, saveRecord, setGuestName } from "@/lib/storage";
import { beep, winSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/solver")({
  head: () => ({
    meta: [
      { title: "Puzzle Solver — Play & Solve the 8-Puzzle with BFS" },
      { name: "description", content: "Play the 3×3 sliding puzzle, get hints, and watch the BFS shortest solution animate step by step." },
      { property: "og:title", content: "Puzzle Solver — Number Puzzle Solver" },
      { property: "og:description", content: "Interactive 3×3 puzzle with BFS auto-solve, hints, undo and playback." },
    ],
  }),
  component: Solver,
});

type Solution = { from: string; moves: Move[]; states: string[]; explored: number; timeMs: number };

function Solver() {
  const [initial, setInitial] = useState("123405786");
  const [board, setBoard] = useState("123405786");
  const [undo, setUndo] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [won, setWon] = useState(false);

  const [solution, setSolution] = useState<Solution | null>(null);
  const [solving, setSolving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [solverMsg, setSolverMsg] = useState<{ tone: "ok" | "warn" | "err"; text: string } | null>(null);
  const [limit, setLimit] = useState(200000);
  const handle = useRef<SolveHandle | null>(null);

  const [viewing, setViewing] = useState(false);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);

  const [hint, setHint] = useState<{ text: string; tile: number } | null>(null);
  const [sound, setSound] = useState(false);
  const [manual, setManual] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [name, setName] = useState("Guest");

  useEffect(() => setName(getGuestName()), []);

  // Timer: derived from timestamps so it stays accurate in background tabs.
  useEffect(() => {
    if (!startAt || endAt) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [startAt, endAt]);
  const elapsed = startAt ? (endAt ?? (now || startAt)) - startAt : 0;

  // Playback
  useEffect(() => {
    if (!playing || !solution) return;
    if (step >= solution.moves.length) { setPlaying(false); if (sound) winSound(); return; }
    const id = setTimeout(() => { setStep((s) => s + 1); if (sound) beep(440); }, speed);
    return () => clearTimeout(id);
  }, [playing, step, solution, speed, sound]);

  useEffect(() => () => handle.current?.cancel(), []);

  const recordAbandoned = useCallback(() => {
    if (moves > 0 && !won) saveRecord({ id: crypto.randomUUID(), name, start: initial, solved: false, moves, timeMs: elapsed, date: new Date().toISOString() });
  }, [moves, won, name, initial, elapsed]);

  const loadPuzzle = (s: string) => {
    recordAbandoned();
    handle.current?.cancel(); setSolving(false);
    setInitial(s); setBoard(s); setUndo([]); setMoves(0); setStartAt(null); setEndAt(null); setWon(false);
    setSolution(null); setViewing(false); setStep(0); setPlaying(false); setHint(null); setSolverMsg(null);
  };

  const start = () => {
    loadPuzzle(board === GOAL ? randomPuzzle() : board);
    setStartAt(Date.now()); setNow(Date.now());
  };

  const clickTile = (i: number) => {
    if (viewing || won) return;
    const m = moveForTile(board, i);
    if (!m) { setHint({ text: "That tile isn't next to the empty space.", tile: -1 }); return; }
    const next = applyMove(board, m)!;
    setUndo((u) => [...u, board]);
    setBoard(next);
    setMoves((n) => n + 1);
    setHint(null);
    const t = Date.now();
    if (!startAt) { setStartAt(t); setNow(t); }
    if (sound) beep();
    if (next === GOAL) {
      setWon(true); setEndAt(t);
      if (sound) winSound();
      saveRecord({ id: crypto.randomUUID(), name, start: initial, solved: true, moves: moves + 1, timeMs: t - (startAt ?? t), date: new Date(t).toISOString() });
    }
  };

  const doUndo = () => {
    if (!undo.length || won) return;
    setBoard(undo[undo.length - 1]!); setUndo((u) => u.slice(0, -1)); setMoves((n) => Math.max(0, n - 1)); setHint(null);
  };

  const reset = () => {
    setBoard(initial); setUndo([]); setMoves(0); setStartAt(null); setEndAt(null); setWon(false);
    setViewing(false); setStep(0); setPlaying(false); setHint(null);
  };

  const runSolver = (from: string): Promise<Solution | null> => {
    if (solving) return Promise.resolve(null);
    if (!isSolvable(from)) { setSolverMsg({ tone: "err", text: "This puzzle configuration cannot be solved." }); return Promise.resolve(null); }
    if (solution && solution.from === from) return Promise.resolve(solution);
    setSolving(true); setProgress(0); setSolverMsg(null);
    const h = solveInWorker(from, limit, setProgress);
    handle.current = h;
    return h.promise.then((r) => {
      setSolving(false); handle.current = null;
      if (r === "cancelled") { setSolverMsg({ tone: "warn", text: "Search cancelled." }); return null; }
      if (r.status === "solved") {
        const sol = { from, moves: r.moves, states: r.states, explored: r.explored, timeMs: r.timeMs };
        setSolution(sol);
        setSolverMsg({ tone: "ok", text: `Shortest solution found: ${r.moves.length} moves.` });
        return sol;
      }
      if (r.status === "limit") setSolverMsg({ tone: "warn", text: `Search stopped after exploring ${r.explored.toLocaleString()} states (limit reached) before finding the goal. The puzzle is solvable — raise the limit and try again.` });
      else setSolverMsg({ tone: "err", text: "Search exhausted every reachable state without finding the goal." });
      return null;
    }).catch(() => { setSolving(false); setSolverMsg({ tone: "err", text: "The solver crashed unexpectedly." }); return null; });
  };

  const solveAuto = async () => {
    const sol = await runSolver(board);
    if (sol) { setViewing(true); setStep(0); setPlaying(true); setHint(null); }
  };

  const giveHint = async () => {
    if (won || viewing) return;
    const sol = await runSolver(board);
    if (!sol) return;
    if (!sol.moves.length) { setHint({ text: "Already solved!", tile: -1 }); return; }
    const m = sol.moves[0]!;
    setHint({ text: `Hint: ${describeMove(board, m)}`, tile: applyMove(board, m)!.indexOf("0") });
  };

  const loadManual = () => {
    const err = validate(manual);
    if (err) return setInputError(err);
    if (!isSolvable(manual)) return setInputError(`This puzzle configuration cannot be solved. (Inversions: ${countInversions(manual)}, which is odd.)`);
    setInputError(null); loadPuzzle(manual);
  };

  const shown = viewing && solution ? solution.states[step]! : board;
  const total = solution?.moves.length ?? 0;
  const pct = viewing && total ? Math.round((step / total) * 100) : viewing ? 100 : null;
  const status = solving ? "Solving…" : viewing ? (step === total ? "Playback complete" : "Viewing solution") : won ? "Solved manually" : startAt ? "Playing" : board === GOAL ? "Solved" : "Ready";

  const Btn = ({ onClick, disabled, children, label, tone = "secondary" }: { onClick: () => void; disabled?: boolean; children: React.ReactNode; label: string; tone?: "primary" | "accent" | "secondary" }) => (
    <button onClick={onClick} disabled={disabled} aria-label={label}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35",
        tone === "primary" && "bg-primary text-primary-foreground", tone === "accent" && "bg-accent text-accent-foreground", tone === "secondary" && "bg-secondary hover:bg-muted")}>
      {children}
    </button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="panel flex flex-col items-center gap-5 p-5 sm:p-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Puzzle Solver</h1>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xl tabular-nums" aria-label="Timer">{formatTime(elapsed)}</span>
            <button onClick={() => setSound(!sound)} aria-label={sound ? "Disable sound" : "Enable sound"} className="rounded-lg bg-secondary p-2">
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        <Board state={shown} {...(viewing ? {} : { onTile: clickTile })} highlight={hint && hint.tile >= 0 ? hint.tile : null} solved={shown === GOAL} />

        <div className="min-h-[3rem] text-center text-sm" aria-live="polite">
          {won && <p className="text-lg font-semibold text-success">You solved it in {moves} moves · {formatTime(elapsed)}</p>}
          {viewing && solution && (
            step === total
              ? <p className="text-lg font-semibold text-success">Puzzle Solved Successfully! ({total} moves)</p>
              : <p>Step {step} of {total}: {step === 0 ? "Initial State" : `Move ${MOVE_NAME[solution.moves[step - 1]!]}`}</p>
          )}
          {hint && <p className="text-accent">{hint.text}</p>}
          {solverMsg && <p className={cn(solverMsg.tone === "ok" && "text-success", solverMsg.tone === "warn" && "text-primary", solverMsg.tone === "err" && "text-destructive")}>{solverMsg.text}</p>}
          {solving && <p className="text-muted-foreground">Explored {progress.toLocaleString()} states…</p>}
        </div>

        {!viewing ? (
          <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
            <Btn label="Start" onClick={start} tone="primary"><Flag size={16} />Start</Btn>
            <Btn label="Solve automatically" onClick={solveAuto} disabled={solving || won} tone="accent"><Wand2 size={16} />Solve</Btn>
            <Btn label="Hint" onClick={giveHint} disabled={solving || won || board === GOAL}><Lightbulb size={16} />Hint</Btn>
            <Btn label="Undo" onClick={doUndo} disabled={!undo.length || won}><Undo2 size={16} />Undo</Btn>
            <Btn label="Reset" onClick={reset} disabled={board === initial && !startAt}><RotateCcw size={16} />Reset</Btn>
            <Btn label="Generate random puzzle" onClick={() => loadPuzzle(randomPuzzle())}><Shuffle size={16} />Random</Btn>
            {solving && <Btn label="Cancel solver" onClick={() => handle.current?.cancel()}><X size={16} />Cancel</Btn>}
          </div>
        ) : solution && (
          <div className="w-full max-w-xl space-y-3">
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Btn label="Previous step" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}><SkipBack size={16} />Prev</Btn>
              {playing
                ? <Btn label="Pause animation" onClick={() => setPlaying(false)} tone="primary"><Pause size={16} />Pause</Btn>
                : <Btn label="Play animation" onClick={() => setPlaying(true)} disabled={step === total} tone="primary"><Play size={16} />{step > 0 && step < total ? "Resume" : "Play"}</Btn>}
              <Btn label="Next step" onClick={() => { setPlaying(false); setStep((s) => Math.min(total, s + 1)); }} disabled={step === total}><SkipForward size={16} />Next</Btn>
              <Btn label="Restart animation" onClick={() => { setStep(0); setPlaying(false); }} disabled={step === 0 && !playing}><Rewind size={16} />Restart</Btn>
              <Btn label="Exit playback" onClick={() => { setViewing(false); setPlaying(false); }}><X size={16} />Exit</Btn>
            </div>
            <label className="flex items-center gap-3 text-xs text-muted-foreground">
              Speed
              <input type="range" min={150} max={1500} step={50} value={1650 - speed} onChange={(e) => setSpeed(1650 - +e.target.value)} className="flex-1 accent-[var(--primary)]" aria-label="Playback speed" />
            </label>
            <ol className="flex flex-wrap gap-1.5 font-mono text-xs">
              <li><button onClick={() => { setPlaying(false); setStep(0); }} className={cn("rounded-md px-2 py-1", step === 0 ? "bg-primary text-primary-foreground" : "bg-secondary")}>Start</button></li>
              {solution.moves.map((m, i) => (
                <li key={i}><button onClick={() => { setPlaying(false); setStep(i + 1); }} aria-label={`Go to step ${i + 1}`}
                  className={cn("rounded-md px-2 py-1", step === i + 1 ? "bg-primary text-primary-foreground" : "bg-secondary")}>{i + 1}:{m}</button></li>
              ))}
            </ol>
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <div className="panel p-5">
          <h2 className="font-semibold">Live statistics</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              ["Your moves", moves],
              ["Timer", formatTime(elapsed)],
              ["BFS optimal moves", solution ? solution.moves.length : "—"],
              ["States explored", solution ? solution.explored.toLocaleString() : solving ? progress.toLocaleString() : "—"],
              ["Solver time", solution ? `${solution.timeMs.toFixed(1)} ms` : "—"],
              ["Solution step", viewing ? `${step}/${total}` : "—"],
              ["Progress", pct !== null ? `${pct}%` : "—"],
              ["Status", status],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded-lg bg-secondary p-3">
                <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="mt-0.5 font-mono font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <label className="mt-4 block text-xs text-muted-foreground">
            BFS state limit
            <select value={limit} onChange={(e) => setLimit(+e.target.value)} className="mt-1 w-full rounded-lg bg-secondary p-2 text-sm text-foreground">
              {[1000, 10000, 50000, 200000, 500000].map((n) => <option key={n} value={n}>{n.toLocaleString()} states</option>)}
            </select>
          </label>
        </div>

        <div className="panel p-5">
          <h2 className="font-semibold">Enter a puzzle</h2>
          <p className="mt-1 text-xs text-muted-foreground">Type digits 0–8 row by row. 0 is the empty space.</p>
          <div className="mt-3 grid w-40 grid-cols-3 gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <input key={i} inputMode="numeric" maxLength={1} aria-label={`Cell ${i + 1}`} value={manual[i] ?? ""}
                onChange={(e) => {
                  const v = e.target.value.slice(-1);
                  const arr = manual.padEnd(9, " ").split(""); arr[i] = v || " ";
                  setManual(arr.join("").trimEnd()); setInputError(null);
                  if (v) (e.target.nextElementSibling as HTMLInputElement | null)?.focus();
                }}
                className="aspect-square w-full rounded-lg bg-secondary text-center font-mono text-lg font-bold focus:outline-2 focus:outline-ring" />
            ))}
          </div>
          <input value={manual} onChange={(e) => { setManual(e.target.value.slice(0, 12)); setInputError(null); }} placeholder="or type e.g. 123405786"
            aria-label="Puzzle digits" className="mt-3 w-full rounded-lg bg-secondary p-2 font-mono text-sm" />
          {inputError && <p className="mt-2 text-sm text-destructive" role="alert">{inputError}</p>}
          <button onClick={() => loadManual()} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Load puzzle</button>
        </div>

        <div className="panel p-5">
          <label className="text-xs text-muted-foreground">
            Guest name (for your local leaderboard)
            <input value={name} maxLength={20} onChange={(e) => { setName(e.target.value); setGuestName(e.target.value || "Guest"); }}
              className="mt-1 w-full rounded-lg bg-secondary p-2 text-sm text-foreground" />
          </label>
        </div>
      </aside>
    </div>
  );
}
