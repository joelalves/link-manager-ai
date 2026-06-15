import {
  forwardRef,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "outline" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-pine text-white hover:bg-pine-dark border border-transparent",
  outline: "bg-surface text-ink border border-line hover:border-ink/30",
  ghost: "bg-transparent text-muted hover:text-ink border border-transparent",
  danger: "bg-transparent text-red-400 border border-red-800/40 hover:bg-red-900/20",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium",
        "transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink",
        "placeholder:text-muted/70 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink",
      "placeholder:text-muted/70 focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block font-mono text-[0.7rem] uppercase tracking-[0.15em] text-muted">
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden
    />
  );
}

const suggestionList =
  "absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-card";
const suggestionItem =
  "block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper transition-colors";

export function CategoryInput({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const matches = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );
  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <div className={suggestionList}>
          {matches.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={() => { onChange(cat); setOpen(false); }}
              className={suggestionItem}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TagsInput({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parts = value.split(",");
  const current = parts[parts.length - 1].trim().toLowerCase();
  const used = new Set(parts.slice(0, -1).map((p) => p.trim()).filter(Boolean));

  const matches = suggestions.filter(
    (s) => s.toLowerCase().includes(current) && !used.has(s) && current.length > 0
  );

  function pick(tag: string) {
    const before = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean);
    onChange([...before, tag].join(", ") + ", ");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ai, productivity"
      />
      {open && matches.length > 0 && (
        <div className={suggestionList}>
          {matches.slice(0, 6).map((tag) => (
            <button
              key={tag}
              type="button"
              onMouseDown={() => pick(tag)}
              className={cn(suggestionItem, "font-mono")}
            >
              <span className="text-pine">#</span> {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
