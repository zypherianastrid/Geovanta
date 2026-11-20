---
name: playwright-mcp
description: Browser automation and web testing using Playwright MCP and Playwright Regular. Use whenever interacting with websites, navigating pages, filling forms, clicking elements, taking snapshots/screenshots, inspecting accessibility trees, running E2E web tests, or automating browser workflows. Mandatory for all web interaction and testing.
---

# Playwright MCP & Playwright Regular Guide

## Mandatory Iron Law

```
ALL BROWSER AUTOMATION AND WEB INTERACTION MUST USE PLAYWRIGHT MCP.
ALL AUTOMATED TEST SCRIPTS AND TEST SUITES MUST USE PLAYWRIGHT REGULAR.
NO OTHER BROWSER TOOLS OR TEST RUNNERS PERMITTED.
```

- **Interactive browser automation, exploration, and live web interactions:** Use **Playwright MCP** tools directly.
- **Automated test suites, unit/integration/E2E test files, TDD, CI/CD verification:** Use **Playwright Regular** (`@playwright/test` and `npx playwright test`).
- Other tools (`agent-browser`, Puppeteer, Selenium, Cypress, Jest, Vitest, Mocha, Pytest) are strictly forbidden.

---

## 1. Playwright MCP (Interactive Browser Automation)

Playwright MCP communicates directly with real browsers via accessibility-tree snapshots and element target references.

### Available MCP Tools

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `browser_navigate` | Navigate to a web URL | `url` |
| `browser_snapshot` | Get accessibility tree snapshot with unique element targets | `mode` ("full", "none") |
| `browser_take_screenshot` | Capture visual screenshot of page or element | `filename`, `fullPage` |
| `browser_click` | Click on an element | `target` (element ref or selector), `button`, `doubleClick` |
| `browser_type` | Type text into an element | `target`, `text`, `delay` |
| `browser_fill_form` | Batch fill form fields | `elements` (array of `{ target, value }`) |
| `browser_select_option` | Select option in dropdown | `target`, `values` |
| `browser_hover` | Hover over element | `target` |
| `browser_press_key` | Send keyboard key or key combination | `key` (e.g. "Enter", "Tab") |
| `browser_wait_for` | Wait for text to appear/disappear or time | `time`, `text`, `textGone` |
| `browser_tabs` | Manage browser tabs (list, new, close, select) | `action`, `url`, `index` |
| `browser_console_messages` | Retrieve browser console logs | `level` ("error", "warning", "info", "debug") |
| `browser_evaluate` | Evaluate JavaScript on the page or element | `function`, `target` |
| `browser_handle_dialog` | Accept or dismiss modal dialogs / alerts | `accept`, `promptText` |
| `browser_resize` | Resize browser viewport | `width`, `height` |
| `browser_close` | Close current browser page | None |

### Standard Interactive Workflow

1. **Navigate to URL:**
   Call `browser_navigate` with the destination URL.
2. **Inspect Accessibility Snapshot:**
   Call `browser_snapshot` to receive the element tree with assigned target references (e.g., target ref or unique selector).
3. **Interact with Elements:**
   Call `browser_click`, `browser_type`, or `browser_fill_form` using the `target` identified from the snapshot.
4. **Wait and Verify:**
   Use `browser_wait_for` or run another `browser_snapshot` to confirm the expected DOM change or state transition.

---

## 2. Playwright Regular (Test Suites & Scripting)

For automated test suites, regression testing, and CI verification, use standard Playwright (`@playwright/test`).

### Test Authoring Pattern

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Verification', () => {
  test('should perform action and verify outcome', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('h1')).toBeVisible();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Success')).toBeVisible();
  });
});
```

### Execution Commands

```bash
# Run all tests
npx playwright test

# Run a specific test file
npx playwright test tests/example.spec.ts

# Run tests in headed mode
npx playwright test --headed

# Run with trace and debug
npx playwright test --debug
```

---

## 3. Combining MCP and Regular Playwright

- Use **Playwright MCP** during exploratory sessions, live debugging, troubleshooting web pages, navigating live apps, or inspecting live DOM.
- Use **Playwright Regular** to crystallize reproducible tests, build TDD cycles, enforce regression baselines, and verify PRs before completion.
