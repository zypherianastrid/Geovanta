use wasm_bindgen::prelude::*;

pub mod flattener;
pub mod triangulator;
pub mod simplifier;
pub mod viewport;
pub mod tracer;

#[wasm_bindgen]
pub fn wasm_engine_version() -> String {
    "1.0.0-geovanta-wasm".to_string()
}

#[wasm_bindgen]
pub fn point_to_chord_dist_sq(
    px: f64,
    py: f64,
    x0: f64,
    y0: f64,
    dx: f64,
    dy: f64,
    chord_len_sq: f64,
) -> f64 {
    flattener::point_to_chord_dist_sq(px, py, x0, y0, dx, dy, chord_len_sq)
}

#[wasm_bindgen]
pub fn flatten_cubic_adaptive_flat(
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    x3: f64,
    y3: f64,
    tol_sq: f64,
    max_depth: u32,
    min_seg_len_sq: f64,
    seg_vertex_limit: usize,
) -> Vec<f64> {
    let mut out_pts = Vec::with_capacity(32);
    flattener::flatten_rec(
        x0, y0, x1, y1, x2, y2, x3, y3,
        0, max_depth, tol_sq, min_seg_len_sq, seg_vertex_limit,
        &mut out_pts,
    );
    out_pts
}

#[wasm_bindgen]
pub fn has_polygon_self_intersection_flat(coords: &[f64]) -> bool {
    let n = coords.len() / 2;
    if n <= 3 {
        return false;
    }
    let mut pts_x = Vec::with_capacity(n);
    let mut pts_y = Vec::with_capacity(n);
    for i in 0..n {
        pts_x.push(coords[i * 2]);
        pts_y.push(coords[i * 2 + 1]);
    }
    triangulator::has_polygon_self_intersection(&pts_x, &pts_y)
}

#[wasm_bindgen]
pub fn ear_clip_polygon_flat(coords: &[f64]) -> Option<Vec<f32>> {
    triangulator::ear_clip_polygon(coords)
}

#[wasm_bindgen]
pub fn rdp_simplify_flat(coords: &[f64], epsilon: f64) -> Vec<f64> {
    simplifier::rdp_simplify(coords, epsilon)
}

#[wasm_bindgen]
pub fn compute_zoom_at_anchor(
    current_zoom: f64,
    current_pan_x: f64,
    current_pan_y: f64,
    target_zoom: f64,
    cx: f64,
    cy: f64,
    box_w: f64,
    box_h: f64,
    box_left: f64,
    box_top: f64,
    use_center: bool,
) -> Vec<f64> {
    viewport::compute_zoom_at_anchor(
        current_zoom, current_pan_x, current_pan_y, target_zoom,
        cx, cy, box_w, box_h, box_left, box_top, use_center,
    )
}

#[wasm_bindgen]
pub fn compute_wheel_zoom_factor(
    delta_y: f64,
    delta_mode: u32,
    client_height: f64,
    is_ctrl_pinch: bool,
) -> f64 {
    viewport::compute_wheel_zoom_factor(delta_y, delta_mode, client_height, is_ctrl_pinch)
}

#[wasm_bindgen]
pub fn compute_fit_to(
    bx: f64,
    by: f64,
    bw: f64,
    bh: f64,
    client_w: f64,
    client_h: f64,
    padding: f64,
) -> Vec<f64> {
    viewport::compute_fit_to(bx, by, bw, bh, client_w, client_h, padding)
}

#[wasm_bindgen]
pub fn screen_to_world(
    canvas_x: f64,
    canvas_y: f64,
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
) -> Vec<f64> {
    viewport::screen_to_world(canvas_x, canvas_y, zoom, pan_x, pan_y)
}

#[wasm_bindgen]
pub fn world_to_screen(
    wx: f64,
    wy: f64,
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
) -> Vec<f64> {
    viewport::world_to_screen(wx, wy, zoom, pan_x, pan_y)
}

#[wasm_bindgen]
pub fn compute_visible_world_bounds(
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
    client_w: f64,
    client_h: f64,
) -> Vec<f64> {
    viewport::compute_visible_world_bounds(zoom, pan_x, pan_y, client_w, client_h)
}

#[wasm_bindgen]
pub fn zoom_to_slider(zoom: f64) -> f64 {
    viewport::zoom_to_slider(zoom)
}

#[wasm_bindgen]
pub fn slider_to_zoom(slider_val: f64) -> f64 {
    viewport::slider_to_zoom(slider_val)
}

#[wasm_bindgen]
pub fn trace_image_rgba_to_svg(
    rgba: &[u8],
    width: u32,
    height: u32,
    mode: u32,
    threshold: u8,
    color_count: u32,
    despeckle: u32,
    smoothness: f64,
    corner_threshold_deg: f64,
    ignore_white: bool,
) -> String {
    tracer::trace_image_rgba_to_svg(
        rgba,
        width,
        height,
        mode,
        threshold,
        color_count,
        despeckle,
        smoothness,
        corner_threshold_deg,
        ignore_white,
    )
}
