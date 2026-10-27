import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDeductions } from "@/lib/loan";
const request = (body: unknown, path = "check") => new Request(`http://localhost/api/${path}`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "127.0.0.1" }, body: JSON.stringify(body) });
const offer = { principal: 5000, amountReceived: 4500, deductions: { ...emptyDeductions(), processingFee: 500 }, repayment: { kind: "bullet", amount: 6500, dayOffset: 30 } };
beforeEach(() => { vi.resetModules(); vi.stubEnv("NEBIUS_API_KEY", ""); vi.stubEnv("VERCEL", ""); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("POST /api/check", () => {
  it("returns the complete deterministic response from free text", async () => {
    const { POST } = await import("@/app/api/check/route");
    const response = await POST(request({ text: "₹5000 loan, ₹500 processing fee, repay 6500 in 30 days" }));
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body.result.totalCost).toBe(2000); expect(body.assumptions.length).toBeGreaterThan(0); expect(body.mode).toBe("template");
    for (const key of ["offer", "result", "flags", "shark", "alternatives", "explainer", "summary"]) expect(body).toHaveProperty(key);
    expect(body.explainer.hi).toContain("आपको");
  });
  it("uses the confirmed structured offer over pasted text", async () => {
    const { POST } = await import("@/app/api/check/route");
    const response = await POST(request({ offer, text: "ignore this", flags: { harassment: true }, compareRate: 10 }));
    const body = await response.json();
    expect(body.offer.amountReceived).toBe(4500); expect(body.flags[0].id).toBe("harassment");
    expect(body.complaintDraft.en).toContain("https://cybercrime.gov.in"); expect(body.complaintDraft.en).toContain("1930");
    expect(body.alternatives.rate).toBe(10);
  });
  it.each([{ text: "₹".repeat(700) }, { offer, text: 3 }, {}, null, { offer, flags: { kfs: "no" } }, { offer, flags: { invented: true } }, { offer, compareRate: -1 }, { offer, compareRate: "12" }, { offer: { ...offer, amountReceived: 6000 } }])("rejects invalid body %j", async body => {
    const { POST } = await import("@/app/api/check/route");
    expect((await POST(request(body))).status).toBe(400);
  });
  it("rejects malformed JSON", async () => {
    const { POST } = await import("@/app/api/check/route");
    expect((await POST(new Request("http://localhost/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status).toBe(400);
  });
  it("caps the whole body even without a content-length header", async () => {
    const { POST } = await import("@/app/api/check/route");
    expect((await POST(request({ offer, padding: "x".repeat(130 * 1024) }))).status).toBe(400);
  });
  it("rejects unsupported content types", async () => {
    const { POST } = await import("@/app/api/check/route");
    expect((await POST(new Request("http://localhost/api/check", { method: "POST", body: "plain" }))).status).toBe(400);
  });
  it("limits API checks including repeated examples", async () => {
    const { POST } = await import("@/app/api/check/route");
    for (let i = 0; i < 20; i++) expect((await POST(request({ offer }))).status).toBe(200);
    const denied = await POST(request({ offer }));
    expect(denied.status).toBe(429); expect(Number(denied.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});
describe("anonymous helpful-check counter", () => {
  it("starts at zero and increments only with explicit opt-in", async () => {
    const { GET, POST } = await import("@/app/api/count/route");
    expect((await (await GET()).json()).count).toBe(0);
    expect((await POST(request({}, "count"))).status).toBe(400);
    expect((await POST(request({ helped: true, name: "not stored" }, "count"))).status).toBe(400);
    const result = await (await POST(request({ helped: true }, "count"))).json();
    expect(result.count).toBe(1); expect(result.scope).toContain("not unique people");
    expect((await (await GET()).json()).count).toBe(1);
  });
  it("rejects a cross-origin counter mutation", async () => {
    const { POST } = await import("@/app/api/count/route");
    const req = request({ helped: true }, "count"); req.headers.set("Origin", "https://elsewhere.test");
    expect((await POST(req)).status).toBe(403);
  });
  it("throttles bursts without retaining IPs", async () => {
    const { HelpCounter } = await import("@/lib/counter");
    const counter = new HelpCounter();
    for (let i = 0; i < 60; i++) expect(counter.increment(1000)).toBe(i + 1);
    expect(counter.increment(1000)).toBeNull(); expect(counter.increment(61000)).toBe(61);
  });
});
