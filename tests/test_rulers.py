from playwright.sync_api import expect


def test_rulers_dropdown_guides_units_and_origin(editor_page):
    page = editor_page

    # Open combined Grid & Rulers dropdown in floating bar
    grid_ruler_chevron = page.locator('[data-testid="grid-rulers-chevron"]')
    expect(grid_ruler_chevron).to_be_visible()
    grid_ruler_chevron.click()

    # Toggle Rulers ON
    rulers_toggle = page.locator('[data-testid="toggle-rulers"]')
    expect(rulers_toggle).to_be_visible()
    rulers_toggle.click()

    # Horizontal & vertical ruler strips and corner box must be visible
    h_ruler = page.locator('[data-testid="canvas-ruler-h"]')
    v_ruler = page.locator('[data-testid="canvas-ruler-v"]')
    corner = page.locator('[data-testid="canvas-ruler-corner"]')
    expect(h_ruler).to_be_visible()
    expect(v_ruler).to_be_visible()
    expect(corner).to_be_visible()

    # Switch unit to mm from the dropdown
    unit_mm = page.locator('[data-testid="ruler-unit-mm"]')
    unit_mm.click()
    assert corner.get_attribute("data-unit") == "mm"

    # Drag from horizontal ruler onto canvas to create a horizontal guide
    hbox = h_ruler.bounding_box()
    assert hbox is not None
    page.mouse.move(hbox["x"] + hbox["width"] / 2, hbox["y"] + hbox["height"] / 2)
    page.mouse.down()
    page.mouse.move(hbox["x"] + hbox["width"] / 2, hbox["y"] + 160, steps=6)
    page.mouse.up()

    guides = page.locator('[data-testid="canvas-guide-line"]')
    expect(guides).to_have_count(1)

    # Drag corner to shift ruler origin, then double-click corner to reset to (0, 0)
    cbox = corner.bounding_box()
    assert cbox is not None
    cx, cy = cbox["x"] + cbox["width"] / 2, cbox["y"] + cbox["height"] / 2
    page.mouse.move(cx, cy)
    page.mouse.down()
    page.mouse.move(cx + 80, cy + 60, steps=5)
    page.mouse.up()
    assert corner.get_attribute("data-origin") != "0,0"

    corner.dblclick()
    assert corner.get_attribute("data-origin") == "0,0"
