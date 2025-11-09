import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import type { Location } from 'react-router';
import { preloadRouteData } from './routePreloader';
import { appRoutes } from './routes';

interface AnimationState {
  isAnimating: boolean;
  overlayDirection: 'forward' | 'back';
  committedLocation: Location | null;
  overlayEnterLoc: Location | null;
  overlayAsBase: boolean;
  overlayExitLoc: Location | null;
}

const getHistoryIdx = (): number | null => {
  try {
    const st = (window.history && (window.history.state as { idx?: number } | null)) || null;
    return typeof st?.idx === 'number' ? st.idx : null;
  } catch {
    return null;
  }
};

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const prevRef = useRef(location);
  const prevIdxRef = useRef<number | null>(null);

  const [state, setState] = useState<AnimationState>({
    isAnimating: false,
    overlayDirection: 'forward',
    committedLocation: location,
    overlayEnterLoc: null,
    overlayAsBase: false,
    overlayExitLoc: null,
  });

  useLayoutEffect(() => {
    const prev = prevRef.current;
    if (prev.pathname !== location.pathname) {
      let isCancelled = false;
      const timers: ReturnType<typeof setTimeout>[] = [];
      let cancelAnchorWait: (() => void) | null = null;

      const run = async () => {
        const newIdx = getHistoryIdx();
        const oldIdx = prevIdxRef.current;
        const nextDirection: 'forward' | 'back' = (() => {
          if (newIdx != null && oldIdx != null) {
            const delta = newIdx - oldIdx;
            return delta >= 0 ? 'forward' : 'back';
          }
          return navType === 'POP' ? 'back' : 'forward';
        })();

        await preloadRouteData(
          location.pathname,
          (location.state as { conversationId?: string } | undefined) || undefined
        );

        if (isCancelled) return;

        const routeConfig = appRoutes.find(r => r.path === location.pathname);
        const needWaitAnchor = !!routeConfig?.waitForAnchorEvent;

        if (needWaitAnchor) {
          await new Promise<void>((resolve) => {
            let t: ReturnType<typeof setTimeout> | null = null;
            const done = () => {
              if (t) clearTimeout(t);
              window.removeEventListener(routeConfig.waitForAnchorEvent!, onAnchored);
              cancelAnchorWait = null;
              resolve();
            };
            const onAnchored = () => done();
            window.addEventListener(routeConfig.waitForAnchorEvent!, onAnchored, { once: true });
            t = setTimeout(done, 600);
            cancelAnchorWait = done;
          });
        }

        if (isCancelled) return;

        if (nextDirection === 'back') {
          setState(prev => ({
            ...prev,
            committedLocation: location,
            overlayExitLoc: prevRef.current,
            overlayEnterLoc: null,
            isAnimating: true,
            overlayDirection: nextDirection,
            overlayAsBase: false,
          }));
          const t = setTimeout(() => {
            if (isCancelled) return;
            setState(prev => ({
              ...prev,
              overlayExitLoc: null,
              isAnimating: false,
            }));
          }, 580);
          timers.push(t);
        } else {
          setState(prev => ({
            ...prev,
            overlayEnterLoc: location,
            overlayExitLoc: null,
            overlayDirection: nextDirection,
            overlayAsBase: false,
            isAnimating: true,
          }));
          const t1 = setTimeout(() => {
            if (isCancelled) return;
            setState(prev => ({ ...prev, overlayAsBase: true }));
            const t2 = setTimeout(() => {
              if (isCancelled) return;
              setState(prev => ({
                ...prev,
                committedLocation: null,
                isAnimating: false,
              }));
            }, 0);
            timers.push(t2);
          }, 580);
          timers.push(t1);
        }
      };

      run();

      return () => {
        isCancelled = true;
        timers.forEach((t) => clearTimeout(t));
        if (cancelAnchorWait) cancelAnchorWait();
      };
    }
  }, [location, navType]);

  useEffect(() => {
    prevRef.current = location;
    prevIdxRef.current = getHistoryIdx();
  }, [location]);

  useEffect(() => {
    if (!state.overlayEnterLoc && !state.overlayExitLoc && !state.committedLocation) {
      setState(prev => ({ ...prev, committedLocation: location }));
    }
  }, [state.overlayEnterLoc, state.overlayExitLoc, state.committedLocation, location]);

  const renderRoutes = (loc: Location) => (
    <Routes location={loc}>
      {appRoutes.map(route =>
        route.index ? (
          <Route key={route.key} index element={route.element} />
        ) : (
          <Route key={route.key} path={route.path} element={route.element} />
        )
      )}
    </Routes>
  );

  const { isAnimating, overlayDirection, committedLocation, overlayEnterLoc, overlayAsBase, overlayExitLoc } = state;

  return (
    <div className="route-container relative min-h-dvh">
      {committedLocation && (
        <div key={committedLocation.key || committedLocation.pathname} className="route-layer">
          {renderRoutes(committedLocation)}
        </div>
      )}
      {overlayEnterLoc && (
        <div
          key={`enter-${overlayEnterLoc.key || overlayEnterLoc.pathname}`}
          className={
            overlayAsBase
              ? 'route-layer'
              : `route-layer route-enter absolute inset-0 ${isAnimating ? 'is-animating' : ''} ${
                  overlayDirection === 'forward' ? 'dir-forward' : 'dir-back'
                }`
          }
        >
          {renderRoutes(overlayEnterLoc)}
        </div>
      )}
      {overlayExitLoc && (
        <div
          key={`exit-${overlayExitLoc.key || overlayExitLoc.pathname}`}
          className={`route-layer route-exit absolute inset-0 ${
            overlayDirection === 'forward' ? 'dir-forward' : 'dir-back'
          }`}
        >
          {renderRoutes(overlayExitLoc)}
        </div>
      )}
    </div>
  );
};

export default AnimatedRoutes;
