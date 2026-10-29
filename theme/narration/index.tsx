import { useDark, useLocation, useNavigate, withBase } from '@rspress/core/runtime';
import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { lensMap, supportsBackdropSvgFilter } from './glass';
import { player, prepareDiagram } from './player';
import './narration.css';

function usePlayer() {
  return useSyncExternalStore(player.subscribe, player.getState, player.getState);
}

/** One narrated sentence. Its audio is public/audio/<id>.mp3; `cue` lists diagram node ids to light up. */
export function Say({ id, cue, children }: { id: string; cue?: string; children: ReactNode }) {
  return (
    <span
      className="say"
      data-say={id}
      data-cue={cue}
      onClick={() => player.play(id)}
      title="从这句开始讲"
    >
      {children}{' '}
    </span>
  );
}

/** An Archify diagram in a same-origin iframe, so the player can call its Archify.focus API. */
export function Diagram({ src, title }: { src: string; title: string }) {
  const dark = useDark();
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (frame.current) prepareDiagram(frame.current, dark);
  }, [dark]);
  return (
    <div className="narration-diagram">
      <iframe
        ref={frame}
        data-diagram
        src={withBase(`${src}?present=1`)}
        title={title}
        onLoad={(e) => prepareDiagram(e.currentTarget, dark)}
      />
      <a href={withBase(src)} target="_blank" rel="noreferrer">
        全屏打开
      </a>
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const ICONS = {
  play: 'M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z',
  pause: 'M7 5h3.2v14H7zM13.8 5H17v14h-3.2z',
  prev: 'M6 5h2.4v14H6zM19 5.6v12.8a.8.8 0 0 1-1.25.66L9.6 13.3a1.6 1.6 0 0 1 0-2.6l8.15-5.76A.8.8 0 0 1 19 5.6Z',
  next: 'M15.6 5H18v14h-2.4zM5 5.6v12.8a.8.8 0 0 0 1.25.66l8.15-5.76a1.6 1.6 0 0 0 0-2.6L6.25 4.94A.8.8 0 0 0 5 5.6Z',
  collapse: 'M6.7 9.3a1 1 0 0 1 1.4 0L12 13.17l3.9-3.88a1 1 0 1 1 1.4 1.42l-4.6 4.58a1 1 0 0 1-1.4 0L6.7 10.7a1 1 0 0 1 0-1.4Z',
  expand: 'M17.3 14.7a1 1 0 0 1-1.4 0L12 10.83l-3.9 3.88a1 1 0 1 1-1.4-1.42l4.6-4.58a1 1 0 0 1 1.4 0l4.6 4.58a1 1 0 0 1 0 1.4Z',
};
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d={d} fill="currentColor" />
  </svg>
);

const COLLAPSED_KEY = 'narration-collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Fixed bottom bar; rendered once in the layout so playback survives page changes. */
export function NarrationBar() {
  const { playing, current, rate, elapsed, ids } = usePlayer();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => player.connect(navigate, withBase), [navigate]);
  useEffect(() => player.pageChanged(), [pathname]);
  useEffect(() => setCollapsed(readCollapsed()), []);

  // Rebuild the lens map whenever the capsule's size changes (collapse, viewport resize).
  const bar = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ url: string; w: number; h: number } | null>(null);
  const visible = ids.length > 0;
  useEffect(() => {
    const el = bar.current;
    if (!el || !supportsBackdropSvgFilter()) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { width, height } = el.getBoundingClientRect();
        setLens({ url: lensMap(width, height), w: width, h: height });
      });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [visible]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
    try {
      localStorage.setItem(COLLAPSED_KEY, collapsed ? '0' : '1');
    } catch {}
  };

  if (!visible) return null;
  const index = current ? ids.indexOf(current) : -1;
  const total = ids.reduce((s, id) => s + player.duration(id), 0);
  const done = ids.slice(0, Math.max(0, index)).reduce((s, id) => s + player.duration(id), 0) + (index >= 0 ? elapsed : 0);
  const progress = total ? Math.min(1, done / total) : 0;
  const text = current ? document.querySelector(`[data-say="${current}"]`)?.textContent : null;
  const ring = 2 * Math.PI * 22;

  return (
    <div
      ref={bar}
      className={`narration-bar${collapsed ? ' is-collapsed' : ''}${lens ? ' has-lens' : ''}`}
      role="region"
      aria-label="语音讲解"
    >
      {lens ? (
        <svg className="narration-lens-defs" aria-hidden="true">
          <filter
            id="narration-lens"
            x="0"
            y="0"
            width={lens.w}
            height={lens.h}
            filterUnits="userSpaceOnUse"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage href={lens.url} x="0" y="0" width={lens.w} height={lens.h} preserveAspectRatio="none" result="map" />
            <feDisplacementMap in="SourceGraphic" in2="map" scale="44" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      ) : null}
      <div className="narration-side">
        <button type="button" onClick={() => player.step(-1)} aria-label="上一句">
          <Icon d={ICONS.prev} />
        </button>
      </div>
      <button type="button" className="narration-play" onClick={player.toggle} aria-label={playing ? '暂停' : '播放'}>
        <svg className="narration-ring" viewBox="0 0 50 50" aria-hidden="true">
          <circle cx="25" cy="25" r="22" />
          <circle cx="25" cy="25" r="22" strokeDasharray={ring} strokeDashoffset={ring * (1 - progress)} />
        </svg>
        <Icon d={playing ? ICONS.pause : ICONS.play} />
      </button>
      <div className="narration-side narration-main">
        <button type="button" onClick={() => player.step(1)} aria-label="下一句">
          <Icon d={ICONS.next} />
        </button>
        <div className="narration-text">
          <div className="narration-line">{text ?? `本页讲解 ${ids.length} 句`}</div>
          <div className="narration-meta">
            {index >= 0 ? `第 ${index + 1} / ${ids.length} 句 · ` : ''}
            {fmt(done)} / {fmt(total)}
          </div>
        </div>
        <button type="button" className="narration-rate" onClick={player.cycleRate} aria-label="倍速">
          {rate}×
        </button>
      </div>
      <button
        type="button"
        className="narration-fold"
        onClick={toggleCollapsed}
        aria-label={collapsed ? '展开播放条' : '收起播放条'}
        aria-expanded={!collapsed}
      >
        <Icon d={collapsed ? ICONS.expand : ICONS.collapse} />
      </button>
    </div>
  );
}
