const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');
const paths = [...svg.matchAll(/<path\s+d="([^"]+)"\s+fill="([^"]+)"/g)];
console.log('Path 9 d head:', paths[8][1].slice(0, 300));
console.log('Path 9 d tail:', paths[8][1].slice(-300));
console.log('Path 9 Z count:', (paths[8][1].match(/Z/gi) || []).length);
console.log('Path 9 M count:', (paths[8][1].match(/M/gi) || []).length);
