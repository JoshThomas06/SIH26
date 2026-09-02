import { useEffect, useRef } from "react";

function fibonacciSphere(samples: number, radius: number) {
  const pts: [number, number, number][] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push([Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]);
  }
  return pts;
}

const POINTS = fibonacciSphere(600, 140);

export function InteractiveGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rot = useRef({ x: 0.4, y: 0.2 });
  const drag = useRef({ active: false, lx: 0, ly: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const resize = () => {
      const size = Math.min(560, canvas.parentElement?.clientWidth || 560);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener("resize", resize);

    const project = (x: number, y: number, z: number) => {
      const { x: rx, y: ry } = rot.current;
      const cosY = Math.cos(ry);
      const sinY = Math.sin(ry);
      const cosX = Math.cos(rx);
      const sinX = Math.sin(rx);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;
      const persp = 300 / (300 + z2);
      return {
        x: canvas.width / 2 + x1 * persp,
        y: canvas.height / 2 + y1 * persp,
        s: persp,
        z: z2,
      };
    };

    const draw = () => {
      if (!drag.current.active) rot.current.y += 0.004;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(38,38,38,0.9)";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 148, 0, Math.PI * 2);
      ctx.stroke();
      for (const [x, y, z] of POINTS) {
        const p = project(x, y, z);
        if (p.z < -20) continue;
        const alpha = 0.25 + p.s * 0.55;
        ctx.fillStyle = `rgba(228,228,231,${alpha})`;
        ctx.fillRect(p.x, p.y, 1.4 * p.s, 1.4 * p.s);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const down = (e: PointerEvent) => {
      drag.current = { active: true, lx: e.clientX, ly: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.active) return;
      rot.current.y += (e.clientX - drag.current.lx) * 0.008;
      rot.current.x += (e.clientY - drag.current.ly) * 0.008;
      drag.current.lx = e.clientX;
      drag.current.ly = e.clientY;
    };
    const up = () => {
      drag.current.active = false;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#a1a1aa]">
        Global Signal Surveillance Overview
      </div>
      <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
        Drag to rotate satellite intercept sphere
      </div>
    </div>
  );
}
