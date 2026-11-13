import { AgencyQueue } from "@/components/AgencyQueue";
import { Header } from "@/components/Header";

export default async function AgencyPage({ params }: PageProps<"/orgaos/[slug]">) {
  const { slug } = await params;
  return (
    <>
      <Header />
      <AgencyQueue slug={slug} />
    </>
  );
}
