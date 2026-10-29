import manifest from './manifest.json';

/** Narration manifest written by scripts/narrate.py. */
type Manifest = { pages: string[]; lines: Record<string, { duration: number; hash: string }> };

export type PlayerState = {
  playing: boolean;
  /** id of the line being read, or the line playback resumes from. */
  current: string | null;
  rate: number;
  /** Seconds played within the current line. */
  elapsed: number;
  /** Narrated line ids on the current page, in document order. */
  ids: string[];
};

const RATES = [1, 1.25, 1.5, 0.8];
const data = manifest as Manifest;

let state: PlayerState = { playing: false, current: null, rate: 1, elapsed: 0, ids: [] };
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let navigate: ((to: string) => void) | null = null;
let resolveUrl: (path: string) => string = (p) => p;
/** Set when playback crosses to the next page and should resume after it renders. */
let autoplayOnNextPage = false;

function setState(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export const player = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getState: () => state,
  duration: (id: string) => data.lines[id]?.duration ?? 0,

  /** The router's navigate and base-path resolver, provided by the bar component. */
  connect(nav: (to: string) => void, withBase: (path: string) => string) {
    navigate = nav;
    resolveUrl = withBase;
  },

  play(id?: string) {
    const lines = pageLines();
    if (lines.length === 0) return;
    const target = lines.find((el) => el.dataset.say === (id ?? state.current)) ?? lines[0];
    start(target);
  },
  pause() {
    audio?.pause();
    setState({ playing: false });
  },
  toggle() {
    if (state.playing) player.pause();
    else player.play();
  },
  step(delta: number) {
    const lines = pageLines();
    const i = lines.findIndex((el) => el.dataset.say === state.current);
    const next = lines[Math.min(lines.length - 1, Math.max(0, i + delta))];
    if (next) start(next);
  },
  cycleRate() {
    const rate = RATES[(RATES.indexOf(state.rate) + 1) % RATES.length];
    if (audio) audio.playbackRate = rate;
    setState({ rate });
  },

  /** Called after every route change; page content may render a little later. */
  pageChanged() {
    clearHighlight();
    const resume = autoplayOnNextPage;
    autoplayOnNextPage = false;
    if (!resume) {
      audio?.pause();
      document.documentElement.classList.remove('narrating');
      setState({ playing: false, current: null });
    }
    waitForLines().then((lines) => {
      setState({ ids: lines.map((el) => el.dataset.say!) });
      if (resume && lines[0]) start(lines[0]);
    });
  },
};

function pageLines(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-say]'));
}

function waitForLines(): Promise<HTMLElement[]> {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const poll = () => {
      const lines = pageLines();
      if (lines.length > 0 || performance.now() - t0 > 3000) resolve(lines);
      else requestAnimationFrame(poll);
    };
    poll();
  });
}

function clearHighlight() {
  for (const el of document.querySelectorAll('.say-active')) el.classList.remove('say-active');
}

function start(el: HTMLElement) {
  const id = el.dataset.say!;
  clearHighlight();
  el.classList.add('say-active');
  document.documentElement.classList.add('narrating');
  bringIntoView(el);
  cue(el);

  audio ??= createAudio();
  audio.src = resolveUrl(`/audio/${id}.mp3`);
  audio.playbackRate = state.rate;
  setState({ playing: true, current: id, elapsed: 0 });
  audio.play().catch(() => setState({ playing: false }));
}

function createAudio() {
  const a = new Audio();
  a.addEventListener('timeupdate', () => setState({ elapsed: a.currentTime }));
  a.addEventListener('ended', () => {
    const lines = pageLines();
    const i = lines.findIndex((el) => el.dataset.say === state.current);
    if (i >= 0 && i + 1 < lines.length) return start(lines[i + 1]);
    goToNextPage();
  });
  return a;
}

function goToNextPage() {
  const here = normalize(location.pathname);
  const i = data.pages.findIndex((p) => normalize(resolveUrl(p)) === here);
  const next = i >= 0 ? data.pages[i + 1] : undefined;
  if (!next || !navigate) {
    clearHighlight();
    document.documentElement.classList.remove('narrating');
    clearCues();
    setState({ playing: false, current: null });
    return;
  }
  autoplayOnNextPage = true;
  navigate(next);
}

function normalize(path: string) {
  return path.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/$/, '') || '/';
}

/** Keep the active line in the lower part of the viewport, below the sticky diagram. */
function bringIntoView(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const top = window.scrollY + rect.top - window.innerHeight * 0.68;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

// Archify's own Focus opens a details panel over the diagram, so the player marks nodes itself.
// Each Archify node is an SVG <g data-node-id>; the iframe is same-origin, so its DOM is reachable.
// The viewer's toolbars are hidden too: the embedded frame is too small for them, and "全屏打开" keeps them.
const DIAGRAM_CSS = `
.toolbar, .diagram-nav, .archify-toast, .header { display: none !important; }
html.narration-cue svg g[data-node-id] { transition: opacity .35s, filter .35s; }
html.narration-cue svg g[data-node-id]:not(.narration-on) { opacity: .28; }
svg g[data-node-id].narration-on { filter: drop-shadow(0 0 6px #ffcc00) drop-shadow(0 0 14px rgba(255,204,0,.6)); }
`;

/** Strip viewer chrome and match the page theme; call on iframe load and on theme change. */
export function prepareDiagram(frame: HTMLIFrameElement, dark: boolean) {
  const doc = frame.contentDocument;
  if (!doc?.head) return;
  if (!doc.getElementById('narration-style')) {
    const style = doc.createElement('style');
    style.id = 'narration-style';
    style.textContent = DIAGRAM_CSS;
    doc.head.append(style);
  }
  doc.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

/** Highlight the line's cue nodes in the nearest diagram above it. */
function cue(el: HTMLElement) {
  const ids = el.dataset.cue?.split(',').filter(Boolean);
  if (!ids?.length) return;
  const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[data-diagram]'));
  const frame = frames.filter((f) => f.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
  const doc = frame?.contentDocument;
  if (!doc?.body) return;
  doc.documentElement.classList.add('narration-cue');
  for (const g of doc.querySelectorAll('svg g[data-node-id]')) {
    g.classList.toggle('narration-on', ids.includes(g.getAttribute('data-node-id')!));
  }
}

function clearCues() {
  for (const frame of document.querySelectorAll<HTMLIFrameElement>('iframe[data-diagram]')) {
    frame.contentDocument?.documentElement.classList.remove('narration-cue');
  }
}
