import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  selected: boolean;
  icon?: ReactNode;
  children: ReactNode;
};

/** Toggle pill used for filters. Announces its state with aria-pressed. */
export function Chip({
  selected,
  icon,
  className = "",
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`inline-flex h-9 shrink-0 select-none items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-[transform,background-color,color,box-shadow] duration-(--dur) ease-out active:scale-95 pointer-coarse:h-11 ${
        selected
          ? "bg-accent-solid text-on-accent shadow-sm"
          : "glass text-fg hover:bg-(--glass-bg-strong)"
      } ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
