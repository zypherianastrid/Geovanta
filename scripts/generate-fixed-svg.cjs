const fs = require('fs');

const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');

// Add seam-guard stroke to all paths that have a solid fill and no stroke
const fixedSvg = svg.replace(/<path\s+d="([^"]+)"\s+fill="([^"]+)"(?:\s+fill-rule="([^"]+)")?>/g, (match, d, fill, fillRule) => {
  if (!fill || fill === 'none' || fill === 'transparent') return match;
  const fr = fillRule ? ` fill-rule="${fillRule}"` : '';
  // Apply a 0.5px seam guard stroke with paint-order="stroke fill"
  return `<path d="${d}" fill="${fill}"${fr} stroke="${fill}" stroke-width="0.5" stroke-linejoin="round" stroke-linecap="round" style="paint-order: stroke fill;"></path>`;
});

fs.writeFileSync('test-fixed-anime.svg', fixedSvg);
console.log('Generated test-fixed-anime.svg');
