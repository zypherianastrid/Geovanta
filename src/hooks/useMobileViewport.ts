/**
 * @file src/hooks/useMobileViewport.ts
 * @description Hook dan utilitas deteksi viewport mobile (<= 768px) serta sinkronisasi --app-dvh dan atribut data-mobile
 */
import { useEffect, useLayoutEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function isMobileViewportNow(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function isTouchDeviceNow(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      return true;
    }
  } catch (_) {}
  return 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
}

function getViewportHeightNow(): number {
  if (typeof window === 'undefined') return 0;
  const vv = window.visualViewport;
  return Math.round(vv && vv.height > 0 ? vv.height : window.innerHeight);
}

function syncRootAttributes(isMobile: boolean, isTouch: boolean, viewportHeight: number) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (isMobile) {
    root.setAttribute('data-mobile', '1');
  } else {
    root.removeAttribute('data-mobile');
  }
  if (isTouch) {
    root.setAttribute('data-touch', '1');
  } else {
    root.removeAttribute('data-touch');
  }
  if (viewportHeight > 0) {
    root.style.setProperty('--app-dvh', `${viewportHeight}px`);
  }
}

export interface MobileViewportState {
  isMobile: boolean;
  isTouch: boolean;
  viewportHeight: number;
}

export function useMobileViewport(): MobileViewportState {
  const [state, setState] = useState<MobileViewportState>(() => {
    const initial: MobileViewportState = {
      isMobile: isMobileViewportNow(),
      isTouch: isTouchDeviceNow(),
      viewportHeight: getViewportHeightNow(),
    };
    syncRootAttributes(initial.isMobile, initial.isTouch, initial.viewportHeight);
    return initial;
  });

  useIsomorphicLayoutEffect(() => {
    syncRootAttributes(state.isMobile, state.isTouch, state.viewportHeight);
  }, [state.isMobile, state.isTouch, state.viewportHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const update = () => {
      const nextMobile = isMobileViewportNow();
      const nextTouch = isTouchDeviceNow();
      const nextHeight = getViewportHeightNow();
      syncRootAttributes(nextMobile, nextTouch, nextHeight);
      setState(prev =>
        prev.isMobile === nextMobile &&
        prev.isTouch === nextTouch &&
        prev.viewportHeight === nextHeight
          ? prev
          : { isMobile: nextMobile, isTouch: nextTouch, viewportHeight: nextHeight }
      );
    };

    const mqMobile = typeof window.matchMedia === 'function'
      ? window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
      : null;
    const mqTouch = typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)')
      : null;

    const onMqChange = () => update();
    if (mqMobile) {
      if (typeof mqMobile.addEventListener === 'function') mqMobile.addEventListener('change', onMqChange);
      else if (typeof mqMobile.addListener === 'function') mqMobile.addListener(onMqChange);
    }
    if (mqTouch) {
      if (typeof mqTouch.addEventListener === 'function') mqTouch.addEventListener('change', onMqChange);
      else if (typeof mqTouch.addListener === 'function') mqTouch.addListener(onMqChange);
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', update);
    }

    update();

    return () => {
      if (mqMobile) {
        if (typeof mqMobile.removeEventListener === 'function') mqMobile.removeEventListener('change', onMqChange);
        else if (typeof mqMobile.removeListener === 'function') mqMobile.removeListener(onMqChange);
      }
      if (mqTouch) {
        if (typeof mqTouch.removeEventListener === 'function') mqTouch.removeEventListener('change', onMqChange);
        else if (typeof mqTouch.removeListener === 'function') mqTouch.removeListener(onMqChange);
      }
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (vv) {
        vv.removeEventListener('resize', update);
      }
    };
  }, []);

  return state;
}
