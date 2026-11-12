/** `numerator / denominator`, or 0 when the denominator is not positive (no Sale, no total). */
export const ratio = (numerator: number, denominator: number) =>
  denominator > 0 ? numerator / denominator : 0;

/** A 0–1 share rounded to 4 decimals (0.123456 → 0.1235), as the routes send it. */
export const roundShare = (share: number) => Math.round(share * 10_000) / 10_000;
