const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let idx = 0;
const topHairPaths = [];
while ((m = pathRegex.exec(svg)) !== null) {
  idx++;
  const d = m[1];
  const fill = m[2];
  const nums = d.match(/-?[\d.]+/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  if (maxX >= 450 && minX <= 600 && maxY >= 30 && minY <= 180) {
    topHairPaths.push({ idx, fill, minX: minX.toFixed(1), maxX: maxX.toFixed(1), minY: minY.toFixed(1), maxY: maxY.toFixed(1) });
  }
}

console.log(`Top hair paths count: ${topHairPaths.length}`);
topHairPaths.forEach(p => console.log(p));
