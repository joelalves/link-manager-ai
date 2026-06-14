import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { Button, Input, Label, Spinner, Textarea } from "../components/ui";

export function AddLink() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [analyzed, setAnalyzed] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!url) return;
    setError(null);
    setAnalyzing(true);
    try {
      const result = await api.analyzeUrl(url);
      setTitle(result.title);
      setDescription(result.description);
      setCategory(result.category);
      setTagsText(result.tags.join(", "));
      setAnalyzed(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not analyze URL");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await api.createLink({
        url,
        title,
        description,
        category,
        tags,
        // If the user never analyzed, let the backend fill blanks.
        use_ai: !analyzed && !title,
      });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save link");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate("/")}
        className="mb-4 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Add a link
      </h1>
      <p className="mt-1 text-sm text-muted">
        Paste a URL, analyze it with AI, then review before saving.
      </p>

      <form onSubmit={handleSave} className="mt-6 space-y-5">
        <div>
          <Label>URL</Label>
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              type="url"
              required
              autoFocus
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAnalyze}
              disabled={!url || analyzing}
              className="shrink-0"
            >
              {analyzing ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              Analyze
            </Button>
          </div>
        </div>

        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="ai, productivity"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !url}>
            {saving ? <Spinner /> : "Save to shelf"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate("/")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
