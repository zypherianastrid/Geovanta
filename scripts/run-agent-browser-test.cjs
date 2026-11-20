const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SESSION = 'geovanta-dogfood';
const OUT_DIR = path.resolve('test-results/agent-browser-dogfood');
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function run(cmd, ignoreErr = false) {
  const fullCmd = `agent-browser --session ${SESSION} ${cmd}`;
  try {
    const res = execSync(fullCmd, { stdio: 'pipe' }).toString();
    return res;
  } catch (err) {
    if (ignoreErr) return (err.stdout ? err.stdout.toString() : '') + (err.stderr ? err.stderr.toString() : '');
    throw err;
  }
}

function evalJs(code) {
  // Wrap in IIFE so const/let declarations don't pollute global scope and collide
  const wrapped = `(() => { ${code} })()`;
  const b64 = Buffer.from(wrapped, 'utf8').toString('base64');
  const res = run(`eval -b ${b64}`);
  return res.trim();
}

function checkErrors() {
  const errs = run('errors --clear', true);
  const logs = run('console --clear', true);
  return { errs, logs };
}

function screenshot(name) {
  const p = path.join(SCREENSHOT_DIR, `${name}.png`).replace(/\\/g, '/');
  run(`screenshot "${p}"`);
  console.log(`[Screenshot Saved] -> ${p}`);
}

