const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let idx = 0;
const paths = [];
while ((m = pathRegex.exec(svg)) !== null) {
  idx++;
  const d = m[1];
  const fill = m[2];
  paths.push({ idx, d, fill });
}

// Find paths near (x: 380, y: 180) - the glossy highlight on the bangs
const nearHighlight = [];
for (const p of paths) {
  if (p.d.includes('380') || p.d.includes('379') || p.d.includes('381') || p.d.includes('390') || p.d.includes('400')) {
    const nums = p.d.match(/-?[\d.]+/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minX <= 420 && maxX >= 360 && minY <= 220 && maxY >= 150) {
      nearHighlight.push({ idx: p.idx, fill: p.fill, minX: minX.toFixed(1), maxX: maxX.toFixed(1), minY: minY.toFixed(1), maxY: maxY.toFixed(1), dLen: p.d.length });
    }
  }
}

console.log('Paths near highlight:', nearHighlight);
