import { describe, expect, it } from "vitest";
import { bfs, GOAL, isSolvable, moveForTile, randomPuzzle, validate, applyMove, countInversions } from "@/lib/puzzle";

describe("puzzle logic", () => {
  it("solved puzzle needs 0 moves", () => {
    const r = bfs(GOAL);
    expect(r.status === "solved" && r.moves.length).toBe(0);
  });
  it("one move away", () => {
    const r = bfs("123456708");
    expect(r.status === "solved" && r.moves).toEqual(["R"]);
  });
  it("multi-move shortest length", () => {
    const r = bfs("123405786"); // two moves: R, D
    expect(r.status === "solved" && r.moves.length).toBe(2);
    const hard = bfs("867254301"); // known 31-move worst case
    expect(hard.status === "solved" && hard.moves.length).toBe(31);
  });
  it("path replays to goal", () => {
    const start = "412053786";
    const r = bfs(start);
    if (r.status !== "solved") throw new Error();
    let s: string | null = start;
    for (const m of r.moves) s = applyMove(s!, m);
    expect(s).toBe(GOAL);
  });
  it("validation", () => {
    expect(validate("12345678a")).toMatch(/Only digits/);
    expect(validate("123456789")).toMatch(/Only digits/);
    expect(validate("112345678")).toMatch(/more than once/);
    expect(validate("1234")).toMatch(/nine/);
    expect(validate("123456780")).toBeNull();
  });
  it("unsolvable detection", () => {
    expect(countInversions("213456780")).toBe(1);
    expect(isSolvable("213456780")).toBe(false);
    expect(isSolvable("123456780")).toBe(true);
  });
  it("non-adjacent tile cannot move", () => {
    expect(moveForTile(GOAL, 0)).toBeNull();
    expect(moveForTile(GOAL, 7)).toBe("L");
  });
  it("random puzzles are solvable", () => {
    for (let i = 0; i < 50; i++) expect(isSolvable(randomPuzzle())).toBe(true);
  });
  it("search limit is reported, not 'impossible'", () => {
    expect(bfs("867254301", 100).status).toBe("limit");
  });
});
