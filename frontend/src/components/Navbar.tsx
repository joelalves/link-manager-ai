import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Plus, Upload, Library, NotebookText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";
import { cn } from "../lib/utils";

const tabs = [
  { to: "/", label: "Links", icon: Library },
  { to: "/notes", label: "Notes", icon: NotebookText },
];

export function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Library className="h-5 w-5 text-pine" />
            <span className="font-display text-xl font-semibold tracking-tight">
              Shelf
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-pine-light text-pine"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <nav className="flex items-center gap-2">
          <Link to="/add">
            <Button variant="outline" className="hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> Add link
            </Button>
          </Link>
          <Link to="/import">
            <Button variant="ghost" className="hidden sm:inline-flex">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </Link>
          {username && (
            <span className="hidden font-mono text-xs text-muted md:inline">
              {username}
            </span>
          )}
          <Button variant="ghost" onClick={handleLogout} title="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    </header>
  );
}
