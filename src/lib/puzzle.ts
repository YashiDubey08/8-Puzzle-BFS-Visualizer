// Core 8-puzzle logic. A state is a 9-character string; '0' is the empty space.
export const GOAL = "123456780";
export type Move = "U" | "D" | "L" | "R";

export const MOVES: { m: Move; dr: number; dc: number }[] = [
  { m: "U", dr: -1, dc: 0 },
  { m: "D", dr: 1, dc: 0 },
  { m: "L", dr: 0, dc: -1 },
  { m: "R", dr: 0, dc: 1 },
];

export const MOVE_NAME: Record<Move, string> = { U: "Up", D: "Down", L: "Left", R: "Right" };
const OPPOSITE: Record<Move, Move> = { U: "D", D: "U", L: "R", R: "L" };

/** Validate raw input. Returns an error message, or null if valid. */
export function validate(input: string): string | null {
  if (/[^0-8]/.test(input)) return "Only digits 0–8 are allowed (0 is the empty space).";
  if (input.length < 9) return `Enter all nine digits (${input.length}/9 entered).`;
  if (input.length > 9) return "Enter exactly nine digits.";
  const seen = new Set<string>();
  for (const ch of input) {
    if (seen.has(ch)) return `Digit ${ch} appears more than once. Each of 0–8 must appear exactly once.`;
    seen.add(ch);
  }
  return null;
}

/** Inversion count, ignoring the empty tile (0). */
export function countInversions(s: string): number {
  let inv = 0;
  for (let i = 0; i < 9; i++)
    for (let j = i + 1; j < 9; j++)
      if (s[i] !== "0" && s[j] !== "0" && s[i] > s[j]) inv++;
  return inv;
}

/** For a 3×3 board, even inversions = solvable relative to 123456780. */
export function isSolvable(s: string): boolean {
  return countInversions(s) % 2 === 0;
}

function swap(s: string, i: number, j: number): string {
  const a = s.split("");
  [a[i], a[j]] = [a[j], a[i]];
  return a.join("");
}

/** Apply a move of the empty space. Returns null if it leaves the grid. */
export function applyMove(s: string, m: Move): string | null {
  const z = s.indexOf("0");
  const row = Math.floor(z / 3), col = z % 3;
  const d = MOVES.find((x) => x.m === m)!;
  const nr = row + d.dr, nc = col + d.dc;
  if (nr < 0 || nr > 2 || nc < 0 || nc > 2) return null;
  return swap(s, z, nr * 3 + nc);
}

export function neighbors(s: string): { move: Move; state: string }[] {
  const out: { move: Move; state: string }[] = [];
  for (const { m } of MOVES) {
    const n = applyMove(s, m);
    if (n) out.push({ move: m, state: n });
  }
  return out;
}

/** If the tile at index i is adjacent to the empty space, return the empty-space move that slides it. */
export function moveForTile(s: string, i: number): Move | null {
  const z = s.indexOf("0");
  const zr = Math.floor(z / 3), zc = z % 3, r = Math.floor(i / 3), c = i % 3;
  if (r === zr - 1 && c === zc) return "U";
  if (r === zr + 1 && c === zc) return "D";
  if (r === zr && c === zc - 1) return "L";
  if (r === zr && c === zc + 1) return "R";
  return null;
}

/** Describe a move in terms of the tile that slides. */
export function describeMove(s: string, m: Move): string {
  const after = applyMove(s, m);
  if (!after) return "";
  const tile = s[after.indexOf("0")];
  return `Move the empty space ${MOVE_NAME[m]} (slide tile ${tile} ${MOVE_NAME[OPPOSITE[m]].toLowerCase()}).`;
}

export type BfsResult =
  | { status: "solved"; moves: Move[]; states: string[]; explored: number; timeMs: number }
  | { status: "limit"; explored: number; timeMs: number }
  | { status: "exhausted"; explored: number; timeMs: number };

/**
 * Breadth-First Search.
 * Queue: array + head pointer (O(1) dequeue, FIFO).
 * Map (visited): state -> [parentState, move] used to rebuild the shortest path.
 */
export function bfs(start: string, limit = 500000, onProgress?: (explored: number, queued: number) => void): BfsResult {
  const t0 = performance.now();
  const parent = new Map<string, [string, Move | ""]>();
  parent.set(start, ["", ""]);
  const queue: string[] = [start];
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    if (cur === GOAL) {
      const moves: Move[] = [];
      const states: string[] = [];
      let s = cur;
      while (s !== start) {
        const [p, m] = parent.get(s)!;
        states.push(s);
        moves.push(m as Move);
        s = p;
      }
      states.push(start);
      return { status: "solved", moves: moves.reverse(), states: states.reverse(), explored: head, timeMs: performance.now() - t0 };
    }
    if (head >= limit) return { status: "limit", explored: head, timeMs: performance.now() - t0 };
    if (onProgress && head % 5000 === 0) onProgress(head, queue.length - head);
    for (const n of neighbors(cur)) {
      if (!parent.has(n.state)) {
        parent.set(n.state, [cur, n.move]);
        queue.push(n.state);
      }
    }
  }
  return { status: "exhausted", explored: head, timeMs: performance.now() - t0 };
}

/** Random solvable puzzle: random walk of valid moves from the goal (never undoing the last move). */
export function randomPuzzle(steps = 40, rnd = Math.random): string {
  let s = GOAL;
  let last: Move | null = null;
  for (let i = 0; i < steps; i++) {
    const opts = neighbors(s).filter((n) => !last || n.move !== OPPOSITE[last]);
    const pick = opts[Math.floor(rnd() * opts.length)];
    s = pick.state;
    last = pick.move;
  }
  return s === GOAL ? randomPuzzle(steps, rnd) : s;
}

/** Step-by-step BFS used by the visualizer: real queue, real visited set. */
export class BfsStepper {
  queue: { state: string; depth: number }[] = [];
  head = 0;
  visited = new Set<string>();
  done = false;
  found: string | null = null;
  constructor(public start: string) {
    this.queue.push({ state: start, depth: 0 });
    this.visited.add(start);
  }
  step(): { current: string; depth: number; added: string[]; skipped: string[]; isGoal: boolean } | null {
    if (this.done || this.head >= this.queue.length) { this.done = true; return null; }
    const { state, depth } = this.queue[this.head++];
    if (state === GOAL) { this.done = true; this.found = state; return { current: state, depth, added: [], skipped: [], isGoal: true }; }
    const added: string[] = [], skipped: string[] = [];
    for (const n of neighbors(state)) {
      if (this.visited.has(n.state)) skipped.push(n.state);
      else { this.visited.add(n.state); this.queue.push({ state: n.state, depth: depth + 1 }); added.push(n.state); }
    }
    return { current: state, depth, added, skipped, isGoal: false };
  }
  pending() { return this.queue.slice(this.head); }
}
