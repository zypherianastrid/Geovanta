import re
from pathlib import Path


def _strip_comments(src: str) -> str:
    src = re.sub(r"/\*[\s\S]*?\*/", "", src)
    src = re.sub(r"//[^\n]*", "", src)
    return src


def test_zero_native_html_inputs_and_selects(editor_page):
    root = Path(__file__).resolve().parent.parent
    comp_dir = root / "src" / "components"
    offenders = []
    for tsx in comp_dir.rglob("*.tsx"):
        text = _strip_comments(tsx.read_text(encoding="utf-8", errors="ignore"))
        if re.search(r"<(?:input|select|textarea)\b", text):
            offenders.append(str(tsx.relative_to(root)))
    assert not offenders, f"Found native <input>/<select>/<textarea> in components: {offenders}"

    page = editor_page
    native_count = page.locator("input, select, textarea").count()
    assert native_count == 0, f"Expected 0 native input/select/textarea elements in DOM, found {native_count}"

    # Also verify 0 native inputs inside all 3 Dev Mode tabs
    page.locator('[data-testid="toggle-dev-mode"]').click()
    for tab_id in ("inspect", "tokens", "assets"):
        page.locator(f'[data-testid="dev-tab-{tab_id}"]').click()
        assert page.locator("input, select, textarea").count() == 0
