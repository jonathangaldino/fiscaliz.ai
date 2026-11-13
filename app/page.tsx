import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <>
      <Header />
      {/* useSearchParams needs a Suspense boundary for static rendering. */}
      <Suspense>
        <Dashboard />
      </Suspense>
    </>
  );
}
