---
name: agent-browser
description: DEPRECATED - Replaced by playwright-mcp. All browser automation and web testing MUST use Playwright MCP and Playwright Regular.
---

# Agent Browser (DEPRECATED - REPLACED BY PLAYWRIGHT MCP)

> [!IMPORTANT]
> `agent-browser` has been replaced by **Playwright MCP** and **Playwright Regular**.
> Do not use `agent-browser` CLI.

## Mandatory Replacement

- **For Interactive Browser Automation & Web Tasks:**
  Use the **Playwright MCP** server tools (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, etc.).
  See the [`playwright-mcp`](../playwright-mcp/SKILL.md) skill.

- **For Automated Testing & Scripting:**
  Use **Playwright Regular** (`@playwright/test` and `npx playwright test`).

Refer to `playwright-mcp` for complete documentation and workflow instructions.
