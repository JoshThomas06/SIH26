import { Link, useNavigate } from "react-router-dom";
import { Features } from "@/components/blocks/features-8";
import { InteractiveGlobe } from "@/components/motion/InteractiveGlobe";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { TerminalLoader } from "@/components/motion/TerminalLoader";
import { TopographicBackground } from "@/components/motion/TopographicBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearSession, getProfile } from "@/lib/auth";

export default function HomePage() {
  const profile = getProfile();
  const navigate = useNavigate();

  return (
    <PageWrapper>
      <TopographicBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#262626] pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-[#a1a1aa]">
              Smart Scan EW // DRDO SIH26055
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">AEGIS Operator Briefing</h1>
          </div>
          <div className="flex items-center gap-3">
            <Badge>{profile?.name || "OPERATOR"}</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          <Badge>Operational mode: MARL Dual-Agent</Badge>
          <Badge>Surveillance band: 0.5 — 18.0 GHz</Badge>
          <Badge className="text-[#00ff66]">Ready for live reception</Badge>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          <InteractiveGlobe />
          <div className="space-y-4">
            <TerminalLoader />
            <Button variant="phosphor" size="lg" className="w-full" asChild>
              <Link to="/radar">Launch Radar Scope</Link>
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
              Enter tactical radar interface
            </p>
          </div>
        </div>

        <Features />
      </div>
    </PageWrapper>
  );
}
