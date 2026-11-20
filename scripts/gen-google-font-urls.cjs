// Generator peta URL TTF Google Fonts (sekali jalan, hasilnya dibundel).
//
// LATAR: API google-webfonts-helper (gwfh.mranftl.com) TIDAK mengirim header
// `Access-Control-Allow-Origin`, sehingga `fetch()` dari browser ke
// `/api/fonts/{id}` SELALU gagal CORS ("Perlu internet...") untuk SEMUA font
// — curl tidak kena CORS sehingga verifikasi awal lolos palsu. Sebaliknya,
// file TTF di fonts.gstatic.com MENGIRIM `Access-Control-Allow-Origin: *`,
// jadi unduhan TTF langsung dari gstatic boleh dari browser.
// Solusi: peta URL TTF per keluarga di-generate SEKALI di sini (lewat curl,
// yang memakai proxy env VM) dan dibundel ke aplikasi; saat runtime, embed
// hanya fetch TTF dari gstatic — tidak ada lagi ketergantungan runtime ke gwfh.
//
// Jalankan: node scripts/gen-google-font-urls.cjs
// Keluaran: src/data/googleFontUrls.json
//   { generatedAt, source, families: { <id>: { p: "<id>/v<ver>", r, b, i, bi } } }
//   p = segmen path setelah /s/; r/b/i/bi = hash file (atau URL penuh bila
//   bentuk URL tidak cocok pola gstatic). Face yang tidak tersedia = absen.
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const Module = require('node:module');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src/data/googleFontUrls.json');
const CONCURRENCY = 20;
const API = 'https://gwfh.mranftl.com/api/fonts';

// pickFaceVariants dari sumber yang sama dengan runtime (satu sumber kebenaran).
const entry = path.resolve(ROOT, 'src/renderer/googleFonts.jsx');
const bundled = esbuild.buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
const mod = new Module(entry, module);
mod.filename = entry;
mod.paths = Module._nodeModulePaths(path.dirname(entry));
mod._compile(bundled, entry);
const { pickFaceVariants } = mod.exports;

const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/googleFonts.json'), 'utf8'));
const ids = catalog.families.map(f => f.id);

function curlJson(url) {
  return new Promise((resolve, reject) => {
    execFile('curl', ['-sS', '--max-time', '30', url], { maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error('JSON tidak valid dari ' + url)); }
    });
  });
}

const GSTATIC_RE = /^https:\/\/fonts\.gstatic\.com\/s\/([^/]+\/[^/]+)\/([^/]+)\.ttf$/;
function parseTtf(url) {
  const m = GSTATIC_RE.exec(String(url || ''));
  if (!m) return { full: String(url || '') };
  return { p: m[1], hash: m[2] };
}

async function fetchFamily(id, attempt = 1) {
  try {
    return await curlJson(`${API}/${encodeURIComponent(id)}`);
  } catch (e) {
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchFamily(id, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  const families = {};
  const failed = [];
  const partial = [];
  let done = 0;
  async function worker(queue) {
    while (queue.length) {
      const id = queue.shift();
      try {
        const json = await fetchFamily(id);
        const variants = Array.isArray(json?.variants) ? json.variants : [];
        const byId = new Map(variants.map(v => [String(v.id), v]));
        const picked = pickFaceVariants(variants.map(v => v.id));
        const entryOut = {};
        let prefix = null;
        let kept = 0;
        for (const [face, vid] of Object.entries(picked)) {
          if (!vid) continue;
          const ttf = byId.get(vid)?.ttf;
          if (!ttf) continue;
          const parsed = parseTtf(ttf);
          if (parsed.p) {
            if (!prefix) prefix = parsed.p;
            if (parsed.p !== prefix) { entryOut[face] = ttf; }
            else entryOut[face] = parsed.hash;
            kept++;
          } else {
            entryOut[face] = ttf;
            kept++;
          }
        }
        if (kept === 0) { failed.push(id + ' (tanpa TTF)'); }
        else {
          if (prefix) entryOut.p = prefix;
          families[id] = entryOut;
          if (kept < 4) partial.push(id + ' (' + kept + '/4 face)');
        }
      } catch (e) {
        failed.push(id + ' (' + (e.message || e) + ')');
      }
      done++;
      if (done % 200 === 0) console.log(`... ${done}/${ids.length} keluarga`);
    }
  }
  const queue = [...ids];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));
  const out = { generatedAt: new Date().toISOString(), source: 'gwfh.mranftl.com/api/fonts', families };
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`selesai: ${Object.keys(families).length}/${ids.length} keluarga -> ${OUT} (${fs.statSync(OUT).size} byte)`);
  console.log(`gagal: ${failed.length}`, failed.slice(0, 10));
  console.log(`parsial (<4 face): ${partial.length}`, partial.slice(0, 10));
}

main().catch(e => { console.error('GENERATOR FATAL:', e); process.exit(1); });
