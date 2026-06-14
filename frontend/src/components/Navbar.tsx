import { Link, useNavigate } from "react-router-dom";
import { LogOut, Plus, Upload, Library } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui";

export function Navbar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Library className="h-5 w-5 text-pine" />
          <span className="font-display text-xl font-semibold tracking-tight">
            Shelf
          </span>
        </Link>
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
