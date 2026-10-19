import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Board } from "@/components/Board";
import { GOAL, applyMove, moveForTile } from "@/lib/puzzle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Number Puzzle Solver — Explore BFS on the 8-Puzzle" },
      { name: "description", content: "Solve any 3×3 sliding-number puzzle with Breadth-First Search and watch the shortest solution play out." },
      { property: "og:title", content: "Number Puzzle Solver (3×3)" },
      { property: "og:description", content: "Explore the puzzle. Understand the algorithm. Find the shortest solution." },
    ],
  }),
  component: Home,
});

function Home() {
  const [preview, setPreview] = useState("123405786");
  const click = (i: number) => {
    const m = moveForTile(preview, i);
    if (m) setPreview(applyMove(preview, m)!);
  };
  const btn = "rounded-xl px-5 py-3 text-sm font-semibold transition hover:-translate-y-0.5";
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-12 pt-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">DSA Project · BFS · Queue + Map</p>
          <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            NUMBER PUZZLE <span className="text-primary">SOLVER</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">Explore the puzzle. Understand the algorithm. Find the shortest solution.</p>
          <p className="mt-4 max-w-lg text-sm text-muted-foreground">
            A 3×3 sliding-number puzzle solved with Breadth-First Search. BFS explores every arrangement level by level,
            so the first time it reaches the goal it has found the fewest possible moves.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/solver" className={`${btn} bg-primary text-primary-foreground`}>Start Solving</Link>
            <Link to="/visualizer" className={`${btn} bg-accent text-accent-foreground`}>Explore BFS</Link>
            <Link to="/project" hash="bfs" className={`${btn} bg-secondary`}>How It Works</Link>
            <Link to="/project" className={`${btn} border border-border`}>View Project Details</Link>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3">
          <Board state={preview} onTile={click} solved={preview === GOAL} label="Preview board" />
          <p className="text-xs text-muted-foreground">
            {preview === GOAL ? "Solved! " : "Try it — click a tile next to the gap. "}
            <button className="underline" onClick={() => setPreview("123405786")}>Reset</button>
          </p>
        </div>
      </section>

      <section id="about" className="panel p-8">
        <h2 className="text-2xl font-bold">About</h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Student Name", "Yashi Dubey"],
            ["PRN", "125B1B301"],
            ["Project", "Number Puzzle Solver (3×3)"],
            ["Algorithm", "Breadth-First Search"],
            ["Data Structures", "Queue and Map"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-secondary p-4">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
              <dd className="mt-1 font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
