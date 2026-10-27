/** Anonymous session counter: no IP, identifiers, offers or event records. */
export class HelpCounter {
  private count = 0;
  private recent: number[] = [];
  get() { return this.count; }
  increment(now = Date.now()) {
    this.recent = this.recent.filter(time => now - time < 60_000);
    if (this.recent.length >= 60) return null;
    this.recent.push(now);
    return ++this.count;
  }
}
export const helpCounter = new HelpCounter();
