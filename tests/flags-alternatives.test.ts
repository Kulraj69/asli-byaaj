import { describe, expect, it } from "vitest";
import { FLAG_QUESTIONS, COSTLY_APR_MAX, FAIR_APR_MAX, evaluateFlags, sharkTier } from "@/lib/flags";
import { calculateLoan, emptyDeductions } from "@/lib/loan";
import { compareAlternative, REGULATED_OPTIONS } from "@/lib/alternatives";
const loan = (amount = 6500) => calculateLoan({ principal: 4500, amountReceived: 4500, deductions: emptyDeductions(), repayment: { kind: "bullet", dayOffset: 30, amount } });
describe("user-answered flags", () => {
  it("does not infer violations from unanswered questions", () => { expect(evaluateFlags()).toEqual([]); });
  it.each(FLAG_QUESTIONS)("fires $id only for its bad answer", flag => {
    expect(evaluateFlags({ [flag.id]: flag.badAnswer })).toEqual([flag]);
    expect(evaluateFlags({ [flag.id]: !flag.badAnswer })).toEqual([]);
    expect(flag.source).toBe("https://www.rbi.org.in"); expect(flag.reference).toContain("2025"); expect(flag.explanation.hi.length).toBeGreaterThan(10);
  });
  it("gives harassment urgent severity", () => { expect(evaluateFlags({ harassment: true })[0].severity).toBe("urgent"); });
  it.each([[0, "fair"], [FAIR_APR_MAX, "fair"], [FAIR_APR_MAX + 0.01, "costly"], [COSTLY_APR_MAX, "costly"], [COSTLY_APR_MAX + 0.01, "shark"], [null, "shark"]])("classifies %s as %s", (apr, tier) => { expect(sharkTier(apr as number | null).tier).toBe(tier); });
});
describe("hypothetical alternatives", () => {
  it("matches independent daily-compounded interest for a bullet loan", () => {
    const result = compareAlternative(loan(), 12);
    const total = 4500 * (1 + 0.12 / 365) ** 30;
    expect(result.exampleTotal).toBeCloseTo(total, 2); expect(result.savings).toBeCloseTo(6500 - total, 2);
  });
  it("compares equal instalments as an annuity on the same dates", () => {
    const result = calculateLoan({ principal: 10000, amountReceived: 10000, deductions: emptyDeductions(), repayment: { kind: "emi", frequency: "weekly", amount: 2000, count: 6 } });
    const weeklyRate = (1 + 0.12 / 365) ** 7 - 1;
    const payment = 10000 * weeklyRate / (1 - (1 + weeklyRate) ** -6);
    expect(compareAlternative(result).exampleTotal).toBeCloseTo(payment * 6, 2);
  });
  it("offers no positive savings when the original loan is cheaper", () => { const c = compareAlternative(loan(4500)); expect(c.savings).toBe(0); expect(c.extraCost).toBeGreaterThan(0); });
  it("supports a zero comparison rate", () => { expect(compareAlternative(loan(), 0).exampleCost).toBe(0); });
  it.each([-1, Infinity, NaN, 101])("rejects invalid comparison rate %s", rate => { expect(() => compareAlternative(loan(), rate)).toThrow(); });
  it("lists official options without promising any lender rate", () => {
    expect(REGULATED_OPTIONS).toHaveLength(6);
    for (const option of REGULATED_OPTIONS) { expect(option.link).toMatch(/^https:\/\//); expect(option.who.en).not.toMatch(/\d+%/); }
  });
});
