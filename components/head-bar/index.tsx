import Link from "next/link";
import Search from "./search";

export default function HeadBar() {
  return (
    <>
      <Search />
      <Link href="/">
        <div className="flex flex-col gap-0 items-center">
          <h1 className="text-3xl font-semibold tracking-tight">Silenced</h1>
          <h1 className="text-sm tracking-tight text-primary -mt-2">
            personal dumps
          </h1>
        </div>
      </Link>
    </>
  );
}
