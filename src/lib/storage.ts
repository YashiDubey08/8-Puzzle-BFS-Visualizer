// Guest history stored locally in the browser (localStorage).
export type GameRecord = {
  id: string;
  name: string;
  start: string;
  solved: boolean;
  moves: number;
  timeMs: number;
  date: string;
};

const KEY = "nps-history-v1";
const NAME_KEY = "nps-guest-name";

export function loadHistory(): GameRecord[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveRecord(r: GameRecord) {
  const all = [r, ...loadHistory()].slice(0, 200);
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function clearHistory() { localStorage.removeItem(KEY); }
export function getGuestName() { return (typeof window !== "undefined" && localStorage.getItem(NAME_KEY)) || "Guest"; }
export function setGuestName(n: string) { localStorage.setItem(NAME_KEY, n.slice(0, 20)); }

/** Rank: fewest manual moves, then fastest time. */
export function rankLeaderboard(rs: GameRecord[]) {
  return rs.filter((r) => r.solved).sort((a, b) => a.moves - b.moves || a.timeMs - b.timeMs);
}

export function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${Math.floor((ms % 1000) / 100)}`;
}
