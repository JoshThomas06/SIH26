import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AppNav } from "@/components/AppNav";
import { Features } from "@/components/blocks/features-8";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { TerminalLoader } from "@/components/motion/TerminalLoader";
import { TopographicBackground } from "@/components/motion/TopographicBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";
import { clearSession, getProfile } from "@/lib/auth";

export default function HomePage() {
  const profile = getProfile();
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <TopographicBackground />
      <div className="scanline-overlay relative z-10 mx-auto max-w-6xl overflow-hidden px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#7dffa9]">
              <span className="signal-pulse size-1.5 rounded-full bg-[#00ff66] shadow-[0_0_10px_#00ff66]" />
              Smart Scan EW // DRDO SIH26055
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">AEGIS Operator Briefing</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AppNav />
            <Badge>{profile?.name || "OPERATOR"}</Badge>
            <Button
              variant="outline"
              size="sm"
              className="sj-fill"
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <motion.div
          className="mb-7 flex flex-wrap gap-2"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.45 }}
        >
          <Badge className="border-[#00ff66]/30 bg-[#00ff66]/10 text-[#7dffa9]">Operational mode: MARL Dual-Agent</Badge>
          <Badge>Surveillance band: 0.5 — 18.0 GHz</Badge>
          <Badge className="border-[#f5b642]/30 bg-[#f5b642]/10 text-[#f5c86e]">Ready for live reception</Badge>
        </motion.div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <RotatingEarth width={560} height={480} className="max-w-full justify-self-center" />
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <TerminalLoader />
            <Button
              variant="phosphor"
              size="lg"
              className="sj-fill sj-fill-phosphor group w-full rounded-2xl shadow-[0_0_28px_rgba(0,255,102,0.14)]"
              asChild
            >
              <Link to="/scan">Launch Scan Console</Link>
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              CRT polar + spectrum analyzer · 16-band Smart Scan
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
        >
          <Features />
        </motion.div>
      </div>
    </PageWrapper>
  );
}
