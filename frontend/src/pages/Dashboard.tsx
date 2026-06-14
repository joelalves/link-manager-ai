import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Plus, Search, Upload, X } from "lucide-react";
import { api, ApiError, type Link } from "../lib/api";
import { Button, Input, Spinner } from "../components/ui";
import { LinkCard } from "../components/LinkCard";

type Sort = "recent" | "oldest" | "title";

export function Dashboard() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.search({
        q: query || undefined,
        category: activeCategory || undefined,
        tag: activeTag || undefined,
        sort,
      });
      setLinks(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load links");
    } finally {
      setLoading(false);
    }
  }

  // Reload whenever filters or sort change (debounced for the text query).
  useEffect(() => {
    const t = setTimeout(load, query ? 250 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory, activeTag, sort]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this link?")) return;
    await api.deleteLink(id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  // Derive category + tag facets from whatever is currently loaded.
  const { categories, tags, totals } = useMemo(() => {
    const cat = new Map<string, number>();
    const tg = new Map<string, number>();
    for (const l of links) {
      if (l.category) cat.set(l.category, (cat.get(l.category) || 0) + 1);
      for (const t of l.tags) tg.set(t, (tg.get(t) || 0) + 1);
    }
    return {
      categories: [...cat.entries()].sort((a, b) => b[1] - a[1]),
      tags: [...tg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12),
      totals: { links: links.length, categories: cat.size, tags: tg.size },
    };
  }, [links]);

  const hasFilters = activeCategory || activeTag || query;

  return (
    <div>
      {/* Hero: the collection at a glance */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Your collection
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            {totals.links}{" "}
            <span className="text-muted">
              {totals.links === 1 ? "entry" : "entries"}
            </span>
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">
            {totals.categories} categories · {totals.tags} tags
          </p>
        </div>
        <div className="flex gap-2">
          <RouterLink to="/add">
            <Button>
              <Plus className="h-4 w-4" /> Add link
            </Button>
          </RouterLink>
          <RouterLink to="/import">
            <Button variant="outline">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </RouterLink>
        </div>
      </div>

      {/* Search + sort */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, description, tags…"
            className="pl-9"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm focus:border-pine focus:outline-none"
        >
          <option value="recent">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">By title</option>
        </select>
      </div>

      {/* Facets */}
      {(categories.length > 0 || tags.length > 0) && (
        <div className="mt-4 space-y-2">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
                Categories
              </span>
              {categories.map(([c, n]) => (
                <button
                  key={c}
                  onClick={() =>
                    setActiveCategory(activeCategory === c ? null : c)
                  }
                  className={
                    "stamp transition-colors " +
                    (activeCategory === c
                      ? "bg-pine text-white border-pine"
                      : "hover:bg-pine-light")
                  }
                >
                  {c} · {n}
                </button>
              ))}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted">
                Tags
              </span>
              {tags.map(([t]) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(activeTag === t ? null : t)}
                  className={
                    "font-mono text-xs hover:text-pine before:mr-0.5 before:text-pine before:content-['#'] " +
                    (activeTag === t ? "text-pine font-medium" : "text-ink/70")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            setQuery("");
            setActiveCategory(null);
            setActiveTag(null);
          }}
          className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-ink"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}

      <div className="mt-6 hairline" />

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : error ? (
        <p className="py-20 text-center text-red-400">{error}</p>
      ) : links.length === 0 ? (
        <EmptyState hasFilters={!!hasFilters} />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((l) => (
            <LinkCard key={l.id} link={l} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <p className="py-20 text-center text-muted">
        Nothing matches those filters yet.
      </p>
    );
  }
  return (
    <div className="py-20 text-center">
      <p className="font-display text-xl">Your shelf is empty</p>
      <p className="mt-1 text-sm text-muted">
        Add your first link and let AI fill in the details.
      </p>
      <RouterLink to="/add" className="mt-4 inline-block">
        <Button>
          <Plus className="h-4 w-4" /> Add a link
        </Button>
      </RouterLink>
    </div>
  );
}
