use wasm_bindgen::prelude::*;

pub mod flattener;

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
