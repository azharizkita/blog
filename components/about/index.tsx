import { Suspense } from "react";
import AboutWrapper from "./about-wrapper";
import { Skeleton } from "../ui/skeleton";

export default async function About() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-svh border" />}>
      <AboutWrapper />
    </Suspense>
  );
}
