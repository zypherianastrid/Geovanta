/**
 * @file rust/geovanta-wasm/src/simplifier.rs
 * @description Iterative Ramer-Douglas-Peucker (RDP) polyline simplification
 */

pub fn rdp_simplify(coords: &[f64], tol: f64) -> Vec<f64> {
    let n = coords.len() / 2;
    if n < 3 {
        return coords.to_vec();
    }

    let mut keep = vec![false; n];
    keep[0] = true;
    keep[n - 1] = true;

    let mut stack: Vec<(usize, usize)> = Vec::with_capacity(32);
    stack.push((0, n - 1));
    let tol2 = tol * tol;

    while let Some((first, last)) = stack.pop() {
        let fx = coords[first * 2];
        let fy = coords[first * 2 + 1];
        let lx = coords[last * 2];
        let ly = coords[last * 2 + 1];

        let dx = lx - fx;
        let dy = ly - fy;
        let len_sq = dx * dx + dy * dy;

        let mut max_d2 = 0.0;
        let mut max_idx: isize = -1;

        for i in (first + 1)..last {
            let px = coords[i * 2];
            let py = coords[i * 2 + 1];

            let d2 = if len_sq < 1e-12 {
                let vx = px - fx;
                let vy = py - fy;
                vx * vx + vy * vy
            } else {
                let cross = (px - fx) * dy - (py - fy) * dx;
                (cross * cross) / len_sq
            };

            if d2 > max_d2 {
                max_d2 = d2;
                max_idx = i as isize;
            }
        }

        if max_d2 > tol2 && max_idx != -1 {
            let mid = max_idx as usize;
            keep[mid] = true;
            if mid - first > 1 {
                stack.push((first, mid));
            }
            if last - mid > 1 {
                stack.push((mid, last));
            }
        }
    }

    let mut out = Vec::with_capacity(n * 2);
    for i in 0..n {
        if keep[i] {
            out.push(coords[i * 2]);
            out.push(coords[i * 2 + 1]);
        }
    }
    out
}
