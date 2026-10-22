import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { clearHistory, formatTime, loadHistory, rankLeaderboard, type GameRecord } from "@/lib/storage";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Statistics & Leaderboard — Number Puzzle Solver" },
      { name: "description", content: "Your guest puzzle history, best times, best move counts and local leaderboard." },
      { property: "og:title", content: "Statistics & Leaderboard" },
      { property: "og:description", content: "Track puzzles played, solved, and your best performances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Stats,
});

function Stats() {
  const [h, setH] = useState<GameRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setH(loadHistory()); setLoaded(true); }, []);
  const solved = h.filter((r) => r.solved);
  const best = solved.length ? Math.min(...solved.map((r) => r.timeMs)) : null;
  const bestMoves = solved.length ? Math.min(...solved.map((r) => r.moves)) : null;
  const avg = solved.length >= 2 ? solved.reduce((a, r) => a + r.timeMs, 0) / solved.length : null;
  const board = rankLeaderboard(h).slice(0, 10);

  const cards: [string, string][] = [
    ["Puzzles played", String(h.length)],
    ["Solved manually", String(solved.length)],
    ["Best time", best !== null ? formatTime(best) : "—"],
    ["Best move count", bestMoves !== null ? String(bestMoves) : "—"],
    ["Average time", avg !== null ? formatTime(avg) : solved.length ? "Need 2+ solves" : "—"],
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Statistics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Guest stats are stored in this browser only. Clearing browser storage will erase them.</p>
        </div>
        <button disabled={!h.length} onClick={() => { if (confirm("Delete all local history?")) { clearHistory(); setH([]); } }}
          className="rounded-xl border border-destructive px-4 py-2 text-sm text-destructive disabled:opacity-40">Reset history</button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([k, v]) => (
          <div key={k} className="panel p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className="mt-1 font-mono text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="text-xl font-bold">Leaderboard</h2>
          <p className="mt-1 text-xs text-muted-foreground">Manual solves only. Ranked by fewest moves, then fastest time. BFS auto-solves never count.</p>
          {board.length ? (
            <ol className="mt-4 space-y-2">
              {board.map((r, i) => (
                <li key={r.id} className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2 text-sm">
                  <span className="w-6 font-mono text-primary">#{i + 1}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="font-mono">{r.moves} mv</span>
                  <span className="w-16 text-right font-mono text-muted-foreground">{formatTime(r.timeMs)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-muted-foreground">{loaded ? <>No manual solves yet. <Link to="/solver" className="text-primary underline">Play a puzzle</Link>.</> : "Loading…"}</p>}
          <p className="mt-4 rounded-lg border border-border p-3 text-xs text-muted-foreground">
            Online leaderboard: not configured. This leaderboard is local to your device. A shared online leaderboard needs a backend to be enabled first.
          </p>
        </section>

        <section className="panel p-6">
          <h2 className="text-xl font-bold">Recent games</h2>
          {h.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Start</th><th>Result</th><th>Moves</th><th>Time</th><th>Date</th></tr></thead>
                <tbody>
                  {h.slice(0, 15).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{r.start}</td>
                      <td className={r.solved ? "text-success" : "text-muted-foreground"}>{r.solved ? "Solved" : "Unfinished"}</td>
                      <td className="font-mono">{r.moves}</td>
                      <td className="font-mono">{formatTime(r.timeMs)}</td>
                      <td className="text-xs text-muted-foreground">{new Date(r.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="mt-4 text-sm text-muted-foreground">No games yet.</p>}
        </section>
      </div>
    </div>
  );
}
