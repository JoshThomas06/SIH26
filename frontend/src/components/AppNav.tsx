import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Briefing" },
  { to: "/scan", label: "Scan" },
  { to: "/analytics", label: "Analytics" },
  { to: "/learn", label: "How to use" },
  { to: "/profile", label: "Profile" },
];

export function AppNav() {
  return (
    <nav className="flex flex-wrap gap-2">
      {LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            cn(
              "rounded-xl border border-border px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:border-[#525252] hover:text-foreground",
              isActive && "border-foreground text-foreground",
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
