/**
 * @file src/components/modals/AboutVectorHeroBg.tsx
 * @description Live precision SVG + GSAP drafting background & exact LOGO_INNER animated Geovanta logo
 *              for the Settings "Tentang Aplikasi" hero card.
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { LOGO_INNER } from '../../constants/brandAndIcons.tsx';

export interface AboutVectorHeroBgProps {
  active: boolean;
  motionPref?: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface AboutAnimatedLogoProps {
  active: boolean;
  motionPref?: string;
}

export interface GeovantaLogoLetter {
  id: 'G' | 'e' | 'o' | 'v' | 'a1' | 'n' | 't' | 'a2';
  subpaths: string[];
  compoundD: string;
}

const VIEWBOX_W = 720;
const VIEWBOX_H = 180;
const MAGNETIC_RADIUS = 145;
const MAGNETIC_MAX_PULL = 5;
export const SHOWCASE_TIME = 7.4;

const LOGO_LOOP_DURATION = 9.2;
const DRAW_PHASE_END = 0.76;
const BLUEPRINT_FILL_OPACITY = 0.14;

// Exact 16 subpath indices from LOGO_INNER grouped into the 8 letters in reading order.
// Big "G" preserves ALL 5 exact subpaths: main G contour (0) + 3 signature square node holes (1, 10, 11) + upper notch (2).
const LETTER_SUBPATH_SPEC: ReadonlyArray<{
  id: GeovantaLogoLetter['id'];
  indices: readonly number[];
}> = [
  { id: 'G', indices: [0, 1, 2, 10, 11] },
  { id: 'e', indices: [3, 7] },
  { id: 'o', indices: [4, 8] },
  { id: 'v', indices: [6] },
  { id: 'a1', indices: [5, 9] },
  { id: 'n', indices: [14] },
  { id: 't', indices: [12] },
  { id: 'a2', indices: [13, 15] }
];

// Key vector-editor anchor highlights aligned to the exact 3 square nodes on G + key letter peaks
const LOGO_ANCHOR_POINTS = [
  { x: 364.8, y: 214.8, isGNode: true }, // G top square node
  { x: 183.0, y: 367.1, isGNode: true }, // G left square node
  { x: 359.8, y: 527.0, isGNode: true }, // G bottom square node
  { x: 693.9, y: 279.0, isGNode: false }, // e crest
  { x: 900.0, y: 279.6, isGNode: false }, // o crest
  { x: 1791.0, y: 280.2, isGNode: false } // final a crest
];

// Ambient geometric focal points on the right side of the background card for cursor magnetic response
const BG_MAGNETIC_POINTS = [
  { x: 434, y: 52 },
  { x: 590, y: 88 },
  { x: 584, y: 140 },
  { x: 662, y: 134 }
];

const REGISTRATION_CROSSES = [
  { x: 312, y: 36 },
  { x: 456, y: 144 },
  { x: 624, y: 36 },
  { x: 672, y: 144 }
];

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export function extractGeovantaLogoLetters(): GeovantaLogoLetter[] {
  const m = LOGO_INNER.match(/d="([^"]+)"/);
  const rawD = m ? m[1] : '';
  const allSubs = rawD
    .split(/(?=M)/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith('M'));

  return LETTER_SUBPATH_SPEC.map(({ id, indices }) => {
    const subpaths = indices.map((idx) => allSubs[idx]).filter(Boolean);
    return {
      id,
      subpaths,
      compoundD: subpaths.join(' ')
    };
  });
}

const GEOVANTA_LOGO_LETTERS = extractGeovantaLogoLetters();

const readMotionDisabled = (motionPref?: string): boolean => {
  if (motionPref === 'off') return true;
  if (typeof document !== 'undefined' && document.documentElement.getAttribute('data-motion') === 'off') {
    return true;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  }
  return false;
};

function useMotionState(active: boolean, motionPref?: string): 'running' | 'paused' | 'reduced' {
  const [, setEnvTick] = useState(0);
  const [isDocVisible, setIsDocVisible] = useState<boolean>(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

  useEffect(() => {
    const bump = () => setEnvTick((t) => t + 1);

    let observer: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      observer = new MutationObserver(bump);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-motion']
      });
    }

    let mq: MediaQueryList | null = null;
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', bump);
      else if (typeof mq.addListener === 'function') mq.addListener(bump);
    }

    const onVisibility = () => {
      setIsDocVisible(document.visibilityState === 'visible');
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      if (observer) observer.disconnect();
      if (mq) {
        if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', bump);
        else if (typeof mq.removeListener === 'function') mq.removeListener(bump);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, []);

  const isReduced = readMotionDisabled(motionPref);
  return isReduced ? 'reduced' : active && isDocVisible ? 'running' : 'paused';
}

interface LogoAnimControl {
  tl: gsap.core.Timeline;
  handleTweens: gsap.core.Tween[];
  syncFrame: () => void;
  applyReduced: () => void;
}

/**
 * Exact LOGO_INNER animated Geovanta wordmark (replaces the flat static logo in Settings -> Tentang Aplikasi).
 * Draws all 8 letters (16 exact subpaths, including the 3 square node cutouts on big "G") continuously with zero pauses.
 */
