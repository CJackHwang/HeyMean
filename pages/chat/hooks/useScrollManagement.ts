import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject, MutableRefObject } from 'react';
import { Message } from '../../../types';
import { Virtualizer } from '@tanstack/react-virtual';

interface UseScrollManagementProps {
    messages: Message[];
    currentConversationId: string | null;
    rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
    streamedMessageIdRef: MutableRefObject<string | null>;
    pendingTopLoad: MutableRefObject<{ prevScrollHeight: number; prevScrollTop: number; prevFirstId: string | null } | null>;
    chatContainerRef: RefObject<HTMLDivElement>;
}

interface UseScrollManagementResult {
    chatContainerRef: RefObject<HTMLDivElement>;
    setChatContainerRef: (el: HTMLDivElement | null) => void;
    isUserAtBottom: MutableRefObject<boolean>;
    initialAnchored: boolean;
    shouldForceScroll: MutableRefObject<boolean>;
}

export const useScrollManagement = ({
    messages,
    currentConversationId,
    rowVirtualizer,
    streamedMessageIdRef,
    pendingTopLoad,
    chatContainerRef,
}: UseScrollManagementProps): UseScrollManagementResult => {
    const isUserAtBottom = useRef(true);
    const didInitialScroll = useRef(false);
    const [initialAnchored, setInitialAnchored] = useState(false);
    const anchoredEventSent = useRef(false);
    const scrollAnimIdRef = useRef<number | null>(null);
    const shouldForceScroll = useRef(false);

    const markAnchored = useCallback(() => {
        if (!initialAnchored) setInitialAnchored(true);
        if (!anchoredEventSent.current) {
            anchoredEventSent.current = true;
            try {
                window.dispatchEvent(new Event('hm:chat-anchored'));
            } catch {}
        }
    }, [initialAnchored]);

    const cancelScrollAnim = useCallback(() => {
        const id = scrollAnimIdRef.current;
        if (id != null) {
            try {
                cancelAnimationFrame(id);
            } catch {}
            scrollAnimIdRef.current = null;
        }
    }, []);

    const animateToBottom = useCallback((duration = 360) => {
        const container = chatContainerRef.current;
        if (!container) return;
        cancelScrollAnim();
        const startTop = container.scrollTop;
        const startTime = performance.now();
        const step = (now: number) => {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            const target = container.scrollHeight - container.clientHeight;
            container.scrollTop = startTop + (target - startTop) * eased;
            if (t < 1) {
                scrollAnimIdRef.current = requestAnimationFrame(step);
            } else {
                scrollAnimIdRef.current = null;
            }
        };
        scrollAnimIdRef.current = requestAnimationFrame(step);
    }, [cancelScrollAnim, chatContainerRef]);

    const setChatContainerRef = useCallback((el: HTMLDivElement | null) => {
        chatContainerRef.current = el;
        if (!el) return;
        const anyEl = el as HTMLDivElement & { __hm_init?: boolean };
        if (!anyEl.__hm_init) {
            anyEl.__hm_init = true;
            try {
                el.scrollTop = el.scrollHeight;
            } catch {}
            requestAnimationFrame(() => {
                if (!didInitialScroll.current) {
                    try {
                        el.scrollTop = el.scrollHeight;
                    } catch {}
                }
                const atBottom = el.scrollHeight - el.clientHeight <= el.scrollTop + 2;
                if (atBottom) markAnchored();
            });
        }
    }, [chatContainerRef, markAnchored]);

    useEffect(() => {
        didInitialScroll.current = false;
    }, [currentConversationId]);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const atBottom = scrollHeight - clientHeight <= scrollTop + 50;
            isUserAtBottom.current = atBottom;
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();

        return () => {
            container.removeEventListener('scroll', handleScroll);
        };
    }, [chatContainerRef]);

    useEffect(() => {
        if (pendingTopLoad.current) {
            const container = chatContainerRef.current;
            if (container) {
                const { prevScrollHeight, prevScrollTop } = pendingTopLoad.current;
                const newScrollHeight = container.scrollHeight;
                const heightDiff = newScrollHeight - prevScrollHeight;

                if (heightDiff > 0) {
                    container.scrollTop = prevScrollTop + heightDiff;
                }

                pendingTopLoad.current = null;
            }
        }
    }, [messages, pendingTopLoad, chatContainerRef]);

    useLayoutEffect(() => {
        if (messages.length === 0) return;

        if (pendingTopLoad.current) {
            const snapshot = pendingTopLoad.current;
            const container = chatContainerRef.current;
            if (container) {
                requestAnimationFrame(() => {
                    const newHeight = container.scrollHeight;
                    const heightDiff = newHeight - snapshot.prevScrollHeight;
                    if (heightDiff !== 0) {
                        container.scrollTop = snapshot.prevScrollTop + heightDiff;
                    } else {
                        container.scrollTop = snapshot.prevScrollTop;
                    }
                });
            }
            pendingTopLoad.current = null;
            return;
        }

        const lastMessage = messages[messages.length - 1];
        const isStreamingLastMessage = streamedMessageIdRef.current !== null && lastMessage?.id === streamedMessageIdRef.current;

        if (!didInitialScroll.current) {
            const container = chatContainerRef.current;
            if (!container || container.scrollTop < 10) {
                didInitialScroll.current = true;
                shouldForceScroll.current = false;
                let tries = 0;
                const snap = () => {
                    const container = chatContainerRef.current;
                    rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'auto' });
                    if (container) {
                        container.scrollTop = container.scrollHeight;
                        const atBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 2;
                        if (!atBottom && tries < 8) {
                            tries++;
                            setTimeout(snap, 0);
                        } else {
                            markAnchored();
                        }
                    }
                };
                requestAnimationFrame(snap);
                return;
            } else {
                didInitialScroll.current = true;
                shouldForceScroll.current = false;
                markAnchored();
                return;
            }
        }

        if (shouldForceScroll.current) {
            cancelScrollAnim();
            rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end', behavior: 'auto' });
            const container = chatContainerRef.current;
            if (container) container.scrollTop = container.scrollHeight;
            shouldForceScroll.current = false;
            return;
        }

        if (isUserAtBottom.current || isStreamingLastMessage) {
            animateToBottom(isStreamingLastMessage ? 180 : 360);
        }
    }, [
        messages,
        rowVirtualizer,
        animateToBottom,
        cancelScrollAnim,
        streamedMessageIdRef,
        pendingTopLoad,
        markAnchored,
        chatContainerRef,
        shouldForceScroll,
        isUserAtBottom,
    ]);

    useEffect(() => {
        return () => {
            const id = scrollAnimIdRef.current;
            if (id != null) {
                try {
                    cancelAnimationFrame(id);
                } catch {}
                scrollAnimIdRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.classList.add('hide-scrollbar');
        container.classList.remove('show-scrollbar');
    }, [chatContainerRef]);

    return {
        chatContainerRef,
        setChatContainerRef,
        isUserAtBottom,
        initialAnchored,
        shouldForceScroll,
    };
};
