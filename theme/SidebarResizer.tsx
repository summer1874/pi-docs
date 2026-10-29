import { useEffect, useRef, useState } from 'react';

export const SIDEBAR_WIDTH_KEY = 'pi-docs-sidebar-width';
const MIN = 180;
const MAX = 480;

/**
 * Drag handle on the sidebar's right edge (wide layout only; narrower layouts use a drawer).
 * Width lives in --rp-sidebar-width on <html>; an inline head script restores it before first paint.
 */
export function SidebarResizer() {
  const [left, setLeft] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const grab = useRef(0);

  useEffect(() => {
    const sidebar = () => document.querySelector<HTMLElement>('.rp-doc-layout__sidebar');
    const place = () => {
      const el = sidebar();
      const rect = el?.getBoundingClientRect();
      setLeft(el && rect && rect.width > 0 && window.innerWidth >= 1280 ? rect.right : null);
    };
    place();
    const observer = new ResizeObserver(place);
    const el = sidebar();
    if (el) observer.observe(el);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  });

  if (left === null) return null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    grab.current = e.clientX - left;
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const sidebar = document.querySelector<HTMLElement>('.rp-doc-layout__sidebar');
    if (!sidebar) return;
    const width = Math.round(e.clientX - grab.current - sidebar.getBoundingClientRect().left);
    const clamped = Math.min(MAX, Math.max(MIN, width));
    document.documentElement.style.setProperty('--rp-sidebar-width', `${clamped}px`);
  };
  const onPointerUp = () => {
    setDragging(false);
    const width = getComputedStyle(document.documentElement).getPropertyValue('--rp-sidebar-width').trim();
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Number.parseInt(width, 10)));
    } catch {}
  };

  return (
    <div
      className={`sidebar-resizer${dragging ? ' is-dragging' : ''}`}
      style={{ left: left - 4 }}
      role="separator"
      aria-orientation="vertical"
      aria-label="拖动调整侧边栏宽度"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => {
        document.documentElement.style.removeProperty('--rp-sidebar-width');
        try {
          localStorage.removeItem(SIDEBAR_WIDTH_KEY);
        } catch {}
      }}
    />
  );
}
