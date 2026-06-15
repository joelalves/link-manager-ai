import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { api, ApiError, type LinksMeta } from "../lib/api";
import { Button, CategoryInput, Input, Label, Spinner, TagsInput, Textarea } from "../components/ui";
import { hostname } from "../lib/utils";

export function EditLink() {
  const { id } = useParams();
  const linkId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<LinksMeta>({ categories: [], tags: [] });

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");

  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const link = await api.getLink(linkId);
        setUrl(link.url);
        setTitle(link.title);
        setDescription(link.description);
        setCategory(link.category);
        setTagsText(link.tags.join(", "));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load link");
      } finally {
        setLoading(false);
      }
    })();
  }, [linkId]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      await api.updateLink(linkId, { title, description, category, tags });
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this link?")) return;
    await api.deleteLink(linkId);
    navigate("/");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
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
        Edit link
      </h1>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block font-mono text-xs text-muted hover:text-pine"
      >
        {hostname(url)}
      </a>

      <form onSubmit={handleSave} className="mt-6 space-y-5">
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
            <CategoryInput
              value={category}
              onChange={setCategory}
              suggestions={meta.categories}
            />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <TagsInput
              value={tagsText}
              onChange={setTagsText}
              suggestions={meta.tags}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/")}>
              Cancel
            </Button>
          </div>
          <Button type="button" variant="danger" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </form>
    </div>
  );
}
