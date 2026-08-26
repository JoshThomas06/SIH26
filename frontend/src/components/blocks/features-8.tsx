import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Shield, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ExplainCue } from "@/components/ui/insight-dialog";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

export function Features() {
  return (
    <section className="bg-transparent py-10 md:py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative z-10 grid grid-cols-6 gap-3">
          <InsightCard id="pd" className="col-span-full lg:col-span-2">
            <CardContent className="relative m-auto size-fit pt-6">
              <div className="relative flex h-24 w-56 items-center">
                <svg className="absolute inset-0 size-full text-[#262626]" viewBox="0 0 254 104" fill="none">
                  <motion.path
                    d="M20 72C48 58 86 50 126 48C166 46 204 52 234 70"
                    stroke="currentColor"
                    strokeWidth="2"
                    initial={{ pathLength: 0.4 }}
                    whileHover={{ pathLength: 1 }}
                    animate={{ pathLength: 0.85 }}
                    transition={{ duration: 1.2, ease }}
                  />
                  <path
                    d="M16 88C52 70 96 60 140 62C184 64 218 78 242 96"
                    stroke="currentColor"
                    strokeWidth="2"
                    opacity="0.5"
                  />
                </svg>
                <span className="mx-auto block w-fit font-mono text-5xl font-semibold text-white">Pd</span>
                <span className="pointer-events-none absolute inset-x-12 top-1 h-16 rounded-full border border-white/10" />
              </div>
              <h2 className="mt-6 text-center font-mono text-xl font-semibold uppercase tracking-widest">
                Interception rate
              </h2>
              <div className="mt-2 max-w-xs text-center">
                <ExplainCue
                  title="Interception rate (Pd)"
                  summary="Share of real emitters we actually catch."
                  detail="Pd is probability of detection. When Smart Scan dwells on a hopping radar instead of walking the band in order, more pulses land in the receiver — so this number rises versus open-loop sweep."
                />
              </div>
            </CardContent>
          </InsightCard>

          <InsightCard id="aoi" className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="pt-6">
              <div className="relative mx-auto flex aspect-square size-32 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]">
                <motion.span
                  className="pointer-events-none absolute inset-0 rounded-full border border-[#00ff66]/30"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                />
                <svg className="m-auto h-fit w-24" viewBox="0 0 212 143" fill="none">
                  <path
                    className="text-zinc-600"
                    d="M20 90C40 50 80 28 106 28C132 28 172 50 192 90"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                  />
                  <motion.path
                    d="M8 72H204"
                    className="text-[#e4e4e7]"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </svg>
              </div>
              <div className="relative z-10 mt-6 space-y-2 text-center">
                <h2 className="text-lg font-medium text-white">No channel starvation</h2>
                <ExplainCue
                  title="No channel starvation"
                  summary="Quiet bands still get a look before they go stale."
                  detail="Age-of-Information is how long since we last visited a sub-band. At 850 ms the Revisit agent jumps there even if another band looks hotter — so a silent channel cannot hide an emitter forever."
                />
              </div>
            </CardContent>
          </InsightCard>

          <InsightCard id="dt" className="col-span-full sm:col-span-3 lg:col-span-2">
            <CardContent className="pt-6">
              <div className="pt-4 lg:px-4">
                <svg className="w-full text-[#a1a1aa]" viewBox="0 0 386 123" fill="none">
                  <rect width="386" height="123" rx="16" className="fill-[#0d0d0d]" />
                  <motion.path
                    d="M8 110C40 70 70 90 110 40C150 20 180 80 220 50C260 20 300 70 378 30"
                    stroke="#e4e4e7"
                    strokeWidth="2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatType: "reverse", ease }}
                  />
                  <path d="M8 110 L378 110" stroke="#262626" />
                </svg>
              </div>
              <div className="relative z-10 mt-8 space-y-2 text-center">
                <h2 className="text-lg font-medium">Minimised Δt</h2>
                <ExplainCue
                  title="Minimised Δt"
                  summary="We reach the emitter sooner than a round-robin sweep."
                  detail="Δt is intercept-time error: the gap between when a pulse starts and when our tuner is on that frequency. Predictive dwell shrinks that gap versus visiting bands 1 through 16 in order."
                />
              </div>
            </CardContent>
          </InsightCard>

          <InsightCard id="ghz" className="col-span-full lg:col-span-3">
            <CardContent className="grid pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10">
                <motion.div
                  className="relative flex aspect-square size-12 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]"
                  whileHover={{ scale: 1.08 }}
                >
                  <Shield className="m-auto size-5" strokeWidth={1} />
                  <motion.span
                    className="pointer-events-none absolute inset-0 rounded-full bg-white/5"
                    animate={{ opacity: [0.15, 0.4, 0.15] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                  />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium text-white">0.5 — 18.0 GHz coverage</h2>
                  <ExplainCue
                    title="0.5 — 18.0 GHz coverage"
                    summary="Sixteen hops cover the whole envelope. We never stare at all of it at once."
                    detail="The ES receiver only sees 500 MHz at a time. It hops across 16 slices from 0.5 to 18 GHz. Smart Scan chooses the next slice; it does not require a wideband stare that this hardware cannot do."
                  />
                </div>
              </div>
              <div className="relative mt-6 h-32 overflow-hidden rounded-2xl border-l border-t border-[#262626] p-6 sm:ml-6">
                <div className="absolute left-3 top-2 flex gap-1">
                  <span className="block size-2 rounded-full border border-[#262626]" />
                  <span className="block size-2 rounded-full border border-[#262626]" />
                  <span className="block size-2 rounded-full border border-[#262626]" />
                </div>
                <svg className="mt-4 h-20 w-full" viewBox="0 0 200 60" fill="none">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <motion.rect
                      key={i}
                      x={i * 12 + 4}
                      y={10 + (i % 5) * 6}
                      width="8"
                      height={40 - (i % 5) * 6}
                      rx="1"
                      className={i % 4 === 0 ? "fill-[#e4e4e7]" : "fill-[#262626]"}
                      animate={{
                        y: [10 + (i % 5) * 6, 6 + (i % 3) * 4, 10 + (i % 5) * 6],
                        scaleY: [0.9, 1.15, 0.9],
                      }}
                      style={{ transformOrigin: "center bottom" }}
                      transition={{ duration: 1.4 + (i % 5) * 0.15, repeat: Infinity, ease: "easeInOut" }}
                    />
                  ))}
                </svg>
              </div>
            </CardContent>
          </InsightCard>

          <InsightCard id="c2" className="col-span-full lg:col-span-3">
            <CardContent className="grid h-full pt-6 sm:grid-cols-2">
              <div className="relative z-10 flex flex-col justify-between space-y-10">
                <motion.div
                  className="relative flex aspect-square size-12 rounded-full border border-[#262626] before:absolute before:-inset-2 before:rounded-full before:border before:border-[#262626]"
                  whileHover={{ scale: 1.08 }}
                >
                  <Users className="m-auto size-6" strokeWidth={1} />
                </motion.div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium">C2 operator cell</h2>
                  <ExplainCue
                    title="C2 operator cell"
                    summary="The watch floor sees why the scheduler moved — not a black box."
                    detail="Mixture-of-experts logs name the Eager or Revisit agent and the band it chose. Callsigns SCAN-01, AOI-RVT, and EAGER-1 are the operators/agents on this cell so a human can override or brief the hop."
                  />
                </div>
              </div>
              <div className="relative mt-6 before:absolute before:inset-0 before:mx-auto before:w-px before:bg-[#262626] sm:-my-6 sm:-mr-6">
                <div className="relative flex h-full flex-col justify-center space-y-6 py-6">
                  {[
                    { id: "SCAN-01", role: "Watch supervisor", align: "end" as const },
                    { id: "AOI-RVT", role: "Revisit / AoI agent", align: "start" as const },
                    { id: "EAGER-1", role: "Eager exploit agent", align: "end" as const },
                  ].map((op, index) => (
                    <motion.div
                      key={op.id}
                      className={`group/node relative flex items-center gap-2 ${op.align === "end" ? "w-[calc(50%+0.875rem)] justify-end" : "ml-[calc(50%-1rem)]"}`}
                      initial={{ opacity: 0, x: op.align === "end" ? 8 : -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 * index, ease }}
                    >
                      {op.align === "end" ? (
                        <>
                          <span className="block rounded-lg border border-[#262626] px-2 py-1 font-mono text-xs transition-colors group-hover/node:border-white/40 group-hover/node:text-white">
                            {op.id}
                            <span className="mt-0.5 block text-[9px] text-[#666]">{op.role}</span>
                          </span>
                          <motion.div
                            className="flex size-7 items-center justify-center rounded-full border border-[#262626] bg-[#0d0d0d] font-mono text-[9px]"
                            animate={{ boxShadow: ["0 0 0 0 rgba(228,228,231,0)", "0 0 0 6px rgba(228,228,231,0.12)", "0 0 0 0 rgba(228,228,231,0)"] }}
                            transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.4 }}
                          >
                            {op.id.slice(0, 2)}
                          </motion.div>
                        </>
                      ) : (
                        <>
                          <motion.div
                            className="flex size-8 items-center justify-center rounded-full border border-[#262626] bg-[#0d0d0d] font-mono text-[9px]"
                            animate={{ boxShadow: ["0 0 0 0 rgba(0,255,102,0)", "0 0 0 6px rgba(0,255,102,0.15)", "0 0 0 0 rgba(0,255,102,0)"] }}
                            transition={{ duration: 2.6, repeat: Infinity, delay: 0.4 }}
                          >
                            {op.id.slice(0, 2)}
                          </motion.div>
                          <span className="block rounded-lg border border-[#262626] px-2 py-1 font-mono text-xs">
                            {op.id}
                            <span className="mt-0.5 block text-[9px] text-[#666]">{op.role}</span>
                          </span>
                        </>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </InsightCard>
        </div>
      </div>
    </section>
  );
}

function InsightCard({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div className={cn("col-span-full text-left", className)} whileHover={{ y: -3 }} transition={{ duration: 0.35, ease }}>
      <Card
        className="relative h-full overflow-hidden transition-colors duration-300 hover:border-[#525252]"
        data-insight={id}
        data-no-sj-fill=""
      >
        {children}
      </Card>
    </motion.div>
  );
}
