import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "glass" | "ghost" | "warning";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-[transform,background-color,box-shadow,opacity] duration-(--dur) ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent-solid text-on-accent shadow-sm hover:brightness-110",
  glass: "glass text-fg hover:bg-(--glass-bg-strong)",
  ghost: "text-accent hover:bg-accent-tint",
  warning:
    "bg-(--status-verifying-solid) text-white shadow-sm hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  // 44 px is the minimum touch target (WCAG 2.5.5 / Apple HIG).
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-3.5 text-sm pointer-coarse:h-11",
};

/** Class list for anything that should look like a button (e.g. a Link). */
export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
