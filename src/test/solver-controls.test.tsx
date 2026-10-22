import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bfs, type BfsResult } from "@/lib/puzzle";

const worker = vi.hoisted(() => ({ solve: vi.fn() }));
vi.mock("@/lib/solver-client", () => ({ solveInWorker: worker.solve }));
import { Solver } from "@/routes/solver";

type Pending = { start: string; resolve: (r: BfsResult | "cancelled") => void; cancel: ReturnType<typeof vi.fn> };
let pending: Pending[];
const button = (name: string) => screen.getByRole("button", { name, exact: true });
const click = (name: string) => fireEvent.click(button(name));
function load(start: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Puzzle digits" }), { target: { value: start } });
  click("Load puzzle");
}
async function finish(index = 0) {
  const job = pending[index];
  if (!job) throw new Error("Missing search");
  await act(async () => job.resolve(bfs(job.start)));
}

beforeEach(() => {
  vi.useFakeTimers(); pending = []; worker.solve.mockReset(); localStorage.clear();
  worker.solve.mockImplementation((start: string) => {
    let resolve: Pending["resolve"] = () => {};
    const promise = new Promise<BfsResult | "cancelled">((res) => { resolve = res; });
    const cancel = vi.fn(); // Deliberately allow late results after cancellation.
    pending.push({ start, resolve, cancel });
    return { promise, cancel };
  });
  render(<Solver />);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("solver controls", () => {
  it("Hint uses BFS to highlight tile 8 without moving the one-move puzzle", async () => {
    load("123456708"); click("Hint"); await finish();
    expect(pending[0]?.start).toBe("123456708");
    expect(screen.getByText("Hint: Move the empty space Right (slide tile 8 left).")).toBeInTheDocument();
    expect(button("Tile 8, row 3, column 3")).toHaveClass("ring-4");
    expect(button("Undo")).toBeDisabled();
  });
  it("Solve plays the actual one-move BFS path to the goal", async () => {
    load("123456708"); click("Solve automatically"); await finish();
    expect(screen.getByRole("grid", { name: "Puzzle board" })).not.toHaveClass("ring-success");
    await act(async () => { vi.advanceTimersByTime(500); });
    expect(screen.getByRole("grid", { name: "Puzzle board" })).toHaveClass("ring-success");
    expect(screen.getByText("Puzzle Solved Successfully! (1 moves)")).toBeInTheDocument();
  });
  it("Undo works after a winning move and can undo consecutively to an empty stack", () => {
    load("123405786"); click("Tile 5, row 2, column 3"); click("Tile 6, row 3, column 3");
    expect(button("Undo")).toBeEnabled(); click("Undo");
    expect(button("Tile 6, row 3, column 3")).toBeInTheDocument(); click("Undo");
    expect(button("Tile 5, row 2, column 3")).toBeInTheDocument(); expect(button("Undo")).toBeDisabled();
    click("Tile 5, row 2, column 3"); expect(button("Undo")).toBeEnabled();
  });
  it("Reset clears a hint on an untouched board and allows manual play", async () => {
    load("123456708"); click("Hint"); await finish(); click("Reset");
    expect(button("Tile 8, row 3, column 3")).not.toHaveClass("ring-4");
    expect(button("Reset")).toBeDisabled(); expect(button("Undo")).toBeDisabled();
    click("Tile 8, row 3, column 3"); expect(button("Tile 8, row 3, column 2")).toBeInTheDocument();
  });
  it("Reset stops playback and clears solution steps and timers", async () => {
    load("123456708"); click("Solve automatically"); await finish(); click("Reset");
    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(button("Tile 8, row 3, column 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to step 1" })).not.toBeInTheDocument();
    expect(button("Hint")).toBeEnabled(); expect(screen.getByLabelText("Timer")).toHaveTextContent("0:00.0");
  });
  it("discards stale Hint and Solve completions after Reset", async () => {
    load("123456708"); click("Hint"); click("Reset"); await finish();
    expect(screen.queryByText(/Hint: Move/)).not.toBeInTheDocument();
    click("Solve automatically"); click("Reset"); await finish(1);
    expect(button("Tile 8, row 3, column 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Exit playback" })).not.toBeInTheDocument();
  });
  it("invalidates searches on moves and Undo while preserving replacement ownership", async () => {
    load("123405786"); click("Hint"); click("Tile 5, row 2, column 3"); await finish();
    expect(screen.queryByText(/Hint: Move/)).not.toBeInTheDocument();
    click("Solve automatically"); click("Undo"); click("Hint"); await finish(1);
    expect(button("Hint")).toBeDisabled(); await finish(2);
    expect(screen.getByText(/Hint: Move the empty space Right/)).toBeInTheDocument();
  });
  it("preserves manual Undo through Hint and Solve preview then Exit", async () => {
    click("Tile 5, row 2, column 3"); click("Hint"); await finish();
    click("Solve automatically"); await act(async () => {});
    await act(async () => { vi.advanceTimersByTime(500); }); click("Exit playback"); click("Undo");
    expect(button("Tile 5, row 2, column 3")).toBeInTheDocument(); expect(button("Undo")).toBeDisabled();
  });
  it("rejects invalid and unsolvable input without changing the board or starting BFS", () => {
    load("112345678"); expect(screen.getByRole("alert")).toHaveTextContent("appears more than once");
    load("123456870"); expect(screen.getByRole("alert")).toHaveTextContent("cannot be solved");
    expect(button("Tile 5, row 2, column 3")).toBeInTheDocument(); expect(worker.solve).not.toHaveBeenCalled();
  });
  it("admits only one search, and recovers from worker startup failure", async () => {
    click("Hint"); click("Solve automatically"); expect(worker.solve).toHaveBeenCalledTimes(1);
    click("Cancel solver"); worker.solve.mockImplementationOnce(() => { throw new Error("Startup failed"); });
    click("Hint"); await act(async () => {}); expect(button("Hint")).toBeEnabled();
    click("Solve automatically"); await finish(1); expect(screen.getByRole("button", { name: "Pause animation" })).toBeInTheDocument();
  });
});