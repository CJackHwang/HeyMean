import React, { useEffect } from 'react';
import { Virtualizer } from '@tanstack/react-virtual';
import { Message } from '../../../types';
import MessageBubble from '../../../components/MessageBubble';

interface ChatMessagesAreaProps {
    messages: Message[];
    rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
    hasMoreMessages: boolean;
    isLoadingMore: boolean;
    initialAnchored: boolean;
    setChatContainerRef: (el: HTMLDivElement | null) => void;
    chatContainerRef: React.RefObject<HTMLDivElement>;
    topSentinelRef: React.RefObject<HTMLDivElement | null>;
    handleLongPress: (message: Message, position: { x: number; y: number }) => void;
    loadMoreMessages: () => Promise<void>;
    pendingTopLoad: React.MutableRefObject<{ prevScrollHeight: number; prevScrollTop: number; prevFirstId: string | null } | null>;
}

const ChatMessagesArea: React.FC<ChatMessagesAreaProps> = ({
    messages,
    rowVirtualizer,
    hasMoreMessages,
    isLoadingMore,
    initialAnchored,
    setChatContainerRef,
    chatContainerRef,
    topSentinelRef,
    handleLongPress,
    loadMoreMessages,
    pendingTopLoad,
}) => {
    useEffect(() => {
        const sentinel = topSentinelRef.current;
        if (!sentinel || !hasMoreMessages || isLoadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (entry && entry.isIntersecting && hasMoreMessages && !isLoadingMore) {
                    const container = chatContainerRef.current;
                    if (container && messages.length > 0) {
                        pendingTopLoad.current = {
                            prevScrollHeight: container.scrollHeight,
                            prevScrollTop: container.scrollTop,
                            prevFirstId: messages[0]?.id || null,
                        };
                        loadMoreMessages();
                    }
                }
            },
            { threshold: 0.1, root: chatContainerRef.current }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [hasMoreMessages, isLoadingMore, messages, loadMoreMessages, chatContainerRef, topSentinelRef, pendingTopLoad]);

    const handleMouseEnter = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.classList.add('show-scrollbar');
        container.classList.remove('hide-scrollbar');
    };

    const handleMouseLeave = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.classList.add('hide-scrollbar');
        container.classList.remove('show-scrollbar');
    };

    const handleTouchStart = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.classList.add('show-scrollbar');
        container.classList.remove('hide-scrollbar');
    };

    const handleTouchEnd = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.classList.add('hide-scrollbar');
        container.classList.remove('show-scrollbar');
    };

    return (
        <main
            ref={setChatContainerRef}
            className={`flex-1 overflow-y-auto p-4 custom-scrollbar chat-scroll ${initialAnchored ? '' : 'opacity-0 pointer-events-none'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {messages.length > 0 && (
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                    }}
                >
                    {hasMoreMessages && (
                        <div
                            ref={topSentinelRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '20px',
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const message = messages[virtualItem.index];
                        if (!message) return null;

                        return (
                            <div
                                key={message.id}
                                data-index={virtualItem.index}
                                ref={(el) => {
                                    if (!el) return;
                                    rowVirtualizer.measureElement(el);
                                    const anyEl = el as HTMLElement & { __hm_ro?: ResizeObserver };
                                    if (!anyEl.__hm_ro) {
                                        anyEl.__hm_ro = new ResizeObserver(() => {
                                            rowVirtualizer.measureElement(el);
                                        });
                                        anyEl.__hm_ro.observe(el);
                                    }
                                }}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualItem.start}px)`,
                                    paddingBottom: '24px',
                                }}
                            >
                                <MessageBubble
                                    message={message}
                                    onLongPress={handleLongPress}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </main>
    );
};

export default ChatMessagesArea;
