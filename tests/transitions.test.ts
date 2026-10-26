import { describe, it, expect } from "vitest";
import { canTransition } from "@/lib/transitions";
import { toCSV, csvCell } from "@/lib/csv";

describe("status transitions", () => {
  it("follows the happy path", () => {
    expect(canTransition("CASHIER", "PLACED", "ACCEPTED")).toBe(true);
    expect(canTransition("KITCHEN", "ACCEPTED", "PREPARING")).toBe(true);
    expect(canTransition("KITCHEN", "PREPARING", "READY")).toBe(true);
    expect(canTransition("WAITER", "READY", "SERVED")).toBe(true);
  });
  it("blocks skipping steps and wrong roles", () => {
    expect(canTransition("CASHIER", "PLACED", "READY")).toBe(false);
    expect(canTransition("CASHIER", "PLACED", "SERVED")).toBe(false);
    expect(canTransition("KITCHEN", "PLACED", "ACCEPTED")).toBe(false);
    expect(canTransition("WAITER", "PLACED", "CANCELLED")).toBe(false);
  });
  it("cannot cancel once preparing, or reopen a finished order", () => {
    expect(canTransition("MANAGER", "PREPARING", "CANCELLED")).toBe(false);
    expect(canTransition("ADMIN", "SERVED", "PREPARING")).toBe(false);
    expect(canTransition("ADMIN", "CANCELLED", "ACCEPTED")).toBe(false);
  });
});

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => { expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"'); });
  it("neutralises spreadsheet formulas", () => { expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)"); expect(csvCell("-5+2")).toBe("'-5+2"); });
  it("builds rows", () => { expect(toCSV([["a", 1], ["b,c", null]])).toBe('a,1\r\n"b,c",'); });
});
