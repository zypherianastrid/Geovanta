/**
 * @file rust/geovanta-wasm/src/viewport.rs
 * @description Viewport navigation, anchor zoom, trackpad/wheel scaling, fit-to-bounds, and logarithmic slider math
 */

pub const VZMIN: f64 = 0.0005;
pub const VZMAX: f64 = 5000.0;
pub const VZ_LOG_SPAN: f64 = 16.11809565095832; // (5000.0 / 0.0005).ln()

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
    let nz = if target_zoom.is_finite() {
        target_zoom.max(VZMIN).min(VZMAX)
    } else {
        current_zoom.max(VZMIN).min(VZMAX)
    };

    let s0 = if current_zoom.is_finite() && current_zoom > 0.0 {
        current_zoom
    } else {
        1.0
    };

    if box_w <= 0.0 || box_h <= 0.0 {
        return vec![nz, current_pan_x, current_pan_y];
    }

    let px = if use_center {
        box_w * 0.5
    } else {
        cx - box_left
    };

    let py = if use_center {
        box_h * 0.5
    } else {
        cy - box_top
    };

    let wx = (px - current_pan_x) / s0;
    let wy = (py - current_pan_y) / s0;

    let np_x = px - wx * nz;
    let np_y = py - wy * nz;

    vec![nz, np_x, np_y]
}

pub fn compute_wheel_zoom_factor(
    delta_y: f64,
    delta_mode: u32,
    client_height: f64,
    is_ctrl_pinch: bool,
) -> f64 {
    let mut d = delta_y;
    if delta_mode == 1 {
        d *= 16.0;
    } else if delta_mode == 2 {
        d *= client_height.max(1.0);
    }

    let clamped_delta = d.max(-120.0).min(120.0);
    let k = if is_ctrl_pinch { 0.0035 } else { 0.0015 };
    (-clamped_delta * k).exp()
}

pub fn compute_fit_to(
    bx: f64,
    by: f64,
    bw: f64,
    bh: f64,
    client_w: f64,
    client_h: f64,
    padding: f64,
) -> Vec<f64> {
    if client_w <= 0.0
        || client_h <= 0.0
        || !bx.is_finite()
        || !by.is_finite()
        || !bw.is_finite()
        || !bh.is_finite()
        || bw < 0.0
        || bh < 0.0
    {
        return vec![1.0, 0.0, 0.0, 0.0];
    }

    let inset = padding.min(client_w * 0.25).min(client_h * 0.25);
    let s = VZMAX
        .min((client_w - inset * 2.0) / bw.max(1e-6))
        .min((client_h - inset * 2.0) / bh.max(1e-6));
    let s = s.max(VZMIN).min(VZMAX);

    let np_x = (client_w - bw * s) * 0.5 - bx * s;
    let np_y = (client_h - bh * s) * 0.5 - by * s;

    vec![s, np_x, np_y, 1.0]
}

pub fn screen_to_world(
    canvas_x: f64,
    canvas_y: f64,
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
) -> Vec<f64> {
    let z = if zoom.is_finite() && zoom > 0.0 { zoom } else { 1.0 };
    vec![(canvas_x - pan_x) / z, (canvas_y - pan_y) / z]
}

pub fn world_to_screen(
    wx: f64,
    wy: f64,
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
) -> Vec<f64> {
    vec![wx * zoom + pan_x, wy * zoom + pan_y]
}

pub fn compute_visible_world_bounds(
    zoom: f64,
    pan_x: f64,
    pan_y: f64,
    client_w: f64,
    client_h: f64,
) -> Vec<f64> {
    let z = if zoom.is_finite() && zoom > 0.0 { zoom } else { 1.0 };
    vec![
        -pan_x / z,
        -pan_y / z,
        (client_w - pan_x) / z,
        (client_h - pan_y) / z,
    ]
}

pub fn zoom_to_slider(zoom: f64) -> f64 {
    let z = if zoom.is_finite() && zoom > 0.0 { zoom } else { 1.0 };
    let clamped_z = z.max(VZMIN).min(VZMAX);
    ((clamped_z / VZMIN).ln() / VZ_LOG_SPAN * 10000.0).round() / 10.0
}

pub fn slider_to_zoom(slider_val: f64) -> f64 {
    let clamped_v = slider_val.max(0.0).min(1000.0);
    VZMIN * (VZMAX / VZMIN).powf(clamped_v / 1000.0)
}
