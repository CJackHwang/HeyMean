import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';

const MIN_NOTES = 260;
const MIN_CHAT = 360;

interface UseNotesPanelResult {
    rootRef: RefObject<HTMLDivElement>;
    notesWidth: number;
    isNotesCollapsed: boolean;
    onHandlePointerDown: (event: ReactPointerEvent) => void;
}

export const useNotesPanel = (): UseNotesPanelResult => {
    const rootRef = useRef<HTMLDivElement>(null);

    const [notesRatio, setNotesRatio] = useState<number>(() => {
        try {
            const ratio = Number(window.localStorage.getItem('hm_notes_ratio') || '');
            if (Number.isFinite(ratio) && ratio > 0.05 && ratio < 0.95) {
                return ratio;
            }
        } catch {}
        return 0.35;
    });
    const [notesWidth, setNotesWidth] = useState<number>(400);
    const [isNotesCollapsed, setIsNotesCollapsed] = useState<boolean>(() => {
        try {
            return window.localStorage.getItem('hm_notes_collapsed') === '1';
        } catch {
            return false;
        }
    });

    const applyWidthFromRatio = useCallback(() => {
        const container = rootRef.current;
        if (!container) return;

        const containerWidth = container.clientWidth || container.getBoundingClientRect().width || 0;
        if (!containerWidth) return;

        const maxNotes = Math.max(MIN_NOTES, containerWidth - MIN_CHAT);
        let width = Math.round(notesRatio * containerWidth);
        if (width < MIN_NOTES) width = MIN_NOTES;
        if (width > maxNotes) width = maxNotes;
        setNotesWidth(width);
    }, [notesRatio]);

    useEffect(() => {
        const container = rootRef.current;
        if (!container) return;

        try {
            const hasRatio = window.localStorage.getItem('hm_notes_ratio');
            const legacy = window.localStorage.getItem('hm_notes_width');
            if (!hasRatio && legacy) {
                const containerWidth = container.clientWidth || container.getBoundingClientRect().width || 0;
                const pixelValue = Number(legacy);
                if (containerWidth && Number.isFinite(pixelValue) && pixelValue > 0) {
                    const maxNotes = Math.max(MIN_NOTES, containerWidth - MIN_CHAT);
                    const clamped = Math.min(Math.max(pixelValue, MIN_NOTES), maxNotes);
                    const ratio = clamped / containerWidth;
                    setNotesRatio(ratio);
                    try {
                        window.localStorage.setItem('hm_notes_ratio', String(ratio));
                    } catch {}
                }
            }
        } catch {}

        applyWidthFromRatio();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleResize = () => applyWidthFromRatio();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [applyWidthFromRatio]);

    useEffect(() => {
        try {
            window.localStorage.setItem('hm_notes_ratio', String(notesRatio));
        } catch {}
        applyWidthFromRatio();
    }, [notesRatio, applyWidthFromRatio]);

    useEffect(() => {
        try {
            window.localStorage.setItem('hm_notes_collapsed', isNotesCollapsed ? '1' : '0');
        } catch {}
    }, [isNotesCollapsed]);

    const resizingRef = useRef(false);
    const containerRectRef = useRef<DOMRect | null>(null);
    const pointerStartXRef = useRef<number | null>(null);
    const didMoveRef = useRef(false);

    const onPointerMove = useCallback((event: PointerEvent) => {
        if (!resizingRef.current) return;
        const rect = containerRectRef.current;
        if (!rect) return;

        if (pointerStartXRef.current != null) {
            const dx = Math.abs(event.clientX - pointerStartXRef.current);
            if (dx > 4) didMoveRef.current = true;
        }

        const containerWidth = rect.width;
        const nextWidthFromRight = rect.right - event.clientX;
        const maxNotes = Math.max(MIN_NOTES, containerWidth - MIN_CHAT);
        let nextWidth = nextWidthFromRight;
        if (nextWidth < MIN_NOTES) nextWidth = MIN_NOTES;
        if (nextWidth > maxNotes) nextWidth = maxNotes;

        setNotesWidth(nextWidth);
        setNotesRatio(nextWidth / containerWidth);
    }, []);

    const onPointerUp = useCallback((event?: PointerEvent) => {
        if (!resizingRef.current) return;
        resizingRef.current = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp as any);
        containerRectRef.current = null;

        const didMove = didMoveRef.current;
        didMoveRef.current = false;
        pointerStartXRef.current = null;

        if (!didMove) {
            setIsNotesCollapsed(prev => !prev);
        }
    }, [onPointerMove]);

    const onHandlePointerDown = useCallback((event: ReactPointerEvent) => {
        event.preventDefault();
        try {
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        } catch {}

        resizingRef.current = true;

        try {
            containerRectRef.current = rootRef.current?.getBoundingClientRect() ?? null;
        } catch {
            containerRectRef.current = null;
        }

        try {
            pointerStartXRef.current = event.clientX ?? null;
        } catch {
            pointerStartXRef.current = null;
        }

        didMoveRef.current = false;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp as any);
    }, [onPointerMove, onPointerUp]);

    return {
        rootRef,
        notesWidth,
        isNotesCollapsed,
        onHandlePointerDown,
    };
};
