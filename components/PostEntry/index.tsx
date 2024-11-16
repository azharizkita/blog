import { parseEntry } from "@/utils";
import styles from "./styles.module.css";
import TimeAgo from "../TimeAgo";
import Link from "next/link";

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
      if (entry.type === "Beep") {
        return "rgb(16, 150, 227)";
      }
      if (entry.type === "Poetry") {
        return "rgb(218, 66, 245)";
      }
      if (entry.type === "Blog") {
        return "rgb(48, 186, 94)";
      }
      return "var(--accent)";
    })();

    if (entry.type === "Beep") {
      return (
        <article className={styles["post-wrapper"]} style={{ gap: "2px" }}>
          <div
            className={styles["post-entry"]}
            style={{
              background: "var(--bubble-chat-background)",
              borderRadius: "16px 16px 16px 4px",
              width: "fit-content",
              padding: "10px 15px",
              color: "var(--foreground)",
            }}
          >
            <p
              className={styles["post-description"]}
              style={{
                margin: "0",
                fontSize: "14px",
                lineHeight: "1.5",
                overflow: "unset",
                whiteSpace: "unset",
              }}
            >
              {entry.description}
            </p>
          </div>
          <p className={styles["post-description"]}>
            <span style={{ color }}>{entry.type}</span> —{" "}
            <TimeAgo className={styles["post-date"]} time={_createdAt} />
          </p>
        </article>
      );
    }

    return (
      <article className={styles["post-wrapper"]}>
        <Link href={`/article/${slug}`} className={styles["post-entry"]}>
          <header style={{ height: "fit-content" }}>
            <TimeAgo
              className={styles["post-date"]}
              time={_createdAt}
              styles={{ fontSize: "0.75em" }}
            />
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
