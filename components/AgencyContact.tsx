import { dialablePhone, type AgencyInfo } from "@/convex/lib/categories";
import { Glyph, type GlyphName } from "./ui/Glyph";

/** Institutional contact only: never a person's name. */
export function AgencyContact({ agency }: { agency: AgencyInfo }) {
  return (
    <ul className="space-y-1 text-sm">
      <ContactRow
        icon="phone"
        href={`tel:${dialablePhone(agency.phone)}`}
        label="Telefone"
      >
        {agency.phone}
      </ContactRow>
      <ContactRow icon="mail" href={`mailto:${agency.email}`} label="E-mail">
        {agency.email}
      </ContactRow>
      <ContactRow icon="external" href={agency.url} label="Site" external>
        Site oficial da Prefeitura
      </ContactRow>
    </ul>
  );
}

function ContactRow({
  icon,
  href,
  label,
  external = false,
  children,
}: {
  icon: GlyphName;
  href: string;
  label: string;
  external?: boolean;
  children: string;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="-mx-2 flex min-h-11 items-center gap-3 rounded-control px-2 text-fg transition-colors hover:bg-accent-tint"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint text-accent">
          <Glyph name={icon} size={16} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-subtle">{label}</span>
          <span className="block truncate font-medium">{children}</span>
        </span>
        {external && <span className="sr-only">(abre em nova aba)</span>}
      </a>
    </li>
  );
}
