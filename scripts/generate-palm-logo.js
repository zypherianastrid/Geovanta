/**
 * @file scripts/generate-palm-logo.js
 * @description Generates a pixel-perfect modern minimalist palm oil company logo for Geovanta
 */

const fs = require('fs');
const path = require('path');
const {
  parseSVG,
  simplifyCurves
} = require('./mcp-server/engineAdapter.js');

async function main() {
  console.log('[Palm Logo Generator] Initiating pixel-perfect palm oil company logo design...');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="1000" height="800" viewBox="0 0 1000 800">
  <defs>
    <!-- Ultra-Smooth Golden Crude Palm Oil Vertical Gradient -->
    <linearGradient id="cpo-gold-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="22%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="80%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>

    <!-- Deep Forest Emerald (Left Fronds) -->
    <linearGradient id="leaf-emerald-left" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="40%" stop-color="#10b981"/>
      <stop offset="80%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>

    <!-- Deep Forest Emerald (Right Fronds) -->
    <linearGradient id="leaf-emerald-right" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="40%" stop-color="#10b981"/>
      <stop offset="80%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>

    <!-- Deep Forest Emerald (Trunk Base) -->
    <linearGradient id="leaf-emerald-center" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
  </defs>

  <!-- 1. Sustainable Eco-Solar Outer Geometric Guide Rings -->
  <g id="solar-halo">
    <circle cx="500" cy="330" r="185" fill="none" stroke="#10b981" stroke-width="1.8" opacity="0.45"/>
    <circle cx="500" cy="330" r="168" fill="none" stroke="#cbd5e1" stroke-width="1.2" opacity="0.75"/>
  </g>

  <!-- 2. Geometric Palm Fronds Cluster (Symmetrical Modern Fan) -->
  <g id="palm-fronds-group">
    <!-- Base Trunk Connector / Soil Foundation -->
    <path id="trunk-base" fill="url(#leaf-emerald-center)" d="M 488 475 C 494 465, 497 450, 498 438 L 502 438 C 503 450, 506 465, 512 475 C 504 478, 496 478, 488 475 Z"/>

    <!-- Left Frond 1 (Top / Crown sweep) -->
    <path id="frond-left-top" fill="url(#leaf-emerald-left)" d="M 495 240 C 475 200, 435 178, 385 175 C 405 202, 430 226, 465 242 C 480 248, 490 246, 495 240 Z"/>

    <!-- Right Frond 1 (Top / Crown sweep) -->
    <path id="frond-right-top" fill="url(#leaf-emerald-right)" d="M 505 240 C 525 200, 565 178, 615 175 C 595 202, 570 226, 535 242 C 520 248, 510 246, 505 240 Z"/>

    <!-- Left Frond 2 (Upper-Mid Dynamic Arc) -->
    <path id="frond-left-mid-high" fill="url(#leaf-emerald-left)" d="M 488 285 C 450 250, 390 240, 335 250 C 365 272, 405 290, 455 295 C 472 296, 484 292, 488 285 Z"/>

    <!-- Right Frond 2 (Upper-Mid Dynamic Arc) -->
    <path id="frond-right-mid-high" fill="url(#leaf-emerald-right)" d="M 512 285 C 550 250, 610 240, 665 250 C 635 272, 595 290, 545 295 C 528 296, 516 292, 512 285 Z"/>

    <!-- Left Frond 3 (Mid Horizontal Wing) -->
    <path id="frond-left-mid" fill="url(#leaf-emerald-left)" d="M 482 340 C 435 315, 365 320, 310 345 C 345 362, 395 368, 450 360 C 468 357, 478 350, 482 340 Z"/>

    <!-- Right Frond 3 (Mid Horizontal Wing) -->
    <path id="frond-right-mid" fill="url(#leaf-emerald-right)" d="M 518 340 C 565 315, 635 320, 690 345 C 655 362, 605 368, 550 360 C 532 357, 522 350, 518 340 Z"/>

    <!-- Left Frond 4 (Lower Upward Swoop) -->
    <path id="frond-left-low" fill="url(#leaf-emerald-left)" d="M 482 398 C 432 385, 370 405, 325 445 C 365 450, 415 440, 460 415 C 474 408, 480 403, 482 398 Z"/>

    <!-- Right Frond 4 (Lower Upward Swoop) -->
    <path id="frond-right-low" fill="url(#leaf-emerald-right)" d="M 518 398 C 568 385, 630 405, 675 445 C 635 450, 585 440, 540 415 C 526 408, 520 403, 518 398 Z"/>

    <!-- Left Cradle Frond 5 (Base Support Cup) -->
    <path id="frond-left-base" fill="url(#leaf-emerald-left)" d="M 485 445 C 445 440, 395 470, 365 515 C 405 505, 450 485, 480 455 C 484 451, 485 448, 485 445 Z"/>

    <!-- Right Cradle Frond 5 (Base Support Cup) -->
    <path id="frond-right-base" fill="url(#leaf-emerald-right)" d="M 515 445 C 555 440, 605 470, 635 515 C 595 505, 550 485, 520 455 C 516 451, 515 448, 515 445 Z"/>
  </g>

  <!-- 3. Central Golden Palm Oil Droplet (The Golden Harvest / CPO) -->
  <g id="golden-oil-droplet">
    <!-- Pure Sculpted Droplet with Continuous Multi-Stop Gradient -->
    <path id="oil-droplet-core" fill="url(#cpo-gold-grad)" d="M 500 248 C 500 248, 442 345, 442 400 C 442 432, 468 458, 500 458 C 532 458, 558 432, 558 400 C 558 345, 500 248, 500 248 Z"/>
  </g>

  <!-- 4. Decorative Precision Accents -->
  <g id="precision-geometry">
    <polygon id="crown-diamond" points="500,148 506,155 500,162 494,155" fill="#f59e0b"/>
    <circle cx="315" cy="330" r="3" fill="#10b981" opacity="0.8"/>
    <circle cx="685" cy="330" r="3" fill="#10b981" opacity="0.8"/>
    <circle cx="355" cy="515" r="2.5" fill="#059669" opacity="0.6"/>
    <circle cx="645" cy="515" r="2.5" fill="#059669" opacity="0.6"/>
  </g>

  <!-- 5. Corporate Brand Typography -->
  <g id="corporate-branding">
    <!-- Primary Company Name: PALMARIS (Centered at x=500) -->
    <text id="brand-name" x="500" y="585" text-anchor="middle" font-family="'IBM Plex Sans', sans-serif" font-size="44" font-weight="800" fill="#0f172a">PALMARIS</text>

    <!-- Secondary Line with Flanking Rules: AGRO LESTARI -->
    <g id="brand-subline">
      <!-- Left decorative rule -->
      <line id="rule-left" x1="330" y1="621" x2="395" y2="621" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/>

      <!-- Center Text: AGRO LESTARI (Centered at x=500) -->
      <text id="brand-subtext" x="500" y="626" text-anchor="middle" font-family="'IBM Plex Sans', sans-serif" font-size="14.5" font-weight="700" fill="#047857">AGRO LESTARI</text>

      <!-- Right decorative rule -->
      <line id="rule-right" x1="605" y1="621" x2="670" y2="621" stroke="#10b981" stroke-width="1.8" stroke-linecap="round"/>
    </g>

    <!-- Tertiary Sustainability Tagline (Centered at x=500) -->
    <text id="brand-tagline" x="500" y="662" text-anchor="middle" font-family="'IBM Plex Sans', sans-serif" font-size="11" font-weight="500" fill="#64748b">SUSTAINABLE PALM RESOURCES &amp; ENERGY</text>
  </g>
</svg>`;
  // 1. Process via Geovanta MCP Engine Adapter
  console.log('[Palm Logo Generator] Parsing and validating through Geovanta Engine Adapter...');
  const parsedDoc = parseSVG(svgContent);
  console.log(`[Palm Logo Generator] Successfully parsed ${parsedDoc.objects.length} vector layers.`);

  // 2. Save SVG to project workspace root
  const outputPath = path.resolve(__dirname, '..', 'palm-oil-logo-modern.svg');
  fs.writeFileSync(outputPath, svgContent, 'utf8');
  console.log(`[Palm Logo Generator] Saved pristine SVG artifact to: ${outputPath}`);

  // 3. Send live mutation to Geovanta MCP Server via HTTP POST /api/mcp
  try {
    console.log('[Palm Logo Generator] Transmitting mutation to active Geovanta MCP server on port 38291...');
    const mcpPayload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'geovanta_live_mutate_canvas',
        arguments: {
          action: 'Render Modern Palm Oil Logo (Palmaris Agro)',
          objects: parsedDoc.objects,
          replaceAll: true
        }
      }
    };

    const res = await fetch('http://127.0.0.1:38291/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mcpPayload)
    });

    if (res.ok) {
      const data = await res.json();
      console.log('[Palm Logo Generator] Live canvas mutation status: SUCCESS');

      // Clear selection so bounding box handles do not obscure the logo
      await fetch('http://127.0.0.1:38291/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now() + 1,
          method: 'tools/call',
          params: {
            name: 'geovanta_live_select_objects',
            arguments: { ids: [] }
          }
        })
      });
      console.log('[Palm Logo Generator] Cleared selection handles for pristine presentation.');
    } else {
      console.log('[Palm Logo Generator] MCP HTTP returned status:', res.status);
    }
  } catch (err) {
    console.log('[Palm Logo Generator] Note: Live mutation bridge skipped or deferred:', err.message);
  }

  console.log('[Palm Logo Generator] Generation completed successfully!');
}

main().catch(err => {
  console.error('[Palm Logo Generator] Error:', err);
  process.exit(1);
});
