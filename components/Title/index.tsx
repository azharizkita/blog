import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./styles.module.css";
import Anchor from "./Anchor";

export default function Title({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return (
    <span className={styles.titleContainer}>
      <h3 id={slug}>{children}</h3>
      <Link href={`#${slug}`} className={styles.link}>
        <Anchor />
      </Link>
    </span>
  );
}
