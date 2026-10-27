/** Cash flow maths only. Money is rupees; time is whole days after disbursal. */
export const DAYS_PER_YEAR = 365;
export const MAX_MONEY = 100_000_000;
export const MAX_DAYS = 36_500;
export const MAX_PAYMENTS = 1_200;
export const APR_DISPLAY_CAP = 10_000;
export type Payment = { dayOffset: number; amount: number };
export type Deductions = { processingFee: number; gst: number; insurance: number; other: number };
export type Repayment =
  | { kind: "bullet"; dayOffset: number; amount: number }
  | { kind: "emi"; frequency: "daily" | "weekly" | "monthly"; count: number; amount: number; firstDay?: number }
  | { kind: "custom"; payments: Payment[] };
export type Offer = { principal: number; deductions: Deductions; amountReceived: number; repayment: Repayment };
export type LoanResult = {
  amountReceived: number; totalDeductions: number; totalRepaid: number; totalCost: number;
  costPer100: number; durationDays: number; payments: Payment[]; dailyIrr: number;
  nominalApr: number; effectiveApr: number | null; aprDisplay: string; nominalAprDisplay: string; aprCapped: boolean;
};
export class InputError extends Error {}
export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const emptyDeductions = (): Deductions => ({ processingFee: 0, gst: 0, insurance: 0, other: 0 });
export function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function numeric(value: unknown, label: string, max: number, min = 0.01, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new InputError(`${label} must be ${integer ? "a whole number" : "a number"} between ${min} and ${max}.`);
  }
  return value;
}
function money(value: unknown, label: string, min = 0.01) {
  const n = numeric(value, label, MAX_MONEY, min);
  if (Math.abs(n * 100 - Math.round(n * 100)) > 0.00001) throw new InputError(`${label}: use at most two decimal places.`);
  return n;
}
function payment(input: unknown): Payment {
  const p = record(input);
  return { dayOffset: numeric(p.dayOffset, "Repayment day", MAX_DAYS, 1, true), amount: money(p.amount, "Repayment") };
}
export function validateOffer(input: unknown): Offer {
  const o = record(input);
  const principal = money(o.principal, "Principal");
  const d = record(o.deductions);
  const deductions: Deductions = {
    processingFee: money(d.processingFee, "Processing fee", 0), gst: money(d.gst, "GST", 0),
    insurance: money(d.insurance, "Insurance", 0), other: money(d.other, "Other deductions", 0),
  };
  const amountReceived = money(o.amountReceived, "Amount received");
  const expected = roundMoney(principal - Object.values(deductions).reduce((a, b) => a + b, 0));
  if (expected <= 0 || Math.abs(amountReceived - expected) > 0.001) {
    throw new InputError("Amount received must equal principal minus all upfront deductions, and must be positive.");
  }
  const r = record(o.repayment);
  let repayment: Repayment;
  if (r.kind === "bullet") repayment = { kind: "bullet", ...payment(r) };
  else if (r.kind === "emi") {
    if (r.frequency !== "daily" && r.frequency !== "weekly" && r.frequency !== "monthly") throw new InputError("Choose daily, weekly or monthly repayments.");
    repayment = { kind: "emi", frequency: r.frequency, count: numeric(r.count, "Number of instalments", MAX_PAYMENTS, 1, true), amount: money(r.amount, "Instalment"), ...(r.firstDay !== undefined ? { firstDay: numeric(r.firstDay, "First payment day", MAX_DAYS, 1, true) } : {}) };
  } else if (r.kind === "custom") {
    if (!Array.isArray(r.payments) || !r.payments.length || r.payments.length > MAX_PAYMENTS) throw new InputError(`Add between 1 and ${MAX_PAYMENTS} repayments.`);
    repayment = { kind: "custom", payments: r.payments.map(payment).sort((a, b) => a.dayOffset - b.dayOffset) };
  } else throw new InputError("Choose a repayment schedule.");
  const payments = repaymentSchedule(repayment);
  if (payments.at(-1)!.dayOffset > MAX_DAYS) throw new InputError(`Loan term cannot exceed ${MAX_DAYS} days.`);
  if (payments.reduce((s, p) => s + p.amount, 0) > MAX_MONEY * 10) throw new InputError("Total repayments exceed the supported limit.");
  return { principal, deductions, amountReceived, repayment };
}
export function repaymentSchedule(repayment: Repayment): Payment[] {
  if (repayment.kind === "bullet") return [{ dayOffset: repayment.dayOffset, amount: repayment.amount }];
  if (repayment.kind === "custom") return repayment.payments.map(p => ({ ...p })).sort((a, b) => a.dayOffset - b.dayOffset);
  const interval = { daily: 1, weekly: 7, monthly: 30 }[repayment.frequency];
  return Array.from({ length: repayment.count }, (_, i) => ({ dayOffset: (repayment.firstDay ?? interval) + i * interval, amount: repayment.amount }));
}
/** Solve in log-daily-rate space: log(PV / received) = 0.
 * Log-sum-exp avoids overflow even for very expensive, very short loans.
 * One positive disbursal followed by positive repayments has one IRR.
 */
