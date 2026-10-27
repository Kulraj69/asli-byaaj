import { describe, expect, it } from "vitest";
import { calculateLoan, emptyDeductions, formatApr, MAX_DAYS, MAX_MONEY, MAX_PAYMENTS, repaymentSchedule, solveDailyIrr, validateOffer, type Offer } from "@/lib/loan";
export const bullet = (received = 4500, repay = 6500, days = 30): Offer => ({ principal: received, amountReceived: received, deductions: emptyDeductions(), repayment: { kind: "bullet", amount: repay, dayOffset: days } });
describe("cash flow IRR and annualisation", () => {
  it("matches the closed form for receive 4500, repay 6500 after 30 days", () => {
    const result = calculateLoan(bullet());
    const daily = (6500 / 4500) ** (1 / 30) - 1;
    expect(result.dailyIrr).toBeCloseTo(daily, 12);
    expect(result.nominalApr).toBeCloseTo(daily * 365 * 100, 8);
    expect(result.effectiveApr).toBeCloseTo(((6500 / 4500) ** (365 / 30) - 1) * 100, 6);
    expect(result.totalCost).toBe(2000);
    expect(result.costPer100).toBeCloseTo(2000 / 4500 * 100, 10);
  });
  it("includes every upfront deduction in the actual cost", () => {
    const offer = { ...bullet(4370), principal: 5000, deductions: { processingFee: 500, gst: 90, insurance: 30, other: 10 } };
    const result = calculateLoan(offer);
    expect(result.totalDeductions).toBe(630);
    expect(result.totalCost).toBe(2130);
  });
  it("matches an independently discounted equal weekly EMI case", () => {
    const amount = 2000, weeks = 6, weeklyRate = 0.04;
    const received = amount * (1 - (1 + weeklyRate) ** -weeks) / weeklyRate;
    const payments = Array.from({ length: weeks }, (_, i) => ({ dayOffset: (i + 1) * 7, amount }));
    const q = solveDailyIrr(received, payments);
    expect(Math.expm1(q * 7)).toBeCloseTo(weeklyRate, 11);
    const result = calculateLoan({ ...bullet(10000), repayment: { kind: "emi", frequency: "weekly", amount, count: weeks } });
    const pv = result.payments.reduce((sum, p) => sum + p.amount / (1 + result.dailyIrr) ** p.dayOffset, 0);
    expect(pv).toBeCloseTo(10000, 7);
    expect(result.totalRepaid).toBe(12000);
    expect(result.durationDays).toBe(42);
  });
  it("returns exactly zero for a free bullet loan", () => {
    const result = calculateLoan(bullet(3000, 3000));
    expect(result.effectiveApr).toBe(0); expect(result.nominalApr).toBe(0); expect(result.aprDisplay).toBe("0%");
  });
  it("returns zero for free instalments too", () => {
    expect(calculateLoan({ ...bullet(3000), repayment: { kind: "emi", frequency: "monthly", amount: 1000, count: 3 } }).effectiveApr).toBe(0);
  });
  it("handles subsidised negative-cost cash flows without falsely reporting positive cost", () => {
    const result = calculateLoan(bullet(1000, 900, 365));
    expect(result.effectiveApr).toBeCloseTo(-10, 9); expect(result.totalCost).toBe(-100);
  });
  it("matches an irregular schedule and sorts a defensive copy", () => {
    const payments = [{ dayOffset: 100, amount: 1800 }, { dayOffset: 15, amount: 1000 }, { dayOffset: 60, amount: 2000 }];
    const result = calculateLoan({ ...bullet(4000), repayment: { kind: "custom", payments } });
    expect(result.payments.map(p => p.dayOffset)).toEqual([15, 60, 100]);
    expect(payments[0].dayOffset).toBe(100);
    expect(result.payments.reduce((s, p) => s + p.amount * Math.exp(-Math.log1p(result.dailyIrr) * p.dayOffset), 0)).toBeCloseTo(4000, 8);
  });
  it("bisection fallback agrees with closed form", () => {
    const q = solveDailyIrr(4500, [{ dayOffset: 30, amount: 6500 }], 0);
    expect(q).toBeCloseTo(Math.log(6500 / 4500) / 30, 12);
  });
  it("bisection also converges for negative IRR", () => {
    expect(solveDailyIrr(1000, [{ dayOffset: 365, amount: 900 }], 0)).toBeCloseTo(Math.log(0.9) / 365, 12);
  });
  it("caps absurd displayed APR and safely serialises overflow", () => {
    const result = calculateLoan(bullet(0.01, MAX_MONEY, 1));
    expect(result.aprDisplay).toBe(">10,000%"); expect(result.aprCapped).toBe(true); expect(result.effectiveApr).toBeNull();
    expect(Number.isFinite(result.nominalApr)).toBe(true);
    expect(JSON.parse(JSON.stringify(result)).effectiveApr).toBeNull();
  });
  it("formats finite rates without negative zero", () => { expect(formatApr(-0)).toBe("0%"); expect(formatApr(12000)).toBe(">10,000%"); });
  it("allows multiple positive repayments on the same day", () => {
    const result = calculateLoan({ ...bullet(1000), repayment: { kind: "custom", payments: [{ dayOffset: 365, amount: 550 }, { dayOffset: 365, amount: 550 }] } });
    expect(result.effectiveApr).toBeCloseTo(10, 10);
  });
  it.each(["daily", "weekly", "monthly"] as const)("builds %s EMI intervals with a custom first day", frequency => {
    const interval = { daily: 1, weekly: 7, monthly: 30 }[frequency];
    expect(repaymentSchedule({ kind: "emi", frequency, count: 3, amount: 100, firstDay: 5 }).map(p => p.dayOffset)).toEqual([5, 5 + interval, 5 + 2 * interval]);
  });
});
describe("input bounds", () => {
  it.each([0, -1, Infinity, NaN, MAX_MONEY + 1])("rejects invalid principal %s", principal => { expect(() => validateOffer({ ...bullet(), principal })).toThrow(); });
  it("rejects non-cent currency", () => { expect(() => calculateLoan(bullet(10.001))).toThrow(/decimal/); });
  it("requires net receipt to reconcile", () => { expect(() => validateOffer({ ...bullet(), amountReceived: 4000 })).toThrow(/must equal/); });
  it("rejects fees consuming the entire loan", () => { expect(() => validateOffer({ ...bullet(), deductions: { ...emptyDeductions(), processingFee: 4500 } })).toThrow(); });
  it.each([0, -1, 1.5, MAX_DAYS + 1])("rejects invalid due day %s", days => { expect(() => calculateLoan(bullet(1000, 1100, days))).toThrow(); });
  it("rejects zero repayments", () => { expect(() => calculateLoan(bullet(1000, 0))).toThrow(); });
  it("rejects an empty custom schedule", () => { expect(() => validateOffer({ ...bullet(), repayment: { kind: "custom", payments: [] } })).toThrow(); });
  it("caps instalment count", () => { expect(() => validateOffer({ ...bullet(), repayment: { kind: "emi", frequency: "daily", amount: 10, count: MAX_PAYMENTS + 1 } })).toThrow(); });
  it("caps the last EMI date", () => { expect(() => validateOffer({ ...bullet(), repayment: { kind: "emi", frequency: "monthly", amount: 10, count: 2, firstDay: MAX_DAYS } })).toThrow(); });
  it("requires valid JSON object structure", () => { for (const bad of [null, [], "loan", {}]) expect(() => validateOffer(bad)).toThrow(); });
});
