import Link from "next/link";
import Search from "./search";

export default function HeadBar() {
  return (
    <div className="flex gap-4 items-center">
      <Search />
      <Link href="/">
        <h1 className="text-3xl font-semibold tracking-tight">Lokey</h1>
      </Link>
    </div>
  );
}
