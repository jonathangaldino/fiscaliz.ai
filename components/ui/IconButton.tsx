import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  /** Accessible name; also shown as a tooltip. */
  label: string;
  children: ReactNode;
};

/** Round glass button with an icon only. Always 44 px. */
export function IconButton({
  label,
  className = "",
  type = "button",
  children,
  ...props
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`glass inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg transition-transform duration-(--dur) ease-out hover:scale-105 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