const AboutAnimatedLogo: React.FC<AboutAnimatedLogoProps> = ({ active, motionPref }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const wirePathRefs = useRef<(SVGPathElement | null)[]>([]);
  const fillPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const strokePathRefs = useRef<(SVGPathElement | null)[]>([]);
  const penNibRef = useRef<SVGGElement | null>(null);
  const handle1Ref = useRef<SVGGElement | null>(null);
  const handle2Ref = useRef<SVGGElement | null>(null);
  const anchorRefs = useRef<(SVGGElement | null)[]>([]);
  const pulseRingRef = useRef<SVGCircleElement | null>(null);
  const ctrlRef = useRef<LogoAnimControl | null>(null);

  const flatSubpaths = useMemo(() => {
    const list: Array<{ letterIdx: number; letterId: string; subIdx: number; d: string }> = [];
    GEOVANTA_LOGO_LETTERS.forEach((letter, letterIdx) => {
      letter.subpaths.forEach((d, subIdx) => {
        list.push({ letterIdx, letterId: letter.id, subIdx, d });
      });
    });
    return list;
  }, []);

  const motionState = useMotionState(active, motionPref);
  const motionStateRef = useRef(motionState);
  motionStateRef.current = motionState;

  useEffect(() => {
    const svg = svgRef.current;
    const nibEl = penNibRef.current;
    if (!svg || !nibEl) return;

    const wireEls = wirePathRefs.current;
    const strokeEls = strokePathRefs.current;
    const fillEls = fillPathRefs.current;
    if (!strokeEls.length || !strokeEls[0]) return;

    const subLengths = flatSubpaths.map((_, i) => {
      const el = strokeEls[i];
      if (!el) return 1;
      try {
        const len = el.getTotalLength();
        return Number.isFinite(len) && len > 0 ? len : 1;
      } catch {
        return 1;
      }
    });

    const totalLen = subLengths.reduce((acc, v) => acc + v, 0);
    if (totalLen <= 0) return;

    // Normalisasi durasi perseptual tiap subpath: berikan durasi dasar yang cukup bagi
    // lubang node dan detail kecil agar pena meluncur dengan kecepatan sedang yang konsisten
    // tanpa sentakan mendadak (kecepatan naik turun cepat lalu lambat dihilangkan).
    const perceptualWeights = subLengths.map(len => Math.max(160, len) + 40);
    const totalWeight = perceptualWeights.reduce((acc, v) => acc + v, 0);

    let cursor = 0;
    const subSpans = subLengths.map((len, i) => {
      const w = perceptualWeights[i];
      const start = (cursor / totalWeight) * DRAW_PHASE_END;
      cursor += w;
      const end = (cursor / totalWeight) * DRAW_PHASE_END;
      return { start, end, len, letterIdx: flatSubpaths[i].letterIdx };
    });

    const letterSpans = GEOVANTA_LOGO_LETTERS.map((_, li) => {
      const owned = subSpans.filter((s) => s.letterIdx === li);
      return {
        start: owned.length ? owned[0].start : 0,
        end: owned.length ? owned[owned.length - 1].end : DRAW_PHASE_END
      };
    });

    // Exact start point of G and end point of final a2 for the seamless return arc
    const startPt = strokeEls[0].getPointAtLength(0);
    const lastIdx = flatSubpaths.length - 1;
    const lastEl = strokeEls[lastIdx] || strokeEls[0];
    const endPt = lastEl.getPointAtLength(subLengths[lastIdx]);

    const ctx = gsap.context(() => {
      const handleTweens: gsap.core.Tween[] = [];

      if (handle1Ref.current) {
        gsap.set(handle1Ref.current, { opacity: 0.78, svgOrigin: '252 214' });
        handleTweens.push(
          gsap.to(handle1Ref.current, {
            rotation: 6,
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            svgOrigin: '252 214',
            paused: true
          })
        );
      }
      if (handle2Ref.current) {
        gsap.set(handle2Ref.current, { opacity: 0.78, svgOrigin: '900 260' });
        handleTweens.push(
          gsap.to(handle2Ref.current, {
            rotation: -6,
            duration: 3.4,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            svgOrigin: '900 260',
            paused: true
          })
        );
      }

      // Initialize wireframe & dash arrays on all 16 subpath stroke elements
      for (let li = 0; li < GEOVANTA_LOGO_LETTERS.length; li++) {
        const wEl = wireEls[li];
        if (wEl) {
          wEl.style.transitionProperty = 'none';
          wEl.style.opacity = '1';
          wEl.style.strokeOpacity = '0.24';
        }
      }
      for (let i = 0; i < flatSubpaths.length; i++) {
        const lenStr = subLengths[i].toFixed(2);
        const sEl = strokeEls[i];
        if (sEl) {
          sEl.style.transitionProperty = 'none';
          sEl.style.strokeDasharray = lenStr;
          sEl.style.strokeDashoffset = lenStr;
          sEl.style.opacity = '1';
          sEl.style.strokeOpacity = '0';
        }
      }

      const drawState = { progress: 0 };

      const applyReduced = () => {
        for (let li = 0; li < GEOVANTA_LOGO_LETTERS.length; li++) {
          const fEl = fillEls[li];
          const wEl = wireEls[li];
          if (fEl) {
            fEl.style.fillOpacity = '1';
            fEl.style.opacity = '1';
          }
          if (wEl) {
            wEl.style.strokeOpacity = '0';
            wEl.style.opacity = '0';
          }
        }
        for (let i = 0; i < flatSubpaths.length; i++) {
          const sEl = strokeEls[i];
          if (sEl) {
            sEl.style.strokeDashoffset = '0';
            sEl.style.opacity = i === 0 ? '1' : '0';
            sEl.style.strokeOpacity = '0';
          }
        }
        anchorRefs.current.forEach((el) => {
          if (el) {
            el.removeAttribute('transform');
            el.style.opacity = '0';
          }
        });
        if (handle1Ref.current) handle1Ref.current.style.opacity = '0';
        if (handle2Ref.current) handle2Ref.current.style.opacity = '0';
        if (pulseRingRef.current) pulseRingRef.current.style.opacity = '0';
        nibEl.style.opacity = '1';
        nibEl.setAttribute(
          'transform',
          `translate(${(endPt.x + 22).toFixed(1)} ${(endPt.y + 6).toFixed(1)}) rotate(-8) scale(4.6)`
        );
      };

      const syncFrame = () => {
        if (motionStateRef.current === 'reduced') {
          applyReduced();
          return;
        }

        const p = ((drawState.progress % 1) + 1) % 1;
        let penX = startPt.x;
        let penY = startPt.y;
        let penTilt = -8;
        let handleOp = 0.78;

        if (p < DRAW_PHASE_END) {
          // Phase 1: Progressive continuous drawing across all 16 exact subpaths (G -> e -> o -> v -> a -> n -> t -> a)
          let activeIdx = 0;
          for (let i = 0; i < subSpans.length; i++) {
            if (p >= subSpans[i].start) activeIdx = i;
          }

          for (let i = 0; i < subSpans.length; i++) {
            const sp = subSpans[i];
            const sEl = strokeEls[i];
            if (!sEl) continue;

            if (i < activeIdx) {
              sEl.style.strokeDashoffset = '0';
              sEl.style.opacity = '1';
              // Fade finished stroke cleanly to 0 once its letter fill reaches 100% solid
              const lEnd = letterSpans[sp.letterIdx].end;
              const settled = smoothstep(lEnd - 0.01, Math.min(DRAW_PHASE_END + 0.02, lEnd + 0.022), p);
              sEl.style.strokeOpacity = (1 - settled).toFixed(3);
            } else if (i === activeIdx) {
              const u = clamp((p - sp.start) / Math.max(1e-6, sp.end - sp.start), 0, 1);
              const dist = u * sp.len;
              const off = (sp.len - dist).toFixed(2);
              sEl.style.strokeDashoffset = off;
              sEl.style.opacity = '1';
              sEl.style.strokeOpacity = '0.96';
              const pt = sEl.getPointAtLength(dist);
              const ahead = sEl.getPointAtLength(Math.min(sp.len, dist + 8));
              const behind = sEl.getPointAtLength(Math.max(0, dist - 8));
              const deg = (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI;
              penX = pt.x;
              penY = pt.y;
              penTilt = clamp(deg * 0.18, -18, 18);
            } else {
              sEl.style.strokeDashoffset = sp.len.toFixed(2);
              sEl.style.opacity = '1';
              sEl.style.strokeOpacity = '0';
            }
          }

          // Per-letter solid fill reveal & synchronized wireframe fade-out to zero fringe
          for (let li = 0; li < letterSpans.length; li++) {
            const fEl = fillEls[li];
            const wEl = wireEls[li];
            const span = letterSpans[li];
            const revealStart = span.start + (span.end - span.start) * 0.68;
            const revealEnd = Math.min(DRAW_PHASE_END + 0.02, span.end + 0.022);
            const lit = smoothstep(revealStart, revealEnd, p);
            if (fEl) {
              fEl.style.fillOpacity = (BLUEPRINT_FILL_OPACITY + (1 - BLUEPRINT_FILL_OPACITY) * lit).toFixed(3);
              fEl.style.opacity = '1';
            }
            if (wEl) {
              wEl.style.opacity = '1';
              wEl.style.strokeOpacity = (0.24 * (1 - lit)).toFixed(3);
            }
          }
        } else {
          // Phase 2: Completed logo showcase + graceful return arc to G + left-to-right blueprint dissolve (kecepatan konsisten tanpa sentakan)
          const r = clamp((p - DRAW_PHASE_END) / (1 - DRAW_PHASE_END), 0, 1);
          // Glider kecepatan sedang konsisten: hindari mati gerak di ujung dan lonjakan kecepatan di tengah
          const easeR = 0.82 * r + 0.18 * (0.5 - 0.5 * Math.cos(r * Math.PI));
          handleOp = 0.78 * (1 - smoothstep(0, 0.12, r) + smoothstep(0.88, 1, r));

          // Quadratic Bezier return glide from final a2 back to start of G
          const cx = 1040;
          const cy = 178;
          const inv = 1 - easeR;
          penX = inv * inv * endPt.x + 2 * inv * easeR * cx + easeR * easeR * startPt.x;
          penY = inv * inv * endPt.y + 2 * inv * easeR * cy + easeR * easeR * startPt.y;
          const dtx = 2 * inv * (cx - endPt.x) + 2 * easeR * (startPt.x - cx);
          const dty = 2 * inv * (cy - endPt.y) + 2 * easeR * (startPt.y - cy);
          penTilt = clamp(((Math.atan2(dty, dtx) * 180) / Math.PI) * 0.14, -18, 18);

          // Left-to-right gentle fill dissolve back to blueprint tint before pen touches down on G
          const nLetters = GEOVANTA_LOGO_LETTERS.length;
          for (let li = 0; li < nLetters; li++) {
            const fEl = fillEls[li];
            const wEl = wireEls[li];
            const waveStart = 0.36 + (li / nLetters) * 0.34;
            const waveEnd = waveStart + 0.24;
            const dissolve = smoothstep(waveStart, waveEnd, r);
            if (fEl) {
              fEl.style.fillOpacity = (1 - (1 - BLUEPRINT_FILL_OPACITY) * dissolve).toFixed(3);
              fEl.style.opacity = '1';
            }
            if (wEl) {
              wEl.style.opacity = '1';
              wEl.style.strokeOpacity = (0.24 * dissolve).toFixed(3);
            }
          }

          // Retract active outlines silently with zero lingering stroke fringe over completed fills
          for (let i = 0; i < subSpans.length; i++) {
            const sp = subSpans[i];
            const sEl = strokeEls[i];
            if (!sEl) continue;
            const waveStart = 0.36 + (sp.letterIdx / nLetters) * 0.34;
            const waveEnd = waveStart + 0.22;
            const retract = smoothstep(waveStart, waveEnd, r);
            sEl.style.strokeDashoffset = (sp.len * retract).toFixed(2);
            sEl.style.opacity = '1';
            sEl.style.strokeOpacity = '0';
          }
        }

        const handleOpStr = handleOp.toFixed(3);
        if (handle1Ref.current) handle1Ref.current.style.opacity = handleOpStr;
        if (handle2Ref.current) handle2Ref.current.style.opacity = handleOpStr;

        nibEl.style.opacity = '1';
        nibEl.setAttribute(
          'transform',
          `translate(${penX.toFixed(1)} ${penY.toFixed(1)}) rotate(${penTilt.toFixed(2)}) scale(4.6)`
        );

        // Anchor node proximity pulse (highlights nodes only near the gliding pen — zero static smudges)
        let bestProx = 0;
        let bestPt: { x: number; y: number } | null = null;
        LOGO_ANCHOR_POINTS.forEach((pt, idx) => {
          const el = anchorRefs.current[idx];
          if (!el) return;
          const d = Math.hypot(penX - pt.x, penY - pt.y);
          const prox = clamp(1 - d / 140, 0, 1);
          if (prox > bestProx) {
            bestProx = prox;
            bestPt = pt;
          }
          el.style.opacity = prox > 0.02 ? (prox * 0.92).toFixed(3) : '0';
          if (prox > 0.02) {
            const s = 1 + prox * prox * 0.18;
            el.setAttribute(
              'transform',
              `translate(${pt.x} ${pt.y}) scale(${s.toFixed(3)}) translate(${-pt.x} ${-pt.y})`
            );
          } else {
            el.removeAttribute('transform');
          }
        });

        const ring = pulseRingRef.current;
        if (ring) {
          if (bestPt && bestProx > 0.12) {
            const bp = bestPt as { x: number; y: number };
            ring.setAttribute('cx', String(bp.x));
            ring.setAttribute('cy', String(bp.y));
            ring.setAttribute('r', (16 + (1 - bestProx) * 28).toFixed(1));
            ring.style.opacity = (bestProx * 0.45).toFixed(3);
          } else {
            ring.style.opacity = '0';
          }
        }
      };

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0, paused: true });
      tl.to(
        drawState,
        {
          progress: 1,
          duration: LOGO_LOOP_DURATION,
          ease: 'none',
          onUpdate: syncFrame
        },
        0
      );

      ctrlRef.current = { tl, handleTweens, syncFrame, applyReduced };

      const initial = motionStateRef.current;
      if (initial === 'reduced') {
        tl.time(SHOWCASE_TIME, true).pause();
        applyReduced();
        handleTweens.forEach((tw) => tw.time(0, true).pause());
      } else {
        syncFrame();
        if (initial === 'running') {
          tl.play();
          handleTweens.forEach((tw) => tw.play());
        }
      }
    }, svg);

    return () => {
      ctrlRef.current = null;
      ctx.revert();
    };
  }, [flatSubpaths]);

  useLayoutEffect(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl) return;

    if (motionState === 'reduced') {
      ctrl.tl.time(SHOWCASE_TIME, true).pause();
      ctrl.applyReduced();
      ctrl.handleTweens.forEach((tw) => tw.time(0, true).pause());
    } else if (motionState === 'paused') {
      ctrl.tl.pause();
      ctrl.handleTweens.forEach((tw) => tw.pause());
    } else {
      ctrl.syncFrame();
      ctrl.tl.play();
      ctrl.handleTweens.forEach((tw) => tw.play());
    }
  }, [motionState]);

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="Geovanta"
      data-testid="about-animated-logo"
      viewBox="126 165 1804 410"
      shapeRendering="crispEdges"
      style={{
        height: 60,
        width: 264,
        display: 'block',
        overflow: 'visible',
        color: 'var(--acc)'
      }}
    >
      <g data-testid="about-layer-bezier">
        {/* Blueprint wireframe guide of all 16 exact LOGO_INNER subpaths (fades to 0 once filled) */}
        <g pointerEvents="none">
          {GEOVANTA_LOGO_LETTERS.map((letter, li) => (
            <path
              key={'wire-' + letter.id}
              ref={(el) => {
                wirePathRefs.current[li] = el;
              }}
              d={letter.compoundD}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="5.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeOpacity: 0.24, transitionProperty: 'none' }}
            />
          ))}
        </g>

        {/* Exact fill-rule="evenodd" solid fills per letter (100% identical to LOGO_INNER, including G's 3 square nodes) */}
        <g>
          {GEOVANTA_LOGO_LETTERS.map((letter, li) => (
            <path
              key={'fill-' + letter.id}
              ref={(el) => {
                fillPathRefs.current[li] = el;
              }}
              data-testid="about-logo-letter"
              data-letter={letter.id}
              d={letter.compoundD}
              fill="var(--acc)"
              fillRule="evenodd"
            />
          ))}
        </g>

        {/* Active precision Pen drawing strokes across all 16 exact subpaths */}
        <g pointerEvents="none">
          {flatSubpaths.map((sp, idx) => (
            <path
              key={'stroke-' + sp.letterId + '-' + sp.subIdx}
              ref={(el) => {
                strokePathRefs.current[idx] = el;
              }}
              data-testid={idx === 0 ? 'about-bezier-path' : undefined}
              d={sp.d}
              fill="none"
              stroke="var(--acc)"
              strokeWidth="7.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeOpacity: 0, transitionProperty: 'none' }}
            />
          ))}
        </g>

        {/* Bezier Tangent Handle 1 along big G's upper-left curve */}
        <g ref={handle1Ref} data-testid="about-tangent-handle" pointerEvents="none">
          <line
            x1="176"
            y1="252"
            x2="328"
            y2="176"
            stroke="var(--acc)"
            strokeOpacity="0.62"
            strokeWidth="6.8"
            strokeLinecap="round"
          />
          <circle cx="176" cy="252" r="16" fill="var(--card)" stroke="var(--acc)" strokeWidth="6.8" />
          <circle cx="328" cy="176" r="16" fill="var(--acc)" />
        </g>

        {/* Bezier Tangent Handle 2 lifted cleanly above o's top crest */}
        <g ref={handle2Ref} data-testid="about-tangent-handle" pointerEvents="none">
          <line
            x1="812"
            y1="260"
            x2="988"
            y2="260"
            stroke="var(--acc)"
            strokeOpacity="0.58"
            strokeWidth="6.8"
            strokeLinecap="round"
          />
          <circle cx="812" cy="260" r="16" fill="var(--acc)" />
          <circle cx="988" cy="260" r="16" fill="var(--card)" stroke="var(--acc)" strokeWidth="6.8" />
        </g>

        {/* Proximity pulse ring highlighting G's 3 nodes & key knots as pen glides past */}
        <circle
          ref={pulseRingRef}
          cx="364.8"
          cy="214.8"
          r="22"
          fill="none"
          stroke="var(--acc)"
          strokeWidth="6.8"
          style={{ opacity: 0 }}
          pointerEvents="none"
        />

        {/* Crisp selection-node frames around G's 3 signature cutouts + key letter crests */}
        {LOGO_ANCHOR_POINTS.map((pt, idx) => (
          <g
            key={'anc-' + idx}
            ref={(el) => {
              anchorRefs.current[idx] = el;
            }}
            data-testid="about-anchor-node"
            pointerEvents="none"
          >
            <rect
              x={pt.x - (pt.isGNode ? 17 : 14)}
              y={pt.y - (pt.isGNode ? 17 : 14)}
              width={pt.isGNode ? 34 : 28}
              height={pt.isGNode ? 34 : 28}
              rx="0"
              fill={pt.isGNode ? 'none' : 'var(--card)'}
              fillOpacity={pt.isGNode ? undefined : '0.96'}
              stroke="var(--acc)"
              strokeWidth="6.8"
            />
          </g>
        ))}

        {/* Pen Tool Nib gliding continuously along every exact Geovanta contour */}
        <g ref={penNibRef} data-testid="about-pen-nib" pointerEvents="none">
          <path
            d="M 0 0 L 14.5 5.5 L 18 15.5 L 11 19.5 L 4.5 14 Z"
            fill="var(--card)"
            stroke="var(--acc)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line x1="0.8" y1="0.8" x2="8.8" y2="8.8" stroke="var(--acc)" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="10.2" cy="10.2" r="1.75" fill="var(--acc)" />
          <path
            d="M 11.4 19.2 L 18.4 15.2 L 21.4 19.6 L 14.4 23.6 Z"
            fill="var(--acc)"
          />
        </g>
      </g>
    </svg>
  );
};

