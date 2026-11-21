//! High-speed Raster Image to Vector SVG Auto-Tracer in Rust (Potrace-inspired contour extraction + RDP + Cubic Bézier curve fitting)

use std::collections::HashMap;
use crate::simplifier;

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
struct GridPt {
    x: i32,
    y: i32,
}

/// Trace an RGBA8 pixel buffer (`width * height * 4` bytes) into a complete SVG string.
///
/// Parameters:
/// - `mode`: 0 = Black & White (threshold), 1 = Color Posterized (multi-layer)
/// - `threshold`: Luminance cutoff (0..255) for B&W mode
/// - `color_count`: Number of palette colors (2..16) for Color mode
/// - `despeckle`: Minimum pixel area for contours (contours smaller than this are discarded)
/// - `smoothness`: Curve smoothing factor (0.0 = polygonal, 0.1..1.5 = smooth cubic Bézier curves)
/// - `corner_threshold_deg`: Turn angle in degrees above which a vertex is kept as a sharp corner (e.g. 55.0)
/// - `ignore_white`: If true, near-white background layers are omitted
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
    let w = width as usize;
    let h = height as usize;
    if w == 0 || h == 0 || rgba.len() < w * h * 4 {
        return format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {} {}\"></svg>",
            width, height
        );
    }

    let min_area = (despeckle as f64).max(1.0);
    let mut svg_paths = Vec::new();

    if mode == 0 {
        // Black & White (Threshold) mode
        let mut mask = vec![false; w * h];
        let thresh = threshold as u32;
        for i in 0..(w * h) {
            let r = rgba[i * 4] as u32;
            let g = rgba[i * 4 + 1] as u32;
            let b = rgba[i * 4 + 2] as u32;
            let a = rgba[i * 4 + 3] as u32;
            if a >= 64 {
                // Perceived luminance
                let lum = (r * 299 + g * 587 + b * 114) / 1000;
                if lum <= thresh {
                    mask[i] = true;
                }
            }
        }
        let d = trace_binary_mask_to_path_d(&mask, w, h, min_area, smoothness, corner_threshold_deg);
        if !d.is_empty() {
            svg_paths.push(format!(
                "<path fill=\"#18181b\" fill-rule=\"evenodd\" d=\"{}\"/>",
                d
            ));
        }
    } else {
        // Color Posterized (Multi-Layer K-Means / Quantized Palette) mode
        let k_colors = color_count.clamp(2, 16) as usize;
        let layers = quantize_color_layers(rgba, w, h, k_colors, ignore_white);
        for (hex, mask) in layers {
            let d = trace_binary_mask_to_path_d(&mask, w, h, min_area, smoothness, corner_threshold_deg);
            if !d.is_empty() {
                svg_paths.push(format!(
                    "<path fill=\"{}\" fill-rule=\"evenodd\" d=\"{}\"/>",
                    hex, d
                ));
            }
        }
    }

    format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {} {}\">{}</svg>",
        width,
        height,
        svg_paths.join("")
    )
}

