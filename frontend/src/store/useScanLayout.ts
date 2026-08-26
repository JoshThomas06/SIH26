import { create } from "zustand";

export type WidgetId =
  | "crt"
  | "spectrum"
  | "waterfall"
  | "matrix"
  | "bearing"
  | "summary"
  | "console"
  | "metrics";

export type WidgetRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
};

export const WIDGET_META: Record<WidgetId, { label: string }> = {
  crt: { label: "CRT polar" },
  spectrum: { label: "Spectrum analyzer" },
  waterfall: { label: "Spectrum waterfall" },
  matrix: { label: "Threat matrix" },
  bearing: { label: "Bearing / range" },
  summary: { label: "AI summary" },
  console: { label: "MoE terminal" },
  metrics: { label: "Figures of merit" },
};

export const DEFAULT_LAYOUT: Record<WidgetId, WidgetRect> = {
  crt: { x: 0, y: 0, w: 66, h: 44, visible: true },
  spectrum: { x: 0, y: 0, w: 66, h: 44, visible: false },
  matrix: { x: 67, y: 0, w: 33, h: 44, visible: true },
  waterfall: { x: 0, y: 45, w: 66, h: 28, visible: true },
  bearing: { x: 0, y: 74, w: 66, h: 18, visible: true },
  summary: { x: 67, y: 45, w: 33, h: 47, visible: true },
  console: { x: 0, y: 93, w: 49, h: 30, visible: true },
  metrics: { x: 50, y: 93, w: 50, h: 30, visible: true },
};

const STORAGE_KEY = "aegis-scan-layout-v1";

function readLayout(): Record<WidgetId, WidgetRect> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_LAYOUT);
    const parsed = JSON.parse(raw) as Partial<Record<WidgetId, WidgetRect>>;
    const next = structuredClone(DEFAULT_LAYOUT);
    for (const id of Object.keys(DEFAULT_LAYOUT) as WidgetId[]) {
      if (parsed[id]) next[id] = { ...DEFAULT_LAYOUT[id], ...parsed[id] };
    }
    return next;
  } catch {
    return structuredClone(DEFAULT_LAYOUT);
  }
}

type LayoutState = {
  layout: Record<WidgetId, WidgetRect>;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  move: (id: WidgetId, patch: Partial<WidgetRect>) => void;
  toggle: (id: WidgetId) => void;
  reset: () => void;
};

export const useScanLayout = create<LayoutState>((set, get) => ({
  layout: typeof window === "undefined" ? structuredClone(DEFAULT_LAYOUT) : readLayout(),
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
  move: (id, patch) => {
    const layout = {
      ...get().layout,
      [id]: { ...get().layout[id], ...patch },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    set({ layout });
  },
  toggle: (id) => {
    const current = get().layout[id];
    const visible = !current.visible;
    const layout = {
      ...get().layout,
      [id]: visible ? { ...DEFAULT_LAYOUT[id], visible: true } : { ...current, visible: false },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    set({ layout });
  },
  reset: () => {
    const layout = structuredClone(DEFAULT_LAYOUT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    set({ layout });
  },
}));
