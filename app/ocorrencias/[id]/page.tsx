import { Header } from "@/components/Header";
import { OccurrenceDetail } from "@/components/OccurrenceDetail";

export default async function OccurrencePage({
  params,
}: PageProps<"/ocorrencias/[id]">) {
  const { id } = await params;
  return (
    <>
      <Header />
      <OccurrenceDetail id={id} />
    </>
  );
}
