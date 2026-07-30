"use client";

import { cn } from "@/lib/utils";

type Variant = "brand" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  // The gradient lives on a child layer so the glow can duplicate it.
  brand: "text-white",
  ghost: "text-white/60 hover:bg-white/5 hover:text-white",
  outline: "border border-white/10 bg-white/5 text-white hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-14 px-8 text-base font-semibold",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "brand",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {variant === "brand" && (
        <>
          <span
            className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
            style={{ background: "var(--gradient-brand)" }}
          />
          <span
            className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70"
            style={{ background: "var(--gradient-brand)" }}
          />
        </>
      )}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </button>
  );
}
