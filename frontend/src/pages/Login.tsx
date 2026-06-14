import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Library } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../lib/api";
import { Button, Input, Label, Spinner } from "../components/ui";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your shelf">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Username</Label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>
        <div>
          <Label>Password</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Spinner /> : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        No account?{" "}
        <Link to="/register" className="text-pine hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Library className="mx-auto h-7 w-7 text-pine" />
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            {subtitle}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
