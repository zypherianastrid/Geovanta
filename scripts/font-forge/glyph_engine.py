"""
Parametric neo-grotesque rounded vector glyph engine for Geovanta Sans v2.
Builds crisp flat-terminated typographic geometry with optical stem/bowl
tapers, unions via skia-pathops, and applies selective cubic corner filleting.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Dict, List, Sequence, Tuple

import pathops

KAPPA_CIRCLE = 0.5522847498
# Gentle neo-grotesque squircle curvature (balanced, crisp, modern)
KAPPA_NEO = 0.562


@dataclass(frozen=True)
class FontParams:
    style_name: str
    subfamily: str
    weight_class: int
    is_bold: bool
    is_italic: bool
    slant_deg: float
    stem: float
    hbar: float
    r_outer: float
    r_inner: float
    cap: float = 720.0
    xh: float = 538.0
    asc: float = 800.0
    desc: float = -200.0
    overshoot: float = 14.0
    sq_k: float = KAPPA_NEO
    sb: float = 60.0

    @property
    def r(self) -> float:
        return self.stem * 0.5

    @property
    def rh(self) -> float:
        return self.hbar * 0.5


FACES: List[FontParams] = [
    FontParams(
        style_name="Regular",
        subfamily="Regular",
        weight_class=400,
        is_bold=False,
        is_italic=False,
        slant_deg=0.0,
        stem=90.0,
        hbar=78.0,
        r_outer=20.0,
        r_inner=5.0,
        sb=60.0,
    ),
    FontParams(
        style_name="Bold",
        subfamily="Bold",
        weight_class=700,
        is_bold=True,
        is_italic=False,
        slant_deg=0.0,
        stem=144.0,
        hbar=124.0,
        r_outer=24.0,
        r_inner=6.0,
        sb=52.0,
    ),
    FontParams(
        style_name="Italic",
        subfamily="Italic",
        weight_class=400,
        is_bold=False,
        is_italic=True,
        slant_deg=10.0,
        stem=90.0,
        hbar=78.0,
        r_outer=20.0,
        r_inner=5.0,
        sb=60.0,
    ),
    FontParams(
        style_name="BoldItalic",
        subfamily="Bold Italic",
        weight_class=700,
        is_bold=True,
        is_italic=True,
        slant_deg=10.0,
        stem=144.0,
        hbar=124.0,
        r_outer=24.0,
        r_inner=6.0,
        sb=52.0,
    ),
]


def _cubic_pt(p0, p1, p2, p3, t: float) -> Tuple[float, float]:
    mt = 1.0 - t
    return (
        mt**3 * p0[0] + 3 * mt**2 * t * p1[0] + 3 * mt * t**2 * p2[0] + t**3 * p3[0],
        mt**3 * p0[1] + 3 * mt**2 * t * p1[1] + 3 * mt * t**2 * p2[1] + t**3 * p3[1],
    )


def _cubic_tan(p0, p1, p2, p3, t: float) -> Tuple[float, float]:
    mt = 1.0 - t
    dx = 3 * mt**2 * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t**2 * (p3[0] - p2[0])
    dy = 3 * mt**2 * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t**2 * (p3[1] - p2[1])
    mag = math.hypot(dx, dy)
    if mag < 1e-6:
        dx = p3[0] - p0[0]
        dy = p3[1] - p0[1]
        mag = math.hypot(dx, dy)
    if mag < 1e-6:
        return (1.0, 0.0)
    return (dx / mag, dy / mag)


def _split_cubic(p0, c1, c2, p3, t: float):
    """Split a cubic Bezier at t into (left_cubic, right_cubic)."""
    def lerp(a, b, u):
        return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)
    q0 = lerp(p0, c1, t)
    q1 = lerp(c1, c2, t)
    q2 = lerp(c2, p3, t)
    r0 = lerp(q0, q1, t)
    r1 = lerp(q1, q2, t)
    m = lerp(r0, r1, t)
    return (p0, q0, r0, m), (m, r1, q2, p3)


def _cubic_approx_len(p0, c1, c2, p3) -> float:
    pts = [_cubic_pt(p0, c1, c2, p3, i / 8.0) for i in range(9)]
    return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(8))


def _simplify_ccw(p: pathops.Path) -> pathops.Path:
    p.simplify(fix_winding=True)
    return p


def make_ellipse_path(cx: float, cy: float, rx: float, ry: float, k: float = KAPPA_NEO) -> pathops.Path:
    p = pathops.Path()
    if rx <= 0.5 or ry <= 0.5:
        return p
    kx = rx * k
    ky = ry * k
    p.moveTo(cx + rx, cy)
    p.cubicTo(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry)
    p.cubicTo(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy)
    p.cubicTo(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry)
    p.cubicTo(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy)
    p.close()
    return _simplify_ccw(p)


def make_rect_path(x0: float, y0: float, x1: float, y1: float, r: float = 0.0) -> pathops.Path:
    p = pathops.Path()
    if x1 <= x0 or y1 <= y0:
        return p
    r = max(0.0, min(r, (x1 - x0) * 0.5, (y1 - y0) * 0.5))
    if r <= 0.5:
        p.moveTo(x0, y0)
        p.lineTo(x1, y0)
        p.lineTo(x1, y1)
        p.lineTo(x0, y1)
        p.close()
        return _simplify_ccw(p)
    k = r * KAPPA_CIRCLE
    p.moveTo(x0 + r, y0)
    p.lineTo(x1 - r, y0)
    p.cubicTo(x1 - r + k, y0, x1, y0 + r - k, x1, y0 + r)
    p.lineTo(x1, y1 - r)
    p.cubicTo(x1, y1 - r + k, x1 - r + k, y1, x1 - r, y1)
    p.lineTo(x0 + r, y1)
    p.cubicTo(x0 + r - k, y1, x0, y1 - r + k, x0, y1 - r)
    p.lineTo(x0, y0 + r)
    p.cubicTo(x0, y0 + r - k, x0 + r - k, y0, x0 + r, y0)
    p.close()
    return _simplify_ccw(p)


def make_poly_path(pts: Sequence[Tuple[float, float]]) -> pathops.Path:
    p = pathops.Path()
    if len(pts) < 3:
        return p
    p.moveTo(pts[0][0], pts[0][1])
    for x, y in pts[1:]:
        p.lineTo(x, y)
    p.close()
    return _simplify_ccw(p)


def make_flat_bar_path(
    x1: float, y1: float, x2: float, y2: float, w1: float, w2: float | None = None
) -> pathops.Path:
    """Crisp flat-ended tapered or uniform stroke between two points."""
    if w2 is None:
        w2 = w1
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist < 1e-3:
        return make_ellipse_path(x1, y1, w1 * 0.5, w1 * 0.5, KAPPA_CIRCLE)
    nx = -dy / dist
    ny = dx / dist
    r1 = w1 * 0.5
    r2 = w2 * 0.5
    return make_poly_path([
        (x1 - nx * r1, y1 - ny * r1),
        (x2 - nx * r2, y2 - ny * r2),
        (x2 + nx * r2, y2 + ny * r2),
        (x1 + nx * r1, y1 + ny * r1),
    ])


def _catmull_cubic(p: pathops.Path, pts: List[Tuple[float, float]]) -> None:
    n = len(pts)
    if n < 2:
        return
    for i in range(n - 1):
        p_prev = pts[i - 1] if i > 0 else pts[i]
        p_curr = pts[i]
        p_next = pts[i + 1]
        p_next2 = pts[i + 2] if i + 2 < n else pts[i + 1]
        c1 = (p_curr[0] + (p_next[0] - p_prev[0]) / 6.0, p_curr[1] + (p_next[1] - p_prev[1]) / 6.0)
        c2 = (p_next[0] - (p_next2[0] - p_curr[0]) / 6.0, p_next[1] - (p_next2[1] - p_curr[1]) / 6.0)
        p.cubicTo(c1[0], c1[1], c2[0], c2[1], p_next[0], p_next[1])


def make_flat_spline_path(
    segments: Sequence[Tuple[Tuple[float, float], Tuple[float, float], Tuple[float, float], Tuple[float, float]]],
    sw_x: float,
    sw_y: float | None = None,
    steps_per_seg: int = 18,
    end_taper0: float = 1.0,
    end_taper1: float = 1.0,
) -> pathops.Path:
    """
    Continuous variable-contrast stroke along cubic Bezier segments with crisp flat
    perpendicular terminals (no sausage ball endcaps).
    """
    if sw_y is None:
        sw_y = sw_x
    if not segments:
        return pathops.Path()
    left_pts: List[Tuple[float, float]] = []
    right_pts: List[Tuple[float, float]] = []
    total_samples = len(segments) * steps_per_seg
    sample_idx = 0

    for seg_idx, (p0, p1, p2, p3) in enumerate(segments):
        start_i = 0 if seg_idx == 0 else 1
        for i in range(start_i, steps_per_seg + 1):
            t = i / steps_per_seg
            u = sample_idx / max(1, total_samples)
            sample_idx += 1
            # Smooth end-taper across first/last 15% if requested
            scale = 1.0
            if end_taper0 < 1.0 and u < 0.18:
                s = u / 0.18
                scale *= end_taper0 + (1.0 - end_taper0) * (3 * s**2 - 2 * s**3)
            if end_taper1 < 1.0 and u > 0.82:
                s = (1.0 - u) / 0.18
                scale *= end_taper1 + (1.0 - end_taper1) * (3 * s**2 - 2 * s**3)

            pt = _cubic_pt(p0, p1, p2, p3, t)
            tx, ty = _cubic_tan(p0, p1, p2, p3, t)
            nx, ny = -ty, tx
            sx_e = sw_x * scale
            sy_e = sw_y * scale
            denom = math.hypot(nx / max(1e-3, sx_e), ny / max(1e-3, sy_e))
            half_w = 0.5 / denom if denom > 1e-6 else 0.5 * sx_e
            left_pts.append((pt[0] + nx * half_w, pt[1] + ny * half_w))
            right_pts.append((pt[0] - nx * half_w, pt[1] - ny * half_w))

    body = pathops.Path()
    body.moveTo(left_pts[0][0], left_pts[0][1])
    _catmull_cubic(body, left_pts)
    body.lineTo(right_pts[-1][0], right_pts[-1][1])
    _catmull_cubic(body, list(reversed(right_pts)))
    body.close()
    return _simplify_ccw(body)


def make_flat_arc_path(
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    deg0: float,
    deg1: float,
    sw_x: float,
    sw_y: float | None = None,
    k: float = KAPPA_NEO,
    cut_horizontal0: bool = False,
    cut_horizontal1: bool = False,
) -> pathops.Path:
    """
    Smooth neo-grotesque elliptical/squircle arc stroke with crisp flat terminals.
    Supports optional horizontal/vertical terminal trims (classic sans-serif C/G/c/s cuts).
    """
    if sw_y is None:
        sw_y = sw_x
    steps = max(20, int(abs(deg1 - deg0) / 7.0))
    p_exp = 2.0 + max(0.0, (k - KAPPA_CIRCLE) * 14.0)

    def eval_pt_tan(deg: float):
        a = math.radians(deg)
        ca, sa = math.cos(a), math.sin(a)
        if abs(p_exp - 2.0) < 0.02:
            x = cx + rx * ca
            y = cy + ry * sa
            dx = -rx * sa
            dy = ry * ca
        else:
            exp = 2.0 / p_exp
            x = cx + rx * math.copysign(abs(ca) ** exp, ca)
            y = cy + ry * math.copysign(abs(sa) ** exp, sa)
            eps = 1e-4
            a2 = a + eps
            c2, s2 = math.cos(a2), math.sin(a2)
            x2 = cx + rx * math.copysign(abs(c2) ** exp, c2)
            y2 = cy + ry * math.copysign(abs(s2) ** exp, s2)
            dx = (x2 - x) / eps
            dy = (y2 - y) / eps
        mag = math.hypot(dx, dy)
        if mag < 1e-6:
            return (x, y), (0.0, 1.0)
        return (x, y), (dx / mag, dy / mag)

    left_pts: List[Tuple[float, float]] = []
    right_pts: List[Tuple[float, float]] = []
    for i in range(steps + 1):
        deg = deg0 + (deg1 - deg0) * (i / steps)
        pt, (tx, ty) = eval_pt_tan(deg)
        nx, ny = -ty, tx
        if deg1 < deg0:
            nx, ny = -nx, -ny
        denom = math.hypot(nx / max(1e-3, sw_x), ny / max(1e-3, sw_y))
        half_w = 0.5 / denom if denom > 1e-6 else 0.5 * sw_x
        left_pts.append((pt[0] + nx * half_w, pt[1] + ny * half_w))
        right_pts.append((pt[0] - nx * half_w, pt[1] - ny * half_w))

    if cut_horizontal0:
        ym = 0.5 * (left_pts[0][1] + right_pts[0][1])
        left_pts[0] = (left_pts[0][0], ym)
        right_pts[0] = (right_pts[0][0], ym)
    if cut_horizontal1:
        ym = 0.5 * (left_pts[-1][1] + right_pts[-1][1])
        left_pts[-1] = (left_pts[-1][0], ym)
        right_pts[-1] = (right_pts[-1][0], ym)

    body = pathops.Path()
    body.moveTo(left_pts[0][0], left_pts[0][1])
    _catmull_cubic(body, left_pts)
    body.lineTo(right_pts[-1][0], right_pts[-1][1])
    _catmull_cubic(body, list(reversed(right_pts)))
    body.close()
    return _simplify_ccw(body)


def _extract_contours(path: pathops.Path) -> List[List[Tuple]]:
    """
    Convert a pathops.Path into closed contours of normalized segments:
    ('L', p0, p1) or ('C', p0, c1, c2, p1).
    """
    contours: List[List[Tuple]] = []
    cur_segs: List[Tuple] = []
    start_pt = (0.0, 0.0)
    cur_pt = (0.0, 0.0)

    for verb, pts in path:
        if verb == pathops.PathVerb.MOVE:
            if cur_segs:
                contours.append(cur_segs)
                cur_segs = []
            start_pt = (float(pts[0][0]), float(pts[0][1]))
            cur_pt = start_pt
        elif verb == pathops.PathVerb.LINE:
            p1 = (float(pts[0][0]), float(pts[0][1]))
            if math.hypot(p1[0] - cur_pt[0], p1[1] - cur_pt[1]) > 0.25:
                cur_segs.append(("L", cur_pt, p1))
                cur_pt = p1
        elif verb == pathops.PathVerb.QUAD:
            q1 = (float(pts[0][0]), float(pts[0][1]))
            p1 = (float(pts[1][0]), float(pts[1][1]))
            c1 = (cur_pt[0] + (2.0 / 3.0) * (q1[0] - cur_pt[0]), cur_pt[1] + (2.0 / 3.0) * (q1[1] - cur_pt[1]))
            c2 = (p1[0] + (2.0 / 3.0) * (q1[0] - p1[0]), p1[1] + (2.0 / 3.0) * (q1[1] - p1[1]))
            if math.hypot(p1[0] - cur_pt[0], p1[1] - cur_pt[1]) > 0.25 or math.hypot(c1[0] - cur_pt[0], c1[1] - cur_pt[1]) > 0.25:
                cur_segs.append(("C", cur_pt, c1, c2, p1))
                cur_pt = p1
        elif verb == pathops.PathVerb.CUBIC:
            c1 = (float(pts[0][0]), float(pts[0][1]))
            c2 = (float(pts[1][0]), float(pts[1][1]))
            p1 = (float(pts[2][0]), float(pts[2][1]))
            if math.hypot(p1[0] - cur_pt[0], p1[1] - cur_pt[1]) > 0.25 or math.hypot(c1[0] - cur_pt[0], c1[1] - cur_pt[1]) > 0.25:
                cur_segs.append(("C", cur_pt, c1, c2, p1))
                cur_pt = p1
        elif verb == pathops.PathVerb.CLOSE:
            if math.hypot(start_pt[0] - cur_pt[0], start_pt[1] - cur_pt[1]) > 0.25:
                cur_segs.append(("L", cur_pt, start_pt))
            elif cur_segs:
                # Snap final endpoint strictly to start_pt
                last = cur_segs[-1]
                if last[0] == "L":
                    cur_segs[-1] = ("L", last[1], start_pt)
                else:
                    cur_segs[-1] = ("C", last[1], last[2], last[3], start_pt)
            if cur_segs:
                contours.append(cur_segs)
                cur_segs = []
            cur_pt = start_pt

    if cur_segs:
        contours.append(cur_segs)
    return contours


def _contour_signed_area(segs: List[Tuple]) -> float:
    pts: List[Tuple[float, float]] = []
    for seg in segs:
        if seg[0] == "L":
            pts.append(seg[1])
        else:
            pts.append(seg[1])
            pts.append(_cubic_pt(seg[1], seg[2], seg[3], seg[4], 0.5))
    area = 0.0
    n = len(pts)
    for i in range(n):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % n]
        area += x0 * y1 - x1 * y0
    return area * 0.5


def _seg_len(seg: Tuple) -> float:
    if seg[0] == "L":
        return math.hypot(seg[2][0] - seg[1][0], seg[2][1] - seg[1][1])
    return _cubic_approx_len(seg[1], seg[2], seg[3], seg[4])


def _seg_start_tan(seg: Tuple) -> Tuple[float, float]:
    if seg[0] == "L":
        dx = seg[2][0] - seg[1][0]
        dy = seg[2][1] - seg[1][1]
        m = max(1e-6, math.hypot(dx, dy))
        return (dx / m, dy / m)
    return _cubic_tan(seg[1], seg[2], seg[3], seg[4], 0.0)


def _seg_end_tan(seg: Tuple) -> Tuple[float, float]:
    if seg[0] == "L":
        dx = seg[2][0] - seg[1][0]
        dy = seg[2][1] - seg[1][1]
        m = max(1e-6, math.hypot(dx, dy))
        return (dx / m, dy / m)
    return _cubic_tan(seg[1], seg[2], seg[3], seg[4], 1.0)


def _trim_seg_start(seg: Tuple, d: float) -> Tuple:
    L = max(1e-6, _seg_len(seg))
    u = max(0.0, min(0.45, d / L))
    if seg[0] == "L":
        p0, p1 = seg[1], seg[2]
        np0 = (p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)
        return ("L", np0, p1)
    _, right = _split_cubic(seg[1], seg[2], seg[3], seg[4], u)
    return ("C", right[0], right[1], right[2], right[3])


def _trim_seg_end(seg: Tuple, d: float) -> Tuple:
    L = max(1e-6, _seg_len(seg))
    u = max(0.55, min(1.0, 1.0 - d / L))
    if seg[0] == "L":
        p0, p1 = seg[1], seg[2]
        np1 = (p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u)
        return ("L", p0, np1)
    left, _ = _split_cubic(seg[1], seg[2], seg[3], seg[4], u)
    return ("C", left[0], left[1], left[2], left[3])


def round_path_corners(path: pathops.Path, r_outer: float, r_inner: float) -> pathops.Path:
    """
    Selectively fillet sharp corners on a simplified pathops.Path using exact circular
    cubic fillets. Convex outer corners receive r_outer; concave crotches and inner
    counter corners receive r_inner. Smooth tangent joins are left untouched.
    """
    if r_outer <= 0.5 and r_inner <= 0.5:
        return path
    contours = _extract_contours(path)
    out = pathops.Path()

    for segs in contours:
        n = len(segs)
        if n < 2:
            continue
        is_ccw = _contour_signed_area(segs) >= 0.0
        lengths = [_seg_len(s) for s in segs]

        # Compute trim distance d at each vertex i (between seg[i-1] and seg[i])
        corner_d = [0.0] * n
        corner_handle = [0.0] * n
        for i in range(n):
            s_in = segs[(i - 1) % n]
            s_out = segs[i]
            t_in = _seg_end_tan(s_in)
            t_out = _seg_start_tan(s_out)
            dot = max(-1.0, min(1.0, t_in[0] * t_out[0] + t_in[1] * t_out[1]))
            # Skip smooth joins (< ~18 deg turn) or 180-deg spikes
            if dot > 0.95 or dot < -0.995:
                continue
            cross = t_in[0] * t_out[1] - t_in[1] * t_out[0]
            # For CCW outer contour: cross > 0 is convex outer corner; cross < 0 is concave crotch.
            # For CW inner hole: both convex and concave counter corners use r_inner.
            is_outer_convex = is_ccw and (cross > 0.0)
            rad = r_outer if is_outer_convex else r_inner
            if rad <= 0.5:
                continue
            theta = math.acos(dot)
            tan_half = math.tan(theta * 0.5)
            if tan_half < 1e-4:
                continue
            d = rad * tan_half
            # Prevent adjacent fillets on the same segment from colliding
            max_d = 0.36 * min(lengths[(i - 1) % n], lengths[i])
            if s_in[0] == "C" or s_out[0] == "C":
                max_d = min(max_d, 0.24 * min(lengths[(i - 1) % n], lengths[i]))
            if d > max_d:
                d = max_d
                rad = d / tan_half
            if d < 0.8:
                continue
            corner_d[i] = d
            corner_handle[i] = (4.0 / 3.0) * math.tan(theta * 0.25) * rad

        # Ensure sum of trims on any single segment <= 0.78 * length
        for i in range(n):
            d_start = corner_d[i]
            d_end = corner_d[(i + 1) % n]
            if d_start + d_end > 0.78 * lengths[i] and (d_start + d_end) > 0:
                scale = (0.78 * lengths[i]) / (d_start + d_end)
                corner_d[i] *= scale
                corner_handle[i] *= scale
                corner_d[(i + 1) % n] *= scale
                corner_handle[(i + 1) % n] *= scale

        # Build trimmed segments & insert fillet cubics at each vertex
        trimmed = []
        for i in range(n):
            s = segs[i]
            if corner_d[i] > 0.0:
                s = _trim_seg_start(s, corner_d[i])
            if corner_d[(i + 1) % n] > 0.0:
                s = _trim_seg_end(s, corner_d[(i + 1) % n])
            trimmed.append(s)

        first_pt = trimmed[0][1]
        out.moveTo(first_pt[0], first_pt[1])
        for i in range(n):
            s = trimmed[i]
            if s[0] == "L":
                out.lineTo(s[2][0], s[2][1])
            else:
                out.cubicTo(s[2][0], s[2][1], s[3][0], s[3][1], s[4][0], s[4][1])
            # Corner fillet to start of next segment
            nxt_i = (i + 1) % n
            if corner_d[nxt_i] > 0.0:
                p_a = s[2] if s[0] == "L" else s[4]
                p_b = trimmed[nxt_i][1]
                t_in = _seg_end_tan(segs[i])
                t_out = _seg_start_tan(segs[nxt_i])
                hl = corner_handle[nxt_i]
                c1 = (p_a[0] + t_in[0] * hl, p_a[1] + t_in[1] * hl)
                c2 = (p_b[0] - t_out[0] * hl, p_b[1] - t_out[1] * hl)
                out.cubicTo(c1[0], c1[1], c2[0], c2[1], p_b[0], p_b[1])
        out.close()

    return _simplify_ccw(out)


class GlyphBuilder:
    """Collects crisp typographic primitives, unions/differences, fillets corners, and applies slant."""

    def __init__(self, params: FontParams, advance: float, round_corners: bool = True):
        self.p = params
        self.advance = float(round(advance))
        self.round_corners = round_corners
        self.adds: List[pathops.Path] = []
        self.subs: List[pathops.Path] = []

    def add_path(self, path: pathops.Path) -> None:
        self.adds.append(path)

    def vstem(self, x_left: float, y0: float, y1: float, w: float | None = None) -> None:
        wv = self.p.stem if w is None else w
        self.adds.append(make_rect_path(x_left, y0, x_left + wv, y1))

    def vstem_c(self, cx: float, y0: float, y1: float, w: float | None = None) -> None:
        wv = self.p.stem if w is None else w
        self.adds.append(make_rect_path(cx - wv * 0.5, y0, cx + wv * 0.5, y1))

    def hstem(self, x0: float, x1: float, y_bot: float, h: float | None = None) -> None:
        hv = self.p.hbar if h is None else h
        self.adds.append(make_rect_path(x0, y_bot, x1, y_bot + hv))

    def hstem_c(self, x0: float, x1: float, cy: float, h: float | None = None) -> None:
        hv = self.p.hbar if h is None else h
        self.adds.append(make_rect_path(x0, cy - hv * 0.5, x1, cy + hv * 0.5))

    def bar(self, x1: float, y1: float, x2: float, y2: float, w1: float | None = None, w2: float | None = None) -> None:
        wv1 = self.p.stem if w1 is None else w1
        self.adds.append(make_flat_bar_path(x1, y1, x2, y2, wv1, w2))

    def rect(self, x0: float, y0: float, x1: float, y1: float, r: float = 0.0) -> None:
        self.adds.append(make_rect_path(x0, y0, x1, y1, r))

    def poly(self, pts: Sequence[Tuple[float, float]]) -> None:
        self.adds.append(make_poly_path(pts))

    def dot(self, cx: float, cy: float, r: float | None = None) -> None:
        rad = (self.p.stem * 0.56) if r is None else r
        self.adds.append(make_ellipse_path(cx, cy, rad, rad, KAPPA_CIRCLE))

    def ring(
        self,
        cx: float,
        cy: float,
        rx: float,
        ry: float,
        sw_x: float | None = None,
        sw_y: float | None = None,
        k: float | None = None,
    ) -> None:
        sx = self.p.stem if sw_x is None else sw_x
        sy = self.p.hbar if sw_y is None else sw_y
        kv = self.p.sq_k if k is None else k
        outer = make_ellipse_path(cx, cy, rx, ry, kv)
        inner = make_ellipse_path(cx, cy, max(4.0, rx - sx), max(4.0, ry - sy), kv)
        rp = pathops.Path()
        pathops.difference([outer], [inner], rp.getPen())
        self.adds.append(_simplify_ccw(rp))

    def arc(
        self,
        cx: float,
        cy: float,
        rx: float,
        ry: float,
        deg0: float,
        deg1: float,
        sw_x: float | None = None,
        sw_y: float | None = None,
        k: float | None = None,
        cut_h0: bool = False,
        cut_h1: bool = False,
    ) -> None:
        sx = self.p.stem if sw_x is None else sw_x
        sy = self.p.hbar if sw_y is None else sw_y
        kv = self.p.sq_k if k is None else k
        self.adds.append(make_flat_arc_path(cx, cy, rx, ry, deg0, deg1, sx, sy, kv, cut_h0, cut_h1))

    def spline(
        self,
        segments: Sequence[Tuple[Tuple[float, float], Tuple[float, float], Tuple[float, float], Tuple[float, float]]],
        sw_x: float | None = None,
        sw_y: float | None = None,
        steps_per_seg: int = 18,
        end_taper0: float = 1.0,
        end_taper1: float = 1.0,
    ) -> None:
        sx = self.p.stem if sw_x is None else sw_x
        sy = self.p.hbar if sw_y is None else sw_y
        self.adds.append(make_flat_spline_path(segments, sx, sy, steps_per_seg, end_taper0, end_taper1))

    def d_bowl(
        self,
        x_stem_left: float,
        x_right_outer: float,
        y_bot: float,
        y_top: float,
        sw_x: float | None = None,
        sw_y: float | None = None,
        left_side: bool = False,
    ) -> None:
        """
        Crisp D/B/P/R/b/d/p/q style bowl fused cleanly with a vertical stem.
        If left_side=False (B, D, P, R, b, p): flat left side into stem, curved right side.
        If left_side=True (d, q): curved left side, flat right side into stem.
        """
        sx = self.p.stem if sw_x is None else sw_x
        sy = self.p.hbar if sw_y is None else sw_y
        h = y_top - y_bot
        ry = h * 0.5
        if not left_side:
            w = x_right_outer - x_stem_left
            r_bow = min(w - sx * 0.25, ry)
            x_arc_start = max(x_stem_left + sx * 0.45, x_right_outer - r_bow)
            cy = (y_bot + y_top) * 0.5
            # Outer contour
            outer = pathops.Path()
            kx = (x_right_outer - x_arc_start) * self.p.sq_k
            ky = ry * self.p.sq_k
            outer.moveTo(x_stem_left, y_bot)
            outer.lineTo(x_arc_start, y_bot)
            outer.cubicTo(x_arc_start + kx, y_bot, x_right_outer, cy - ky, x_right_outer, cy)
            outer.cubicTo(x_right_outer, cy + ky, x_arc_start + kx, y_top, x_arc_start, y_top)
            outer.lineTo(x_stem_left, y_top)
            outer.close()
            outer = _simplify_ccw(outer)

            # Inner counter (optically thinned at stem join)
            ix0 = x_stem_left + sx * 0.90
            ix1 = x_right_outer - sx
            iy0 = y_bot + sy
            iy1 = y_top - sy
            if ix1 > ix0 + 8 and iy1 > iy0 + 8:
                iry = (iy1 - iy0) * 0.5
                ix_arc = max(ix0 + 4.0, ix1 - min(ix1 - ix0 - 4.0, iry))
                ikx = (ix1 - ix_arc) * self.p.sq_k
                iky = iry * self.p.sq_k
                inner = pathops.Path()
                inner.moveTo(ix0, iy0)
                inner.lineTo(ix_arc, iy0)
                inner.cubicTo(ix_arc + ikx, iy0, ix1, cy - iky, ix1, cy)
                inner.cubicTo(ix1, cy + iky, ix_arc + ikx, iy1, ix_arc, iy1)
                inner.lineTo(ix0, iy1)
                inner.close()
                inner = _simplify_ccw(inner)
                rp = pathops.Path()
                pathops.difference([outer], [inner], rp.getPen())
                self.adds.append(_simplify_ccw(rp))
            else:
                self.adds.append(outer)
        else:
            # Mirror for d, q: x_stem_left is actually x_left_outer, x_right_outer is x_stem_right
            x_left_outer = x_stem_left
            x_stem_right = x_right_outer
            w = x_stem_right - x_left_outer
            r_bow = min(w - sx * 0.25, ry)
            x_arc_start = min(x_stem_right - sx * 0.45, x_left_outer + r_bow)
            cy = (y_bot + y_top) * 0.5
            outer = pathops.Path()
            kx = (x_arc_start - x_left_outer) * self.p.sq_k
            ky = ry * self.p.sq_k
            outer.moveTo(x_stem_right, y_top)
            outer.lineTo(x_arc_start, y_top)
            outer.cubicTo(x_arc_start - kx, y_top, x_left_outer, cy + ky, x_left_outer, cy)
            outer.cubicTo(x_left_outer, cy - ky, x_arc_start - kx, y_bot, x_arc_start, y_bot)
            outer.lineTo(x_stem_right, y_bot)
            outer.close()
            outer = _simplify_ccw(outer)

            ix1 = x_stem_right - sx * 0.90
            ix0 = x_left_outer + sx
            iy0 = y_bot + sy
            iy1 = y_top - sy
            if ix1 > ix0 + 8 and iy1 > iy0 + 8:
                iry = (iy1 - iy0) * 0.5
                ix_arc = min(ix1 - 4.0, ix0 + min(ix1 - ix0 - 4.0, iry))
                ikx = (ix_arc - ix0) * self.p.sq_k
                iky = iry * self.p.sq_k
                inner = pathops.Path()
                inner.moveTo(ix1, iy1)
                inner.lineTo(ix_arc, iy1)
                inner.cubicTo(ix_arc - ikx, iy1, ix0, cy + iky, ix0, cy)
                inner.cubicTo(ix0, cy - iky, ix_arc - ikx, iy0, ix_arc, iy0)
                inner.lineTo(ix1, iy0)
                inner.close()
                inner = _simplify_ccw(inner)
                rp = pathops.Path()
                pathops.difference([outer], [inner], rp.getPen())
                self.adds.append(_simplify_ccw(rp))
            else:
                self.adds.append(outer)

    def shoulder_arch(
        self,
        x_left_stem_in: float,
        x_right_outer: float,
        y_bot: float,
        y_top: float,
        sw_x: float | None = None,
        sw_y: float | None = None,
    ) -> None:
        """
        True neo-grotesque shoulder arch (n, m, h) with optical thinning at the
        stem-to-arch junction so inner crotches never look dark or blobby.
        """
        sx = self.p.stem if sw_x is None else sw_x
        sy = self.p.hbar if sw_y is None else sw_y
        x_right_stem_in = x_right_outer - sx
        # Outer curve emerges smoothly near top of left stem (no dip/notch at x_left_stem_in)
        y_join = y_top - 175.0
        cx_top = x_left_stem_in + (x_right_outer - x_left_stem_in) * 0.56
        outer = pathops.Path()
        outer.moveTo(x_left_stem_in - sx * 0.65, y_top - 96.0)
        outer.cubicTo(
            x_left_stem_in - sx * 0.12, y_top - 4.0,
            cx_top - 72.0, y_top,
            cx_top, y_top,
        )
        outer.cubicTo(
            cx_top + (x_right_outer - cx_top) * 0.60, y_top,
            x_right_outer, y_top - 44.0,
            x_right_outer, y_top - 154.0,
        )
        outer.lineTo(x_right_outer, y_bot)
        outer.lineTo(x_right_stem_in, y_bot)
        outer.lineTo(x_right_stem_in, y_top - 160.0)
        # Inner counter with subtle optical taper near left stem
        y_top_in = y_top - sy
        cx_in = x_left_stem_in + (x_right_stem_in - x_left_stem_in) * 0.54
        outer.cubicTo(
            x_right_stem_in, y_top_in - 30.0,
            cx_in + (x_right_stem_in - cx_in) * 0.56, y_top_in,
            cx_in, y_top_in,
        )
        outer.cubicTo(
            cx_in - 44.0, y_top_in,
            x_left_stem_in + 2.0, y_top_in - 28.0,
            x_left_stem_in - sx * 0.14, y_join - 44.0,
        )
        outer.close()
        self.adds.append(_simplify_ccw(outer))

    def build(self) -> pathops.Path:
        if not self.adds:
            return pathops.Path()
        combined = pathops.Path()
        for item in self.adds:
            item_clean = pathops.Path()
            item.draw(item_clean.getPen())
            _simplify_ccw(item_clean)
            if len(combined) == 0:
                combined = item_clean
            else:
                nxt = pathops.Path()
                pathops.union([combined, item_clean], nxt.getPen())
                _simplify_ccw(nxt)
                combined = nxt
        if self.subs:
            sub_union = pathops.Path()
            for item in self.subs:
                item_clean = pathops.Path()
                item.draw(item_clean.getPen())
                _simplify_ccw(item_clean)
                if len(sub_union) == 0:
                    sub_union = item_clean
                else:
                    nxt = pathops.Path()
                    pathops.union([sub_union, item_clean], nxt.getPen())
                    _simplify_ccw(nxt)
                    sub_union = nxt
            diffed = pathops.Path()
            pathops.difference([combined], [sub_union], diffed.getPen())
            combined = _simplify_ccw(diffed)

        if self.round_corners:
            combined = round_path_corners(combined, self.p.r_outer, self.p.r_inner)

        if abs(self.p.slant_deg) > 1e-4:
            shear = math.tan(math.radians(self.p.slant_deg))
            pivot_y = self.p.xh * 0.5
            combined = combined.transform(1.0, 0.0, shear, 1.0, -shear * pivot_y, 0.0)
            _simplify_ccw(combined)
        return combined


def draw_pathops_to_cubic_pen(path: pathops.Path, pen) -> None:
    """Replay a pathops.Path onto a FontTools pen supporting moveTo/lineTo/curveTo/closePath."""
    cur = (0.0, 0.0)
    for verb, pts in path:
        if verb == pathops.PathVerb.MOVE:
            cur = pts[0]
            pen.moveTo((round(cur[0], 2), round(cur[1], 2)))
        elif verb == pathops.PathVerb.LINE:
            cur = pts[0]
            pen.lineTo((round(cur[0], 2), round(cur[1], 2)))
        elif verb == pathops.PathVerb.QUAD:
            p0 = cur
            q1, p2 = pts[0], pts[1]
            c1 = (p0[0] + (2.0 / 3.0) * (q1[0] - p0[0]), p0[1] + (2.0 / 3.0) * (q1[1] - p0[1]))
            c2 = (p2[0] + (2.0 / 3.0) * (q1[0] - p2[0]), p2[1] + (2.0 / 3.0) * (q1[1] - p2[1]))
            cur = p2
            pen.curveTo(
                (round(c1[0], 2), round(c1[1], 2)),
                (round(c2[0], 2), round(c2[1], 2)),
                (round(p2[0], 2), round(p2[1], 2)),
            )
        elif verb == pathops.PathVerb.CUBIC:
            c1, c2, p3 = pts[0], pts[1], pts[2]
            cur = p3
            pen.curveTo(
                (round(c1[0], 2), round(c1[1], 2)),
                (round(c2[0], 2), round(c2[1], 2)),
                (round(p3[0], 2), round(p3[1], 2)),
            )
        elif verb == pathops.PathVerb.CLOSE:
            pen.closePath()
