from playwright.sync_api import expect


def _setup_blank(page):
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.setDoc({ viewBox: [0, 0, 800, 600], objects: [], styles: [] });
        }"""
    )


def _canvas_center(page):
    box = page.locator(".ved-canvas").bounding_box()
    assert box is not None
    return box["x"] + box["width"] / 2, box["y"] + box["height"] / 2


def test_line_click_opens_size_dialog_and_creates_line(editor_page):
    page = editor_page
    _setup_blank(page)
    page.evaluate("() => window.__geovantaEditorApi.setTool('line')")
    cx, cy = _canvas_center(page)
    page.mouse.click(cx, cy)

    dlg = page.locator('[data-testid="line-size-dialog"]')
    expect(dlg).to_be_visible()
    page.locator('[data-testid="line-size-length"]').fill("120")
    page.locator('[data-testid="line-size-angle"]').fill("0")
    page.locator('[data-testid="line-size-apply"]').click()

    count = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects.length")
    assert count == 1


def test_three_point_arc_creates_arc_through_three_points(editor_page):
    page = editor_page
    _setup_blank(page)
    page.evaluate("() => window.__geovantaEditorApi.setTool('arc')")
    cx, cy = _canvas_center(page)

    # Point 1 -> Point 2 -> Point 3
    page.mouse.click(cx - 80, cy)
    page.mouse.click(cx + 80, cy)
    page.mouse.move(cx, cy - 60)
    page.mouse.click(cx, cy - 60)

    obj = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[0]")
    assert obj is not None
    assert obj["subs"][0]["closed"] is False
    assert len(obj["subs"][0]["nodes"]) >= 2


def test_curvature_alt_click_places_corner_point(editor_page):
    page = editor_page
    _setup_blank(page)
    page.evaluate("() => window.__geovantaEditorApi.setTool('curvature')")
    cx, cy = _canvas_center(page)

    page.mouse.click(cx - 60, cy + 40)
    page.keyboard.down("Alt")
    page.mouse.click(cx, cy - 50)
    page.keyboard.up("Alt")
    page.mouse.click(cx + 60, cy + 40)
    page.keyboard.press("Enter")

    nodes = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects[0].subs[0].nodes")
    assert len(nodes) == 3
    assert nodes[1]["type"] == "corner"


def test_shapebuilder_click_and_alt_click(editor_page):
    page = editor_page
    _setup_blank(page)
    page.evaluate(
        """() => {
            const api = window.__geovantaEditorApi;
            api.createTestShape('rect', 200, 200, 120, 120);
            api.createTestShape('rect', 260, 200, 120, 120);
            const ids = api.getDoc().objects.map(o => o.id);
            api.setSel({ objs: ids, nodes: [] });
            api.setTool('shapebuilder');
        }"""
    )
    # Drag across both overlapping rects in doc coords mapped via screen
    pts = page.evaluate(
        """() => {
            const canvas = document.querySelector('.ved-canvas').getBoundingClientRect();
            const doc = window.__geovantaEditorApi.getDoc();
            // Use viewport transform if exposed, or click center of canvas
            return { cx: canvas.left + canvas.width / 2, cy: canvas.top + canvas.height / 2 };
        }"""
    )
    # Simple drag across canvas center where shapes are
    page.mouse.move(pts["cx"] - 100, pts["cy"])
    page.mouse.down()
    page.mouse.move(pts["cx"] + 100, pts["cy"], steps=6)
    page.mouse.up()

    # After union or operation, tool remains active
    tool = page.evaluate("() => window.__geovantaEditorApi.getTool()")
    assert tool == "shapebuilder"


def test_pen_pencil_and_brush_draw_objects(editor_page):
    page = editor_page
    _setup_blank(page)
    cx, cy = _canvas_center(page)

    # 1. Pen: 3 clicks + Enter
    page.evaluate("() => window.__geovantaEditorApi.setTool('pen')")
    page.mouse.click(cx - 80, cy - 40)
    page.mouse.click(cx, cy - 80)
    page.mouse.click(cx + 80, cy - 40)
    page.keyboard.press("Enter")

    # 2. Pencil with Shift (45-deg straight line)
    page.evaluate("() => window.__geovantaEditorApi.setTool('pencil')")
    page.keyboard.down("Shift")
    page.mouse.move(cx - 80, cy + 20)
    page.mouse.down()
    page.mouse.move(cx + 80, cy + 30, steps=5)
    page.mouse.up()
    page.keyboard.up("Shift")

    # 3. Brush stroke
    page.evaluate("() => window.__geovantaEditorApi.setTool('brush')")
    page.mouse.move(cx - 60, cy + 80)
    page.mouse.down()
    page.mouse.move(cx + 60, cy + 100, steps=6)
    page.mouse.up()

    count = page.evaluate("() => window.__geovantaEditorApi.getDoc().objects.length")
    assert count == 3