fn quantize_color_layers(
    rgba: &[u8],
    w: usize,
    h: usize,
    k_colors: usize,
    ignore_white: bool,
) -> Vec<(String, Vec<bool>)> {
    // 1. Histogram quantization into 5-5-5 RGB buckets for fast deterministic K-means seeding
    let mut bucket_counts: HashMap<u16, (u64, u64, u64, u64)> = HashMap::new();
    let total_px = w * h;
    let step = if total_px > 262_144 { 4 } else if total_px > 65_536 { 2 } else { 1 };

    for i in (0..total_px).step_by(step) {
        let a = rgba[i * 4 + 3];
        if a < 64 {
            continue;
        }
        let r = rgba[i * 4];
        let g = rgba[i * 4 + 1];
        let b = rgba[i * 4 + 2];
        if ignore_white && r >= 245 && g >= 245 && b >= 245 {
            continue;
        }
        let key = (((r >> 3) as u16) << 10) | (((g >> 3) as u16) << 5) | ((b >> 3) as u16);
        let entry = bucket_counts.entry(key).or_insert((0, 0, 0, 0));
        entry.0 += 1;
        entry.1 += r as u64;
        entry.2 += g as u64;
        entry.3 += b as u64;
    }

    if bucket_counts.is_empty() {
        return Vec::new();
    }

    // Sort buckets by frequency descending
    let mut sorted_buckets: Vec<(u64, [f64; 3])> = bucket_counts
        .values()
        .map(|&(cnt, sr, sg, sb)| {
            let c = cnt as f64;
            (cnt, [sr as f64 / c, sg as f64 / c, sb as f64 / c])
        })
        .collect();
    sorted_buckets.sort_by(|a, b| b.0.cmp(&a.0));

    // Farthest-first / frequency-weighted centroid initialization
    let mut centroids: Vec<[f64; 3]> = Vec::with_capacity(k_colors);
    centroids.push(sorted_buckets[0].1);

    while centroids.len() < k_colors && centroids.len() < sorted_buckets.len() {
        let mut best_idx = 0;
        let mut best_score = -1.0;
        for (idx, &(cnt, rgb)) in sorted_buckets.iter().enumerate() {
            let min_dist_sq = centroids
                .iter()
                .map(|c| {
                    let dr = rgb[0] - c[0];
                    let dg = rgb[1] - c[1];
                    let db = rgb[2] - c[2];
                    dr * dr + dg * dg + db * db
                })
                .fold(f64::INFINITY, f64::min);
            let score = min_dist_sq * (cnt as f64).sqrt();
            if score > best_score {
                best_score = score;
                best_idx = idx;
            }
        }
        if best_score <= 1.0 {
            break;
        }
        centroids.push(sorted_buckets[best_idx].1);
    }

    // Run 6 iterations of K-Means over the histogram buckets
    for _ in 0..6 {
        let mut sums = vec![[0.0f64; 3]; centroids.len()];
        let mut weights = vec![0.0f64; centroids.len()];
        for &(cnt, rgb) in &sorted_buckets {
            let mut best_c = 0;
            let mut best_d = f64::INFINITY;
            for (ci, c) in centroids.iter().enumerate() {
                let dr = rgb[0] - c[0];
                let dg = rgb[1] - c[1];
                let db = rgb[2] - c[2];
                let d = dr * dr + dg * dg + db * db;
                if d < best_d {
                    best_d = d;
                    best_c = ci;
                }
            }
            let w_cnt = cnt as f64;
            sums[best_c][0] += rgb[0] * w_cnt;
            sums[best_c][1] += rgb[1] * w_cnt;
            sums[best_c][2] += rgb[2] * w_cnt;
            weights[best_c] += w_cnt;
        }
        for ci in 0..centroids.len() {
            if weights[ci] > 0.0 {
                centroids[ci][0] = sums[ci][0] / weights[ci];
                centroids[ci][1] = sums[ci][1] / weights[ci];
                centroids[ci][2] = sums[ci][2] / weights[ci];
            }
        }
    }

    // Assign every valid pixel to its nearest centroid
    let num_c = centroids.len();
    let mut masks = vec![vec![false; total_px]; num_c];
    let mut counts = vec![0usize; num_c];

    for i in 0..total_px {
        let a = rgba[i * 4 + 3];
        if a < 64 {
            continue;
        }
        let r = rgba[i * 4];
        let g = rgba[i * 4 + 1];
        let b = rgba[i * 4 + 2];
        if ignore_white && r >= 245 && g >= 245 && b >= 245 {
            continue;
        }
        let rf = r as f64;
        let gf = g as f64;
        let bf = b as f64;
        let mut best_c = 0;
        let mut best_d = f64::INFINITY;
        for (ci, c) in centroids.iter().enumerate() {
            let dr = rf - c[0];
            let dg = gf - c[1];
            let db = bf - c[2];
            let d = dr * dr + dg * dg + db * db;
            if d < best_d {
                best_d = d;
                best_c = ci;
            }
        }
        masks[best_c][i] = true;
        counts[best_c] += 1;
    }

    // Order layers from largest area to smallest area
    let mut order: Vec<usize> = (0..num_c).filter(|&ci| counts[ci] > 0).collect();
    order.sort_by(|&a, &b| counts[b].cmp(&counts[a]));

    let mut out = Vec::with_capacity(order.len());
    for ci in order {
        let r = centroids[ci][0].round().clamp(0.0, 255.0) as u8;
        let g = centroids[ci][1].round().clamp(0.0, 255.0) as u8;
        let b = centroids[ci][2].round().clamp(0.0, 255.0) as u8;
        if ignore_white && r >= 245 && g >= 245 && b >= 245 {
            continue;
        }
        let hex = format!("#{:02x}{:02x}{:02x}", r, g, b);
        out.push((hex, std::mem::take(&mut masks[ci])));
    }
    out
}

