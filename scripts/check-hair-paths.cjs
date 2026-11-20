const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

// Find all paths with fill="#ffffff"
const pathRegex = /<path\s+d="([^"]+)"\s+fill="([^"]+)"/g;
let m;
let count = 0;
while ((m = pathRegex.exec(svg)) !== null) {
  count++;
  const d = m[1];
  const fill = m[2];
  if (fill.toLowerCase() === '#ffffff' || fill.toLowerCase() === '#ecf4f8') {
    // Check bbox roughly from numbers in d
    const nums = d.match(/-?[\d.]+/g).map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    console.log(`Path #${count} [${fill}]: bbox=(${minX.toFixed(1)}, ${minY.toFixed(1)}) to (${maxX.toFixed(1)}, ${maxY.toFixed(1)}), width=${(maxX-minX).toFixed(2)}, height=${(maxY-minY).toFixed(2)}, cmdLen=${d.length}`);
  }
}
