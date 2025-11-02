
import React, { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useConversation } from './hooks/useConversation';
import { getConversations, getNotes } from './services/db';
import { setPayload } from './utils/preloadPayload';
import { SettingsProvider } from './hooks/useSettings';
import { TranslationProvider } from './hooks/useTranslation';
import { ToastProvider } from './hooks/useToast';

// --- Eager imports: 彻底移除 Suspense 回退，首屏即就绪 ---
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';


const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  const navType = useNavigationType();
  const { preloadConversation } = useConversation(null);
  const prevRef = useRef(location);
  const [isAnimating, setIsAnimating] = useState(false);
  const [overlayDirection, setOverlayDirection] = useState<'forward' | 'back'>('forward');
  const prevIdxRef = useRef<number | null>(null);
  const [committedLocation, setCommittedLocation] = useState(location);
  const [overlayEnterLoc, setOverlayEnterLoc] = useState<typeof location | null>(null);
  const [overlayAsBase, setOverlayAsBase] = useState(false);
  const [overlayExitLoc, setOverlayExitLoc] = useState<typeof location | null>(null);

  const getHistoryIdx = () => {
    try {
      const st = (window.history && (window.history.state as { idx?: number } | null)) || null;
      return typeof st?.idx === 'number' ? st.idx : null;
    } catch {
      return null;
    }
  };

  // 目标页面数据预加载，动画在预加载完成后再开始
  useLayoutEffect(() => {
    const prev = prevRef.current;
    if (prev.pathname !== location.pathname) {
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

        // 预加载目标页面数据
        try {
          const path = location.pathname;
          const state = (location.state as { conversationId?: string } | undefined) || undefined;
          if (path === '/chat' && state?.conversationId) {
            await preloadConversation(state.conversationId);
            setPayload('chat:conversationId', state.conversationId);
          } else if (path === '/history') {
            const convs = await getConversations();
            setPayload('history:list', convs);
          } else if (path === '/settings' || path === '/about') {
            const notes = await getNotes();
            setPayload('notes:list', notes);
          }
        } catch {}

        // 预加载完成后，开始动画
        setOverlayDirection(nextDirection);
        // 每次新一轮动画开始，确保覆盖层使用动画样式
        setOverlayAsBase(false);
        setIsAnimating(true);

        let t: ReturnType<typeof setTimeout> | null = null;
        if (nextDirection === 'back') {
          // 后退：先提交底层为新页面，再让上层旧页面滑出
          setCommittedLocation(location);
          setOverlayExitLoc(prev);
          setOverlayEnterLoc(null);
          t = setTimeout(() => {
            setOverlayExitLoc(null);
            setIsAnimating(false);
          }, 580);
        } else {
          // 前进：底层保留旧页面，上层新页面滑入覆盖；动画结束后再提交底层为新页面并卸载旧页面
          // 若上一轮 push 尚处于“overlay 已成为基层”的状态，保留现有基层，继续在其上叠加新覆盖层
          setOverlayEnterLoc(location);
          setOverlayExitLoc(null);
          t = setTimeout(() => {
            // 两阶段：先将覆盖层转为基层，下一帧卸载旧基层，避免重新挂载导致页面数据刷新
            setOverlayAsBase(true);
            setTimeout(() => {
              setCommittedLocation(null);
              setIsAnimating(false);
            }, 0);
          }, 580);
        }
        return () => { if (t) clearTimeout(t); };
      };
      const cleanup = run();
      return () => { /* 如果 run 返回清理函数，忽略即可 */ };
    }
  }, [location]);

  useEffect(() => {
    prevRef.current = location;
    prevIdxRef.current = getHistoryIdx();
  }, [location]);

  const renderRoutes = (loc: typeof location) => (
    <Routes location={loc}>
      <Route index element={<HomePage />} />
      <Route path="/" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/about" element={<AboutPage />} />
    </Routes>
  );

  return (
    <div className="route-container relative min-h-dvh">
      {/* 底层：提交的页面保持渲染，避免切换过程中重置位置 */}
      {committedLocation && (
        <div key={committedLocation.key || committedLocation.pathname} className="route-layer">
          {renderRoutes(committedLocation)}
        </div>
      )}
      {/* 上层：进入动画 */}
      {overlayEnterLoc && (
        <div
          key={`enter-${overlayEnterLoc.key || overlayEnterLoc.pathname}`}
          className={overlayAsBase
            ? 'route-layer'
            : `route-layer route-enter absolute inset-0 ${isAnimating ? 'is-animating' : ''} ${overlayDirection === 'forward' ? 'dir-forward' : 'dir-back'}`}
        >
          {renderRoutes(overlayEnterLoc)}
        </div>
      )}
      {/* 上层：退出动画 */}
      {overlayExitLoc && (
        <div key={`exit-${overlayExitLoc.key || overlayExitLoc.pathname}`} className={`route-layer route-exit absolute inset-0 ${overlayDirection === 'forward' ? 'dir-forward' : 'dir-back'}`}>
          {renderRoutes(overlayExitLoc)}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootStartedAt] = useState(() => Date.now());
  useEffect(() => {
    const minDuration = 1500; // 最短 1.5s
    let done = false;
    const maybeFinish = () => {
      if (done) return;
      const elapsed = Date.now() - bootStartedAt;
      const remain = Math.max(0, minDuration - elapsed);
      setTimeout(() => { setIsBooting(false); }, remain);
      done = true;
    };
    const onReady = () => maybeFinish();
    window.addEventListener('hm:settings-ready', onReady);
    // 兜底：如果 6s 还没有 ready 事件，也结束启动页
    const fallback = setTimeout(maybeFinish, 6000);
    return () => { window.removeEventListener('hm:settings-ready', onReady); clearTimeout(fallback); };
  }, [bootStartedAt]);

  return (
    <ToastProvider>
      <SettingsProvider>
        <TranslationProvider>
          <HashRouter>
            {isBooting ? (
              <div className="flex items-center justify-center min-h-dvh bg-background-light dark:bg-background-dark text-primary-text-light dark:text-primary-text-dark">
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <span className="material-symbols-outlined text-2xl!">hourglass_bottom</span>
                  <p className="text-sm">HeyMean 正在准备...</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">加载资源中，请稍候</p>
                </div>
              </div>
            ) : (
              <AnimatedRoutes />
            )}
          </HashRouter>
        </TranslationProvider>
      </SettingsProvider>
    </ToastProvider>
  );
};

export default App;
