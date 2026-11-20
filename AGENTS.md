# Agent Instructions

## Universal Rule: Mandatory Playwright Usage

Every agent task requiring browser interaction, web testing, web automation, or code-based verification MUST strictly and exclusively use **Playwright Regular** and **Playwright MCP**. The use of any other browser automation tools (e.g. `agent-browser`, Puppeteer, Selenium, Cypress) or other test runners (Jest, Vitest, Mocha, Pytest, Node:test) is strictly prohibited.

### 1. Playwright MCP (Interactive Browser Automation & Exploration)
Use the Playwright MCP server tools for all live browser navigation, interactive page actions, DOM inspection, and accessibility snapshot workflows:
- **Navigation:** `browser_navigate` (navigate to URL)
- **Snapshot & Inspection:** `browser_snapshot` (retrieve accessibility tree with element targets), `browser_take_screenshot` (capture visual screenshot)
- **Interaction:** `browser_click`, `browser_type`, `browser_fill_form`, `browser_hover`, `browser_select_option`, `browser_press_key`
- **Tab & Window Management:** `browser_tabs` (new, list, close, select), `browser_resize`
- **Wait & Diagnostics:** `browser_wait_for`, `browser_console_messages`, `browser_evaluate`

Core workflow:
1. Navigate: Use `browser_navigate` with the target URL.
2. Inspect: Use `browser_snapshot` to get the accessibility tree and element target references.
3. Act: Use `browser_click`, `browser_type`, etc. targeting the element references.
4. Verify: Run `browser_snapshot` or `browser_wait_for` after actions to confirm state changes.

### 2. Playwright Regular (Automated Testing, TDD, and Scripting)
Use Playwright Regular (`@playwright/test` and `npx playwright test`) for all automated test suites, regression tests, and programmatic scripts:
- All unit, integration, and E2E tests must be written with `@playwright/test`.
- Run tests via `npx playwright test <path>`.
- Any custom automation scripts must use standard `playwright` (Node.js/Python API).
