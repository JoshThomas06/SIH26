import { Link, useNavigate } from "react-router-dom";
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
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Smart Scan EW // DRDO SIH26055
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">AEGIS Operator Briefing</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AppNav />
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

        <div className="grid items-center gap-8 lg:grid-cols-2">
          <RotatingEarth width={560} height={480} className="justify-self-center" />
          <div className="space-y-4">
            <TerminalLoader />
            <Button variant="phosphor" size="lg" className="w-full rounded-2xl" asChild>
              <Link to="/scan">Launch Scan Console</Link>
            </Button>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              CRT polar + spectrum analyzer · 16-band Smart Scan
            </p>
          </div>
        </div>

        <Features />
      </div>
    </PageWrapper>
  );
}
