import type { BfsResult } from "./puzzle";

export type SolveHandle = { promise: Promise<BfsResult | "cancelled">; cancel: () => void };

/** Run BFS in a Web Worker so the page never freezes. Terminating the worker cancels it. */
export function solveInWorker(start: string, limit: number, onProgress?: (explored: number) => void): SolveHandle {
  const worker = new Worker(new URL("./bfs.worker.ts", import.meta.url), { type: "module" });
  let resolveFn: (v: BfsResult | "cancelled") => void = () => {};
  const promise = new Promise<BfsResult | "cancelled">((res, rej) => {
    resolveFn = res;
    worker.onmessage = (e) => {
      if (e.data.type === "progress") onProgress?.(e.data.explored);
      else { res(e.data.result); worker.terminate(); }
    };
    worker.onerror = (err) => { rej(err); worker.terminate(); };
  });
  worker.postMessage({ start, limit });
  return { promise, cancel: () => { worker.terminate(); resolveFn("cancelled"); } };
}
