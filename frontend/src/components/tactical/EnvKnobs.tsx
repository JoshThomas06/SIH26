import { useEffect, useRef, useState } from "react";
import { setSchedulerConfig } from "@/lib/auth";
import { useTacticalStore } from "@/store/useTacticalStore";

function Knob({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (next: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-black bg-card p-3">
      <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#262626] accent-[#00ff66]"
      />
    </label>
  );
}

export function EnvKnobs() {
  const env = useTacticalStore((s) => s.env);
  const patchEnv = useTacticalStore((s) => s.patchEnv);
  const [sweep, setSweep] = useState(env.sweep_ms);
  const [spawn, setSpawn] = useState(env.hostile_spawn);
  const [noise, setNoise] = useState(env.noise_floor);
  const [speed, setSpeed] = useState(env.sim_speed);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    setSweep(env.sweep_ms);
    setSpawn(env.hostile_spawn);
    setNoise(env.noise_floor);
    setSpeed(env.sim_speed);
    hydrated.current = true;
  }, [env.sweep_ms, env.hostile_spawn, env.noise_floor, env.sim_speed]);

  const apply = (next: { sweep?: number; spawn?: number; noise?: number; speed?: number }) => {
    const sweepMs = next.sweep ?? sweep;
    const hostile = next.spawn ?? spawn;
    const floor = next.noise ?? noise;
    const sim = next.speed ?? speed;
    if (next.sweep != null) setSweep(sweepMs);
    if (next.spawn != null) setSpawn(hostile);
    if (next.noise != null) setNoise(floor);
    if (next.speed != null) setSpeed(sim);
    patchEnv({ sweep_ms: sweepMs, hostile_spawn: hostile, noise_floor: floor, sim_speed: sim });
  };

  useEffect(() => {
    if (!hydrated.current) return;
    const id = window.setTimeout(() => {
      void setSchedulerConfig({
        sweep_ms: sweep,
        hostile_spawn: spawn,
        noise_floor: noise,
        sim_speed: speed,
      });
    }, 120);
    return () => window.clearTimeout(id);
  }, [sweep, spawn, noise, speed]);

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <Knob label="Sweep interval" value={sweep} min={20} max={500} step={10} unit=" ms" onChange={(v) => apply({ sweep: v })} />
      <Knob
        label="Hostile spawn"
        value={Number(spawn.toFixed(2))}
        min={0}
        max={1}
        step={0.05}
        unit=""
        onChange={(v) => apply({ spawn: v })}
      />
      <Knob
        label="Noise floor"
        value={Number(noise.toFixed(2))}
        min={0}
        max={0.8}
        step={0.05}
        unit=""
        onChange={(v) => apply({ noise: v })}
      />
      <Knob
        label="Sim speed"
        value={Number(speed.toFixed(2))}
        min={0.25}
        max={4}
        step={0.25}
        unit="×"
        onChange={(v) => apply({ speed: v })}
      />
    </div>
  );
}
