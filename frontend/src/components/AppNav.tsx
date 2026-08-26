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
    <nav className="flex flex-wrap gap-1 rounded-2xl border border-border/70 bg-[#0b100e]/80 p-1 backdrop-blur-md">
      {LINKS.map((link) => {
        const Icon = link.icon;
        return (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "group inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-all duration-300 hover:border-[#31503d] hover:bg-[#15221b] hover:text-foreground",
              isActive && "border-[#00ff66]/35 bg-[#00ff66]/10 text-[#7dffa9] shadow-[0_0_18px_rgba(0,255,102,0.08)]",
            )
          }
        >
          <Icon className="size-3.5 transition-transform duration-300 group-hover:-translate-y-px" />
          {link.label}
        </NavLink>
        );
      })}
    </nav>
  );
}
