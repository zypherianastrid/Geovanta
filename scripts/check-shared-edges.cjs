const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');
const paths = [...svg.matchAll(/<path\s+d="([^"]+)"\s+fill="([^"]+)"/g)];

function extractPoints(d) {
  // Matches all coordinate pairs in SVG path commands
  // Simplest: match numbers and find L, Q, C endpoints
  const tokens = d.match(/[a-df-z]|[-+]?[0-9]*\.?[0-9]+(?:e[-+]?[0-9]+)?/gi);
  const pts = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-z]/i.test(t)) {
      i++;
      continue;
    }
    const x = parseFloat(tokens[i]);
    const y = parseFloat(tokens[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      pts.push({ x, y });
      i += 2;
    } else {
      i++;
    }
  }
  return pts;
}

const pts9 = extractPoints(paths[8][1]);
const pts48 = extractPoints(paths[47][1]);

console.log('Path 9 points:', pts9.length);
console.log('Path 48 points:', pts48.length);

// Check distances between points in Path 9 and points in Path 48
let exactMatches = 0;
let closeMatches = 0; // within 0.1 px
let subpixelGaps = 0; // between 0.001 and 0.5 px

for (const p9 of pts9) {
  for (const p48 of pts48) {
    const dist = Math.hypot(p9.x - p48.x, p9.y - p48.y);
    if (dist < 1e-6) exactMatches++;
    else if (dist < 0.1) closeMatches++;
    else if (dist < 0.5) subpixelGaps++;
  }
}

console.log('Exact vertex matches (dist < 1e-6):', exactMatches);
console.log('Close matches (1e-6 <= dist < 0.1):', closeMatches);
console.log('Subpixel gaps (0.1 <= dist < 0.5):', subpixelGaps);
