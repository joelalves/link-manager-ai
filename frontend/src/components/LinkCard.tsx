import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Link } from "../lib/api";
import { formatDate, hostname } from "../lib/utils";

interface Props {
  link: Link;
  onDelete: (id: number) => void;
}

export function LinkCard({ link, onDelete }: Props) {
  const navigate = useNavigate();

  return (
    <article className="group flex flex-col rounded-lg border border-line bg-surface p-5 shadow-card transition-colors hover:border-ink/20">
      <div className="flex items-start justify-between gap-3">
        {link.category ? (
          <span className="stamp">{link.category}</span>
        ) : (
          <span className="stamp opacity-40">Unfiled</span>
        )}
        <span className="font-mono text-[0.7rem] text-muted">
          {formatDate(link.created_at)}
        </span>
      </div>

      <h3 className="mt-3 font-display text-lg font-medium leading-snug">
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="hover:text-pine"
        >
          {link.title || link.url}
        </a>
      </h3>

      {link.description && (
        <p className="mt-2 line-clamp-3 text-sm text-muted">{link.description}</p>
      )}

      {link.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {link.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[0.7rem] text-ink/70 before:mr-0.5 before:text-pine before:content-['#']"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 hairline pt-3" />
      <div className="flex items-center justify-between">
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-pine"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {hostname(link.url)}
        </a>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            onClick={() => navigate(`/edit/${link.id}`)}
            className="rounded p-1.5 text-muted hover:bg-paper hover:text-ink"
            title="Edit"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(link.id)}
            className="rounded p-1.5 text-muted hover:bg-red-900/20 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