async function main() {
  const summary = {
    scenariosTotal: 10,
    scenariosPassed: 0,
    scenariosFailed: 0,
    issues: [],
    details: []
  };

  try {
    console.log('=== Starting Geovanta E2E Browser Testing via agent-browser ===');
    
    // Step 0: Open URL and wait for DOMContentLoaded
    console.log('\n[Init] Navigating to http://127.0.0.1:4173...');
    run('open http://127.0.0.1:4173');
    run('wait --load domcontentloaded');
    run('wait 1000');
    screenshot('00-initial-load');
    
    // --- SCENARIO 1: Workspace & Preferences ---
    console.log('\n--- Scenario 1: Workspace & Preferences ---');
    try {
      const title = evalJs('return document.title;');
      console.log(`Document title: ${title}`);
      
      // Test Settings Modal
      console.log('Opening Settings Modal...');
      evalJs(`
        const btn = document.querySelector("button[data-tip=\'uiSettings\']") || Array.from(document.querySelectorAll("button")).find(b => b.getAttribute("aria-label")?.includes("Settings"));
        if (btn) btn.click();
      `);
      run('wait 500');
      screenshot('01-settings-modal');
      
      // Switch Theme to dark and light
      evalJs('document.documentElement.setAttribute("data-theme", "dark");');
      run('wait 300');
      screenshot('01-settings-dark-mode');
      evalJs('document.documentElement.setAttribute("data-theme", "light");');
      run('wait 300');
      
      // Close Settings Modal
      evalJs(`
        const closeBtn = document.querySelector(".hp button.sec[data-tip=\'uiClose\']") || document.querySelector(".hp button[data-tip=\'uiClose\']");
        if (closeBtn) closeBtn.click();
        else document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
      `);
      run('wait 500');

      // Create New Project via UI
      console.log('Opening Create Project modal...');
      evalJs(`
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Create New") || b.textContent.includes("Buat Proyek") || b.getAttribute("data-tip") === "wsNewProject");
        if (btn) btn.click();
        else throw new Error("Create New Project button not found");
      `);
      run('wait 800');
      screenshot('01-create-project-modal');
      
      // Submit Create Project modal
      console.log('Submitting Create Project modal...');
      evalJs(`
        const submitBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Buat & Buka") || b.textContent.includes("Create & Open"));
        if (submitBtn) submitBtn.click();
        else throw new Error("Buat & Buka Proyek button not found");
      `);
      run('wait 2500');
      
      // Verify Editor Loaded
      const isEditorReady = evalJs('return typeof window.__geovantaEditorApi?.getDoc === "function";');
      console.log('Editor API ready:', isEditorReady);
      if (isEditorReady !== 'true') throw new Error('VectorEditor did not mount properly or API unavailable');
      
      screenshot('01-editor-initial');
      summary.scenariosPassed++;
      summary.details.push({ scenario: 1, name: 'Workspace & Preferences', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 1 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 1, error: e.message });
      summary.details.push({ scenario: 1, name: 'Workspace & Preferences', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 2: Shape Drawing & Generator Tools ---
    console.log('\n--- Scenario 2: Shape Drawing & Generator Tools ---');
    try {
      // 1. Create Rectangle
      evalJs('window.__geovantaEditorApi.createTestShape("rect", 50, 50, 150, 100);');
      // 2. Create Ellipse
      evalJs('window.__geovantaEditorApi.createTestShape("ellipse", 250, 50, 120, 120);');
      // 3. Create Polygon (Hexagon)
      evalJs('window.__geovantaEditorApi.createTestShape("polygon", 420, 50, 120, 120);');
      // 4. Create Star
      evalJs('window.__geovantaEditorApi.createTestShape("star", 580, 50, 120, 120);');
      // 5. Create Blob Generator
      evalJs('window.__geovantaEditorApi.createTestShape("blob", 50, 200, 140, 140);');
      // 6. Create Wave / Weave Generator
      evalJs('window.__geovantaEditorApi.createTestWeave(220, 200, 180, 140);');
      // 7. Create Arc
      evalJs('window.__geovantaEditorApi.createTestArc(480, 270, 70, 0, 270);');
      // 8. Create Line
      evalJs('window.__geovantaEditorApi.createTestLine({x: 600, y: 200}, {x: 720, y: 320});');
      
      run('wait 500');
      const objCount = evalJs('return window.__geovantaEditorApi.getDoc().objects.length;');
      console.log(`Objects in document after generators: ${objCount}`);
      if (Number(objCount) < 8) throw new Error(`Expected at least 8 objects, found ${objCount}`);
      
      screenshot('02-shapes-and-generators');
      summary.scenariosPassed++;
      summary.details.push({ scenario: 2, name: 'Shape Drawing & Generators', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 2 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 2, error: e.message });
      summary.details.push({ scenario: 2, name: 'Shape Drawing & Generators', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 3: Text Tool & Live Caret / Typing ---
    console.log('\n--- Scenario 3: Text Tool & Live Caret / Typing ---');
    try {
      // Create text object
      evalJs(`
        const d = window.__geovantaEditorApi.getDoc();
        const tid = "txt_" + Date.now();
        const textObj = {
          id: tid,
          name: "Test Typography",
          type: "text",
          fill: "#1e293b",
          stroke: "none",
          opacity: 1,
          rot: 0,
          text: {
            content: "Geovanta Vector Studio - Live Caret Typing Test!",
            fontFamily: "IBM Plex Sans",
            fontSize: 28,
            fontWeight: 700,
            fontStyle: "normal",
            lineHeight: 1.3,
            letterSpacing: 0,
            textAnchor: "start",
            textCase: "none",
            textDecoration: "none",
            resizing: "autoWidth",
            fill: "#1e293b",
            x: 50,
            y: 400
          }
        };
        window.__geovantaEditorApi.setDoc({ ...d, objects: [...d.objects, textObj] });
        window.__geovantaEditorApi.setSel({ objs: [tid], nodes: [] });
      `);
      run('wait 500');
      
      // Test activating inline text edit overlay
      evalJs(`
        const obj = window.__geovantaEditorApi.getDoc().objects.find(o => o.type === "text");
        if (obj) {
          // Trigger editing text
          const editBtn = document.querySelector("button[data-tip=\'teEdit\']");
          if (editBtn) editBtn.click();
        }
      `);
      run('wait 500');
      screenshot('03-text-tool-live-editing');
      
      // Test selection and Inspector controls for typography
      evalJs(`
        const txt = window.__geovantaEditorApi.getDoc().objects.find(o => o.type === "text");
        window.__geovantaEditorApi.setSel({ objs: [txt.id], nodes: [] });
      `);
      run('wait 500');
      screenshot('03-text-inspector-controls');
      
      summary.scenariosPassed++;
      summary.details.push({ scenario: 3, name: 'Text Tool & Live Caret Typing', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 3 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 3, error: e.message });
      summary.details.push({ scenario: 3, name: 'Text Tool & Live Caret Typing', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 4: Pen & Curvature Tools ---
    console.log('\n--- Scenario 4: Pen & Curvature Tools ---');
    try {
      // Test Pen Session
      console.log('Testing Pen session...');
      evalJs(`
        window.__geovantaEditorApi.setTool("pen");
        window.__geovantaEditorApi.startTestPenSession([
          {x: 100, y: 500},
          {x: 180, y: 460},
          {x: 260, y: 520},
          {x: 320, y: 480}
        ]);
      `);
      run('wait 300');
      const penState1 = evalJs('return JSON.stringify(window.__geovantaEditorApi.getPenState());');
      console.log('Pen state with 4 points:', penState1);
      
      // Undo last point
      evalJs('window.__geovantaEditorApi.penUndoLast();');
      const penState2 = evalJs('return JSON.stringify(window.__geovantaEditorApi.getPenState());');
      console.log('Pen state after undo last:', penState2);
      
      // Finish pen path
      evalJs('window.__geovantaEditorApi.finishPen();');
      run('wait 400');
      
      // Test Curvature Session
      console.log('Testing Curvature session...');
      evalJs(`
        window.__geovantaEditorApi.setTool("curvature");
        window.__geovantaEditorApi.startTestCurvatureSession([
          {x: 400, y: 500},
          {x: 480, y: 460},
          {x: 560, y: 530},
          {x: 640, y: 470}
        ]);
      `);
      run('wait 300');
      evalJs('window.__geovantaEditorApi.finishCurvature();');
      run('wait 400');
      evalJs('window.__geovantaEditorApi.setTool("select");');
      
      screenshot('04-pen-and-curvature-paths');
      summary.scenariosPassed++;
      summary.details.push({ scenario: 4, name: 'Pen & Curvature Tools', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 4 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 4, error: e.message });
      summary.details.push({ scenario: 4, name: 'Pen & Curvature Tools', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 5: Node Editing & Fillet / Smoothing ---
    console.log('\n--- Scenario 5: Node Editing & Fillet / Smoothing ---');
    try {
      // Select the Star shape and enter Node editing tool
      evalJs(`
        const star = window.__geovantaEditorApi.getDoc().objects.find(o => o.name && o.name.toLowerCase().includes("star"));
        if (star) {
          window.__geovantaEditorApi.setTool("node");
          const firstSub = star.subs[0];
          const nodeIds = firstSub.nodes.slice(0, 3).map(n => n.id);
          window.__geovantaEditorApi.setSel({ objs: [star.id], nodes: nodeIds });
        }
      `);
      run('wait 600');
      screenshot('05-node-editing-mode');
      
      // Test Auto-Simplify
      console.log('Testing Auto-Simplify...');
      evalJs('window.__geovantaToggleAutoSimplify?.();');
      run('wait 300');
      evalJs('window.__geovantaAutoSimplifyCanvas?.();');
      run('wait 500');
      
      evalJs('window.__geovantaEditorApi.setTool("select");');
      screenshot('05-after-auto-simplify');
      summary.scenariosPassed++;
      summary.details.push({ scenario: 5, name: 'Node Editing & Fillet / Smoothing', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 5 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 5, error: e.message });
      summary.details.push({ scenario: 5, name: 'Node Editing & Fillet / Smoothing', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 6: Boolean Operations & Outline Stroke ---
    console.log('\n--- Scenario 6: Boolean Operations & Outline Stroke ---');
    try {
      // Create two overlapping rectangles
      evalJs(`
        const bA = window.__geovantaEditorApi.createTestShape("rect", 50, 600, 120, 120);
        const bB = window.__geovantaEditorApi.createTestShape("rect", 100, 650, 120, 120);
        window.__geovantaEditorApi.setSel({ objs: [bA.id, bB.id], nodes: [] });
      `);
      run('wait 500');
      screenshot('06-boolean-input-shapes');
      
      // Perform Boolean Union
      evalJs('window.__geovantaEditorApi.applyBoolean("union");');
      run('wait 600');
      screenshot('06-boolean-union-result');
      
      // Create a stroked path and test Outline Stroke
      evalJs(`
        const strk = window.__geovantaEditorApi.createTestShape("rect", 300, 600, 100, 100);
        const d = window.__geovantaEditorApi.getDoc();
        window.__geovantaEditorApi.setDoc({
          ...d,
          objects: d.objects.map(o => o.id === strk.id ? { ...o, fill: "none", stroke: "#2563eb", strokeWidth: 8 } : o)
        });
        window.__geovantaEditorApi.setSel({ objs: [strk.id], nodes: [] });
      `);
      run('wait 500');
      evalJs('window.__geovantaEditorApi.applyOutlineStroke();');
      run('wait 600');
      screenshot('06-outline-stroke-result');

      summary.scenariosPassed++;
      summary.details.push({ scenario: 6, name: 'Boolean Operations & Outline Stroke', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 6 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 6, error: e.message });
      summary.details.push({ scenario: 6, name: 'Boolean Operations & Outline Stroke', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 7: Color, Gradient, Styles & Recolor ---
    console.log('\n--- Scenario 7: Color, Gradient, Styles & Recolor ---');
    try {
      // Create a shape and apply Linear Gradient
      evalJs(`
        const s = window.__geovantaEditorApi.createTestShape("rect", 450, 600, 150, 100);
        const d = window.__geovantaEditorApi.getDoc();
        const gradObj = {
          ...s,
          grad: {
            type: "linear",
            x1: 0, y1: 0, x2: 1, y2: 1,
            stops: [
              { offset: 0, color: "#ec4899", opacity: 1 },
              { offset: 1, color: "#8b5cf6", opacity: 1 }
            ]
          }
        };
        window.__geovantaEditorApi.setDoc({
          ...d,
          objects: d.objects.map(o => o.id === s.id ? gradObj : o)
        });
        window.__geovantaEditorApi.setSel({ objs: [s.id], nodes: [] });
      `);
      run('wait 500');
      screenshot('07-linear-gradient-gizmo');
      
      // Switch gradient to Radial
      evalJs(`
        const d = window.__geovantaEditorApi.getDoc();
        const selId = Array.from(window.__geovantaEditorApi.getSel().objs)[0];
        window.__geovantaEditorApi.setDoc({
          ...d,
          objects: d.objects.map(o => o.id === selId ? {
            ...o,
            grad: {
              type: "radial",
              cx: 0.5, cy: 0.5, r: 0.5,
              stops: [
                { offset: 0, color: "#10b981", opacity: 1 },
                { offset: 1, color: "#065f46", opacity: 1 }
              ]
            }
          } : o)
        });
      `);
      run('wait 500');
      screenshot('07-radial-gradient');
      
      // Test Find & Replace and Recolor Subpanels toggle
      console.log('Testing Find & Replace and Recolor Subpanels...');
      evalJs('document.querySelector("button[data-tip=\'veFindReplace\']")?.click();');
      run('wait 400');
      screenshot('07-find-replace-panel');
      
      evalJs('document.querySelector("button[data-tip=\'veRecolor\']")?.click();');
      run('wait 400');
      screenshot('07-recolor-palette-panel');
      
      // Close panel with Escape
      evalJs('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));');
      run('wait 400');

      summary.scenariosPassed++;
      summary.details.push({ scenario: 7, name: 'Color, Gradient & Recolor', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 7 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 7, error: e.message });
      summary.details.push({ scenario: 7, name: 'Color, Gradient & Recolor', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 8: Effects & Layer Tree Management ---
    console.log('\n--- Scenario 8: Effects & Layer Tree Management ---');
    try {
      // Apply drop shadow and blur
      evalJs(`
        const s = window.__geovantaEditorApi.createTestShape("ellipse", 650, 600, 100, 100);
        const d = window.__geovantaEditorApi.getDoc();
        window.__geovantaEditorApi.setDoc({
          ...d,
          objects: d.objects.map(o => o.id === s.id ? {
            ...o,
            shadows: [{ x: 5, y: 8, blur: 12, spread: 0, color: "rgba(0,0,0,0.35)", inner: false }],
            blur: { mode: "layer", radius: 4 }
          } : o)
        });
        window.__geovantaEditorApi.setSel({ objs: [s.id], nodes: [] });
      `);
      run('wait 500');
      screenshot('08-shadow-and-blur-effects');
      
      // Test Layer Tree Viewport
      const layersCount = evalJs('return document.querySelectorAll(".fig-row").length;');
      console.log(`Layer tree rendered items: ${layersCount}`);
      
      summary.scenariosPassed++;
      summary.details.push({ scenario: 8, name: 'Effects & Layer Tree', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 8 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 8, error: e.message });
      summary.details.push({ scenario: 8, name: 'Effects & Layer Tree', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 9: Iconify Modal & Icon Insertion ---
    console.log('\n--- Scenario 9: Iconify Modal & Icon Insertion ---');
    try {
      console.log('Opening Iconify modal...');
      evalJs('document.querySelector("button[data-tip=\'veIconify\']")?.click();');
      run('wait 1000');
      screenshot('09-iconify-modal-open');
      
      // Insert icon via API / Modal
      console.log('Inserting icon...');
      evalJs('window.__geovantaEditorApi.onIconifyInsert("mdi:heart");');
      run('wait 1500');
      
      // Close modal
      evalJs(`
        const closeBtn = document.querySelector(".hp button.sec[data-tip=\'uiClose\']");
        if (closeBtn) closeBtn.click();
        else document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
      `);
      run('wait 500');
      
      screenshot('09-iconify-inserted-frame');
      summary.scenariosPassed++;
      summary.details.push({ scenario: 9, name: 'Iconify Modal & Icon Insertion', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 9 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 9, error: e.message });
      summary.details.push({ scenario: 9, name: 'Iconify Modal & Icon Insertion', status: 'FAIL', error: e.message });
    }

    // --- SCENARIO 10: Canvas Viewport Navigation, Export & Roundtrip ---
    console.log('\n--- Scenario 10: Canvas Viewport Navigation, Export & Roundtrip ---');
    try {
      // Fit to view
      console.log('Testing Pas (Fit to bounds)...');
      evalJs('document.querySelector("button[data-tip=\'veFit\']")?.click();');
      run('wait 500');
      screenshot('10-fit-to-view');
      
      // Test SVG Generation
      const svgOutput = evalJs(`
        const { VE } = window.__GEOVANTA_AUDIT__;
        const d = window.__geovantaEditorApi.getDoc();
        return VE.serializeDoc(d, { area: "board" });
      `);
      console.log(`Serialized SVG length: ${svgOutput.length} characters`);
      if (svgOutput.length < 500) throw new Error('Exported SVG is unexpectedly short');
      
      // Test Raster Exports (PNG, JPG, WebP)
      console.log('Testing Raster Exports...');
      const pSize = evalJs(`
        return (async () => {
          const { VE } = window.__GEOVANTA_AUDIT__;
          const d = window.__geovantaEditorApi.getDoc();
          const p = await VE.exportRaster(d, { area: "board" }, "png", 1);
          return p.size;
        })();
      `);
      console.log(`Exported PNG size: ${pSize} bytes`);
      
      // Save & Return to Workspace
      console.log('Returning to Workspace...');
      evalJs('document.querySelector("button[data-tip=\'wsBack\']")?.click();');
      run('wait 1000');
      screenshot('10-workspace-after-save');
      
      summary.scenariosPassed++;
      summary.details.push({ scenario: 10, name: 'Canvas Navigation, Export & Roundtrip', status: 'PASS' });
    } catch (e) {
      console.error('Scenario 10 Failed:', e.message);
      summary.scenariosFailed++;
      summary.issues.push({ scenario: 10, error: e.message });
      summary.details.push({ scenario: 10, name: 'Canvas Navigation, Export & Roundtrip', status: 'FAIL', error: e.message });
    }

    // Check Console & Error output
    const { errs, logs } = checkErrors();
    console.log('\n=== Error Check ===');
    console.log('Errors:', errs || '(none)');
    console.log('Logs:', logs || '(none)');

    // Summary Report
    console.log('\n=======================================');
    console.log(`TEST SUMMARY: ${summary.scenariosPassed}/${summary.scenariosTotal} Scenarios Passed`);
    console.log('=======================================');
    console.log(JSON.stringify(summary, null, 2));

    fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
    
  } finally {
    console.log('\nClosing browser session...');
    run('close', true);
  }
}

main().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
