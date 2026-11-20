const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');
const paths = [...svg.matchAll(/<path\s+d="([^"]+)"\s+fill="([^"]+)"/g)];
console.log('Path 518:', paths[517][0]);
console.log('Path 587:', paths[586][0]);
console.log('Path 592:', paths[591][0]);
console.log('Path 597:', paths[596][0]);
