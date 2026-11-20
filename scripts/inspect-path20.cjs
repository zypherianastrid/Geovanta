const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');
const paths = [...svg.matchAll(/<path\s+d="([^"]+)"\s+fill="([^"]+)"/g)];
console.log('Path 20 fill:', paths[19][2]);
console.log('Path 20 d length:', paths[19][1].length);
console.log('Path 20 snippet:', paths[19][1].slice(0, 300));
