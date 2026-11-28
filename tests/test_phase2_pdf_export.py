from playwright.sync_api import expect


def test_pdf_vector_export_cmyk_bleed_and_crop_marks(editor_page):
    page = editor_page
    page.evaluate("""() => {
        const api = window.__geovantaEditorApi;
        api.createTestShape('rect', 60, 60, 140, 100);
        api.setSelObjs([]);
    }""")

    # Select PDF format in Export panel
    pdf_pill = page.locator('[data-testid="export-fmt-pdf"]')
    expect(pdf_pill).to_be_visible()
    pdf_pill.click()

    # Print-ready options must be visible
    print_opts = page.locator('[data-testid="pdf-print-options"]')
    expect(print_opts).to_be_visible()

    # Toggle CMYK and Crop Marks, select 3mm bleed via custom Select & ChartSwitch
    page.locator('[data-testid="pdf-cmyk-toggle"]').click()
    page.locator('[data-testid="pdf-bleed-select"]').click()
    page.locator('[role="option"][data-opt-key="3"]').click()
    page.locator('[data-testid="pdf-cropmarks-toggle"]').click()

    # Verify generated PDF string
    pdf_str = page.evaluate("""() => {
        return window.__geovantaEditorApi.exportPdfString();
    }""")
    assert pdf_str.startswith('%PDF-1.4'), f"Invalid PDF header: {pdf_str[:40]}"
    assert '/TrimBox' in pdf_str
    assert '/BleedBox' in pdf_str
    assert ' k\n' in pdf_str or ' K\n' in pdf_str, "Expected CMYK color operators in PDF"

    # Trigger download and verify .pdf extension
    with page.expect_download() as dl_info:
        page.locator('[data-tip="veDownload"]').click()
    assert dl_info.value.suggested_filename.endswith('.pdf')
