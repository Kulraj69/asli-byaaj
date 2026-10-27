import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckLimiter, clientIp } from "@/lib/rate-limit";
afterEach(() => vi.unstubAllEnvs());
describe("check rate limits", () => {
  const now = Date.parse("2026-10-27T10:00:00Z");
  it("allows twenty checks per IP and rejects the next", () => {
    const limiter = new CheckLimiter();
    for (let i = 0; i < 20; i++) expect(limiter.take("a", now).ok).toBe(true);
    expect(limiter.take("a", now)).toMatchObject({ ok: false, retryAfter: 3600 });
    expect(limiter.take("b", now).ok).toBe(true);
  });
  it("uses a rolling hour and reopens at the boundary", () => {
    const limiter = new CheckLimiter(1);
    expect(limiter.take("a", now).ok).toBe(true); expect(limiter.take("a", now + 3_599_999).ok).toBe(false);
    expect(limiter.take("a", now + 3_600_000).ok).toBe(true);
  });
  it("enforces the daily cap across different IPs", () => {
    const limiter = new CheckLimiter();
    for (let i = 0; i < 2000; i++) expect(limiter.take(String(i), now).ok).toBe(true);
    expect(limiter.take("new", now).ok).toBe(false);
  });
  it("resets the global cap at UTC midnight without resetting IP windows", () => {
    const limiter = new CheckLimiter(1, 3_600_000, 1);
    const midnight = Date.parse("2026-10-28T00:00:00Z");
    expect(limiter.take("a", midnight - 1).ok).toBe(true);
    expect(limiter.take("a", midnight).ok).toBe(false);
    expect(limiter.take("b", midnight).ok).toBe(true);
  });
  it("does not count denied attempts toward the global cap", () => {
    const limiter = new CheckLimiter(1, 3_600_000, 2);
    limiter.take("a", now); limiter.take("a", now);
    expect(limiter.take("b", now).ok).toBe(true);
  });
  it("trusts only Vercel's overwritten forwarding header on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(clientIp(new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "1.2.3.4", "x-forwarded-for": "spoof" } }))).toBe("1.2.3.4");
    expect(clientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "spoof" } }))).toBe("unknown");
  });
  it("uses reverse-proxy headers outside Vercel", () => {
    vi.stubEnv("VERCEL", "");
    expect(clientIp(new Request("http://localhost", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } }))).toBe("1.2.3.4");
  });
});
