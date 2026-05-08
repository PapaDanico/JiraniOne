import { describe, it, expect } from "vitest";
import { safeCsvCell, csvRow } from "./csv.js";

describe("safeCsvCell — formula-injection escaping", () => {
  it("wraps plain strings in double quotes", () => {
    expect(safeCsvCell("hello")).toBe('"hello"');
  });

  it("escapes internal double quotes by doubling", () => {
    expect(safeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("prefixes = formulas with a single quote", () => {
    expect(safeCsvCell("=SUM(A1)")).toBe('"\'=SUM(A1)"');
  });

  it("prefixes + triggers", () => {
    expect(safeCsvCell("+cmd")).toBe('"\'+cmd"');
  });

  it("prefixes - triggers", () => {
    expect(safeCsvCell("-1+2")).toBe('"\'-1+2"');
  });

  it("prefixes @ triggers", () => {
    expect(safeCsvCell("@SUM")).toBe('"\'@SUM"');
  });

  it("prefixes tab-leading cell", () => {
    expect(safeCsvCell("\tcmd")).toBe('"\'\tcmd"');
  });

  it("prefixes CR-leading cell", () => {
    expect(safeCsvCell("\rcmd")).toBe('"\'\rcmd"');
  });

  it("renders null/undefined as empty quoted cell", () => {
    expect(safeCsvCell(null)).toBe('""');
    expect(safeCsvCell(undefined)).toBe('""');
  });

  it("converts numbers to string", () => {
    expect(safeCsvCell(42)).toBe('"42"');
  });

  it("converts Date objects to ISO string", () => {
    const d = new Date("2024-01-15T10:00:00.000Z");
    expect(safeCsvCell(d)).toBe('"2024-01-15T10:00:00.000Z"');
  });

  it("handles a realistic formula-injection attack payload", () => {
    const payload = "=cmd|'/c calc'!A1";
    const cell = safeCsvCell(payload);
    expect(cell.startsWith('"\'=')).toBe(true);
  });
});

describe("csvRow", () => {
  it("joins cells with commas", () => {
    expect(csvRow(["a", "b", "c"])).toBe('"a","b","c"');
  });

  it("handles mixed types in a row", () => {
    const row = csvRow(["Alice", 42, null, "=ATTACK"]);
    expect(row).toBe('"Alice","42","","\'=ATTACK"');
  });
});
