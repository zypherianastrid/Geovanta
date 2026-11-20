const fs = require('fs');
const svg = fs.readFileSync('Ilustrasi anime.txt', 'utf8');
const paths = [...svg.matchAll(/<path\s+d="([^"]+)"\s+fill="([^"]+)"/g)];
const d9 = paths[8][1];
const mMatches = d9.match(/M/gi) || [];
const zMatches = d9.match(/Z/gi) || [];
console.log('Path 9 M count:', mMatches.length, 'Z count:', zMatches.length);

// What about Path 48?
const d48 = paths[47][1];
console.log('Path 48 M count:', (d48.match(/M/gi) || []).length, 'Z count:', (d48.match(/Z/gi) || []).length);
