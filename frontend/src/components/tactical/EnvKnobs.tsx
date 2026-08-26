import { useEffect, useState } from "react";
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
    <label className="block rounded-2xl border border-border bg-card p-3">
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
  const [sweep, setSweep] = useState(env.sweep_ms);
  const [spawn, setSpawn] = useState(env.hostile_spawn);
  const [noise, setNoise] = useState(env.noise_floor);

  useEffect(() => {
    setSweep(env.sweep_ms);
    setSpawn(env.hostile_spawn);
    setNoise(env.noise_floor);
  }, [env.sweep_ms, env.hostile_spawn, env.noise_floor]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void setSchedulerConfig({
        sweep_ms: sweep,
        hostile_spawn: spawn,
        noise_floor: noise,
      });
    }, 180);
    return () => window.clearTimeout(id);
  }, [sweep, spawn, noise]);

  return (
    <div className="grid gap-2 md:grid-cols-3">
      <Knob
        label="Sweep interval"
        value={sweep}
        min={20}
        max={500}
        step={10}
        unit=" ms"
        onChange={setSweep}
      />
      <Knob
        label="Hostile spawn"
        value={Number(spawn.toFixed(2))}
        min={0}
        max={1}
        step={0.05}
        unit=""
        onChange={setSpawn}
      />
      <Knob
        label="Noise floor"
        value={Number(noise.toFixed(2))}
        min={0}
        max={0.8}
        step={0.05}
        unit=""
        onChange={setNoise}
      />
    </div>
  );
}
