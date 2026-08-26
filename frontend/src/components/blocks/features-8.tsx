import { Shield, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Features() {
  return (
    <section className="bg-transparent py-10 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative z-10 grid grid-cols-6 gap-3">
          <Card className="relative col-span-full flex overflow-hidden lg:col-span-2">
            <CardContent className="relative m-auto size-fit pt-6">
              <div className="relative flex h-24 w-56 items-center">
                <svg className="absolute inset-0 size-full text-[#262626]" viewBox="0 0 254 104" fill="none">
                  <path
                    d="M20 72C48 58 86 50 126 48C166 46 204 52 234 70"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M16 88C52 70 96 60 140 62C184 64 218 78 242 96"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                </svg>
                <span className="mx-auto block w-fit font-mono text-5xl font-semibold text-white">Pd</span>
              </div>
              <h2 className="mt-6 text-center font-mono text-xl font-semibold uppercase tracking-widest">
                Interception rate
              </h2>
              <p className="mt-2 max-w-xs text-center text-xs text-[#a1a1aa]">
                Closed-loop dwell raises probability of detection against agile CMFR hop trains.
              </p>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
            <CardContent className="pt-6">
              <div className="relative mx-auto flex aspect-square size-32 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]">
                <svg className="m-auto h-fit w-24" viewBox="0 0 212 143" fill="none">
                  <path
                    className="text-zinc-600"
                    d="M20 90C40 50 80 28 106 28C132 28 172 50 192 90"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path d="M8 72H204" className="text-[#e4e4e7]" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="relative z-10 mt-6 space-y-2 text-center">
                <h2 className="text-lg font-medium text-white">No channel starvation</h2>
                <p className="font-mono text-xs text-[#a1a1aa]">
                  Revisit Agent preempts when Age-of-Information crosses 850 ms — open-loop cannot.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden sm:col-span-3 lg:col-span-2">
            <CardContent className="pt-6">
              <div className="pt-4 lg:px-4">
                <svg className="w-full text-[#a1a1aa]" viewBox="0 0 386 123" fill="none">
                  <rect width="386" height="123" rx="2" className="fill-[#0d0d0d]" />
                  <path
                    d="M8 110C40 70 70 90 110 40C150 20 180 80 220 50C260 20 300 70 378 30"
                    stroke="#e4e4e7"
                    strokeWidth="2"
                  />
                  <path d="M8 110 L378 110" stroke="#262626" />
                </svg>
              </div>
              <div className="relative z-10 mt-8 space-y-2 text-center">
                <h2 className="text-lg font-medium">Minimised Δt</h2>
                <p className="font-mono text-xs text-[#a1a1aa]">
                  Predictive dwell cuts average intercept-time error versus uniform sweep.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3">
            <CardContent className="grid pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10">
                <div className="relative flex aspect-square size-12 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]">
                  <Shield className="m-auto size-5" strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium text-white">0.5 — 18.0 GHz coverage</h2>
                  <p className="text-sm text-[#a1a1aa]">
                    Sixteen 500 MHz receiver hops across the surveillance envelope without staring the whole band.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 h-32 border-l border-t border-[#262626] p-6 sm:ml-6">
                <div className="absolute left-3 top-2 flex gap-1">
                  <span className="block size-2 rounded-full border border-[#262626]" />
                  <span className="block size-2 rounded-full border border-[#262626]" />
                  <span className="block size-2 rounded-full border border-[#262626]" />
                </div>
                <svg className="mt-4 h-20 w-full" viewBox="0 0 200 60" fill="none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <rect
                      key={i}
                      x={i * 12 + 4}
                      y={10 + (i % 5) * 6}
                      width="8"
                      height={40 - (i % 5) * 6}
                      className={i % 4 === 0 ? "fill-[#e4e4e7]" : "fill-[#262626]"}
                    />
                  ))}
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="relative col-span-full overflow-hidden lg:col-span-3">
            <CardContent className="grid h-full pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10">
                <div className="relative flex aspect-square size-12 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]">
                  <Users className="m-auto size-6" strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">C2 operator cell</h2>
                  <p className="text-sm text-[#a1a1aa]">
                    Explainable MoE logs keep the watch floor in the loop — force-protection, not a black box.
                  </p>
                </div>
              </div>
              <div className="relative mt-6 before:absolute before:inset-0 before:mx-auto before:w-px before:bg-[#262626] sm:-my-6 sm:-mr-6">
                <div className="relative flex h-full flex-col justify-center space-y-6 py-6">
                  {[
                    { id: "SCAN-01", align: "end" },
                    { id: "AOI-RVT", align: "start" },
                    { id: "EAGER-1", align: "end" },
                  ].map((op) => (
                    <div
                      key={op.id}
                      className={`relative flex items-center gap-2 ${op.align === "end" ? "w-[calc(50%+0.875rem)] justify-end" : "ml-[calc(50%-1rem)]"}`}
                    >
                      {op.align === "end" ? (
                        <>
                          <span className="block rounded-[2px] border border-[#262626] px-2 py-1 font-mono text-xs">
                            {op.id}
                          </span>
                          <div className="flex size-7 items-center justify-center rounded-full border border-[#262626] bg-[#0d0d0d] font-mono text-[9px]">
                            {op.id.slice(0, 2)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex size-8 items-center justify-center rounded-full border border-[#262626] bg-[#0d0d0d] font-mono text-[9px]">
                            {op.id.slice(0, 2)}
                          </div>
                          <span className="block rounded-[2px] border border-[#262626] px-2 py-1 font-mono text-xs">
                            {op.id}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
