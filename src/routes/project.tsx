import { createFileRoute } from "@tanstack/react-router";
import { Board } from "@/components/Board";
import { GOAL } from "@/lib/puzzle";

export const Route = createFileRoute("/project")({
  head: () => ({
    meta: [
      { title: "Project Details — Number Puzzle Solver (3×3)" },
      { name: "description", content: "Problem statement, BFS explanation, queue and visited map, solvability check and complexity for the 8-puzzle project." },
      { property: "og:title", content: "Project Details — Number Puzzle Solver" },
      { property: "og:description", content: "DSA project by Yashi Dubey: solving the 3×3 sliding puzzle with BFS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Project,
});

const sections: { id: string; title: string; body: React.ReactNode }[] = [
  { id: "problem", title: "Problem definition", body: "Given a 3×3 sliding-number puzzle, find a sequence of valid moves that transforms the initial configuration into the goal configuration." },
  { id: "objectives", title: "Objectives", body: <ul className="list-disc pl-5"><li>Represent puzzle states efficiently as strings.</li><li>Find the shortest solution using BFS.</li><li>Detect unsolvable puzzles before searching.</li><li>Visualise the search and solution interactively.</li></ul> },
  { id: "rules", title: "Rules of the puzzle", body: "Tiles 1–8 sit on a 3×3 grid with one empty space. A tile next to the empty space (up, down, left or right) can slide into it. Diagonal moves are not allowed. The goal is 1 2 3 / 4 5 6 / 7 8 _." },
  { id: "bfs", title: "How BFS works", body: <>Breadth-First Search starts at the initial state and explores all states 1 move away, then all states 2 moves away, and so on. For each state we find the empty space (0), compute <code className="font-mono">row = index / 3</code> and <code className="font-mono">col = index % 3</code>, try moves U, D, L, R, keep those inside the grid, swap, and enqueue any state not seen before.</> },
  { id: "queue", title: "Role of the queue", body: "The queue stores states waiting to be explored. FIFO order guarantees that states are processed in order of their distance (number of moves) from the start." },
  { id: "map", title: "Role of the visited map", body: "The map stores every state already discovered, together with its parent state and the move used to reach it. It prevents repeated work and lets us rebuild the shortest path by walking back from the goal to the start." },
  { id: "inversions", title: "Inversion-count solvability check", body: "An inversion is a pair of tiles (ignoring 0) where a larger number appears before a smaller one in reading order. On a 3×3 board each move keeps the parity of inversions the same, so only puzzles with an even inversion count can reach the goal (which has 0 inversions). Odd count → \"This puzzle configuration cannot be solved.\"" },
  { id: "complexity", title: "Time and space complexity", body: "With b ≈ 2–4 moves per state and solution depth d, BFS takes O(b^d) time and space in general. For the 8-puzzle, the state space is bounded by 9!/2 = 181,440 solvable states, so the worst case explores all of them (hardest puzzles need 31 moves). The exact number of explored states and execution time depends on the initial configuration." },
  { id: "applications", title: "Applications of state-space search", body: "Route planning, game AI, robot motion planning, puzzle solving (Rubik's cube, Sokoban), network broadcasting and shortest paths in unweighted graphs." },
  { id: "limitations", title: "Limitations of BFS", body: "BFS stores every discovered state, so memory grows quickly. It is uninformed — it does not know which direction is closer to the goal — so it explores many unnecessary states. For a 4×4 (15-puzzle), plain BFS is impractical." },
  { id: "future", title: "Possible future improvements", body: "A* search with Manhattan-distance heuristic, IDA*, bidirectional BFS, support for larger boards, and an online leaderboard with accounts." },
];

function Project() {
  return (
    <div className="space-y-8">
      <header className="panel grid gap-6 p-8 md:grid-cols-[1fr_auto]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Project Details</p>
          <h1 className="mt-2 text-4xl font-bold">Number Puzzle Solver (3×3)</h1>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Student", "Yashi Dubey"], ["PRN", "125B1B301"],
              ["Algorithm", "Breadth-First Search"], ["Data Structures", "Queue and Map / Visited Set"],
              ["Programming Concepts", "Strings, arrays, loops, conditions, functions, swapping, state representation, and search"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-secondary p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Board state={GOAL} size="md" label="Goal state" solved />
          <p className="font-mono text-xs text-muted-foreground">Goal state · {GOAL}</p>
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="panel scroll-mt-24 p-6">
            <h2 className="text-lg font-bold">{s.title}</h2>
            <div className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}
