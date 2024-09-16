import { parseEntry } from "@/utils";
import { Link } from "next-view-transitions";
import styles from "./styles.module.css";
import TimeAgo from "../TimeAgo";

interface PostEntryProps {
  description: string;
  createdAt: string;
  slug: string;
  entry: ReturnType<typeof parseEntry>;
}

export default function PostEntry({
  createdAt: _createdAt,
  slug,
  entry,
}: PostEntryProps) {
  try {
    const color = (() => {
      if (entry.type === "Poetry") {
        return "rgb(218, 66, 245)";
      }
      if (entry.type === "Blog") {
        return "rgb(48, 186, 94)";
      }
      return "var(--accent)";
    })();

    return (
      <article className={styles["post-wrapper"]}>
        <Link href={`/article/${slug}`} className={styles["post-entry"]}>
          <header style={{ height: "fit-content" }}>
            <TimeAgo className={styles["post-date"]} time={_createdAt} />
            <h2
              className={styles["post-title"]}
              style={{ viewTransitionName: slug }}
            >
              {entry.title}
            </h2>
          </header>
          <p className={styles["post-description"]}>
            <span style={{ color }}>{entry.type}</span> — {entry.description}
          </p>
        </Link>
      </article>
    );
  } catch (error) {
    return null;
  }
}
