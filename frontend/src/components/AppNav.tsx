import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, Crosshair, LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Briefing", icon: LayoutDashboard },
  { to: "/scan", label: "Scan", icon: Crosshair },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/learn", label: "How to use", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function AppNav() {
  return (
    <nav className="flex max-w-full flex-wrap gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-[#0b100e]/80 p-1 backdrop-blur-md">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              cn(
                "sj-fill group inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-200",
                isActive && "is-active",
              )
            }
          >
            <Icon className="size-3.5" />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
