import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5em",
      }}
    >
      <Link
        href="/"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5em",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <h1 style={{ margin: 0, lineHeight: "0.75em" }}>Silenced</h1>
        <p
          style={{
            color: "var(--accent)",
            width: "110px",
            lineHeight: "0.8em",
            margin: 0,
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "0.75em",
          }}
        >
          personal dumps
        </p>
      </Link>
    </header>
  );
}
