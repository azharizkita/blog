import Link from "next/link";

export default function ArticleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {children}
      <Link href="/" style={{ alignSelf: "center" }}>
        <button>Back to home</button>
      </Link>
    </>
  );
}
