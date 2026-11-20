/**
 * @file scripts/generate-perfume-logo.js
 * @description Demonstrasi pemanggilan Geovanta MCP Tools untuk merancang Logo Parfum Modern Minimalis
 */
const fs = require('fs');
const path = require('path');
const { GeovantaMcpServer } = require('./mcp-server/index.js');
const { createShape, serializeDoc, applyCornerFillet, simplifyCurves } = require('./mcp-server/engineAdapter.js');

async function createPerfumeLogo() {
  console.log('--- Memulai Pengujian Geovanta MCP Tools ---');
  const server = new GeovantaMcpServer({ port: 38299, stdio: false });
  await server.start();
  console.log('✅ Geovanta MCP Server aktif');

  // 1. Tool Status Check
  const statusRes = await server.handleToolCall('geovanta_status', {});
  console.log('✅ geovanta_status output:', statusRes.content[0].text);

  // 2. Badan Botol Parfum (Body) dengan proporsi ramping & mewah
  console.log('\n[Tool 1: geovanta_shape_create] Membuat siluet badan botol parfum (Rectangle)...');
  const bottleBody = createShape({
    type: 'rectangle',
    x: 120,
    y: 165,
    width: 160,
    height: 220,
    fill: '#141416', // Obsidian matte black
    stroke: '#d4af37', // Champagne gold accent stroke
    strokeWidth: 2.5
  });

  // Terapkan geovanta_corner_fillet pada badan botol agar sudutnya membulat mewah
  console.log('[Tool 2: geovanta_corner_fillet] Menerapkan fillet 20px pada bahu & dasar botol...');
  const filletedBodyDoc = applyCornerFillet({
    id: 'perfume-doc',
    artboard: { w: 400, h: 480, bg: '#09090b' },
    objects: [bottleBody],
    selection: []
  }, 20);
  const refinedBody = filletedBodyDoc.objects[0];

  // 3. Leher Botol (Neck & Collar)
  console.log('[Tool 3: geovanta_shape_create] Membuat leher botol silindris (Neck)...');
  const neck = createShape({
    type: 'rectangle',
    x: 180,
    y: 135,
    width: 40,
    height: 30,
    fill: '#222226',
    stroke: '#d4af37',
    strokeWidth: 1.5
  });

  // 4. Tutup Botol Mewah (Cap)
  console.log('[Tool 4: geovanta_shape_create] Membuat tutup botol emas geometris (Cap)...');
  const cap = createShape({
    type: 'rectangle',
    x: 155,
    y: 70,
    width: 90,
    height: 65,
    fill: '#d4af37', // Polished gold
    stroke: '#fef08a',
    strokeWidth: 1.5
  });

  // 5. Esensi Aroma: Tetesan Organik (Blob) di bagian tengah botol
  console.log('[Tool 5: geovanta_shape_create] Menghasilkan esensi cairan aroma (Organic Blob)...');
  const essenceDrop = createShape({
    type: 'blob',
    points: 7,
    rx: 42,
    ry: 48,
    cx: 200,
    cy: 275,
    fill: 'rgba(212, 175, 55, 0.18)',
    stroke: '#d4af37',
    strokeWidth: 1.2
  });

  // Sederhanakan kurva esensi aroma dengan geovanta_curve_simplify
  console.log('[Tool 6: geovanta_curve_simplify] Mengoptimasi kurva esensi aroma (presisi 100%)...');
  const simplifiedDropDoc = simplifyCurves({
    id: 'drop-doc',
    artboard: { w: 400, h: 480, bg: '#09090b' },
    objects: [essenceDrop],
    selection: []
  }, { level: 100 });
  const refinedDrop = simplifiedDropDoc.doc.objects[0];

  // 6. Pendar Aroma / Diamond Star di pusat esensi
  console.log('[Tool 7: geovanta_shape_create] Menambahkan pendar kilau aroma (4-Point Star)...');
  const starBrilliance = createShape({
    type: 'star',
    points: 4,
    innerRadius: 6,
    outerRadius: 24,
    cx: 200,
    cy: 275,
    fill: '#d4af37',
    stroke: '#ffffff',
    strokeWidth: 0.8
  });

  // 7. Lingkaran Halo Konsentris di sekeliling esensi
  console.log('[Tool 8: geovanta_shape_create] Menambahkan halo konsentris halus (Circle)...');
  const haloRing = createShape({
    type: 'circle',
    cx: 200,
    cy: 275,
    radius: 54,
    fill: 'none',
    stroke: 'rgba(212, 175, 55, 0.4)',
    strokeWidth: 1
  });

  // Gabungkan seluruh objek ke dalam dokumen
  const finalDoc = {
    id: 'perfume-logo-doc',
    artboard: { w: 400, h: 480, bg: '#0b0b0e' },
    viewBox: [0, 0, 400, 480],
    objects: [
      refinedBody,
      neck,
      cap,
      haloRing,
      refinedDrop,
      starBrilliance
    ],
    selection: []
  };

  // 8. Serialisasi ke SVG
  console.log('[Tool 9: geovanta_svg_serialize] Mengekspor ke SVG...');
  let svg = serializeDoc(finalDoc);

  // Sematkan tipografi logo modern di bawah botol
  const typography = `
  <!-- Luxury Typography -->
  <g id="brand-typography" transform="translate(200, 428)" text-anchor="middle">
    <text font-family="'Cinzel', 'Playfair Display', 'Times New Roman', serif" font-size="16" letter-spacing="9" fill="#d4af37" font-weight="600">AURA</text>
    <text y="18" font-family="'Inter', -apple-system, sans-serif" font-size="7.5" letter-spacing="5" fill="#71717a" font-weight="400">EAU DE PARFUM · GEOVANTA</text>
  </g>
</svg>`;
  svg = svg.replace('</svg>', typography);

  const outputPath = path.resolve(process.cwd(), 'perfume-logo-modern.svg');
  fs.writeFileSync(outputPath, svg, 'utf8');
  console.log(`\n🎉 SUKSES! Logo parfum modern minimalis tersimpan di:\n   ${outputPath}`);

  await server.stop();
  return outputPath;
}

createPerfumeLogo().catch(console.error);