/// Extract directed boundary loops from a binary pixel grid, filter speckles, simplify, and fit cubic Bézier / line segments.
fn trace_binary_mask_to_path_d(
    mask: &[bool],
    w: usize,
    h: usize,
    min_area: f64,
    smoothness: f64,
    corner_threshold_deg: f64,
) -> String {
    let is_fg = |x: i32, y: i32| -> bool {
        if x < 0 || y < 0 || x >= w as i32 || y >= h as i32 {
            false
        } else {
            mask[(y as usize) * w + (x as usize)]
        }
    };

    // Directed boundary edges around foreground pixels (clockwise around foreground, counter-clockwise around holes):
    // Top edge:    (x, y) -> (x+1, y)     when fg(x, y) && !fg(x, y-1)
    // Right edge:  (x+1, y) -> (x+1, y+1) when fg(x, y) && !fg(x+1, y)
    // Bottom edge: (x+1, y+1) -> (x, y+1) when fg(x, y) && !fg(x, y+1)
    // Left edge:   (x, y+1) -> (x, y)     when fg(x, y) && !fg(x-1, y)
    let mut adj: HashMap<GridPt, Vec<GridPt>> = HashMap::new();
    for y in 0..(h as i32) {
        for x in 0..(w as i32) {
            if !is_fg(x, y) {
                continue;
            }
            if !is_fg(x, y - 1) {
                adj.entry(GridPt { x, y }).or_default().push(GridPt { x: x + 1, y });
            }
            if !is_fg(x + 1, y) {
                adj.entry(GridPt { x: x + 1, y }).or_default().push(GridPt { x: x + 1, y: y + 1 });
            }
            if !is_fg(x, y + 1) {
                adj.entry(GridPt { x: x + 1, y: y + 1 }).or_default().push(GridPt { x, y: y + 1 });
            }
            if !is_fg(x - 1, y) {
                adj.entry(GridPt { x, y: y + 1 }).or_default().push(GridPt { x, y });
            }
        }
    }

    if adj.is_empty() {
        return String::new();
    }

    // Extract closed contours deterministically
    let mut starts: Vec<GridPt> = adj.keys().copied().collect();
    starts.sort_by(|a, b| a.y.cmp(&b.y).then(a.x.cmp(&b.x)));

    let mut loops: Vec<Vec<(f64, f64)>> = Vec::new();

    for start in starts {
        loop {
            let has_edge = adj.get(&start).map_or(false, |v| !v.is_empty());
            if !has_edge {
                break;
            }
            let mut poly = Vec::new();
            let mut curr = start;
            let mut prev_dir = (0i32, 0i32);

            loop {
                poly.push(curr);
                let next_opt = if let Some(list) = adj.get_mut(&curr) {
                    if list.is_empty() {
                        None
                    } else if list.len() == 1 {
                        list.pop()
                    } else {
                        // At saddle point (2 outgoing edges), prefer turning right/keep contour tight
                        let right_turn = (-prev_dir.1, prev_dir.0);
                        let mut pick_idx = 0;
                        for (idx, cand) in list.iter().enumerate() {
                            if (cand.x - curr.x, cand.y - curr.y) == right_turn {
                                pick_idx = idx;
                                break;
                            }
                        }
                        Some(list.swap_remove(pick_idx))
                    }
                } else {
                    None
                };

                if let Some(next_pt) = next_opt {
                    prev_dir = (next_pt.x - curr.x, next_pt.y - curr.y);
                    curr = next_pt;
                    if curr == start {
                        break;
                    }
                } else {
                    break;
                }
            }

            if poly.len() >= 4 {
                // Remove collinear grid vertices
                let mut corners: Vec<(f64, f64)> = Vec::new();
                let n = poly.len();
                for i in 0..n {
                    let p_prev = poly[(i + n - 1) % n];
                    let p_curr = poly[i];
                    let p_next = poly[(i + 1) % n];
                    let dx1 = (p_curr.x - p_prev.x).signum();
                    let dy1 = (p_curr.y - p_prev.y).signum();
                    let dx2 = (p_next.x - p_curr.x).signum();
                    let dy2 = (p_next.y - p_curr.y).signum();
                    if dx1 != dx2 || dy1 != dy2 {
                        corners.push((p_curr.x as f64, p_curr.y as f64));
                    }
                }

                // Compute signed polygon area via Shoelace formula
                let mut signed_area2 = 0.0;
                let cn = corners.len();
                for i in 0..cn {
                    let (x0, y0) = corners[i];
                    let (x1, y1) = corners[(i + 1) % cn];
                    signed_area2 += x0 * y1 - x1 * y0;
                }
                let area = (signed_area2 * 0.5).abs();
                if area >= min_area && cn >= 3 {
                    loops.push(corners);
                }
            }
        }
    }

    if loops.is_empty() {
        return String::new();
    }

    let mut path_cmds = Vec::with_capacity(loops.len());
    for contour in loops {
        let cmd = fit_contour_to_svg_subpath(&contour, smoothness, corner_threshold_deg);
        if !cmd.is_empty() {
            path_cmds.push(cmd);
        }
    }

    path_cmds.join(" ")
}

