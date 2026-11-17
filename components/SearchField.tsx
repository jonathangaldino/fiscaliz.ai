"use client";

import { useId } from "react";
import { Glyph } from "./ui/Glyph";

export function SearchField({
  value,
  onChange,
  placeholder = "Buscar rua, bairro ou problema",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="search" className={`relative ${className}`}>
      <label htmlFor={id} className="sr-only">
        Buscar ocorrências
      </label>
      <Glyph
        name="search"
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
      />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        className="h-11 w-full rounded-full border border-line bg-(--glass-bg) pr-11 pl-10 text-[15px] text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] transition-[box-shadow,background-color] duration-(--dur) placeholder:text-subtle focus:bg-surface focus:outline-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-(--focus)/50 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-accent-tint hover:text-fg"
        >
          <Glyph name="close" size={16} />
        </button>
      )}
    </div>
  );
}
