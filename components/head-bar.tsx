import Link from "next/link";

export default function HeadBar() {
  return (
    <Link href="/">
      <div className="flex flex-col items-center gap-0 px-3">
        <h1 className="scroll-m-20 text-3xl font-semibold tracking-tight">
          Silenced
        </h1>
        <h1 className="text-sm tracking-tight text-primary">personal dumps</h1>
      </div>
    </Link>
  );
}
