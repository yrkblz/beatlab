/**
 * Spintax: "{Cześć|Siemanko|Elo} obczaj {nowe|świeże} bity"
 * Each send picks a random variant, so every email is slightly different
 * (helps Gmail / spam filters treat messages as individual mail).
 * Supports nesting: "{Hej {ziomek|bracie}|Siema}".
 * Braces without a "|" are left untouched (e.g. "{beat}").
 */
const INNERMOST_SPIN = /\{([^{}]*\|[^{}]*)\}/;

export function spin(text: string, rand: () => number = Math.random): string {
  if (!text) return '';
  let out = text;
  let guard = 0;
  while (INNERMOST_SPIN.test(out) && guard < 2000) {
    guard++;
    out = out.replace(INNERMOST_SPIN, (_match, body: string) => {
      const options = body.split('|');
      const idx = Math.min(options.length - 1, Math.floor(rand() * options.length));
      return options[idx] ?? '';
    });
  }
  return out;
}

export function hasSpintax(text: string): boolean {
  return Boolean(text) && INNERMOST_SPIN.test(text);
}

/** Approximate number of unique variants (product of option counts, non-nested). */
export function countSpinVariants(text: string): number {
  if (!text) return 1;
  const groups = text.match(/\{([^{}]*\|[^{}]*)\}/g) || [];
  return groups.reduce((acc, g) => acc * g.slice(1, -1).split('|').length, 1);
}
