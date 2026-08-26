import { AppNav } from "@/components/AppNav";
import { PageWrapper } from "@/components/motion/PageWrapper";
import { TopographicBackground } from "@/components/motion/TopographicBackground";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useUiPrefs, type FontScale, type ThemeMode } from "@/store/useUiPrefs";

export default function ProfilePage() {
  const profile = getProfile();
  const theme = useUiPrefs((s) => s.theme);
  const fontScale = useUiPrefs((s) => s.fontScale);
  const reduceMotion = useUiPrefs((s) => s.reduceMotion);
  const highContrast = useUiPrefs((s) => s.highContrast);
  const persistCrtDark = useUiPrefs((s) => s.persistCrtDark);
  const setPrefs = useUiPrefs((s) => s.setPrefs);

  return (
    <PageWrapper>
      <TopographicBackground />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground">Operator profile</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Display & identity</h1>
          </div>
          <AppNav />
        </header>

        <Card className="mb-4">
          <CardContent className="space-y-2 p-5 pt-5">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Signed in as</div>
            <div className="text-lg font-semibold">{profile?.name || "OPERATOR"}</div>
            <div className="font-mono text-sm text-muted-foreground">{profile?.email || "—"}</div>
            <Badge>SIH 26055 demo gate</Badge>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="space-y-4 p-5 pt-5">
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Theme</div>
              <div className="flex gap-2">
                {(["dark", "light"] as ThemeMode[]).map((mode) => (
                  <Button
                    key={mode}
                    variant={theme === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPrefs({ theme: mode })}
                  >
                    {mode === "dark" ? "Dark camo" : "Gray tactical"}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Light mode is a gray tactical theme, not a white office skin. CRT phosphor stays dark so green/red
                intercepts remain readable.
              </p>
            </div>

            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Text size</div>
              <div className="flex gap-2">
                {(["sm", "md", "lg"] as FontScale[]).map((scale) => (
                  <Button
                    key={scale}
                    variant={fontScale === scale ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPrefs({ fontScale: scale })}
                  >
                    {scale === "sm" ? "Compact" : scale === "md" ? "Standard" : "Large"}
                  </Button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <span>
                <span className="block text-sm font-medium">Reduce motion</span>
                <span className="text-xs text-muted-foreground">Cuts globe spin emphasis and looping pulses.</span>
              </span>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(event) => setPrefs({ reduceMotion: event.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <span>
                <span className="block text-sm font-medium">High contrast labels</span>
                <span className="text-xs text-muted-foreground">Stronger borders and muted-text contrast.</span>
              </span>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(event) => setPrefs({ highContrast: event.target.checked })}
              />
            </label>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
              <span>
                <span className="block text-sm font-medium">Keep CRT phosphor dark</span>
                <span className="text-xs text-muted-foreground">Recommended. Green/red blips fail on a gray disc.</span>
              </span>
              <input
                type="checkbox"
                checked={persistCrtDark}
                onChange={(event) => setPrefs({ persistCrtDark: event.target.checked })}
                className={cn(!persistCrtDark && "opacity-60")}
              />
            </label>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
