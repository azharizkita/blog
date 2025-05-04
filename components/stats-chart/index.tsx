import { Suspense } from "react";
import StatsWrapper from "./stats-wrapper";
import { Skeleton } from "../ui/skeleton";

export default async function StatsChart() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-[360px] border" />}>
      <StatsWrapper />
    </Suspense>
  );
}
