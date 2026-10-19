# Number Puzzle Solver (3×3)

DSA project by **Yashi Dubey** (PRN 125B1B301). Solves the 3×3 sliding-number puzzle with **Breadth-First Search** using a **Queue** and a **Map**.

## Features
- Interactive board (click tiles), manual input with validation, random solvable puzzles
- BFS auto-solve in a Web Worker (non-blocking, cancellable, configurable state limit)
- Inversion-count solvability check before searching
- Step-by-step solution playback (play / pause / resume / prev / next / restart, speed)
- Hints from the real BFS path, undo, reset, timestamp-based timer, optional sounds
- Live BFS visualizer (real queue + visited set), local stats, history and guest leaderboard

## Architecture
```
src/lib/puzzle.ts        core logic: validate, inversions, moves, bfs(), randomPuzzle(), BfsStepper
src/lib/bfs.worker.ts    runs bfs() off the main thread
src/lib/solver-client.ts promise wrapper + cancellation
src/lib/storage.ts       localStorage guest history and leaderboard ranking
src/components/Board.tsx animated 3×3 board
src/routes/              /, /solver, /visualizer, /stats, /project
```

## Algorithm
State = 9-char string, `0` = empty, goal `123456780`. BFS dequeues the oldest state (array + head pointer), finds `0`, computes `row = i/3`, `col = i%3`, tries U/D/L/R, and enqueues unseen neighbours while storing `state -> [parent, move]` in a Map. When the goal is dequeued the path is rebuilt by walking parents back to the start.

## Setup
```
bun install
bun run dev
bun run test   # runs src/test/puzzle.test.ts
```
No environment variables are required. A shared online leaderboard / GitHub sign-in is optional and not configured; the game works fully without it.

## Deploy
Click **Publish** in Lovable. Connect GitHub from Lovable's GitHub integration to sync source code.
