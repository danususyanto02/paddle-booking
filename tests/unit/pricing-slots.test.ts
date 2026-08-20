import { describe, it, expect } from "vitest";
import {
  PROCESSING_FEE,
  formatIDR,
  formatIDRShort,
  calcTotal,
  formatDateLong,
  formatDateShort,
} from "../../lib/pricing";
import {
  SLOT_STARTS,
  periodOf,
  toMinutes,
  fromMinutes,
  endTime,
  canFit,
  slotsFor,
} from "../../lib/slots";

// ── pricing ──────────────────────────────────────────────────────────

describe("pricing", () => {
  it("PROCESSING_FEE = 15000", () => {
    expect(PROCESSING_FEE).toBe(15000);
  });

  it("calcTotal(180000,90)=285000 (spec AC)", () => {
    expect(calcTotal(180000, 90)).toEqual({
      courtFee: 270000,
      processingFee: 15000,
      total: 285000,
    });
  });

  it("calcTotal 60 and 120", () => {
    expect(calcTotal(180000, 60).total).toBe(195000);
    expect(calcTotal(180000, 120).total).toBe(375000);
  });

  it("calcTotal half-hour rounding", () => {
    // 135k * 90/60 = 202500
    expect(calcTotal(135000, 90).courtFee).toBe(202500);
  });

  it("formatIDR contains Rp and IDR grouping", () => {
    const s = formatIDR(180000);
    expect(s).toMatch(/Rp/);
    // id-ID currency format: e.g. "Rp 180.000"
    expect(s.replace(/\s/g, "")).toContain("180.000");
  });

  it("formatIDRShort prefix Rp", () => {
    expect(formatIDRShort(150000).replace(/\s/g, "")).toBe("Rp150.000");
  });

  it("formatDateLong not empty and contains year", () => {
    const s = formatDateLong("2026-08-20");
    expect(s.length).toBeGreaterThan(0);
    expect(s).toContain("2026");
  });

  it("formatDateShort not empty", () => {
    expect(formatDateShort("2026-08-20").length).toBeGreaterThan(0);
  });

  it("formatDateLong/Short empty on falsy", () => {
    expect(formatDateLong("")).toBe("");
    expect(formatDateShort(null as unknown as string)).toBe("");
  });
});

// ── slots ────────────────────────────────────────────────────────────

describe("slots", () => {
  it("SLOT_STARTS has 27 entries 08:00–21:00", () => {
    expect(SLOT_STARTS).toHaveLength(27);
    expect(SLOT_STARTS[0]).toBe("08:00");
    expect(SLOT_STARTS[SLOT_STARTS.length - 1]).toBe("21:00");
  });

  it("periodOf mapping", () => {
    expect(periodOf("08:00")).toBe("Morning");
    expect(periodOf("11:30")).toBe("Morning");
    expect(periodOf("12:00")).toBe("Afternoon");
    expect(periodOf("16:30")).toBe("Afternoon");
    expect(periodOf("17:00")).toBe("Evening");
    expect(periodOf("21:00")).toBe("Evening");
  });

  it("toMinutes/fromMinutes roundtrip", () => {
    expect(toMinutes("08:00")).toBe(480);
    expect(toMinutes("21:30")).toBe(1290);
    expect(fromMinutes(480)).toBe("08:00");
    expect(fromMinutes(1290)).toBe("21:30");
  });

  it("endTime", () => {
    expect(endTime("08:00", 60)).toBe("09:00");
    expect(endTime("21:00", 60)).toBe("22:00");
    expect(endTime("09:30", 90)).toBe("11:00");
  });

  it("canFit prevents >22:00 (spec AC)", () => {
    expect(canFit("21:00", 90)).toBe(false); // 22:30 > 22:00
    expect(canFit("21:00", 60)).toBe(true);  // 22:00 exact
    expect(canFit("20:30", 90)).toBe(true);  // 22:00 exact
    expect(canFit("20:30", 120)).toBe(false); // 22:30
    expect(canFit("08:00", 60)).toBe(true);
  });

  it("slotsFor returns 27 unoccupied (pure, before T20 DB)", () => {
    const slots = slotsFor("alpha", "2026-08-20");
    expect(slots).toHaveLength(27);
    expect(slots.every((s) => !s.occupied)).toBe(true);
    expect(slots[0]?.period).toBe("Morning");
  });
});
