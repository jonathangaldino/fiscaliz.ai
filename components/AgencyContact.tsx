import { dialablePhone, type AgencyInfo } from "@/convex/lib/categories";

/** Institutional contact only: never a person's name. */
export function AgencyContact({ agency }: { agency: AgencyInfo }) {
  return (
    <dl className="space-y-1 text-sm">
      <div>
        <dt className="sr-only">Órgão</dt>
        <dd className="font-medium">{agency.name}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-zinc-500">Telefone</dt>
        <dd>
          <a href={`tel:${dialablePhone(agency.phone)}`} className="underline">
            {agency.phone}
          </a>
        </dd>
      </div>
      <div className="flex gap-2">
        <dt className="text-zinc-500">E-mail</dt>
        <dd>
          <a href={`mailto:${agency.email}`} className="underline">
            {agency.email}
          </a>
        </dd>
      </div>
      <div>
        <dt className="sr-only">Site</dt>
        <dd>
          <a href={agency.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
            Site oficial da Prefeitura
          </a>
        </dd>
      </div>
    </dl>
  );
}
