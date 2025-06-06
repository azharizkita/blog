"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { languageMapper } from "./language-mapper";

interface StatsChartProps {
  data: Record<string, unknown>[];
}

export function Content(props: StatsChartProps) {
  const { data } = props;

  return (
    <ChartContainer
      config={{
        bytes: {
          label: "bytes",
          color: "var(--primary)",
        },
      }}
      className="w-full max-h-[360px]"
    >
      <BarChart accessibilityLayer data={data}>
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
        <CartesianGrid horizontal={false} />
        <XAxis
          dataKey="language"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value: string) => languageMapper[value] || value}
        />
        <Bar dataKey="bytes" fill="var(--color-bytes)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
