const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let idx = 0;
const earSkinPaths = [];
while ((m = pathRegex.exec(svg)) !== null) {
  idx++;
  const d = m[1];
  const fill = m[2];
  if (['#feece6', '#dab5a8', '#ecd0c9'].includes(fill.toLowerCase())) {
    const nums = d.match(/-?[\d.]+/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    if (minX < 200 && minY > 450 && minY < 650) {
      earSkinPaths.push({ idx, fill, minX, maxX, minY, maxY, d });
    }
  }
}

console.log('Ear skin paths:', earSkinPaths);
