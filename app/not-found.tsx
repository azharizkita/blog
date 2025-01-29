import TimeAgo from "@/components/time-ago";
import { CardDescription } from "@/components/ui/card";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid auto-rows-min gap-6 ">
      <div className="flex flex-col gap-1">
        <div className="w-fit flex flex-col gap-2 bg-[#26252A] p-4 rounded-xl">
          <CardDescription className="text-white">
            Umm, I think you are getting lost along the
            road.{" "}
            <Link href="/" className="underline">
              Click here to get back.
            </Link>
          </CardDescription>
        </div>
        <CardDescription className="text-xs pl-3">
          <TimeAgo time={new Date().toISOString()} />
        </CardDescription>
      </div>
    </div>
  );
}
