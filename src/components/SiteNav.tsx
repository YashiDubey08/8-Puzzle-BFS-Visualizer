import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/solver", label: "Puzzle Solver" },
  { to: "/visualizer", label: "Visualizer" },
  { to: "/stats", label: "Statistics" },
  { to: "/project", label: "Project Details" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3" aria-label="Main">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-7 w-7 grid-cols-2 gap-0.5 rounded-md bg-slot p-1">
            <span className="rounded-sm bg-primary" /><span className="rounded-sm bg-primary" />
            <span className="rounded-sm bg-primary" /><span />
          </span>
          Number Puzzle Solver
        </Link>
        <button className="md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
        <ul className="hidden gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }} activeOptions={{ exact: true }}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {open && (
        <ul className="border-t border-border px-4 py-2 md:hidden">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-muted-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }} activeOptions={{ exact: true }}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