interface BgAnimControl {
  ambientTweens: gsap.core.Tween[];
}

const AboutVectorHeroBg: React.FC<AboutVectorHeroBgProps> = ({
  active,
  motionPref,
  containerRef
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const geoLayerRef = useRef<SVGGElement | null>(null);
  const guidesLayerRef = useRef<SVGGElement | null>(null);
  const guideHRef = useRef<SVGLineElement | null>(null);
  const guideVRef = useRef<SVGLineElement | null>(null);
  const reticleRef = useRef<SVGGElement | null>(null);
  const magneticRingRef = useRef<SVGCircleElement | null>(null);

  const compassRef = useRef<SVGGElement | null>(null);
  const hexRef = useRef<SVGGElement | null>(null);
  const prismRef = useRef<SVGGElement | null>(null);
  const bboxRef = useRef<SVGGElement | null>(null);
  const animControlRef = useRef<BgAnimControl | null>(null);

  const motionState = useMotionState(active, motionPref);
  const motionStateRef = useRef(motionState);
  motionStateRef.current = motionState;

  // Build GSAP ambient geometry once per mount
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const ambientTweens: gsap.core.Tween[] = [];

      if (compassRef.current) {
        ambientTweens.push(
          gsap.to(compassRef.current, {
            rotation: 360,
            duration: 44,
            repeat: -1,
            ease: 'none',
            svgOrigin: '590 88',
            paused: true
          })
        );
      }
      if (hexRef.current) {
        ambientTweens.push(
          gsap.to(hexRef.current, {
            rotation: 18,
            y: -5,
            duration: 6.5,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            svgOrigin: '434 52',
            paused: true
          })
        );
      }
      if (prismRef.current) {
        ambientTweens.push(
          gsap.to(prismRef.current, {
            rotation: -14,
            y: 4,
            duration: 5.8,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            svgOrigin: '662 134',
            paused: true
          })
        );
      }
      if (bboxRef.current) {
        ambientTweens.push(
          gsap.to(bboxRef.current, {
            y: -3.5,
            rotation: 2.5,
            duration: 5.2,
            repeat: -1,
            yoyo: true,
            ease: 'sine.inOut',
            svgOrigin: '584 140',
            paused: true
          })
        );
      }

      animControlRef.current = { ambientTweens };

      const initial = motionStateRef.current;
      if (initial === 'reduced') {
        ambientTweens.forEach((tw) => tw.time(0, true).pause());
      } else if (initial === 'running') {
        ambientTweens.forEach((tw) => tw.play());
      }
    }, root);

    return () => {
      animControlRef.current = null;
      ctx.revert();
    };
  }, []);

  useLayoutEffect(() => {
    const ctrl = animControlRef.current;
    if (!ctrl) return;

    if (motionState === 'reduced') {
      ctrl.ambientTweens.forEach((tw) => tw.time(0, true).pause());
      if (geoLayerRef.current) gsap.set(geoLayerRef.current, { x: 0, y: 0 });
      if (guidesLayerRef.current) gsap.set(guidesLayerRef.current, { opacity: 0 });
      if (magneticRingRef.current) gsap.set(magneticRingRef.current, { opacity: 0 });
    } else if (motionState === 'paused') {
      ctrl.ambientTweens.forEach((tw) => tw.pause());
    } else {
      ctrl.ambientTweens.forEach((tw) => tw.play());
    }
  }, [motionState]);

  // Subtle cursor parallax, smart guides & magnetic snap feedback
  useEffect(() => {
    const container = containerRef.current;
    const svgEl = svgRef.current;
    const geoEl = geoLayerRef.current;
    const guidesEl = guidesLayerRef.current;
    const guideH = guideHRef.current;
    const guideV = guideVRef.current;
    const reticle = reticleRef.current;
    const magRing = magneticRingRef.current;

    if (!container || !svgEl || !geoEl || !guidesEl || !guideH || !guideV || !reticle || !magRing) {
      return;
    }

    if (motionState !== 'running') {
      gsap.set(geoEl, { x: 0, y: 0 });
      gsap.set([guidesEl, magRing], { opacity: 0 });
      return;
    }

    const qGeoX = gsap.quickTo(geoEl, 'x', { duration: 0.45, ease: 'power3.out' });
    const qGeoY = gsap.quickTo(geoEl, 'y', { duration: 0.45, ease: 'power3.out' });
    const qGuideY = gsap.quickTo(guideH, 'y', { duration: 0.24, ease: 'power3.out' });
    const qGuideX = gsap.quickTo(guideV, 'x', { duration: 0.24, ease: 'power3.out' });
    const qRetX = gsap.quickTo(reticle, 'x', { duration: 0.24, ease: 'power3.out' });
    const qRetY = gsap.quickTo(reticle, 'y', { duration: 0.24, ease: 'power3.out' });
    const qMagX = gsap.quickTo(magRing, 'x', { duration: 0.28, ease: 'power3.out' });
    const qMagY = gsap.quickTo(magRing, 'y', { duration: 0.28, ease: 'power3.out' });

    let guidesVisible = false;
    let magVisible = false;

    const toSvgCoords = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const nx = rect.width > 0 ? clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1) : 0;
      const ny = rect.height > 0 ? clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1) : 0;

      let svgX = ((nx + 1) / 2) * VIEWBOX_W;
      let svgY = ((ny + 1) / 2) * VIEWBOX_H;

      try {
        const ctm = svgEl.getScreenCTM();
        if (ctm && typeof DOMPoint === 'function') {
          const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
          if (Number.isFinite(pt.x) && Number.isFinite(pt.y)) {
            svgX = pt.x;
            svgY = pt.y;
          }
        }
      } catch (_err) {
        // Fallback linear mapping already computed
      }

      return {
        nx,
        ny,
        svgX: clamp(svgX, 0, VIEWBOX_W),
        svgY: clamp(svgY, 0, VIEWBOX_H)
      };
    };

    const resetPointerEffects = () => {
      qGeoX(0);
      qGeoY(0);
      guidesVisible = false;
      magVisible = false;
      gsap.to(guidesEl, { opacity: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
      gsap.to(magRing, { opacity: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (motionStateRef.current !== 'running') return;
      const { nx, ny, svgX, svgY } = toSvgCoords(e.clientX, e.clientY);

      qGeoX(clamp(nx * 6, -6, 6));
      qGeoY(clamp(ny * 4, -4, 4));
      qGuideX(svgX);
      qGuideY(svgY);
      qRetX(svgX);
      qRetY(svgY);

      if (!guidesVisible) {
        guidesVisible = true;
        gsap.to(guidesEl, { opacity: 0.78, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
      }

      let nearestIdx = -1;
      let nearestDist = Infinity;
      BG_MAGNETIC_POINTS.forEach((node, idx) => {
        const dist = Math.hypot(svgX - node.x, svgY - node.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });

      if (nearestIdx !== -1 && nearestDist <= MAGNETIC_RADIUS) {
        const node = BG_MAGNETIC_POINTS[nearestIdx];
        const strength = 1 - nearestDist / MAGNETIC_RADIUS;
        const dx = svgX - node.x;
        const dy = svgY - node.y;
        const pullX = nearestDist > 0.001 ? (dx / nearestDist) * strength * MAGNETIC_MAX_PULL : 0;
        const pullY = nearestDist > 0.001 ? (dy / nearestDist) * strength * MAGNETIC_MAX_PULL : 0;
        qMagX(node.x + pullX);
        qMagY(node.y + pullY);
        if (!magVisible) {
          magVisible = true;
          gsap.to(magRing, { opacity: 0.75, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
        }
      } else if (magVisible) {
        magVisible = false;
        gsap.to(magRing, { opacity: 0, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
      }
    };

    const onPointerLeave = () => {
      resetPointerEffects();
    };

    container.addEventListener('pointermove', onPointerMove, { passive: true });
    container.addEventListener('pointerleave', onPointerLeave, { passive: true });

    return () => {
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [motionState, containerRef]);

  const gridId = `about-draft-grid-${uid}`;
  const gridMaskId = `about-grid-mask-${uid}`;
  const gridGradId = `about-grid-grad-${uid}`;
  const glow1Id = `about-glow-1-${uid}`;
  const glow2Id = `about-glow-2-${uid}`;

  return (
    <div
      ref={rootRef}
      className="stg-about-bg"
      aria-hidden="true"
      data-testid="about-hero-bg"
      data-motion-state={motionState}
    >
      <svg
        ref={svgRef}
        data-testid="about-hero-svg"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="geometricPrecision"
        width="100%"
        height="100%"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          <radialGradient id={glow1Id} cx="78%" cy="30%" r="48%">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.20" />
            <stop offset="55%" stopColor="var(--acc)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={glow2Id} cx="42%" cy="95%" r="40%">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.11" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0" />
          </radialGradient>
          <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="var(--acc)"
              strokeWidth="0.75"
              strokeOpacity="0.13"
            />
            <circle cx="0" cy="0" r="0.9" fill="var(--acc)" fillOpacity="0.18" />
          </pattern>
          <linearGradient id={gridGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
          </linearGradient>
          <mask id={gridMaskId}>
            <rect width={VIEWBOX_W} height={VIEWBOX_H} fill={`url(#${gridGradId})`} />
          </mask>
        </defs>

        {/* Layer 1: Ambient Glow & Precision Drafting Grid */}
        <g data-testid="about-layer-grid">
          <rect width={VIEWBOX_W} height={VIEWBOX_H} fill={`url(#${glow1Id})`} />
          <rect width={VIEWBOX_W} height={VIEWBOX_H} fill={`url(#${glow2Id})`} />
          <rect
            width={VIEWBOX_W}
            height={VIEWBOX_H}
            fill={`url(#${gridId})`}
            mask={`url(#${gridMaskId})`}
          />
          {REGISTRATION_CROSSES.map((c, i) => (
            <g key={i} stroke="var(--acc)" strokeOpacity="0.28" strokeWidth="1">
              <line x1={c.x - 4} y1={c.y} x2={c.x + 4} y2={c.y} />
              <line x1={c.x} y1={c.y - 4} x2={c.x} y2={c.y + 4} />
            </g>
          ))}
          <g fill="var(--acc)" fillOpacity="0.26" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="8">
            <text x="386" y="15">400</text>
            <text x="506" y="15">520</text>
            <text x="626" y="15">640</text>
          </g>
        </g>

        {/* Layer 2: Geometric Primitives & Mini Bounding Box */}
        <g ref={geoLayerRef} data-testid="about-layer-geometry">
          {/* Rotating construction compass circles */}
          <g ref={compassRef}>
            <circle
              cx="590"
              cy="88"
              r="58"
              fill="none"
              stroke="var(--acc)"
              strokeOpacity="0.16"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
            <circle
              cx="590"
              cy="88"
              r="40"
              fill="none"
              stroke="var(--acc)"
              strokeOpacity="0.22"
              strokeWidth="0.9"
              strokeDasharray="18 8 4 8"
            />
            <line
              x1="590"
              y1="24"
              x2="590"
              y2="34"
              stroke="var(--acc)"
              strokeOpacity="0.34"
              strokeWidth="1"
            />
            <line
              x1="644"
              y1="88"
              x2="654"
              y2="88"
              stroke="var(--acc)"
              strokeOpacity="0.34"
              strokeWidth="1"
            />
          </g>

          {/* Wireframe hexagon */}
          <g ref={hexRef}>
            <polygon
              points="434,26 456,39 456,65 434,78 412,65 412,39"
              fill="var(--acc)"
              fillOpacity="0.045"
              stroke="var(--acc)"
              strokeOpacity="0.32"
              strokeWidth="1.15"
              strokeLinejoin="round"
            />
            <circle cx="434" cy="52" r="2" fill="var(--acc)" fillOpacity="0.35" />
          </g>

          {/* Wireframe triangle prism */}
          <g ref={prismRef}>
            <polygon
              points="662,110 684,148 640,148"
              fill="var(--acc)"
              fillOpacity="0.04"
              stroke="var(--acc)"
              strokeOpacity="0.28"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
          </g>

          {/* Mini Selected Shape + Bounding Box */}
          <g ref={bboxRef} data-testid="about-bbox">
            <rect
              x="568"
              y="124"
              width="32"
              height="32"
              rx="9"
              fill="var(--acc)"
              fillOpacity="0.07"
              stroke="var(--acc)"
              strokeOpacity="0.38"
              strokeWidth="1.15"
            />
            <rect
              x="562"
              y="118"
              width="44"
              height="44"
              fill="none"
              stroke="var(--acc)"
              strokeOpacity="0.52"
              strokeWidth="0.95"
              strokeDasharray="3 2.5"
            />
            <line
              x1="584"
              y1="118"
              x2="584"
              y2="109"
              stroke="var(--acc)"
              strokeOpacity="0.52"
              strokeWidth="0.95"
            />
            <circle
              cx="584"
              cy="107"
              r="2.4"
              fill="var(--card)"
              stroke="var(--acc)"
              strokeWidth="1.2"
            />
            {[
              [559.5, 115.5],
              [603.5, 115.5],
              [559.5, 159.5],
              [603.5, 159.5]
            ].map(([hx, hy], idx) => (
              <rect
                key={idx}
                x={hx}
                y={hy}
                width="5"
                height="5"
                rx="1"
                fill="var(--card)"
                stroke="var(--acc)"
                strokeWidth="1.2"
              />
            ))}
          </g>
        </g>

        {/* Layer 4: Subtle Cursor Smart Guides & Magnetic Feedback */}
        <g ref={guidesLayerRef} data-testid="about-layer-guides" style={{ opacity: 0 }}>
          <line
            ref={guideHRef}
            data-testid="about-guide-h"
            x1="0"
            y1="0"
            x2={VIEWBOX_W}
            y2="0"
            stroke="var(--acc)"
            strokeOpacity="0.32"
            strokeWidth="0.85"
            strokeDasharray="4 4"
          />
          <line
            ref={guideVRef}
            data-testid="about-guide-v"
            x1="0"
            y1="0"
            x2="0"
            y2={VIEWBOX_H}
            stroke="var(--acc)"
            strokeOpacity="0.32"
            strokeWidth="0.85"
            strokeDasharray="4 4"
          />
          <g ref={reticleRef} data-testid="about-guide-reticle">
            <circle
              cx="0"
              cy="0"
              r="7"
              fill="var(--acc)"
              fillOpacity="0.08"
              stroke="var(--acc)"
              strokeOpacity="0.55"
              strokeWidth="1"
            />
            <circle cx="0" cy="0" r="1.8" fill="var(--acc)" />
          </g>
          <circle
            ref={magneticRingRef}
            data-testid="about-magnetic-ring"
            cx="0"
            cy="0"
            r="10"
            fill="none"
            stroke="var(--acc)"
            strokeOpacity="0.7"
            strokeWidth="1.25"
            strokeDasharray="2.5 2.5"
            style={{ opacity: 0 }}
          />
        </g>
      </svg>
    </div>
  );
};

export { AboutVectorHeroBg, AboutAnimatedLogo };
export default AboutVectorHeroBg;
