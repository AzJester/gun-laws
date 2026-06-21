/* Shrink data/us-geo.json by rounding every coordinate in each state's SVG path
   `d` string to 1 decimal place. At the committed viewBox (0 0 975 610, rendered
   ~975px wide) one unit is roughly one pixel, so 1dp is sub-pixel precision —
   visually identical but far smaller than the original 3dp source coordinates.

   Reproducible / idempotent: running it again on already-rounded data is a no-op
   (numbers already at <=1dp re-serialize to themselves). It rewrites the file
   in place using the same compact JSON.stringify format (no trailing newline)
   the file already uses, so only the coordinate precision changes.

   Usage:  node tools/round-geo.js
*/
const fs = require("fs");

const FILE = "data/us-geo.json";

// Round a single numeric token to 1 decimal place, dropping a trailing ".0" and
// a redundant "-0". Keeps the shortest exact textual form (e.g. 491.506 -> 491.5,
// 492 -> 492, 0.04 -> 0).
function round1(numStr) {
  const n = Math.round(parseFloat(numStr) * 10) / 10;
  // Normalize -0 to 0.
  const v = Object.is(n, -0) ? 0 : n;
  // String(v) already yields the shortest decimal form for 1dp values.
  return String(v);
}

// Round every number embedded in an SVG path `d` string. Path numbers may carry
// a sign and a decimal part; command letters (M/L/Z/etc.) are left untouched.
function roundPath(d) {
  return d.replace(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi, round1);
}

function main() {
  const raw = fs.readFileSync(FILE, "utf8");
  const before = Buffer.byteLength(raw, "utf8");
  const geo = JSON.parse(raw);

  for (const code of Object.keys(geo.states)) {
    const st = geo.states[code];
    if (typeof st.d === "string") st.d = roundPath(st.d);
  }

  const out = JSON.stringify(geo);
  fs.writeFileSync(FILE, out);
  const after = Buffer.byteLength(out, "utf8");

  const pct = ((1 - after / before) * 100).toFixed(1);
  console.log(
    `round-geo: ${FILE} ${before} -> ${after} bytes (${pct}% smaller)`,
  );
}

main();
