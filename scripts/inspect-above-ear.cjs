const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let idx = 0;
const hairPaths = [];
while ((m = pathRegex.exec(svg)) !== null) {
  idx++;
  const d = m[1];
  const fill = m[2];
  const nums = d.match(/-?[\d.]+/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minX >= 50 && maxX <= 220 && minY >= 300 && maxY <= 550) {
    hairPaths.push({ idx, fill, minX: minX.toFixed(1), maxX: maxX.toFixed(1), minY: minY.toFixed(1), maxY: maxY.toFixed(1), cmdCount: (d.match(/[A-Z]/gi) || []).length });
  }
}

console.log(`Found ${hairPaths.length} paths in hair above ear:`);
hairPaths.slice(0, 30).forEach(p => console.log(p));
