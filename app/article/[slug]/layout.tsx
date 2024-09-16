import { Link } from "next-view-transitions";

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
