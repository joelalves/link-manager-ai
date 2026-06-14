import {
  forwardRef,
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
  danger: "bg-transparent text-red-700 border border-red-200 hover:bg-red-50",
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
