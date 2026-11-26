/**
 * Chart colours for the customer workspace. One categorical palette, assigned in a
 * fixed order and never cycled, so a category keeps its colour on every page.
 *
 * Validated (dataviz validate_palette, light surface): lightness band, chroma floor,
 * colour-blind separation (worst adjacent ΔE 11.3), normal-vision floor (16.5) and
 * ≥3:1 contrast all pass. Text never takes these colours; they mark identity only.
 */

export const SERIES = ["#2f5fb3", "#d4623a", "#139a83", "#b8860b", "#b24f8c", "#6c5bd4"] as const;
/** Folded remainder ("Other") is always neutral, never a generated hue. */
export const OTHER = "#a8a29e";

export const CATEGORY_COLOR: Record<string, string> = {
  // what you own
  Property: SERIES[0],
  Investments: SERIES[1],
  Retirement: SERIES[2],
  "Cash & deposits": SERIES[3],
  // what you earn
  "Salary & equity": SERIES[0],
  Rental: SERIES[1],
  Dividends: SERIES[2],
  "Capital gains": SERIES[3],
  Interest: SERIES[4],
  Other: OTHER,
};

/**
 * Per-country tonal families for the money picture: one hue per country (India green,
 * US navy), darkest for the largest class. Classes are ranked within a country, so the
 * dominant class always reads first.
 */
export const COUNTRY_TONES = {
  IN: ["#2f5d45", "#6f9a83", "#b9cdbf", "#dde7e0"],
  US: ["#2c4a6e", "#6d8bad", "#b8c6d8", "#dde3ec"],
} as const;