fn fit_contour_to_svg_subpath(
    contour: &[(f64, f64)],
    smoothness: f64,
    corner_threshold_deg: f64,
) -> String {
    let n = contour.len();
    if n < 3 {
        return String::new();
    }

    // 1. Simplify staircase aliasing artifacts using RDP on the closed loop
    // Build midpoints of grid edges first if smoothness > 0 to eliminate staircase bias,
    // or run RDP with tolerance ~ 0.85px
    let tol = if smoothness <= 0.01 { 0.45 } else { (0.65 + smoothness * 0.35).clamp(0.5, 1.8) };

    // Split closed loop at the two farthest vertices to run open RDP cleanly
    let mut split_a = 0usize;
    let mut split_b = n / 2;
    let mut max_d2 = -1.0;
    for i in 0..n {
        let (x0, y0) = contour[0];
        let (x1, y1) = contour[i];
        let d2 = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
        if d2 > max_d2 {
            max_d2 = d2;
            split_b = i;
        }
    }
    if split_b == 0 {
        split_b = n / 2;
    }
    max_d2 = -1.0;
    for i in 0..n {
        let (x0, y0) = contour[split_b];
        let (x1, y1) = contour[i];
        let d2 = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
        if d2 > max_d2 {
            max_d2 = d2;
            split_a = i;
        }
    }

    let mut half1 = Vec::new();
    let mut idx = split_a;
    loop {
        half1.push(contour[idx].0);
        half1.push(contour[idx].1);
        if idx == split_b {
            break;
        }
        idx = (idx + 1) % n;
    }

    let mut half2 = Vec::new();
    idx = split_b;
    loop {
        half2.push(contour[idx].0);
        half2.push(contour[idx].1);
        if idx == split_a {
            break;
        }
        idx = (idx + 1) % n;
    }

    let simp1 = simplifier::rdp_simplify(&half1, tol);
    let simp2 = simplifier::rdp_simplify(&half2, tol);

    let mut pts: Vec<(f64, f64)> = Vec::new();
    let n1 = simp1.len() / 2;
    for i in 0..n1.saturating_sub(1) {
        pts.push((simp1[i * 2], simp1[i * 2 + 1]));
    }
    let n2 = simp2.len() / 2;
    for i in 0..n2.saturating_sub(1) {
        pts.push((simp2[i * 2], simp2[i * 2 + 1]));
    }

    if pts.len() < 3 {
        pts = contour.to_vec();
    }

    let m = pts.len();
    if smoothness <= 0.01 || m < 3 {
        // Polygonal output
        let mut s = format!("M{} {}", fmt_coord(pts[0].0), fmt_coord(pts[0].1));
        for i in 1..m {
            s.push_str(&format!(" L{} {}", fmt_coord(pts[i].0), fmt_coord(pts[i].1)));
        }
        s.push_str(" Z");
        return s;
    }

    // 2. Classify vertices as sharp corners vs smooth curve points and compute Catmull-Rom / Potrace tangents
    let corner_cos = (corner_threshold_deg.clamp(15.0, 165.0) * std::f64::consts::PI / 180.0).cos();
    let mut is_corner = vec![false; m];
    let mut tangents = vec![(0.0f64, 0.0f64); m];

    for i in 0..m {
        let p_prev = pts[(i + m - 1) % m];
        let p_curr = pts[i];
        let p_next = pts[(i + 1) % m];

        let v1x = p_curr.0 - p_prev.0;
        let v1y = p_curr.1 - p_prev.1;
        let v2x = p_next.0 - p_curr.0;
        let v2y = p_next.1 - p_curr.1;
        let len1 = (v1x * v1x + v1y * v1y).sqrt();
        let len2 = (v2x * v2x + v2y * v2y).sqrt();

        if len1 < 1e-6 || len2 < 1e-6 {
            is_corner[i] = true;
            continue;
        }

        let u1x = v1x / len1;
        let u1y = v1y / len1;
        let u2x = v2x / len2;
        let u2y = v2y / len2;

        // Dot product of incoming and outgoing unit direction vectors:
        // 1.0 = straight ahead (0 deg turn), 0.0 = 90 deg turn, -1.0 = 180 deg hairpin
        let dot = (u1x * u2x + u1y * u2y).clamp(-1.0, 1.0);
        // Also keep long orthogonal axis-aligned segments as corners if both adjacent edges are long
        let is_long_sharp = len1 >= 6.0 && len2 >= 6.0 && dot < 0.35;
        if dot < corner_cos || is_long_sharp {
            is_corner[i] = true;
        } else {
            let tx = u1x + u2x;
            let ty = u1y + u2y;
            let tlen = (tx * tx + ty * ty).sqrt();
            if tlen > 1e-6 {
                tangents[i] = (tx / tlen, ty / tlen);
            } else {
                is_corner[i] = true;
            }
        }
    }

    let tension = (smoothness * 0.33).clamp(0.08, 0.45);
    let mut out = format!("M{} {}", fmt_coord(pts[0].0), fmt_coord(pts[0].1));

    for i in 0..m {
        let j = (i + 1) % m;
        let p0 = pts[i];
        let p1 = pts[j];
        let seg_dx = p1.0 - p0.0;
        let seg_dy = p1.1 - p0.1;
        let seg_len = (seg_dx * seg_dx + seg_dy * seg_dy).sqrt();

        if (is_corner[i] && is_corner[j]) || seg_len < 1e-4 {
            out.push_str(&format!(" L{} {}", fmt_coord(p1.0), fmt_coord(p1.1)));
        } else {
            let h_len = seg_len * tension;
            let c1 = if is_corner[i] {
                (p0.0 + seg_dx * 0.25, p0.1 + seg_dy * 0.25)
            } else {
                (p0.0 + tangents[i].0 * h_len, p0.1 + tangents[i].1 * h_len)
            };
            let c2 = if is_corner[j] {
                (p1.0 - seg_dx * 0.25, p1.1 - seg_dy * 0.25)
            } else {
                (p1.0 - tangents[j].0 * h_len, p1.1 - tangents[j].1 * h_len)
            };
            out.push_str(&format!(
                " C{} {} {} {} {} {}",
                fmt_coord(c1.0),
                fmt_coord(c1.1),
                fmt_coord(c2.0),
                fmt_coord(c2.1),
                fmt_coord(p1.0),
                fmt_coord(p1.1)
            ));
        }
    }

    out.push_str(" Z");
    out
}

#[inline]
fn fmt_coord(v: f64) -> String {
    let r = (v * 100.0).round() / 100.0;
    if (r - r.round()).abs() < 1e-6 {
        format!("{}", r.round() as i64)
    } else {
        format!("{:.2}", r).trim_end_matches('0').trim_end_matches('.').to_string()
    }
}
