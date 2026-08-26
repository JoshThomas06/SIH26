import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Briefing" },
  { to: "/radar", label: "Radar" },
  { to: "/analytics", label: "Analytics" },
  { to: "/learn", label: "How to use" },
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
              "rounded-xl border border-[#262626] px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-[#a1a1aa] transition-colors hover:border-[#525252] hover:text-white",
              isActive && "border-[#e4e4e7] text-white",
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
