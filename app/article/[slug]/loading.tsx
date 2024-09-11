export default function Loading() {
  return (
    <article className="markdown-body">
      <div
        className="skeleton"
        style={{
          width: "100%",
          height: "65svh",
          borderRadius: "var(--rounded)",
        }}
      />
    </article>
  );
}
