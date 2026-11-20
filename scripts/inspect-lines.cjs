const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

// Parse SVG into individual paths
const paths = [];
const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let idx = 0;
while ((m = pathRegex.exec(svg)) !== null) {
  idx++;
  const d = m[1];
  const fill = m[2];
  const nums = d.match(/-?[\d.]+/g).map(Number);
  const xs = nums.filter((_, i) => i % 2 === 0);
  const ys = nums.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  paths.push({
    index: idx,
    fill,
    d,
    minX, maxX, minY, maxY,
    width: maxX - minX,
    height: maxY - minY,
  });
}

console.log('Total paths:', paths.length);

// In the bangs area: around x: 300 to 550, y: 100 to 350
const bangsPaths = paths.filter(p => p.maxX >= 300 && p.minX <= 550 && p.maxY >= 100 && p.minY <= 350);
console.log('Paths intersecting bangs area:', bangsPaths.length);

// Let's inspect the thinnest paths in this area (lines!)
const thinPaths = bangsPaths.filter(p => p.width < 5 || p.height < 5);
console.log('Thin paths (width < 5 or height < 5):', thinPaths.length);
thinPaths.slice(0, 30).forEach(p => {
  console.log(`Path #${p.index} [${p.fill}]: w=${p.width.toFixed(2)}, h=${p.height.toFixed(2)}, bbox=(${p.minX.toFixed(1)}, ${p.minY.toFixed(1)}) to (${p.maxX.toFixed(1)}, ${p.maxY.toFixed(1)})`);
});
