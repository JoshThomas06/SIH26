import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { GripVertical, LayoutGrid, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_LAYOUT,
  WIDGET_META,
  useScanLayout,
  type WidgetId,
  type WidgetRect,
} from "@/store/useScanLayout";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function WidgetFrame({
  id,
  rect,
  children,
}: {
  id: WidgetId;
  rect: WidgetRect;
  children: ReactNode;
}) {
  const move = useScanLayout((s) => s.move);
  const toggle = useScanLayout((s) => s.toggle);
  const drag = useRef<{ mode: "move" | "resize"; sx: number; sy: number; start: WidgetRect } | null>(null);
  const z = useRef(1);

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      const session = drag.current;
      if (!session) return;
      const board = document.getElementById("aegis-scan-board");
      if (!board) return;
      const box = board.getBoundingClientRect();
      const dx = ((event.clientX - session.sx) / box.width) * 100;
      const dy = ((event.clientY - session.sy) / box.height) * 100;
      if (session.mode === "move") {
        move(id, {
          x: clamp(session.start.x + dx, 0, 100 - session.start.w),
          y: clamp(session.start.y + dy, 0, 130 - session.start.h),
        });
      } else {
        move(id, {
          w: clamp(session.start.w + dx, 22, 100 - session.start.x),
          h: clamp(session.start.h + dy, 16, 80),
        });
      }
    };
    const onUp = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [id, move]);

  const begin = (mode: "move" | "resize") => (event: PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(max-width: 768px)").matches) return;
    event.preventDefault();
    event.stopPropagation();
    z.current += 1;
    drag.current = { mode, sx: event.clientX, sy: event.clientY, start: { ...rect } };
  };

  return (
    <section
      className="aegis-scan-widget absolute flex flex-col overflow-hidden rounded-lg border border-black bg-card"
      style={{
        left: `${rect.x}%`,
        top: `${rect.y}%`,
        width: `${rect.w}%`,
        height: `${rect.h}%`,
        zIndex: z.current,
      }}
    >
      <header
        onPointerDown={begin("move")}
        className="flex h-7 shrink-0 cursor-grab items-center justify-between border-b border-black bg-[#0a0a0a] px-2 text-zinc-300 active:cursor-grabbing"
      >
        <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-zinc-300">
          <GripVertical className="size-3" />
          {WIDGET_META[id].label}
        </span>
        <button
          type="button"
          className="text-[#666] hover:text-foreground"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => toggle(id)}
          aria-label={`Hide ${WIDGET_META[id].label}`}
        >
          <X className="size-3.5" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      <button
        type="button"
        aria-label="Resize widget"
        className="absolute right-0 bottom-0 h-3 w-3 cursor-nwse-resize border-t border-l border-black bg-[#1a1a1a]"
        onPointerDown={begin("resize")}
      />
    </section>
  );
}

export function ComponentsPanel() {
  const open = useScanLayout((s) => s.panelOpen);
  const setOpen = useScanLayout((s) => s.setPanelOpen);
  const layout = useScanLayout((s) => s.layout);
  const toggle = useScanLayout((s) => s.toggle);
  const reset = useScanLayout((s) => s.reset);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="sj-fill" onClick={() => setOpen(!open)}>
        <LayoutGrid className="size-3.5" />
        Components
      </Button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-lg border border-black bg-[#121212] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Widgets</span>
            <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={reset}>
              <RotateCcw className="size-3" />
              Defaults
            </button>
          </div>
          <ul className="space-y-1">
            {(Object.keys(WIDGET_META) as WidgetId[]).map((id) => (
              <li key={id}>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-white/5">
                  <span className="font-mono text-[11px] uppercase tracking-widest">{WIDGET_META[id].label}</span>
                  <input
                    type="checkbox"
                    checked={layout[id]?.visible ?? DEFAULT_LAYOUT[id].visible}
                    onChange={() => toggle(id)}
                  />
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-[#666]">
            Drag the grip to move. Corner to resize. Toggle to snap back to default slot.
          </p>
        </div>
      )}
    </div>
  );
}

export function ScanBoard({ widgets }: { widgets: Record<WidgetId, ReactNode> }) {
  const layout = useScanLayout((s) => s.layout);
  return (
    <div id="aegis-scan-board" className="relative min-h-[1520px] w-full max-md:min-h-0">
      {(Object.keys(widgets) as WidgetId[]).map((id) => {
        const rect = layout[id];
        if (!rect?.visible) return null;
        return (
          <WidgetFrame key={id} id={id} rect={rect}>
            {widgets[id]}
          </WidgetFrame>
        );
      })}
    </div>
  );
}