export function solveDailyIrr(received: number, payments: Payment[], maxNewtonIterations = 40): number {
  if (Math.abs(payments.reduce((s, p) => s + p.amount, 0) - received) < 1e-9) return 0;
  const logAmounts = payments.map(p => Math.log(p.amount / received));
  function evaluate(q: number) {
    const logs = payments.map((p, i) => logAmounts[i] - q * p.dayOffset);
    const max = Math.max(...logs);
    const weights = logs.map(v => Math.exp(v - max));
    const sum = weights.reduce((a, b) => a + b, 0);
    return { value: max + Math.log(sum), derivative: -weights.reduce((s, w, i) => s + w * payments[i].dayOffset, 0) / sum };
  }
  let lo = -32, hi = 32, q = 0;
  for (let i = 0; i < maxNewtonIterations; i++) {
    const { value, derivative } = evaluate(q);
    if (Math.abs(value) < 1e-13) return q;
    if (value > 0) lo = q; else hi = q;
    const next = q - value / derivative;
    if (!Number.isFinite(next) || next <= lo || next >= hi) break;
    q = next;
  }
  for (let i = 0; i < 200; i++) {
    q = (lo + hi) / 2;
    const { value } = evaluate(q);
    if (Math.abs(value) < 1e-13) return q;
    if (value > 0) lo = q; else hi = q;
  }
  return q;
}
export function formatApr(apr: number | null): string {
  if (apr === null || apr > APR_DISPLAY_CAP) return ">10,000%";
  return `${Object.is(apr, -0) || Math.abs(apr) < 0.005 ? "0" : apr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`;
}
export function calculateLoan(input: Offer): LoanResult {
  const offer = validateOffer(input);
  const payments = repaymentSchedule(offer.repayment);
  const totalRepaid = roundMoney(payments.reduce((sum, p) => sum + p.amount, 0));
  const totalCost = roundMoney(totalRepaid - offer.amountReceived);
  const q = solveDailyIrr(offer.amountReceived, payments);
  const dailyIrr = Math.expm1(q);
  const nominalApr = dailyIrr * DAYS_PER_YEAR * 100;
  const effective = Math.expm1(q * DAYS_PER_YEAR) * 100;
  const effectiveApr = Number.isFinite(effective) ? effective : null;
  return {
    amountReceived: offer.amountReceived, totalDeductions: roundMoney(offer.principal - offer.amountReceived), totalRepaid, totalCost,
    costPer100: totalCost / offer.amountReceived * 100, durationDays: payments.at(-1)!.dayOffset, payments, dailyIrr,
    nominalApr, effectiveApr, aprDisplay: formatApr(effectiveApr), nominalAprDisplay: formatApr(nominalApr),
    aprCapped: effectiveApr === null || effectiveApr > APR_DISPLAY_CAP,
  };
}
