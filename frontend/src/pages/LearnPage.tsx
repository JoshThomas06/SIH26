import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { TopographicBackground } from "@/components/motion/TopographicBackground";
import { Card, CardContent } from "@/components/ui/card";
import { ExplainCue } from "@/components/ui/insight-dialog";

const STEPS = [
  {
    title: "1. Sign in",
    body: "Use operator@aegis.local / aegis or Defence SSO. This is a mock gate for the SIH demo, not a live defence IdP.",
  },
  {
    title: "2. Briefing",
    body: "The globe is a surveillance overview. Capability cards explain Pd, AoI, Δt, coverage, and the C2 cell. Open brief for the full paragraph.",
  },
  {
    title: "3. Scan console",
    body: "Initiate starts a run session. Pick Open-Loop first, then Smart Scan MARL, and watch Pd / hits diverge. Halt closes the session so Analytics can keep it. Sweep ms, hostile spawn, and noise floor are live env knobs.",
  },
  {
    title: "4. Two scan views",
    body: "CRT polar: blips paint only when the rotating beam crosses their AoA, then fade ~5.5 s. Spectrum analyzer: 16-band grid with hop cursor — click to lock, right-click to ignore. Both sit on the same 16 × 500 MHz SIH model.",
  },
  {
    title: "5. Waterfall and matrix",
    body: "Waterfall is time downward, frequency across (16 hops, 0.5–18 GHz). The green tick is the tuned slice. Matrix AoI is age since last visit; HIGH rows must not starve.",
  },
  {
    title: "6. Analytics and PDF",
    body: "Each Initiate→Halt cycle is a run. Pick a run for Pd/Pfa charts and flagged events. Download summary (one pager) or full report (flags + hop log).",
  },
];

const TERMS: { term: string; def: string }[] = [
  { term: "Pd", def: "Probability of detection — share of real emitters caught while they were transmitting." },
  { term: "Pfa", def: "Probability of false alarm — dwells that look occupied when the truth band is idle." },
  { term: "Δt", def: "Intercept-time error in milliseconds between emitter onset and our tuner landing on that band." },
  { term: "AoI", def: "Age of Information — milliseconds since that sub-band was last visited. Revisit trips at 850 ms." },
  { term: "Dwell", def: "How long the narrowband receiver stays on one 500 MHz hop." },
  { term: "Hop / sub-band", def: "One of 16 slices from 0.5–18 GHz. Hardware cannot stare the whole envelope at once." },
  { term: "PDW", def: "Pulse descriptor word: time of arrival, frequency, pulse width, angle of arrival, amplitude." },
  { term: "OPEN_LOOP", def: "Fixed sequential sweep. The baseline that misses agile emitters." },
  { term: "SMART_SCAN_MARL", def: "Eager (chase energy) + Revisit (refresh stale bands). Heuristic stand-in for later MARL." },
  { term: "Eager agent", def: "Picks an occupied band if one exists; otherwise steps sequentially." },
  { term: "Revisit agent", def: "Pre-empts Eager when max AoI ≥ 850 ms so quiet channels cannot hide a late emitter." },
  { term: "MoE", def: "Mixture of experts — the two agents share one tuner; the XAI log names who won the hop." },
  { term: "HIGH threat", def: "Hardcoded demo emitters on bands 04, 08, 13 (indices 3, 7, 12): periodic, agile, short-pulse." },
  { term: "FoM", def: "Figures of merit shown in the HUD: Pd, Pfa, Δt, reward, hits, misses." },
  { term: "Reward", def: "Demo score: hits add, misses and non-adjacent hops subtract. Useful for open-loop vs Smart Scan." },
  { term: "Ignore", def: "Operator mark that skips a sub-band in both linear sweep and Smart Scan (epsilon-greedy still only samples eligible bands)." },
  { term: "Sweep ms", def: "Receiver hop interval (20–500 ms). Lower covers more ground; the CRT and waterfall stay readable because dwell ticks scale with speed." },
  { term: "AoA / compass", def: "Angle of arrival. 0° is North. The CRT paints a blip only when the rotating beam crosses that bearing." },
  { term: "Range km", def: "Amplitude-derived slant-range estimate (stronger pulse → closer). Demonstration geolocation, not GPS." },
];

export default function LearnPage() {
  return (
    <PageWrapper>
      <TopographicBackground />
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#a1a1aa]">Operator handbook</div>
            <h1 className="mt-1 text-2xl font-semibold">How to use AEGIS</h1>
          </div>
          <AppNav />
        </header>

        <div className="space-y-3">
          {STEPS.map((step) => (
            <Card key={step.title}>
              <CardContent className="p-4 pt-4">
                <h2 className="text-base font-semibold text-white">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#a1a1aa]">{step.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="mt-10 font-mono text-sm uppercase tracking-[0.3em] text-[#e4e4e7]">Terminology</h2>
        <p className="mt-2 mb-4 text-sm text-[#888]">
          Open any term for a slightly longer brief. These are the words used on Scan, Analytics, and the MoE log.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {TERMS.map((item) => (
            <Card key={item.term} className="p-0">
              <CardContent className="p-4 pt-4">
                <div className="font-mono text-xs uppercase tracking-widest text-white">{item.term}</div>
                <div className="mt-2">
                  <ExplainCue title={item.term} summary={item.def} detail={item.def} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
