import { bfs } from "./puzzle";

self.onmessage = (e: MessageEvent<{ start: string; limit: number }>) => {
  const { start, limit } = e.data;
  const result = bfs(start, limit, (explored, queued) => {
    (self as unknown as Worker).postMessage({ type: "progress", explored, queued });
  });
  (self as unknown as Worker).postMessage({ type: "done", result });
};
