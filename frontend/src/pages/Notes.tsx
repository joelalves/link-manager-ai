import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { Spinner, Textarea } from "../components/ui";

type Status = "idle" | "saving" | "saved" | "error";

export function Notes() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const saved = useRef(""); // last content confirmed persisted on the server

  useEffect(() => {
    api
      .getNote()
      .then((note) => {
        setContent(note.content);
        saved.current = note.content;
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load note");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading || content === saved.current) return;
    setStatus("saving");
    const t = setTimeout(async () => {
      try {
        await api.updateNote(content);
        saved.current = content;
        setStatus("saved");
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save note");
        setStatus("error");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [content, loading]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Shared notepad
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
            Notes
          </h1>
        </div>
        <p className="font-mono text-xs text-muted">
          {status === "saving" && (
            <span className="inline-flex items-center gap-1.5">
              <Spinner className="h-3 w-3" /> Saving…
            </span>
          )}
          {status === "saved" && "Saved"}
          {status === "error" && <span className="text-red-400">Save failed</span>}
        </p>
      </div>

      <div className="mt-6 hairline" />

      {loading ? (
        <div className="flex justify-center py-20 text-muted">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <>
          {error && status === "error" && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Jot down anything you want to keep handy…"
            rows={24}
            autoFocus
            className="mt-6 font-mono leading-relaxed"
          />
        </>
      )}
    </div>
  );
}
