import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
  className = "",
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = `${id}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 ${className}`}
    >
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          {eyebrow}
        </p>
        <h2
          id={headingId}
          className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.08] font-semibold tracking-tight text-balance"
        >
          {title}
        </h2>
        {lead && (
          <p className="mt-4 text-lg leading-relaxed text-pretty text-muted">
            {lead}
          </p>
        )}
      </Reveal>
      <div className="mt-12 sm:mt-16">{children}</div>
    </section>
  );
}
