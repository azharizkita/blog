import { Link } from "next-view-transitions";

export default function NotFound() {
  return (
    <>
      <h2 style={{ textAlign: "center" }}>
        Mmmm can&apos;t find what you are looking for...
      </h2>
      <Link style={{ alignSelf: "center" }} href="/">
        <button>Let&apos;s get back</button>
      </Link>
    </>
  );
}
