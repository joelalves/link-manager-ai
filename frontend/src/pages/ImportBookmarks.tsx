import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileUp } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Button, Label, Spinner } from "../components/ui";

interface ImportResult {
  total_found: number;
  imported: number;
  skipped_duplicates: number;
}

export function ImportBookmarks() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [useAi, setUseAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.importBookmarks(file, useAi);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => navigate("/")}
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Import from Brave
      </h1>
      <p className="mt-1 text-sm text-muted">
        In Brave, open <span className="font-mono">Bookmarks → Bookmark manager</span>,
        then <span className="font-mono">⋮ → Export bookmarks</span>. Upload the saved
        HTML file here.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <Label>Bookmarks file (.html)</Label>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-surface px-4 py-6 text-sm hover:border-pine">
            <FileUp className="h-5 w-5 text-muted" />
            <span className={file ? "text-ink" : "text-muted"}>
              {file ? file.name : "Choose an exported bookmarks file"}
            </span>
            <input
              type="file"
              accept=".html,text/html"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={useAi}
            onChange={(e) => setUseAi(e.target.checked)}
            className="mt-0.5 accent-pine"
          />
          <span>
            Analyze each bookmark with AI
            <span className="block text-xs text-muted">
              Generates descriptions, categories, and tags. Slower and uses API
              credits.
            </span>
          </span>
        </label>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {result && (
          <div className="rounded-md border border-pine/30 bg-pine-light p-4 text-sm">
            <p className="font-medium text-pine-dark">Import complete</p>
            <p className="mt-1 font-mono text-xs text-ink/80">
              {result.imported} added · {result.skipped_duplicates} duplicates
              skipped · {result.total_found} found
            </p>
            <Button
              type="button"
              className="mt-3"
              onClick={() => navigate("/")}
            >
              View shelf
            </Button>
          </div>
        )}

        {!result && (
          <Button type="submit" disabled={!file || loading}>
            {loading ? <Spinner /> : "Import bookmarks"}
          </Button>
        )}
      </form>
    </div>
  );
}
