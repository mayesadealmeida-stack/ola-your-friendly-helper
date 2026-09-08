import { Link } from "@tanstack/react-router";
import { Home as HomeIcon, Users, LineChart, User, type LucideIcon } from "lucide-react";

export type BottomNavKey = "home" | "grupos" | "mercado" | "perfil";

const ITEMS: { key: BottomNavKey; icon: LucideIcon; label: string; to: string }[] = [
  { key: "home", icon: HomeIcon, label: "Home", to: "/home" },
  { key: "grupos", icon: Users, label: "Grupos", to: "/grupos" },
  { key: "mercado", icon: LineChart, label: "Mercado", to: "/mercado" },
  { key: "perfil", icon: User, label: "Perfil", to: "/perfil" },
];

export function BottomNav({ active }: { active: BottomNavKey }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-2">
        {ITEMS.map((item) => (
          <NavItem key={item.key} item={item} active={item.key === active} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({ item, active }: { item: (typeof ITEMS)[number]; active: boolean }) {
  const Icon = item.icon;
  const className = `flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition ${
    active ? "text-brand-green-dark" : "text-muted-foreground hover:text-foreground"
  }`;

  return (
    <Link to={item.to} className={className}>
      <Icon
        className={`h-5 w-5 ${active ? "" : "opacity-70"}`}
        strokeWidth={active ? 2.25 : 2}
        aria-hidden="true"
      />
      <span className={`text-[11px] ${active ? "font-semibold" : "font-medium"}`}>
        {item.label}
      </span>
      {active && <span className="mt-0.5 h-1 w-1 rounded-full bg-brand-green" />}
    </Link>
  );
}
