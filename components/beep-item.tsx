import { Card, CardContent, CardDescription } from "@/components/ui/card";
import TimeAgo from "@/components/time-ago";
import parseEntry from "@/lib/parse-entry";

interface BeepItemProps {
  createdAt: string;
  slug: string;
  entry: ReturnType<typeof parseEntry>;
}

export default function BeepItem({ createdAt, entry }: BeepItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <Card className="py-4">
        <CardContent className="px-4">
          <CardDescription className="text-foreground">
            {entry.description}
          </CardDescription>
        </CardContent>
      </Card>
      <CardDescription className="text-xs pl-3">
        <TimeAgo compact time={createdAt} />
      </CardDescription>
    </div>
  );
}
