const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

const fills = {};
const fillRegex = /fill="([^"]+)"/g;
let m;
while ((m = fillRegex.exec(svg)) !== null) {
  fills[m[1]] = (fills[m[1]] || 0) + 1;
}

console.log('Fill counts:', fills);

// Check if any path has strokes
const strokes = svg.match(/stroke="([^"]+)"/g);
console.log('Strokes in SVG:', strokes ? strokes.length : 0);

// Check if any paths have opacity
const opacities = svg.match(/opacity="([^"]+)"/g);
console.log('Opacities in SVG:', opacities ? opacities.length : 0);
