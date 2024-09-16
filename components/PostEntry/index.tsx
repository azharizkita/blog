import { parseEntry } from "@/utils";
import Link from "next/link";
import styles from "./styles.module.css";
import TimeAgo from "../TimeAgo";

interface PostEntryProps {
  description: string;
  id: string;
  createdAt: string;
}

export default function PostEntry({
  description,
  id,
  createdAt: _createdAt,
}: PostEntryProps) {
  try {
    const { description: _description, title, type } = parseEntry(description);

    const color = (() => {
      if (type === "Poetry") {
        return "rgb(218, 66, 245)";
      }
      if (type === "Blog") {
        return "rgb(48, 186, 94)";
      }
      return "var(--accent)";
    })();

    return (
      <article className={styles["post-wrapper"]}>
        <Link
          href={`/article/${id.toLowerCase()}`}
          className={styles["post-entry"]}
        >
          <header style={{ height: "fit-content" }}>
            <TimeAgo className={styles["post-date"]} time={_createdAt} />
            <h2 className={styles["post-title"]}>{title}</h2>
          </header>
          <p className={styles["post-description"]}>
            <span style={{ color }}>{type}</span> — {_description}
          </p>
        </Link>
      </article>
    );
  } catch (error) {
    return null;
  }
}
