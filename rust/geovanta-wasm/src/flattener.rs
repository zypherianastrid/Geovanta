/**
 * @file rust/geovanta-wasm/src/flattener.rs
 * @description Adaptive cubic Bézier flattening using De Casteljau subdivision
 */

pub fn point_to_chord_dist_sq(
    px: f64,
    py: f64,
    x0: f64,
    y0: f64,
    dx: f64,
    dy: f64,
    chord_len_sq: f64,
) -> f64 {
    let vx = px - x0;
    let vy = py - y0;
    if chord_len_sq <= 1e-12 {
        return vx * vx + vy * vy;
    }
    let cross_val = vx * dy - vy * dx;
    let perp_sq = cross_val * cross_val / chord_len_sq;
    let dot_val = vx * dx + vy * dy;
    if dot_val < 0.0 {
        return vx * vx + vy * vy;
    }
    if dot_val > chord_len_sq {
        let ex = px - (x0 + dx);
        let ey = py - (y0 + dy);
        return ex * ex + ey * ey;
    }
    perp_sq
}

pub fn flatten_rec(
    x0: f64,
    y0: f64,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    x3: f64,
    y3: f64,
    d: u32,
    max_depth: u32,
    tol_sq: f64,
    min_seg_len_sq: f64,
    seg_vertex_limit: usize,
    out_pts: &mut Vec<f64>,
) {
    let cur_total = out_pts.len() / 2;
    if cur_total + 1 >= seg_vertex_limit {
        out_pts.push(x3);
        out_pts.push(y3);
        return;
    }

    let dx = x3 - x0;
    let dy = y3 - y0;
    let chord_len_sq = dx * dx + dy * dy;

    if min_seg_len_sq > 0.0 && chord_len_sq <= min_seg_len_sq {
        let hull_sq = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)
            + (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
            + (x3 - x2) * (x3 - x2) + (y3 - y2) * (y3 - y2);
        if hull_sq <= 4.0 * min_seg_len_sq {
            out_pts.push(x3);
            out_pts.push(y3);
            return;
        }
    }

    let x01 = (x0 + x1) * 0.5;
    let y01 = (y0 + y1) * 0.5;
    let x12 = (x1 + x2) * 0.5;
    let y12 = (y1 + y2) * 0.5;
    let x23 = (x2 + x3) * 0.5;
    let y23 = (y2 + y3) * 0.5;
    let x012 = (x01 + x12) * 0.5;
    let y012 = (y01 + y12) * 0.5;
    let x123 = (x12 + x23) * 0.5;
    let y123 = (y12 + y23) * 0.5;
    let x0123 = (x012 + x123) * 0.5;
    let y0123 = (y012 + y123) * 0.5;

    if d < max_depth {
        let d1_sq = point_to_chord_dist_sq(x1, y1, x0, y0, dx, dy, chord_len_sq);
        let d2_sq = point_to_chord_dist_sq(x2, y2, x0, y0, dx, dy, chord_len_sq);
        let dm_sq = point_to_chord_dist_sq(x0123, y0123, x0, y0, dx, dy, chord_len_sq);
        let max_ctrl_sq = if d1_sq > d2_sq { d1_sq } else { d2_sq };
        let err_sq = if (0.5625 * max_ctrl_sq) > dm_sq { 0.5625 * max_ctrl_sq } else { dm_sq };
        if err_sq <= tol_sq {
            out_pts.push(x3);
            out_pts.push(y3);
            return;
        }
    } else {
        out_pts.push(x3);
        out_pts.push(y3);
        return;
    }

    flatten_rec(
        x0, y0, x01, y01, x012, y012, x0123, y0123,
        d + 1, max_depth, tol_sq, min_seg_len_sq, seg_vertex_limit, out_pts,
    );
    flatten_rec(
        x0123, y0123, x123, y123, x23, y23, x3, y3,
        d + 1, max_depth, tol_sq, min_seg_len_sq, seg_vertex_limit, out_pts,
    );
}
