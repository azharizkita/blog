import Link from "next/link";

export default function Header() {
  return (
    <Link href="/">
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5em",
        }}
      >
        <h1>Silenced</h1>
        <div
          style={{
            border: "2px solid var(--accent)",
            height: "30px",
            borderRadius: "20px",
          }}
        />
        <h4
          style={{
            color: "var(--gray-text)",
            width: "110px",
            lineHeight: "0.8em",
          }}
        >
          Personal post dumps
        </h4>
      </header>
    </Link>
  );
}
