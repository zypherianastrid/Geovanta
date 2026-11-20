/**
 * @file rust/geovanta-wasm/src/triangulator.rs
 * @description Ear-clipping polygon triangulation & self-intersection detection
 */

pub fn ccw_orient(ax: f64, ay: f64, bx: f64, by: f64, cx: f64, cy: f64) -> f64 {
    (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

pub fn seg_properly_intersects(
    ax: f64, ay: f64,
    bx: f64, by: f64,
    cx: f64, cy: f64,
    dx: f64, dy: f64,
) -> bool {
    let d1 = ccw_orient(ax, ay, bx, by, cx, cy);
    let d2 = ccw_orient(ax, ay, bx, by, dx, dy);
    let d3 = ccw_orient(cx, cy, dx, dy, ax, ay);
    let d4 = ccw_orient(cx, cy, dx, dy, bx, by);
    ((d1 > 1e-7 && d2 < -1e-7) || (d1 < -1e-7 && d2 > 1e-7))
        && ((d3 > 1e-7 && d4 < -1e-7) || (d3 < -1e-7 && d4 > 1e-7))
}

pub fn has_polygon_self_intersection(pts_x: &[f64], pts_y: &[f64]) -> bool {
    let n = pts_x.len();
    if n <= 3 {
        return false;
    }
    if n > 24 {
        return true;
    }

    for i in 0..n {
        let i2 = (i + 1) % n;
        let ax = pts_x[i];
        let ay = pts_y[i];
        let bx = pts_x[i2];
        let by = pts_y[i2];
        let min_ab_x = if ax < bx { ax } else { bx };
        let max_ab_x = if ax > bx { ax } else { bx };
        let min_ab_y = if ay < by { ay } else { by };
        let max_ab_y = if ay > by { ay } else { by };

        for j in (i + 2)..n {
            if i == 0 && j == n - 1 {
                continue;
            }
            let j2 = (j + 1) % n;
            let cx = pts_x[j];
            let cy = pts_y[j];
            let dx = pts_x[j2];
            let dy = pts_y[j2];

            let min_cd_x = if cx < dx { cx } else { dx };
            let max_cd_x = if cx > dx { cx } else { dx };
            let min_cd_y = if cy < dy { cy } else { dy };
            let max_cd_y = if cy > dy { cy } else { dy };

            if max_cd_x < min_ab_x || min_cd_x > max_ab_x || max_cd_y < min_ab_y || min_cd_y > max_ab_y {
                continue;
            }
            if seg_properly_intersects(ax, ay, bx, by, cx, cy, dx, dy) {
                return true;
            }
        }
    }
    false
}

fn pt_in_tri(px: f64, py: f64, ax: f64, ay: f64, bx: f64, by: f64, cx: f64, cy: f64) -> bool {
    let c1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    let c2 = (cx - bx) * (py - by) - (cy - by) * (px - bx);
    let c3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
    c1 >= -1e-7 && c2 >= -1e-7 && c3 >= -1e-7
}

pub fn ear_clip_polygon(coords: &[f64]) -> Option<Vec<f32>> {
    let raw_n = coords.len() / 2;
    if raw_n < 3 || raw_n > 24 {
        return None;
    }

    // 1. Sanitize coincident vertices
    let mut clean_x = Vec::with_capacity(raw_n);
    let mut clean_y = Vec::with_capacity(raw_n);
    for i in 0..raw_n {
        let x = coords[i * 2];
        let y = coords[i * 2 + 1];
        if clean_x.is_empty() {
            clean_x.push(x);
            clean_y.push(y);
        } else {
            let last_idx = clean_x.len() - 1;
            let dx = x - clean_x[last_idx];
            let dy = y - clean_y[last_idx];
            if dx * dx + dy * dy > 1e-10 {
                clean_x.push(x);
                clean_y.push(y);
            }
        }
    }

    if clean_x.len() >= 2 {
        let last_idx = clean_x.len() - 1;
        let dx0 = clean_x[last_idx] - clean_x[0];
        let dy0 = clean_y[last_idx] - clean_y[0];
        if dx0 * dx0 + dy0 * dy0 <= 1e-10 {
            clean_x.pop();
            clean_y.pop();
        }
    }

    // 2. Remove pure collinear points
    let m = clean_x.len();
    if m < 3 {
        return None;
    }
    let mut pts_x = Vec::with_capacity(m);
    let mut pts_y = Vec::with_capacity(m);
    for i in 0..m {
        let prev_idx = (i + m - 1) % m;
        let next_idx = (i + 1) % m;
        let px = clean_x[prev_idx];
        let py = clean_y[prev_idx];
        let cx = clean_x[i];
        let cy = clean_y[i];
        let nx = clean_x[next_idx];
        let ny = clean_y[next_idx];

        let ux = cx - px;
        let uy = cy - py;
        let vx = nx - cx;
        let vy = ny - cy;

        let l1 = (ux * ux + uy * uy).sqrt();
        let l2 = (vx * vx + vy * vy).sqrt();
        if l1 > 1e-5 && l2 > 1e-5 {
            let sin_theta = ((ux * vy - uy * vx).abs()) / (l1 * l2);
            let cos_theta = (ux * vx + uy * vy) / (l1 * l2);
            if sin_theta < 1e-5 && cos_theta > 0.0 {
                continue;
            }
        }
        pts_x.push(cx);
        pts_y.push(cy);
    }

    let n = pts_x.len();
    if n < 3 {
        return None;
    }

    if n == 3 {
        let area3 = (pts_x[1] - pts_x[0]) * (pts_y[2] - pts_y[0])
            - (pts_y[1] - pts_y[0]) * (pts_x[2] - pts_x[0]);
        if area3.abs() < 1e-8 {
            return None;
        }
        return Some(vec![
            pts_x[0] as f32, pts_y[0] as f32,
            pts_x[1] as f32, pts_y[1] as f32,
            pts_x[2] as f32, pts_y[2] as f32,
        ]);
    }

    // 3. Check self-intersection
    if has_polygon_self_intersection(&pts_x, &pts_y) {
        return None;
    }

    let mut area2 = 0.0;
    for i in 0..n {
        let j = (i + 1) % n;
        area2 += pts_x[i] * pts_y[j] - pts_x[j] * pts_y[i];
    }
    if area2.abs() < 1e-7 {
        return None;
    }

    let ccw = area2 > 0.0;
    let mut idx = Vec::with_capacity(n);
    for i in 0..n {
        idx.push(if ccw { i } else { n - 1 - i });
    }

    let mut out: Vec<f32> = Vec::with_capacity((n - 2) * 6);
    let mut count = n;
    let mut guard = n * 4;
    let mut cur = 0;
    let mut eps_pass = 1e-7;

    while count > 2 && guard > 0 {
        guard -= 1;
        let i_prev = idx[(cur + count - 1) % count];
        let i_cur = idx[cur % count];
        let i_next = idx[(cur + 1) % count];

        let ax = pts_x[i_prev];
        let ay = pts_y[i_prev];
        let bx = pts_x[i_cur];
        let by = pts_y[i_cur];
        let cx = pts_x[i_next];
        let cy = pts_y[i_next];

        let cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
        if cross > eps_pass {
            let mut has_inside = false;
            for k in 0..count {
                let ik = idx[k];
                if ik == i_prev || ik == i_cur || ik == i_next {
                    continue;
                }
                if pt_in_tri(pts_x[ik], pts_y[ik], ax, ay, bx, by, cx, cy) {
                    has_inside = true;
                    break;
                }
            }
            if !has_inside {
                out.push(ax as f32);
                out.push(ay as f32);
                out.push(bx as f32);
                out.push(by as f32);
                out.push(cx as f32);
                out.push(cy as f32);
                idx.remove(cur % count);
                count -= 1;
                cur = cur % if count > 0 { count } else { 1 };
                continue;
            }
        }
        cur = (cur + 1) % count;
        if cur == 0 && eps_pass > -1e-7 {
            eps_pass = 1e-11;
        }
    }

    if count != 2 {
        return None;
    }
    Some(out)
}
